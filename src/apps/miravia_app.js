import { LX } from 'lexgui';
import { Constants } from '../constants.js';
import * as Utils from '../utils.js';
import { BaseApp } from './base_app.js';

const SKU_ATTR = BaseApp.SKU_ATTR;
const OLD_SKU_ATTR = `${SKU_ATTR}_OLD`;
const ORDER_ATTR = 'Número de pedido';
const ART_ID_ATTR = 'ID del producto del pedido';
const ART_NAME_ATTR = BaseApp.ART_NAME_ATTR;
const CLIENT_NAME_ATTR = 'Nombre del comprador';
const PAIS_ATTR = 'País de envío_1';
const CP_ATTR = 'Código postal';
const PHONE_ATTR = '';
const STREET_ATTR = 'Dirección de envío';
const CITY_ATTR = 'Dirección de envío 3';
const PVP_ATTR = 'Precio con descuento';
const ORDER_DATE_ATTR = 'Fecha de creación';
const QNT_ATTR = '_quantity';
const ATTR_PARAMS = { SKU_ATTR, OLD_SKU_ATTR, ORDER_ATTR, ART_ID_ATTR, ART_NAME_ATTR, CLIENT_NAME_ATTR, PAIS_ATTR, CP_ATTR, PHONE_ATTR, STREET_ATTR, CITY_ATTR, PVP_ATTR, ORDER_DATE_ATTR, QNT_ATTR };

const ORDERS_DATA = [
    [ ORDER_ATTR, BaseApp.ORDER_ATTR ],
    [ ART_ID_ATTR, BaseApp.ART_ID_ATTR ],
    [ OLD_SKU_ATTR ],
    [ SKU_ATTR ],
    [ QNT_ATTR, 'Cantidad', ( str, row, app ) => {
        return parseInt( str ) * app.getPackUnits( row[OLD_SKU_ATTR] );
    } ],
    [ ART_NAME_ATTR, null, ( str, row ) => {
        return `<span title='${str}'>${str}</span>`;
    } ],
    [ CLIENT_NAME_ATTR, BaseApp.CLIENT_NAME_ATTR ],
    [ CP_ATTR ],
    [ PAIS_ATTR ],
    [ CITY_ATTR, BaseApp.CITY_ATTR ],
    [ STREET_ATTR, BaseApp.STREET_ATTR ]
];

class MiraviaApp extends BaseApp
{
    constructor( core, tool )
    {
        super( core, tool );

        this.title = 'Miravia';
        this.subtitle = 'Arrastra un <strong>.xlsx</strong> o haz click aquí para cargar un nuevo listado de envíos.';
        this.icon = 'ShoppingBag';

        // Create utility buttons
        const utilsPanel = new LX.Panel( { height: 'auto', className: Constants.UTILITY_BUTTONS_PANEL_CLASSNAME } );
        utilsPanel.sameLine();
        Utils.addUtilityButton( utilsPanel, 'ClearButton', 'Trash2', 'Limpiar datos anteriores', () => this.core.clearData() );
        utilsPanel.endLine();
        this.area.attach( utilsPanel.root );

        const tabs = this.area.addTabs( { parentClass: 'p-4', sizes: [ 'auto', 'auto' ], contentClass: 'p-2 pt-0' } );

        // Orders
        const ordersContainer = LX.makeContainer( [ null, 'auto' ], Constants.TAB_CONTAINER_CLASSNAME );
        tabs.add( 'Pedidos', ordersContainer, { selected: true, onSelect: ( event, name ) => this.showOrdersList() } );
        const ordersArea = new LX.Area( { className: Constants.TAB_AREA_CLASSNAME } );
        ordersContainer.appendChild( ordersArea.root );

        // Stock List
        const stockListContainer = LX.makeContainer( [ null, 'auto' ], Constants.TAB_CONTAINER_CLASSNAME );
        tabs.add( 'Listado Stock', stockListContainer, { xselected: true, onSelect: ( event, name ) => this.showStockList() } );
        const stockListArea = new LX.Area( { className: Constants.TAB_AREA_CLASSNAME } );
        stockListContainer.appendChild( stockListArea.root );

        // Albaran/IVA/Etc List
        const albaranContainer = LX.makeContainer( [ null, 'auto' ], Constants.TAB_CONTAINER_CLASSNAME );
        tabs.add( 'IVA/Albarán', albaranContainer, { xselected: true, onSelect: ( event, name ) => {
            albaranArea.root.innerHTML = '';
            albaranArea.attach( this.core.createDropZone( this.area, ( fileData ) => this.showAlbaranRelatedInfo( fileData, ATTR_PARAMS ), 'listados de envíos' ) );
        } } );
        const albaranArea = new LX.Area( { className: Constants.TAB_AREA_CLASSNAME } );
        albaranContainer.appendChild( albaranArea.root );

        // Move up into the panel section
        utilsPanel.attach( tabs.root );

        this.ordersArea = ordersArea;
        this.stockListArea = stockListArea;
        this.albaranArea = albaranArea;

        this.countries = [ 'ESPAÑA', 'PORTUGAL', 'FRANCIA', 'ITALIA' ];
        this.countryTransportCostPct['ESPAÑA'] = 0.303;
        this.countryTransportCostPct['PORTUGAL'] = 0.32;
        this.countryTransportCostPct['FRANCIA'] = 0.32;
        this.countryTransportCostPct['ITALIA'] = 0.32;

        this._onParseData = ( data, external ) => {
            // Remove "ready to ship" / orders that have already been processed (Miravia only)
            data = data.filter( ( r ) => r['Estado'] === 'pending' );
            // Combine by ORDER_SKU (SHEIN, Miravia only)
            data = Utils.combineRowsByKeys( data, ORDER_ATTR, SKU_ATTR );
            return data;
        };

        this._onParseAlbaranData = ( data, external ) => {
            // Remove everything that's not shipped or delivered and doesn't have tracking number
            data = data.filter( ( r ) => {
                return ( ( r['Estado'] === 'shipped' ) || ( r['Estado'] === 'delivered' ) ) && r[''] !== '';
            } );
            // Combine by ORDER_SKU (SHEIN, Miravia only)
            data = Utils.combineRowsByKeys( data, ORDER_ATTR, SKU_ATTR );
            return data;
        };

        this._onParseRowData = ( row ) => {
            const street1 = row['Dirección de envío'] ?? '';
            const street2 = row['Dirección de envío 2'] ?? '';
            row[STREET_ATTR] = `${street1} ${street2}`.trim();
        };

        this.clear();
    }

    openData( data )
    {
        if ( !data?.length )
        {
            return;
        }

        // Map SKUs, Country, CP, ...
        data = this.parseData( data, ATTR_PARAMS );

        this.showOrdersList( data );
        this.showStockList( data );
    }

    showOrdersList( data )
    {
        data = data ?? this.lastOrdersData;

        Utils.clearArea( this.ordersArea );

        const tableWidget = this.getOrdersListTable( data, ORDERS_DATA );
        this.ordersArea.attach( tableWidget );
    }

    showStockList( data )
    {
        data = data ?? this.lastOrdersData;

        Utils.clearArea( this.stockListArea );
        
        let columnData = [
            [ BaseApp.SKU_ATTR ],
            [ 'Unidades', null, ( str, row ) => {
                return parseInt( row[QNT_ATTR] ) * this.getPackUnits( row[OLD_SKU_ATTR] );
            } ],
            [ 'Transporte', null, () => 'CORREOS EXPRÉS' ],
            [ 'Plataforma', null, ( str, row ) => {
                const oN = row[ORDER_ATTR];
                if ( oN.length === 16 ) return 'ALIEXPRESS';
                if ( oN.length === 13 ) return 'MIRAVIA';
                return 'NO DETECTADO';
            } ], // MIRAVIA OR ALIEXPRESS
            [ PAIS_ATTR, BaseApp.PAIS_ATTR ],
            [ 'Observaciones' ],
            [ ORDER_ATTR, BaseApp.ORDER_ATTR ]
        ];

        const tableWidget = this.getStockListTable( data, columnData, ORDER_ATTR );
        this.stockListArea.attach( tableWidget );
    }

    close()
    {
        this.clear();
    }

    clear()
    {
        super.clear();

        delete this.lastOrdersData;
        this.showOrdersList( [] );
        this.showStockList( [] );
        this.showAlbaranRelatedInfo( [], ATTR_PARAMS );
    }
}

export { MiraviaApp };
