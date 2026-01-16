import { LX } from 'lexgui';
import { MiraklClient } from '../mirakl-api.js';

const VENDOR_TEMPLATES = {
    'DECATHLON_LABEL_DATA': [
        [ 'order_id', 'Número del pedido' ],
        [ 'ID del artículo', null, ( str, row ) => {
            const items = row['order_lines'];
            return items[0]['product_sku'];
        } ],
        [ 'offer_sku', 'SKU del vendedor', ( str, row ) => {
            const items = row['order_lines'];
            const skus = items.map( ( i ) => i['offer_sku'] );
            return skus.join( ' + ' );
        } ],
        [ 'Código Postal', null, ( str, row ) => {
            return row.customer?.shipping_address?.zip_code;
        } ],
        [ 'País', null, ( str, row ) => {
            const ctr = row.customer?.shipping_address?.country;
            return core.countryFormat[ctr] ?? ctr;
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
        // THIS ONE HAS TO BE DELETED
        [ 'quantity' ],
    ],

    // (str, row, tracking_data, app)
    'DECATHLON_TRACKING_DATA': [
        [ 'order_id', 'order-id' ],
        [ 'carrier_code', 'carrier-code', () => 'SEUR (Spain)' ],
        [ 'carrier_standard_code', 'carrier-standard-code', () => '' ],
        [ 'carrier_name', 'carrier-name', () => 'SEUR' ],
        [ 'carrier_url', 'carrier-url', () => 'https://www.seur.com/livetracking?segOnlineIdentificador=%7BtrackingId%7D&segOnlineIdioma=en' ],
        [ 'tracking_number', 'tracking-number', ( str, row, tdata, app ) => {
            const customer = row.customer;
            const str1 = customer?.firstname;
            const str2 = customer?.lastname;
            const name = str1 + ( str2 ? ` ${str2}` : '' );
            const tentry = tdata.find( ( d ) => d['CLIENTE DESTINATARIO'] === name );
            if ( !tentry )
            {
                app._trackingSyncErrors = true;
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
        [ 'offer_sku', 'offer-sku', ( str ) => core.getFinalSku( str ) ],
        [ 'order_line_id', 'order-line-id' ],
        [ 'quantity' ]
    ]
};

class LabelsApp
{
    constructor( core, vendorName )
    {
        this.mkClient = new MiraklClient();
        this.vendor = vendorName;
        this.core = core;
        this.area = new LX.Area( { skipAppend: true, className: 'hidden' } );
        core.area.attach( this.area );

        const vendor_lc = vendorName.toLowerCase();

        // Create utility buttons
        const utilButtonsPanel = new LX.Panel( { height: 'auto', className: 'bg-none bg-card border-none p-2 flex flex-row gap-2' } );
        utilButtonsPanel.sameLine();

        utilButtonsPanel.addButton( null, 'ClearButton', () => core.clearData(), {
            buttonClass: 'lg outline',
            icon: 'Trash2',
            title: 'Limpiar datos anteriores',
            tooltip: true
        } );

        utilButtonsPanel.addButton( null, 'ExportButton', this.exportSEUR.bind( this, false, this.lastSeurData ), {
            buttonClass: 'lg outline',
            icon: 'Download',
            title: 'Exportar etiquetas',
            tooltip: true
        } );

        utilButtonsPanel.addButton( null, 'ImportTrackingsButton', this.exportSEURTrackings.bind( this ), {
            buttonClass: 'lg outline',
            icon: 'FileDown',
            title: 'Exportar Seguimiento',
            tooltip: true
        } );

        utilButtonsPanel.addButton( null, 'UpdateOrdersButton', ( value, event ) => {
            this.showOrders( vendor_lc )
        }, { buttonClass: 'lg outline', icon: 'RefreshCw', title: 'Actualizar pedidos', tooltip: true } );

        utilButtonsPanel.endLine();

        this.area.attach( utilButtonsPanel.root );

        const tabs = this.area.addTabs( { parentClass: 'p-4', sizes: [ 'auto', 'auto' ], contentClass: 'p-2 pt-0' } );
        // core.tabs = tabs.root;

        // Marketplace orders
        {
            const ordersContainer = LX.makeContainer( [ null, 'auto' ], 'flex flex-col relative bg-card p-1 pt-0 rounded-lg overflow-hidden' );
            tabs.add( 'Pedidos', ordersContainer, { selected: true, onSelect: ( event, name ) => this.showOrders( vendor_lc ) } );

            const jowyArea = new LX.Area( { className: 'rounded-lg' } );
            ordersContainer.appendChild( jowyArea.root );
            core.data[vendor_lc].domO = ordersContainer;
        }

        // Groups List
        {
            const groupsListContainer = LX.makeContainer( [ null, 'auto' ], 'flex flex-col relative bg-card p-1 pt-0 rounded-lg overflow-hidden' );
            tabs.add( 'Listado Stock', groupsListContainer, { xselected: true, onSelect: ( event, name ) => this.showStockList() } );

            const groupsListArea = new LX.Area( { className: 'bg-inherit rounded-lg' } );
            groupsListContainer.appendChild( groupsListArea.root );
            this.groupsListArea = groupsListArea;
        }

        // Tracking info
        const trackingContainer = LX.makeContainer( [ null, 'auto' ], 'flex flex-col relative bg-card p-1 pt-0 rounded-lg overflow-hidden' );
        tabs.add( 'Tracking', trackingContainer, { xselected: true, onSelect: ( event, name ) => {
            trackingArea.root.innerHTML = '';
            trackingArea.attach( this.core.getTrackingDataDropZone( this.area, this.showTrackingList.bind( this ) ) );
        } } );

        const trackingArea = new LX.Area( { className: 'bg-inherit rounded-lg' } );
        trackingContainer.appendChild( trackingArea.root );

        // Move up into the panel section
        utilButtonsPanel.attach( tabs.root );

        this.trackingArea = trackingArea;

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
                spinner = LX.makeIcon( 'LoaderCircle', { iconClass: 'flex', svgClass: 'md animate-spin' } );
                loginButton.root.querySelector( 'button' ).prepend( spinner );

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
                    spinner.remove();
                    LX.emitSignal( '@login_errors', '❌ Credenciales no válidas' );
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
        const dom = compData.domO;
        dom.innerHTML = '';

        // if ( clean )
        // {
        //     return;
        // }

        core.compName = compName;

        if ( !clean && !this.mkClient.connected )
        {
            this.openMiraklLogin( () => this.showOrders( compName, clean ) );
            return;
        }

        let r = null;

        if( !clean )
        {
            const dialog = core.makeLoadingDialog( 'Cargando pedidos, espere...' );

            r = await this.mkClient.listOrders( {
                sort: 'dateCreated',
                order: 'desc',
                order_state_codes: 'SHIPPING'
            } );
            // console.log( r );

            this.core.setHeaderTitle( `${name} <i>(Mirakl):</i> ${r.orders.length} pedidos`, 'Gestión de pedidos a través de la API de Mirakl.', this.vendor );

            dialog.destroy();
        }
        else
        {
            r = { orders: [] };
        }

        const columnData = [
            [ 'preview', 'PREVIEW', ( r, i ) => {
                return `<img title="${i['product_title']}" class="rounded" style="width:3rem;" src="${url}${i['product_medias'][1]['media_url']}">`;
            } ],
            [ 'order_id', 'NÚMERO PEDIDO' ],
            [ 'date', 'FECHA', ( r ) => {
                const d = new Date( r['created_date'] );
                return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
            } ],
            [ 'offer_sku', 'REFERENCIA', ( row, i ) => core.getFinalSku( i['offer_sku'] ) ],
            [ 'quantity', 'UNIDADES' ],
            [ 'NOMBRE COMPLETO', null, ( row, i ) => {
                const customer = row.customer;
                const str1 = customer?.firstname;
                const str2 = customer?.lastname;
                return str1 + ( str2 ? ` ${str2}` : '' );
            } ],
            [ 'CIUDAD', null, ( row, i ) => {
                return row.customer?.shipping_address?.city ?? '';
            } ],
            [ 'country', 'PAÍS', ( row ) => {
                const ctr = row.customer?.shipping_address?.country;
                return core.countryFormat[ctr] ?? ctr;
            } ]
        ];

        const tableData = [];

        // Create table data from the list
        r.orders.forEach( ( row ) => {
            const items = row['order_lines'];

            for ( let item of items )
            {
                const lRow = [];

                for ( let c of columnData )
                {
                    const ogColName = c[0];
                    if ( c[2] )
                    {
                        const fn = c[2];
                        lRow.push( fn( row, item ) );
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
            toggleColumns: false,
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
            ]
        } );

        dom.appendChild( tableWidget.root );

        this.lastSeurData = r.orders;
        this.lastSeurColumnData = tableWidget.data.head;
        this.lastShownSeurData = tableWidget.data.body;
    }

    showStockList( ogData )
    {
        ogData = ogData ?? this.lastSeurData;

        let data = LX.deepCopy( ogData );

        const dom = this.groupsListArea.root;
        while ( dom.children.length > 0 )
        {
            dom.removeChild( dom.children[0] );
        }

        // Sort by ref
        {
            data = data.sort( ( a, b ) => {
                return ( a['SKU del vendedor'] ?? '?' ).localeCompare( b['SKU del vendedor'] ?? '?' );
            } );
        }

        let columnData = [
            [ 'SKU del vendedor', null, ( row, i ) => {
                return this.core.getFinalSku( i['offer_sku'] );
            } ],
            [ 'Cantidad', null, ( row, i ) => {
                return i['quantity'];
            } ],
            [ 'Transporte', null, ( r, i ) => {
                const sku = this.core.getFinalSku( i['offer_sku'] );
                return this.core.getTransportForItem( sku, i['quantity'] );
            } ],
            [ 'Plataforma', null, () => this.vendor.toUpperCase() ],
            [ 'País', null, ( row, i ) => {
                const ctr = row.customer?.shipping_address?.country;
                return core.countryFormat[ctr] ?? ctr;
            } ],
            [ 'Observaciones', null, ( row, i ) => {
                return i['quantity'] > 1 ? 'Mismo pedido' : '';
            } ],
            [ 'order_id', 'Número del pedido' ]
        ];

        const uid = columnData[6][0];
        const orderNumbers = new Map();

        // Create table data from the list
        let tableData = [];
        data.forEach( ( row, index ) => {
            const items = row['order_lines'];
            for ( let item of items )
            {
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
                            orderNumbers.set( orderNumber, [ ...val, index ] );
                        }
                        else
                        {
                            orderNumbers.set( orderNumber, [ index ] );
                        }
                    }

                    const fn = c[2] ?? ( ( str ) => str );
                    lRow.push( fn( row, item ) ?? '' );
                }

                tableData.push( lRow );
            }
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
            finalRow[5] = 'Mismo pedido'; // Add NOTES
        }

        tableData = tableData.filter( ( r ) => r !== undefined );

        // Remove unnecessary headers (order number)
        columnData.splice( 6, 1 );

        const listSKU = [];
        const skus = {};

        for ( let row of tableData )
        {
            const q = row[1];
            const notes = row[5];

            // if sku starts with "JW-T60", never combine with others, so we must
            // add a unique identifier in the sku
            let sku = `${row[0]}_${row[4]}`; // SKU _ País
            sku += sku.includes( 'JW-T60' ) ? `_${LX.guidGenerator()}` : '';

            // Delete order num
            row.splice( 6, 1 );

            // If same order or more than 1 unit, do not merge items
            if ( q > 1 
                // || notes === 'Mismo pedido'
             )
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

            row[1] = this.core.getIndividualQuantityPerPack( sku, parseInt( row[1] ) );
        }

        // console.log(tableData)

        const tableWidget = new LX.Table( null, {
            head: columnData.map( ( c ) => {
                return c[1] ?? c[0];
            } ),
            body: listSKU
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
                        if ( !this.lastShownSeurData )
                        {
                            return;
                        }
                        const tsv = colData.map( ( r ) => r.join( '\t' ) ).join( '\n' );
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

        this.lastSeurColumnData = tableWidget.data.head;
        this.lastShownSeurData = tableWidget.data.body;

        dom.appendChild( tableWidget.root );
    }

    showTrackingList( trackingData )
    {
        const data = this.lastSeurData;

        const dom = this.trackingArea.root;
        while ( dom.children.length > 0 )
        {
            dom.removeChild( dom.children[0] );
        }

        this._trackingSyncErrors = false;

        // Create table data from the list
        const tableData = [];
        data.forEach( ( row ) => {
            const items = row['order_lines'];
            for ( let item of items )
            {
                const lRow = [];

                for ( let c of VENDOR_TEMPLATES[this.vendor.toUpperCase() + '_TRACKING_DATA'] )
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
                        const val = fn( item[ogColName] ?? ( row[ogColName] ?? '?' ), row, trackingData, this );
                        lRow.push( val );
                    }
                }

                tableData.push( lRow );
            }
        } );

        const tableWidget = new LX.Table( null, {
            head: VENDOR_TEMPLATES[this.vendor.toUpperCase() + '_TRACKING_DATA'].map( ( c ) => {
                return c[1] ?? c[0];
            } ),
            body: tableData
        }, {
            selectable: true,
            sortable: false,
            toggleColumns: true,
            centered: true,
            filter: 'Tracking Number'
        } );

        dom.appendChild( tableWidget.root );

        this.lastSeurTrackingsColumnData = tableWidget.data.head;
        this.lastShownSeurTrackingsData = tableWidget.data.body;
    }

    exportSEUR( ignoreErrors = false, ordersData )
    {
        let columnData = VENDOR_TEMPLATES[this.vendor.toUpperCase() + '_LABEL_DATA'];

        const currentOrdersData = ordersData ?? this.lastSeurData;

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
                    }, { width: '50%', buttonClass: 'bg-destructive text-white' } );
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
            for ( let item of items )
            {
                // discard orders sent with CBL
                const sku = this.core.getFinalSku( item['offer_sku'] );
                const transport = this.core.getTransportForItem( sku, item['quantity'] );
                if( transport === 'CBL' ) continue;

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
                            orderNumbers.set( orderNumber, [ ...val, index ] );
                        }
                        else
                        {
                            orderNumbers.set( orderNumber, [ index ] );
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
            }
        } );

        rows = rows.filter( ( r ) => r !== undefined );

        if ( err === 1 )
        {
            errorFn();
            return;
        }

        const multipleItemsOrderNames = Array.from( orderNumbers.values() ).filter( ( v ) => v.length > 1 );

        for ( const repeats of multipleItemsOrderNames )
        {
            const skuIdx = data.indexOf( 'SKU del vendedor' );
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
            // Remove tmp quantity
            finalRow = finalRow.slice( 0, -1 );
        }

        // Remove tmp quantity
        data = data.slice( 0, -1 );

        rows = rows.filter( ( r ) => r !== undefined );

        this.exportXLSXData( [ data, ...rows ], filename, ignoreErrors );
    }

    exportSEURTrackings()
    {
        const filename = 'NUMERODEGUIA.xlsx';

        if ( this._trackingSyncErrors )
        {
            LX.toast( 'Error', `❌ No se pudo exportar el archivo "${filename}". Faltan datos.`, { timeout: -1, position: 'top-center' } );
            return;
        }

        const data = [ this.lastSeurTrackingsColumnData, ...this.lastShownSeurTrackingsData ];
        this.exportXLSXData( data, filename );
    }

    exportXLSXData( data, filename, ignoreErrors )
    {
        if ( !( data?.length ) )
        {
            LX.toast( 'Error', `❌ No se pudo exportar el archivo "${filename}". No existen datos.`, { timeout: -1, position: 'top-center' } );
            return;
        }

        const worksheet = XLSX.utils.aoa_to_sheet( data );
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet( workbook, worksheet, this.core.sheetName ?? 'Sheet1' );
        XLSX.writeFile( workbook, filename );

        if ( !ignoreErrors )
        {
            LX.toast( 'Hecho!', `✅ Datos exportados correctamente: ${filename}`, { timeout: 5000, position: 'top-center' } );
        }
    }

    open( params )
    {
        this.core.tool = this.vendor.toLowerCase();
        this.core.setHeaderTitle( `${this.vendor} <i>(Mirakl)</i>`, 'Gestión de pedidos a través de la API de Mirakl.', this.vendor );
        this.area.root.classList.toggle( 'hidden', false );

        this.clear();
    }

    close()
    {
    }

    clear()
    {
        this.showOrders( this.vendor.toLowerCase(), true );
    }
}

export { LabelsApp };
