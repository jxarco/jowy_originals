import { LX } from 'lexgui';

function getDateNDaysAgo( n = 30 )
{
    const d = new Date();
    d.setDate( d.getDate() - n );
    return d.toISOString();
}

class OrdersApp
{
    ordersBeforeDays = 7;

    constructor( core )
    {
        this.core = core;
        this.area = new LX.Area( { skipAppend: true, className: 'hidden' } );
        core.area.attach( this.area );

        // Create utility buttons
        const utilButtonsPanel = new LX.Panel( { height: 'auto', className: 'bg-none bg-card border-none p-2 flex flex-row gap-2' } );
        utilButtonsPanel.sameLine( 3 );
        utilButtonsPanel.addButton( null, 'ClearButton', core.clearData.bind( core ), { icon: 'Trash2', title: 'Limpiar datos anteriores',
            tooltip: true } );
        utilButtonsPanel.addNumber( null, this.ordersBeforeDays, ( v ) => {
            this.ordersBeforeDays = v;
        }, { step: 1, min: 1, max: 120, units: 'días', skipSlider: true } );
        utilButtonsPanel.addButton( null, 'TooltipButton', null, { disabled: true, icon: 'Info', buttonClass: 'bg-none',
            title: "Ver pedidos de hasta 'N' días atrás", tooltip: true } );
        this.area.attach( utilButtonsPanel.root );

        const tabs = this.area.addTabs( { parentClass: 'p-4', sizes: [ 'auto', 'auto' ], contentClass: 'p-2 pt-0' } );
        // this.ordersTabs = tabs.root;

        // Jowy
        {
            const jowyContainer = LX.makeContainer( [ null, 'auto' ],
                'flex flex-col relative bg-card p-1 pt-0 rounded-lg overflow-hidden' );
            tabs.add( 'Jowy', jowyContainer, { selected: true, onSelect: ( event, name ) => this.showOrders( name.toLowerCase() ) } );

            const jowyArea = new LX.Area( { className: 'rounded-lg' } );
            jowyContainer.appendChild( jowyArea.root );
            core.data['jowy'].domO = jowyContainer;
        }

        // HxG
        {
            const hxgContainer = LX.makeContainer( [ null, 'auto' ],
                'flex flex-col relative bg-card p-1 pt-0 rounded-lg overflow-hidden' );
            tabs.add( 'HxG', hxgContainer, { xselected: true, onSelect: ( event, name ) => this.showOrders( name.toLowerCase() ) } );

            const hxgArea = new LX.Area( { className: 'rounded-lg' } );
            hxgContainer.appendChild( hxgArea.root );
            core.data['hxg'].domO = hxgContainer;
        }

        // Bathby
        {
            const bathbyContainer = LX.makeContainer( [ null, 'auto' ],
                'flex flex-col relative bg-card p-1 pt-0 rounded-lg overflow-hidden' );
            tabs.add( 'Bathby', bathbyContainer, { xselected: true, onSelect: ( event, name ) => this.showOrders( name.toLowerCase() ) } );

            const bathbyArea = new LX.Area( { className: 'rounded-lg' } );
            bathbyContainer.appendChild( bathbyArea.root );
            core.data['bathby'].domO = bathbyContainer;
        }

        // Move up into the panel section
        utilButtonsPanel.attach( tabs.root );

        this.clear();
    }

    updateOrders()
    {
        this.showOrders( 'bathby', true );
        this.showOrders( 'hxg', true );
        this.showOrders( 'jowy', true );
    }

    async showOrders( compName, clean = false )
    {
        const core = this.core;
        const compData = core.data[compName];
        const { name, url, wcc } = compData;
        const dom = compData.domO;
        dom.innerHTML = '';

        if ( clean )
        {
            return;
        }

        core.compName = compName;

        if ( !wcc.connected )
        {
            core.openWooCommerceLogin( this.showOrders.bind( this, compName, clean ) );
            return;
        }

        const dialog = core.makeLoadingDialog( 'Cargando pedidos, espere...' );

        const after = getDateNDaysAgo( this.ordersBeforeDays );
        const before = null;
        const r = await wcc.getAllOrdersByFilter( after, before, [ 'processing', 'on-hold' ] );
        console.log( r );

        core.setHeaderTitle( `Web (${name}): <i>Pedidos</i>`, `${r.length} pedidos pendientes (Últimos ${this.ordersBeforeDays} día/s)`,
            'WooCommerce' );

        dialog.destroy();

        // fecha, sku, desc (auto), cantidad, transporte (), "WEB", pais, observaciones (num pedido)

        const columnData = [
            [ 'paymethod', 'PAGO', ( r ) => {
                // `payment_method_title`
                const b = new LX.Button( null, 'Payment', null, { buttonClass: 'bg-none', icon: 'CircleDollarSign',
                    title: r['payment_method_title'] } );
                return b.root.innerHTML;
            } ],
            [ 'preview', 'PREVIEW', ( r, i ) => {
                return `<img title="${i['name']}" class="rounded" style="width:3rem;" src="${i['image']['src']}">`;
            } ],
            [ 'date', 'FECHA', ( r ) => {
                const d = new Date( r['date_created'] );
                return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
            } ],
            [ 'sku', 'REFERENCIA', ( r, i ) => i['sku'] ],
            // [ "desc", "DESCRIPCIÓN", (r) => "" ],
            [ 'quantity', 'UNIDADES', ( r, i ) => i['quantity'] ],
            [ 'transport', 'TRANSPORTE', ( r, i ) => {
                const shipping = ( r['shipping_lines'] ?? [] )[0];
                if ( shipping['method_id'] === 'local_pickup' )
                {
                    return 'RECOGIDA ALMACÉN';
                }
                const q = i['quantity'];
                const sku = i['sku'];
                if ( ( sku.startsWith( 'JW-D' ) && q > 2 )
                    || sku.startsWith( 'JW-RT' )
                    || sku.startsWith( 'HG-AD' ) ) return 'CBL';
                return 'SEUR';
            } ],
            [ 'platform', 'PLATAFORMA', ( r ) => 'WEB' ],
            [ 'country', 'PAÍS', ( r ) => {
                const shippingInfo = r['shipping'];
                const ctr = shippingInfo['country'];
                return core.countryFormat[ctr] ?? ctr;
            } ],
            [ 'notes', 'OBSERVACIONES', ( r ) => `${r['number']}${r['status'] == 'on-hold' ? ' TRANSFERENCIA' : ''}` ]
        ];

        const tableData = [];

        // Create table data from the list
        r.forEach( ( row ) => {
            const items = row['line_items'];

            for ( let item of items )
            {
                const lRow = [];

                for ( let c of columnData )
                {
                    const ogColName = c[0];
                    if ( row[ogColName] )
                    {
                        const fn = c[2] ?? ( ( str ) => str );
                        lRow.push( fn( row[ogColName] ) );
                    }
                    else if ( c[2] )
                    {
                        const fn = c[2];
                        lRow.push( fn( row, item ) );
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
                { name: 'TRANSPORTE', options: [ 'CBL', 'SEUR', 'RECOGIDA ALMACÉN' ] },
                { name: 'PAÍS', options: [ 'ESPAÑA', 'FRANCIA', 'PORTUGAL' ] }
            ],
            rowActions: [
                {
                    icon: 'Copy',
                    title: 'Copiar',
                    callback: ( rowIndex, rowData ) => {
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
                },
                {
                    icon: 'ExternalLink',
                    title: 'Abrir Pedido',
                    callback: ( rowIndex, rowData ) => {
                        const orderNumber = rowData[8].split( ' ' )[0];
                        if ( orderNumber !== '' ) window.open( `${url}post.php?post=${orderNumber}&action=edit` );
                    }
                }
            ]
        } );

        dom.appendChild( tableWidget.root );
    }

    open( params )
    {
        this.core.tool = 'orders';
        this.core.setHeaderTitle( `Web: <i>Pedidos</i>`, '', 'WooCommerce' );
        this.area.root.classList.toggle( 'hidden', false );
    }

    close()
    {
    }

    clear()
    {
        delete this.orders;
        this.updateOrders();
    }
}

export { OrdersApp };
