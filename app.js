import { LX } from 'lexgui';

window.LX = LX;

const area = await LX.init( { layoutMode: "document", rootClass: "wrapper" } );
const starterTheme = LX.getTheme();

// Menubar
{
    const menubar = area.addMenubar( [
        { name: "Seguimiento", callback: () => { } }
    ] );

    menubar.setButtonImage("lexgui.js", `data/icon_${ starterTheme }.png`, () => {window.open("https://www.jowyoriginals.com/")}, {float: "left"})

    const commandButton = new LX.Button(null, `Search command...<span class="ml-auto">${ LX.makeKbd( ["Ctrl", "Space"], false, "bg-tertiary border px-1 rounded" ).innerHTML }</span>`, () => { LX.setCommandbarState( true ) }, {
        width: "256px", className: "right", buttonClass: "border fg-tertiary bg-secondary" }
    );
    menubar.root.appendChild( commandButton.root );

    menubar.addButtons( [
        {
            title: "Switch Theme",
            icon: starterTheme == "dark" ? "Moon" : "Sun",
            swap: starterTheme == "dark" ? "Sun" : "Moon",
            callback:  (value, event) => {
                const newTheme = value ? "light" : "dark";
                LX.switchTheme();
                menubar.setButtonImage("lexgui.js", `data/icon_${ newTheme }.png`, () => {window.open("https://www.jowyoriginals.com/")}, {float: "left"})
            }
        }
    ], { float: "right" });
}

const appData = {
    "amazon": { list: [], dom: null },
    "jowy": { list: [], dom: null },
    "hxg": { list: [], dom: null },
    "bathby": { list: [], dom: null },
};

const processData = data => {
    
    localStorage.setItem( "lastData", JSON.stringify( data ) );

    // Clear previous data
    for( const key in appData ) {
        appData[ key ].list = [];
    }

    for( const row of data )
    {
        const ref = row["REFERENCIA"][ 0 ];
        switch( ref )
        {
            case '1': appData["amazon"].list.push( row ); break;
            case '2': appData["jowy"].list.push( row ); break;
            case '3': appData["hxg"].list.push( row ); break;
            case '4': appData["bathby"].list.push( row ); break;
        }
    }

    showList( "amazon" );
    showList( "jowy" );
    showList( "hxg" );
    showList( "bathby" );
};

const showList = ( compName ) => {
    const dom = appData[ compName ].dom;
    const list = appData[ compName ].list;
    // console.log(list)
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
                { name: "CLAVE", options: ["Documentada", "En tránsito", "En reparto", "En destino"] },
                // { name: "ID", type: "range", min: 0, max: 9, step: 1, units: "hr" },
            ],
            rowActions: compName != "amazon" ? [
                { icon: "Eye", title: "Ver mensaje", callback: (rowData) => {
                    const rowIndex = tableData.indexOf(rowData);
                    showMessages( compName, rowIndex );
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
}

const showMessages = ( compName, rowOffset = 0 ) => {
    const dom = appData[ compName ].dom;
    const list = appData[ compName ].list;
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
        return;
    }

    const header = LX.makeContainer( [ null, "auto" ], "flex flex-col border-top border-bottom gap-2 px-3 py-6", `
        <h2>${ row["NOMCONS"] }</h2>
        <p class="font-light" style="max-width:32rem"><strong>${ row["POBLACION"] }</strong> / <strong>${ row["CLAVE"] }</strong></p>
        <p class="font-light" style="max-width:32rem">Número de envío: <strong>${ row["NENVIO"] }</strong> / Referencia: <strong>${ row["REFERENCIA"] }</strong></p>
    `, dom );

    const template = appData[ compName ].template;
    const body = LX.makeContainer( [ null, "auto" ], "p-6", template( row["LOCALIZADOR"] ), dom );

    const footerPanel = new LX.Panel({ height: "auto", className: "bg-none bg-primary border-none p-2" });
    footerPanel.sameLine(2, "justify-between");
    const copyButton = footerPanel.addButton(null, "CopyButton", () => {
        const messageText = template( row["LOCALIZADOR"] );
        navigator.clipboard.writeText( messageText ).then(() => {
            LX.toast( "Copiado", "✅ Mensaje copiado al portapapeles.", { timeout: 3000 } );
        }).catch(err => {
            console.error('Error copying text: ', err);
            LX.toast( "Error", "❌ No se pudo copiar el mensaje.", { timeout: -1 } );
        });
    }, { icon: "Copy", title: "Copiar", tooltip: true });
    const nextButton = footerPanel.addButton(null, "NextButton", () => {
        showMessages( compName, rowOffset + 1 );
    }, { icon: "ArrowRight", title: "Siguiente", tooltip: true });
    Object.assign( footerPanel.root.style, {
        position: "absolute",
        bottom: "0"
    });
    dom.appendChild( footerPanel.root );
}

window.clearData = () => {
    console.log("Clearing data...");
    localStorage.removeItem( "lastData" );
    window.location.reload();
}

// Header
{
    const header = LX.makeContainer( [ null, "auto" ], "flex flex-col border-top border-bottom gap-2 px-6 py-12", `
        <h1>Mensajes de seguimiento</h1>
        <p class="font-light" style="max-width:32rem">Arrastra un .xlsx aquí para cargar un nuevo listado de envíos.</p>
        <button class="lexbutton contrast" style="max-width:12rem" onClick="window.clearData()">Limpiar datos anteriores</button>
    `, area );

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
                    processData( XLSX.utils.sheet_to_json(sheet, {
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
    const tabs = area.addTabs( { parentClass: "p-4", sizes: [ "auto", "auto" ], contentClass: "p-6 pt-0" } );

    // Amazon
    {
        const amazonContainer = LX.makeContainer( [ null, "800px" ], "flex flex-col relative bg-primary border rounded-lg overflow-hidden" );
        tabs.add( "Amazon", amazonContainer, { selected: true, onSelect: (event, name) => showList( name.toLowerCase() ) } );

        const amazonArea = new LX.Area({ className: "rounded-lg" });
        amazonContainer.appendChild( amazonArea.root );
        appData["amazon"].dom = amazonContainer;
    }

    // Jowy
    {
        const jowyContainer = LX.makeContainer( [ null, "800px" ], "flex flex-col relative bg-primary border rounded-lg overflow-hidden" );
        tabs.add( "Jowy", jowyContainer, { xselected: true, onSelect: (event, name) => showList( name.toLowerCase() ) } );

        const jowyArea = new LX.Area({ className: "rounded-lg" });
        jowyContainer.appendChild( jowyArea.root );
        appData["jowy"].dom = jowyContainer;
    }

    // HxG
    {
        const hxgContainer = LX.makeContainer( [ null, "800px" ], "flex flex-col relative bg-primary border rounded-lg overflow-hidden" );
        tabs.add( "HxG", hxgContainer, { xselected: true, onSelect: (event, name) => showList( name.toLowerCase() ) } );

        const hxgArea = new LX.Area({ className: "rounded-lg" });
        hxgContainer.appendChild( hxgArea.root );
        appData["hxg"].dom = hxgContainer;
    }

    // Bathby
    {
        const bathbyContainer = LX.makeContainer( [ null, "800px" ], "flex flex-col relative bg-primary border rounded-lg overflow-hidden" );
        tabs.add( "Bathby", bathbyContainer, { xselected: true, onSelect: (event, name) => showList( name.toLowerCase() ) } );

        const bathbyArea = new LX.Area({ className: "rounded-lg" });
        bathbyContainer.appendChild( bathbyArea.root );
        appData["bathby"].dom = bathbyContainer;
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

appData["jowy"].template = ( id ) => {
    return `<p><strong>Tu pedido ha sido enviado a trav&eacute;s de CBL:</strong></p>
<ul>
<li><strong>N&ordm; de env&iacute;o:</strong> ${ id }</li>
</ul>
<p style="border-radius: 25px; font-size: 15px; font-family: Helvetica,Arial,sans-serif; font-weight: 700!important; padding: 15px; max-width: 300px; background-color: #5aa5f3; text-align: center;"><a style="text-decoration: none; color: #ffffff;" href="https://clientes.cbl-logistica.com/public/consultaenvio.aspx"><strong>HAZ CLIC PARA SEGUIR TU PEDIDO</strong></a></p>`;
}

appData["hxg"].template = ( id ) => {
    return `<p><strong>Tu pedido ha sido enviado a trav&eacute;s de CBL:</strong></p>
<ul>
<li><strong>N&ordm; de env&iacute;o:</strong> ${ id }</li>
</ul>
<p style="font-size: 15px; font-family: Helvetica,Arial,sans-serif; font-weight: 700!important; padding: 15px; max-width: 300px; background-color: #ffc844; text-align: center;"><a style="text-decoration: none; color: #222222;" href="https://clientes.cbl-logistica.com/public/consultaenvio.aspx"><strong>HAZ CLIC PARA SEGUIR TU PEDIDO</strong></a></p>`;
}

appData["bathby"].template = ( id ) => {
    return `<p><strong>Tu pedido ha sido enviado a trav&eacute;s de CBL:</strong></p>
<ul>
<li><strong>N&ordm; de env&iacute;o:</strong> ${ id }</li>
</ul>
<p style="font-size: 15px; font-family: Helvetica,Arial,sans-serif; font-weight: 700!important; padding: 15px; max-width: 300px; background-color: #f2d1d1; text-align: center;"><a style="text-decoration: none; color: #000000;" href="https://clientes.cbl-logistica.com/public/consultaenvio.aspx"><strong>HAZ CLIC PARA SEGUIR TU PEDIDO</strong></a></p>`;
}

// Load last data if available
const lastData = localStorage.getItem( "lastData" );
if( lastData ) {
    try {
        const data = JSON.parse( lastData );
        processData( data );
        LX.toast( "Listado cargado!", "✅ Se han cargado los datos anteriores.", { timeout: 3000 } );
    } catch (error) {
        console.error("Error parsing last data:", error);
        LX.toast( "Error", "❌ No se pudo cargar los datos anteriores.", { timeout: -1 } );
    }
}

showList( "jowy" );
showList( "hxg" );
showList( "amazon" );
showList( "bathby" );