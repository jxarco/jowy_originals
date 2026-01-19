import { LX } from 'lexgui';

const TIKTOK_ORDERS_DATA = [
    [ 'Order ID', 'Número del pedido' ],
    [ 'SKU ID', 'ID del artículo' ],
    [ 'Seller SKU', 'SKU del vendedor', ( str, row ) => core.getFinalSku( str ) ],
    [ 'Product Name', null, ( str, row ) => {
        return `<span title='${str}'>${str}</span>`;
    } ],
    [ 'Quantity', 'Cantidad' ],
    [ 'Recipient', 'Nombre de usuario completo' ],
    [ 'Zipcode', 'Código Postal', ( str ) => str.replaceAll( /[ -]/g, '' ) ],
    [ 'Country', 'País', ( str, row ) => {
        return core.countryFormat[str] ?? str;
    } ],
    [ 'Province', 'Provincia' ],
    [ 'City', 'Ciudad' ],
    [ 'Street Name', 'Dirección' ],
    [ 'Phone #', 'Número de Teléfono' ],
    [ 'Email', 'Correo electrónico de usuario' ]
];

const TIKTOK_LABEL_DATA = [
    [ 'Order ID', 'Número del pedido' ],
    [ 'Bultos', null, ( str, row ) => 1 ],
    [ 'Seller SKU', 'SKU del vendedor', ( str, row ) => core.getFinalSku( str ) ],
    [ 'Zipcode', 'Código Postal', ( str ) => str.replaceAll( /[ -]/g, '' ) ],
    [ 'Country', 'País', ( str, row ) => {
        return core.countryFormat[str] ?? str;
    } ],
    [ 'Province', 'Provincia' ],
    [ 'City', 'Ciudad' ],
    [ 'Street Name', 'Dirección' ],
    [ 'Recipient', 'Nombre de usuario completo' ],
    [ 'Phone #', 'Número de Teléfono' ],
    [ 'Email', 'Correo electrónico de usuario' ]
];

    // (str, row, tracking_data, app)
const TIKTOK_TRACKING_COLUMN_DATA = [
    [ 'Order ID', 'ID de pedido' ],
    [ 'Nombre del almacén', null, () => '' ],
    [ 'Destino', null, () => '' ],
    [ 'ID de SKU', null, () => '' ],
    [ 'Nombre de producto', null, () => '' ],
    [ 'Variantes', null, () => '' ],
    [ 'Cantidad', null, () => '' ],
    [ 'Nombre del transportista', null, () => 'Seur' ],
    [ 'ID de seguimiento', null, ( str, row, tdata, app) => {
        const name = row['Recipient'].toUpperCase();
        const tentry = tdata.find( (d) => d['CLIENTE DESTINATARIO'] === name );
        if( !tentry )
        {
            app._trackingSyncErrors.push( { name, uid: `${row['Order ID']}` } );
            const status = core.trackStatusColors['Incidencia'];
            let iconStr = status.icon ? LX.makeIcon( status.icon, { svgClass: 'md text-white!' } ).innerHTML : '';
            return `${
                LX.badge( iconStr, 'text-xs font-bold border-none ', {
                    style: { height: '1.4rem', borderRadius: '0.65rem', backgroundColor: status.bg ?? '',
                        color: status.fg ?? '' }
                } )
            }`;
        }
        return tentry['LOCALIZADOR'];
    } ],
    [ 'ID de recibo', null, () => '' ]
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
        utilButtonsPanel.addButton( null, 'ClearButton', core.clearData.bind( core ), {
            buttonClass: 'lg outline',
            icon: 'Trash2',
            title: 'Limpiar datos anteriores',
            tooltip: true
        } );
        utilButtonsPanel.addButton( null, 'ExportButton', this.exportSEUR.bind( this, false, this.lastSeurData ), {
            buttonClass: 'lg outline',
            icon: 'Download',
            title: 'Exportar Etiquetas',
            tooltip: true
        } );
        utilButtonsPanel.addButton( null, 'ImportTrackingsButton', () => this.exportSEURTrackings(), {
            buttonClass: 'lg outline',
            icon: 'FileDown',
            title: 'Exportar Seguimiento',
            tooltip: true
        } );
        utilButtonsPanel.endLine();
        this.area.attach( utilButtonsPanel.root );

        const tabs = this.area.addTabs( { parentClass: 'p-4', sizes: [ 'auto', 'auto' ], contentClass: 'p-2 pt-0' } );

        // SEUR
        const seurContainer = LX.makeContainer( [ null, 'auto' ], 'flex flex-col relative bg-card p-1 pt-0 rounded-lg overflow-hidden' );
        tabs.add( 'Pedidos', seurContainer, { selected: true, onSelect: ( event, name ) => this.showTiktokList() } );

        const seurArea = new LX.Area( { className: 'bg-inherit rounded-lg' } );
        seurContainer.appendChild( seurArea.root );

        // Groups List
        const groupsListContainer = LX.makeContainer( [ null, 'auto' ], 'flex flex-col relative bg-card p-1 pt-0 rounded-lg overflow-hidden' );
        tabs.add( 'Listado Stock', groupsListContainer, { xselected: true, onSelect: ( event, name ) => this.showStockList() } );

        const groupsListArea = new LX.Area( { className: 'bg-inherit rounded-lg' } );
        groupsListContainer.appendChild( groupsListArea.root );

        // Tracking info
        const trackingContainer = LX.makeContainer( [ null, 'auto' ],
            'flex flex-col relative bg-card p-1 pt-0 rounded-lg overflow-hidden' );
        tabs.add( 'Tracking', trackingContainer, { xselected: true, onSelect: ( event, name ) => {
            trackingArea.root.innerHTML = "";
            trackingArea.attach( this.core.getTrackingDataDropZone( this.area, this.showTrackingList.bind( this ) ) );
        } } );

        const trackingArea = new LX.Area( { className: 'bg-inherit rounded-lg' } );
        trackingContainer.appendChild( trackingArea.root );

        // Move up into the panel section
        utilButtonsPanel.attach( tabs.root );

        this.seurDataArea = seurArea;
        this.groupsListArea = groupsListArea;
        this.trackingArea = trackingArea;
        this._trackingSyncErrors = [];

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
        this.showStockList( fileData );
    }

    showTiktokList( data, clean = false )
    {
        data = data ?? this.lastSeurData;

        this.vendor = 'TikTok';

        const dom = this.seurDataArea.root;
        while ( dom.children.length > 0 )
        {
            dom.removeChild( dom.children[0] );
        }

        if ( clean )
        {
            return;
        }

        // Sort by ref
        {
            data = data.sort( ( a, b ) => {
                const sku_a = this.core.getFinalSku( a['Seller SKU'] ) ?? '?';
                const sku_b = this.core.getFinalSku( b['Seller SKU'] ) ?? '?';
                return sku_a.localeCompare( sku_b );
            } );
        }

        // Create table data from the list
        const tableData = data.map( ( row ) => {
            const lRow = [];
            for ( let c of TIKTOK_ORDERS_DATA )
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
                    const val = fn( row[ogColName] ?? '?', row );
                    lRow.push( val );
                }
            }
            return lRow;
        } );

        this.core.setHeaderTitle( `TikTok: <i>${tableData.length} pedidos cargados</i>`, 'Arrastra un <strong>.xlsx</strong> aquí para cargar un nuevo listado de envíos.',
            'TikTok' );

        const tableWidget = new LX.Table( null, {
            head: TIKTOK_ORDERS_DATA.map( ( c ) => {
                return c[1] ?? c[0];
            } ),
            body: tableData
        }, {
            selectable: true,
            sortable: false,
            toggleColumns: true,
            filter: 'SKU del vendedor',
            centered: [ 'Cantidad' ],
            hiddenColumns: [ 'ID del artículo', 'Provincia', 'Dirección', 'Código Postal', 'Número de Teléfono', 'Correo electrónico de usuario' ]
        } );

        dom.appendChild( tableWidget.root );

        this.lastSeurColumnData = tableWidget.data.head;
        this.lastShownSeurData = tableWidget.data.body;
        this.lastSeurData = data;

        console.log( 'tiktok', this.lastSeurData );
    }

    showStockList( ogData )
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
                const sku_a = this.core.getFinalSku( a['SKU del vendedor'] ) ?? '?';
                const sku_b = this.core.getFinalSku( b['SKU del vendedor'] ) ?? '?';
                return sku_a.localeCompare( sku_b );
            } );
        }

        let columnData = [
            [ 'Seller SKU', 'SKU del vendedor', ( str, row ) => {
                return core.getFinalSku( str );
            } ],
            [ 'Unidades', null, ( str, row ) => parseInt( row['Quantity'] ) ],
            [ 'Transporte', null, ( str, row ) => {
                const sku = this.core.getFinalSku( row['Seller SKU'] );
                return core.getTransportForItem( row['Seller SKU'], parseInt( row['Quantity'] ) );
            } ],
            [ 'Plataforma', null, () => 'TIKTOK' ],
            [ 'Country', 'País', ( str, row ) => {
                return core.countryFormat[str] ?? str;
            } ],
            [ 'Observaciones', null ],
            [ 'Order ID', 'Número del pedido' ]
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
            const finalIndex = repeats[0];
            const finalRow = tableData[finalIndex];
            const finalQuantity = finalRow[1];
            const rest = repeats.slice( 1 );
            const trail = rest.reduce( ( p, c ) => {
                const q = tableData[c][1]; // Get quantity
                return p + ` + ${tableData[c][0]}${q > 1 ? ` x ${q}` : ''}`;
            }, finalQuantity > 1 ? ` x ${finalQuantity}` : '' );
            rest.forEach( ( r ) => {
                tableData[r] = undefined;
            } );
            finalRow[0] += trail; // Add REF trail
            finalRow[0] = `<span title="${finalRow[0]}">${finalRow[0]}</span>`;
            finalRow[1] = 1; // Set always 1 UNIT for multiple item orders
            finalRow[5] = 'Mismo pedido'; // Add NOTES
        }

        tableData = tableData.filter( ( r ) => r !== undefined );

        // Remove unnecessary
        columnData.splice( 6, 1 );

        const listSKU = [];
        const skus = {};

        for ( let row of tableData )
        {
            // if sku starts with "JW-T60", never combine with others, so we must
            // add a unique identifier in the sku
            let sku = `${row[0]}_${row[4]}`; // SKU _ País
            sku += sku.includes( 'JW-T60' ) ? `_${LX.guidGenerator()}` : '';

            const q = row[1];
            const notes = row[5];

            // Delete order num
            row.splice( 6, 1 );

            // If same order or more than 1 unit, do not merge items
            if ( q > 1 )
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

        // do it by individual units, not in item combined orders
        for ( let row of listSKU )
        {
            const sku = row[0];

            if ( sku.includes( '+' ) )
            {
                continue;
            }

            row[1] = this.core.getIndividualQuantityPerPack( sku, parseInt( row[1] ) );
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

    showTrackingList( trackingData )
    {
        const data = this.lastSeurData;

        const dom = this.trackingArea.root;
        while ( dom.children.length > 0 )
        {
            dom.removeChild( dom.children[0] );
        }

        this._trackingSyncErrors = [];

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
                    const val = fn( row[ogColName] ?? '?', row, trackingData, this );
                    lRow.push( val );
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

    exportSEUR( ignoreErrors = false, tiktokData )
    {
        let columnData = TIKTOK_LABEL_DATA;

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
                    else
                    {
                        const v = c[2] ? c[2]( row[ogColName], row ) : row[ogColName];
                        if ( v === undefined )
                        {
                            errorFields.push( [ index, ogColName ] );
                        }
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
        const filename = `SEUR_tiktok_${todayStringDate}.xlsx`;

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

            // discard orders sent with CBL
            const sku = this.core.getFinalSku( row['Seller SKU'] );
            const transport = this.core.getTransportForItem( sku, row['Quantity'] );
            if( transport === 'CBL' ) return;


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
                    const v = c[2] ? c[2]( row[ogColName], row ) : row[ogColName];

                    if ( !ignoreErrors && v === undefined )
                    {
                        err = 1;
                        errMsg = `No existen datos de "${ogColName} (${row[uid]})".`;
                        return;
                    }

                    lRow.push( v );
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
            const finalIndex = repeats[0];
            const finalRow = rows[finalIndex];
            const finalQuantity = finalRow['Quantity'];
            const rest = repeats.slice( 1 );
            const trail = rest.reduce( ( p, c ) => {
                const q = parseInt( currentTiktokData[c]['Quantity'] ); // Get quantity
                return p + ` + ${rows[c][skuIdx]}${q > 1 ? ` x ${q}` : ''}`;
            }, finalQuantity > 1 ? ` x ${finalQuantity}` : '' );
            rest.forEach( ( r ) => {
                rows[r] = undefined;
            } );
            finalRow[skuIdx] += trail;
        }

        rows = rows.filter( ( r ) => r !== undefined );

        this.exportXLSXData( [ data, ...rows ], filename, ignoreErrors );
    }

    exportSEURTrackings( fixedData, ignoreErrors )
    {
        const filename = 'NUMERODEGUIA_TIKTOK.xlsx';
        const data = fixedData ?? [ this.lastSeurTrackingsColumnData, ...this.lastShownSeurTrackingsData ];

        if ( !ignoreErrors && this._trackingSyncErrors.length )
        {
            const dialog = new LX.Dialog( '❌ Solucionar errores', ( p ) => {
                LX.addClass( p.root, 'p-2 flex flex-col overflow-scroll' );

                const pTop = new LX.Panel({className: 'flex flex-col gap-1 overflow-scroll'});
                p.attach( pTop );

                for ( const { name, uid } of this._trackingSyncErrors )
                {
                    LX.makeElement( 'div', '[&_span]:font-bold [&_span]:text-foreground', `No existe tracking para <span>${name}</span> (${uid})`, pTop );
                    const possibleIndex = data.findIndex( d => `${d[0]}` === uid );
                    // console.log(possibleIndex)
                    const trackAttrName = "ID de seguimiento";
                    pTop.addText( trackAttrName, "", ( v ) => {
                        const colIdx = this.lastSeurTrackingsColumnData.indexOf( trackAttrName );
                        data[possibleIndex][colIdx] = v;
                    } );
                    pTop.addSeparator();
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
                    this.exportSEURTrackings( data, true );
                }, { width: '50%', buttonClass: 'primary' } );
            }, { position: [ 'calc(50% - 300px)', '250px' ], size: [ '600px', 'min(600px, 80%)' ] } );
            return;
        }

        this.exportXLSXData( data, filename );
    }

    exportXLSXData( data, filename, ignoreErrors )
    {
        if ( !( data?.length ) )
        {
            LX.toast( 'Error', `❌ No se pudo exportar el archivo "${filename}". No existen datos.`, { timeout: -1, position: 'top-center' } );
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
        this.core.setHeaderTitle( `TikTok`, 'Arrastra un <strong>.xlsx</strong> aquí para cargar un nuevo listado de envíos.', 'TikTok' );
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
