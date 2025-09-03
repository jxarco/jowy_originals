import { LX } from 'lexgui';

window.LX = LX;

const cblTrackingUrl = `https://clientes.cbl-logistica.com/public/consultaenvio.aspx`;
const seurTrackingUrl = `https://www.seur.com/miseur/mis-envios`;
const glsTrackingUrl = `https://gls-group.com/ES/es/seguimiento-envio/`;
const transportOptions = ["CBL", "SEUR"];//, "GLS"];
const companyOptions = ["Jowy", "HxG", "Bathby"];

const app = {

    transport: "CBL", // Default transport
    sheetName: "",

    data: {
        "amazon": { list: [], dom: null },
        "jowy": { list: [], dom: null },
        "hxg": { list: [], dom: null },
        "bathby": { list: [], dom: null },
    },

    init: function( appArea ) {

        this.area = appArea;

        this.createHeaderHtml();
        this.createContentHtml();
        this.createFooterHtml();

        const hash = window.location.hash.substr(1); // remove leading #
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
            else if( lastTool === "shein-data" ) {
                this.openSHEINData();
            }
        }
    },

    createHeaderHtml: function() {
        const header = LX.makeContainer( [ null, "auto" ], "flex flex-col border-top border-bottom gap-2 px-6 py-12", `
            <div style="display:flex;flex-direction:row;gap:0.5rem;align-items:center;">${ LX.makeIcon("Info", { svgClass: "xxl" }).innerHTML }<h1>Jowy Originals</h1></div>
            <p class="font-light" style="max-width:32rem">Elige una de las herramientas para empezar.</p>
        `, this.area );

        // add file drag and drop event to header
        header.addEventListener("dragover", (event) => {
            event.preventDefault();
            event.stopPropagation();
            header.classList.add("bg-secondary");
        });

        header.addEventListener("dragleave", (event) => {
            event.preventDefault();
            event.stopPropagation();
            header.classList.remove("bg-secondary");
        });

        header.addEventListener("drop", (event) => {
            event.preventDefault();
            event.stopPropagation();
            header.classList.remove("bg-secondary");

            // Check if a file was dropped
            if (event.dataTransfer.files.length > 0) {
                const file = event.dataTransfer.files[0];
                if (file.name.endsWith('.xlsx')) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const data = e.target.result;
                        const workbook = XLSX.read(data, {type: "binary"});
                        app.sheetName = workbook.SheetNames[0];
                        const sheet = workbook.Sheets[ app.sheetName ];
                        if( app.processData( XLSX.utils.sheet_to_json(sheet, { raw: false }) ) )
                        {
                            LX.toast( file.name, "✅ Datos cargados correctamente!", { timeout: 3000 } );
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
        this.header.querySelector( "div" ).innerHTML = `${ LX.makeIcon( icon ?? "Info" , { svgClass: "xxl" }).innerHTML }<h1>${ title }</h1>`;
        this.header.querySelector( "p" ).innerHTML = subtitle ?? "";
    },

    createContentHtml: function() {

        this.createTrackingMessagesContentHtml();
        this.updateLists();

        this.createSheinDataContentHtml();
        this.showSheinList( [] );
    },

    createTrackingMessagesContentHtml: function() {

        const area = new LX.Area( { skipAppend: true } );
        this.area.attach( area );

        // Create utility buttons
        {
            const utilButtonsPanel = new LX.Panel({ height: "auto", className: "bg-none bg-primary border-none p-2" });
            utilButtonsPanel.sameLine(3);

            const messageFromTrackIdButton = utilButtonsPanel.addButton(null, "CopyButton",  async () => {
                this.openMessageDialog();
            }, { icon: "Plus", title: "Nuevo mensaje", tooltip: true } );

            const seeMessagesButton = utilButtonsPanel.addButton(null, "SeeMessagesButton", () => {
                if( this.compName !== "amazon" ) this.showMessages( this.compName, 0 );
            }, { icon: "Eye", title: "Ver mensajes", tooltip: true });

            const clearButtonWidget = utilButtonsPanel.addButton(null, "ClearButton", () => {
                this.clearData();
            }, { icon: "Trash2", title: "Limpiar datos anteriores", tooltip: true });

            // const helpButtonWidget = utilButtonsPanel.addButton(null, "HelpButton", () => {

            //     const exampleTour = new LX.Tour([
            //         {
            //             title: "Listado de envíos",
            //             content: "Primero sube el listado de envíos arrastrándolo aquí.",
            //             reference: this.header,
            //             side: "bottom",
            //             align: "center"
            //         },
            //         {
            //             title: "Elige la empresa",
            //             content: "El listado se divide por empresa, elige la que quieras ver.",
            //             reference: this.tabs,
            //             side: "bottom",
            //             align: "center"
            //         },
            //         {
            //             title: "Copiar mensajes",
            //             content: "En la tabla, haz clic en el icono de ojo para ver el mensaje de seguimiento.",
            //             reference: document.querySelector(".lextable"),
            //             side: "top",
            //             align: "start"
            //         }
            //     ], { offset: 4, xradius: 12 });

            //     exampleTour.begin();

            // }, { icon: "CircleQuestionMark", title: "Ayuda", tooltip: true });

            area.attach( utilButtonsPanel.root );
        }

        const tabs = area.addTabs( { parentClass: "p-4", sizes: [ "auto", "auto" ], contentClass: "p-6 pt-0" } );
        this.tabs = tabs.root;

        // Jowy
        {
            const jowyContainer = LX.makeContainer( [ null, "auto" ], "flex flex-col relative bg-primary border rounded-lg overflow-hidden" );
            tabs.add( "Jowy", jowyContainer, { selected: true, onSelect: (event, name) => this.showList( name.toLowerCase() ) } );

            const jowyArea = new LX.Area({ className: "rounded-lg" });
            jowyContainer.appendChild( jowyArea.root );
            this.data["jowy"].dom = jowyContainer;
        }

        // HxG
        {
            const hxgContainer = LX.makeContainer( [ null, "auto" ], "flex flex-col relative bg-primary border rounded-lg overflow-hidden" );
            tabs.add( "HxG", hxgContainer, { xselected: true, onSelect: (event, name) => this.showList( name.toLowerCase() ) } );

            const hxgArea = new LX.Area({ className: "rounded-lg" });
            hxgContainer.appendChild( hxgArea.root );
            this.data["hxg"].dom = hxgContainer;
        }

        // Bathby
        {
            const bathbyContainer = LX.makeContainer( [ null, "auto" ], "flex flex-col relative bg-primary border rounded-lg overflow-hidden" );
            tabs.add( "Bathby", bathbyContainer, { xselected: true, onSelect: (event, name) => this.showList( name.toLowerCase() ) } );

            const bathbyArea = new LX.Area({ className: "rounded-lg" });
            bathbyContainer.appendChild( bathbyArea.root );
            this.data["bathby"].dom = bathbyContainer;
        }

        // Amazon
        {
            const amazonContainer = LX.makeContainer( [ null, "auto" ], "flex flex-col relative bg-primary border rounded-lg overflow-hidden" );
            tabs.add( "Amazon", amazonContainer, { xselected: true, onSelect: (event, name) => this.showList( name.toLowerCase() ) } );

            const amazonArea = new LX.Area({ className: "rounded-lg" });
            amazonContainer.appendChild( amazonArea.root );
            this.data["amazon"].dom = amazonContainer;
        }

        area.root.classList.add( "hidden" );
        this.trackingMessagesArea = area;
    },

    createSheinDataContentHtml: function() {

        const area = new LX.Area( { skipAppend: true } );
        this.area.attach( area );

         // Create utility buttons
        {
            const utilButtonsPanel = new LX.Panel({ height: "auto", className: "bg-none bg-primary border-none p-2" });
            utilButtonsPanel.sameLine(3);

            const startButton = utilButtonsPanel.addButton(null, "StartButton", () => {
                this.showSingleSheinData();
            }, { icon: "Eye", title: "Ver información detallada", tooltip: true } );

            const clearButtonWidget = utilButtonsPanel.addButton(null, "ClearButton", () => {
                this.clearData();
            }, { icon: "Trash2", title: "Limpiar datos anteriores", tooltip: true });

            const exportButtonWidget = utilButtonsPanel.addButton(null, "ExportButton", () => {

                const columnData = [
                    [ "Número del pedido", null ],
                    [ "ID del artículo", null ],
                    [ "SKU del vendedor", null ],
                    [ "Código Postal", null ],
                    [ "País", null ],
                    [ "Provincia", null ],
                    [ "Ciudad", null ],
                    [ "dirección de usuario 1+dirección de usuario 2", "Dirección" ],
                    [ "Nombre de usuario completo", null ],
                    [ "Número de Teléfono", null ],
                    [ "Correo electrónico de usuario", null ],
                ];

                const date = new Date();
                const day = `${ date.getDate() }`;
                const month = `${ date.getMonth() + 1 }`;
                const year = `${ date.getFullYear() }`;
                const todayStringDate = `${ "0".repeat( 2 - day.length ) }${ day }_${ "0".repeat( 2 - month.length ) }${ month }_${ year }`;
                const filename = `SEUR_SHEIN_${ todayStringDate }.xlsx`;

                let err = 0;
                let data = columnData.map( (c, index) => {
                    return c[ 1 ] ?? c[ 0 ];
                });

                let errorFn = () => {
                    LX.toast( "Error", `❌ No se pudo exportar el archivo "${ filename }".`, { timeout: -1 } );
                };

                if( !this.lastSheinData?.length )
                {
                    errorFn();
                    return;
                }

                const orderNumbers = new Map();

                let rows = this.lastSheinData.map( ( row, index ) => {
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

                            if( !row[ tks[ 0 ] ] )
                            {
                                err = 1;
                                return;
                            }

                            lRow.push( `${ row[ tks[ 0 ] ] }${ row[ tks[ 1 ] ] ? ` ${ row[ tks[ 1 ] ] }` : "" }` );
                        }
                        else
                        {
                            if( !row[ ogColName ] )
                            {
                                err = 1;
                                return;
                            }

                            lRow.push( row[ ogColName ] );
                        }
                    }
                    return lRow;
                })

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

                this.exportXLSXData( [ data, ...rows ], filename );

            }, { icon: "Download", title: "Exportar datos SEUR", tooltip: true });

            // const helpButtonWidget = utilButtonsPanel.addButton(null, "HelpButton", () => {

            //     const exampleTour = new LX.Tour([
            //         {
            //             title: "Listado de envíos",
            //             content: "Primero sube el listado de envíos arrastrándolo aquí.",
            //             reference: this.header,
            //             side: "bottom",
            //             align: "center"
            //         },
            //         {
            //             title: "Elige la empresa",
            //             content: "El listado se divide por empresa, elige la que quieras ver.",
            //             reference: this.tabs,
            //             side: "bottom",
            //             align: "center"
            //         },
            //         {
            //             title: "Copiar mensajes",
            //             content: "En la tabla, haz clic en el icono de ojo para ver el mensaje de seguimiento.",
            //             reference: document.querySelector(".lextable"),
            //             side: "top",
            //             align: "start"
            //         }
            //     ], { offset: 4, xradius: 12 });

            //     exampleTour.begin();

            // }, { icon: "CircleQuestionMark", title: "Ayuda", tooltip: true });

            area.attach( utilButtonsPanel.root );
        }
        
        this.sheinDataArea = area;
    },

    createFooterHtml: function() {

        this.footer = new LX.Footer( {
            className: "border-top",
            parent: LX.root,
            credits: `${ new Date().getUTCFullYear() } Alex Rodríguez.`,
            socials: [
                { title: "Github", link: "https://github.com/jxarco/", icon: "Github" }
            ]
        } );

    },

    openTrackingMessagesApp: function() {

        this.setHeaderTitle( "Mensajes de seguimiento", "Arrastra un <strong>.xlsx</strong> aquí para cargar un nuevo listado de envíos.", "MessageSquarePlus" );

        this.trackingMessagesArea.root.classList.toggle( "hidden", false );
        this.sheinDataArea.root.classList.toggle( "hidden", true );

        this.tool = "tracking-messages";
        localStorage.setItem( "lastTool", this.tool );
    },

    openSHEINData: function() {

        this.setHeaderTitle( "Envíos SHEIN", "Arrastra un <strong>.xlsx</strong> aquí para cargar un nuevo listado de envíos.", "MessageSquarePlus" );

        this.trackingMessagesArea.root.classList.toggle( "hidden", true );
        this.sheinDataArea.root.classList.toggle( "hidden", false );

        this.tool = "shein-data";
        localStorage.setItem( "lastTool", this.tool );
    },

    processData: function( fileData, local ) {

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
                    case '1': this.data["amazon"].list.push( row ); break;
                    case '2': this.data["jowy"].list.push( row ); break;
                    case '3': this.data["hxg"].list.push( row ); break;
                    case '4': this.data["bathby"].list.push( row ); break;
                }
            }

            if( err === null )
            {
                this.updateLists();
            }
        }
        else if( this.tool == "shein-data" )
        {
            this.showSheinList( fileData );
        }
        
        if( err !== null )
        {
            LX.toast( "❌ Error", err );
            return false;
        }

        return true;
    },

    showList: function( compName ) {
        const dom = this.data[ compName ].dom;
        const list = this.data[ compName ].list;
        dom.innerHTML = "";

        const columnData = [
            [ "DIA", null ],
            [ "F_DOC", null ],
            [ "NENVIO", null ],
            [ "CLAVE", null ],
            [ "F_SITUACION", null ],
            [ "NOMCONS", "NOMBRE" ],
            [ "POBLACION", null ],
            [ "DETALLE", null ],
            [ "LOCALIZADOR", null ]
        ];

        // Create table data from the list
        const tableData = list.map( row => {
            const lRow = [];
            for( let c of columnData )
            {
                const ogColName = c[ 0 ];
                lRow.push( row[ ogColName ] ?? "?" );
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
                { name: "CLAVE", options: ["Documentada", "En tránsito", "En destino", "En reparto", "Entregada"] },
                { name: "F_DOC", type: "date" },
                { name: "F_SITUACION", type: "date" }
            ],
            rowActions: compName != "amazon" ? [
                { icon: "Eye", title: "Ver mensaje", callback: (rowData) => {
                    const rowIndex = tableData.indexOf(rowData);
                    this.showMessages( compName, rowIndex );
                }},
                // "menu"
            ] : []
        });

        dom.appendChild( tableWidget.root );

        this.compName = compName;
        this.rowOffset = undefined;
    },

    showMessages: function( compName, rowOffset = 0 ) {
        const dom = this.data[ compName ].dom;
        const list = this.data[ compName ].list;
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

        const header = LX.makeContainer( [ null, "auto" ], "flex flex-col border-top border-bottom gap-2 px-3 py-6", `
            <h2 class="flex flex-row items-center gap-1">${ row["NOMCONS"] }</h2>
            <div class="flex flex-row items-center gap-1"><p class="font-light fg-tertiary">Población</p><p class="flex flex-row items-center font-medium">${ row["POBLACION"] }</p></div>
            <div class="flex flex-row items-center gap-1"><p class="font-light fg-tertiary">Clave</p><p class="flex flex-row items-center font-medium">${ row["CLAVE"] }</p></div>
            <div class="flex flex-row items-center gap-1"><p class="font-light fg-tertiary">Número de envío</p><p class="flex flex-row items-center font-medium">${ row["NENVIO"] }</p></div>
            <div class="flex flex-row items-center gap-1"><p class="font-light fg-tertiary">Referencia</p><p class="flex flex-row items-center font-medium">${ row["REFERENCIA"] ?? "Vacío" }</p></div>
        `, dom );

        // Add button to copy NOMBRE USUARIO
        {
            const nPedidoH2 = header.querySelector( "h2" );
            const copyButtonWidget = new LX.Button(null, "CopyButton",  async function() {
                navigator.clipboard.writeText( nPedidoH2.innerText ).then(() => {
                    LX.toast( "Copiado", "✅ Mensaje copiado al portapapeles.", { timeout: 3000 } );
                }).catch(err => {
                    console.error('Error copying text: ', err);
                    LX.toast( "Error", "❌ No se pudo copiar el mensaje.", { timeout: -1 } );
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
        const body = LX.makeContainer( [ null, "auto" ], "p-6", templateString, dom );

        const footerPanel = new LX.Panel({ height: "auto", className: "bg-none bg-primary border-none p-2" });
        footerPanel.sameLine(2);

        const copyButtonWidget = footerPanel.addButton(null, "CopyButton",  async () => {
            navigator.clipboard.writeText( templateString ).then(() => {
                LX.toast( "Copiado", "✅ Mensaje copiado al portapapeles.", { timeout: 3000 } );
            }).catch(err => {
                console.error('Error copying text: ', err);
                LX.toast( "Error", "❌ No se pudo copiar el mensaje.", { timeout: -1 } );
            });
            copyButtonWidget.root.querySelector( "input[type='checkbox']" ).style.pointerEvents = "none";

            LX.doAsync( () => {
                copyButtonWidget.swap( true );
                copyButtonWidget.root.querySelector( "input[type='checkbox']" ).style.pointerEvents = "auto";
            }, 3000 );

        }, { width: "100px", swap: "Check", icon: "Copy", title: "Copiar", tooltip: true } );
        copyButtonWidget.root.querySelector( ".swap-on svg" ).addClass( "fg-success" );

        const nextButtonWidget = footerPanel.addButton(null, "NextButton", () => {
            this.showMessages( compName, rowOffset + 1 );
        }, { width: "100px", icon: "ArrowRight", title: "Siguiente", tooltip: true });
        dom.appendChild( footerPanel.root );

        this.compName = compName;
        this.rowOffset = rowOffset;
    },

    openMessageDialog: function() {

        const dialogClosable = new LX.Dialog("Nuevo Mensaje de Seguimiento", dialogPanel => {

            const dialogArea = new LX.Area({ className: "" });
            dialogPanel.attach( dialogArea.root );
            const [ left, right ] = dialogArea.split({ type: "horizontal", sizes: [ "50%", "50%" ], resize: false });

            let t = this.transport, id = 123456789, c = "Jowy";

            let p = new LX.Panel({ className: "bg-none bg-primary border-none p-2" });
            p.addSelect("Empresa", companyOptions, c, (value, event) => {
                c = value;
                body.innerHTML = getTemplate();
            }, { nameWidth: "50%", skipReset: true });
            p.addSelect("Transporte", transportOptions, t, (value, event) => {
                t = value;
                body.innerHTML = getTemplate();
            }, { nameWidth: "50%", skipReset: true });
            p.addNumber("Número seguimiento", id, (value, event) => {
                id = value;
                body.innerHTML = getTemplate();
            }, { nameWidth: "50%" });
            p.addSeparator();

            const copyButtonWidget = p.addButton(null, "CopyButton",  async () => {
                navigator.clipboard.writeText( body.innerHTML ).then(() => {
                    LX.toast( "Copiado", "✅ Mensaje copiado al portapapeles.", { timeout: 3000 } );
                }).catch(err => {
                    console.error('Error copying text: ', err);
                    LX.toast( "Error", "❌ No se pudo copiar el mensaje.", { timeout: -1 } );
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
                if( comp == "amazon" ) return "";
                let url = cblTrackingUrl;
                switch( t )
                {
                    case 'SEUR': url = seurTrackingUrl; break;
                    case "GLS": url = glsTrackingUrl; break;
                }

                const template = this.data[ comp ].template;
                return template( id, url, t );
            };

            const body = LX.makeContainer( [ null, "auto" ], "p-8", "", right );
            body.innerHTML = getTemplate();

        }, { modal: true, size: ["800px", null], closable: true, draggable: false });
    },

    showSheinList: function( data ) {

        const dom = this.sheinDataArea.root;
        while (dom.children.length > 1) {
            dom.removeChild(dom.children[1]);
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
            filter: "ID del artículo",
            // customFilters: [
            //     { name: "Precio", type: "range", min: 0, max: 200, step: 1, units: "€" }
            // ],
        });

        dom.appendChild( tableWidget.root );

        this.lastSheinData = data;
    },

    showSingleSheinData( rowOffset ) {

        rowOffset = rowOffset ?? 0;

        const dom = this.sheinDataArea.root;
        while (dom.children.length > 1) {
            dom.removeChild(dom.children[1]);
        }

        // hack to remove all tooltips
        document.querySelectorAll(".lextooltip").forEach( el => { el.remove(); });

        // const columnData = [
        //     [ "Número del pedido", "N. Pedido" ],
        //     [ "SKU del vendedor", "SKU vendedor" ],
        //     [ "Nombre del producto", "Producto" ],
        //     [ "Especificación", null ],
        //     [ "precio de los productos básicos", "Precio" ],
        //     [ "Código Postal", "CP" ],
        //     [ "País", null ],
        //     [ "Provincia", null ],
        //     [ "Ciudad", null ],
        //     [ "dirección de usuario 1+dirección de usuario 2", "Dirección" ],
        //     [ "Nombre de usuario completo", "Nombre usuario" ],
        //     [ "Número de Teléfono", "Teléfono" ],
        //     [ "Correo electrónico de usuario", "Correo" ],
        // ];

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
            <p class="font-light fg-tertiary" style="height:42px"><strong>${ row["Nombre del producto"] ?? "Vacío" }</strong></p>
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
                    LX.toast( "Copiado", "✅ Mensaje copiado al portapapeles.", { timeout: 3000 } );
                }).catch(err => {
                    console.error('Error copying text: ', err);
                    LX.toast( "Error", "❌ No se pudo copiar el mensaje.", { timeout: -1 } );
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
                    LX.toast( "Copiado", "✅ Mensaje copiado al portapapeles.", { timeout: 3000 } );
                }).catch(err => {
                    console.error('Error copying text: ', err);
                    LX.toast( "Error", "❌ No se pudo copiar el mensaje.", { timeout: -1 } );
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

    clearData: function() {
        console.log("Clearing data...");
        localStorage.removeItem( "lastTool" );

        this.data["amazon"].list = [];
        this.data["jowy"].list = [];
        this.data["hxg"].list = [];
        this.data["bathby"].list = [];

        delete this.lastSheinData;

        // Clean tracking tool
        this.updateLists();

        // Clean SHEIN tool
        this.showSheinList( [] );
    },

    updateLists: function() {
        this.showList( "amazon" );
        this.showList( "bathby" );
        this.showList( "hxg" );
        this.showList( "jowy" );
    },

    redirectToOAuth: function() {

        // For now is read only

        const clientId = "851633355284-ecd2lk1f1v771sv18rkmrjvvup6752iq.apps.googleusercontent.com";
        const redirectUri = encodeURIComponent( window.location.origin + window.location.pathname );
        const scope = encodeURIComponent( "https://www.googleapis.com/auth/drive.readonly" );
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=token&client_id=${ clientId }&redirect_uri=${ redirectUri }&scope=${ scope }`;
        window.location.href = authUrl;
    },

    exportXLSXData: function( data, filename ) {

        if( !(data?.length) )
        {
            LX.toast( "Error", `❌ No se pudo exportar el archivo "${ filename }".`, { timeout: -1 } );
            return;
        }

        const worksheet = XLSX.utils.aoa_to_sheet( data );
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet( workbook, worksheet, app.sheetName ?? "Sheet1" );
        XLSX.writeFile( workbook, filename );
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
<p style="text-decoration: none; font-size: 16px; font-family: Helvetica,Arial,sans-serif; padding: 12px; max-width: 300px; background-color: #FDC645; text-align: center; display: flex; flex-direction: column; letter-spacing: -0.05rem;">
<a href="${ url }" style="background: none;text-decoration: none;color: #222;"><strong>HAZ CLIC AQUÍ PARA SEGUIR TU PEDIDO</strong></a>
<a style="border-bottom:1px solid #736060; margin-block: 0.5rem;"></a>
<a href="https://www.jowyoriginals.com/" style="background: none;text-decoration: none;color: #927124;">jowyoriginals.com</a>
</p>`;
}

app.data["hxg"].template = ( id, url, transport ) => {
    return `<p><strong>Tu pedido ha sido enviado a trav&eacute;s de ${ transport ?? app.transport }:</strong></p>
<ul>
<li><strong>N&ordm; de env&iacute;o:</strong> ${ id }</li>
</ul>
<p style="text-decoration: none; border-radius: 25px; font-size: 16px; font-family: Helvetica,Arial,sans-serif; padding: 12px; max-width: 300px; background-color: #FFC844; text-align: center; display: flex; flex-direction: column; letter-spacing: -0.05rem;">
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
<p style="text-decoration: none; border-radius: 25px; font-size: 16px; font-family: Helvetica,Arial,sans-serif; padding: 12px; max-width: 300px; background-color: #F2D1D1; text-align: center; display: flex; flex-direction: column; letter-spacing: -0.05rem;">
<a href="${ url }" style="background: none;text-decoration: none;color: #222;"><strong>HAZ CLIC AQUÍ PARA SEGUIR TU PEDIDO</strong></a>
<a style="border-bottom:1px solid #736060; margin-block: 0.5rem;"></a>
<a href="https://bathby.com/" style="background: none;text-decoration: none;color: #736060;">bathby.com</a>
</p>`;
}

// Create common UI
{
    const area = await LX.init( { layoutMode: "document", rootClass: "wrapper" } );
    const starterTheme = LX.getTheme();

    const menubar = area.addMenubar( [
        { name: "Seguimiento", callback: app.openTrackingMessagesApp.bind( app ) },
        { name: "SHEIN", callback: app.openSHEINData.bind( app ) },
        { name: "Calculadora", callback: app.redirectToOAuth.bind( app ) }
    ] );

    menubar.setButtonImage("bathby", `data/bathby_${ starterTheme }.png`, () => { window.open("https://bathby.com/wp-admin/") }, { float: "left" });
    menubar.setButtonImage("hxg", `data/hxg_${ starterTheme }.png`, () => { window.open("https://homexgym.com/wp-admin/") }, { float: "left" });
    menubar.setButtonImage("jowy", `data/jowy_${ starterTheme }.png`, () => { window.open("https://www.jowyoriginals.com/wp-admin/") }, { float: "left" });

    const commandButton = new LX.Select("Transporte", transportOptions, `CBL`, (v) => { app.updateTransport( v ) }, {
        width: "256px", nameWidth: "45%", className: "right", overflowContainer: null, skipReset: true }
    );
    menubar.root.appendChild( commandButton.root );

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
            }
        }
    ], { float: "right" });

    app.init( menubar.siblingArea );
}


window.app = app;