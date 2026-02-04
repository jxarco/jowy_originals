import { LX } from 'lexgui';
import { Constants } from '../constants.js';
import * as Utils from '../utils.js';
import { BaseApp } from './base_app.js';

const SKU_ATTR = BaseApp.SKU_ATTR;
const OLD_SKU_ATTR = `${SKU_ATTR}_OLD`;
const ORDER_ATTR = BaseApp.ORDER_ATTR;
const ART_ID_ATTR = BaseApp.ART_ID_ATTR;
const ART_NAME_ATTR = BaseApp.ART_NAME_ATTR;
const CLIENT_NAME_ATTR = BaseApp.CLIENT_NAME_ATTR;
const PAIS_ATTR = BaseApp.PAIS_ATTR;
const CP_ATTR = BaseApp.CP_ATTR;
const PHONE_ATTR = BaseApp.PHONE_ATTR;
const STREET_ATTR = 'dirección de usuario';
const CITY_ATTR = BaseApp.CITY_ATTR;
const PVP_ATTR = 'precio de los productos básicos';
const ORDER_DATE_ATTR = 'Fecha y hora de creación de pedido';
const QNT_ATTR = '_quantity';
const ATTR_PARAMS = { SKU_ATTR, OLD_SKU_ATTR, ORDER_ATTR, ART_ID_ATTR, ART_NAME_ATTR, CLIENT_NAME_ATTR, PAIS_ATTR, CP_ATTR, PHONE_ATTR, STREET_ATTR, CITY_ATTR, PVP_ATTR, ORDER_DATE_ATTR, QNT_ATTR };

const ORDERS_DATA = [
    [ ORDER_ATTR ],
    [ ART_ID_ATTR ],
    [ OLD_SKU_ATTR ],
    [ SKU_ATTR ],
    [ QNT_ATTR, 'Cantidad', ( str, row ) => {
        return parseInt( str ) * row[BaseApp.PACK_U_ATTR];
    } ],
    [ ART_NAME_ATTR, null, ( str, row ) => {
        return `<span title='${str}'>${str}</span>`;
    } ],
    [ CLIENT_NAME_ATTR ],
    [ CP_ATTR ],
    [ PAIS_ATTR ],
    [ 'Provincia' ],
    [ CITY_ATTR ],
    [ STREET_ATTR, BaseApp.STREET_ATTR ],
    [ PHONE_ATTR ],
    [ BaseApp.EMAIL_ATTR ]
];

const LABEL_DATA = [
    [ ORDER_ATTR ],
    [ 'Bultos', null, ( str, row ) => {
        const sku = row[SKU_ATTR];
        const mSkus = Data.sku_map[sku];
        if( mSkus?.skus?.length > 1 ) return 1; // CUSTOM; DON'T DO ANYTHING SPECIFIC
        const qnt = parseInt( row[QNT_ATTR] ); // PER PACKAGE
        const udsPerPackage = Data.sku[sku]?.['UDS./BULTO'];
        if ( udsPerPackage === undefined ) return 1;
        return Math.ceil( qnt / udsPerPackage );
    } ],
    [ SKU_ATTR ],
    [ CP_ATTR ],
    [ PAIS_ATTR ],
    [ 'Provincia', null ],
    [ 'Ciudad', null ],
    [ STREET_ATTR, BaseApp.STREET_ATTR ],
    [ CLIENT_NAME_ATTR ],
    [ PHONE_ATTR ],
    [ BaseApp.EMAIL_ATTR ],
    // THIS ONE HAS TO BE DELETED
    [ QNT_ATTR, null, ( str, row ) => {
        return parseInt( str ) * row[BaseApp.PACK_U_ATTR];
    } ],
];

const TRACKING_DATA = [
    [ ORDER_ATTR, 'Order Number' ],
    [ ART_ID_ATTR, 'Item ID' ],
    [ 'Tracking Number', null, ( str, row, tdata, app ) => {
        const name = row[CLIENT_NAME_ATTR].toUpperCase();
        const tentry = tdata.find( ( d ) => d['CLIENTE DESTINATARIO'] === name );
        if ( !tentry )
        {
            app._trackingSyncErrors.push( { name, uid: `${row[ORDER_ATTR]}_${row[ART_ID_ATTR]}` } );
            const status = core.trackStatusColors['Incidencia'];
            let iconStr = status.icon ? LX.makeIcon( status.icon, { svgClass: 'md text-white!' } ).innerHTML : '';
            return `${
                LX.badge( iconStr, 'text-xs font-bold border-none ', {
                    style: { height: '1.4rem', borderRadius: '0.65rem', backgroundColor: status.bg ?? '', color: status.fg ?? '' }
                } )
            }`;
        }
        return tentry['LOCALIZADOR'];
    } ],
    [ 'Logistics Provider', null, () => 'SEUR' ],
    [ 'Delete', null, () => '' ]
];

class SheinApp extends BaseApp
{
    constructor( core, tool )
    {
        super( core, tool );

        this.title = 'SHEIN';
        this.subtitle = 'Arrastra un <strong>.xlsx</strong> o haz click aquí para cargar un nuevo listado de envíos.';
        this.icon = 'Shein';

        // Create utility buttons
        const utilsPanel = new LX.Panel( { height: 'auto', className: Constants.UTILITY_BUTTONS_PANEL_CLASSNAME } );
        utilsPanel.sameLine();
        Utils.addUtilityButton( utilsPanel, 'ClearButton', 'Trash2', 'Limpiar datos anteriores', () => this.core.clearData() );
        this.exportLabelsButton = Utils.addUtilityButton( utilsPanel, 'ExportLabelsButton', 'Download', 'Exportar Etiquetas', () => this.exportSEUR( false, this.lastOrdersData ), true );
        this.exportTrackingsButton = Utils.addUtilityButton( utilsPanel, 'ExportTrackingsButton', 'FileDown', 'Exportar Seguimiento', () => this.exportSEURTrackings(), true );
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

        // Tracking info
        const trackingContainer = LX.makeContainer( [ null, 'auto' ], Constants.TAB_CONTAINER_CLASSNAME );
        tabs.add( 'Seguimiento', trackingContainer, { xselected: true, onSelect: ( event, name ) => {
            trackingArea.root.innerHTML = '';
            trackingArea.attach( this.core.createDropZone( this.area, this.showTrackingList.bind( this ), 'un listado de trackings' ) );
        } } );
        const trackingArea = new LX.Area( { className: Constants.TAB_AREA_CLASSNAME } );
        trackingContainer.appendChild( trackingArea.root );

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
        this.trackingArea = trackingArea;
        this.albaranArea = albaranArea;

        this.countries = [ 'ESPAÑA', 'PORTUGAL' ];
        this.countryTransportCostPct['ESPAÑA'] = 0.303;
        this.countryTransportCostPct['PORTUGAL'] = 0.32;

        this._onParseData = ( data, external ) => {
            // Combine by ORDER_SKU (SHEIN, Miravia only)
            return Utils.combineRowsByKeys( data, ORDER_ATTR, SKU_ATTR );
        };

        this._onParseRowData = ( row ) => {
            const street1 = row['dirección de usuario 1'] ?? '';
            const street2 = row['dirección de usuario 2'] ?? '';
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

        Utils.toggleButtonDisabled( this.exportLabelsButton, false );
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
            [ 'Transporte', null, () => 'SEUR' ],
            [ 'Plataforma', null, () => 'SHEIN' ],
            [ PAIS_ATTR ],
            [ 'Observaciones' ],
            [ ORDER_ATTR ]
        ];

        const tableWidget = this.getStockListTable( data, columnData, ORDER_ATTR );
        this.stockListArea.attach( tableWidget );
    }

    showTrackingList( tData )
    {
        Utils.clearArea( this.trackingArea );

        const data = this.lastOrdersData;

        const tableWidget = this.getTrackingListTable( data, tData, TRACKING_DATA, {
            centered: true,
            filter: 'Tracking Number',
            hiddenColumns: [ 'Delete' ]
        } );
        this.trackingArea.attach( tableWidget );

        Utils.toggleButtonDisabled( this.exportTrackingsButton, false );
    }

    exportSEUR( ignoreErrors = false, rawData )
    {
        const filename = `ETIQUETAS_SEUR_${this.title}_${Utils.getTodayStringDate()}.xlsx`;
        const data = rawData ?? this.lastOrdersData;
        const labelsData = this.getSEURLabelsData( ignoreErrors, data, LABEL_DATA, ORDER_ATTR );
        this.core.exportXLSXData( labelsData, filename, ignoreErrors );
    }

    exportSEURTrackings( fixedData, ignoreErrors )
    {
        const filename = `NUMERODEGUIA_SEUR_${this.title}_${Utils.getTodayStringDate()}.xlsx`;
        const data = fixedData ?? [ this.lastSeurTrackingsColumnData, ...this.lastShownSeurTrackingsData ];

        if ( !ignoreErrors && this._trackingSyncErrors.length )
        {
            const dialog = new LX.Dialog( '❌ Solucionar errores', ( p ) => {
                LX.addClass( p.root, 'p-2 flex flex-col overflow-scroll' );

                const pTop = new LX.Panel( { className: 'flex flex-col gap-1 overflow-scroll' } );
                p.attach( pTop );

                for ( const { name, uid } of this._trackingSyncErrors )
                {
                    LX.makeElement( 'div', '[&_span]:font-bold [&_span]:text-foreground', `No existe tracking para <span>${name}</span> (${uid})`, pTop );
                    const possibleIndex = data.findIndex( ( d ) => `${d[0]}_${d[1]}` === uid );
                    // console.log(possibleIndex)
                    const trackAttrName = 'Tracking Number';
                    pTop.addText( trackAttrName, '', ( v ) => {
                        const colIdx = this.lastSeurTrackingsColumnData.indexOf( trackAttrName );
                        data[possibleIndex][colIdx] = v;
                    } );
                    pTop.addSeparator();
                }

                const pBottom = new LX.Panel( { height: 'auto' } );
                p.attach( pBottom );

                pBottom.sameLine( 2 );
                pBottom.addButton( null, 'Ignorar', () => {
                    dialog.close();
                    this.exportSEURTrackings( data, true );
                }, { width: '50%', buttonClass: 'destructive' } );
                pBottom.addButton( null, 'Exportar', () => {
                    dialog.close();
                    this.exportSEURTrackings( data, true );
                }, { width: '50%', buttonClass: 'primary' } );
            }, { position: [ 'calc(50% - 300px)', '250px' ], size: [ '600px', 'min(600px, 80%)' ] } );
            return;
        }

        this.core.exportXLSXData( data, filename );
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
        this.showTrackingList( [] );
        this.showAlbaranRelatedInfo( [], ATTR_PARAMS );

        Utils.toggleButtonDisabled( this.exportLabelsButton, true );
        Utils.toggleButtonDisabled( this.exportTrackingsButton, true );
    }
}

export { SheinApp };
