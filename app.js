import { LX } from 'lexgui';
import { WooCommerceClient } from './extra/woocomerce.js';

window.LX = LX;

const cblTrackingUrl = `https://clientes.cbl-logistica.com/public/consultaenvio.aspx`;
const seurTrackingUrl = `https://www.seur.com/miseur/mis-envios`;
const glsTrackingUrl = `https://gls-group.com/ES/es/seguimiento-envio/`;
const transportOptions = ["CBL", "SEUR"];//, "GLS"];
const companyOptions = ["Jowy", "HxG", "Bathby"];

const convertDateDMYtoMDY = str => {
    const [day, month, year] = str.split("/");
    return `${month}/${day}/${year}`;
};

const convertDateMDYtoDMY = str => {
    const [month, day, year] = str.split("/");
    return `${day}/${month}/${year}`;
};

function getDateNDaysAgo( n = 30 ) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
}

const app = {

    transport: "CBL", // Default transport
    sheetName: "",
    countryFormat: {
        "Spain": "ESPAÑA",
        "ES": "ESPAÑA",
        "Portugal": "PORTUGAL",
        "PT": "PORTUGAL",
        "Italy": "ITALIA",
        "France": "FRANCIA",
        "FR": "FRANCIA",
    },
    ordersBeforeDays: 15,

    data: {
        "otros": { list: [], dom: null },
        "jowy": {
            name: "Jowy",
            list: [],
            dom: null,
            domO: null,
            url: "https://www.jowyoriginals.com/wp-admin/",
            store: "https://jowyoriginals.com",
            padding: 6,
            prefix: "2-",
            suffix: "",
            wcc: new WooCommerceClient()
        },
        "hxg": {
            name: "HxG",
            list: [],
            dom: null,
            domO: null,
            url: "https://homexgym.com/wp-admin/",
            store: "https://homexgym.com",
            padding: 6,
            prefix: "3-",
            suffix: "",
            wcc: new WooCommerceClient()
        },
        "bathby": {
            name: "Bathby",
            list: [],
            dom: null,
            domO: null,
            url: "https://bathby.com/wp-admin/",
            store: "https://bathby.com",
            padding: 6,
            prefix: "4-",
            suffix: "",
            wcc: new WooCommerceClient()
        },
    },

    statusColors: {
        "Documentada": { icon: "File", bg: "#272c31ff" },
        "Entregada": { icon: "CircleCheck", bg: "#218118" },
        "Incidencia": { icon: "CircleAlert", bg: "#dc2626" },
        "En reparto": { icon: "Truck", bg: "#0d9488" },
        "En destino": { icon: "Warehouse", bg: "#2563eb" },
        "En tránsito": { icon: "Package", bg: "#a21caf" },
        "En gestión": { icon: "TriangleAlert", bg: "#ca8a04" },
        "Devuelta": { icon: "Frown", bg: "#dc2626" },
    },

    init: function( appArea ) {

        this.area = appArea;

        this.createHeaderHtml();
        this.createContentHtml();
        this.createFooterHtml();

        const hash = window.location.hash.substring(1); // remove leading #
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");

        if( accessToken )
        {
            this.getGoogleDriveFile( accessToken );
        }
        else
        {
            // Start last tool
            const lastTool = localStorage.getItem( "lastTool" ) ?? "tracking-messages";
            if( lastTool === "tracking-messages" ) {
                this.openTrackingMessagesApp();
            }
            else if( lastTool.includes( "-seur" ) ) {
                this.openDataToSeurApp( lastTool.substring( 0, lastTool.indexOf( '-' ) ) );
            }
            else if( lastTool.includes( "orders" ) ) {
                this.openOrdersApp();
            }
        }

        // LX.requestBinary( "envios.xlsx", (data) => {
        //     const workbook = XLSX.read(data, {type: "binary"});
        //     app.sheetName = workbook.SheetNames[0];
        //     const sheet = workbook.Sheets[ app.sheetName ];
        //     if( app.processData( XLSX.utils.sheet_to_json(sheet, { raw: false }) ) )
        //     {
        //         LX.toast( "Datos cargados", `✅ ${ "envios.xlsx" }`, { timeout: 5000, position: "top-left" } );
        //     }
        // } );
    },

    createHeaderHtml: function() {
        const header = LX.makeContainer( [ null, "auto" ], "flex flex-col border-top border-bottom gap-2 px-6 py-12", `
            <div style="display:flex;flex-direction:row;gap:0.5rem;align-items:center;">${ LX.makeIcon("Info", { svgClass: "xxl" }).innerHTML }<h1>Jowy Originals</h1></div>
            <p class="font-light" style="max-width:32rem">Elige una de las herramientas para empezar.</p>
        `, this.area );
        header.style.background = `url('data/banner_${ LX.getTheme() }.png') no-repeat center center / cover`;
        header.style.transition = "transform 0.1s ease-in";
        this.header = header;

        // add file drag and drop event to header
        header.addEventListener("dragover", (event) => {
            event.preventDefault();
            event.stopPropagation();
            header.classList.add("draggingover");
        });

        header.addEventListener("dragleave", (event) => {
            event.preventDefault();
            event.stopPropagation();
            header.classList.remove("draggingover");
        });

        header.addEventListener("drop", (event) => {
            event.preventDefault();
            event.stopPropagation();
            header.classList.remove("draggingover");

            // Check if a file was dropped
            if (event.dataTransfer.files.length > 0) {
                const file = event.dataTransfer.files[0];
                if (file.name.endsWith('.xlsx') || file.name.endsWith('.xlsm')) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const data = e.target.result;
                        const workbook = XLSX.read(data, {type: "binary"});
                        app.sheetName = workbook.SheetNames[0];
                        const sheet = workbook.Sheets[ app.sheetName ];
                        if( app.processData( XLSX.utils.sheet_to_json(sheet, { raw: false }) ) )
                        {
                            LX.toast( "Datos cargados", `✅ ${ file.name }`, { timeout: 5000, position: "top-left" } );
                        }
                    };

                    // Read the data as binary
                    reader.readAsArrayBuffer( file );

                } else {
                    alert("Please drop a valid .xlsx file.");
                }
            }
        });

        this.header = header;
    },

    setHeaderTitle: function( title, subtitle, icon ) {
        this.header.querySelector( "div" ).innerHTML = `${ LX.makeIcon( icon ?? "Info" , { svgClass: "xxl mr-2" }).innerHTML }<h1>${ title }</h1>`;
        this.header.querySelector( "p" ).innerHTML = subtitle ?? "";
    },

    createContentHtml: function() {

        this.createTrackingMessagesContentHtml();
        this.updateLists();

        this.createSheinDataContentHtml();
        this.showSheinList( [] );

        this.createOrdersContentHtml();
        this.updateOrders();
    },

    createTrackingMessagesContentHtml: function() {

        const area = new LX.Area( { skipAppend: true } );
        this.area.attach( area );

        // Create utility buttons
        const utilButtonsPanel = new LX.Panel({ height: "auto", className: "bg-none bg-primary border-none p-2 flex flex-row gap-2" });
        utilButtonsPanel.sameLine(4);

        const seeMessagesButton = utilButtonsPanel.addButton(null, "SeeMessagesButton", () => {
            if( this.compName !== "otros" ) this.showMessages( this.compName, 0 );
        }, { icon: "Eye", title: "Ver mensajes", tooltip: true });

        const clearButtonWidget = utilButtonsPanel.addButton(null, "ClearButton", () => {
            this.clearData();
        }, { icon: "Trash2", title: "Limpiar datos anteriores", tooltip: true });

        const messageFromTrackIdButton = utilButtonsPanel.addButton(null, "NewCustomMessage",  () => {
            this.openMessageDialog();
        }, { icon: "Plus", title: "Nuevo mensaje", tooltip: true } );

        const openweCommerceOrdersButton = utilButtonsPanel.addButton(null, "OpenOrdersButton",  () => {
            this.openweCommerceOrders();
        }, { icon: "ExternalLink", title: "Abrir todos los pedidos", tooltip: true } );

        area.attach( utilButtonsPanel.root );

        const tabs = area.addTabs( { parentClass: "p-4", sizes: [ "auto", "auto" ], contentClass: "p-2 pt-0" } );
        this.tabs = tabs.root;

        // Jowy
        {
            const jowyContainer = LX.makeContainer( [ null, "auto" ], "flex flex-col relative bg-primary p-1 pt-0 rounded-lg overflow-hidden" );
            tabs.add( "Jowy", jowyContainer, { selected: true, onSelect: (event, name) => this.showList( name.toLowerCase() ) } );

            const jowyArea = new LX.Area({ className: "rounded-lg" });
            jowyContainer.appendChild( jowyArea.root );
            this.data["jowy"].dom = jowyContainer;
        }

        // HxG
        {
            const hxgContainer = LX.makeContainer( [ null, "auto" ], "flex flex-col relative bg-primary p-1 pt-0 rounded-lg overflow-hidden" );
            tabs.add( "HxG", hxgContainer, { xselected: true, onSelect: (event, name) => this.showList( name.toLowerCase() ) } );

            const hxgArea = new LX.Area({ className: "rounded-lg" });
            hxgContainer.appendChild( hxgArea.root );
            this.data["hxg"].dom = hxgContainer;
        }

        // Bathby
        {
            const bathbyContainer = LX.makeContainer( [ null, "auto" ], "flex flex-col relative bg-primary p-1 pt-0 rounded-lg overflow-hidden" );
            tabs.add( "Bathby", bathbyContainer, { xselected: true, onSelect: (event, name) => this.showList( name.toLowerCase() ) } );

            const bathbyArea = new LX.Area({ className: "rounded-lg" });
            bathbyContainer.appendChild( bathbyArea.root );
            this.data["bathby"].dom = bathbyContainer;
        }

        // Otros
        {
            const miscContainer = LX.makeContainer( [ null, "auto" ], "flex flex-col relative bg-primary p-1 pt-0 rounded-lg overflow-hidden" );
            tabs.add( "Otros", miscContainer, { xselected: true, onSelect: (event, name) => this.showList( name.toLowerCase() ) } );

            const miscArea = new LX.Area({ className: "rounded-lg" });
            miscContainer.appendChild( miscArea.root );
            this.data["otros"].dom = miscContainer;
        }

        // Move up into the panel section
        utilButtonsPanel.attach(tabs.root);

        area.root.classList.add( "hidden" );
        this.trackingMessagesArea = area;
    },

    createSheinDataContentHtml: function() {

        const area = new LX.Area( { skipAppend: true } );
        this.area.attach( area );

        // Create utility buttons
        const utilButtonsPanel = new LX.Panel({ height: "auto", className: "bg-none bg-primary border-none p-2 flex flex-row gap-2" });
        utilButtonsPanel.sameLine(3);
        utilButtonsPanel.addButton(null, "StartButton", this.showSingleSheinData.bind( this ), { icon: "Eye", title: "Ver información detallada", tooltip: true } );
        utilButtonsPanel.addButton(null, "ClearButton", this.clearData.bind( this ), { icon: "Trash2", title: "Limpiar datos anteriores", tooltip: true });
        utilButtonsPanel.addButton(null, "ExportButton", this.exportSEUR.bind( this, false, this.lastSheinData ), { icon: "Download", title: "Exportar datos", tooltip: true });
        area.attach( utilButtonsPanel.root );
        
        const tabs = area.addTabs( { parentClass: "p-4", sizes: [ "auto", "auto" ], contentClass: "p-2 pt-0" } );
        this.sheinTabs = tabs.root;

        // SEUR
        const seurContainer = LX.makeContainer( [ null, "auto" ], "flex flex-col relative bg-primary p-1 pt-0 rounded-lg overflow-hidden" );
        tabs.add("Todo", seurContainer, { selected: true, onSelect: (event, name) => this.showSheinList() } );

        const seurArea = new LX.Area({ className: "rounded-lg" });
        seurContainer.appendChild( seurArea.root );

        // Groups List
        const groupsListContainer = LX.makeContainer( [ null, "auto" ], "flex flex-col relative bg-primary p-1 pt-0 rounded-lg overflow-hidden" );
        tabs.add( "Por cantidad", groupsListContainer, { xselected: true, onSelect: (event, name) => this.showGroupsByCountryList() } );

        const groupsListArea = new LX.Area({ className: "rounded-lg" });
        groupsListContainer.appendChild( groupsListArea.root );

        // Move up into the panel section
        utilButtonsPanel.attach(tabs.root);

        area.root.classList.add( "hidden" );

        this.seurDataArea = seurArea;
        this.groupsListArea = groupsListArea;
        this.sheinDataArea = area;
    },

    createOrdersContentHtml: function() {

        const area = new LX.Area( { skipAppend: true } );
        this.area.attach( area );

        // Create utility buttons
        const utilButtonsPanel = new LX.Panel({ height: "auto", className: "bg-none bg-primary border-none p-2 flex flex-row gap-2" });
        utilButtonsPanel.sameLine(1);
        // utilButtonsPanel.addButton(null, "StartButton", this.showSingleSheinData.bind( this ), { icon: "Eye", title: "Ver información detallada", tooltip: true } );
        utilButtonsPanel.addButton(null, "ClearButton", this.clearData.bind( this ), { icon: "Trash2", title: "Limpiar datos anteriores", tooltip: true });
        utilButtonsPanel.addNumber(null, this.ordersBeforeDays, (v) => {
            this.ordersBeforeDays = v;
        }, { width: "auto", step: 1, min: 1, max: 90, units: "días", skipSlider: true });
        area.attach( utilButtonsPanel.root );
        
        const tabs = area.addTabs( { parentClass: "p-4", sizes: [ "auto", "auto" ], contentClass: "p-2 pt-0" } );
        this.ordersTabs = tabs.root;

        // Jowy
        {
            const jowyContainer = LX.makeContainer( [ null, "auto" ], "flex flex-col relative bg-primary p-1 pt-0 rounded-lg overflow-hidden" );
            tabs.add( "Jowy", jowyContainer, { selected: true, onSelect: (event, name) => this.showOrders( name.toLowerCase() ) } );

            const jowyArea = new LX.Area({ className: "rounded-lg" });
            jowyContainer.appendChild( jowyArea.root );
            this.data["jowy"].domO = jowyContainer;
        }

        // HxG
        {
            const hxgContainer = LX.makeContainer( [ null, "auto" ], "flex flex-col relative bg-primary p-1 pt-0 rounded-lg overflow-hidden" );
            tabs.add( "HxG", hxgContainer, { xselected: true, onSelect: (event, name) => this.showOrders( name.toLowerCase() ) } );

            const hxgArea = new LX.Area({ className: "rounded-lg" });
            hxgContainer.appendChild( hxgArea.root );
            this.data["hxg"].domO = hxgContainer;
        }

        // Bathby
        {
            const bathbyContainer = LX.makeContainer( [ null, "auto" ], "flex flex-col relative bg-primary p-1 pt-0 rounded-lg overflow-hidden" );
            tabs.add( "Bathby", bathbyContainer, { xselected: true, onSelect: (event, name) => this.showOrders( name.toLowerCase() ) } );

            const bathbyArea = new LX.Area({ className: "rounded-lg" });
            bathbyContainer.appendChild( bathbyArea.root );
            this.data["bathby"].domO = bathbyContainer;
        }

        // Move up into the panel section
        utilButtonsPanel.attach(tabs.root);

        area.root.classList.add( "hidden" );

        this.ordersArea = area;
    },

    createFooterHtml: function() {

        this.footer = new LX.Footer( {
            className: "border-top",
            parent: LX.root,
            credits: `${ new Date().getUTCFullYear() }. Alex Rodríguez (@jxarco)`,
            socials: [
                { title: "Github", link: "https://github.com/jxarco/", icon: "Github" }
            ]
        } );

    },

    openTrackingMessagesApp: function()
    {
        this.setHeaderTitle( "Mensajes de seguimiento", "Arrastra un <strong>.xlsx</strong> aquí para cargar un nuevo listado de envíos.", "MessagesSquare" );

        this.trackingMessagesArea.root.classList.toggle( "hidden", false );
        this.sheinDataArea.root.classList.toggle( "hidden", true );
        this.ordersArea.root.classList.toggle( "hidden", true );

        this.tool = "tracking-messages";
        localStorage.setItem( "lastTool", this.tool );
    },

    openDataToSeurApp: function( dataMarketplace )
    {
        this.setHeaderTitle( `Envíos SEUR: <i>${ dataMarketplace }</i>`, "Arrastra un <strong>.xlsx</strong> aquí para cargar un nuevo listado de envíos.", "Truck" );

        this.trackingMessagesArea.root.classList.toggle( "hidden", true );
        this.sheinDataArea.root.classList.toggle( "hidden", false );
        this.ordersArea.root.classList.toggle( "hidden", true );

        this.tool = dataMarketplace + "-seur";
        localStorage.setItem( "lastTool", this.tool );
    },

    openOrdersApp: function()
    {
        this.setHeaderTitle( `Pedidos Web`, "", "Package" );

        this.trackingMessagesArea.root.classList.toggle( "hidden", true );
        this.sheinDataArea.root.classList.toggle( "hidden", true );
        this.ordersArea.root.classList.toggle( "hidden", false );

        this.tool = "orders";
        localStorage.setItem( "lastTool", this.tool );
    },

    processData: function( fileData, local )
    {
        let err = null;

        if( this.tool == "tracking-messages" )
        {
            // Clear previous data
            for( const key in this.data )
            {
                this.data[ key ].list = [];
            }

            for( const row of fileData )
            {
                const ref = row["REFERENCIA"];

                if( !ref )
                {
                    err = "No existe ninguna columna _REFERENCIA_ en el xlsx.";
                    break;
                }

                switch( ref[ 0 ] )
                {
                    case '2': this.data["jowy"].list.push( row ); break;
                    case '3': this.data["hxg"].list.push( row ); break;
                    case '4': this.data["bathby"].list.push( row ); break;
                    default: this.data["otros"].list.push( row ); break;
                }
            }

            if( err === null )
            {
                this.updateLists();
            }
        }
        else if( this.tool == "Shein-seur" )
        {
            this.showSheinList( fileData );
            this.showGroupsByCountryList( fileData );
        }
        
        if( err !== null )
        {
            LX.toast( "❌ Error", err, { position: "top-left" } );
            return false;
        }

        return true;
    },

    showList: function( compName )
    {
        const dom = this.data[ compName ].dom;
        const list = this.data[ compName ].list;
        const url = this.data[ compName ].url;
        dom.innerHTML = "";

        const columnData = [
            // [ "DIA", null ],
            [ "F_DOC", null ],
            [ "CLAVE", "SITUACIÓN", ( str ) => {
                const status = this.statusColors[ str ] ?? {};
                let iconStr = status.icon ? LX.makeIcon( status.icon, { svgClass: "md fg-white" } ).innerHTML : "";
                return `${ LX.badge( iconStr + str , "text-sm font-bold border-none ", { style: { height: "1.4rem", borderRadius: "0.65rem", backgroundColor: status.bg ?? "", color: status.fg ?? "" } } ) }`;
            } ],
            [ "F_SITUACION", null ],
            [ "REFERENCIA", null, ( str ) => {
                const idx = str.indexOf("/");
                return idx === -1 ? str : str.substring(0, idx);
            } ],
            [ "REFERENCIA", "NPEDIDO", ( str ) => {
                const idx = str.indexOf("/");
                return idx === -1 ? "" : str.substring(idx+1);
            } ],
            [ "NENVIO", null ],
            [ "LOCALIZADOR", null ],
            [ "NOMCONS", "NOMBRE" ],
            [ "POBLACION", null ],
            // [ "DETALLE", null ],
        ];

        // Create table data from the list
        const tableData = list.map( row => {
            const lRow = [];
            for( let c of columnData )
            {
                const ogColName = c[ 0 ];
                const fn = c[ 2 ] ?? ( (str) => str );
                lRow.push( fn( row[ ogColName ] ?? "?" ) );
            }
            return lRow;
        });

        const tableWidget = new LX.Table(null, {
                head: columnData.map( c => {
                    return c[ 1 ] ?? c[ 0 ];
                }),
                body: tableData
            }, {
            selectable: false,
            sortable: false,
            toggleColumns: true,
            filter: "NOMBRE",
            customFilters: [
                { name: "SITUACIÓN", options: Object.keys( this.statusColors ) },
                { name: "F_DOC", type: "date" },
                { name: "F_SITUACION", type: "date" }
            ],
            rowActions: compName != "otros" ? [
                { icon: "Eye", title: "Ver mensaje", callback: (rowData) => {
                    const rowIndex = tableData.indexOf(rowData);
                    this.showMessages( compName, rowIndex );
                }},
                { icon: "ExternalLink", title: "Abrir Pedido", callback: (rowData) => {
                    const orderNumber = rowData[4];
                    if( orderNumber !== "" ) window.open(`${ url }post.php?post=${ orderNumber }&action=edit`);
                }},
                { icon: "Copy", title: "Copiar Nombre", callback: (rowData) => {
                    const data = rowData[7];
                    navigator.clipboard.writeText( data ).then(() => {
                        LX.toast( "Copiado", `✅ "${ data }" copiado al portapapeles.`, { timeout: 5000, position: "top-left" } );
                    }).catch(err => {
                        console.error('Error copying text: ', err);
                        LX.toast( "Error", "❌ No se pudo copiar el nombre.", { timeout: -1, position: "top-left" } );
                    });
                }},
            ] : []
        });

        dom.appendChild( tableWidget.root );

        this.compName = compName;
        this.rowOffset = undefined;
    },

    showMessages: async function( compName, rowOffset = 0 ) {
        
        const compData = this.data[ compName ];
        const dom = compData.dom;
        const list = compData.list;

        // Check login for compName
        const wcc = compData.wcc;
        if( !wcc.connected )
        {
            this.openWooCommerceLogin( this.showMessages.bind( this, compName, rowOffset ) );
            return;
        }
        
        dom.innerHTML = "";

        // hack to remove all tooltips
        document.querySelectorAll(".lextooltip").forEach( el => { el.remove(); });

        const row = list[ rowOffset ];
        if( !row ) {
            const header = LX.makeContainer( [ null, "auto" ], "flex flex-col border-top border-bottom gap-2 px-3 py-6", `
                <h1>No hay más mensajes</h1>
            `, dom );
            this.rowOffset = undefined;
            return;
        }

        let str = row["REFERENCIA"] ?? "";
        let orderNumber = undefined;
        const idx = str.indexOf("/");
        if(idx != -1)
        {
            orderNumber = str.substring(idx+1);
            str = str.substring(0, idx);
        }

        orderNumber = parseInt(orderNumber);
        // orderNumber = 4529;

        const hasOrderNumber = !Number.isNaN( orderNumber );
        const status = this.statusColors[ "Incidencia" ] ?? {};
        let iconStr = LX.makeIcon( "CircleAlert", { svgClass: "md fg-white" } ).innerHTML;
        const noOrderStr = `${ LX.badge( iconStr + "Sin número" , "text-lg font-bold border-none ", { style: { height: "1.4rem", borderRadius: "0.65rem", backgroundColor: status.bg ?? "", color: status.fg ?? "" } } ) }`;

        const header = LX.makeContainer( [ null, "auto" ], "flex flex-col border-top border-bottom gap-2 px-3 py-6 mb-3", `
            <h2 class="flex flex-row items-center gap-1">${ row["NOMCONS"] }</h2>
            <div class="flex flex-row items-center gap-1"><p class="font-light fg-tertiary">Población</p><p class="flex flex-row items-center font-medium">${ row["POBLACION"] }</p></div>
            <div class="flex flex-row items-center gap-1"><p class="font-light fg-tertiary">Situación</p><p class="flex flex-row items-center font-medium">${ row["CLAVE"] }</p></div>
            <div class="flex flex-row items-center gap-1"><p class="font-light fg-tertiary">Número de envío</p><p class="flex flex-row items-center font-medium">${ row["NENVIO"] }</p></div>
            <div class="flex flex-row items-center gap-1"><p class="font-light fg-tertiary">Referencia</p><p class="flex flex-row items-center font-medium">${ str }</p></div>
            <div class="flex flex-row items-center gap-1"><p class="font-light fg-tertiary">Número de pedido</p><p class="flex flex-row items-center font-medium">${ hasOrderNumber ? orderNumber : noOrderStr }</p></div>
        `, dom );

        // Add button to copy NOMBRE USUARIO
        {
            const nPedidoH2 = header.querySelector( "h2" );
            const copyButtonWidget = new LX.Button(null, "CopyButton",  async function() {
                navigator.clipboard.writeText( nPedidoH2.innerText ).then(() => {
                    LX.toast( "Copiado", "✅ Mensaje copiado al portapapeles.", { timeout: 5000, position: "top-left" } );
                }).catch(err => {
                    console.error('Error copying text: ', err);
                    LX.toast( "Error", "❌ No se pudo copiar el mensaje.", { timeout: -1, position: "top-left" } );
                });
                copyButtonWidget.root.querySelector( "input[type='checkbox']" ).style.pointerEvents = "none";

                LX.doAsync( () => {
                    copyButtonWidget.swap( true );
                    copyButtonWidget.root.querySelector( "input[type='checkbox']" ).style.pointerEvents = "auto";
                }, 3000 );
            }, { swap: "Check", icon: "Copy", title: "Copiar", tooltip: true } );
            copyButtonWidget.root.querySelector( ".swap-on svg" ).addClass( "fg-success" );
            nPedidoH2.appendChild( copyButtonWidget.root );
        }

        let url = cblTrackingUrl;
        switch( this.transport )
        {
            case 'SEUR': url = seurTrackingUrl; break;
            case "GLS": url = glsTrackingUrl; break;
        }

        const template = this.data[ compName ].template;
        const templateString = template( row["LOCALIZADOR"], url );

        // Invoice data
        
        if( hasOrderNumber )
        {
            const invoiceContainer = LX.makeContainer( [ "null", "auto" ], "flex flex-col border-bottom gap-2 px-3 pb-2 mb-6", ``, dom );
            const invoicePanel = new LX.Panel({ width: "50%", className: "p-0" });
            invoiceContainer.appendChild( invoicePanel.root );

            const skeleton = new LX.Skeleton(  `
                <div class="flex flex-row w-1/2">
                <div class="flex flex-col w-1/3 p-2 gap-2">
                    <div class="w-full h-4 lexskeletonpart"></div>
                    <div class="w-full h-4 lexskeletonpart"></div>
                </div>
                <div class="flex flex-col w-2/3 p-2 gap-2">
                    <div class="w-full h-4 lexskeletonpart"></div>
                    <div class="w-full h-4 lexskeletonpart"></div>
                </div>
                </div>
            ` );
            invoiceContainer.appendChild( skeleton.root );

            const orderInvoice = await wcc.getInvoice( orderNumber );

            skeleton.destroy();

            const date = new Date();
            let invoiceNumber = "", invoiceDate = `${ date.getDate() }/${ date.getMonth() + 1 }/${ date.getFullYear() }`;
            let customerNote = true;

            if( orderInvoice !== null )
            {
                invoiceNumber = orderInvoice.number;
                invoiceDate = orderInvoice.date;
                invoicePanel.addText( "Número de Factura (FT)", orderInvoice.numberFormatted.toString(), null, { disabled: true, nameWidth: "40%", className: "text-xl font-light fg-tertiary" } );
            }

            invoicePanel.addText( "Número de Factura", invoiceNumber.toString(), (v) => {
                v = parseInt( v );
                invoiceNumber = !Number.isNaN( v ) ? v : 0;
            }, { disabled: orderInvoice !== null, placeholder: "000000", nameWidth: "40%", className: "text-xl font-light fg-tertiary" } );
            invoicePanel.addDate( "Fecha de Factura", invoiceDate, (v) => {
                invoiceDate = v;
            }, { disabled: orderInvoice !== null, nameWidth: "40%", className: "text-xl font-light fg-tertiary" } );

            if( orderInvoice === null )
            {
                invoicePanel.addButton( null, "Facturar", () => {
                    const dialogClosable = new LX.Dialog("Facturar en WooCommerce", dialogPanel => {
                        dialogPanel.addTextArea(null, `Vas a facturar con los siguientes datos en WooCommerce (pedido ${ orderNumber }). Revisa los datos antes de continuar.`, 
                            null, { fitHeight: true, disabled: true }
                        );
                        dialogPanel.addSeparator();
                        dialogPanel.addNumber( "Número de Factura", invoiceNumber, () => {}, { disabled: true, nameWidth: "40%", className: "text-lg fg-tertiary" } );
                        dialogPanel.addText( "Fecha de Factura", invoiceDate, () => {}, { disabled: true, nameWidth: "40%", className: "text-lg fg-tertiary" } );
                        dialogPanel.addSeparator();
                        dialogPanel.addCheckbox( "Añadir nota de seguimiento", customerNote, (v) => {
                            customerNote = v;
                        }, { disabled: true, nameWidth: "60%", className: "text-lg fg-tertiary" } );
                        dialogPanel.sameLine(2, "justify-center mt-2");
                        dialogPanel.addButton(null, "Cerrar", () => dialogClosable.close(), { buttonClass: "fg-error" } );
                        dialogPanel.addButton(null, "Continuar", async () => {
                            dialogClosable.close();
    
                            const oN = orderNumber;// ?? 4529;
                            const iN = invoiceNumber;
                            const iD = convertDateDMYtoMDY( invoiceDate );
    
                            const dialog = this.makeLoadingDialog();
    
                            if( customerNote )
                            {
                                let r = await wcc.createOrderNote( oN, templateString );
                                if( !r.ok )
                                {
                                    LX.toast( "WooCommerce Error", `❌ ${ r.error }`, { timeout: -1, position: "top-left" } );
                                    dialog.destroy();
                                    return;
                                }
    
                                console.log("Nota creada para pedido #" + oN);
                            }
    
                            {
                                let r = await wcc.updateInvoice( oN, iN, iD, compData.prefix, compData.suffix, compData.padding );
                                if( !r.ok )
                                {
                                    LX.toast( "WooCommerce Error", `❌ ${ r.error }`, { timeout: -1, position: "top-left" } );
                                    dialog.destroy();
                                    return;
                                }
    
                                console.log(`Factura actualizada (${iN}, ${iD}) para pedido #${oN}`);
                            }
                            
                            dialog.destroy();

                            LX.toast( "Proceso completado", "✅ Pulsa <span>Ver</span> para comprobar los datos en la plataforma.", { timeout: 5000, position: "top-left", action: {
                                name: "Ver",
                                callback: () => {
                                    const url = this.data[ compName ].url;
                                    const link = `${ url }post.php?post=${ orderNumber }&action=edit`;
                                    window.open(link);
                                }
                            } } );
    
                            // refresh
                            this.showMessages( compName, rowOffset );
    
                        }, { buttonClass: "contrast" });
    
                    }, { modal: true, position: [ "calc(50% - 200px)", "250px" ], size: ["400px", null], closable: true, draggable: false });
                }, { buttonClass: "contrast" } );
            }
        }

        const body = LX.makeContainer( [ null, "auto" ], "p-2", templateString, dom );

        const footerPanel = new LX.Panel({ height: "auto", className: "bg-none bg-primary border-none p-2" });
        footerPanel.sameLine();

        const openWeCLink = footerPanel.addButton(null, "OpenWeCLinkButton", () => {
            if( hasOrderNumber )
            {
                const url = this.data[ compName ].url;
                const link = `${ url }post.php?post=${ orderNumber }&action=edit`;
                window.open(link);
            }
            else
            {
                // No deberia ocurrir!
                throw("Trying to open orderLink without order number!");
            }
        }, { disabled: !hasOrderNumber, width: "100px", icon: "ExternalLink", title: "Abrir pedido", tooltip: hasOrderNumber });
        dom.appendChild( footerPanel.root ); 

        const copyButtonWidget = footerPanel.addButton(null, "CopyButton",  async () => {
            navigator.clipboard.writeText( templateString ).then(() => {
                LX.toast( "Copiado", "✅ Mensaje copiado al portapapeles.", { timeout: 5000, position: "top-left" } );
            }).catch(err => {
                console.error('Error copying text: ', err);
                LX.toast( "Error", "❌ No se pudo copiar el mensaje.", { timeout: -1, position: "top-left" } );
            });
            copyButtonWidget.root.querySelector( "input[type='checkbox']" ).style.pointerEvents = "none";

            LX.doAsync( () => {
                copyButtonWidget.swap( true );
                copyButtonWidget.root.querySelector( "input[type='checkbox']" ).style.pointerEvents = "auto";
            }, 3000 );

        }, { width: "100px", swap: "Check", icon: "Copy", title: "Copiar mensaje", tooltip: true } );
        copyButtonWidget.root.querySelector( ".swap-on svg" ).addClass( "fg-success" );

        const nextButtonWidget = footerPanel.addButton(null, "NextButton", () => {
            this.showMessages( compName, rowOffset + 1 );
        }, { width: "100px", icon: "ArrowRight", title: "Siguiente mensaje", tooltip: true });
        dom.appendChild( footerPanel.root );

        footerPanel.endLine();

        this.compName = compName;
        this.rowOffset = rowOffset;
    },

    openMessageDialog: function() {

        const dialogClosable = new LX.Dialog("Nuevo Mensaje de Seguimiento", dialogPanel => {

            const dialogArea = new LX.Area({ className: "" });
            dialogPanel.attach( dialogArea.root );
            const [ left, right ] = dialogArea.split({ type: "horizontal", sizes: [ "55%", "45%" ], resize: false });

            let t = "SEUR", id = "123456789", c = this.data[ this.compName ].name;

            let p = new LX.Panel({ className: "bg-none bg-primary border-none p-2" });
            p.addSelect("Empresa", companyOptions, c, (value, event) => {
                c = value;
                body.innerHTML = getTemplate();
            }, { nameWidth: "30%", skipReset: true });
            p.addSelect("Transporte", transportOptions, t, (value, event) => {
                t = value;
                body.innerHTML = getTemplate();
            }, { nameWidth: "30%", skipReset: true });
            p.addText("Número seguimiento", id, (value, event) => {
                id = value;
                body.innerHTML = getTemplate();
            }, { nameWidth: "30%", skipReset: true });
            p.addSeparator();

            const copyButtonWidget = p.addButton(null, "CopyButton",  async () => {
                navigator.clipboard.writeText( body.innerHTML ).then(() => {
                    LX.toast( "Copiado", "✅ Mensaje copiado al portapapeles.", { timeout: 5000, position: "top-left" } );
                }).catch(err => {
                    console.error('Error copying text: ', err);
                    LX.toast( "Error", "❌ No se pudo copiar el mensaje.", { timeout: -1, position: "top-left" } );
                });
                copyButtonWidget.root.querySelector( "input[type='checkbox']" ).style.pointerEvents = "none";

                LX.doAsync( () => {
                    copyButtonWidget.swap( true );
                    copyButtonWidget.root.querySelector( "input[type='checkbox']" ).style.pointerEvents = "auto";
                }, 3000 );

            }, { swap: "Check", icon: "Copy", title: "Copiar", tooltip: true } );
            copyButtonWidget.root.querySelector( ".swap-on svg" ).addClass( "fg-success" );

            left.attach( p.root );

            const getTemplate = () => {
                const comp = c.toLowerCase();
                if( comp == "otros" ) return "";
                let url = cblTrackingUrl;
                switch( t )
                {
                    case 'SEUR': url = seurTrackingUrl; break;
                    case "GLS": url = glsTrackingUrl; break;
                }

                const template = this.data[ comp ].template;
                return template( id, url, t );
            };

            const body = LX.makeContainer( [ null, "auto" ], "p-4 items-center", "", right );
            body.innerHTML = getTemplate();

        }, { modal: true, size: ["min(100%, 900px)", null], closable: true, draggable: false });
    },

    openweCommerceOrders: function() {

        const allRows = this.data[ this.compName ].list;
        const allLinks = allRows.map( row => {
            const str = row["REFERENCIA"];
            const idx = str.indexOf("/");
            if(idx === -1) return;

            const url = this.data[ this.compName ].url;
            const orderNumber = str.substring(idx+1);
            return `${ url }post.php?post=${ orderNumber }&action=edit`;
        }).filter( l => l !== undefined );

        const fn = () => { allLinks.forEach( l => window.open(l) ) };

        if( allLinks.length > 1 )
        {
            const dialogClosable = new LX.Dialog("⚠️ Aviso", dialogPanel => {

                dialogPanel.addTextArea(null, `Esto abrirá ${ allLinks.length } pestañas al mismo tiempo. ¿Quieres continuar?`, 
                    null, { fitHeight: true, disabled: true }
                );
                dialogPanel.addSeparator();
                dialogPanel.sameLine(2, "justify-center");
                dialogPanel.addButton(null, "Cerrar", () => dialogClosable.close(), { buttonClass: "fg-error" } );
                dialogPanel.addButton(null, "Continuar", () => {
                    dialogClosable.close();
                    fn();
                }, { buttonClass: "contrast" });

            }, { modal: true, position: [ "calc(50% - 200px)", "250px" ], size: ["400px", null], closable: true, draggable: false });    
        }
        else
        {
            fn();
        } 
    },

    showSheinList: function( data ) {

        data = data ?? this.lastSheinData;

        const dom = this.seurDataArea.root;
        while (dom.children.length > 0) {
            dom.removeChild(dom.children[0]);
        }

        // Sort by ref
        {
            data = data.sort( ( a, b ) => {
                return ( a["SKU del vendedor"] ?? "?" ).localeCompare( b["SKU del vendedor"] ?? "?" );
            } );
        }

        const columnData = [
            [ "Número del pedido", null ],
            [ "ID del artículo", null ],
            [ "SKU del vendedor", null ],
            // [ "Nombre del producto", null ],
            // [ "Especificación", null ],
            // [ "precio de los productos básicos", null ],
            [ "Código Postal", null ],
            [ "País", null ],
            [ "Provincia", null ],
            [ "Ciudad", null ],
            [ "dirección de usuario 1+dirección de usuario 2", "Dirección" ],
            [ "Nombre de usuario completo", null ],
            [ "Número de Teléfono", null ],
            [ "Correo electrónico de usuario", null ],
        ];

        // Create table data from the list
        const tableData = data.map( row => {
            const lRow = [];
            for( let c of columnData )
            {
                const ogColName = c[ 0 ];
                if( ogColName.includes( '+' ) )
                {
                    const tks = ogColName.split( '+' );
                    lRow.push( `${ row[ tks[ 0 ] ] }${ row[ tks[ 1 ] ] ? ` ${ row[ tks[ 1 ] ] }` : "" }` );
                }
                else
                {
                    lRow.push( row[ ogColName ] ?? "?" );
                }
            }
            return lRow;
        });

        const tableWidget = new LX.Table(null, {
                head: columnData.map( c => {
                    return c[ 1 ] ?? c[ 0 ];
                }),
                body: tableData
            }, {
            selectable: false,
            sortable: false,
            toggleColumns: true,
            filter: "SKU del vendedor"
        });

        dom.appendChild( tableWidget.root );
        
        this.lastSeurColumnData = tableWidget.data.head;
        this.lastShownSeurData = tableWidget.data.body;
        this.lastSheinData = data;
    },

    showGroupsByCountryList: function( ogData ) {

        ogData = ogData ?? this.lastSheinData;

        let data = LX.deepCopy( ogData );

        const dom = this.groupsListArea.root;
        while (dom.children.length > 0) {
            dom.removeChild(dom.children[0]);
        }

        // Boton de copiar por columna (no por fila porque estan separadas en el Excel final)
        // en caso de repetir "Número del pedido", se tiene que añadir fila por separado

        // Sort by ref
        {
            data = data.sort( ( a, b ) => {
                return ( a["SKU del vendedor"] ?? "?" ).localeCompare( b["SKU del vendedor"] ?? "?" );
            } );
        }

        const columnData = [
            [ "SKU del vendedor", null ],
            [ "Cantidad", null ],
            [ "País", null ],
            [ "Observaciones", null ],
            [ "Número del pedido", null ]
        ];

        const orderNumbers = new Map();

        // Create table data from the list
        let tableData = data.map( ( row, index ) => {
            const lRow = [];
            for( let c of columnData )
            {
                let colName = c[ 0 ];

                if( colName === "Número del pedido" )
                {
                    const orderNumber = row[ colName ];

                    if( orderNumbers.has( orderNumber ) )
                    {
                        const val = orderNumbers.get( orderNumber );
                        orderNumbers.set( orderNumber, [ ...val, index ] );
                    }
                    else
                    {
                        orderNumbers.set( orderNumber, [ index ] );
                    }
                }

                let value = colName == "País" ? this.countryFormat[ row[ colName ] ] : row[ colName ];
                lRow.push( value ?? "" );
            }
            return lRow;
        });

        const multipleItemsOrderNames = Array.from( orderNumbers.values() ).filter( v => v.length > 1 );

        for( const repeats of multipleItemsOrderNames )
        {
            const rest = repeats.slice( 1 );
            const trail = rest.reduce( (p, c) => p + ` + ${ tableData[ c ][ 0 ] }`, "" );
            rest.forEach( r => { tableData[ r ] = undefined } );
            tableData[ repeats[ 0 ] ][ 0 ] += trail;
            tableData[ repeats[ 0 ] ][ 3 ] = "Mismo pedido";
        }

        tableData = tableData.filter( r => r !== undefined );

        // Remove unnecessary
        columnData.splice( 4, 1 );

        const listSKU = [];
        const skus = {};

        for( let row of tableData )
        {
            const sku = `${ row[ 0 ] }_${ row[ 2 ] }`;
            if( !skus[ sku ] )
            {
                skus[ sku ] = [ listSKU.length ];
                row[ 1 ] = 1;
                row.splice( 4, 1 );
                listSKU.push( row );
            }
            else
            {
                const idx = skus[ sku ][ 0 ];
                listSKU[ idx ][ 1 ] += 1;
            }
        }

        const tableWidget = new LX.Table(null, {
                head: columnData.map( c => {
                    return c[ 1 ] ?? c[ 0 ];
                }),
                body: listSKU
            }, {
            selectable: false,
            sortable: false,
            sortColumns: false,
            toggleColumns: false,
            columnActions: [
                { icon: "Copy", name: "Copiar", callback: ( colData ) => {
                    if( !this.lastShownSeurData )
                    {
                        return;
                    }
                    const tsv = colData.map(r => r.join('\t')).join('\n');
                    navigator.clipboard.writeText( tsv ).then(() => {
                        LX.toast( "Copiado", "✅ Columna copiada al portapapeles.", { timeout: 5000, position: "top-left" } );
                    }).catch(err => {
                        console.error('Error copying text: ', err);
                        LX.toast( "Error", "❌ No se pudo copiar la columna.", { timeout: -1, position: "top-left" } );
                    });
                } }
            ],
            filter: "SKU del vendedor",
        });

        this.lastSeurColumnData = tableWidget.data.head;
        this.lastShownSeurData = tableWidget.data.body;

        dom.appendChild( tableWidget.root );
    },

    showSingleSheinData( rowOffset ) {

        rowOffset = ( rowOffset.constructor === String ? 0 : rowOffset) ?? 0;

        const dom = this.seurDataArea.root;
        while (dom.children.length > 0) {
            dom.removeChild(dom.children[0]);
        }

        // hack to remove all tooltips
        document.querySelectorAll(".lextooltip").forEach( el => { el.remove(); });

        if( !this.lastSheinData || !this.lastSheinData.length ) {
            const header = LX.makeContainer( [ null, "auto" ], "flex flex-col border-top border-bottom gap-2 px-3 py-6", `
                <h1>No hay datos de SHEIN</h1>
            `, dom );
            return;
        }

        const row = this.lastSheinData[ rowOffset ];

        if( !row ) {
            const header = LX.makeContainer( [ null, "auto" ], "flex flex-col border-top border-bottom gap-2 px-3 py-6", `
                <h1>No hay más datos</h1>
            `, dom );
            return;
        }

        const header = LX.makeContainer( [ null, "auto" ], "flex flex-col border-top border-bottom gap-2 px-3 py-6", `
            <h2 class="flex flex-row items-center gap-1">Número del pedido: ${ row["Número del pedido"] }</h2>
            <p class="font-light fg-tertiary" style="height:auto"><strong>${ row["Nombre del producto"] ?? "Vacío" }</strong></p>
            <p class="font-light"><strong>SKU: ${ row["SKU del vendedor"] ?? "Vacío" }</strong> / <strong>${ row["Especificación"] }</strong></p>
            <p class="font-light">Precio: <strong>${ row["precio de los productos básicos"] }</strong></p>
        `, dom );

        const body = LX.makeContainer( [ null, "auto" ], "flex flex-col p-8 gap-0.5", `
            <div class="flex flex-row items-center gap-1"><p class="font-light fg-tertiary">Nombre Usuario</p><p class="flex flex-row items-center font-medium">${ row["Nombre de usuario completo"] ?? "Vacío" }</p></div>
            <div class="flex flex-row items-center gap-1"><p class="font-light fg-tertiary">Dirección</p><p class="flex flex-row items-center font-medium">${ row["dirección de usuario 1"] + ( row["dirección de usuario 2"] ? " " + row["dirección de usuario 2"] : "" ) }</p></div>
            <div class="flex flex-row items-center gap-1"><p class="font-light fg-tertiary">CP</p><p class="flex flex-row items-center font-medium">${ row["Código Postal"] ?? "Vacío" }</p></div>
            <div class="flex flex-row items-center gap-1"><p class="font-light fg-tertiary">Ciudad/Población</p><p class="flex flex-row items-center font-medium">${ row["Ciudad"] ?? "Vacío" }</p></div>
            <div class="flex flex-row items-center gap-1"><p class="font-light fg-tertiary">Provincia</p><p class="flex flex-row items-center font-medium">${ row["Provincia"] ?? "Vacío" }</p></div>
            <div class="flex flex-row items-center gap-1"><p class="font-light fg-tertiary">País</p><p class="flex flex-row items-center font-medium">${ row["País"] ?? "Vacío" }</p></div>
            <div class="flex flex-row items-center gap-1"><p class="font-light fg-tertiary">Teléfono</p><p class="flex flex-row items-center font-medium">${ row["Número de Teléfono"] ?? "Vacío" }</p></div>
            <div class="flex flex-row items-center gap-1"><p class="font-light fg-tertiary">Correo</p><p class="flex flex-row items-center font-medium">${ row["Correo electrónico de usuario"] ?? "Vacío" }</p></div>
        `, dom );

        for( let c of body.children )
        {
            const copyButtonWidget = new LX.Button(null, "CopyButton",  async function() {
                const textToCopy = this.root.parentElement.childNodes[ 1 ].innerText;
                navigator.clipboard.writeText( textToCopy ).then(() => {
                    LX.toast( "Copiado", "✅ Mensaje copiado al portapapeles.", { timeout: 5000, position: "top-left" } );
                }).catch(err => {
                    console.error('Error copying text: ', err);
                    LX.toast( "Error", "❌ No se pudo copiar el mensaje.", { timeout: -1, position: "top-left" } );
                });
                copyButtonWidget.root.querySelector( "input[type='checkbox']" ).style.pointerEvents = "none";

                LX.doAsync( () => {
                    copyButtonWidget.swap( true );
                    copyButtonWidget.root.querySelector( "input[type='checkbox']" ).style.pointerEvents = "auto";
                }, 3000 );
            }, { swap: "Check", icon: "Copy", title: "Copiar", tooltip: true } );
            copyButtonWidget.root.querySelector( ".swap-on svg" ).addClass( "fg-success" );
            c.appendChild( copyButtonWidget.root );
        }

        // Add button to copy NUMERO PEDIDO
        {
            const nPedidoH2 = header.querySelector( "h2" );
            const copyButtonWidget = new LX.Button(null, "CopyButton",  async function() {
                const textToCopy = nPedidoH2.innerText.substring( nPedidoH2.innerText.indexOf( ": " ) + 2 );
                navigator.clipboard.writeText( textToCopy ).then(() => {
                    LX.toast( "Copiado", "✅ Mensaje copiado al portapapeles.", { timeout: 5000, position: "top-left" } );
                }).catch(err => {
                    console.error('Error copying text: ', err);
                    LX.toast( "Error", "❌ No se pudo copiar el mensaje.", { timeout: -1, position: "top-left" } );
                });
                copyButtonWidget.root.querySelector( "input[type='checkbox']" ).style.pointerEvents = "none";

                LX.doAsync( () => {
                    copyButtonWidget.swap( true );
                    copyButtonWidget.root.querySelector( "input[type='checkbox']" ).style.pointerEvents = "auto";
                }, 3000 );
            }, { swap: "Check", icon: "Copy", title: "Copiar", tooltip: true } );
            copyButtonWidget.root.querySelector( ".swap-on svg" ).addClass( "fg-success" );
            nPedidoH2.appendChild( copyButtonWidget.root );
        }
        
        const footerPanel = new LX.Panel({ height: "auto", className: "bg-none bg-primary border-none p-2" });
        footerPanel.sameLine(3);
        footerPanel.addButton(null, "PrevButton", () => {
            this.showSingleSheinData( rowOffset - 1 );
        }, { width: "100px", icon: "ArrowLeft", title: "Anterior", tooltip: true, disabled: ( rowOffset === 0 ) });
        footerPanel.addText(null, `${ (rowOffset + 1) } / ${ this.lastSheinData.length }` , null, { inputClass: "bg-none", width: "100px", disabled: true });
        footerPanel.addButton(null, "NextButton", () => {
            this.showSingleSheinData( rowOffset + 1 );
        }, { width: "100px", icon: "ArrowRight", title: "Siguiente", tooltip: true, disabled: ( rowOffset === ( this.lastSheinData.length - 1 ) ) });

        dom.appendChild( footerPanel.root );
    },

    updateTransport: function( value ) {
        this.transport = value;

        if( this.rowOffset != undefined )
        {
            this.showMessages( this.compName, this.rowOffset );
        }
    },

    clearData: function()
    {
        console.log("Clearing data...");
        localStorage.removeItem( "lastTool" );

        this.data["otros"].list = [];
        this.data["jowy"].list = [];
        this.data["hxg"].list = [];
        this.data["bathby"].list = [];

        delete this.lastSheinData;

        // Clean tools
        this.updateLists();
        this.showSheinList([]);
        this.updateOrders();
    },

    updateLists: function()
    {
        this.showList( "otros" );
        this.showList( "bathby" );
        this.showList( "hxg" );
        this.showList( "jowy" );
    },

    updateOrders: function()
    {
        this.showOrders( "bathby", true );
        this.showOrders( "hxg", true );
        this.showOrders( "jowy", true );
    },

    showOrders: async function( compName, clean = false )
    {
        const dom = this.data[ compName ].domO;
        const wcc = this.data[ compName ].wcc;
        const name = this.data[ compName ].name;
        const url = this.data[ compName ].url;
        dom.innerHTML = "";

        if( clean )
        {
            return;
        }

        this.compName = compName;

        if( !wcc.connected )
        {
            this.openWooCommerceLogin( this.showOrders.bind( this, compName, clean ) );
            return;
        }

        const dialog = this.makeLoadingDialog("Cargando pedidos, espere...");

        const after = getDateNDaysAgo( this.ordersBeforeDays );
        const before = null;
        const r = await wcc.getAllOrdersByFilter( after, before, [ "processing", "on-hold" ] );
        console.log(r)

        this.setHeaderTitle( `Pedidos Web: <i>${ name }</i>`, `${r.length} pedidos (Últimos ${this.ordersBeforeDays} día/s)`, "Package" );

        dialog.destroy();

        // fecha, sku, desc (auto), cantidad, transporte (), "Web", pais, observaciones (num pedido)

        const columnData = [
            [ "paymethod", "PAGO", (r) => {
                // `payment_method_title`
                const b = new LX.Button(null, "Payment", null, { buttonClass: "bg-none", icon: "CircleDollarSign", title: r["payment_method_title"] });
                return b.root.innerHTML;
            } ],
            [ "date", "FECHA", (r) => {
                const d = new Date(r["date_created"]);
                return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
            } ],
            [ "sku", "REFERENCIA" ],
            [ "desc", "DESCRIPCIÓN", (r) => "" ],
            [ "quantity", "CANTIDAD" ],
            [ "transport", "TRANSPORTE", (r) => "CBL/SEUR/..." ],
            [ "platform", "PLATAFORMA", (r) => "Web" ],
            [ "country", "NOMBRE" ],
            [ "notes", "OBSERVACIONES", (r) => `${ r["number"] }${ r["status"] == "on-hold" ? " TRANSFERENCIA" : "" }` ]
        ];

        // Create table data from the list
        const tableData = r.map( row => {
            const lRow = [];
            for( let c of columnData )
            {
                const ogColName = c[ 0 ];
                if( row[ ogColName ] )
                {
                    const fn = c[ 2 ] ?? ( (str) => str );
                    lRow.push( fn( row[ ogColName ] ) );
                }
                else if( c[2] )
                {
                    const fn = c[ 2 ];
                    lRow.push( fn( row ) );
                }
                else
                {
                    const shippingInfo = row["shipping"];
                    const items = row["line_items"];
                    const item = items[ 0 ];

                    switch( ogColName )
                    {
                        case "sku":
                        {
                            // 1 item by now..
                            lRow.push( item["sku"] );
                            break;   
                        }
                        case "quantity":
                        {
                            // 1 item by now..
                            lRow.push( item["quantity"] );
                            break;   
                        }
                        case "country":
                        {
                            const ctr = shippingInfo["country"];
                            lRow.push( this.countryFormat[ctr] ?? ctr );
                            break;   
                        }
                        default:
                        {
                            lRow.push( "?" );
                        }
                    }
                }
            }
            return lRow;
        }).filter( v => v !== undefined );

        const date = new Date();
        const todayStringDate = `${ date.getDate() }/${ date.getMonth() + 1 }/${ date.getFullYear() }`;

        const tableWidget = new LX.Table(null, {
                head: columnData.map( c => {
                    return c[ 1 ] ?? c[ 0 ];
                }),
                body: tableData
            }, {
            selectable: false,
            sortable: false,
            toggleColumns: false,
            filter: "OBSERVACIONES",
            customFilters: [
                { name: "FECHA", type: "date", default: [ todayStringDate, todayStringDate ] },
            ],
            rowActions: [
                { icon: "Copy", title: "Copiar", callback: (rowData) => {
                    const tsv = rowData.join('\t');
                    navigator.clipboard.writeText( tsv ).then(() => {
                        LX.toast( "Copiado", `✅ "${ tsv }" copiado al portapapeles.`, { timeout: 5000, position: "top-left" } );
                    }).catch(err => {
                        console.error('Error copying text: ', err);
                        LX.toast( "Error", "❌ No se pudo copiar.", { timeout: -1, position: "top-left" } );
                    });
                }},
                { icon: "ExternalLink", title: "Abrir Pedido", callback: (rowData) => {
                    const orderNumber = rowData[7].split( " " )[0];
                    if( orderNumber !== "" ) window.open(`${ url }post.php?post=${ orderNumber }&action=edit`);
                }},
            ]
        });

        dom.appendChild( tableWidget.root );
    },

    redirectToOAuth: function()
    {
        // For now is read only
        const clientId = "851633355284-ecd2lk1f1v771sv18rkmrjvvup6752iq.apps.googleusercontent.com";
        const redirectUri = encodeURIComponent( window.location.origin + window.location.pathname );
        const scope = encodeURIComponent( "https://www.googleapis.com/auth/drive.readonly" );
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=token&client_id=${ clientId }&redirect_uri=${ redirectUri }&scope=${ scope }`;
        window.location.href = authUrl;
    },

    exportSEUR: function( ignoreErrors = false, sheinData )
    {
        const columnData = [
            [ "Número del pedido", null ],
            [ "ID del artículo", null ],
            [ "SKU del vendedor", null ],
            [ "Código Postal", null, ( str ) => str.replaceAll(/[ -]/g, "") ],
            [ "País", null ],
            [ "Provincia", null ],
            [ "Ciudad", null ],
            [ "dirección de usuario 1+dirección de usuario 2", "Dirección" ],
            [ "Nombre de usuario completo", null ],
            [ "Número de Teléfono", null ],
            [ "Correo electrónico de usuario", null ],
        ];

        const currentSheinData = sheinData ?? this.lastSheinData;

        // Process the xlsx first to detect empty fields
        if( !ignoreErrors )
        {
            const errorFields = [];
            currentSheinData.forEach( ( row, index ) => {
                for( let c of columnData )
                {
                    const ogColName = c[ 0 ];
                    if( ogColName.includes( '+' ) )
                    {
                        const tks = ogColName.split( '+' );

                        if( !row[ tks[ 0 ] ] )
                        {
                            errorFields.push( [ index, tks[ 0 ] ] );
                        }
                    }
                    else if( !row[ ogColName ] )
                    {
                        errorFields.push( [ index, ogColName ] );
                    }
                }
            });

            if( errorFields.length )
            {
                const dialog = new LX.Dialog( "❌ Solucionar errores", (p) => {
                    p.root.classList.add( "p-2" );

                    let columns = columnData.map( (c) => {
                        return c[ 0 ].split( "+" )[ 0 ];
                    });

                    const fixedData = LX.deepCopy( currentSheinData );

                    for( const [ errIndex, errName ] of errorFields )
                    {
                        p.addLabel( `No existe ${ errName } (${ fixedData[ errIndex ][ "Número del pedido" ] })` );
                        const possibleIndex = columns.indexOf( errName );
                        p.addSelect( errName, columns, columns[ possibleIndex ], (v) => {
                            fixedData[ errIndex ][ errName ] = fixedData[ errIndex ][ v ];
                        } );
                    }

                    p.addSeparator();
                    p.sameLine( 2 );
                    p.addButton( null, "Ignorar", () => {
                        dialog.close();
                        this.exportSEUR( true );
                    }, { width: "50%", buttonClass: "bg-error fg-white" } );
                    p.addButton( null, "Exportar", () => {
                        dialog.close();
                        this.exportSEUR( false, fixedData );
                    }, { width: "50%", buttonClass: "contrast" } );
                }, { modal: true } );

                return;
            }
        }

        const date = new Date();
        const day = `${ date.getDate() }`;
        const month = `${ date.getMonth() + 1 }`;
        const year = `${ date.getFullYear() }`;
        const todayStringDate = `${ "0".repeat( 2 - day.length ) }${ day }_${ "0".repeat( 2 - month.length ) }${ month }_${ year }`;
        const filename = `SEUR_${ this.tool.substring( 0, this.tool.indexOf("-") ).toUpperCase() }_${ todayStringDate }.xlsx`;

        let err = 0;
        let errMsg = "";
        let data = columnData.map( (c, index) => {
            return c[ 1 ] ?? c[ 0 ];
        });

        let errorFn = () => {
            LX.toast( "Error de exportación", `❌ No se pudo exportar el archivo "${ filename }. ${ errMsg }`, { timeout: -1, position: "top-left" } );
        };

        if( !currentSheinData?.length )
        {
            errMsg = `No existen datos.`;
            errorFn();
            return;
        }

        const orderNumbers = new Map();

        let rows = currentSheinData.map( ( row, index ) => {
            const lRow = [];
            for( let c of columnData )
            {
                const ogColName = c[ 0 ];

                if( ogColName === "Número del pedido" )
                {
                    const orderNumber = row[ ogColName ];

                    if( orderNumbers.has( orderNumber ) )
                    {
                        const val = orderNumbers.get( orderNumber );
                        orderNumbers.set( orderNumber, [ ...val, index ] );
                    }
                    else
                    {
                        orderNumbers.set( orderNumber, [ index ] );
                    }
                }

                if( ogColName.includes( '+' ) )
                {
                    const tks = ogColName.split( '+' );

                    if( !ignoreErrors && !row[ tks[ 0 ] ] )
                    {
                        err = 1;
                        errMsg = `No existen direcciones válidas (${ row[ "Número del pedido" ] }).`;
                        return;
                    }

                    lRow.push( `${ row[ tks[ 0 ] ] ?? "" }${ row[ tks[ 1 ] ] ? ` ${ row[ tks[ 1 ] ] }` : "" }` );
                }
                else
                {
                    if( !ignoreErrors && !row[ ogColName ] )
                    {
                        err = 1;
                        errMsg = `No existen datos de "${ ogColName } (${ row[ "Número del pedido" ] })".`;
                        return;
                    }

                    const fn = c[ 2 ] ?? ( (str) => str );
                    lRow.push( fn( row[ ogColName ] ?? "" ) );
                }
            }
            return lRow;
        });

        if( err === 1 )
        {
            errorFn();
            return;
        }

        const multipleItemsOrderNames = Array.from( orderNumbers.values() ).filter( v => v.length > 1 );

        for( const repeats of multipleItemsOrderNames )
        {
            const rest = repeats.slice( 1 );
            const trail = rest.reduce( (p, c) => p + ` + ${ rows[ c ][ 2 ] }`, "" );
            rest.forEach( r => { rows[ r ] = undefined } );
            rows[ repeats[ 0 ] ][ 2 ] += trail;
        }

        rows = rows.filter( r => r !== undefined );

        this.exportXLSXData( [ data, ...rows ], filename, ignoreErrors );
    },

    exportXLSXData: function( data, filename, ignoreErrors ) {

        if( !(data?.length) )
        {
            LX.toast( "Error", `❌ No se pudo exportar el archivo "${ filename }". No existen datos.`, { timeout: -1, position: "top-left" } );
            return;
        }

        const worksheet = XLSX.utils.aoa_to_sheet( data );
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet( workbook, worksheet, app.sheetName ?? "Sheet1" );
        XLSX.writeFile( workbook, filename );

        if( !ignoreErrors )
        {
            LX.toast( filename, "✅ Datos exportados correctamente!", { timeout: 5000, position: "top-left" } );
        }
    },

    getGoogleDriveFile: function( accessToken ) {

        if( !accessToken )
        {
            console.error("No access token provided");
            return;
        }

        const fileId = "1arBumQH2vuhLv8lQZnBdTj-h64BmUdjt";
        const fileUrl = `https://docs.google.com/spreadsheets/d/${ fileId }/export?format=xlsx`;

        this._request({
            url: fileUrl,
            dataType: "binary",  // get ArrayBuffer
            success: function(response) {
                // response = ArrayBuffer

                const workbook = XLSX.read(response, {type: "binary"});
                console.log("Sheet names:", workbook.SheetNames);
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const file = XLSX.utils.sheet_to_json(sheet, { raw: false });
                console.log(file);
            },
            error: function(err) {
                console.error("Download failed:", err);
            },
            headers: {
                "Authorization": `Bearer ${ accessToken }`
            }
        });
    },

    openWooCommerceLogin( callback ) {

        const compData = this.data[ this.compName ];

        const dialog = new LX.Dialog( compData.name + " WooComerce Login", (p) => {

            let ck = localStorage.getItem( this.compName + "_wooc_ck" ) ?? "";
            let cs = localStorage.getItem( this.compName + "_wooc_cs" ) ?? "";
            let store = this.data[ this.compName ].store;
            let spinner = null;

            p.addText("URL Tienda", store, (value, event) => {},{ disabled: true, nameWidth: "30%", skipReset: true });
            p.addText("Clave cliente", ck, (value, event) => {
                ck = value;
            }, { nameWidth: "30%", skipReset: true, type: "password" });
            p.addText("Clave secreta", cs, (value, event) => {
                cs = value;
            }, { nameWidth: "30%", skipReset: true, type: "password" });
            p.addButton(null, "Login", async (value, event) => {
                spinner = LX.makeIcon( "LoaderCircle", { iconClass: "flex p-2", svgClass: "xxl animate-spin" } );
                p.attach( spinner );
                const r = await this.configureWooCommerce( this.compName, store, ck, cs );
                if( r.ok )
                {
                    dialog.close();

                    if(callback)
                    {
                        callback();
                    }
                }
                else
                {
                    spinner.remove();
                    LX.emit( "@login_errors", "❌ Credenciales no válidas" );
                }
            }, { nameWidth: "30%", skipReset: true });
            p.addSeparator();
            p.addTextArea( null, "", null, { disabled: true, fitHeight: true, signal: "@login_errors" } )

        }, { modal: true, position: [ "calc(50% - 200px)", "250px" ], size: ["400px", null], closable: true, draggable: false });
    },

    async configureWooCommerce( compName, store, ck, cs ) {

        const wcc = this.data[ compName ].wcc;
        const r = await wcc.configure( store, ck, cs );
        if( r.ok )
        {
            LX.toast( "Login correcto", `✅ Has iniciado sesión en ${ store }`, { timeout: 5000, position: "top-left" } );

            // Store in localStorage
            localStorage.setItem( compName + "_wooc_ck", ck );
            localStorage.setItem( compName + "_wooc_cs", cs );
        }

        return r;
    },

    makeLoadingDialog( title )
    {
        return new LX.Dialog( title ?? "Acción en curso, espere...", (p) => {
            let spinner = LX.makeIcon( "LoaderCircle", { iconClass: "flex p-2", svgClass: "xxl animate-spin" } );
            p.attach( spinner );
        }, { modal: true, position: [ "calc(50% - 150px)", "250px" ], size: ["300px", null], closable: false, draggable: false });
    },

    _request: function( request ) {

        var dataType = request.dataType || "text";
        if(dataType == "json") //parse it locally
            dataType = "text";
        else if(dataType == "xml") //parse it locally
            dataType = "text";
        else if (dataType == "binary")
        {
            //request.mimeType = "text/plain; charset=x-user-defined";
            dataType = "arraybuffer";
            request.mimeType = "application/octet-stream";
        }

        //regular case, use AJAX call
        var xhr = new XMLHttpRequest();
        xhr.open( request.data ? 'POST' : 'GET', request.url, true);
        if(dataType)
            xhr.responseType = dataType;
        if (request.mimeType)
            xhr.overrideMimeType( request.mimeType );
        if( request.nocache )
            xhr.setRequestHeader('Cache-Control', 'no-cache');
        if( request.headers )
            for( var i in request.headers )
                xhr.setRequestHeader( i, request.headers[ i ] );

        xhr.onload = function(load)
        {
            var response = this.response;
            if( this.status != 200)
            {
                var err = "Error " + this.status;
                if(request.error)
                    request.error(err);
                return;
            }

            if(request.dataType == "json") //chrome doesnt support json format
            {
                try
                {
                    response = JSON.parse(response);
                }
                catch (err)
                {
                    if(request.error)
                        request.error(err);
                    else
                        throw err;
                }
            }
            else if(request.dataType == "xml")
            {
                try
                {
                    var xmlparser = new DOMParser();
                    response = xmlparser.parseFromString(response,"text/xml");
                }
                catch (err)
                {
                    if(request.error)
                        request.error(err);
                    else
                        throw err;
                }
            }
            if(request.success)
                request.success.call(this, response, this);
        };
        xhr.onerror = function(err) {
            if(request.error)
                request.error(err);
        }

        var data = new FormData();
        if( request.data )
        {
            for( var i in request.data)
                data.append(i,request.data[ i ]);
        }

        xhr.send( data );
        return xhr;
    }
};

// Message templates

app.data["jowy"].template = ( id, url, transport ) => {
    return `<p><strong>Tu pedido ha sido enviado a trav&eacute;s de ${ transport ?? app.transport }:</strong></p>
<ul>
<li><strong>N&ordm; de env&iacute;o:</strong> ${ id }</li>
</ul>
<p style="word-break: break-word;text-decoration: none; border-radius: 12px; font-size: 16px; font-family: Helvetica,Arial,sans-serif; padding: 12px; max-width: 300px; background-color: #e94343; text-align: center; display: flex; flex-direction: column; letter-spacing: -0.05rem;">
<a href="${ url }" style="background: none;text-decoration: none;color: #e0e0e0ff;"><strong>HAZ CLIC AQUÍ PARA SEGUIR TU PEDIDO</strong></a>
<a style="border-bottom:1px solid #736060; margin-block: 0.5rem;"></a>
<a href="https://www.jowyoriginals.com/" style="background: none;text-decoration: none;color: #d8c1c1ff;">jowyoriginals.com</a>
</p>`;
}

app.data["hxg"].template = ( id, url, transport ) => {
    return `<p><strong>Tu pedido ha sido enviado a trav&eacute;s de ${ transport ?? app.transport }:</strong></p>
<ul>
<li><strong>N&ordm; de env&iacute;o:</strong> ${ id }</li>
</ul>
<p style="word-break: break-word;text-decoration: none; border-radius: 24px; font-size: 16px; font-family: Helvetica,Arial,sans-serif; padding: 12px; max-width: 300px; background-color: #FFC844; text-align: center; display: flex; flex-direction: column; letter-spacing: -0.05rem;">
<a href="${ url }" style="background: none;text-decoration: none;color: #222;"><strong>HAZ CLIC AQUÍ PARA SEGUIR TU PEDIDO</strong></a>
<a style="border-bottom:1px solid #927124; margin-block: 0.5rem;"></a>
<a href="https://homexgym.com/" style="background: none;text-decoration: none;color: #927124;">homexgym.com</a>
</p>`;
}

app.data["bathby"].template = ( id, url, transport ) => {
    return `<p><strong>Tu pedido ha sido enviado a trav&eacute;s de ${ transport ?? app.transport }:</strong></p>
<ul>
<li><strong>N&ordm; de env&iacute;o:</strong> ${ id }</li>
</ul>
<p style="word-break: break-word;text-decoration: none; border-radius: 24px; font-size: 16px; font-family: Helvetica,Arial,sans-serif; padding: 12px; max-width: 300px; background-color: #e7c5d2ff; text-align: center; display: flex; flex-direction: column; letter-spacing: -0.05rem;">
<a href="${ url }" style="background: none;text-decoration: none;color: #222;"><strong>HAZ CLIC AQUÍ PARA SEGUIR TU PEDIDO</strong></a>
<a style="border-bottom:1px solid #736060; margin-block: 0.5rem;"></a>
<a href="https://bathby.com/" style="background: none;text-decoration: none;color: #83596bff;">bathby.com</a>
</p>`;
}

// Create common UI
{
    const parallax = LX.makeElement( "div", "parallax-bg", "", document.body );

    const area = await LX.init( { layoutMode: "document", rootClass: "wrapper" } );
    const starterTheme = LX.getTheme();

    const menubar = area.addMenubar( [
        { name: "Seguimiento", callback: app.openTrackingMessagesApp.bind( app ) },
        { name: "Seur", submenu: [
            { name: "Shein", callback: app.openDataToSeurApp.bind( app ), icon: "Strikethrough" },
            { name: "Decathlon", disabled: true, callback: app.openDataToSeurApp.bind( app ), icon: "Volleyball" }
            
        ] },
        { name: "Pedidos Web", callback: app.openOrdersApp.bind( app ), icon: "Package" }
        // { name: "Calculadora", callback: app.redirectToOAuth.bind( app ) }
    ] );

    menubar.setButtonImage("bathby", `data/bathby_${ starterTheme }.png`, () => { window.open("https://bathby.com/wp-admin/") }, { float: "left" });
    menubar.setButtonImage("hxg", `data/hxg_${ starterTheme }.png`, () => { window.open("https://homexgym.com/wp-admin/") }, { float: "left" });
    menubar.setButtonImage("jowy", `data/jowy_${ starterTheme }.png`, () => { window.open("https://www.jowyoriginals.com/wp-admin/") }, { float: "left" });

    // const commandButton = new LX.Select("Transporte", transportOptions, `CBL`, (v) => { app.updateTransport( v ) }, {
    //     width: "256px", nameWidth: "45%", className: "right", overflowContainer: null, skipReset: true }
    // );
    // menubar.root.appendChild( commandButton.root );

    menubar.addButtons( [
        {
            title: "Switch Theme",
            icon: starterTheme == "dark" ? "Moon" : "Sun",
            swap: starterTheme == "dark" ? "Sun" : "Moon",
            callback:  (value, event) => {
                LX.switchTheme();
                const newTheme = LX.getTheme();
                menubar.setButtonImage("bathby", `data/bathby_${ newTheme }.png`);
                menubar.setButtonImage("hxg", `data/hxg_${ newTheme }.png`);
                menubar.setButtonImage("jowy", `data/jowy_${ newTheme }.png`);
                app.header.style.background = `url('data/banner_${ newTheme }.png') no-repeat center center / cover`;
            }
        },
        // {
        //     title: "Login WooComerce",
        //     icon: "User",
        //     callback:  (value, event) => {
                
        //     }
        // }
    ], { float: "center" });

    app.init( menubar.siblingArea );
}


window.app = app;