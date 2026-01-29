import { LX } from 'lexgui';
import { BaseApp } from './base_app.js';
import { Constants } from '../constants.js';
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
        [ BaseApp.CLIENT_NAME_ATTR, null, ( row, i ) => {
            const customer = row.customer;
            const str1 = customer?.firstname;
            const str2 = customer?.lastname;
            return str1 + ( str2 ? ` ${str2}` : '' );
        } ],
        [ BaseApp.PAIS_ATTR, null, ( row, i ) => {
            return row.customer?.shipping_address?.country;
        } ],
        [ 'Provincia', null, ( row, i ) => '' ],
        [ BaseApp.CITY_ATTR, null, ( row, i ) => {
            return row.customer?.shipping_address?.city;
        } ],
        [ BaseApp.CP_ATTR, null, ( row, i ) => {
            return row.customer?.shipping_address?.zip_code;
        } ],
        [ BaseApp.STREET_ATTR, null, ( row, i ) => {
            const shipping = row.customer?.shipping_address;
            const str1 = shipping?.street_1;
            const str2 = shipping?.street_2;
            return str1 + ( str2 ? ` ${str2}` : '' );
        } ],
        [ BaseApp.PHONE_ATTR, null, ( row, i ) => {
            return row.customer?.shipping_address?.phone;
        } ],
        [ BaseApp.EMAIL_ATTR, null, ( row, i ) => '' ]
    ]
};

class MiraklApp extends BaseApp
{
    constructor( core, vendorName )
    {
        super( core, vendorName.toLowerCase() + '-mirakl' );

        this.title = `${vendorName} <i>(Mirakl)</i>`;
        this.subtitle = 'Información de pedidos a través de la API de Mirakl.';
        this.icon = vendorName;
        this.mkClient = new MiraklClient();
        this.vendor = vendorName;

        const vendor_lc = vendorName.toLowerCase();

        // Create utility buttons
        const utilsPanel = new LX.Panel( { height: 'auto', className: Constants.UTILITY_BUTTONS_PANEL_CLASSNAME } );
        utilsPanel.sameLine();
        Utils.addUtilityButton( utilsPanel, 'ClearButton', 'Trash2', 'Limpiar datos anteriores', () => this.core.clearData() );
        Utils.addUtilityButton( utilsPanel, 'UpdateOrdersButton', 'RefreshCw', 'Actualizar pedidos', () => this.showOrders( vendor_lc ) );

        utilsPanel.endLine();

        this.area.attach( utilsPanel.root );

        const tabs = this.area.addTabs( { parentClass: 'p-4', sizes: [ 'auto', 'auto' ], contentClass: 'p-2 pt-0' } );

        // Orders
        const ordersContainer = LX.makeContainer( [ null, 'auto' ], Constants.TAB_CONTAINER_CLASSNAME );
        tabs.add( 'Pedidos', ordersContainer, { selected: true, onSelect: ( event, name ) => this.showOrders( vendor_lc ) } );
        const ordersArea = new LX.Area( { className: Constants.TAB_AREA_CLASSNAME } );
        ordersContainer.appendChild( ordersArea.root );

        // Move up into the panel section
        utilsPanel.attach( tabs.root );

        this.ordersArea = ordersArea;

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
            hiddenColumns: [ 'Provincia', BaseApp.EMAIL_ATTR ]
        } );

        this.ordersArea.attach( tableWidget );

        this.lastOrdersData = r.orders;
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
    }
}

export { MiraklApp };
