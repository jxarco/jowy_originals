import { LX } from 'lexgui';
import { CblTrackingApp } from './apps/cbl_tracking_app.js';
import { ChillApp } from './apps/chill_app.js';
import { DecathlonApp } from './apps/decathlon_app.js';
import { DecathlonAPIApp } from './apps/decathlon_api_app.js';
import { ManualApp } from './apps/manual_app.js';
import { MiraviaApp } from './apps/miravia_app.js';
import { OrdersApp } from './apps/orders_app.js';
import { SheinApp } from './apps/shein_app.js';
import { TikTokApp } from './apps/tiktok_app.js';
import { MiraklTemplateApp } from './apps/mirakl_app.js';
import { TransportCalculatorApp } from './apps/trans_calculator.js';
import { SeurPackerApp } from './apps/seur_packer.js';
import { BillCalculatorApp } from './apps/bill_calculator.js';
import {
    ALWAYS_CBL,
    CBL_RULES,
    PLATFORM_CLIENT_CODES,
    PLATFORM_AGENT_CODES
} from './constants.js';
import { Data } from './data.js';
import * as Utils from './utils.js';
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
    apps: {},
    transport: 'CBL', // Default transport
    transportOptions: [ 'CBL', 'SEUR' ], // , "GLS"];
    sheetName: '',
    countryFormat: {
        'España': 'ESPAÑA',
        'Spain': 'ESPAÑA',
        'ES': 'ESPAÑA',
        'Portugal': 'PORTUGAL',
        'PT': 'PORTUGAL',
        'Italia': 'ITALIA',
        'Italy': 'ITALIA',
        'IT': 'ITALIA',
        'Francia': 'FRANCIA',
        'France': 'FRANCIA',
        'FR': 'FRANCIA'
    },
    countryIVA: {
        'ESPAÑA': 1.21,
        'PORTUGAL': 1.23,
        'FRANCIA': 1.2,
        'ITALIA': 1.22
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
        'Falta': { icon: 'CircleQuestionMark', bg: '#dc2626', fg: '#e5e5e5' }
    },
    data: {
        'otros': { list: [], dom: null },
        'decathlon': new Company( 'Decathlon', 'https://marketplace-decathlon-eu.mirakl.net/', 'https://jowy-originals.alexroco-30.workers.dev' ), // cf worker
        // 'carrefour': new Company( 'Carrefour', '........', 'https://jowy-originals.alexroco-30.workers.dev' ), // cf worker
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
        this.cblTrackingApp = new CblTrackingApp( this, 'tracking-messages' );
        this.ordersApp = new OrdersApp( this, 'orders' );
        this.sheinApp = new SheinApp( this, 'shein' );
        this.tikTokApp = new TikTokApp( this, 'tiktok' );
        this.miraviaApp = new MiraviaApp( this, 'miravia' );
        this.decathlonOnlineApp = new DecathlonAPIApp( this, 'Decathlon' );
        this.decathlonApp = new DecathlonApp( this, 'decathlon' );
        // Mirakl template apps
        this.wortenApp = new MiraklTemplateApp( this, 'worten', 'Worten' );
        this.carrefourApp = new MiraklTemplateApp( this, 'carrefour', 'Carrefour' );
        this.planetaHuertoApp = new MiraklTemplateApp( this, 'planeta-huerto', 'PlanetaHuerto', 'Globe' );
        this.leroyMerlinApp = new MiraklTemplateApp( this, 'leroy-merlin', 'LeroyMerlin' );
        this.sprinterApp = new MiraklTemplateApp( this, 'sprinter', 'Sprinter' );
        // .................
        this.transportCalculatorApp = new TransportCalculatorApp( this, 't-calc' );
        this.billCalculatorApp = new BillCalculatorApp( this, 'b-calc' );
        this.seurPackerApp = new SeurPackerApp( this, 'seur-packer' );
        this.manualApp = new ManualApp( this, 'manual' );
        this.chillApp = new ChillApp( this, 'chill' );

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
            this.openApp( this.apps[lastTool] );
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

    readExcelFile: function( file, raw = false )
    {
        return new Promise( ( resolve, reject ) => {
            const reader = new FileReader();
            reader.onload = ( e ) => {
                try
                {
                    const data = e.target.result;
                    const workbook = XLSX.read( data, { type: 'binary', WTF: true } );
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const rowsData = XLSX.utils.sheet_to_json( sheet, { raw } );

                    resolve( {
                        sheetName,
                        rowsData,
                        fileName: file.name
                    } );
                }
                catch ( err )
                {
                    reject( err );
                }
            };

            reader.onerror = () => reject( reader.error );
            reader.readAsArrayBuffer( file );
        } );
    },

    onLoadFile: async function( file, callback )
    {
        callback = callback ?? this.processData.bind( this );

        if ( file.name.endsWith( '.xlsx' ) || file.name.endsWith( '.xlsm' ) )
        {
            try
            {
                const result = await this.readExcelFile( file, this.currentApp.loadRaw );
                if ( callback )
                {
                    const r = callback( result.rowsData );
                    if ( r )
                    {
                        LX.toast( 'Hecho!', `✅ Datos cargados: ${result.fileName}`, { timeout: 5000, position: 'top-center' } );
                    }
                }
            }
            catch ( e )
            {
                LX.toast( 'Error', '❌ No se pudo leer el archivo: ' + e, { timeout: -1, position: 'top-center' } );
            }
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
    },

    createHeaderHtml: function()
    {
        const header = LX.makeContainer( [ null, 'auto' ], 'flex flex-col border-top border-bottom gap-2 px-8 py-8 cursor-pointer hover:brightness-110', `
            <div class="flex flex-row gap-2 items-center">${LX.makeIcon( 'Info', { svgClass: '2xl  scale-350 p-2' } ).innerHTML}<span class="text-3xl font-semibold">Jowy Originals</span></div>
            <p class="font-light max-w-1/2">Elige una de las herramientas para empezar.</p>
        `, this.area );
        header.style.background = `url('data/banner_${LX.getMode()}.png') no-repeat center center / cover`;
        header.style.transition = 'transform 0.1s ease-in';
        this.header = header;

        // add click to load events
        {
            const fileInput = document.createElement( 'input' );
            fileInput.type = 'file';
            fileInput.multiple = true;

            fileInput.addEventListener( 'change', async ( e ) => {
                const files = e.target.files;
                if ( !files.length ) return;
                const allDataRows = [];
                const innerCallback = ( d ) => allDataRows.push( ...d );
                for ( const file of files )
                {
                    await this.onLoadFile( file, innerCallback );
                }
                this.processData( allDataRows );
                fileInput.value = '';
            } );

            header.addEventListener( 'click', ( event ) => {
                event.preventDefault();
                event.stopPropagation();
                fileInput.click();
            } );
        }

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

        header.addEventListener( 'drop', async ( event ) => {
            event.preventDefault();
            event.stopPropagation();
            header.classList.remove( 'draggingover' );
            // Check if a file was dropped
            const files = event.dataTransfer.files;
            if ( !files.length ) return;

            const allDataRows = [];
            const innerCallback = ( d ) => allDataRows.push( ...d );
            for ( const file of files )
            {
                await this.onLoadFile( file, innerCallback );
            }
            this.processData( allDataRows );
        } );

        this.header = header;
    },

    setHeaderTitle: function( title, subtitle, icon )
    {
        this.header.querySelector( 'div' ).innerHTML = `${LX.makeIcon( icon ?? 'Info', { svgClass: '2xl mr-2 scale-350 p-2' } ).innerHTML}<span class="text-3xl font-semibold">${title}</span>`;
        this.header.querySelector( 'p' ).innerHTML = subtitle ?? '';
    },

    createFooterHtml: function()
    {
        this.footer = new LX.Footer( {
            className: 'border-top',
            parent: LX.root,
            credits: `(v1.1) ${new Date().getUTCFullYear()}. @jxarco x INOUT ORIENT ATTRACTION SL.`,
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

        for ( const key in this.apps )
        {
            this.apps[key].hide();
        }

        this.tool = app.open( params );

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
        else
        {
            this.currentApp.openData( fileData );
        }

        if ( err !== null )
        {
            LX.toast( 'Aviso', `⚠️ ${err}`, { position: 'top-center' } );
        }

        return true;
    },

    createXLSXSheet( data )
    {
        return XLSX.utils.aoa_to_sheet( data );
    },

    createXLSXWorkbook( sheets, sheetNames = [] )
    {
        const workbook = XLSX.utils.book_new();
        sheets.forEach( ( sheet, index ) => {
            XLSX.utils.book_append_sheet( workbook, sheet, sheetNames[index] );
        } );
        return workbook;
    },

    exportXLSXWorkbook( workbook, filename, ignoreErrors )
    {
        if ( !( workbook?.SheetNames.length ) )
        {
            LX.toast( 'Error', `❌ No se pudo exportar el archivo "${filename}". No existen datos.`, { timeout: -1, position: 'top-center' } );
            return;
        }

        XLSX.writeFile( workbook, filename );

        if ( !ignoreErrors )
        {
            LX.toast( 'Hecho!', `✅ Datos exportados correctamente: ${filename}`, { timeout: 5000, position: 'top-center' } );
        }
    },

    exportXLSXData( data, filename, ignoreErrors )
    {
        if ( !( data?.length ) )
        {
            LX.toast( 'Error', `❌ No se pudo exportar el archivo "${filename}". No existen datos.`, { timeout: -1, position: 'top-center' } );
            return;
        }

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet( data );
        XLSX.utils.book_append_sheet( workbook, worksheet, this.sheetName ?? 'Sheet1' );
        XLSX.writeFile( workbook, filename );

        if ( !ignoreErrors )
        {
            LX.toast( 'Hecho!', `✅ Datos exportados correctamente: ${filename}`, { timeout: 5000, position: 'top-center' } );
        }
    },

    dataToXLSXBuffer( data )
    {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet( data );
        XLSX.utils.book_append_sheet( wb, ws, 'Sheet1' );
        return XLSX.write( wb, { bookType: 'xlsx', type: 'array' } );
    },

    async zipWorkbooks( structure )
    {
        const zip = new JSZip();

        for ( const folderPath in structure )
        {
            const folder = zip.folder( folderPath );

            for ( const file of structure[folderPath] )
            {
                const buffer = this.dataToXLSXBuffer( file.data );
                folder.file( file.filename, buffer );
            }
        }

        return await zip.generateAsync( { type: 'blob' } );
    },

    getTransportForItem( sku, quantity )
    {
        sku = this.mapSku( sku ).sku; // .sku bc it also contains quantity (for packs)

        if ( ALWAYS_CBL.includes( sku ) )
        {
            return 'CBL';
        }

        for ( const rule of CBL_RULES )
        {
            if ( sku.startsWith( rule.prefix ) && quantity > rule.max )
            {
                return 'CBL';
            }
        }

        return 'SEUR';
    },

    mapSku( sku )
    {
        const mapData = Data.sku_map[sku];
        const skus = mapData?.skus;

        // don't change by now if combined skus
        if ( !skus || skus.length > 1 ) return { sku, quantity: mapData?.quantity ?? 1 };

        // console.warn( `SKU mapped from ${sku} to ${skus[ 0 ]}` );
        return { sku: skus[0], quantity: mapData?.quantity ?? 1 };
    },

    mapCountry( country )
    {
        return this.countryFormat[country] ?? country;
    },

    mapZipCode( zc )
    {
        return zc.replaceAll( /[ -]/g, '' );
    },

    getIndividualSkusPerPack( sku )
    {
        const d = Data.sku_map[sku];
        const skus = d?.skus;
        if ( !skus ) return [ { sku, price: 1 } ];

        return d.skus.map( ( v, i ) => {
            return { sku: v, price: d.prices[i] };
        } );
    },

    openPrompt( label, title, callback, icon )
    {
        const dialog = new LX.Dialog( title, ( p ) => {
            const formData = {
                data: { label, value: '', icon }
            };
            const form = p.addForm( null, formData, async ( value ) => {
                form.syncInputs();
                if ( callback ) callback( value.data );
                dialog.destroy();
            }, { primaryActionName: 'Continuar', secondaryButtonClass: 'destructive', secondaryActionName: 'Cancelar', secondaryActionCallback: () => {
                dialog.destroy();
            } } );
        }, { modal: true } );
    },

    getClientCode( platform, country, year )
    {
        const id = [ platform, country, year ].join( '_' );
        return PLATFORM_CLIENT_CODES[id] ?? -1;
    },

    getAgentCode( platform, year )
    {
        // const id = [ platform, year ].join( '_' );
        const id = platform;
        return PLATFORM_AGENT_CODES[id] ?? -1;
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

        this.data['otros'].list = [];
        this.data['jowy'].list = [];
        this.data['hxg'].list = [];
        this.data['bathby'].list = [];

        this.currentApp.clear();
    },

    redirectToOAuth: function()
    {
        // For now is read only
        const clientId = '851633355284-ecd2lk1f1v771sv18rkmrjvvup6752iq.apps.googleusercontent.com';
        const redirectUri = encodeURIComponent( window.location.origin + window.location.pathname );
        const scope = encodeURIComponent( 'https://www.googleapis.com/auth/drive.readonly' );
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=token&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
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

        Utils.request( {
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
                spinner = new LX.Spinner();
                loginButton.root.querySelector( 'button' ).prepend( spinner.root );
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
                    spinner.destroy();
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

    createDropZone( area, callback, string )
    {
        const dropZone = LX.makeContainer( [ null, 'auto' ], 'flex flex-col items-center rounded-xl text-center border-color gap-4 px-12 py-12 cursor-pointer', `
            <div class="flex flex-row gap-2 items-center">
                ${LX.makeIcon( 'FileChartColumn', { svgClass: '2xl mr-2 scale-350 p-2' } ).innerHTML}
            </div>
            <p class="font-light max-w-1/2">Arrastra un .xlsx o haz click aquí para cargar ${string}.</p>
        `, area );
        dropZone.style.transition = 'transform 0.1s ease-in';

        // add click to load events
        {
            const fileInput = document.createElement( 'input' );
            fileInput.type = 'file';
            fileInput.multiple = true;

            fileInput.addEventListener( 'change', async ( e ) => {
                const files = e.target.files;
                if ( !files.length ) return;
                const allDataRows = [];
                const innerCallback = ( d ) => allDataRows.push( ...d );
                for ( const file of files )
                {
                    await this.onLoadFile( file, innerCallback );
                }
                if ( callback ) callback( allDataRows );
                fileInput.value = '';
            } );

            dropZone.addEventListener( 'click', ( event ) => {
                event.preventDefault();
                event.stopPropagation();
                fileInput.click();
            } );
        }

        // add file drag and drop event to dropZone
        dropZone.addEventListener( 'dragover', ( event ) => {
            event.preventDefault();
            event.stopPropagation();
            dropZone.classList.add( 'draggingover' );
        } );

        dropZone.addEventListener( 'dragleave', ( event ) => {
            event.preventDefault();
            event.stopPropagation();
            dropZone.classList.remove( 'draggingover' );
        } );

        dropZone.addEventListener( 'drop', async ( event ) => {
            event.preventDefault();
            event.stopPropagation();
            dropZone.classList.remove( 'draggingover' );
            // Check if a file was dropped
            const files = event.dataTransfer.files;
            if ( !files.length ) return;

            const allDataRows = [];
            const innerCallback = ( d ) => allDataRows.push( ...d );
            for ( const file of files )
            {
                await this.onLoadFile( file, innerCallback );
            }
            if ( callback ) callback( allDataRows );
        } );

        return dropZone;
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

    LX.registerIcon( 'TikTok',
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M16.6 5.82s.51.5 0 0A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6c0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64c0 3.33 2.76 5.7 5.69 5.7c3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88-.09-3 .8"></path></svg>' );
    LX.registerIcon( 'Decathlon',
        `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><path fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M8.68 20.946c-4.68 5.509-2.254 16.552 5.334 12.2c1.887-.978 6.31-5.03 14.76-17.551v20.761c-2.421 1.654-16.97 8.473-22.928 1.003c-2.492-3.4-2.492-7.986.186-12.455H6.03q4.005-7.215 12.408-12.36C36.408 1.792 43.6 9.87 43.95 14.5c.72 8.497-6.495 14.875-10.289 18.577v-6.333c9.195-9.054 4.795-14.035 3.794-14.85c-2.047-2.37-7.865-4.53-13.13-2.392" stroke-width="1" /></svg>` );
    LX.registerIcon( 'WooCommerce',
        `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><path fill="currentColor" d=" M108.6 46.9 c-2.3-.2-6.7 1-8.7 10.8 c0 5.9 1.4 9.5 3.6 10.8 c4.1 1.2 8.9-4.3 8.9-10.2 c.2-4.1.4-9.2-3.8-11.4 M116.3 25.8 H11.7 C5.2 25.8 0 31 0 37.4 v40 c0 6.4 5.2 11.7 11.7 11.7 h104.7 c6.4 0 11.7-5.2 11.7-11.7 v-40 c-.1-6.4-5.3-11.6-11.8-11.6 M44 80 s-6.9-9.1-8.5-16 c-1.6-6.8-2-3.7-2-3.7 S28 72.7 22.3 80.6 s-8.5-3.9-8.5-3.9 c-2-2.4-7.7-37.3-7.7-37.3 c3.2-8.9 8.7-1.6 8.7-1.6 l5.5 28.4 s8.5-17.4 11.4-21.9 c2.8-4.5 7.7-3.2 8.1 1.4 c.4 4.7 5.1 17.4 5.1 17.4 c.4-13.4 5.9-26.2 6.7-28.2 s9.7-4.5 8.1 4.1 C55.8 48.5 52 68.6 53 79.6 c-2.7 8.3-9 .4-9 .4 M79.9 75.5 c-2.6 1.2-12.3 7.9-19.2-7.1 C56.4 53.3 66 42.2 66 42.2 s12.5-10.7 21 3.5 c6.9 15.6-4.5 28.6-7.1 29.8 M111.7 75.5 c-2.6 1.2-12.3 7.9-19.2-7.1 c-4.3-15.1 5.3-26.2 5.3-26.2 s12.6-10.8 21.1 3.4 c6.9 15.7-4.6 28.7-7.2 29.9 M76.7 46.9 c-2.3-.2-6.7 1-8.7 10.8 c0 5.9 1.4 9.5 3.6 10.8 c4.1 1.2 8.9-4.3 8.9-10.2 c.3-4.1.5-9.2-3.8-11.4 M61.3 89.1 l22.3 13.1 l-4.7-13.1 l-12.8-3.6 z "/></svg>` );
    LX.registerIcon( 'Carrefour',
        `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12.14 4.045c-2.569 0-3.572 3.64-3.572 7.979s1.003 7.931 3.572 7.931c1.541 0 2.855-.903 2.86-1.645a.63.63 0 0 0-.199-.453c-.73-.706-1.016-1.412-1.018-2.034c-.005-1.189 1.026-2.074 1.977-2.074c1.306 0 2.077 1.027 2.077 2.357c0 1.26-.537 2.31-1.121 3.15a.2.2 0 0 0-.034.107c0 .065.04.12.098.12q.053.001.122-.065l6.561-6.344c.328-.28.537-.608.537-1.073c0-.468-.21-.794-.537-1.073l-6.561-6.346q-.069-.066-.122-.064c-.059 0-.097.055-.098.12q-.001.054.034.107c.584.84 1.12 1.89 1.12 3.15c0 1.329-.77 2.356-2.076 2.356c-.95 0-1.982-.884-1.977-2.073c.002-.622.288-1.328 1.018-2.033A.62.62 0 0 0 15 5.69c-.004-.743-1.319-1.646-2.86-1.646m-5.043.537L.537 10.93C.209 11.207 0 11.534 0 12c0 .465.21.793.537 1.073l6.56 6.345c.042.043.083.06.117.06c.062 0 .105-.057.103-.123a.2.2 0 0 0-.057-.123C5.72 17.32 4.6 15.126 4.6 12.024c0-3.104 1.12-5.341 2.66-7.255a.2.2 0 0 0 .057-.123c.002-.068-.04-.123-.103-.123c-.034 0-.075.017-.117.06"/></svg>` );
    LX.registerIcon( 'Shein',
        `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 50 50"><path d="M36,4H14C8.486,4,4,8.486,4,14v22c0,5.514,4.486,10,10,10h22c5.514,0,10-4.486,10-10V14C46,8.486,41.514,4,36,4z M25,37.25	c-3.5,0-6.5-1.25-9-2.75l2.5-2.5c1.5,1,4.5,2,6.5,2c1,0,4.5-0.25,4.5-3.5c0-4.75-13-3.25-13-11C16.5,15,21,13,25,13s6,1,7.5,2.25	L30,17.5c-1.25-1-3.75-1.5-5-1.5c-1,0-4.5,0.5-4.5,3.5c0,4.25,13,4,13,11C33.5,35.75,28,37.25,25,37.25z"></path></svg>` );
    LX.registerIcon( 'Worten',
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 120"><path d="M20 20 L50 100 L70 50 L90 100 L120 20" fill="none" stroke="#000" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/></svg>` );
    LX.registerIcon( 'Sprinter',
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><path fill="currentColor" d="M85 35 C85 18, 70 10, 55 10 C38 10, 25 18, 25 32 C25 45, 35 50, 55 55 C75 60, 95 65, 95 85 C95 100, 75 110, 55 110 C35 110, 20 100, 20 85 L40 85 C40 92, 47 95, 55 95 C65 95, 75 90, 75 83 C75 75, 65 72, 50 68 C30 63, 20 55, 20 38 C20 20, 35 10, 55 10 C75 10, 95 20, 95 35 Z" /></svg>` );
    LX.registerIcon( 'LeroyMerlin',
        `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path stroke-width="0.15" stroke="currentColor" d="M10.407 7.419c-.17-.164-.329-.323-.478-.468q1.062-1.083 2.116-2.166c.239.234.468.453.687.683c.02.02.01.084-.01.119q-.33.65-.657 1.3c-.02.04-.04.074-.07.139l.134-.055c.449-.204.902-.403 1.35-.612c.074-.035.12-.035.184.03c.2.199.403.393.583.567c-.722.742-1.434 1.464-2.136 2.181l-.513-.503c.348-.353.707-.717 1.065-1.075l-.015-.03l-.11.045l-1.284.582c-.07.03-.12.04-.174-.025c-.075-.09-.21-.164-.224-.258c-.015-.095.074-.215.124-.32c.18-.393.364-.786.528-1.194q-.554.537-1.1 1.06m11.71 10.357c.01-.045.016-.06.016-.074q.292-1.024.577-2.047c.01-.04.02-.104-.005-.13c-.234-.238-.473-.467-.722-.706l-2.116 2.16c.15.145.319.31.493.484c.463-.454.941-.917 1.4-1.36c0-.015 0 0-.006.015c-.159.667-.313 1.335-.483 1.997c-.044.18-.035.304.115.428c.17.14.319.309.488.478L24 16.851c-.144-.14-.309-.3-.503-.494c-.443.458-.901.926-1.38 1.42zm-7.956-6.582c.124-.13.269-.274.433-.443c-.299-.294-.612-.593-.906-.877c.164-.164.314-.318.478-.488c.234.234.478.478.717.712c.14-.144.284-.289.458-.463c-.239-.234-.493-.473-.717-.692l.334-.358l.936.916c.134-.135.274-.28.413-.424l-1.519-1.483l-2.11 2.156c.487.468.99.96 1.483 1.444M3.187 15.102q-.231-.209-.409-.373c.294-.314.588-.622.887-.941c-.13-.12-.27-.254-.414-.389c-.488.478-.985.966-1.473 1.44l2.15 2.15q.735-.715 1.49-1.453c-.15-.14-.29-.27-.434-.409c-.304.294-.617.603-.916.897l-.463-.434c.249-.264.488-.522.737-.786c-.14-.13-.284-.264-.468-.439zm5.258-6.647c-.07-.025-.115-.02-.165.035c-.149.154-.308.304-.463.453c-.02.02-.034.045-.06.075c.38.124.743.239 1.111.358c.264.085.553.13.787.27c.229.139.408.373.602.572c.1.104.194.214.294.328c.2-.214.373-.398.553-.587c-.24-.244-.498-.503-.747-.767a.4.4 0 0 1-.09-.16c-.09-.363-.174-.731-.264-1.095c-.07-.294-.144-.592-.219-.906c-.214.21-.413.403-.607.598c-.02.02-.02.074-.01.11c.04.148.084.293.124.442c.06.214.12.428.185.667c-.364-.149-.698-.268-1.031-.393m11.193 3.998l-.558-.542c-.697.712-1.399 1.434-2.116 2.166c.478.468.976.95 1.47 1.429c.154-.16.323-.329.507-.518c-.294-.289-.602-.588-.911-.886q.823-.85 1.608-1.649m-17.532 6.33c.498-.484.986-.962 1.479-1.445c-.174-.16-.344-.319-.518-.478c-.289.279-.592.578-.906.881c-.548-.562-1.09-1.115-1.633-1.673c-.18.19-.354.369-.528.558c.692.707 1.394 1.43 2.106 2.156zm18.842-4.995c-.697.712-1.4 1.434-2.102 2.15c.16.16.339.34.533.529c.697-.712 1.404-1.434 2.106-2.156c-.159-.16-.343-.334-.537-.523m-2.973-1.759c-.294.23-.612.299-.976.16c-.154.478-.309.946-.463 1.424c-.19-.185-.368-.354-.543-.538c-.025-.03-.015-.105-.005-.15q.187-.857.379-1.722c.005-.02.005-.04-.01-.075c-.374.388-.747.777-1.116 1.155l-.552-.538l2.086-2.16c.468.452.921.87 1.344 1.319c.284.289.195.856-.144 1.125m-.543-.97c-.154-.17-.333-.32-.498-.474c-.154.16-.318.324-.493.503c.1.105.205.22.31.329c.02.025.039.05.064.064c.045.035.09.07.14.09c.159.07.338.02.442-.114c.115-.14.14-.29.035-.399zm-8.086.084c0 .812-.762 1.543-1.608 1.543c-.807 0-1.549-.746-1.549-1.558c0-.901.657-1.569 1.554-1.569a1.58 1.58 0 0 1 1.603 1.584m-.747 0a1.6 1.6 0 0 0-.752-.837a.58.58 0 0 0-.642.05c-.21.15-.329.354-.304.623c.04.428.657.99 1.086.985c.398-.005.757-.463.612-.821m-1.045 2.276c-.17.18-.334.359-.503.533c-.025.025-.095.015-.14.005c-.538-.14-1.075-.284-1.613-.423a.2.2 0 0 0-.115-.005l1.096 1.125c-.18.194-.359.384-.523.558L3.59 13.091c.03-.035.05-.06.07-.08c.338-.338.682-.672 1.02-1.006c.225-.219.493-.333.812-.293c.408.05.707.378.717.801c.005.15-.02.304-.03.463c.463.145.926.299 1.375.443m-2.063-.826c-.134-.135-.304-.164-.443-.055c-.154.12-.294.259-.443.393c.189.175.363.339.552.513c.08-.074.185-.169.284-.264c.04-.04.08-.074.11-.12c.104-.158.084-.323-.06-.467m15.86 6.622H2.554c-.015-.015-.025-.03-.04-.045c.04-.02.085-.03.115-.06l3.904-3.863l4.566-4.521c.264-.264.533-.518.796-.787c.085-.085.13-.085.215 0c1.483 1.494 2.977 2.982 4.466 4.471q2.35 2.354 4.7 4.7a1 1 0 0 0 .1.08c-.01.01-.015.02-.025.025"/></svg>` );

    const menubar = area.addMenubar( [
        {
            name: 'Web',
            submenu: [
                { name: 'Seguimiento/Facturas', callback: ( v, e ) => core.openApp( core.cblTrackingApp, v ), icon: 'TextSearch' },
                { name: 'Pedidos', callback: ( v, e ) => core.openApp( core.ordersApp ), icon: 'WooCommerce' }
            ]
        },
        {
            name: 'Plataformas',
            submenu: [
                { name: 'Shein', callback: ( v, e ) => core.openApp( core.sheinApp ), icon: 'Shein' },
                { name: 'Decathlon', callback: ( v, e ) => core.openApp( core.decathlonApp ), icon: 'Decathlon' },
                { name: 'TikTok', callback: ( v, e ) => core.openApp( core.tikTokApp ), icon: 'TikTok' },
                { name: 'Miravia', callback: ( v, e ) => core.openApp( core.miraviaApp ), icon: 'ShoppingBag' },
                { name: 'Mirakl', submenu: [
                    { name: 'Carrefour', callback: ( v, e ) => core.openApp( core.carrefourApp, v ), icon: 'Carrefour' },
                    { name: 'LeroyMerlin', callback: ( v, e ) => core.openApp( core.leroyMerlinApp ), icon: 'LeroyMerlin' },
                    { name: 'Sprinter', callback: ( v, e ) => core.openApp( core.sprinterApp ), icon: 'Sprinter' },
                    { name: 'PlanetaHuerto', callback: ( v, e ) => core.openApp( core.planetaHuertoApp ), icon: 'Globe' },
                    { name: 'Worten', callback: ( v, e ) => core.openApp( core.wortenApp ), icon: 'Worten' },
                    null,
                    { name: 'DecathlonMirakl', callback: ( v, e ) => core.openApp( core.decathlonOnlineApp ), icon: 'Decathlon' }
                ] },
            ]
        },
        {
            name: 'Otros',
            submenu: [
                { name: 'Transporte', callback: ( v, e ) => core.openApp( core.transportCalculatorApp ), icon: 'Truck' },
                { name: 'Packer SEUR', callback: ( v, e ) => core.openApp( core.seurPackerApp ), icon: 'Barcode' },
                { name: 'Facturas SEUR', callback: ( v, e ) => core.openApp( core.billCalculatorApp ), icon: 'ReceiptEuro', disabled: true },
                { name: 'Stock', disabled: true, callback: core.redirectToOAuth.bind( core ), icon: 'Boxes' }
            ]
        },
        { name: 'Chill', callback: ( v, e ) => core.openApp( core.chillApp ) },
        { name: 'Manual', float: 'right', callback: ( v, e ) => core.openApp( core.manualApp ) }
    ] );

    {
        const separator = LX.makeContainer( [ '1px', '100%' ], 'content-center ml-4 mr-2', '' );
        LX.makeContainer( [ 'auto', '1.25rem' ], 'bg-muted', '', separator );
        LX.insertChildAtIndex( menubar.root, separator, 0 );
    }

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

    // Move Chill to right side
    {
        const entry = document.querySelector( '#Chill' );
        LX.insertChildAtIndex( menubar.root, entry );
    }

    {
        const separator = LX.makeContainer( [ '1px', '100%' ], 'content-center ml-4 mr-2', '' );
        LX.makeContainer( [ 'auto', '1.25rem' ], 'bg-muted', '', separator );
        LX.insertChildAtIndex( menubar.root, separator );
    }

    // Move Manual to right side
    {
        const entry = document.querySelector( '#Manual' );
        entry.classList.add( 'mr-4' );
        const span = entry.querySelector( 'span' );
        span.appendChild( LX.makeIcon( 'Info@solid' ) );
        LX.addClass( span, 'flex flex-row gap-2' );
        LX.insertChildAtIndex( menubar.root, entry );
    }

    const dialog = Utils.makeLoadingDialog( "Cargando datos de productos... " );

    Data.load( () => {
        LX.doAsync( () => {
            dialog.destroy();
            core.init( menubar.siblingArea );
        }, 10 );
    });
}

// const url = "https://scrape.abstractapi.com/v1/?api_key=2a401a83e18b45b7bba20beddcb9ad6e&url=https://news.ycombinator.com"
// Utils.request({ url, success: (d) => {
//     console.log(d)
// } });

window.core = core;
