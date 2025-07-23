import { LX } from 'lexgui';

window.LX = LX;

const area = await LX.init( { layoutMode: "document", rootClass: "wrapper" } );
const starterTheme = LX.getTheme();

const cblTrackingUrl = `https://clientes.cbl-logistica.com/public/consultaenvio.aspx`;
const seurTrackingUrl = `https://www.seur.com/miseur/mis-envios`;
const glsTrackingUrl = `https://gls-group.com/ES/es/seguimiento-envio/`;
const transportOptions = ["CBL", "SEUR"];//, "GLS"];
const companyOptions = ["Jowy", "HxG", "Bathby"];

// Menubar
{
    const menubar = area.addMenubar( [
        // { name: "Seguimiento", callback: () => { } }
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
}

const app = {

    transport: "CBL", // Default transport

    data: {
        "amazon": { list: [], dom: null },
        "jowy": { list: [], dom: null },
        "hxg": { list: [], dom: null },
        "bathby": { list: [], dom: null },
    },

    processData: function(fileData) {

        localStorage.setItem( "lastData", JSON.stringify( fileData ) );

        // Clear previous data
        for( const key in this.data ) {
            this.data[ key ].list = [];
        }

        for( const row of fileData )
        {
            const ref = row["REFERENCIA"][ 0 ];
            switch( ref )
            {
                case '1': this.data["amazon"].list.push( row ); break;
                case '2': this.data["jowy"].list.push( row ); break;
                case '3': this.data["hxg"].list.push( row ); break;
                case '4': this.data["bathby"].list.push( row ); break;
            }
        }

        this.updateLists();
    },

    showList: function( compName ) {
        const dom = this.data[ compName ].dom;
        const list = this.data[ compName ].list;
        dom.innerHTML = "";

        // Create table data from the list
        const tableData = list.map( row => {
            return [ row["DIA"], row["F_DOC"], row["NENVIO"], row["CLAVE"], row["F_SITUACION"], row["NOMCONS"], row["POBLACION"], row["DETALLE"], row["LOCALIZADOR"] ];
        });

        const tableWidget = new LX.Table(null, {
                head: [ "DIA", "F_DOC", "NENVIO", "CLAVE", "F_SITUACION", "NOMCONS", "POBLACION", "DETALLE", "LOCALIZADOR" ],
                body: tableData
            }, {
            selectable: false,
            sortable: false,
            toggleColumns: true,
            filter: "NOMCONS",
            customFilters: [
                { name: "CLAVE", options: ["Documentada", "En tránsito", "En destino", "En reparto", "Entregada"] },
                // { name: "ID", type: "range", min: 0, max: 9, step: 1, units: "hr" },
            ],
            rowActions: compName != "amazon" ? [
                { icon: "Eye", title: "Ver mensaje", callback: (rowData) => {
                    const rowIndex = tableData.indexOf(rowData);
                    this.showMessages( compName, rowIndex );
                }},
                // "menu"
            ] : [],
            // onMenuAction: (index, tableData) => {
            //     return [
            //         { name: "Export" },
            //         { name: "Make a copy" },
            //         { name: "Favourite" },
            //         null,
            //         { name: "Delete", icon: "Trash2", className: "fg-error" },
            //     ]
            // }
        });
        dom.appendChild( tableWidget.root );

        this.compName = compName;
        this.rowOffset = undefined;
    },

    showMessages: function( compName, rowOffset = 0 ) {
        const dom = this.data[ compName ].dom;
        const list = this.data[ compName ].list;
        console.log(list)
        dom.innerHTML = "";

        // hack to remove all tooltips
        document.querySelectorAll(".lextooltip").forEach( el => { el.remove(); });

        const row = list[ rowOffset ];
        console.log(row)
        if( !row ) {
            const header = LX.makeContainer( [ null, "auto" ], "flex flex-col border-top border-bottom gap-2 px-3 py-6", `
                <h1>No hay más mensajes</h1>
            `, dom );
            this.rowOffset = undefined;
            return;
        }

        const header = LX.makeContainer( [ null, "auto" ], "flex flex-col border-top border-bottom gap-2 px-3 py-6", `
            <h2>${ row["NOMCONS"] }</h2>
            <p class="font-light" style="max-width:32rem"><strong>${ row["POBLACION"] }</strong> / <strong>${ row["CLAVE"] }</strong></p>
            <p class="font-light" style="max-width:32rem">Número de envío: <strong>${ row["NENVIO"] }</strong> / Referencia: <strong>${ row["REFERENCIA"] }</strong></p>
        `, dom );

        let url = cblTrackingUrl;
        switch( this.transport )
        {
            case 'SEUR': url = seurTrackingUrl; break;
            case "GLS": url = glsTrackingUrl; break;
        }

        const template = this.data[ compName ].template;
        const templateString = template( row["LOCALIZADOR"], url );
        const body = LX.makeContainer( [ null, "auto" ], "p-8", templateString + "<br><br>", dom );

        const footerPanel = new LX.Panel({ height: "auto", className: "bg-none bg-primary border-none p-2" });
        footerPanel.sameLine(2, "justify-between");

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

        }, { swap: "Check", icon: "Copy", title: "Copiar", tooltip: true } );
        copyButtonWidget.root.querySelector( ".swap-on svg" ).addClass( "fg-success" );

        const nextButtonWidget = footerPanel.addButton(null, "NextButton", () => {
            this.showMessages( compName, rowOffset + 1 );
        }, { icon: "ArrowRight", title: "Siguiente", tooltip: true });
        Object.assign( footerPanel.root.style, {
            position: "absolute",
            bottom: "0"
        });
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

    updateTransport: function( value ) {
        this.transport = value;

        if( this.rowOffset != undefined )
        {
            this.showMessages( this.compName, this.rowOffset );
        }
    },

    clearData: function() {
        console.log("Clearing data...");
        localStorage.removeItem( "lastData" );

        this.data["amazon"].list = [];
        this.data["jowy"].list = [];
        this.data["hxg"].list = [];
        this.data["bathby"].list = [];

        this.updateLists();
    },

    updateLists: function() {
        this.showList( "amazon" );
        this.showList( "bathby" );
        this.showList( "hxg" );
        this.showList( "jowy" );
    }
};


// Header
{
    const header = LX.makeContainer( [ null, "auto" ], "flex flex-col border-top border-bottom gap-2 px-6 py-12", `
        <div style="display:flex;flex-direction:row;gap:0.5rem;align-items:center;">${ LX.makeIcon("MessageSquarePlus", { svgClass: "xxl" }).innerHTML }<h1>Mensajes de seguimiento</h1></div>
        <p class="font-light" style="max-width:32rem">Arrastra un <strong>.xlsx</strong> aquí para cargar un nuevo listado de envíos.</p>
    `, area );

    window.__header = header;

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
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    app.processData( XLSX.utils.sheet_to_json(sheet, {
                        raw: false
                    }) );
                    LX.toast( file.name, "✅ Datos cargados correctamente!", { timeout: 3000 } );
                };

                // Read the data as binary
                reader.readAsArrayBuffer( file );

            } else {
                alert("Please drop a valid .xlsx file.");
            }
        }
    });
}

// Content
{
    // Create utility buttons
    {
        const utilButtonsPanel = new LX.Panel({ height: "auto", className: "bg-none bg-primary border-none p-2" });
        utilButtonsPanel.sameLine(3);

        const messageFromTrackIdButton = utilButtonsPanel.addButton(null, "CopyButton",  async () => {
            app.openMessageDialog();
        }, { icon: "Plus", title: "Nuevo mensaje", tooltip: true } );

        const clearButtonWidget = utilButtonsPanel.addButton(null, "ClearButton", () => {
            app.clearData();
        }, { icon: "Trash2", title: "Limpiar datos anteriores", tooltip: true });

        const helpButtonWidget = utilButtonsPanel.addButton(null, "HelpButton", () => {

            const exampleTour = new LX.Tour([
                {
                    title: "Listado de envíos",
                    content: "Primero sube el listado de envíos arrastrándolo aquí.",
                    reference: window.__header,
                    side: "bottom",
                    align: "center"
                },
                {
                    title: "Elige la empresa",
                    content: "El listado se divide por empresa, elige la que quieras ver.",
                    reference: window.__tabs,
                    side: "bottom",
                    align: "center"
                },
                {
                    title: "Copiar mensajes",
                    content: "En la tabla, haz clic en el icono de ojo para ver el mensaje de seguimiento.",
                    reference: document.querySelector(".lextable"),
                    side: "top",
                    align: "start"
                }
            ], { offset: 4, xradius: 12 });

            exampleTour.begin();

        }, { icon: "CircleQuestionMark", title: "Ayuda", tooltip: true });

        area.attach( utilButtonsPanel.root );
    }

    const tabs = area.addTabs( { parentClass: "p-4", sizes: [ "auto", "auto" ], contentClass: "p-6 pt-0" } );
    window.__tabs = tabs.root;

    // Jowy
    {
        const jowyContainer = LX.makeContainer( [ null, "auto" ], "flex flex-col relative bg-primary border rounded-lg overflow-hidden" );
        tabs.add( "Jowy", jowyContainer, { selected: true, onSelect: (event, name) => app.showList( name.toLowerCase() ) } );

        const jowyArea = new LX.Area({ className: "rounded-lg" });
        jowyContainer.appendChild( jowyArea.root );
        app.data["jowy"].dom = jowyContainer;
    }

    // HxG
    {
        const hxgContainer = LX.makeContainer( [ null, "auto" ], "flex flex-col relative bg-primary border rounded-lg overflow-hidden" );
        tabs.add( "HxG", hxgContainer, { xselected: true, onSelect: (event, name) => app.showList( name.toLowerCase() ) } );

        const hxgArea = new LX.Area({ className: "rounded-lg" });
        hxgContainer.appendChild( hxgArea.root );
        app.data["hxg"].dom = hxgContainer;
    }

    // Bathby
    {
        const bathbyContainer = LX.makeContainer( [ null, "auto" ], "flex flex-col relative bg-primary border rounded-lg overflow-hidden" );
        tabs.add( "Bathby", bathbyContainer, { xselected: true, onSelect: (event, name) => app.showList( name.toLowerCase() ) } );

        const bathbyArea = new LX.Area({ className: "rounded-lg" });
        bathbyContainer.appendChild( bathbyArea.root );
        app.data["bathby"].dom = bathbyContainer;
    }

    // Amazon
    {
        const amazonContainer = LX.makeContainer( [ null, "auto" ], "flex flex-col relative bg-primary border rounded-lg overflow-hidden" );
        tabs.add( "Amazon", amazonContainer, { xselected: true, onSelect: (event, name) => app.showList( name.toLowerCase() ) } );

        const amazonArea = new LX.Area({ className: "rounded-lg" });
        amazonContainer.appendChild( amazonArea.root );
        app.data["amazon"].dom = amazonContainer;
    }
}

// Footer
{
    const footer = new LX.Footer( {
        className: "border-top",
        parent: LX.root,
        credits: `${ new Date().getUTCFullYear() } Alex Rodríguez.`,
        socials: [
            { title: "Github", link: "https://github.com/jxarco/", icon: "Github" }
        ]
    } );
}

// Message templates

app.data["jowy"].template = ( id, url, transport ) => {
    return `<p><strong>Tu pedido ha sido enviado a trav&eacute;s de ${ transport ?? app.transport }:</strong></p>
<ul>
<li><strong>N&ordm; de env&iacute;o:</strong> ${ id }</li>
</ul>
<a href="${ url }" style="text-decoration: none; font-size: 16px; font-family: Helvetica,Arial,sans-serif; padding: 12px; max-width: 300px; background-color: #FDC645; text-align: center; display: flex; flex-direction: column; letter-spacing: -0.05rem;">
<p style="color: #222;"><strong>HAZ CLIC AQUÍ PARA SEGUIR TU PEDIDO</strong></p>
<div style="border-bottom:1px solid #927124; margin-block: 0.4rem;"></div>
<p style="color: #927124;">jowyoriginals.com</p>
</a>`;
}

app.data["hxg"].template = ( id, url, transport ) => {
    return `<p><strong>Tu pedido ha sido enviado a trav&eacute;s de ${ transport ?? app.transport }:</strong></p>
<ul>
<li><strong>N&ordm; de env&iacute;o:</strong> ${ id }</li>
</ul>
<a href="${ url }" style="text-decoration: none; border-radius: 16px; font-size: 16px; font-family: Helvetica,Arial,sans-serif; padding: 12px; max-width: 300px; background-color: #FFC844; text-align: center; display: flex; flex-direction: column; letter-spacing: -0.05rem;">
<p style="text-decoration: none; color: #222;"><strong>HAZ CLIC AQUÍ PARA SEGUIR TU PEDIDO</strong></p>
<div style="border-bottom:1px solid #927124; margin-block: 0.4rem;"></div>
<p style="text-decoration: none; color: #927124;">homexgym.com</p>
</a>`;
}

app.data["bathby"].template = ( id, url, transport ) => {
    return `<p><strong>Tu pedido ha sido enviado a trav&eacute;s de ${ transport ?? app.transport }:</strong></p>
<ul>
<li><strong>N&ordm; de env&iacute;o:</strong> ${ id }</li>
</ul>
<a href="${ url }" style="text-decoration: none; border-radius: 25px; font-size: 16px; font-family: Helvetica,Arial,sans-serif; padding: 12px; max-width: 300px; background-color: #F2D1D1; text-align: center; display: flex; flex-direction: column; letter-spacing: -0.05rem;">
<p style="text-decoration: none; color: #222;"><strong>HAZ CLIC AQUÍ PARA SEGUIR TU PEDIDO</strong></p>
<div style="border-bottom:1px solid #736060; margin-block: 0.4rem;"></div>
<p style="text-decoration: none; color: #736060;">bathby.com</p>
</a>`;
}

// Load last data if available
const lastData = localStorage.getItem( "lastData" );
if( lastData ) {
    try {
        const data = JSON.parse( lastData );
        app.processData( data );
        LX.toast( "Listado cargado!", "✅ Se han cargado los datos anteriores.", { timeout: 3000 } );
    } catch (error) {
        console.error("Error parsing last data:", error);
        LX.toast( "Error", "❌ No se pudo cargar los datos anteriores.", { timeout: -1 } );
    }
}

app.updateLists();

window.app = app;