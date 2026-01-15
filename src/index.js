import { LX } from 'lexgui';
import { CblTrackingApp } from './apps/cbl_tracking_app.js';
import { ChillApp } from './apps/chill_app.js';
import { LabelsApp } from './apps/mirakl_apps.js';
import { OrdersApp } from './apps/orders_app.js';
import { SheinApp } from './apps/shein_app.js';
import { TikTokApp } from './apps/tiktok_app.js';
import { TransportCalculatorApp } from './apps/trans_calculator.js';
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

const REFERENCE_MAPPING = {
    "BY-FBT05GN": "BY-FBT05V",
    "BY-FBT02GN": "BY-FBT02V",
    "BY-FBT03GN": "BY-FBT03V",
    "BY-FBT04GN": "BY-FBT04V",
    "FM01": "BY-FM01",
    "FM02": "BY-FM02",
    "FM03": "BY-FM03",
    "HG-AT20G1": "JW-AT20G1",
    "HG-AT20G2": "JW-AT20G2",
    "HG-AT30G1": "JW-AT30G1",
    "HG-AT30G2": "JW-AT30G2",
    "HG-AT40G1": "JW-AT40G1",
    "HG-AT40G2": "JW-AT40G2"
};

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
        'Pendiente de pago': { icon: 'HandCoins', bg: '#2560da', fg: '#e5e5e5' },
        'Procesando': { icon: 'Loader', bg: '#272c31', fg: '#e5e5e5' },
        'En espera': { icon: 'Clock3', bg: '#ca8a04', fg: '#e5e5e5' },
        'Enviado': { icon: 'PlaneTakeoff', bg: '#d5d5d5', fg: '#222' },
        'Completado': { icon: 'CheckCircle', bg: '#218118', fg: '#e5e5e5' },
        'Cancelado': { icon: 'Ban', bg: '#dc2626', fg: '#e5e5e5' },
        'Reembolsado': { icon: 'CircleDollarSign', bg: '#a21caf', fg: '#e5e5e5' },
        'Fallido': { icon: 'CircleX', bg: '#dc2626', fg: '#e5e5e5' },
        'Borrador': { icon: 'FileText', bg: '#0c8377', fg: '#e5e5e5' },
        '1a Reseña': { icon: 'Star', bg: '#FFC844', fg: '#222' }
    },
    trackStatusColors: {
        'Documentada': { icon: 'File', bg: '#272c31', fg: '#e5e5e5' },
        'Entregada': { icon: 'CircleCheck', bg: '#218118', fg: '#e5e5e5' },
        'Incidencia': { icon: 'CircleAlert', bg: '#dc2626', fg: '#e5e5e5' },
        'En reparto': { icon: 'Truck', bg: '#0c8377', fg: '#e5e5e5' },
        'En destino': { icon: 'Warehouse', bg: '#2560da', fg: '#e5e5e5' },
        'En tránsito': { icon: 'Package', bg: '#a21caf', fg: '#e5e5e5' },
        'En gestión': { icon: 'TriangleAlert', bg: '#ca8a04', fg: '#e5e5e5' },
        'Devuelta': { icon: 'Frown', bg: '#dc2626', fg: '#e5e5e5' },
        'Falta': { icon: 'CircleQuestionMark', bg: '#dc2626', fg: '#e5e5e5' },
    },
    data: {
        'otros': { list: [], dom: null },
        'decathlon': new Company( 'Decathlon', 'https://marketplace-decathlon-eu.mirakl.net/', 'https://jowy-originals.alexroco-30.workers.dev' ),// cf worker
        'carrefour': new Company( 'Carrefour', '........', 'https://jowy-originals.alexroco-30.workers.dev' ),// cf worker
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
        this.sheinApp = new SheinApp( this );
        this.tikTokApp = new TikTokApp( this );
        this.ordersApp = new OrdersApp( this );
        this.transportCalculatorApp = new TransportCalculatorApp( this );
        this.chillApp = new ChillApp( this );
        this.decathlonApp = new LabelsApp( this, "Decathlon" );
        this.carrefourApp = new LabelsApp( this, "Carrefour" );

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
            else if ( lastTool.includes( 'shein' ) )
            {
                this.openApp( this.sheinApp );
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
            // else if ( lastTool.includes( 'decathlon' ) )
            // {
            //     this.openApp( this.decathlonApp );
            // }
            // else if ( lastTool.includes( 'carrefour' ) )
            // {
            //     this.openApp( this.carrefourApp );
            // }
            // else if ( lastTool.includes( 'tiktok' ) )
            // {
            //     this.openApp( this.tikTokApp );
            // }
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
        const header = LX.makeContainer( [ null, 'auto' ], 'flex flex-col border-top border-bottom gap-2 px-8 py-8', `
            <div class="flex flex-row gap-2 items-center">${
            LX.makeIcon( 'Info', { svgClass: '2xl  scale-350 p-2' } ).innerHTML
        }<span class="text-3xl font-semibold">Jowy Originals</span></div>
            <p class="font-light" style="max-width:32rem">Elige una de las herramientas para empezar.</p>
        `, this.area );
        header.style.background = `url('data/banner_${LX.getMode()}.png') no-repeat center center / cover`;
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
                // else if ( file.name.endsWith( '.csv' ) )
                // {
                //     const reader = new FileReader();
                //     reader.onload = function( e )
                //     {
                //         const data = e.target.result.split( '\n' );
                //         const colData = data[0].split( ';' );
                //         const sheetData = [];

                //         for ( const l of data.slice( 1 ) )
                //         {
                //             if ( !l || !l.length )
                //             {
                //                 continue;
                //             }

                //             const json = {};

                //             const rowData = l.split( ';' );

                //             colData.forEach( ( v, i ) => {
                //                 json[v] = rowData[i];
                //             } );

                //             sheetData.push( json );
                //         }

                //         if ( core.processData( sheetData ) )
                //         {
                //             LX.toast( 'Hecho!', `✅ Datos cargados: ${file.name}`, { timeout: 5000, position: 'top-center' } );
                //         }
                //     };

                //     // Read the data as binary
                //     reader.readAsText( file );
                // }
                else
                {
                    alert( 'Please drop a valid .xlsx file.' );
                }
            }
        } );

        this.header = header;
    },

    setHeaderTitle: function( title, subtitle, icon )
    {
        this.header.querySelector( 'div' ).innerHTML = `${
            LX.makeIcon( icon ?? 'Info', { svgClass: '2xl mr-2 scale-350 p-2' } ).innerHTML
        }<span class="text-3xl font-semibold">${title}</span>`;
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
        if ( this.currentApp )
        {
            this.currentApp.close();
        }

        this.cblTrackingApp.area.root.classList.toggle( 'hidden', true );
        this.sheinApp.area.root.classList.toggle( 'hidden', true );
        this.ordersApp.area.root.classList.toggle( 'hidden', true );
        this.transportCalculatorApp.area.root.classList.toggle( 'hidden', true );
        this.chillApp.area.root.classList.toggle( 'hidden', true );
        this.decathlonApp.area.root.classList.toggle( 'hidden', true );
        this.carrefourApp.area.root.classList.toggle( 'hidden', true );
        this.tikTokApp.area.root.classList.toggle( 'hidden', true );

        app.open( params );

        localStorage.setItem( 'lastTool', this.tool );

        this.currentApp = app;
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
        else if ( this.tool == 'shein' )
        {
            this.sheinApp.openData( fileData );
        }
        else if ( this.tool == 'tiktok' )
        {
            this.tikTokApp.openData( fileData );
        }

        if ( err !== null )
        {
            LX.toast( 'Aviso', `⚠️ ${err}`, { position: 'top-center' } );
        }

        return true;
    },

    getTransportForItem( sku, quantity )
    {
        if (
            ( sku.startsWith( 'JW-DF20' ) && quantity > 3 ) ||
            ( sku.startsWith( 'JW-DT20' ) && quantity > 3 ) ||
            ( sku.startsWith( 'JW-DF25' ) && quantity > 2 ) ||
            ( sku.startsWith( 'JW-DT25' ) && quantity > 2 ) ||
            ( sku.startsWith( 'JW-DS25' ) && quantity > 2 ) ||
            ( sku.startsWith( 'JW-DF3' ) && quantity > 1 ) ||
            ( sku.startsWith( 'JW-DF4' ) && quantity > 1 ) ||
            ( sku.startsWith( 'JW-DT4' ) && quantity > 1 ) ||
            [ 'HG-AD24', 'HG-AD32', 'HG-AD40', 'HG-BPB02', 'HG-CD225', 'HG-CD250', 'HG-CD275', 'HG-CD300' ].includes( sku )
        ) return 'CBL';
        return 'SEUR';
    },

    getFinalSku( sku )
    {
        return REFERENCE_MAPPING[sku] ?? sku;
    },

    getIndividualQuantityPerPack( sku, quantity )
    {
        if ( sku.startsWith( 'JW-T60' ) )
        {
            return quantity * 4;
        }

        if ([ 'HG-CD020', 'HG-CD040', 'HG-CD050', 'HG-CD060', 'HG-CD080', 'HG-CD100' ].includes( sku ))
        {
            return quantity * 2;
        }

        return quantity;
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
        this.sheinApp.clear();
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
                    LX.emitSignal( '@login_errors', '❌ Credenciales no válidas' );
                }
            }, { buttonClass: 'primary flex flex-row justify-center gap-2', skipReset: true } );
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
            let spinner = LX.makeIcon( 'LoaderCircle', { iconClass: 'flex p-2', svgClass: '2xl animate-spin' } );
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
    const starterMode = LX.getMode();

    LX.setThemeColor( 'teal' );

    LX.registerIcon( 'TikTok', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M16.6 5.82s.51.5 0 0A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6c0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64c0 3.33 2.76 5.7 5.69 5.7c3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88-.09-3 .8"></path></svg>' );
    LX.registerIcon( 'Decathlon', `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><path fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M8.68 20.946c-4.68 5.509-2.254 16.552 5.334 12.2c1.887-.978 6.31-5.03 14.76-17.551v20.761c-2.421 1.654-16.97 8.473-22.928 1.003c-2.492-3.4-2.492-7.986.186-12.455H6.03q4.005-7.215 12.408-12.36C36.408 1.792 43.6 9.87 43.95 14.5c.72 8.497-6.495 14.875-10.289 18.577v-6.333c9.195-9.054 4.795-14.035 3.794-14.85c-2.047-2.37-7.865-4.53-13.13-2.392" stroke-width="1" /></svg>` );
    LX.registerIcon( 'WooCommerce', `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><path fill="currentColor" d=" M108.6 46.9 c-2.3-.2-6.7 1-8.7 10.8 c0 5.9 1.4 9.5 3.6 10.8 c4.1 1.2 8.9-4.3 8.9-10.2 c.2-4.1.4-9.2-3.8-11.4 M116.3 25.8 H11.7 C5.2 25.8 0 31 0 37.4 v40 c0 6.4 5.2 11.7 11.7 11.7 h104.7 c6.4 0 11.7-5.2 11.7-11.7 v-40 c-.1-6.4-5.3-11.6-11.8-11.6 M44 80 s-6.9-9.1-8.5-16 c-1.6-6.8-2-3.7-2-3.7 S28 72.7 22.3 80.6 s-8.5-3.9-8.5-3.9 c-2-2.4-7.7-37.3-7.7-37.3 c3.2-8.9 8.7-1.6 8.7-1.6 l5.5 28.4 s8.5-17.4 11.4-21.9 c2.8-4.5 7.7-3.2 8.1 1.4 c.4 4.7 5.1 17.4 5.1 17.4 c.4-13.4 5.9-26.2 6.7-28.2 s9.7-4.5 8.1 4.1 C55.8 48.5 52 68.6 53 79.6 c-2.7 8.3-9 .4-9 .4 M79.9 75.5 c-2.6 1.2-12.3 7.9-19.2-7.1 C56.4 53.3 66 42.2 66 42.2 s12.5-10.7 21 3.5 c6.9 15.6-4.5 28.6-7.1 29.8 M111.7 75.5 c-2.6 1.2-12.3 7.9-19.2-7.1 c-4.3-15.1 5.3-26.2 5.3-26.2 s12.6-10.8 21.1 3.4 c6.9 15.7-4.6 28.7-7.2 29.9 M76.7 46.9 c-2.3-.2-6.7 1-8.7 10.8 c0 5.9 1.4 9.5 3.6 10.8 c4.1 1.2 8.9-4.3 8.9-10.2 c.3-4.1.5-9.2-3.8-11.4 M61.3 89.1 l22.3 13.1 l-4.7-13.1 l-12.8-3.6 z "/></svg>` );
    LX.registerIcon( 'Carrefour', `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12.14 4.045c-2.569 0-3.572 3.64-3.572 7.979s1.003 7.931 3.572 7.931c1.541 0 2.855-.903 2.86-1.645a.63.63 0 0 0-.199-.453c-.73-.706-1.016-1.412-1.018-2.034c-.005-1.189 1.026-2.074 1.977-2.074c1.306 0 2.077 1.027 2.077 2.357c0 1.26-.537 2.31-1.121 3.15a.2.2 0 0 0-.034.107c0 .065.04.12.098.12q.053.001.122-.065l6.561-6.344c.328-.28.537-.608.537-1.073c0-.468-.21-.794-.537-1.073l-6.561-6.346q-.069-.066-.122-.064c-.059 0-.097.055-.098.12q-.001.054.034.107c.584.84 1.12 1.89 1.12 3.15c0 1.329-.77 2.356-2.076 2.356c-.95 0-1.982-.884-1.977-2.073c.002-.622.288-1.328 1.018-2.033A.62.62 0 0 0 15 5.69c-.004-.743-1.319-1.646-2.86-1.646m-5.043.537L.537 10.93C.209 11.207 0 11.534 0 12c0 .465.21.793.537 1.073l6.56 6.345c.042.043.083.06.117.06c.062 0 .105-.057.103-.123a.2.2 0 0 0-.057-.123C5.72 17.32 4.6 15.126 4.6 12.024c0-3.104 1.12-5.341 2.66-7.255a.2.2 0 0 0 .057-.123c.002-.068-.04-.123-.103-.123c-.034 0-.075.017-.117.06"/></svg>` );
    LX.registerIcon( 'Shein', `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 50 50"><path d="M36,4H14C8.486,4,4,8.486,4,14v22c0,5.514,4.486,10,10,10h22c5.514,0,10-4.486,10-10V14C46,8.486,41.514,4,36,4z M25,37.25	c-3.5,0-6.5-1.25-9-2.75l2.5-2.5c1.5,1,4.5,2,6.5,2c1,0,4.5-0.25,4.5-3.5c0-4.75-13-3.25-13-11C16.5,15,21,13,25,13s6,1,7.5,2.25	L30,17.5c-1.25-1-3.75-1.5-5-1.5c-1,0-4.5,0.5-4.5,3.5c0,4.25,13,4,13,11C33.5,35.75,28,37.25,25,37.25z"></path></svg>` );

    const menubar = area.addMenubar( [
        {
            name: 'Web',
            submenu: [
                { name: 'Seguimiento/Facturas', callback: ( v, e ) => core.openApp( core.cblTrackingApp, v ), icon: 'TextSearch' },
                { name: 'Pedidos', callback: ( v, e ) => core.openApp( core.ordersApp ), icon: 'WooCommerce' },
            ]
        },
        {
            name: 'Plataformas',
            submenu: [
                { name: 'Decathlon', disabled: true, callback: ( v, e ) => core.openApp( core.decathlonApp, v ), icon: 'Decathlon' },
                { name: 'Shein', callback: ( v, e ) => core.openApp( core.sheinApp ), icon: 'Shein' },
                { name: 'TikTok', disabled: true, callback: ( v, e ) => core.openApp( core.tikTokApp ), icon: 'TikTok' },
                { name: 'Carrefour', disabled: true, callback: ( v, e ) => core.openApp( core.carrefourApp, v ), icon: 'Carrefour' },
                
            ]
        },
        {
            name: 'Calculadoras',
            submenu: [
                { name: 'Transporte', callback: ( v, e ) => core.openApp( core.transportCalculatorApp, v ), icon: 'Truck' },
                { name: 'Stock', disabled: true, callback: core.redirectToOAuth.bind( core ), icon: 'Boxes' }
            ]
        },
        { name: 'Chill', callback: ( v, e ) => core.openApp( core.chillApp ) }
    ] );

    const separator = LX.makeContainer( [ '1px', '100%' ], 'content-center ml-4 mr-2', '' );
    LX.makeContainer( [ 'auto', '1.25rem' ], 'bg-muted', '', separator );
    LX.insertChildAtIndex( menubar.root, separator, 0 );

    menubar.setButtonImage( 'bathby', `data/bathby_${starterMode}.png`, () => {
        window.open( 'https://bathby.com/wp-admin/' );
    }, { float: 'left' } );
    menubar.setButtonImage( 'hxg', `data/hxg_${starterMode}.png`, () => {
        window.open( 'https://homexgym.com/wp-admin/' );
    }, { float: 'left' } );
    menubar.setButtonImage( 'jowy', `data/jowy_${starterMode}.png`, () => {
        window.open( 'https://www.jowyoriginals.com/wp-admin/' );
    }, { float: 'left' } );

    menubar.addButtons( [
        {
            title: 'Switch Theme',
            icon: starterMode == 'dark' ? 'Moon' : 'Sun',
            swap: starterMode == 'dark' ? 'Sun' : 'Moon',
            callback: ( value, event ) => {
                LX.switchMode();
                const newMode = LX.getMode();
                menubar.setButtonImage( 'bathby', `data/bathby_${newMode}.png` );
                menubar.setButtonImage( 'hxg', `data/hxg_${newMode}.png` );
                menubar.setButtonImage( 'jowy', `data/jowy_${newMode}.png` );
                core.header.style.background = `url('data/banner_${newMode}.png') no-repeat center center / cover`;
            }
        }
    ], { float: 'center' } );

    core.init( menubar.siblingArea );
}

window.core = core;
