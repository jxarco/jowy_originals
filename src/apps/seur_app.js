import { LX } from 'lexgui';

const SHEIN_COLUMN_DATA = [
    [ 'Número del pedido', null ],
    [ 'ID del artículo', null ],
    [ 'SKU del vendedor', null ],
    [ 'Código Postal', null, ( str ) => str.replaceAll( /[ -]/g, '' ) ],
    [ 'País', null, ( str, row ) => {
        return core.countryFormat[str] ?? str;
    } ],
    [ 'Provincia', null ],
    [ 'Ciudad', null ],
    [ 'dirección de usuario 1+dirección de usuario 2', 'Dirección' ],
    [ 'Nombre de usuario completo', null ],
    [ 'Número de Teléfono', null ],
    [ 'Correo electrónico de usuario', null ]
];

const DECATHLON_COLUMN_DATA = [
    [ 'Número de pedido', 'Número del pedido' ],
    [ 'SKU del producto', 'ID del artículo' ],
    [ 'SKU de Tienda', 'SKU del vendedor', ( str, row ) => {
        const qnt = row['Cantidad'];
        return `${row['SKU de Tienda']} x ${qnt}`;
    } ],
    [ 'Dirección de entrega: código postal', 'Código Postal' ],
    [ 'Dirección de entrega: país', 'País', ( str, row ) => {
        const ctr = row['Dirección de entrega: país'];
        return core.countryFormat[ctr] ?? ctr;
    } ],
    [ 'Provincia', null, ( str, row ) => row['Dirección de entrega: provincia'] ?? '' ],
    [ 'Dirección de entrega: ciudad', 'Ciudad' ],
    [ 'Dirección de entrega: calle 1+Dirección de entrega: calle 2', 'Dirección' ],
    [ 'Dirección de entrega: nombre de pila+Dirección de entrega: apellido', 'Nombre de usuario completo' ],
    [ 'Dirección de entrega: teléfono', 'Número de Teléfono' ],
    [ 'Correo electrónico de usuario', null, ( str, row ) => '' ]
];

class SeurApp
{
    constructor( core )
    {
        this.title = 'Gestión de pedidos: <i>CBL</i>';
        this.subtitle = 'Arrastra un <strong>.xlsx</strong> aquí para cargar un nuevo listado de envíos.';
        this.icon = 'FileText';
        this.core = core;
        this.area = new LX.Area( { skipAppend: true, className: 'hidden' } );
        core.area.attach( this.area );

        // Create utility buttons
        const utilButtonsPanel = new LX.Panel( { height: 'auto', className: 'bg-none bg-primary border-none p-2 flex flex-row gap-2' } );
        utilButtonsPanel.sameLine( 3 );
        utilButtonsPanel.addButton( null, 'StartButton', this.showSingleSheinData.bind( this ), { icon: 'Eye',
            title: 'Ver información detallada', tooltip: true } );
        utilButtonsPanel.addButton( null, 'ClearButton', core.clearData.bind( core ), { icon: 'Trash2', title: 'Limpiar datos anteriores',
            tooltip: true } );
        utilButtonsPanel.addButton( null, 'ExportButton', this.exportSEUR.bind( this, false, this.lastSeurData ), {
            icon: 'Download',
            title: 'Exportar datos',
            tooltip: true
        } );
        this.area.attach( utilButtonsPanel.root );

        const tabs = this.area.addTabs( { parentClass: 'p-4', sizes: [ 'auto', 'auto' ], contentClass: 'p-2 pt-0' } );
        // this.sheinTabs = tabs.root;

        // SEUR
        const seurContainer = LX.makeContainer( [ null, 'auto' ], 'flex flex-col relative bg-primary p-1 pt-0 rounded-lg overflow-hidden' );
        tabs.add( 'Todo', seurContainer, { selected: true, onSelect: ( event, name ) => this.openData() } );

        const seurArea = new LX.Area( { className: 'rounded-lg' } );
        seurContainer.appendChild( seurArea.root );

        // Groups List
        const groupsListContainer = LX.makeContainer( [ null, 'auto' ],
            'flex flex-col relative bg-primary p-1 pt-0 rounded-lg overflow-hidden' );
        tabs.add( 'Por cantidad', groupsListContainer, { xselected: true, onSelect: ( event, name ) => this.showGroupsByCountryList() } );

        const groupsListArea = new LX.Area( { className: 'rounded-lg' } );
        groupsListContainer.appendChild( groupsListArea.root );

        // Move up into the panel section
        utilButtonsPanel.attach( tabs.root );

        this.seurDataArea = seurArea;
        this.groupsListArea = groupsListArea;
        core.sheinDataArea = this.area;

        this.clear();
    }

    openData( fileData )
    {
        fileData = fileData ?? this.lastSeurData;

        if ( !fileData.length )
        {
            return;
        }

        const numCols = Object.keys( fileData[0] ).length;

        // 27 -> shein. 80 -> decathlon
        if ( numCols < 40 )
        {
            this.showSheinList( fileData );
            this.showGroupsByCountryList( fileData );
        }
        else
        {
            this.showDecathlonList( fileData );
            this.showGroupsByCountryList( fileData );
        }
    }

    showDecathlonList( data )
    {
        data = data ?? this.lastSeurData;

        this.vendor = 'Decathlon';

        const dom = this.seurDataArea.root;
        while ( dom.children.length > 0 )
        {
            dom.removeChild( dom.children[0] );
        }

        // Sort by ref
        {
            data = data.sort( ( a, b ) => {
                return ( a['SKU del vendedor'] ?? '?' ).localeCompare( b['SKU del vendedor'] ?? '?' );
            } );
        }

        // Create table data from the list
        const tableData = data.map( ( row ) => {
            const lRow = [];
            for ( let c of DECATHLON_COLUMN_DATA )
            {
                const ogColName = c[0];
                if ( ogColName.includes( '+' ) )
                {
                    const tks = ogColName.split( '+' );
                    lRow.push( `${row[tks[0]]}${row[tks[1]] ? ` ${row[tks[1]]}` : ''}` );
                }
                else
                {
                    const fn = c[2] ?? ( ( str ) => str );
                    lRow.push( fn( row[ogColName] ?? '?', row ) );
                }
            }
            return lRow;
        } ).filter( ( v ) => v !== undefined );

        const tableWidget = new LX.Table( null, {
            head: DECATHLON_COLUMN_DATA.map( ( c ) => {
                return c[1] ?? c[0];
            } ),
            body: tableData
        }, {
            selectable: true,
            sortable: false,
            toggleColumns: true,
            filter: 'SKU del vendedor'
        } );

        dom.appendChild( tableWidget.root );

        this.lastSeurColumnData = tableWidget.data.head;
        this.lastShownSeurData = tableWidget.data.body;
        this.lastSeurData = data;
    }

    showSheinList( data )
    {
        data = data ?? this.lastSeurData;

        this.vendor = 'Shein';

        const dom = this.seurDataArea.root;
        while ( dom.children.length > 0 )
        {
            dom.removeChild( dom.children[0] );
        }

        // Sort by ref
        {
            data = data.sort( ( a, b ) => {
                return ( a['SKU del vendedor'] ?? '?' ).localeCompare( b['SKU del vendedor'] ?? '?' );
            } );
        }

        // Create table data from the list
        const tableData = data.map( ( row ) => {
            const lRow = [];
            for ( let c of SHEIN_COLUMN_DATA )
            {
                const ogColName = c[0];
                if ( ogColName.includes( '+' ) )
                {
                    const tks = ogColName.split( '+' );
                    lRow.push( `${row[tks[0]]}${row[tks[1]] ? ` ${row[tks[1]]}` : ''}` );
                }
                else
                {
                    const fn = c[2] ?? ( ( str ) => str );
                    lRow.push( fn( row[ogColName] ?? '?', row ) );
                }
            }
            return lRow;
        } );

        const tableWidget = new LX.Table( null, {
            head: SHEIN_COLUMN_DATA.map( ( c ) => {
                return c[1] ?? c[0];
            } ),
            body: tableData
        }, {
            selectable: true,
            sortable: false,
            toggleColumns: true,
            filter: 'SKU del vendedor'
        } );

        dom.appendChild( tableWidget.root );

        this.lastSeurColumnData = tableWidget.data.head;
        this.lastShownSeurData = tableWidget.data.body;
        this.lastSeurData = data;
    }

    showGroupsByCountryList( ogData )
    {
        ogData = ogData ?? this.lastSeurData;

        let data = LX.deepCopy( ogData );

        const dom = this.groupsListArea.root;
        while ( dom.children.length > 0 )
        {
            dom.removeChild( dom.children[0] );
        }

        // Boton de copiar por columna (no por fila porque estan separadas en el Excel final)
        // en caso de repetir "Número del pedido", se tiene que añadir fila por separado

        // Sort by ref
        {
            data = data.sort( ( a, b ) => {
                return ( a['SKU del vendedor'] ?? '?' ).localeCompare( b['SKU del vendedor'] ?? '?' );
            } );
        }

        let columnData = [
            [ 'SKU del vendedor', null ],
            [ 'Cantidad', null ],
            [ 'País', null, ( str, row ) => {
                return this.core.countryFormat[str] ?? str;
            } ],
            [ 'Observaciones', null ],
            [ 'Número del pedido', null ]
        ];

        if ( this.vendor === 'Decathlon' )
        {
            columnData = [
                [ 'SKU de Tienda', 'SKU del vendedor' ],
                [ 'Cantidad', null ],
                [ 'Dirección de entrega: país', 'País', ( str, row ) => {
                    const ctr = row['Dirección de entrega: país'];
                    return this.core.countryFormat[ctr] ?? ctr;
                } ],
                [ 'Observaciones', null ],
                [ 'Número de pedido', 'Número del pedido' ]
            ];
        }

        const uid = columnData[4][0];
        const orderNumbers = new Map();

        // Create table data from the list
        let tableData = data.map( ( row, index ) => {
            const lRow = [];
            for ( let c of columnData )
            {
                let colName = c[0];

                if ( colName === uid )
                {
                    const orderNumber = row[colName];

                    if ( orderNumbers.has( orderNumber ) )
                    {
                        const val = orderNumbers.get( orderNumber );
                        orderNumbers.set( orderNumber, [ ...val, index ] );
                    }
                    else
                    {
                        orderNumbers.set( orderNumber, [ index ] );
                    }
                }

                const fn = c[2] ?? ( ( str ) => str );
                lRow.push( fn( row[colName] ?? '', row ) ?? '' );
            }
            return lRow;
        } );

        const multipleItemsOrderNames = Array.from( orderNumbers.values() ).filter( ( v ) => v.length > 1 );

        for ( const repeats of multipleItemsOrderNames )
        {
            const rest = repeats.slice( 1 );
            const trail = rest.reduce( ( p, c ) => p + ` + ${tableData[c][0]}`, '' );
            rest.forEach( ( r ) => {
                tableData[r] = undefined;
            } );
            tableData[repeats[0]][0] += trail;
            tableData[repeats[0]][3] = 'Mismo pedido';
        }

        tableData = tableData.filter( ( r ) => r !== undefined );

        // Remove unnecessary
        columnData.splice( 4, 1 );

        const listSKU = [];
        const skus = {};

        for ( let row of tableData )
        {
            const sku = `${row[0]}_${row[2]}`;
            if ( !skus[sku] )
            {
                skus[sku] = [ listSKU.length ];
                row[1] = 1;
                row.splice( 4, 1 );
                listSKU.push( row );
            }
            else
            {
                const idx = skus[sku][0];
                listSKU[idx][1] += 1;
            }
        }

        for ( let row of listSKU )
        {
            const sku = row[0];
            if ( sku.startsWith( 'JW-T60' ) && !sku.includes( '+' ) && row[3] !== 'Mismo pedido' )
            {
                row[1] *= 4;
            }
        }

        const tableWidget = new LX.Table( null, {
            head: columnData.map( ( c ) => {
                return c[1] ?? c[0];
            } ),
            body: listSKU
        }, {
            selectable: false,
            sortable: false,
            sortColumns: false,
            toggleColumns: false,
            columnActions: [
                {
                    icon: 'Copy',
                    name: 'Copiar',
                    callback: ( colData ) => {
                        if ( !this.lastShownSeurData )
                        {
                            return;
                        }
                        const tsv = colData.map( ( r ) => r.join( '\t' ) ).join( '\n' );
                        navigator.clipboard.writeText( tsv ).then( () => {
                            LX.toast( 'Hecho!', '✅ Columna copiada al portapapeles.', { timeout: 5000, position: 'top-center' } );
                        } ).catch( ( err ) => {
                            console.error( 'Error copying text: ', err );
                            LX.toast( 'Error', '❌ No se pudo copiar la columna.', { timeout: -1, position: 'top-center' } );
                        } );
                    }
                }
            ],
            filter: 'SKU del vendedor'
        } );

        this.lastSeurColumnData = tableWidget.data.head;
        this.lastShownSeurData = tableWidget.data.body;

        dom.appendChild( tableWidget.root );
    }

    showSingleSheinData( rowOffset )
    {
        rowOffset = ( rowOffset.constructor === String ? 0 : rowOffset ) ?? 0;

        const dom = this.seurDataArea.root;
        while ( dom.children.length > 0 )
        {
            dom.removeChild( dom.children[0] );
        }

        // hack to remove all tooltips
        document.querySelectorAll( '.lextooltip' ).forEach( ( el ) => {
            el.remove();
        } );

        if ( !this.lastSeurData || !this.lastSeurData.length )
        {
            const header = LX.makeContainer( [ null, 'auto' ], 'flex flex-col border-top border-bottom gap-2 px-3 py-6', `
                    <h1>No hay datos de SHEIN</h1>
                `, dom );
            return;
        }

        const row = this.lastSeurData[rowOffset];

        if ( !row )
        {
            const header = LX.makeContainer( [ null, 'auto' ], 'flex flex-col border-top border-bottom gap-2 px-3 py-6', `
                    <h1>No hay más datos</h1>
                `, dom );
            return;
        }

        const header = LX.makeContainer( [ null, 'auto' ], 'flex flex-col border-top border-bottom gap-2 px-3 py-6', `
                <h2 class="flex flex-row items-center gap-1">Número del pedido: ${row['Número del pedido']}</h2>
                <p class="font-light fg-tertiary" style="height:auto"><strong>${row['Nombre del producto'] ?? 'Vacío'}</strong></p>
                <p class="font-light"><strong>SKU: ${row['SKU del vendedor'] ?? 'Vacío'}</strong> / <strong>${
            row['Especificación']
        }</strong></p>
                <p class="font-light">Precio: <strong>${row['precio de los productos básicos']}</strong></p>
            `, dom );

        const body = LX.makeContainer( [ null, 'auto' ], 'flex flex-col p-8 gap-0.5', `
                <div class="flex flex-row items-center gap-1"><p class="font-light fg-tertiary">Nombre Usuario</p><p class="flex flex-row items-center font-medium">${
            row['Nombre de usuario completo'] ?? 'Vacío'
        }</p></div>
                <div class="flex flex-row items-center gap-1"><p class="font-light fg-tertiary">Dirección</p><p class="flex flex-row items-center font-medium">${
            row['dirección de usuario 1'] + ( row['dirección de usuario 2'] ? ' ' + row['dirección de usuario 2'] : '' )
        }</p></div>
                <div class="flex flex-row items-center gap-1"><p class="font-light fg-tertiary">CP</p><p class="flex flex-row items-center font-medium">${
            row['Código Postal'] ?? 'Vacío'
        }</p></div>
                <div class="flex flex-row items-center gap-1"><p class="font-light fg-tertiary">Ciudad/Población</p><p class="flex flex-row items-center font-medium">${
            row['Ciudad'] ?? 'Vacío'
        }</p></div>
                <div class="flex flex-row items-center gap-1"><p class="font-light fg-tertiary">Provincia</p><p class="flex flex-row items-center font-medium">${
            row['Provincia'] ?? 'Vacío'
        }</p></div>
                <div class="flex flex-row items-center gap-1"><p class="font-light fg-tertiary">País</p><p class="flex flex-row items-center font-medium">${
            row['País'] ?? 'Vacío'
        }</p></div>
                <div class="flex flex-row items-center gap-1"><p class="font-light fg-tertiary">Teléfono</p><p class="flex flex-row items-center font-medium">${
            row['Número de Teléfono'] ?? 'Vacío'
        }</p></div>
                <div class="flex flex-row items-center gap-1"><p class="font-light fg-tertiary">Correo</p><p class="flex flex-row items-center font-medium">${
            row['Correo electrónico de usuario'] ?? 'Vacío'
        }</p></div>
            `, dom );

        for ( let c of body.children )
        {
            const copyButtonWidget = new LX.Button( null, 'CopyButton', async function()
            {
                const textToCopy = this.root.parentElement.childNodes[1].innerText;
                navigator.clipboard.writeText( textToCopy ).then( () => {
                    LX.toast( 'Hecho!', '✅ Mensaje copiado al portapapeles.', { timeout: 5000, position: 'top-center' } );
                } ).catch( ( err ) => {
                    console.error( 'Error copying text: ', err );
                    LX.toast( 'Error', '❌ No se pudo copiar el mensaje.', { timeout: -1, position: 'top-center' } );
                } );
                copyButtonWidget.root.querySelector( "input[type='checkbox']" ).style.pointerEvents = 'none';

                LX.doAsync( () => {
                    copyButtonWidget.swap( true );
                    copyButtonWidget.root.querySelector( "input[type='checkbox']" ).style.pointerEvents = 'auto';
                }, 3000 );
            }, { swap: 'Check', icon: 'Copy', title: 'Copiar', tooltip: true } );
            copyButtonWidget.root.querySelector( '.swap-on svg' ).addClass( 'fg-success' );
            c.appendChild( copyButtonWidget.root );
        }

        // Add button to copy NUMERO PEDIDO
        {
            const nPedidoH2 = header.querySelector( 'h2' );
            const copyButtonWidget = new LX.Button( null, 'CopyButton', async function()
            {
                const textToCopy = nPedidoH2.innerText.substring( nPedidoH2.innerText.indexOf( ': ' ) + 2 );
                navigator.clipboard.writeText( textToCopy ).then( () => {
                    LX.toast( 'Hecho!', '✅ Mensaje copiado al portapapeles.', { timeout: 5000, position: 'top-center' } );
                } ).catch( ( err ) => {
                    console.error( 'Error copying text: ', err );
                    LX.toast( 'Error', '❌ No se pudo copiar el mensaje.', { timeout: -1, position: 'top-center' } );
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

        const footerPanel = new LX.Panel( { height: 'auto', className: 'bg-none bg-primary border-none p-2' } );
        footerPanel.sameLine( 3 );
        footerPanel.addButton( null, 'PrevButton', () => {
            this.showSingleSheinData( rowOffset - 1 );
        }, { width: '100px', icon: 'ArrowLeft', title: 'Anterior', tooltip: true, disabled: ( rowOffset === 0 ) } );
        footerPanel.addText( null, `${( rowOffset + 1 )} / ${this.lastSeurData.length}`, null, { inputClass: 'bg-none', width: '100px',
            disabled: true } );
        footerPanel.addButton( null, 'NextButton', () => {
            this.showSingleSheinData( rowOffset + 1 );
        }, { width: '100px', icon: 'ArrowRight', title: 'Siguiente', tooltip: true,
            disabled: ( rowOffset === ( this.lastSeurData.length - 1 ) ) } );

        dom.appendChild( footerPanel.root );
    }

    exportSEUR( ignoreErrors = false, sheinData )
    {
        let columnData = ( this.vendor === 'Decathlon' ) ? DECATHLON_COLUMN_DATA : SHEIN_COLUMN_DATA;

        const currentSheinData = sheinData ?? this.lastSeurData;
        const uid = columnData[0][0];

        // Process the xlsx first to detect empty fields
        if ( !ignoreErrors )
        {
            const errorFields = [];
            currentSheinData.forEach( ( row, index ) => {
                for ( let c of columnData )
                {
                    const ogColName = c[0];
                    if ( ogColName.includes( '+' ) )
                    {
                        const tks = ogColName.split( '+' );

                        if ( !row[tks[0]] )
                        {
                            errorFields.push( [ index, tks[0] ] );
                        }
                    }
                    else if ( !row[ogColName] )
                    {
                        errorFields.push( [ index, ogColName ] );
                    }
                }
            } );

            if ( errorFields.length )
            {
                const dialog = new LX.Dialog( '❌ Solucionar errores', ( p ) => {
                    p.root.classList.add( 'p-2', 'flex', 'flex-col' );

                    const pTop = new LX.Panel();
                    p.attach( pTop );

                    let columns = columnData.map( ( c ) => {
                        return c[0].split( '+' )[0];
                    } );

                    const fixedData = LX.deepCopy( currentSheinData );

                    for ( const [ errIndex, errName ] of errorFields )
                    {
                        pTop.addLabel( `No existe ${errName} (${fixedData[errIndex][uid]})` );
                        const possibleIndex = columns.indexOf( errName );
                        pTop.addSelect( errName, columns, columns[possibleIndex], ( v ) => {
                            fixedData[errIndex][errName] = fixedData[errIndex][v];
                        } );
                    }

                    const pBottom = new LX.Panel( { height: 'auto' } );
                    p.attach( pBottom );

                    pBottom.sameLine( 2 );
                    pBottom.addButton( null, 'Ignorar', () => {
                        dialog.close();
                        this.exportSEUR( true );
                    }, { width: '50%', buttonClass: 'bg-error fg-white' } );
                    pBottom.addButton( null, 'Exportar', () => {
                        dialog.close();
                        this.exportSEUR( false, fixedData );
                    }, { width: '50%', buttonClass: 'contrast' } );
                }, { position: [ 'calc(50% - 300px)', '250px' ], size: [ '600px', 'min(600px, 80%)' ] } );

                return;
            }
        }

        const date = new Date();
        const day = `${date.getDate()}`;
        const month = `${date.getMonth() + 1}`;
        const year = `${date.getFullYear()}`;
        const todayStringDate = `${'0'.repeat( 2 - day.length )}${day}_${'0'.repeat( 2 - month.length )}${month}_${year}`;
        const filename = `SEUR_${this.core.tool.substring( 0, this.core.tool.indexOf( '-' ) ).toUpperCase()}_${todayStringDate}.xlsx`;

        let err = 0;
        let errMsg = '';
        let data = columnData.map( ( c, index ) => {
            return c[1] ?? c[0];
        } );

        let errorFn = () => {
            LX.toast( 'Error de exportación', `❌ No se pudo exportar el archivo "${filename}. ${errMsg}`, {
                timeout: -1,
                position: 'top-center'
            } );
        };

        if ( !currentSheinData?.length )
        {
            errMsg = `No existen datos.`;
            errorFn();
            return;
        }

        const orderNumbers = new Map();

        let rows = currentSheinData.map( ( row, index ) => {
            const lRow = [];
            for ( let c of columnData )
            {
                const ogColName = c[0];

                if ( ogColName === uid )
                {
                    const orderNumber = row[ogColName];

                    if ( orderNumbers.has( orderNumber ) )
                    {
                        const val = orderNumbers.get( orderNumber );
                        orderNumbers.set( orderNumber, [ ...val, index ] );
                    }
                    else
                    {
                        orderNumbers.set( orderNumber, [ index ] );
                    }
                }

                if ( ogColName.includes( '+' ) )
                {
                    const tks = ogColName.split( '+' );

                    if ( !ignoreErrors && !row[tks[0]] )
                    {
                        err = 1;
                        errMsg = `No existen direcciones válidas (${row[uid]}).`;
                        return;
                    }

                    lRow.push( `${row[tks[0]] ?? ''}${row[tks[1]] ? ` ${row[tks[1]]}` : ''}` );
                }
                else
                {
                    if ( !ignoreErrors && !row[ogColName] )
                    {
                        err = 1;
                        errMsg = `No existen datos de "${ogColName} (${row[uid]})".`;
                        return;
                    }

                    const fn = c[2] ?? ( ( str ) => str );
                    lRow.push( fn( row[ogColName] ?? '', row ) );
                }
            }
            return lRow;
        } ).filter( ( v ) => v !== undefined );

        if ( err === 1 )
        {
            errorFn();
            return;
        }

        const multipleItemsOrderNames = Array.from( orderNumbers.values() ).filter( ( v ) => v.length > 1 );

        for ( const repeats of multipleItemsOrderNames )
        {
            const skuIdx = data.indexOf( 'SKU del vendedor' );
            const rest = repeats.slice( 1 );
            const trail = rest.reduce( ( p, c ) => p + ` + ${rows[c][skuIdx]}`, '' );
            rest.forEach( ( r ) => {
                rows[r] = undefined;
            } );
            rows[repeats[0]][skuIdx] += trail;
        }

        rows = rows.filter( ( r ) => r !== undefined );

        this.exportXLSXData( [ data, ...rows ], filename, ignoreErrors );
    }

    exportXLSXData( data, filename, ignoreErrors )
    {
        if ( !( data?.length ) )
        {
            LX.toast( 'Error', `❌ No se pudo exportar el archivo "${filename}". No existen datos.`, { timeout: -1,
                position: 'top-center' } );
            return;
        }

        const worksheet = XLSX.utils.aoa_to_sheet( data );
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet( workbook, worksheet, this.core.sheetName ?? 'Sheet1' );
        XLSX.writeFile( workbook, filename );

        if ( !ignoreErrors )
        {
            LX.toast( 'Hecho!', `✅ Datos exportados correctamente: ${filename}`, { timeout: 5000, position: 'top-center' } );
        }
    }

    open( params )
    {
        this.core.tool = 'seur';
        this.core.setHeaderTitle( `Envíos SEUR: <i>Exportador Etiquetas</i>`,
            'Arrastra un <strong>.xlsx</strong> aquí para cargar un nuevo listado de envíos.', 'Truck' );
        this.area.root.classList.toggle( 'hidden', false );
    }

    clear()
    {
        delete this.lastSeurData;
        this.showSheinList( [] );
        this.showDecathlonList( [] );
    }
}

export { SeurApp };
