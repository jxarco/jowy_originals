import { LX } from 'lexgui';
import { Constants } from '../constants.js';
import { Data } from '../data.js';
import * as Utils from '../utils.js';
import { BaseApp } from './base_app.js';

const SKU_ATTR = 'SKU de Tienda';
const OLD_SKU_ATTR = `${SKU_ATTR}_OLD`;
const ORDER_ATTR = 'Número de pedido';
const ORDER_LINE_ATTR = 'N.º de asiento de pedido';
const ART_ID_ATTR = 'SKU del producto';
const ART_NAME_ATTR = 'Detalles';
const CLIENT_NAME_ATTR = 'Dirección de entrega: nombre';
const PAIS_ATTR = 'Dirección de entrega: país';
const CP_ATTR = 'Dirección de entrega: código postal';
const PHONE_ATTR = 'Dirección de entrega: teléfono';
const STREET_ATTR = 'Dirección de entrega: calle';
const CITY_ATTR = 'Dirección de entrega: ciudad';
const PVP_ATTR = 'Precio por unidad';
const ORDER_DATE_ATTR = 'Fecha de creación';
const QNT_ATTR = 'Cantidad';
const ATTR_PARAMS = { SKU_ATTR, OLD_SKU_ATTR, ORDER_ATTR, ORDER_LINE_ATTR, ART_ID_ATTR, ART_NAME_ATTR, CLIENT_NAME_ATTR, PAIS_ATTR, CP_ATTR, PHONE_ATTR, STREET_ATTR, CITY_ATTR, PVP_ATTR, ORDER_DATE_ATTR, QNT_ATTR };

const ORDERS_DATA = [
    [ ORDER_ATTR, BaseApp.ORDER_ATTR ],
    [ ART_ID_ATTR, BaseApp.ART_ID_ATTR ],
    [ OLD_SKU_ATTR ],
    [ SKU_ATTR, BaseApp.SKU_ATTR ],
    [ ART_NAME_ATTR, BaseApp.ART_NAME_ATTR, ( str, row ) => {
        return `<span title='${str}'>${str}</span>`;
    } ],
    [ QNT_ATTR, 'Cantidad', ( str, row, app ) => {
        return parseInt( str ) * app.getPackUnits( row[OLD_SKU_ATTR] );
    } ],
    [ CLIENT_NAME_ATTR, BaseApp.CLIENT_NAME_ATTR ],
    [ CP_ATTR, BaseApp.CP_ATTR ],
    [ PAIS_ATTR, BaseApp.PAIS_ATTR ],
    [ 'Provincia', null, ( str, row ) => '' ],
    [ CITY_ATTR, BaseApp.CITY_ATTR ],
    [ STREET_ATTR, BaseApp.STREET_ATTR ],
    [ PHONE_ATTR, BaseApp.PHONE_ATTR ],
    [ BaseApp.EMAIL_ATTR, null, ( str, row ) => '' ],
];

const LABEL_DATA = [
    [ ORDER_ATTR, BaseApp.ORDER_ATTR ],
    [ 'Bultos', null, ( str, row ) => {
        const sku = row[SKU_ATTR];
        const mSkus = Data.sku_map[sku];
        if( mSkus?.skus?.length > 1 ) return 1; // CUSTOM; DON'T DO ANYTHING SPECIFIC
        const qnt = parseInt( row[QNT_ATTR] ); // PER PACKAGE
        const udsPerPackage = Data.sku[sku]?.['UDS./BULTO'];
        if ( udsPerPackage === undefined ) return 1;
        return Math.ceil( qnt / udsPerPackage );
    } ],
    [ SKU_ATTR, BaseApp.SKU_ATTR ],
    [ CP_ATTR, BaseApp.CP_ATTR ],
    [ PAIS_ATTR, BaseApp.PAIS_ATTR ],
    [ 'Provincia', null, ( str, row ) => '' ],
    [ CITY_ATTR, BaseApp.CITY_ATTR ],
    [ STREET_ATTR, BaseApp.STREET_ATTR ],
    [ CLIENT_NAME_ATTR, BaseApp.CLIENT_NAME_ATTR ],
    [ PHONE_ATTR, BaseApp.PHONE_ATTR ],
    [ BaseApp.EMAIL_ATTR, null, ( str, row ) => '' ],
    // THIS ONE HAS TO BE DELETED
    [ QNT_ATTR, null, ( str, row, app ) => {
        return parseInt( str ) * app.getPackUnits( row[OLD_SKU_ATTR] );
    } ],
];

// (str, row, tracking_data, app)
const TRACKING_DATA = [
    [ ORDER_ATTR, 'order-id' ],
    [ 'carrier_code', 'carrier-code', () => 'SEUR (Spain)' ],
    [ 'carrier_standard_code', 'carrier-standard-code', () => '' ],
    [ 'carrier_name', 'carrier-name', () => 'SEUR' ],
    [ 'carrier_url', 'carrier-url', () => 'https://www.seur.com/livetracking?segOnlineIdentificador=%7BtrackingId%7D&segOnlineIdioma=en' ],
    [ 'tracking_number', 'tracking-number', ( str, row, tdata, app ) => {
        const name = row[CLIENT_NAME_ATTR];
        const tentry = tdata.find( ( d ) => d['CLIENTE DESTINATARIO'] === name.toUpperCase() );
        if ( !tentry )
        {
            app._trackingSyncErrors.push( { name, uid: row[ORDER_LINE_ATTR] } );
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
    [ SKU_ATTR, 'offer-sku' ],
    [ ORDER_LINE_ATTR, 'order-line-id' ],
    [ QNT_ATTR, 'quantity' ]
];

class DecathlonApp extends BaseApp
{
    constructor( core, tool )
    {
        super( core, tool );

        this.title = 'Decathlon';
        this.subtitle = 'Arrastra un <strong>.xlsx</strong> o haz click aquí para cargar un nuevo listado de envíos.';
        this.icon = 'Decathlon';
        this.loadRaw = true; // load xlsx files in raw mode

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
            albaranArea.attach( this.core.createDropZone( this.area, ( fileData ) => this.showAlbaranRelatedInfo( fileData, ATTR_PARAMS, true ), 'listados de envíos' ) );
        } } );
        const albaranArea = new LX.Area( { className: Constants.TAB_AREA_CLASSNAME } );
        albaranContainer.appendChild( albaranArea.root );

        // Move up into the panel section
        utilsPanel.attach( tabs.root );

        this.ordersArea = ordersArea;
        this.stockListArea = stockListArea;
        this.trackingArea = trackingArea;
        this.albaranArea = albaranArea;

        this.countries = [ 'ESPAÑA' ]; // , 'PORTUGAL', 'FRANCIA' ];
        this.countryTransportCostPct['ESPAÑA'] = 0.303;

        this._onParseData = ( data, external ) => {
            // Filter "Esperando envío"
            return data.filter( ( r ) => r['Estado'] === 'Esperando envío' );
        };

        this._onParseRowData = ( row ) => {
            const name1 = row['Dirección de entrega: nombre de pila'] ?? '';
            const name2 = row['Dirección de entrega: apellido'] ?? '';
            row[CLIENT_NAME_ATTR] = `${name1} ${name2}`.trim();

            const street1 = row['Dirección de entrega: calle 1'] ?? '';
            const street2 = row['Dirección de entrega: calle 2'] ?? '';
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

        const tableWidget = this.getOrdersListTable( data, ORDERS_DATA, {
            centered: [ 'Cantidad', 'Bultos' ]
        } );
        this.ordersArea.attach( tableWidget );
    }

    showStockList( data )
    {
        data = data ?? this.lastOrdersData;

        Utils.clearArea( this.stockListArea );

        let columnData = [
            [ SKU_ATTR, BaseApp.SKU_ATTR ],
            [ 'Unidades', null, ( str, row ) => {
                return parseInt( row[QNT_ATTR] ) * this.getPackUnits( row[OLD_SKU_ATTR] );
            } ],
            [ 'Transporte', null, ( str, row ) => {
                const qnt = parseInt( row[QNT_ATTR] ) * this.getPackUnits( row[OLD_SKU_ATTR] );
                return this.core.getTransportForItem( row[SKU_ATTR], qnt );
            } ],
            [ 'Plataforma', null, () => 'DECATHLON' ],
            [ PAIS_ATTR, BaseApp.PAIS_ATTR ],
            [ 'Observaciones', null ],
            [ ORDER_ATTR, BaseApp.ORDER_ATTR ]
        ];

        const tableWidget = this.getStockListTable( data, columnData, ORDER_ATTR );
        this.stockListArea.attach( tableWidget );
    }

    showTrackingList( tData )
    {
        Utils.clearArea( this.trackingArea );
        
        const tableWidget = this.getTrackingListTable( tData, TRACKING_DATA, {
            centered: true,
            filter: 'tracking-number',
            hiddenColumns: [ 'carrier-standard-code' ]
        } );
        this.trackingArea.attach( tableWidget );

        Utils.toggleButtonDisabled( this.exportTrackingsButton, false );
    }

    exportSEUR( ignoreErrors = false, rawData )
    {
        const filename = `ETIQUETAS_SEUR_${this.title}_${Utils.getTodayStringDate()}.xlsx`;
        const data = ( rawData ?? this.lastOrdersData ).filter( r => {
            // discard orders sent with CBL
            const qnt = parseInt( r[QNT_ATTR] ) * this.getPackUnits( r[OLD_SKU_ATTR] );
            return this.core.getTransportForItem( r[SKU_ATTR], qnt ) === 'SEUR';
        } );
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
                    const possibleIndex = data.findIndex( ( d ) => `${d[0]}` === uid );
                    // console.log(possibleIndex)
                    const trackAttrName = 'ID de seguimiento';
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

export { DecathlonApp };
