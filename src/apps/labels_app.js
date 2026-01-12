import { LX } from 'lexgui';
import { MiraklClient } from '../mirakl-api.js';

const DECATHLON_COLUMN_DATA = [
    [ 'order_id', 'Número del pedido' ],
    [ 'ID del artículo', null, ( str, row ) => {
        const items = row['order_lines'];
        return items[0]['product_sku'];
    } ],
    [ 'product_shop_sku', 'SKU del vendedor', ( str, row ) => {
        const items = row['order_lines'];
        const skus = items.map( ( i ) => i['product_shop_sku'] );
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
    [ 'Correo electrónico de usuario', null, ( str, row ) => '' ]
];

class LabelsApp
{
    constructor( core )
    {
        this.client = new MiraklClient( 'https://jowy-originals.alexroco-30.workers.dev' );

        this.core = core;
        this.area = new LX.Area( { skipAppend: true, className: 'hidden' } );
        core.area.attach( this.area );

        // Create utility buttons
        const utilButtonsPanel = new LX.Panel( { height: 'auto', className: 'bg-none bg-card border-none p-2 flex flex-row gap-2' } );
        utilButtonsPanel.sameLine();

        utilButtonsPanel.addButton( null, 'ClearButton', () => {
            core.clearData();
        }, { icon: 'Trash2', title: 'Limpiar datos anteriores', tooltip: true } );

        utilButtonsPanel.addButton( null, 'ExportButton', this.exportSEUR.bind( this, false, this.lastSeurData ), {
            icon: 'Download',
            title: 'Exportar etiquetas',
            tooltip: true
        } );

        const moreOptionsButtonComp = utilButtonsPanel.addButton( null, 'MoreOptionsButton', ( value, event ) => {
            LX.addDropdownMenu( moreOptionsButtonComp.root, [
                // {
                //     name: 'Abrir pedidos',
                //     icon: 'ExternalLink',
                //     callback: () => this.openSelectedOrders()
                // },
                // {
                //     name: 'Marcar seleccionados',
                //     icon: 'Pencil',
                //     submenu: [
                //         {
                //             name: 'Enviado',
                //             icon: 'PlaneTakeoff',
                //             callback: () =>
                //                 this.markSelectedOrdersAs( 'enviado', ( order ) => {
                //                     return order?.wpo_wcpdf_invoice_number !== ''
                //                         && ( order?.status === 'processing' || order?.status === 'on-hold' );
                //                 } )
                //         },
                //         {
                //             name: '1a Reseña',
                //             icon: 'Star',
                //             callback: () =>
                //                 this.markSelectedOrdersAs( 'recordatorio-rese', ( order, status ) => {
                //                     return status === 'Entregada'
                //                         && ( order?.status === 'processing' || order?.status === 'on-hold' || order?.status === 'enviado' );
                //                 } )
                //         },
                //         {
                //             name: 'Completado',
                //             icon: 'CheckCircle',
                //             callback: () =>
                //                 this.markSelectedOrdersAs( 'completed', ( order, status ) => {
                //                     return status === 'Entregada'
                //                         && ( order?.status === 'enviado' || order?.status === 'recordatorio-rese' );
                //                 } )
                //         }
                //     ]
                // },
                // null,
                {
                    name: 'Actualizar pedidos',
                    icon: 'RefreshCw',
                    callback: () => this.showList( core.compName, true, true )
                }
            ], { side: 'bottom', align: 'start' } );
        }, { icon: 'EllipsisVertical', title: 'Más opciones', tooltip: true } );

        utilButtonsPanel.endLine();

        this.area.attach( utilButtonsPanel.root );

        const tabs = this.area.addTabs( { parentClass: 'p-4', sizes: [ 'auto', 'auto' ], contentClass: 'p-2 pt-0' } );
        // core.tabs = tabs.root;

        // Deca
        {
            const decaContainer = LX.makeContainer( [ null, 'auto' ],
                'flex flex-col relative bg-card p-1 pt-0 rounded-lg overflow-hidden' );
            tabs.add( 'Pedidos', decaContainer, { selected: true, onSelect: ( event, name ) => this.showOrders( "decathlon" ) } );

            const jowyArea = new LX.Area( { className: 'rounded-lg' } );
            decaContainer.appendChild( jowyArea.root );
            core.data['decathlon'].domO = decaContainer;
        }

        // Groups List
        {
            const groupsListContainer = LX.makeContainer( [ null, 'auto' ],
                'flex flex-col relative bg-card p-1 pt-0 rounded-lg overflow-hidden' );
            tabs.add( 'Listado Stock', groupsListContainer, { xselected: true, onSelect: ( event, name ) => this.showGroupsByCountryList() } );

            const groupsListArea = new LX.Area( { className: 'bg-inherit rounded-lg' } );
            groupsListContainer.appendChild( groupsListArea.root );
            this.groupsListArea = groupsListArea;
        }

        // Move up into the panel section
        utilButtonsPanel.attach( tabs.root );

        core.labelsAppArea = this.area;

        this.clear();
    }

    async showOrders( compName, clean = false )
    {
        const core = this.core;
        const compData = core.data[compName];
        const { name } = compData;
        const dom = compData.domO;
        dom.innerHTML = '';

        if ( clean )
        {
            return;
        }

        core.compName = compName;

        if ( !this.client )
        {
            return;
        }

        this.vendor = name;

        const dialog = core.makeLoadingDialog( 'Cargando pedidos, espere...' );

        // const after = getDateNDaysAgo( this.ordersBeforeDays );
        // const before = null;
        const r = await this.client.listOrders( {
            // start_date: after,
            sort: 'dateCreated',
            order: 'desc',
            order_state_codes: 'SHIPPING'
        } );
        console.log( r );

        this.core.setHeaderTitle( `${name} <i>(Mirakl):</i> ${r.orders.length} pedidos`, 'Gestión de pedidos a través de la API de Mirakl.', 'Decathlon' );

        dialog.destroy();

        const columnData = [
            [ 'paymethod', 'PAGO', ( r ) => {
                if ( !r['payment_type'] ) return '';
                const b = new LX.Button( null, 'Payment', null, { buttonClass: 'bg-none', icon: 'CircleDollarSign',
                    title: r['payment_type'] } );
                return b.root.innerHTML;
            } ],
            [ 'preview', 'PREVIEW', ( r, i ) => {
                return `<img title="${i['product_title']}" class="rounded" style="width:3rem;" src="${this.client.baseUrl}${
                    i['product_medias'][1]['media_url']
                }">`;
            } ],
            [ 'date', 'FECHA', ( r ) => {
                const d = new Date( r['created_date'] );
                return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
            } ],
            [ 'product_shop_sku', 'REFERENCIA' ],
            [ 'quantity', 'UNIDADES' ],
            [ 'transport', 'TRANSPORTE', ( r, i ) => {
                return this.getTransportForItem( i['product_shop_sku'], i['quantity'] );
            } ],
            [ 'platform', 'PLATAFORMA', () => name.toUpperCase() ],
            [ 'country', 'PAÍS', ( r ) => { // TODO: CHECK THIS
                const ctrCode = r['channel']?.code;
                return core.countryFormat[ctrCode] ?? ( r['channel']?.label ).toUpperCase();
            } ],
            [ 'notes', 'OBSERVACIONES', ( r ) => `` ]
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
            filter: 'OBSERVACIONES',
            centered: [ 4, 5, 6, 7, 8 ],
            customFilters: [
                { name: 'FECHA', type: 'date', default: [ todayStringDate, todayStringDate ] },
                { name: 'TRANSPORTE', options: [ 'CBL', 'SEUR' ] },
                { name: 'PAÍS', options: [ 'ESPAÑA', 'FRANCIA', 'PORTUGAL' ] }
            ],
            rowActions: [
                {
                    icon: 'Copy',
                    title: 'Copiar',
                    callback: ( rowData ) => {
                        const data = [
                            ...rowData.slice( 2, 4 ),
                            '',
                            ...rowData.slice( 4 )
                        ];
                        const tsv = data.join( '\t' );
                        // console.log(tsv)
                        navigator.clipboard.writeText( tsv ).then( () => {
                            LX.toast( 'Hecho!', `✅ "${tsv}" copiado al portapapeles.`, { timeout: 5000, position: 'top-center' } );
                        } ).catch( ( err ) => {
                            console.error( 'Error copying text: ', err );
                            LX.toast( 'Error', '❌ No se pudo copiar.', { timeout: -1, position: 'top-center' } );
                        } );
                    }
                }
                // {
                //     icon: 'ExternalLink',
                //     title: 'Abrir Pedido',
                //     callback: ( rowData ) => {
                //         const orderNumber = rowData[8].split( ' ' )[0];
                //         if ( orderNumber !== '' ) window.open( `${url}post.php?post=${orderNumber}&action=edit` );
                //     }
                // }
            ]
        } );

        dom.appendChild( tableWidget.root );

        this.lastSeurData = r.orders;
        this.lastSeurColumnData = tableWidget.data.head;
        this.lastShownSeurData = tableWidget.data.body;
    }

    getTransportForItem( sku, quantity )
    {
        if (
            ( sku.startsWith( 'JW-DF2' ) && quantity > 2 ) ||
            ( sku.startsWith( 'JW-DT2' ) && quantity > 2 ) ||
            ( sku.startsWith( 'JW-DS2' ) && quantity > 2 ) ||
            ( sku.startsWith( 'JW-DF4' ) && quantity > 1 ) ||
            ( sku.startsWith( 'JW-DT4' ) && quantity > 1 ) ||
            [ 'HG-AD24', 'HG-AD32', 'HG-AD40', 'HG-BPB02', 'HG-CD225', 'HG-CD250', 'HG-CD275', 'HG-CD300' ].includes( sku )
        ) return 'CBL';
        return 'SEUR';
    }

    showGroupsByCountryList( ogData )
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
                return i['product_shop_sku'];
            } ],
            [ 'Cantidad', null ],
            [ 'TRANSPORTE', null, ( r, i ) => {
                return this.getTransportForItem( i['product_shop_sku'], i['quantity'] );
            } ],
            [ 'Plataforma', null, () => this.vendor.toUpperCase() ],
            [ 'País', null, ( row, i ) => {
                const ctr = row.customer?.shipping_address?.country;
                return core.countryFormat[ctr] ?? ctr;
            } ],
            [ 'Observaciones', null, () => '' ],
            [ 'order_id', 'Número del pedido' ],
        ];

        const uid = columnData[6][0];
        const orderNumbers = new Map();

        // Create table data from the list
        let tableData =  [];
        data.forEach( ( row, index ) => {
            const items = row['order_lines'];
            for ( let item of items )
            {
                const lRow = [];

                for ( let c of columnData )
                {
                    let colName = c[0];

                    // if ( colName === uid )
                    // {
                    //     const orderNumber = row[colName];

                    //     if ( orderNumbers.has( orderNumber ) )
                    //     {
                    //         const val = orderNumbers.get( orderNumber );
                    //         orderNumbers.set( orderNumber, [ ...val, index ] );
                    //     }
                    //     else
                    //     {
                    //         orderNumbers.set( orderNumber, [ index ] );
                    //     }
                    // }

                    const fn = c[2] ?? ( ( str ) => str );
                    lRow.push( fn( row, item ) ?? '' );
                }

                tableData.push( lRow );
            }
        } );

        // const multipleItemsOrderNames = Array.from( orderNumbers.values() ).filter( ( v ) => v.length > 1 );

        // for ( const repeats of multipleItemsOrderNames )
        // {
        //     const rest = repeats.slice( 1 );
        //     const trail = rest.reduce( ( p, c ) => p + ` + ${tableData[c][0]}`, '' );
        //     rest.forEach( ( r ) => {
        //         tableData[r] = undefined;
        //     } );
        //     tableData[repeats[0]][0] += trail;
        //     tableData[repeats[0]][5] = 'Mismo pedido';
        // }

        // tableData = tableData.filter( ( r ) => r !== undefined );

        // Remove unnecessary
        columnData.splice( 6, 1 );

        const listSKU = [];
        const skus = {};

        console.log(tableData)

        // for ( let row of tableData )
        // {
        //     const sku = `${row[0]}_${row[4]}`; // SKU _ País
        //     if ( !skus[sku] )
        //     {
        //         skus[sku] = [ listSKU.length ];
        //         row[1] = 1;
        //         row.splice( 6, 1 );
        //         listSKU.push( row );
        //     }
        //     else
        //     {
        //         const idx = skus[sku][0];
        //         listSKU[idx][1] += 1;
        //     }
        // }

        // for ( let row of listSKU )
        // {
        //     const sku = row[0];
        //     if ( sku.startsWith( 'JW-T60' ) && !sku.includes( '+' ) && row[5] !== 'Mismo pedido' )
        //     {
        //         row[1] *= 4;
        //     }
        // }

        const tableWidget = new LX.Table( null, {
            head: columnData.map( ( c ) => {
                return c[1] ?? c[0];
            } ),
            body: tableData
        }, {
            selectable: false,
            sortable: false,
            sortColumns: false,
            toggleColumns: false,
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
            filter: 'SKU del vendedor'
        } );

        this.lastSeurColumnData = tableWidget.data.head;
        this.lastShownSeurData = tableWidget.data.body;

        dom.appendChild( tableWidget.root );
    }

    exportSEUR( ignoreErrors = false, ordersData )
    {
        let columnData = ( this.vendor === 'Decathlon' ) ? DECATHLON_COLUMN_DATA : [];

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
                        const v = c[2] ? c[2]( row[ogColName], row ) : row[ogColName];
                        if ( v === undefined )
                        {
                            errorFields.push( [ index, ogColName ] );
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

        let rows = currentOrdersData.map( ( row, index ) => {
            const lRow = [];
            for ( let c of columnData )
            {
                const ogColName = c[0];

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
                    const v = c[2] ? c[2]( row[ogColName], row ) : row[ogColName];

                    if ( !ignoreErrors && v === undefined )
                    {
                        err = 1;
                        errMsg = `No existen datos de "${ogColName}".`;
                        return;
                    }

                    lRow.push( v );
                }
            }
            return lRow;
        } ).filter( ( v ) => v !== undefined );

        if ( err === 1 )
        {
            errorFn();
            return;
        }

        rows = rows.filter( ( r ) => r !== undefined );

        this.exportXLSXData( [ data, ...rows ], filename, ignoreErrors );
    }

    exportXLSXData( data, filename, ignoreErrors )
    {
        if ( !( data?.length ) )
        {
            LX.toast( 'Error', `❌ No se pudo exportar el archivo "${filename}". No existen datos.`, { timeout: -1,
                position: 'top-center' } );
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

    updateOrders()
    {
        this.showOrders( 'decathlon', true );
    }

    open( params )
    {
        this.core.tool = 'labels';
        this.core.setHeaderTitle( `${params} <i>(Mirakl)</i>`, 'Gestión de pedidos a través de la API de Mirakl.', 'Decathlon' );
        this.area.root.classList.toggle( 'hidden', false );

        this.clear();

        // this.showOrders( 'decathlon' );
    }

    close()
    {
    }

    clear()
    {
        this.updateOrders();
    }
}

export { LabelsApp };
