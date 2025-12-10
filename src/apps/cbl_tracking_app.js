import { LX } from 'lexgui';

const cblTrackingUrl = `https://clientes.cbl-logistica.com/public/consultaenvio.aspx`;
const seurTrackingUrl = `https://www.seur.com/miseur/mis-envios`;
const glsTrackingUrl = `https://gls-group.com/ES/es/seguimiento-envio/`;

const convertDateDMYtoMDY = ( str ) => {
    const [ day, month, year ] = str.split( '/' );
    return `${month}/${day}/${year}`;
};

const convertDateMDYtoDMY = ( str ) => {
    const [ month, day, year ] = str.split( '/' );
    return `${day}/${month}/${year}`;
};

class CblTrackingApp
{
    constructor( core )
    {
        this.core = core;
        this.area = new LX.Area( { skipAppend: true, className: 'hidden' } );
        core.area.attach( this.area );

        // Create utility buttons
        const utilButtonsPanel = new LX.Panel( { height: 'auto',
            className: 'bg-none bg-primary border-none p-2 flex flex-row gap-2' } );
        utilButtonsPanel.sameLine( 4 );

        const seeMessagesButton = utilButtonsPanel.addButton( null, 'SeeMessagesButton', () => {
            if ( core.compName !== 'otros' ) this.showMessages( core.compName, 0 );
        }, { icon: 'Eye', title: 'Ver mensajes', tooltip: true } );

        const clearButtonWidget = utilButtonsPanel.addButton( null, 'ClearButton', () => {
            core.clearData();
        }, { icon: 'Trash2', title: 'Limpiar datos anteriores', tooltip: true } );

        const messageFromTrackIdButton = utilButtonsPanel.addButton( null, 'NewCustomMessage', () => {
            this.openMessageDialog();
        }, { icon: 'Plus', title: 'Nuevo mensaje', tooltip: true } );

        const moreOptionsButton = utilButtonsPanel.addButton( null, 'MoreOptionsButton', ( value, event ) => {
            LX.addDropdownMenu( event.target, [
                {
                    name: 'Abrir pedidos',
                    icon: 'ExternalLink',
                    callback: () => this.openSelectedOrders()
                },
                {
                    name: 'Completar pedidos',
                    icon: 'CheckCircle',
                    callback: () => this.markSelectedOrdersAsCompleted()
                },
                null,
                {
                    name: 'Actualizar pedidos',
                    icon: 'RefreshCw',
                    callback: () => this.showList( core.compName, true, true )
                }
            ], { side: 'bottom', align: 'start' } );
        }, { icon: 'EllipsisVertical', title: 'Más opciones', tooltip: true } );

        this.area.attach( utilButtonsPanel.root );

        const tabs = this.area.addTabs( { parentClass: 'p-4', sizes: [ 'auto', 'auto' ], contentClass: 'p-2 pt-0' } );
        // core.tabs = tabs.root;

        // Jowy
        {
            const jowyContainer = LX.makeContainer( [ null, 'auto' ],
                'flex flex-col relative bg-primary p-1 pt-0 rounded-lg overflow-hidden' );
            tabs.add( 'Jowy', jowyContainer, { selected: true,
                onSelect: ( event, name ) => this.showList( name.toLowerCase() ) } );

            const jowyArea = new LX.Area( { className: 'rounded-lg' } );
            jowyContainer.appendChild( jowyArea.root );
            core.data['jowy'].dom = jowyContainer;
        }

        // HxG
        {
            const hxgContainer = LX.makeContainer( [ null, 'auto' ],
                'flex flex-col relative bg-primary p-1 pt-0 rounded-lg overflow-hidden' );
            tabs.add( 'HxG', hxgContainer, { xselected: true,
                onSelect: ( event, name ) => this.showList( name.toLowerCase() ) } );

            const hxgArea = new LX.Area( { className: 'rounded-lg' } );
            hxgContainer.appendChild( hxgArea.root );
            core.data['hxg'].dom = hxgContainer;
        }

        // Bathby
        {
            const bathbyContainer = LX.makeContainer( [ null, 'auto' ],
                'flex flex-col relative bg-primary p-1 pt-0 rounded-lg overflow-hidden' );
            tabs.add( 'Bathby', bathbyContainer, { xselected: true,
                onSelect: ( event, name ) => this.showList( name.toLowerCase() ) } );

            const bathbyArea = new LX.Area( { className: 'rounded-lg' } );
            bathbyContainer.appendChild( bathbyArea.root );
            core.data['bathby'].dom = bathbyContainer;
        }

        // Otros
        {
            const miscContainer = LX.makeContainer( [ null, 'auto' ],
                'flex flex-col relative bg-primary p-1 pt-0 rounded-lg overflow-hidden' );
            tabs.add( 'Otros', miscContainer, { xselected: true,
                onSelect: ( event, name ) => this.showList( name.toLowerCase(), false ) } );

            const miscArea = new LX.Area( { className: 'rounded-lg' } );
            miscContainer.appendChild( miscArea.root );
            core.data['otros'].dom = miscContainer;
        }

        // Move up into the panel section
        utilButtonsPanel.attach( tabs.root );

        core.trackingMessagesArea = this.area;

        this.clear();
    }

    async showList( compName, requireLogin = true, refreshOrders = false )
    {
        const core = this.core;
        const compData = core.data[compName];
        const { dom, list, url, wcc } = compData;

        // Force refresh if changing COMP tab
        if ( requireLogin && core.compName !== compName )
        {
            refreshOrders = true;
        }

        core.compName = compName;
        core.rowOffset = undefined;

        // Check login for compName
        if ( requireLogin && !wcc.connected )
        {
            core.openWooCommerceLogin( this.showList.bind( this, compName, requireLogin, refreshOrders ) );
            return;
        }

        dom.innerHTML = '';

        if ( requireLogin && ( refreshOrders || !this.orders ) )
        {
            this.orders = await this.getCompOrders( compName );
        }

        const columnData = [
            [ 'REFERENCIA', 'NPEDIDO', ( str, row, oN ) => {
                return oN ?? '';
            } ],
            [ 'ESTADO', null, ( str, row, oN ) => {
                if ( oN && this.orders )
                {
                    const o = this.orders[oN];
                    if ( !o )
                    {
                        const status = core.trackStatusColors['Incidencia'];
                        let iconStr = status.icon
                            ? LX.makeIcon( status.icon, { svgClass: 'md fg-white' } ).innerHTML
                            : '';
                        return `${
                            LX.badge( iconStr, 'text-sm font-bold border-none ', {
                                style: { height: '1.4rem', borderRadius: '0.65rem', backgroundColor: status.bg ?? '',
                                    color: status.fg ?? '' }
                            } )
                        }`;
                    }
                    const str = core.orderStatus[o.status];
                    const status = core.orderStatusColors[str] ?? {};
                    let iconStr = status.icon ? LX.makeIcon( status.icon, { svgClass: 'md fg-white' } ).innerHTML : '';
                    return `${
                        LX.badge( iconStr + str, 'text-sm font-bold border-none ', {
                            style: { height: '1.4rem', borderRadius: '0.65rem', backgroundColor: status.bg ?? '',
                                color: status.fg ?? '' }
                        } )
                    }`;
                }
                return '';
            } ],
            [ 'NFACTURA', null, ( str, row, oN ) => {
                if ( oN && this.orders )
                {
                    const o = this.orders[oN];
                    if ( !o ) return '';
                    const orderInvoice = wcc.getInvoiceData( o );
                    return orderInvoice?.numberFormatted ?? '';
                }
                return '';
            } ],
            [ 'F_DOC', null ],
            [ 'CLAVE', 'SITUACIÓN', ( str ) => {
                const status = core.trackStatusColors[str] ?? {};
                let iconStr = status.icon ? LX.makeIcon( status.icon, { svgClass: 'md fg-white' } ).innerHTML : '';
                return `${
                    LX.badge( iconStr + str, 'text-sm font-bold border-none ', {
                        style: { height: '1.4rem', borderRadius: '0.65rem', backgroundColor: status.bg ?? '',
                            color: status.fg ?? '' }
                    } )
                }`;
            } ],
            [ 'F_SITUACION', null ],
            [ 'REFERENCIA', null, ( str ) => {
                const idx = str.indexOf( '/' );
                return idx === -1 ? str : str.substring( 0, idx );
            } ],
            [ 'NENVIO', null ],
            [ 'LOCALIZADOR', null ],
            [ 'NOMCONS', 'NOMBRE' ],
            [ 'POBLACION', null ]
        ];

        // Create table data from the list
        const tableData = list.map( ( row ) => {
            const lRow = [];

            const ref = row['REFERENCIA'];
            const idx = ref.indexOf( '/' );
            const oN = idx === -1 ? null : ref.substring( idx + 1 );

            for ( let c of columnData )
            {
                const ogColName = c[0];
                const fn = c[2] ?? ( ( str ) => str );
                lRow.push( fn( row[ogColName] ?? '?', row, oN ) );
            }
            return lRow;
        } );

        this.dataTable = new LX.Table( null, {
            head: columnData.map( ( c ) => {
                return c[1] ?? c[0];
            } ),
            body: tableData
        }, {
            selectable: true,
            sortable: false,
            toggleColumns: true,
            hiddenColumns: [ 'F_SITUACION', 'REFERENCIA', 'NENVIO', 'LOCALIZADOR', 'POBLACION' ],
            filter: 'NOMBRE',
            centered: [ 0, 1 ],
            customFilters: [
                { name: 'ESTADO', options: Object.values( core.orderStatus ) },
                { name: 'SITUACIÓN', options: Object.keys( core.trackStatusColors ) },
                { name: 'F_DOC', type: 'date' },
                { name: 'F_SITUACION', type: 'date' }
            ],
            rowActions: compName != 'otros'
                ? [
                    {
                        icon: 'Eye',
                        name: 'Ver mensaje',
                        callback: ( rowData ) => {
                            const rowIndex = tableData.indexOf( rowData );
                            this.showMessages( compName, rowIndex );
                        }
                    },
                    'menu'
                ]
                : [],
            onMenuAction: ( index, tableData ) => {
                const rowData = tableData.body[index];
                const orderNumber = rowData[tableData.head.indexOf( 'NPEDIDO' )];
                const status = LX.stripTags( rowData[tableData.head.indexOf( 'SITUACIÓN' )] );
                const options = [
                    {
                        icon: 'ExternalLink',
                        name: 'Abrir Pedido',
                        callback: ( name ) => {
                            if ( orderNumber !== '' ) window.open( `${url}post.php?post=${orderNumber}&action=edit` );
                        }
                    },
                    {
                        icon: 'Copy',
                        name: 'Copiar Nombre',
                        callback: ( name ) => {
                            const data = rowData[tableData.head.indexOf( 'NOMBRE' )];
                            navigator.clipboard.writeText( data ).then( () => {
                                LX.toast( 'Hecho!', `✅ "${data}" copiado al portapapeles.`, { timeout: 5000,
                                    position: 'top-left' } );
                            } ).catch( ( err ) => {
                                console.error( 'Error copying text: ', err );
                                LX.toast( 'Error', '❌ No se pudo copiar el nombre.', { timeout: -1,
                                    position: 'top-left' } );
                            } );
                        }
                    }
                ];

                if ( ( orderNumber !== '' ) && ( status == 'Entregada' )
                    && ( this.orders[orderNumber]?.status === 'processing' ) )
                {
                    options.push( null, {
                        icon: 'CheckCircle',
                        name: 'Completar Pedido',
                        callback: ( name ) => {
                            this.markOrderAsCompleted( this.dataTable, index, wcc, orderNumber );
                        }
                    } );
                }

                return options;
            }
        } );

        dom.appendChild( this.dataTable.root );
    }

    async markSelectedOrdersAsCompleted()
    {
        const core = this.core;
        const compData = core.data[core.compName];
        const wcc = compData.wcc;
        if ( !wcc.connected )
        {
            core.openWooCommerceLogin();
            return;
        }

        const selectedOrders = this.dataTable.getSelectedRows();
        if ( !selectedOrders.length )
        {
            return;
        }

        const newStatus = 'completed';
        const orderUpdates = selectedOrders.map( ( row ) => {
            const orderNumber = row[0] ?? '';
            if ( !orderNumber.length ) return;
            return { id: orderNumber, status: newStatus };
        } ).filter( ( l ) => l !== undefined );

        const dialogClosable = new LX.Dialog( 'Completar Pedido', ( dialogPanel ) => {
            let spinner = null;
            dialogPanel.addTextArea( null,
                `Vas a completar los siguientes pedido en WooCommerce:\n\n${
                    orderUpdates.map( ( v ) => v.id ).join( '\n' )
                }\n\n¿Quieres continuar?`, null, { fitHeight: true, disabled: true } );
            dialogPanel.addSeparator();
            dialogPanel.sameLine( 2, 'justify-right mt-2' );
            dialogPanel.addButton( null, 'Cerrar', () => dialogClosable.close(), { buttonClass: 'fg-error' } );
            const continueButton = dialogPanel.addButton( null, 'Continuar', async () => {
                spinner = LX.makeIcon( 'LoaderCircle', { iconClass: 'flex', svgClass: 'fg-contrast md animate-spin' } );
                continueButton.root.querySelector( 'button' ).prepend( spinner );
                const r = await wcc.batchUpdateOrders( orderUpdates );

                dialogClosable.close();

                if ( !r.ok )
                {
                    LX.toast( 'WooCommerce Error', `❌ ${r.error}`, { timeout: -1, position: 'top-left' } );
                    return;
                }

                selectedOrders.forEach( ( row ) => {
                    const id = row[0];
                    const index = this.dataTable.data.body.indexOf( row );
                    this.orders[id].status = newStatus;

                    const str = core.orderStatus[newStatus];
                    const status = core.orderStatusColors[str] ?? {};
                    let iconStr = status.icon ? LX.makeIcon( status.icon, { svgClass: 'md fg-white' } ).innerHTML : '';
                    const newData = `${
                        LX.badge( iconStr + str, 'text-sm font-bold border-none ', {
                            style: { height: '1.4rem', borderRadius: '0.65rem', backgroundColor: status.bg ?? '',
                                color: status.fg ?? '' }
                        } )
                    }`;
                    this.dataTable.data.body[index][this.dataTable.data.head.indexOf( 'ESTADO' )] = newData;
                } );

                this.dataTable.refresh();

                LX.toast( `Hecho!`,
                    `✅ Pedidos ${orderUpdates.map( ( v ) => v.id ).join( ', ' )} completados con éxito.`, {
                    timeout: 5000,
                    position: 'top-left'
                } );

                dialogClosable.close();
            }, { buttonClass: 'contrast flex flex-row justify-center gap-2' } );
        }, { position: [ 'calc(50% - 200px)', '250px' ], size: [ '400px', null ], closable: true, draggable: false } );
    }

    async markOrderAsCompleted( index, wcc, orderNumber )
    {
        const core = this.core;
        const dialogClosable = new LX.Dialog( 'Completar Pedido', ( dialogPanel ) => {
            dialogPanel.addTextArea( null,
                `Vas a completar el pedido ${orderNumber} en WooCommerce. ¿Quieres continuar?`, null, { fitHeight: true,
                disabled: true } );
            dialogPanel.addSeparator();
            dialogPanel.sameLine( 2, 'justify-right mt-2' );
            dialogPanel.addButton( null, 'Cerrar', () => dialogClosable.close(), { buttonClass: 'fg-error' } );
            dialogPanel.addButton( null, 'Continuar', async () => {
                dialogClosable.close();

                // orderNumber = 4529;

                const newStatus = 'completed';
                const dialog = core.makeLoadingDialog();
                const r = await wcc.updateOrderStatus( orderNumber, newStatus );

                dialog.destroy();

                // console.log(r)

                if ( !r.ok )
                {
                    LX.toast( 'WooCommerce Error', `❌ ${r.error}`, { timeout: -1, position: 'top-left' } );
                    return;
                }

                const scrollLeft = this.dataTable.root.querySelector( 'table' ).scrollLeft;
                this.orders[orderNumber].status = newStatus;
                this.dataTable.data.body[index][this.dataTable.data.head.indexOf( 'ESTADO' )] =
                    core.orderStatus[newStatus];
                this.dataTable.refresh();
                this.dataTable.root.querySelector( 'table' ).scrollLeft = scrollLeft;

                LX.toast( `Hecho!`, `✅ Pedido ${orderNumber} completado con éxito.`, { timeout: 5000,
                    position: 'top-left' } );
            }, { buttonClass: 'contrast' } );
        }, { modal: true, position: [ 'calc(50% - 200px)', '250px' ], size: [ '400px', null ], closable: true,
            draggable: false } );
    }

    async showMessages( compName, rowOffset = 0 )
    {
        const core = this.core;
        const compData = core.data[compName];
        const dom = compData.dom;
        const list = compData.list;

        // Check login for compName
        const wcc = compData.wcc;
        if ( !wcc.connected )
        {
            core.openWooCommerceLogin( this.showMessages.bind( this, compName, rowOffset ) );
            return;
        }

        if ( !this.orders )
        {
            this.orders = await this.getCompOrders( compName );
        }

        dom.innerHTML = '';

        // hack to remove all tooltips
        document.querySelectorAll( '.lextooltip' ).forEach( ( el ) => {
            el.remove();
        } );

        const row = list[rowOffset];
        if ( !row )
        {
            const header = LX.makeContainer( [ null, 'auto' ], 'flex flex-col border-top border-bottom gap-2 px-3 py-6',
                `
                    <h1>No hay más mensajes</h1>
                `, dom );
            core.rowOffset = undefined;
            return;
        }

        let str = row['REFERENCIA'] ?? '';
        let orderNumber = undefined;
        const idx = str.indexOf( '/' );
        if ( idx != -1 )
        {
            orderNumber = str.substring( idx + 1 );
            str = str.substring( 0, idx );
        }

        orderNumber = parseInt( orderNumber );
        // orderNumber = 4529;

        const hasOrderNumber = !Number.isNaN( orderNumber );
        const status = core.trackStatusColors['Incidencia'] ?? {};
        let iconStr = LX.makeIcon( 'CircleAlert', { svgClass: 'md fg-white' } ).innerHTML;
        const noOrderStr = `${
            LX.badge( iconStr + 'Sin número', 'text-lg font-bold border-none ', {
                style: { height: '1.4rem', borderRadius: '0.65rem', backgroundColor: status.bg ?? '',
                    color: status.fg ?? '' }
            } )
        }`;

        const header = LX.makeContainer( [ null, 'auto' ],
            'flex flex-col border-top border-bottom gap-2 px-3 py-6 mb-3', `
                <h2 class="flex flex-row items-center gap-1">${row['NOMCONS']}</h2>
                <div class="flex flex-row items-center gap-1"><p class="font-light fg-tertiary">Población</p><p class="flex flex-row items-center font-medium">${
            row['POBLACION']
        }</p></div>
                <div class="flex flex-row items-center gap-1"><p class="font-light fg-tertiary">Situación</p><p class="flex flex-row items-center font-medium">${
            row['CLAVE']
        }</p></div>
                <div class="flex flex-row items-center gap-1"><p class="font-light fg-tertiary">Número de envío</p><p class="flex flex-row items-center font-medium">${
            row['NENVIO']
        }</p></div>
                <div class="flex flex-row items-center gap-1"><p class="font-light fg-tertiary">Referencia</p><p class="flex flex-row items-center font-medium">${str}</p></div>
                <div class="flex flex-row items-center gap-1"><p class="font-light fg-tertiary">Número de pedido</p><p class="flex flex-row items-center font-medium">${
            hasOrderNumber ? orderNumber : noOrderStr
        }</p></div>
            `, dom );

        // Add button to copy NOMBRE USUARIO
        {
            const nPedidoH2 = header.querySelector( 'h2' );
            const copyButtonWidget = new LX.Button( null, 'CopyButton', async function()
            {
                navigator.clipboard.writeText( nPedidoH2.innerText ).then( () => {
                    LX.toast( 'Hecho!', '✅ Mensaje copiado al portapapeles.', { timeout: 5000,
                        position: 'top-left' } );
                } ).catch( ( err ) => {
                    console.error( 'Error copying text: ', err );
                    LX.toast( 'Error', '❌ No se pudo copiar el mensaje.', { timeout: -1, position: 'top-left' } );
                } );
                copyButtonWidget.root.querySelector( "input[type='checkbox']" ).style.pointerEvents = 'none';

                LX.doAsync( () => {
                    copyButtonWidget.swap( true );
                    copyButtonWidget.root.querySelector( "input[type='checkbox']" ).style.pointerEvents = 'auto';
                }, 3000 );
            }, { swap: 'Check', icon: 'Copy', title: 'Copiar', tooltip: true } );
            copyButtonWidget.root.querySelector( '.swap-on svg' ).addClass( 'fg-success' );
            nPedidoH2.appendChild( copyButtonWidget.root );
        }

        let url = cblTrackingUrl;
        switch ( core.transport )
        {
            case 'SEUR':
                url = seurTrackingUrl;
                break;
            case 'GLS':
                url = glsTrackingUrl;
                break;
        }

        const template = core.data[compName].template;
        const templateString = template( row['LOCALIZADOR'], url );

        // Invoice data

        if ( hasOrderNumber && !this.orders[orderNumber] )
        {
            hasOrderNumber = false;
            LX.toast( 'Error', `❌ Número de pedido ${orderNumber} inválido.`, { timeout: -1, position: 'top-left' } );
        }

        if ( hasOrderNumber )
        {
            const invoiceContainer = LX.makeContainer( [ 'null', 'auto' ],
                'flex flex-col border-bottom gap-2 px-3 pb-2 mb-6', ``, dom );
            const invoicePanel = new LX.Panel( { width: '50%', className: 'p-0' } );
            invoiceContainer.appendChild( invoicePanel.root );

            const orderInvoice = await wcc.getInvoice( orderNumber, this.orders[orderNumber] );
            const date = new Date();
            let invoiceNumber = '', invoiceDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
            let customerNote = true;

            if ( orderInvoice !== null )
            {
                invoiceNumber = orderInvoice.number;
                invoiceDate = orderInvoice.date;
                invoicePanel.addText( 'Número de Factura (FT)', orderInvoice.numberFormatted.toString(), null, {
                    disabled: true,
                    nameWidth: '40%',
                    className: 'text-xl font-light fg-tertiary'
                } );
            }

            invoicePanel.addText( 'Número de Factura', invoiceNumber.toString(), ( v ) => {
                v = parseInt( v );
                invoiceNumber = !Number.isNaN( v ) ? v : 0;
            }, { disabled: orderInvoice !== null, placeholder: '000000', nameWidth: '40%',
                className: 'text-xl font-light fg-tertiary' } );
            invoicePanel.addDate( 'Fecha de Factura', invoiceDate, ( v ) => {
                invoiceDate = v;
            }, { disabled: orderInvoice !== null, nameWidth: '40%', className: 'text-xl font-light fg-tertiary' } );

            if ( orderInvoice === null )
            {
                invoicePanel.addButton( null, 'Facturar', () => {
                    const dialogClosable = new LX.Dialog( 'Facturar en WooCommerce', ( dialogPanel ) => {
                        dialogPanel.addTextArea( null,
                            `Vas a facturar con los siguientes datos en WooCommerce (pedido ${orderNumber}). Revisa los datos antes de continuar.`,
                            null, { fitHeight: true, disabled: true } );
                        dialogPanel.addSeparator();
                        dialogPanel.addNumber( 'Número de Factura', invoiceNumber, () => {}, { disabled: true,
                            nameWidth: '40%', className: 'text-lg fg-tertiary' } );
                        dialogPanel.addText( 'Fecha de Factura', invoiceDate, () => {}, { disabled: true,
                            nameWidth: '40%', className: 'text-lg fg-tertiary' } );
                        dialogPanel.addSeparator();
                        dialogPanel.addCheckbox( 'Añadir nota de seguimiento', customerNote, ( v ) => {
                            customerNote = v;
                        }, { disabled: false, nameWidth: '60%', className: 'text-lg fg-tertiary' } );
                        dialogPanel.sameLine( 2, 'justify-right mt-2' );
                        dialogPanel.addButton( null, 'Cerrar', () => dialogClosable.close(), {
                            buttonClass: 'fg-error'
                        } );
                        dialogPanel.addButton( null, 'Continuar', async () => {
                            dialogClosable.close();

                            const oN = orderNumber; // ?? 4529;
                            const iN = invoiceNumber;
                            const iD = `${convertDateDMYtoMDY( invoiceDate )} ${date.getHours()}:${date.getMinutes()}`;
                            const dialog = core.makeLoadingDialog();

                            if ( customerNote )
                            {
                                let r = await wcc.createOrderNote( oN, templateString );
                                if ( !r.ok )
                                {
                                    LX.toast( 'WooCommerce Error', `❌ ${r.error}`, { timeout: -1,
                                        position: 'top-left' } );
                                    dialog.destroy();
                                    return;
                                }

                                console.log( 'Nota creada para pedido #' + oN );
                            }

                            {
                                let r = await wcc.updateInvoice( oN, iN, iD, compData.prefix, compData.suffix,
                                    compData.padding );
                                if ( !r.ok )
                                {
                                    LX.toast( 'WooCommerce Error', `❌ ${r.error}`, { timeout: -1,
                                        position: 'top-left' } );
                                    dialog.destroy();
                                    return;
                                }

                                console.log( `Factura actualizada (${iN}, ${iD}) para pedido #${oN}` );
                            }

                            dialog.destroy();

                            LX.toast( 'Hecho!', '✅ Pulsa <span>Ver</span> para comprobar los datos en la plataforma.',
                                {
                                    timeout: 5000,
                                    position: 'top-left',
                                    action: {
                                        name: 'Ver',
                                        callback: () => {
                                            const url = core.data[compName].url;
                                            const link = `${url}post.php?post=${orderNumber}&action=edit`;
                                            window.open( link );
                                        }
                                    }
                                } );

                            // store new returned order
                            this.orders[orderNumber] = r.data;

                            // refresh
                            this.showMessages( compName, rowOffset );
                        }, { buttonClass: 'contrast' } );
                    }, { modal: true, position: [ 'calc(50% - 200px)', '250px' ], size: [ '400px', null ],
                        closable: true, draggable: false } );
                }, { buttonClass: 'contrast' } );
            }
        }

        const body = LX.makeContainer( [ null, 'auto' ], 'p-2', templateString, dom );

        const footerPanel = new LX.Panel( { height: 'auto', className: 'bg-none bg-primary border-none p-2' } );
        footerPanel.sameLine();

        const openWeCLink = footerPanel.addButton( null, 'OpenWeCLinkButton', () => {
            if ( hasOrderNumber )
            {
                const url = core.data[compName].url;
                const link = `${url}post.php?post=${orderNumber}&action=edit`;
                window.open( link );
            }
            else
            {
                // No deberia ocurrir!
                throw ( 'Trying to open orderLink without order number!' );
            }
        }, { disabled: !hasOrderNumber, width: '100px', icon: 'ExternalLink', title: 'Abrir pedido',
            tooltip: hasOrderNumber } );
        dom.appendChild( footerPanel.root );

        const copyButtonWidget = footerPanel.addButton( null, 'CopyButton', async () => {
            navigator.clipboard.writeText( templateString ).then( () => {
                LX.toast( 'Hecho!', '✅ Mensaje copiado al portapapeles.', { timeout: 5000, position: 'top-left' } );
            } ).catch( ( err ) => {
                console.error( 'Error copying text: ', err );
                LX.toast( 'Error', '❌ No se pudo copiar el mensaje.', { timeout: -1, position: 'top-left' } );
            } );
            copyButtonWidget.root.querySelector( "input[type='checkbox']" ).style.pointerEvents = 'none';

            LX.doAsync( () => {
                copyButtonWidget.swap( true );
                copyButtonWidget.root.querySelector( "input[type='checkbox']" ).style.pointerEvents = 'auto';
            }, 3000 );
        }, { width: '100px', swap: 'Check', icon: 'Copy', title: 'Copiar mensaje', tooltip: true } );
        copyButtonWidget.root.querySelector( '.swap-on svg' ).addClass( 'fg-success' );

        const nextButtonWidget = footerPanel.addButton( null, 'NextButton', () => {
            this.showMessages( compName, rowOffset + 1 );
        }, { width: '100px', icon: 'ArrowRight', title: 'Siguiente', tooltip: true } );
        dom.appendChild( footerPanel.root );

        const nextWithOrderNumberButtonWidget = footerPanel.addButton( null, 'NextWithOrderNumberButton', () => {
            let nRo = rowOffset + 1;

            for ( let i = nRo; i < list.length; ++i )
            {
                const r = list[i];
                let str = r['REFERENCIA'] ?? '';
                let oN = undefined;
                const idx = str.indexOf( '/' );
                if ( idx != -1 )
                {
                    oN = parseInt( str.substring( idx + 1 ) );
                    if ( oN !== undefined && !Number.isNaN( oN ) )
                    {
                        nRo = i;
                        break;
                    }
                }
            }
            this.showMessages( compName, nRo );
        }, { width: '100px', icon: 'ArrowRightToLine', title: 'Siguiente (con #Pedido)', tooltip: true } );
        dom.appendChild( footerPanel.root );

        footerPanel.endLine();

        core.compName = compName;
        core.rowOffset = rowOffset;
    }

    openMessageDialog()
    {
        const core = this.core;
        const dialogClosable = new LX.Dialog( 'Nuevo Mensaje de Seguimiento', ( dialogPanel ) => {
            const dialogArea = new LX.Area( { className: '' } );
            dialogPanel.attach( dialogArea.root );
            const [ left, right ] = dialogArea.split( { type: 'horizontal', sizes: [ '55%', '45%' ], resize: false } );
            const companyOptions = Object.values( core.data ).filter( ( v ) => v.name ).map( ( v ) => v.name );

            let t = 'SEUR', id = '', idOrder = '', c = core.data[core.compName].name;

            let updateMessage = ( callback ) => {
                body.innerHTML = getTemplate();
                if ( callback )
                {
                    callback();
                }
            };

            let p = new LX.Panel( { className: 'bg-none bg-primary border-none p-2' } );
            p.addSelect( 'Empresa', companyOptions, c, ( value, event ) => {
                c = value;
                updateMessage();
            }, { nameWidth: '35%', skipReset: true } );
            p.addSelect( 'Transporte', core.transportOptions, t, ( value, event ) => {
                t = value;
                updateMessage();
            }, { nameWidth: '35%', skipReset: true } );
            p.addText( 'Número seguimiento', id, ( value, event ) => {
                id = value;
                updateMessage();
            }, { nameWidth: '35%', skipReset: true, placeholder: '0A00MD00' } );
            p.addText( 'Número de pedido', idOrder, ( value, event ) => {
                idOrder = value;
                updateMessage();
            }, { nameWidth: '35%', skipReset: true, placeholder: '00000' } );
            p.addSeparator();

            p.sameLine( 2 );

            const sendNoteButtonWidget = p.addButton( null, 'SendNoteButton', async () => {
                const compName = c.toLowerCase();
                const wcc = core.data[compName].wcc;
                if ( !wcc.connected )
                {
                    core.openWooCommerceLogin( null, compName );
                    sendNoteButtonWidget.swap();
                    return;
                }

                sendNoteButtonWidget.root.querySelector( "input[type='checkbox']" ).style.pointerEvents = 'none';
                sendNoteButtonWidget.root.querySelector( '.swap-on' ).classList.add( 'hidden' );
                const spinner = LX.makeIcon( 'LoaderCircle', { iconClass: 'flex', svgClass: 'md animate-spin' } );
                sendNoteButtonWidget.root.querySelector( 'button' ).appendChild( spinner );

                {
                    let r = await wcc.createOrderNote( idOrder, getTemplate() );
                    if ( !r.ok )
                    {
                        LX.toast( 'WooCommerce Error', `❌ ${r.error}`, { timeout: -1, position: 'top-left' } );

                        sendNoteButtonWidget.root.querySelector( '.swap-on svg' ).addClass( 'fg-error' );

                        spinner.remove();
                        sendNoteButtonWidget.root.querySelector( '.swap-on' ).classList.remove( 'hidden' );
                        LX.doAsync( () => {
                            sendNoteButtonWidget.swap( true );
                            sendNoteButtonWidget.root.querySelector( "input[type='checkbox']" ).style.pointerEvents =
                                'auto';
                        }, 2000 );

                        return;
                    }

                    sendNoteButtonWidget.root.querySelector( '.swap-on svg' ).addClass( 'fg-success' );

                    spinner.remove();
                    sendNoteButtonWidget.root.querySelector( '.swap-on' ).classList.remove( 'hidden' );
                    LX.doAsync( () => {
                        sendNoteButtonWidget.swap( true );
                        sendNoteButtonWidget.root.querySelector( "input[type='checkbox']" ).style.pointerEvents =
                            'auto';
                    }, 2000 );

                    console.log( 'Nota creada para pedido #' + idOrder );
                }
            }, { icon: 'PaperPlane', swap: 'Check', title: 'Enviar Mensaje', tooltip: true, width: '50%',
                mustConfirm: true, confirmSide: 'right', // confirmAlign: "start",
                confirmText: 'Continuar', confirmCancelText: 'Cancelar', confirmTitle: 'Confirmar acción',
                confirmContent: `Se va a enviar un mensaje al cliente. ¿Quieres continuar?` } );

            const copyButtonWidget = p.addButton( null, 'CopyButton', async () => {
                navigator.clipboard.writeText( body.innerHTML ).then( () => {
                    LX.toast( 'Hecho!', '✅ Mensaje copiado al portapapeles.', { timeout: 5000,
                        position: 'top-left' } );
                } ).catch( ( err ) => {
                    console.error( 'Error copying text: ', err );
                    LX.toast( 'Error', '❌ No se pudo copiar el mensaje.', { timeout: -1, position: 'top-left' } );
                } );
                copyButtonWidget.root.querySelector( "input[type='checkbox']" ).style.pointerEvents = 'none';

                LX.doAsync( () => {
                    copyButtonWidget.swap( true );
                    copyButtonWidget.root.querySelector( "input[type='checkbox']" ).style.pointerEvents = 'auto';
                }, 3000 );
            }, { swap: 'Check', icon: 'Copy', title: 'Copiar Mensaje', tooltip: true, width: '50%' } );
            copyButtonWidget.root.querySelector( '.swap-on svg' ).addClass( 'fg-success' );

            left.attach( p.root );

            const getTemplate = () => {
                const comp = c.toLowerCase();
                if ( comp == 'otros' ) return '';
                let url = cblTrackingUrl;
                switch ( t )
                {
                    case 'SEUR':
                        url = seurTrackingUrl;
                        break;
                    case 'GLS':
                        url = glsTrackingUrl;
                        break;
                }

                const template = core.data[comp].template;
                return template( id, url, t );
            };

            const body = LX.makeContainer( [ null, 'auto' ], 'p-4 items-center', '', right );
            body.innerHTML = getTemplate();
        }, { modal: true, size: [ 'min(100%, 900px)', null ], closable: true, draggable: false } );
    }

    openSelectedOrders()
    {
        const selectedOrders = this.dataTable.getSelectedRows();
        if ( !selectedOrders.length )
        {
            return;
        }

        const core = this.core;
        const url = core.data[core.compName].url;
        const allLinks = selectedOrders.map( ( row ) => {
            const orderNumber = row[0] ?? '';
            if ( !orderNumber.length ) return;
            return `${url}post.php?post=${orderNumber}&action=edit`;
        } ).filter( ( l ) => l !== undefined );

        const fn = () => {
            allLinks.forEach( ( l ) => window.open( l ) );
        };

        if ( allLinks.length > 1 )
        {
            const dialogClosable = new LX.Dialog( '⚠️ Aviso', ( dialogPanel ) => {
                dialogPanel.addTextArea( null,
                    `Esto abrirá ${allLinks.length} pestañas al mismo tiempo. ¿Quieres continuar?`, null, {
                    fitHeight: true,
                    disabled: true
                } );
                dialogPanel.addSeparator();
                dialogPanel.sameLine( 2, 'justify-right' );
                dialogPanel.addButton( null, 'Cerrar', () => dialogClosable.close(), { buttonClass: 'fg-error' } );
                dialogPanel.addButton( null, 'Continuar', () => {
                    dialogClosable.close();
                    fn();
                }, { buttonClass: 'contrast' } );
            }, { modal: true, position: [ 'calc(50% - 200px)', '250px' ], size: [ '400px', null ], closable: true,
                draggable: false } );
        }
        else
        {
            fn();
        }
    }

    async getCompOrders( compName )
    {
        const core = this.core;
        const compData = core.data[compName];
        const { list, wcc } = compData;

        const orders = {};

        const ids = list.map( ( row ) => {
            const ref = row['REFERENCIA'];
            const idx = ref.indexOf( '/' );
            if ( idx != -1 )
            {
                return parseInt( ref.substring( idx + 1 ) );
            }
        } ).filter( ( v ) => v !== undefined );

        if ( !ids.length )
        {
            return {};
        }

        const dialog = core.makeLoadingDialog( 'Cargando pedidos, espere...' );

        const r = await wcc.getOrdersByIds( ids );
        if ( !r.ok )
        {
            LX.toast( 'WooCommerce Error', `❌ ${r.error}`, { timeout: -1, position: 'top-left' } );
            return;
        }

        r.data.forEach( ( o ) => orders[o['number']] = o );

        dialog.destroy();

        console.log( 'New orders', orders );

        return orders;
    }

    updateLists()
    {
        this.showList( 'otros', false );
        this.showList( 'bathby', false );
        this.showList( 'hxg', false );
        this.showList( 'jowy', false );
    }

    open( params )
    {
        this.core.tool = 'tracking-messages';
        this.core.setHeaderTitle( 'Gestión de pedidos: <i>CBL</i>',
            'Arrastra un <strong>.xlsx</strong> aquí para cargar un nuevo listado de envíos.', 'FileText' );
        this.area.root.classList.toggle( 'hidden', false );
    }

    clear()
    {
        this.updateLists();
    }
}

export { CblTrackingApp };
