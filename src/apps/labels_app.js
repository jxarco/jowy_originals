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
        const utilButtonsPanel = new LX.Panel( { height: 'auto', className: 'bg-none bg-primary border-none p-2 flex flex-row gap-2' } );
        utilButtonsPanel.sameLine();

        // const seeMessagesButton = utilButtonsPanel.addButton( null, 'SeeMessagesButton', () => {
        //     if ( core.compName !== 'otros' ) this.showMessages( core.compName, 0 );
        // }, { icon: 'Eye', title: 'Ver mensajes', tooltip: true } );

        utilButtonsPanel.addButton( null, 'ClearButton', () => {
            core.clearData();
        }, { icon: 'Trash2', title: 'Limpiar datos anteriores', tooltip: true } );

        utilButtonsPanel.addButton( null, 'MoreOptionsButton', ( value, event ) => {
            LX.addDropdownMenu( event.target, [
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

        utilButtonsPanel.addButton( null, 'ExportButton', this.exportSEUR.bind( this, false, this.lastSeurData ), {
            icon: 'Download',
            title: 'Exportar etiquetas',
            tooltip: true
        } );

        utilButtonsPanel.endLine();

        this.area.attach( utilButtonsPanel.root );

        const tabs = this.area.addTabs( { parentClass: 'p-4', sizes: [ 'auto', 'auto' ], contentClass: 'p-2 pt-0' } );
        // core.tabs = tabs.root;

        // Deca
        {
            const decaContainer = LX.makeContainer( [ null, 'auto' ],
                'flex flex-col relative bg-primary p-1 pt-0 rounded-lg overflow-hidden' );
            tabs.add( 'Decathlon', decaContainer, { selected: true, onSelect: ( event, name ) => this.showOrders( name.toLowerCase() ) } );

            const jowyArea = new LX.Area( { className: 'rounded-lg' } );
            decaContainer.appendChild( jowyArea.root );
            core.data['decathlon'].domO = decaContainer;
        }

        // // HxG
        // {
        //     const hxgContainer = LX.makeContainer( [ null, 'auto' ],
        //         'flex flex-col relative bg-primary p-1 pt-0 rounded-lg overflow-hidden' );
        //     tabs.add( 'HxG', hxgContainer, { xselected: true, onSelect: ( event, name ) => this.showList( name.toLowerCase() ) } );

        //     const hxgArea = new LX.Area( { className: 'rounded-lg' } );
        //     hxgContainer.appendChild( hxgArea.root );
        //     core.data['hxg'].domO = hxgContainer;
        // }

        // // Bathby
        // {
        //     const bathbyContainer = LX.makeContainer( [ null, 'auto' ],
        //         'flex flex-col relative bg-primary p-1 pt-0 rounded-lg overflow-hidden' );
        //     tabs.add( 'Bathby', bathbyContainer, { xselected: true, onSelect: ( event, name ) => this.showList( name.toLowerCase() ) } );

        //     const bathbyArea = new LX.Area( { className: 'rounded-lg' } );
        //     bathbyContainer.appendChild( bathbyArea.root );
        //     core.data['bathby'].domO = bathbyContainer;
        // }

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

        core.setHeaderTitle( `${name} (Mirakl): <i>Pedidos</i>`, `${r.orders.length} pedidos`, 'PackagePlus' );

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
                const q = i['quantity'];
                const sku = i['product_shop_sku'];
                if ( ( sku.startsWith( 'JW-D' ) && q > 2 )
                    || sku.startsWith( 'JW-RT' )
                    || sku.startsWith( 'HG-AD' ) ) return 'CBL';
                return 'SEUR';
            } ],
            [ 'platform', 'PLATAFORMA', () => name.toUpperCase() ],
            [ 'country', 'PAÍS', ( r ) => { // TODO: CHECK THIS
                const ctrCode = r['channel']?.code;
                return core.countryFormat[ctrCode] ?? ( r['channel']?.label ).toUpperCase();
            } ],
            [ 'notes', 'OBSERVACIONES', ( r ) => `${r['order_id']}${r['order_state'] == 'on-hold' ? ' TRANSFERENCIA' : ''}` ]
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
                    }, { width: '50%', buttonClass: 'bg-error fg-white' } );
                    pBottom.addButton( null, 'Exportar', () => {
                        dialog.close();
                        this.exportSEUR( false, fixedData );
                    }, { width: '50%', buttonClass: 'contrast' } );
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
        this.core.setHeaderTitle( `${params} (Mirakl): <i>Pedidos</i>`, '', 'PackagePlus' );
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
