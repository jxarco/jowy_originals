import { LX } from 'lexgui';
import { CblTrackingApp } from './apps/cbl_tracking_app.js';
import { OrdersApp } from './apps/orders_app.js';
import { SeurApp } from './apps/seur_app.js';
import { TransportCalculatorApp } from './apps/trans_calculator.js';
import { ChillApp } from './apps/chill_app.js';
import { WooCommerceClient } from './woocomerce.js';

window.LX = LX;

class Company
{
    constructor( name, url, store, prefix, padding = 6, suffix = '' )
    {
        this.name = name;
        this.url = url;
        this.store = store;
        this.prefix = prefix;
        this.padding = padding;
        this.suffix = suffix;
        this.wcc = new WooCommerceClient();
        this.dom = null;
        this.domO = null;
        this.list = [];
    }
}

const core = {
    transport: 'CBL', // Default transport
    transportOptions: [ 'CBL', 'SEUR' ], // , "GLS"];
    sheetName: '',
    countryFormat: {
        'Spain': 'ESPAÑA',
        'ES': 'ESPAÑA',
        'Portugal': 'PORTUGAL',
        'PT': 'PORTUGAL',
        'Italy': 'ITALIA',
        'France': 'FRANCIA',
        'FR': 'FRANCIA'
    },
    orderStatus: {
        'pending': 'Pendiente de pago',
        'processing': 'Procesando',
        'on-hold': 'En espera',
        'enviado': 'Enviado',
        'completed': 'Completado',
        'cancelled': 'Cancelado',
        'refunded': 'Reembolsado',
        'failed': 'Fallido',
        'trash': 'Borrador',
        'recordatorio-rese': '1a Reseña'
    },
    orderStatusColors: {
        'Pendiente de pago': { icon: 'HandCoins', bg: '#2563eb' },
        'Procesando': { icon: 'Loader', bg: '#272c31ff' },
        'En espera': { icon: 'Clock3', bg: '#ca8a04' },
        'Enviado': { icon: 'PlaneTakeoff', bg: '#d5d5d5', fg: '#222' },
        'Completado': { icon: 'CheckCircle', bg: '#218118' },
        'Cancelado': { icon: 'Ban', bg: '#dc2626' },
        'Reembolsado': { icon: 'CircleDollarSign', bg: '#a21caf' },
        'Fallido': { icon: 'CircleX', bg: '#dc2626' },
        'Borrador': { icon: 'FileText', bg: '#0d9488' },
        '1a Reseña': { icon: 'Star', bg: '#FFC844', fg: '#222' },
    },
    trackStatusColors: {
        'Documentada': { icon: 'File', bg: '#272c31ff' },
        'Entregada': { icon: 'CircleCheck', bg: '#218118' },
        'Incidencia': { icon: 'CircleAlert', bg: '#dc2626' },
        'En reparto': { icon: 'Truck', bg: '#0d9488' },
        'En destino': { icon: 'Warehouse', bg: '#2563eb' },
        'En tránsito': { icon: 'Package', bg: '#a21caf' },
        'En gestión': { icon: 'TriangleAlert', bg: '#ca8a04' },
        'Devuelta': { icon: 'Frown', bg: '#dc2626' }
    },
    data: {
        'otros': { list: [], dom: null },
        'jowy': new Company( 'Jowy', 'https://www.jowyoriginals.com/wp-admin/', 'https://jowyoriginals.com', '2-' ),
        'hxg': new Company( 'HxG', 'https://www.homexgym.com/wp-admin/', 'https://homexgym.com', '3-' ),
        'bathby': new Company( 'Bathby', 'https://www.bathby.com/wp-admin/', 'https://bathby.com', '4-' )
    },

    init: function( coreArea )
    {
        this.area = coreArea;

        // Header
        this.createHeaderHtml();

        // Content: create all apps
        this.cblTrackingApp = new CblTrackingApp( this );
        this.seurApp = new SeurApp( this );
        this.ordersApp = new OrdersApp( this );
        this.transportCalculatorApp = new TransportCalculatorApp( this );
        this.chillApp = new ChillApp( this );

        // Footer
        this.createFooterHtml();

        const hash = window.location.hash.substring( 1 ); // remove leading #
        const params = new URLSearchParams( hash );
        const accessToken = params.get( 'access_token' );

        if ( accessToken )
        {
            this.getGoogleDriveFile( accessToken );
        }
        else
        {
            // Start last tool
            const lastTool = localStorage.getItem( 'lastTool' ) ?? 'tracking-messages';
            if ( lastTool === 'tracking-messages' )
            {
                this.openApp( this.cblTrackingApp );
            }
            else if ( lastTool.includes( 'seur' ) )
            {
                this.openApp( this.seurApp );
            }
            else if ( lastTool.includes( 'orders' ) )
            {
                this.openApp( this.ordersApp );
            }
            else if ( lastTool.includes( 't-calc' ) )
            {
                this.openApp( this.transportCalculatorApp );
            }
            else if ( lastTool.includes( 'chill' ) )
            {
                this.openApp( this.chillApp );
            }
        }

        // LX.requestBinary( "listadoenvios.xlsx", (data) => {
        //     const workbook = XLSX.read(data, {type: "binary"});
        //     core.sheetName = workbook.SheetNames[0];
        //     const sheet = workbook.Sheets[ core.sheetName ];
        //     if( core.processData( XLSX.utils.sheet_to_json(sheet, { raw: false }) ) )
        //     {
        //         LX.toast( "Datos cargados", `✅ ${ "envios.xlsx" }`, { timeout: 5000, position: "top-left" } );
        //     }
        // } );
    },

    createHeaderHtml: function()
    {
        const header = LX.makeContainer( [ null, 'auto' ], 'flex flex-col border-top border-bottom gap-2 px-6 py-12', `
            <div style="display:flex;flex-direction:row;gap:0.5rem;align-items:center;">${
            LX.makeIcon( 'Info', { svgClass: 'xxl' } ).innerHTML
        }<h1>Jowy Originals</h1></div>
            <p class="font-light" style="max-width:32rem">Elige una de las herramientas para empezar.</p>
        `, this.area );
        header.style.background = `url('data/banner_${LX.getTheme()}.png') no-repeat center center / cover`;
        header.style.transition = 'transform 0.1s ease-in';
        this.header = header;

        // add file drag and drop event to header
        header.addEventListener( 'dragover', ( event ) => {
            event.preventDefault();
            event.stopPropagation();
            header.classList.add( 'draggingover' );
        } );

        header.addEventListener( 'dragleave', ( event ) => {
            event.preventDefault();
            event.stopPropagation();
            header.classList.remove( 'draggingover' );
        } );

        header.addEventListener( 'drop', ( event ) => {
            event.preventDefault();
            event.stopPropagation();
            header.classList.remove( 'draggingover' );

            // Check if a file was dropped
            if ( event.dataTransfer.files.length > 0 )
            {
                const file = event.dataTransfer.files[0];
                if ( file.name.endsWith( '.xlsx' ) || file.name.endsWith( '.xlsm' ) )
                {
                    const reader = new FileReader();
                    reader.onload = function( e )
                    {
                        const data = e.target.result;

                        try
                        {
                            const workbook = XLSX.read( data, { type: 'binary' } );
                            core.sheetName = workbook.SheetNames[0];
                            const sheet = workbook.Sheets[core.sheetName];
                            if ( core.processData( XLSX.utils.sheet_to_json( sheet, { raw: false } ) ) )
                            {
                                LX.toast( 'Hecho!', `✅ Datos cargados: ${file.name}`, { timeout: 5000, position: 'top-center' } );
                            }
                        }
                        catch ( e )
                        {
                            LX.toast( 'Error', '❌ No se pudo leer el archivo.' + e, { timeout: -1, position: 'top-center' } );
                        }
                    };

                    // Read the data as binary
                    reader.readAsArrayBuffer( file );
                }
                else if ( file.name.endsWith( '.csv' ) )
                {
                    const reader = new FileReader();
                    reader.onload = function( e )
                    {
                        const data = e.target.result.split( '\n' );
                        const colData = data[0].split( ';' );
                        const sheetData = [];

                        for ( const l of data.slice( 1 ) )
                        {
                            if ( !l || !l.length )
                            {
                                continue;
                            }

                            const json = {};

                            const rowData = l.split( ';' );

                            colData.forEach( ( v, i ) => {
                                json[v] = rowData[i];
                            } );

                            sheetData.push( json );
                        }

                        if ( core.processData( sheetData ) )
                        {
                            LX.toast( 'Hecho!', `✅ Datos cargados: ${file.name}`, { timeout: 5000, position: 'top-center' } );
                        }
                    };

                    // Read the data as binary
                    reader.readAsText( file );
                }
                else
                {
                    alert( 'Please drop a valid .xlsx or .csv file.' );
                }
            }
        } );

        this.header = header;
    },

    setHeaderTitle: function( title, subtitle, icon )
    {
        this.header.querySelector( 'div' ).innerHTML = `${
            LX.makeIcon( icon ?? 'Info', { svgClass: 'xxl mr-2' } ).innerHTML
        }<h1>${title}</h1>`;
        this.header.querySelector( 'p' ).innerHTML = subtitle ?? '';
    },

    createFooterHtml: function()
    {
        this.footer = new LX.Footer( {
            className: 'border-top',
            parent: LX.root,
            credits: `${new Date().getUTCFullYear()}. Alex Rodríguez (@jxarco)`,
            socials: [
                { title: 'Github', link: 'https://github.com/jxarco/', icon: 'Github' }
            ]
        } );
    },

    openApp: function( app, params )
    {
        this.trackingMessagesArea.root.classList.toggle( 'hidden', true );
        this.sheinDataArea.root.classList.toggle( 'hidden', true );
        this.ordersArea.root.classList.toggle( 'hidden', true );
        this.transCalculatorArea.root.classList.toggle( 'hidden', true );
        this.chillAppArea.root.classList.toggle( 'hidden', true );

        app.open( params );

        localStorage.setItem( 'lastTool', this.tool );
    },

    processData: function( fileData, local )
    {
        let err = null;

        if ( this.tool == 'tracking-messages' )
        {
            // Clear previous data
            for ( const key in this.data )
            {
                this.data[key].list = [];
            }

            for ( const row of fileData )
            {
                const ref = row['REFERENCIA'];

                if ( !ref )
                {
                    err = 'Filas sin _REFERENCIA_ en el xlsx.';
                }

                switch ( ref[0] )
                {
                    case '2':
                        this.data['jowy'].list.push( row );
                        break;
                    case '3':
                        this.data['hxg'].list.push( row );
                        break;
                    case '4':
                        this.data['bathby'].list.push( row );
                        break;
                    default:
                        this.data['otros'].list.push( row );
                        break;
                }
            }

            this.cblTrackingApp.showList( 'jowy', true, true );
        }
        else if ( this.tool == 'seur' )
        {
            this.seurApp.openData( fileData );
        }

        if ( err !== null )
        {
            LX.toast( 'Aviso', `⚠️ ${err}`, { position: 'top-center' } );
        }

        return true;
    },

    updateTransport: function( value )
    {
        this.transport = value;

        if ( this.rowOffset != undefined )
        {
            this.showMessages( this.compName, this.rowOffset );
        }
    },

    clearData: function()
    {
        console.log( 'Clearing data...' );
        localStorage.removeItem( 'lastTool' );

        this.data['otros'].list = [];
        this.data['jowy'].list = [];
        this.data['hxg'].list = [];
        this.data['bathby'].list = [];

        this.cblTrackingApp.clear();
        this.seurApp.clear();
        this.ordersApp.clear();
    },

    redirectToOAuth: function()
    {
        // For now is read only
        const clientId = '851633355284-ecd2lk1f1v771sv18rkmrjvvup6752iq.apps.googleusercontent.com';
        const redirectUri = encodeURIComponent( window.location.origin + window.location.pathname );
        const scope = encodeURIComponent( 'https://www.googleapis.com/auth/drive.readonly' );
        const authUrl =
            `https://accounts.google.com/o/oauth2/v2/auth?response_type=token&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
        window.location.href = authUrl;
    },

    getGoogleDriveFile: function( accessToken )
    {
        if ( !accessToken )
        {
            console.error( 'No access token provided' );
            return;
        }

        const fileId = '1arBumQH2vuhLv8lQZnBdTj-h64BmUdjt';
        const fileUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx`;

        this._request( {
            url: fileUrl,
            dataType: 'binary', // get ArrayBuffer
            success: function( response )
            {
                // response = ArrayBuffer

                const workbook = XLSX.read( response, { type: 'binary' } );
                console.log( 'Sheet names:', workbook.SheetNames );
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const file = XLSX.utils.sheet_to_json( sheet, { raw: false } );
                console.log( file );
            },
            error: function( err )
            {
                console.error( 'Download failed:', err );
            },
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        } );
    },

    openWooCommerceLogin( callback, compName )
    {
        compName = compName ?? this.compName;
        const compData = this.data[compName];

        const dialog = new LX.Dialog( compData.name + ' WooComerce Login', ( p ) => {
            let ck = localStorage.getItem( compName + '_wooc_ck' ) ?? '';
            let cs = localStorage.getItem( compName + '_wooc_cs' ) ?? '';
            let store = this.data[compName].store;
            let spinner = null;

            p.addText( 'URL Tienda', store, ( value, event ) => {}, { disabled: true, nameWidth: '30%', skipReset: true } );
            p.addText( 'Clave cliente', ck, ( value, event ) => {
                ck = value;
            }, { nameWidth: '30%', skipReset: true, type: 'password' } );
            p.addText( 'Clave secreta', cs, ( value, event ) => {
                cs = value;
            }, { nameWidth: '30%', skipReset: true, type: 'password' } );
            const loginButton = p.addButton( null, 'Login', async ( value, event ) => {
                spinner = LX.makeIcon( 'LoaderCircle', { iconClass: 'flex', svgClass: 'md animate-spin' } );
                loginButton.root.querySelector( 'button' ).prepend( spinner );
                const r = await this.configureWooCommerce( compName, store, ck, cs );
                if ( r.ok )
                {
                    dialog.close();

                    if ( callback )
                    {
                        callback();
                    }
                }
                else
                {
                    spinner.remove();
                    LX.emit( '@login_errors', '❌ Credenciales no válidas' );
                }
            }, { buttonClass: 'flex flex-row justify-center gap-2', skipReset: true } );
            p.addSeparator();
            p.addTextArea( null, '', null, { disabled: true, fitHeight: true, signal: '@login_errors' } );
        }, { modal: true, position: [ 'calc(50% - 200px)', '250px' ], size: [ '400px', null ], closable: true, draggable: false } );
    },

    async configureWooCommerce( compName, store, ck, cs )
    {
        const wcc = this.data[compName].wcc;
        const r = await wcc.configure( store, ck, cs );
        if ( r.ok )
        {
            LX.toast( 'Hecho!', `✅ Has iniciado sesión en ${store}`, { timeout: 5000, position: 'top-center' } );

            // Store in localStorage
            localStorage.setItem( compName + '_wooc_ck', ck );
            localStorage.setItem( compName + '_wooc_cs', cs );
        }

        return r;
    },

    makeLoadingDialog( title )
    {
        return new LX.Dialog( title ?? 'Acción en curso, espere...', ( p ) => {
            let spinner = LX.makeIcon( 'LoaderCircle', { iconClass: 'flex p-2', svgClass: 'xxl animate-spin' } );
            p.attach( spinner );
        }, { modal: true, position: [ 'calc(50% - 150px)', '250px' ], size: [ '300px', null ], closable: false, draggable: false } );
    },

    _request: function( request )
    {
        var dataType = request.dataType || 'text';
        if ( dataType == 'json' )
        { // parse it locally
            dataType = 'text';
        }
        else if ( dataType == 'xml' )
        { // parse it locally
            dataType = 'text';
        }
        else if ( dataType == 'binary' )
        {
            // request.mimeType = "text/plain; charset=x-user-defined";
            dataType = 'arraybuffer';
            request.mimeType = 'application/octet-stream';
        }

        // regular case, use AJAX call
        var xhr = new XMLHttpRequest();
        xhr.open( request.data ? 'POST' : 'GET', request.url, true );
        if ( dataType )
        {
            xhr.responseType = dataType;
        }
        if ( request.mimeType )
        {
            xhr.overrideMimeType( request.mimeType );
        }
        if ( request.nocache )
        {
            xhr.setRequestHeader( 'Cache-Control', 'no-cache' );
        }
        if ( request.headers )
        {
            for ( var i in request.headers )
            {
                xhr.setRequestHeader( i, request.headers[i] );
            }
        }

        xhr.onload = function( load )
        {
            var response = this.response;
            if ( this.status != 200 )
            {
                var err = 'Error ' + this.status;
                if ( request.error )
                {
                    request.error( err );
                }
                return;
            }

            if ( request.dataType == 'json' )
            { // chrome doesnt support json format
                try
                {
                    response = JSON.parse( response );
                }
                catch ( err )
                {
                    if ( request.error )
                    {
                        request.error( err );
                    }
                    else
                    {
                        throw err;
                    }
                }
            }
            else if ( request.dataType == 'xml' )
            {
                try
                {
                    var xmlparser = new DOMParser();
                    response = xmlparser.parseFromString( response, 'text/xml' );
                }
                catch ( err )
                {
                    if ( request.error )
                    {
                        request.error( err );
                    }
                    else
                    {
                        throw err;
                    }
                }
            }
            if ( request.success )
            {
                request.success.call( this, response, this );
            }
        };
        xhr.onerror = function( err )
        {
            if ( request.error )
            {
                request.error( err );
            }
        };

        var data = new FormData();
        if ( request.data )
        {
            for ( var i in request.data )
            {
                data.append( i, request.data[i] );
            }
        }

        xhr.send( data );
        return xhr;
    }
};

// Message templates

core.data['jowy'].template = ( id, url, transport ) => {
    return `<p><strong>Tu pedido ha sido enviado a trav&eacute;s de ${transport ?? core.transport}:</strong></p>
<ul>
<li><strong>N&ordm; de env&iacute;o:</strong> ${id}</li>
</ul>
<p style="word-break: break-word;text-decoration: none; border-radius: 12px; font-size: 16px; font-family: Helvetica,Arial,sans-serif; padding: 12px; max-width: 300px; background-color: #e94343; text-align: center; display: flex; flex-direction: column; letter-spacing: -0.05rem;">
<a href="${url}" style="background: none;text-decoration: none;color: #e0e0e0ff;"><strong>HAZ CLIC AQUÍ PARA SEGUIR TU PEDIDO</strong></a>
<a style="border-bottom:1px solid #736060; margin-block: 0.5rem;"></a>
<a href="https://www.jowyoriginals.com/" style="background: none;text-decoration: none;color: #d8c1c1ff;">jowyoriginals.com</a>
</p>`;
};

core.data['hxg'].template = ( id, url, transport ) => {
    return `<p><strong>Tu pedido ha sido enviado a trav&eacute;s de ${transport ?? core.transport}:</strong></p>
<ul>
<li><strong>N&ordm; de env&iacute;o:</strong> ${id}</li>
</ul>
<p style="word-break: break-word;text-decoration: none; border-radius: 24px; font-size: 16px; font-family: Helvetica,Arial,sans-serif; padding: 12px; max-width: 300px; background-color: #FFC844; text-align: center; display: flex; flex-direction: column; letter-spacing: -0.05rem;">
<a href="${url}" style="background: none;text-decoration: none;color: #222;"><strong>HAZ CLIC AQUÍ PARA SEGUIR TU PEDIDO</strong></a>
<a style="border-bottom:1px solid #927124; margin-block: 0.5rem;"></a>
<a href="https://homexgym.com/" style="background: none;text-decoration: none;color: #927124;">homexgym.com</a>
</p>`;
};

core.data['bathby'].template = ( id, url, transport ) => {
    return `<p><strong>Tu pedido ha sido enviado a trav&eacute;s de ${transport ?? core.transport}:</strong></p>
<ul>
<li><strong>N&ordm; de env&iacute;o:</strong> ${id}</li>
</ul>
<p style="word-break: break-word;text-decoration: none; border-radius: 24px; font-size: 16px; font-family: Helvetica,Arial,sans-serif; padding: 12px; max-width: 300px; background-color: #e7c5d2ff; text-align: center; display: flex; flex-direction: column; letter-spacing: -0.05rem;">
<a href="${url}" style="background: none;text-decoration: none;color: #222;"><strong>HAZ CLIC AQUÍ PARA SEGUIR TU PEDIDO</strong></a>
<a style="border-bottom:1px solid #736060; margin-block: 0.5rem;"></a>
<a href="https://bathby.com/" style="background: none;text-decoration: none;color: #83596bff;">bathby.com</a>
</p>`;
};

// Create common UI
{
    const parallax = LX.makeElement( 'div', 'parallax-bg', '', document.body );

    const area = await LX.init( { layoutMode: 'document', rootClass: 'wrapper' } );
    const starterTheme = LX.getTheme();

    const menubar = area.addMenubar( [
        { name: 'Seguimiento', callback: ( v, e ) => core.openApp( core.cblTrackingApp, v ) },
        {
            name: 'Seur',
            callback: ( v, e ) => core.openApp( core.seurApp )
            // submenu: [
            //     { name: 'Shein', callback: ( v, e ) => core.openApp( core.seurApp, v ), icon: 'Strikethrough' },
            //     { name: 'Decathlon', callback: ( v, e ) => core.openApp( core.seurApp, v ),
            //         icon: 'Volleyball' }
            // ]
        },
        { name: 'Pedidos Web', callback: ( v, e ) => core.openApp( core.ordersApp, v ) },
        {
            name: 'Calculadoras',
            submenu: [
                { name: 'Transporte', callback: ( v, e ) => core.openApp( core.transportCalculatorApp, v ), icon: 'Truck' },
                { name: 'Stock', disabled: true, callback: core.redirectToOAuth.bind( core ), icon: 'Boxes' }
            ]
        },
        { name: "Chill", callback: ( v, e ) => core.openApp( core.chillApp ) }
        // { name: "Calculadora", callback: core.redirectToOAuth.bind( core ) }
    ] );

    const separator = LX.makeContainer( [ '1px', '100%' ], 'content-center ml-4 mr-2', '' );
    LX.makeContainer( [ 'auto', '1.25rem' ], 'bg-quaternary', '', separator );
    menubar.root.insertChildAtIndex( separator, 0 );

    menubar.setButtonImage( 'bathby', `data/bathby_${starterTheme}.png`, () => {
        window.open( 'https://bathby.com/wp-admin/' );
    }, { float: 'left' } );
    menubar.setButtonImage( 'hxg', `data/hxg_${starterTheme}.png`, () => {
        window.open( 'https://homexgym.com/wp-admin/' );
    }, { float: 'left' } );
    menubar.setButtonImage( 'jowy', `data/jowy_${starterTheme}.png`, () => {
        window.open( 'https://www.jowyoriginals.com/wp-admin/' );
    }, { float: 'left' } );

    menubar.addButtons( [
        {
            title: 'Switch Theme',
            icon: starterTheme == 'dark' ? 'Moon' : 'Sun',
            swap: starterTheme == 'dark' ? 'Sun' : 'Moon',
            callback: ( value, event ) => {
                LX.switchTheme();
                const newTheme = LX.getTheme();
                menubar.setButtonImage( 'bathby', `data/bathby_${newTheme}.png` );
                menubar.setButtonImage( 'hxg', `data/hxg_${newTheme}.png` );
                menubar.setButtonImage( 'jowy', `data/jowy_${newTheme}.png` );
                core.header.style.background = `url('data/banner_${newTheme}.png') no-repeat center center / cover`;
            }
        }
    ], { float: 'center' } );

    core.init( menubar.siblingArea );
}

window.core = core;
