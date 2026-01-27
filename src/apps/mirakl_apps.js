import { LX } from 'lexgui';
import { BaseApp } from './base_app.js';
import { Constants } from '../constants.js';
import { Data } from '../data.js';
import { MiraklClient } from '../mirakl-api.js';
import * as Utils from '../utils.js';

const SKU_ATTR = 'offer_sku';
const ORDER_ATTR = 'order_id';

const VENDOR_TEMPLATES = {
    'DECATHLON_ORDERS_DATA': [
        [ 'preview', 'PREVIEW', ( row, i, url ) => {
            return `<img title="${i['product_title']}" class="rounded" style="width:3rem;" src="${url}${i['product_medias'][1]['media_url']}">`;
        } ],
        [ ORDER_ATTR, BaseApp.ORDER_ATTR ],
        [ 'date', 'FECHA', ( r ) => {
            const d = new Date( r['created_date'] );
            return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
        } ],
        [ BaseApp.ART_ID_ATTR, null, ( row, i ) => i['product_sku'] ],
        [ SKU_ATTR, BaseApp.SKU_ATTR ],
        [ 'product_title', 'Nombre del producto' ],
        [ 'quantity', 'Cantidad' ],
        [ 'Bultos', null, ( row, i ) => {
            const sku = i[SKU_ATTR];
            const q = parseInt( i['quantity'] ) * i[BaseApp.PACK_U_ATTR];
            const udsPerPackage = Data.sku[sku]?.['UDS./BULTO'];
            if ( udsPerPackage === undefined ) return 'SKU no encontrado';
            return Math.ceil( q / udsPerPackage );
        } ],
        [ 'Nombre de usuario completo', null, ( row, i ) => {
            const customer = row.customer;
            const str1 = customer?.firstname;
            const str2 = customer?.lastname;
            return str1 + ( str2 ? ` ${str2}` : '' );
        } ],
        [ BaseApp.PAIS_ATTR, null, ( row, i ) => {
            return row.customer?.shipping_address?.country;
        } ],
        [ 'Provincia', null, ( row, i ) => '' ],
        [ 'Ciudad', null, ( row, i ) => {
            return row.customer?.shipping_address?.city;
        } ],
        [ BaseApp.CP_ATTR, null, ( row, i ) => {
            return row.customer?.shipping_address?.zip_code;
        } ],
        [ 'Dirección', null, ( row, i ) => {
            const shipping = row.customer?.shipping_address;
            const str1 = shipping?.street_1;
            const str2 = shipping?.street_2;
            return str1 + ( str2 ? ` ${str2}` : '' );
        } ],
        [ 'Número de Teléfono', null, ( row, i ) => {
            return row.customer?.shipping_address?.phone;
        } ],
        [ 'Correo electrónico de usuario', null, ( row, i ) => '' ]
    ],

    'DECATHLON_LABEL_DATA': [
        [ ORDER_ATTR, BaseApp.ORDER_ATTR ],
        [ 'Bultos', null, ( str, row, i ) => 1 ],
        [ SKU_ATTR, BaseApp.SKU_ATTR ],
        [ BaseApp.CP_ATTR, null, ( str, row ) => {
            return row.customer?.shipping_address?.zip_code;
        } ],
        [ BaseApp.PAIS_ATTR, null, ( str, row ) => {
            return row.customer?.shipping_address?.country;
        } ],
        [ 'Provincia', null, ( str, row ) => '' ],
        [ 'Ciudad', null, ( str, row ) => {
            return row.customer?.shipping_address?.city;
        } ],
        [ 'Dirección', null, ( str, row ) => {
            const shipping = row.customer?.shipping_address;
            const str1 = shipping?.street_1;
            const str2 = shipping?.street_2;
            return str1 + ( str2 ? ` ${str2}` : '' );
        } ],
        [ 'Nombre de usuario completo', null, ( str, row ) => {
            const customer = row.customer;
            const str1 = customer?.firstname;
            const str2 = customer?.lastname;
            return str1 + ( str2 ? ` ${str2}` : '' );
        } ],
        [ 'Número de Teléfono', null, ( str, row ) => {
            return row.customer?.shipping_address?.phone;
        } ],
        [ 'Correo electrónico de usuario', null, ( str, row ) => '' ],
        [ 'quantity' ] // THIS ONE HAS TO BE DELETED
    ],

    // (str, row, tracking_data, app)
    'DECATHLON_TRACKING_DATA': [
        [ ORDER_ATTR, 'order-id' ],
        [ 'carrier_code', 'carrier-code', () => 'SEUR (Spain)' ],
        [ 'carrier_standard_code', 'carrier-standard-code', () => '' ],
        [ 'carrier_name', 'carrier-name', () => 'SEUR' ],
        [ 'carrier_url', 'carrier-url', () => 'https://www.seur.com/livetracking?segOnlineIdentificador=%7BtrackingId%7D&segOnlineIdioma=en' ],
        [ 'tracking_number', 'tracking-number', ( str, row, item, tdata, app ) => {
            const customer = row.customer;
            const str1 = customer?.firstname;
            const str2 = customer?.lastname;
            const name = str1 + ( str2 ? ` ${str2}` : '' );
            const tentry = tdata.find( ( d ) => d['CLIENTE DESTINATARIO'] === name.toUpperCase() );
            if ( !tentry )
            {
                app._trackingSyncErrors.push( { name, uid: item['order_line_id'] } );
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
        [ 'order_line_id', 'order-line-id' ],
        [ 'quantity' ]
    ]
};

class MiraklApp extends BaseApp
{
    constructor( core, vendorName )
    {
        super( core, vendorName.toLowerCase() );

        this.title = `${vendorName} <i>(Mirakl)</i>`;
        this.subtitle = 'Gestión de pedidos a través de la API de Mirakl.';
        this.icon = vendorName;
        this.mkClient = new MiraklClient();
        this.vendor = vendorName;

        const vendor_lc = vendorName.toLowerCase();

        // Create utility buttons
        const utilsPanel = new LX.Panel( { height: 'auto', className: Constants.UTILITY_BUTTONS_PANEL_CLASSNAME } );
        utilsPanel.sameLine();
        Utils.addUtilityButton( utilsPanel, 'ClearButton', 'Trash2', 'Limpiar datos anteriores', () => this.core.clearData() );
        this.exportLabelsButton = Utils.addUtilityButton( utilsPanel, 'ExportLabelsButton', 'Download', 'Exportar Etiquetas', () => this.exportSEUR( false, this.lastOrdersData ), true );
        this.exportTrackingsButton = Utils.addUtilityButton( utilsPanel, 'ExportTrackingsButton', 'FileDown', 'Exportar Seguimiento', () => this.exportSEURTrackings(), true );
        Utils.addUtilityButton( utilsPanel, 'UpdateOrdersButton', 'RefreshCw', 'Actualizar pedidos', () => this.showOrders( vendor_lc ) );

        utilsPanel.endLine();

        this.area.attach( utilsPanel.root );

        const tabs = this.area.addTabs( { parentClass: 'p-4', sizes: [ 'auto', 'auto' ], contentClass: 'p-2 pt-0' } );

        // Orders
        const ordersContainer = LX.makeContainer( [ null, 'auto' ], Constants.TAB_CONTAINER_CLASSNAME );
        tabs.add( 'Pedidos', ordersContainer, { selected: true, onSelect: ( event, name ) => this.showOrders( vendor_lc ) } );
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
        // const albaranContainer = LX.makeContainer( [ null, 'auto' ], Constants.TAB_CONTAINER_CLASSNAME );
        // tabs.add( 'IVA/Albarán', albaranContainer, { xselected: true, onSelect: ( event, name ) => {
        //     albaranArea.root.innerHTML = '';
        //     albaranArea.attach( this.core.createDropZone( this.area, this.showAlbaranRelatedInfo.bind( this ), 'listados de envíos' ) );
        // } } );
        // const albaranArea = new LX.Area( { className: Constants.TAB_AREA_CLASSNAME } );
        // albaranContainer.appendChild( albaranArea.root );

        // Move up into the panel section
        utilsPanel.attach( tabs.root );

        this.ordersArea = ordersArea;
        this.stockListArea = stockListArea;
        this.trackingArea = trackingArea;
        // this.albaranArea = albaranArea;

        this.countries = [ 'ESPAÑA' ];//, 'PORTUGAL', 'FRANCIA' ];
        this.countryTransportCostPct['ESPAÑA'] = 0.303;

        this.clear();
    }

    openMiraklLogin( callback )
    {
        const core = this.core;
        const dialog = new LX.Dialog( this.vendor + ' Mirakl Login', ( p ) => {
            const vendor_lc = this.vendor.toLowerCase();
            let at = localStorage.getItem( vendor_lc + '_mirakl_access_token' ) ?? '';
            let store = core.data[vendor_lc].store;
            let spinner = null;

            p.addText( 'URL Tienda', store, ( value, event ) => {}, { disabled: true, nameWidth: '30%', skipReset: true } );
            p.addText( 'Clave cliente', at, ( value, event ) => {
                at = value;
            }, { nameWidth: '30%', skipReset: true, type: 'password' } );
            const loginButton = p.addButton( null, 'Login', async ( value, event ) => {
                spinner = new LX.Spinner();
                loginButton.root.querySelector( 'button' ).prepend( spinner.root );

                try {
                    const r = await this.mkClient.authenticate( store, at );
                    if ( r.ok )
                    {
                        dialog.close();

                        LX.toast( 'Hecho!', `✅ Has iniciado sesión en ${store}`, { timeout: 5000, position: 'top-center' } );

                        // Store in localStorage
                        localStorage.setItem( vendor_lc + '_mirakl_access_token', at );

                        if ( callback )
                        {
                            callback();
                        }
                    }
                    else
                    {
                        spinner.destroy();
                        LX.emitSignal( '@login_errors', '❌ Credenciales no válidas' );
                    }
                }
                catch( err ) {
                    spinner.destroy();
                    LX.emitSignal( '@login_errors', `❌ ${err}` );
                }
            }, { buttonClass: 'primary flex flex-row justify-center gap-2', skipReset: true } );
            p.addSeparator();
            p.addTextArea( null, '', null, { disabled: true, fitHeight: true, signal: '@login_errors' } );
        }, { modal: true, position: [ 'calc(50% - 200px)', '250px' ], size: [ '400px', null ], closable: true, draggable: false } );
    }

    async showOrders( compName, clean = false )
    {
        const core = this.core;
        const compData = core.data[compName];
        const { name, url } = compData;
 
        Utils.clearArea( this.ordersArea );

        // if ( clean )
        // {
        //     return;
        // }

        if ( !clean && !this.mkClient.connected )
        {
            this.openMiraklLogin( () => this.showOrders( compName, clean ) );
            return;
        }

        const tableData = [];
        const columnData = VENDOR_TEMPLATES[this.vendor.toUpperCase() + '_ORDERS_DATA'];

        let r = null;

        if ( !clean )
        {
            const dialog = Utils.makeLoadingDialog( 'Cargando pedidos, espere...' );

            r = await this.mkClient.listOrders( {
                sort: 'dateCreated',
                order: 'desc',
                order_state_codes: 'SHIPPING'
            } );
            console.log( r );

            this.core.setHeaderTitle( `${name} <i>(Mirakl):</i> ${r.orders.length} pedidos`, 'Gestión de pedidos a través de la API de Mirakl.', this.vendor );

            // Create table data from the list
            r.orders.forEach( ( row ) => {

                const ogCountry = row.customer?.shipping_address?.country;
                row.customer.shipping_address.country = this.core.mapCountry( ogCountry );
                const ogZipCode = row.customer?.shipping_address?.zip_code;
                row.customer.shipping_address.zip_code = this.core.mapZipCode( ogZipCode );

                const items = row['order_lines'];

                for ( let item of items )
                {
                    // Map SKUs and Country once on load data
                    const ogSku = item[SKU_ATTR];
                    if ( !ogSku || ogSku === '' ) LX.toast( 'Aviso!', `⚠️ Falta SKU para el pedido ${r[ORDER_ATTR]}.`, { timeout: -1, position: 'top-center' } );
                    else {
                        
                        item[SKU_ATTR + '_OLD'] = ogSku; // Store old sku in case it's necessary
                        const skuData = this.core.mapSku( ogSku );
                        item[SKU_ATTR] = skuData.sku; // replace with new sku
                        this._packUnits[skuData.sku] = skuData.quantity; // save pack quantity
                        item[BaseApp.PACK_U_ATTR] = skuData.quantity; // store also in row
                    }

                    const lRow = [];

                    for ( let c of columnData )
                    {
                        const ogColName = c[0];
                        if ( c[2] )
                        {
                            const fn = c[2];
                            lRow.push( fn( row, item, url ) );
                        }
                        else if ( item[ogColName] )
                        {
                            lRow.push( item[ogColName] );
                        }
                        else if ( row[ogColName] )
                        {
                            lRow.push( row[ogColName] );
                        }
                        else
                        {
                            lRow.push( '?' );
                        }
                    }

                    tableData.push( lRow );
                }
            } );

            dialog.destroy();

            Utils.toggleButtonDisabled( this.exportLabelsButton, false );
        }
        else
        {
            r = { orders: [] };
        }

        const date = new Date();
        const todayStringDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

        const tableWidget = new LX.Table( null, {
            head: columnData.map( ( c ) => {
                return c[1] ?? c[0];
            } ),
            body: tableData
        }, {
            selectable: false,
            sortable: false,
            toggleColumns: true,
            filter: 'REFERENCIA',
            centered: true,
            customFilters: [
                { name: 'FECHA', type: 'date', default: [ todayStringDate, todayStringDate ] },
                { name: 'PAÍS', options: [ 'ESPAÑA', 'FRANCIA', 'PORTUGAL' ] }
            ],
            rowActions: [
                {
                    icon: 'ExternalLink',
                    title: 'Abrir Pedido',
                    callback: ( rowIndex, rowData, tableDOM, event ) => {
                        const orderNumber = rowData[1];
                        if ( orderNumber !== '' ) window.open( `${url}mmp/shop/order/${orderNumber}` );
                    }
                }
            ],
            hiddenColumns: [ 'ID del artículo', 'Provincia', 'Dirección', 'Código Postal', 'Número de Teléfono', 'Correo electrónico de usuario' ]
        } );

        this.ordersArea.attach( tableWidget );

        this.lastOrdersData = r.orders;
    }

    showStockList( ogData )
    {
        ogData = ogData ?? this.lastOrdersData;

        let data = LX.deepCopy( ogData );

        Utils.clearArea( this.stockListArea );

        let columnData = [
            [ BaseApp.SKU_ATTR, null, ( row, i ) => {
                return i[SKU_ATTR];
            } ],
            [ 'Cantidad', null, ( row, i ) => {
                return i['quantity'];
            } ],
            [ 'Transporte', null, ( r, i ) => {
                return this.core.getTransportForItem( i[SKU_ATTR], i['quantity'] );
            } ],
            [ 'Plataforma', null, () => this.vendor.toUpperCase() ],
            [ 'País', null, ( row, i ) => {
                return row.customer?.shipping_address?.country;
            } ],
            [ 'Observaciones', null, ( row, i ) => {
                return i['quantity'] > 1 ? 'Mismo pedido' : '';
            } ],
            [ ORDER_ATTR, BaseApp.ORDER_ATTR ]
        ];

        const uid = columnData[6][0];
        const orderNumbers = new Map();

        // Create table data from the list
        let tableData = [];
        data.forEach( ( row, index ) => {
            const items = row['order_lines'];
            items.forEach( ( item, itemIndex ) => {
                const lRow = [];

                for ( let c of columnData )
                {
                    let colName = c[0];
                    if ( colName === uid )
                    {
                        const orderNumber = row[colName];

                        if ( orderNumbers.has( orderNumber ) )
                        {
                            const val = orderNumbers.get( orderNumber );
                            orderNumbers.set( orderNumber, [ ...val, index + itemIndex ] );
                        }
                        else
                        {
                            orderNumbers.set( orderNumber, [ index + itemIndex ] );
                        }
                    }

                    const fn = c[2] ?? ( ( str ) => str );
                    lRow.push( fn( row, item ) ?? '' );
                }

                tableData.push( lRow );
            } );
        } );

        const multipleItemsOrderNames = Array.from( orderNumbers.values() ).filter( ( v ) => v.length > 1 );

        for ( const repeats of multipleItemsOrderNames )
        {
            const finalIndex = repeats[0];
            const finalRow = tableData[finalIndex];
            const finalQuantity = finalRow[1];
            const rest = repeats.slice( 1 );
            const trail = rest.reduce( ( p, c ) => {
                const q = tableData[c][1]; // Get quantity
                return p + ` + ${tableData[c][0]}${q > 1 ? ` x ${q}` : ''}`;
            }, finalQuantity > 1 ? ` x ${finalQuantity}` : '' );
            rest.forEach( ( r ) => {
                tableData[r] = undefined;
            } );
            finalRow[0] += trail; // Add REF trail
            finalRow[0] = `<span title="${finalRow[0]}">${finalRow[0]}</span>`;
            finalRow[1] = 1; // Set always 1 UNIT for multiple item orders
            finalRow[2] = 'CBL'; // Set always CBL for multiple item orders
            finalRow[5] = 'Mismo pedido'; // Add NOTES
        }

        tableData = tableData.filter( ( r ) => r !== undefined );

        // Remove unnecessary headers (order number, at last pos)
        columnData = columnData.slice( 0, -1 );

        const listSKU = [];
        const skus = {};

        for ( let row of tableData )
        {
            const q = row[1];

            // if sku starts with "JW-T60", never combine with others, so we must
            // add a unique identifier in the sku
            let sku = `${row[0]}_${row[4]}`; // SKU _ País
            sku += sku.includes( 'JW-T60' ) ? `_${LX.guidGenerator()}` : '';

            // Delete order num (last pos)
            row = row.slice( 0, -1 );

            // If same order or more than 1 unit, do not merge items
            if ( q > 1 )
            {
                listSKU.push( row );
                continue;
            }

            if ( !skus[sku] )
            {
                // Add a row with 1 unit
                skus[sku] = [ listSKU.length ];
                row[1] = 1;
                listSKU.push( row );
            }
            else
            {
                // merge with the added sku
                const idx = skus[sku][0];
                listSKU[idx][1] += 1;
            }
        }

        // do it by individual units, not in item combined orders
        for ( let row of listSKU )
        {
            const sku = row[0];

            if ( sku.includes( '+' ) )
            {
                continue;
            }

            row[1] = parseInt( row[1] ) * this.getPackUnits( sku );
        }

        // console.log(tableData)

        const tableWidget = new LX.Table( null, {
            head: columnData.map( ( c ) => {
                return c[1] ?? c[0];
            } ),
            body: listSKU.sort( ( a, b ) => {
                const sku_a = a[0];
                const sku_b = b[0];
                return sku_a.localeCompare( sku_b );
            } )
        }, {
            selectable: false,
            sortable: false,
            sortColumns: false,
            toggleColumns: false,
            centered: true,
            columnActions: [
                {
                    icon: 'Copy',
                    name: 'Copiar',
                    callback: ( colData ) => {
                        if ( !colData?.length )
                        {
                            return;
                        }
                        const tsv = LX.stripTags( colData.map( ( r ) => r.join( '\t' ) ).join( '\n' ) );
                        navigator.clipboard.writeText( tsv ).then( () => {
                            LX.toast( 'Hecho!', '✅ Columna copiada al portapapeles.', { timeout: 5000, position: 'top-center' } );
                        } ).catch( ( err ) => {
                            console.error( 'Error copying text: ', err );
                            LX.toast( 'Error', '❌ No se pudo copiar la columna.', { timeout: -1, position: 'top-center' } );
                        } );
                    }
                }
            ],
            filter: 'SKU del vendedor',
            customFilters: [
                { name: 'Transporte', options: [ 'CBL', 'SEUR' ] },
                { name: 'País', options: [ 'ESPAÑA', 'FRANCIA', 'PORTUGAL' ] }
            ]
        } );

        this.stockListArea.attach( tableWidget );
    }

    showTrackingList( trackingData )
    {
        const data = this.lastOrdersData;

        Utils.clearArea( this.trackingArea );

        this._trackingSyncErrors = [];

        const TRACKING_COL_DATA = VENDOR_TEMPLATES[this.vendor.toUpperCase() + '_TRACKING_DATA'];

        // Create table data from the list
        const tableData = [];
        data.forEach( ( row ) => {
            const items = row['order_lines'];

            // Discard multiple item orders -> CBL
            if( items.length > 1 )
            {
                return;
            }

            const item = items[0];
            // discard single item orders sent with CBL
            const transport = this.core.getTransportForItem( item[SKU_ATTR], item['quantity'] );
            if ( transport === 'CBL' ) return;

            const lRow = [];

            for ( let c of TRACKING_COL_DATA )
            {
                const ogColName = c[0];
                if ( ogColName.includes( '+' ) )
                {
                    const tks = ogColName.split( '+' );
                    lRow.push( `${row[tks[0]]}${row[tks[1]] ? ` ${row[tks[1]]}` : ''}` );
                }
                else
                {
                    const fn = c[2] ?? ( ( str ) => str );
                    const val = fn( item[ogColName] ?? ( row[ogColName] ?? '?' ), row, item, trackingData, this );
                    lRow.push( val );
                }
            }

            tableData.push( lRow );
        } );

        const tableWidget = new LX.Table( null, {
            head: TRACKING_COL_DATA.map( ( c ) => {
                return c[1] ?? c[0];
            } ),
            body: tableData
        }, {
            selectable: true,
            sortable: false,
            toggleColumns: true,
            centered: true,
            filter: 'Tracking Number',
            hiddenColumns: [ 'carrier-standard-code' ]
        } );

        this.trackingArea.attach( tableWidget );

        this.lastSeurTrackingsColumnData = tableWidget.data.head;
        this.lastShownSeurTrackingsData = tableWidget.data.body;

        Utils.toggleButtonDisabled( this.exportTrackingsButton, false );
    }

    exportSEUR( ignoreErrors = false, ordersData )
    {
        let columnData = VENDOR_TEMPLATES[this.vendor.toUpperCase() + '_LABEL_DATA'];

        const currentOrdersData = ordersData ?? this.lastOrdersData;

        if ( !currentOrdersData || !currentOrdersData?.length )
        {
            return;
        }

        const uid = columnData[0][0];

        // Process the xlsx first to detect empty fields
        if ( !ignoreErrors )
        {
            const errorFields = [];
            currentOrdersData.forEach( ( row, index ) => {
                const items = row['order_lines'];
                for ( let item of items )
                {
                    for ( let c of columnData )
                    {
                        const ogColName = c[0];
                        if ( ogColName.includes( '+' ) )
                        {
                            const tks = ogColName.split( '+' );

                            if ( !row[tks[0]] )
                            {
                                errorFields.push( [ index, tks[0] ] );
                            }
                        }
                        else
                        {
                            const v = c[2] ? c[2]( item[ogColName] ?? row[ogColName], row, item ) : ( item[ogColName] ?? row[ogColName] );
                            if ( v === undefined )
                            {
                                errorFields.push( [ index, ogColName ] );
                            }
                        }
                    }
                }
            } );

            if ( errorFields.length )
            {
                const dialog = new LX.Dialog( '❌ Solucionar errores', ( p ) => {
                    p.root.classList.add( 'p-2', 'flex', 'flex-col' );

                    const pTop = new LX.Panel();
                    p.attach( pTop );

                    let columns = columnData.map( ( c ) => {
                        return c[0].split( '+' )[0];
                    } );

                    const fixedData = LX.deepCopy( currentOrdersData );

                    for ( const [ errIndex, errName ] of errorFields )
                    {
                        pTop.addLabel( `No existe ${errName} (${fixedData[errIndex][uid]})` );
                        const possibleIndex = columns.indexOf( errName );
                        pTop.addSelect( errName, columns, columns[possibleIndex], ( v ) => {
                            fixedData[errIndex][errName] = fixedData[errIndex][v];
                        } );
                    }

                    const pBottom = new LX.Panel( { height: 'auto' } );
                    p.attach( pBottom );

                    pBottom.sameLine( 2 );
                    pBottom.addButton( null, 'Ignorar', () => {
                        dialog.close();
                        this.exportSEUR( true );
                    }, { width: '50%', buttonClass: 'destructive' } );
                    pBottom.addButton( null, 'Exportar', () => {
                        dialog.close();
                        this.exportSEUR( false, fixedData );
                    }, { width: '50%', buttonClass: 'primary' } );
                }, { position: [ 'calc(50% - 300px)', '250px' ], size: [ '600px', 'min(600px, 80%)' ] } );

                return;
            }
        }

        const date = new Date();
        const day = `${date.getDate()}`;
        const month = `${date.getMonth() + 1}`;
        const year = `${date.getFullYear()}`;
        const todayStringDate = `${'0'.repeat( 2 - day.length )}${day}_${'0'.repeat( 2 - month.length )}${month}_${year}`;
        const filename = `SEUR_${this.vendor}_${todayStringDate}.xlsx`;

        let err = 0;
        let errMsg = '';
        let data = columnData.map( ( c, index ) => {
            return c[1] ?? c[0];
        } );

        let errorFn = () => {
            LX.toast( 'Error de exportación', `❌ No se pudo exportar el archivo "${filename}. ${errMsg}`, {
                timeout: -1,
                position: 'top-center'
            } );
        };

        if ( !currentOrdersData?.length )
        {
            errMsg = `No existen datos.`;
            errorFn();
            return;
        }

        const orderNumbers = new Map();

        let rows = [];
        currentOrdersData.forEach( ( row, index ) => {
            const items = row['order_lines'];
            items.forEach( ( item, itemIndex ) => {
                const lRow = [];

                for ( let c of columnData )
                {
                    const ogColName = c[0];
                    if ( ogColName === uid )
                    {
                        const orderNumber = row[ogColName];

                        if ( orderNumbers.has( orderNumber ) )
                        {
                            const val = orderNumbers.get( orderNumber );
                            orderNumbers.set( orderNumber, [ ...val, index + itemIndex ] );
                        }
                        else
                        {
                            orderNumbers.set( orderNumber, [ index + itemIndex ] );
                        }
                    }

                    if ( ogColName.includes( '+' ) )
                    {
                        const tks = ogColName.split( '+' );

                        if ( !ignoreErrors && !row[tks[0]] )
                        {
                            err = 1;
                            errMsg = `No existen direcciones válidas (${row[uid]}).`;
                            return;
                        }

                        lRow.push( `${row[tks[0]] ?? ''}${row[tks[1]] ? ` ${row[tks[1]]}` : ''}` );
                    }
                    else
                    {
                        const v = c[2] ? c[2]( item[ogColName] ?? row[ogColName], row, item ) : ( item[ogColName] ?? row[ogColName] );

                        if ( !ignoreErrors && v === undefined )
                        {
                            err = 1;
                            errMsg = `No existen datos de "${ogColName}".`;
                            return;
                        }

                        lRow.push( v );
                    }
                }

                rows.push( lRow );
            } );
        } );

        rows = rows.filter( ( r ) => r !== undefined );

        if ( err === 1 )
        {
            errorFn();
            return;
        }

        const multipleItemsOrderNames = Array.from( orderNumbers.values() ).filter( ( v ) => v.length > 1 );
        const skuIdx = data.indexOf( 'SKU del vendedor' );

        for ( const repeats of multipleItemsOrderNames )
        {
            const finalIndex = repeats[0];
            const rest = repeats.slice( 1 );
            let finalRow = rows[finalIndex];
            const finalQuantity = finalRow.at( -1 );
            const trail = rest.reduce( ( p, c ) => {
                const q = rows[c].at( -1 ); // Get quantity (last col)
                return p + ` + ${rows[c][skuIdx]}${q > 1 ? ` x ${q}` : ''}`;
            }, finalQuantity > 1 ? ` x ${finalQuantity}` : '' );
            rest.forEach( ( r ) => {
                rows[r] = undefined;
            } );
            finalRow[skuIdx] += trail; // Add REF trail
        }

        // Remove tmp quantity from col data
        data = data.slice( 0, -1 );

        // Filter empty, remove tmp quantity from ROW data, and sort by sku
        rows = rows
            .filter( ( r ) => r !== undefined && !r[skuIdx].includes( '+' ) ) // Remove multiple item orders -> CBL
            .filter( ( r ) => {
                const q = r.at( -1 );
                const transport = this.core.getTransportForItem( r[skuIdx], q );
                return transport === 'SEUR';
            } ) // Remove CBL orders
            .map( ( r ) => {
                const q = r.at( -1 );
                if ( q > 1 )
                {
                    r[skuIdx] += ` x ${q}`;
                }
                return r.slice( 0, -1 );
            } )
            .sort( ( a, b ) => {
                const sku_a = a[skuIdx];
                const sku_b = b[skuIdx];
                return sku_a.localeCompare( sku_b );
            } );

        if( !rows.length )
        {
            LX.toast( 'Error', '❌ Nada que exportar!', { timeout: -1, position: 'top-center' } );
            return;
        }

        this.core.exportXLSXData( [ data, ...rows ], filename, ignoreErrors );
    }

    exportSEURTrackings( fixedData, ignoreErrors )
    {
        if( !this.lastShownSeurTrackingsData.length )
        {
            LX.toast( 'Error', '❌ Nada que exportar!', { timeout: -1, position: 'top-center' } );
            return;
        }

        const filename = `NUMERODEGUIA_SEUR_${this.vendor.toUpperCase()}_${Utils.getTodayStringDate()}.xlsx`;
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
                    const possibleIndex = data.findIndex( ( d ) => d[7] === uid );
                    // console.log(possibleIndex)
                    const trackAttrName = 'tracking-number';
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

    open( params )
    {
        super.open( params );

        this.clear();

        return this.tool;
    }

    clear()
    {
        super.clear();

        this.showOrders( this.vendor.toLowerCase(), true );
        this.showStockList( [] );
        this.showTrackingList( [] );
        // this.showAlbaranRelatedInfo( [], 0 );

        Utils.toggleButtonDisabled( this.exportLabelsButton, true );
        Utils.toggleButtonDisabled( this.exportTrackingsButton, true );
    }
}

export { MiraklApp };
