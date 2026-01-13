import { LX } from 'lexgui';

const TIKTOK_COLUMN_DATA = [
    [ 'Order ID', 'Número del pedido' ],
    [ 'SKU ID', 'ID del artículo' ],
    [ 'Seller SKU', 'SKU del vendedor' ],
    [ 'Zipcode', 'Código Postal', null, ( str ) => str.replaceAll( /[ -]/g, '' ) ],
    [ 'Country', 'País', null, ( str, row ) => {
        return core.countryFormat[str] ?? str;
    } ],
    [ 'Province', 'Provincia' ],
    [ 'City', 'Ciudad' ],
    [ 'Street Name', 'Dirección' ],
    [ 'Recipient', 'Nombre de usuario completo' ],
    [ 'Phone #', 'Número de Teléfono' ],
    [ 'Email', 'Correo electrónico de usuario' ]
];

const TIKTOK_TRACKING_COLUMN_DATA = [
    // [ 'Número del pedido', 'Order Number' ],
    // [ 'ID del artículo', 'Item ID' ],
    // [ 'Tracking Number', null, ( str, row, tdata) => {
    //     const name = row['Nombre de usuario completo'].toUpperCase();
    //     const tentry = tdata.find( (d) => d['CLIENTE DESTINATARIO'] === name );
    //     if( !tentry )
    //     {
    //         const status = core.trackStatusColors['Incidencia'];
    //         let iconStr = status.icon ? LX.makeIcon( status.icon, { svgClass: 'md text-white!' } ).innerHTML : '';
    //         return `${
    //             LX.badge( iconStr, 'text-xs font-bold border-none ', {
    //                 style: { height: '1.4rem', borderRadius: '0.65rem', backgroundColor: status.bg ?? '',
    //                     color: status.fg ?? '' }
    //             } )
    //         }`;
    //     }
    //     return tentry['LOCALIZADOR'];
    // } ],
    // [ 'Logistics Provider', null, () => 'SEUR' ],
    // [ 'Delete', null, () => '' ]
];

class TikTokApp
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
        const utilButtonsPanel = new LX.Panel( { height: 'auto', className: 'bg-none bg-card border-none p-2 flex flex-row gap-2' } );
        utilButtonsPanel.sameLine();
        utilButtonsPanel.addButton( null, 'ClearButton', core.clearData.bind( core ), { icon: 'Trash2', title: 'Limpiar datos anteriores',
            tooltip: true } );
        utilButtonsPanel.addButton( null, 'ExportButton', this.exportSEUR.bind( this, false, this.lastSeurData ), {
            icon: 'Download',
            title: 'Exportar Etiquetas',
            tooltip: true
        } );
        utilButtonsPanel.addButton( null, 'ImportTrackingsButton', this.exportSEURTrackings.bind( this ), {
            icon: 'FileDown',
            title: 'Exportar Seguimiento',
            tooltip: true
        } );
        utilButtonsPanel.endLine();
        this.area.attach( utilButtonsPanel.root );

        const tabs = this.area.addTabs( { parentClass: 'p-4', sizes: [ 'auto', 'auto' ], contentClass: 'p-2 pt-0' } );

        // SEUR
        const seurContainer = LX.makeContainer( [ null, 'auto' ], 'flex flex-col relative bg-card p-1 pt-0 rounded-lg overflow-hidden' );
        tabs.add( 'Pedidos', seurContainer, { selected: true, onSelect: ( event, name ) => this.openData() } );

        const seurArea = new LX.Area( { className: 'bg-inherit rounded-lg' } );
        seurContainer.appendChild( seurArea.root );

        // Groups List
        const groupsListContainer = LX.makeContainer( [ null, 'auto' ],
            'flex flex-col relative bg-card p-1 pt-0 rounded-lg overflow-hidden' );
        tabs.add( 'Listado Stock', groupsListContainer, { xselected: true, onSelect: ( event, name ) => this.showGroupsByCountryList() } );

        const groupsListArea = new LX.Area( { className: 'bg-inherit rounded-lg' } );
        groupsListContainer.appendChild( groupsListArea.root );

        // Tracking info
        // const trackingContainer = LX.makeContainer( [ null, 'auto' ],
        //     'flex flex-col relative bg-card p-1 pt-0 rounded-lg overflow-hidden' );
        // tabs.add( 'Tracking', trackingContainer, { xselected: true, onSelect: ( event, name ) => {
        //     trackingArea.root.innerHTML = "";
        //     trackingArea.attach( this.getTrackingDataDropZone() );
        // } } );

        const trackingArea = new LX.Area( { className: 'bg-inherit rounded-lg' } );
        // trackingContainer.appendChild( trackingArea.root );

        // Move up into the panel section
        utilButtonsPanel.attach( tabs.root );

        this.seurDataArea = seurArea;
        this.groupsListArea = groupsListArea;
        this.trackingArea = trackingArea;

        this.clear();
    }

    openData( fileData )
    {
        fileData = fileData ?? this.lastSeurData;

        // TikTok contains header descriptions in the first row
        fileData = fileData.slice( 1 );

        if ( !fileData.length )
        {
            return;
        }

        this.showTiktokList( fileData );
        this.showGroupsByCountryList( fileData );
    }

    getTrackingDataDropZone()
    {
        const dropZone = LX.makeContainer( [ null, 'auto' ], 'flex flex-col items-center text-center border-top border-bottom gap-4 px-8 py-8', `
            <div class="flex flex-row gap-2 items-center">
                ${ LX.makeIcon( 'FileChartColumn', { svgClass: '2xl mr-2 scale-350 p-2' } ).innerHTML }
            </div>
            <p class="font-light" style="max-width:32rem">Arrastra un .xlsx aquí para cargar un listado de trackings.</p>
        `, this.area );
        dropZone.style.transition = 'transform 0.1s ease-in';

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

        dropZone.addEventListener( 'drop', ( event ) => {
            event.preventDefault();
            event.stopPropagation();
            dropZone.classList.remove( 'draggingover' );

            // Check if a file was dropped
            if ( event.dataTransfer.files.length > 0 )
            {
                const file = event.dataTransfer.files[0];
                if ( file.name.endsWith( '.xlsx' ) || file.name.endsWith( '.xlsm' ) )
                {
                    const reader = new FileReader();
                    reader.onload = ( e ) =>
                    {
                        const data = e.target.result;

                        try
                        {
                            const workbook = XLSX.read( data, { type: 'binary' } );
                            core.sheetName = workbook.SheetNames[0];
                            const sheet = workbook.Sheets[core.sheetName];
                            const rowsData = XLSX.utils.sheet_to_json( sheet, { raw: false } );
                            this.showTrackingList( rowsData );

                            LX.toast( 'Hecho!', `✅ Datos cargados: ${file.name}`, { timeout: 5000, position: 'top-center' } );
                        }
                        catch ( e )
                        {
                            LX.toast( 'Error', '❌ No se pudo leer el archivo.' + e, { timeout: -1, position: 'top-center' } );
                        }
                    };

                    // Read the data as binary
                    reader.readAsArrayBuffer( file );
                }
                else
                {
                    alert( 'Please drop a valid .xlsx file.' );
                }
            }
        } );

        return dropZone;
    }

    showTiktokList( data )
    {
        data = data ?? this.lastSeurData;

        this.vendor = 'TikTok';

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
            for ( let c of TIKTOK_COLUMN_DATA )
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
            head: TIKTOK_COLUMN_DATA.map( ( c ) => {
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

        console.log("tiktok", this.lastSeurData)
    }

    showTrackingList( trackingData )
    {
        console.log(trackingData)

        const data = this.lastSeurData;

        this.vendor = 'TikTok';

        const dom = this.trackingArea.root;
        while ( dom.children.length > 0 )
        {
            dom.removeChild( dom.children[0] );
        }

        // Create table data from the list
        const tableData = data.map( ( row ) => {
            const lRow = [];
            for ( let c of TIKTOK_TRACKING_COLUMN_DATA )
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
                    lRow.push( fn( row[ogColName] ?? '?', row, trackingData ) );
                }
            }
            return lRow;
        } );

        const tableWidget = new LX.Table( null, {
            head: TIKTOK_TRACKING_COLUMN_DATA.map( ( c ) => {
                return c[1] ?? c[0];
            } ),
            body: tableData
        }, {
            selectable: true,
            sortable: false,
            toggleColumns: true,
            centered: true,
            filter: 'Tracking Number'
        } );

        dom.appendChild( tableWidget.root );

        this.lastSeurTrackingsColumnData = tableWidget.data.head;
        this.lastShownSeurTrackingsData = tableWidget.data.body;
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

        // Sort by ref
        {
            data = data.sort( ( a, b ) => {
                return ( a['SKU del vendedor'] ?? '?' ).localeCompare( b['SKU del vendedor'] ?? '?' );
            } );
        }

        let columnData = [
            [ 'Seller SKU', 'SKU del vendedor' ],
            [ 'Cantidad', null, ( str, row ) => parseInt(row['Quantity']) ],
            [ 'Transporte', null, ( str, row ) => {
                return core.getTransportForItem( row['Seller SKU'], parseInt(row['Quantity']) );
            } ],
            [ 'Plataforma', null, () => "TIKTOK" ],
            [ 'Country', 'País', null, ( str, row ) => {
                return core.countryFormat[str] ?? str;
            } ],
            [ 'Observaciones', null ],
            [ 'Order ID', 'Número del pedido' ],
        ];

        const uid = columnData[6][0];
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
            const trail = rest.reduce( ( p, c ) => {
                const q = tableData[ c ][ 1 ]; // Get quantity
                return p + ` + ${tableData[c][0]}${ q > 1 ? ` x ${q}` : '' }`;
            }, '' );
            rest.forEach( ( r ) => {
                tableData[r] = undefined;
            } );
            const finalIndex = repeats[0];
            tableData[finalIndex][0] += trail; // Add REF trail
            tableData[finalIndex][0] = `<span title="${tableData[finalIndex][0]}">${tableData[finalIndex][0]}</span>`;
            tableData[finalIndex][1] = 1; // Set always 1 UNIT for multiple item orders
            tableData[finalIndex][5] = 'Mismo pedido'; // Add NOTES
        }

        tableData = tableData.filter( ( r ) => r !== undefined );

        // Remove unnecessary
        columnData.splice( 6, 1 );

        const listSKU = [];
        const skus = {};

        for ( let row of tableData )
        {
            const sku = `${row[0]}_${row[4]}`; // SKU _ País
            const q = row[1];
            const notes = row[5];

            // Delete order num
            row.splice( 6, 1 );

            // If same order or more than 1 unit, do not merge items
            if( notes === "Mismo pedido" || q > 1 )
            {
                listSKU.push( row );
                continue;
            }

            if ( !skus[sku] )
            {
                // Add a row with 1 unit
                skus[sku] = [ listSKU.length ];
                row[1] = 1;
                listSKU.push( row );
            }
            else
            {
                // merge with the added sku
                const idx = skus[sku][0];
                listSKU[idx][1] += 1;
            }
        }

        for ( let row of listSKU )
        {
            const sku = row[0];
            if ( sku.startsWith( 'JW-T60' ) && !sku.includes( '+' ) 
                // && row[5] !== 'Mismo pedido' 
            )
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
            centered: true,
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
            filter: 'SKU del vendedor',
            customFilters: [
                { name: 'Transporte', options: [ 'CBL', 'SEUR' ] },
                { name: 'País', options: [ 'ESPAÑA', 'FRANCIA', 'PORTUGAL' ] }
            ]
        } );

        this.lastSeurColumnData = tableWidget.data.head;
        this.lastShownSeurData = tableWidget.data.body;

        dom.appendChild( tableWidget.root );
    }

    exportSEUR( ignoreErrors = false, tiktokData )
    {
        let columnData = TIKTOK_COLUMN_DATA;

        const currentTiktokData = tiktokData ?? this.lastSeurData;
        const uid = columnData[0][0];

        // Process the xlsx first to detect empty fields
        if ( !ignoreErrors )
        {
            const errorFields = [];
            currentTiktokData.forEach( ( row, index ) => {
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

                    const fixedData = LX.deepCopy( currentTiktokData );

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
                    }, { width: '50%', buttonClass: 'bg-destructive text-white' } );
                    pBottom.addButton( null, 'Exportar', () => {
                        dialog.close();
                        this.exportSEUR( false, fixedData );
                    }, { width: '50%', buttonClass: 'primary' } );
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

        if ( !currentTiktokData?.length )
        {
            errMsg = `No existen datos.`;
            errorFn();
            return;
        }

        const orderNumbers = new Map();

        let rows = currentTiktokData.map( ( row, index ) => {
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

    exportSEURTrackings()
    {
        const data = [ this.lastSeurTrackingsColumnData, ...this.lastShownSeurTrackingsData ];
        this.exportXLSXData( data, "NUMERODEGUIA.xlsx" );   
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
        this.core.tool = 'tiktok';
        this.core.setHeaderTitle( `TikTok`,
            'Arrastra un <strong>.xlsx</strong> aquí para cargar un nuevo listado de envíos.', 'TikTok' );
        this.area.root.classList.toggle( 'hidden', false );
    }

    close()
    {
    }

    clear()
    {
        delete this.lastSeurData;
        this.showTiktokList( [] );
    }
}

export { TikTokApp };
