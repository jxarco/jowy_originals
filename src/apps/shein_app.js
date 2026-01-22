import { LX } from 'lexgui';
import { Data } from '../data.js';
import { Constants, NumberFormatter } from '../constants.js';

const SKU_ATTR = 'SKU del vendedor';
const PAIS_ATTR = 'País';
const CP_ATTR = 'Código Postal';

const SHEIN_ORDERS_DATA = [
    [ 'Número del pedido' ],
    [ 'ID del artículo' ],
    [ SKU_ATTR ],
    [ 'Nombre del producto', null, ( str, row ) => {
        return `<span title='${str}'>${str}</span>`;
    } ],
    [ 'Nombre de usuario completo' ],
    [ CP_ATTR ],
    [ PAIS_ATTR ],
    [ 'Provincia', null ],
    [ 'Ciudad', null ],
    [ 'dirección de usuario 1+dirección de usuario 2', 'Dirección' ],
    [ 'Número de Teléfono' ],
    [ 'Correo electrónico de usuario' ]
];

const SHEIN_LABEL_DATA = [
    [ 'Número del pedido' ],
    [ 'Bultos', null, ( row, i ) => 1 ],
    [ SKU_ATTR ],
    [ CP_ATTR ],
    [ PAIS_ATTR ],
    [ 'Provincia', null ],
    [ 'Ciudad', null ],
    [ 'dirección de usuario 1+dirección de usuario 2', 'Dirección' ],
    [ 'Nombre de usuario completo' ],
    [ 'Número de Teléfono' ],
    [ 'Correo electrónico de usuario' ]
];

const SHEIN_TRACKING_DATA = [
    [ 'Número del pedido', 'Order Number' ],
    [ 'ID del artículo', 'Item ID' ],
    [ 'Tracking Number', null, ( str, row, tdata, app ) => {
        const name = row['Nombre de usuario completo'].toUpperCase();
        const tentry = tdata.find( ( d ) => d['CLIENTE DESTINATARIO'] === name );
        if ( !tentry )
        {
            app._trackingSyncErrors.push( { name, uid: `${row['Número del pedido']}_${row['ID del artículo']}` } );
            const status = core.trackStatusColors['Incidencia'];
            let iconStr = status.icon ? LX.makeIcon( status.icon, { svgClass: 'md text-white!' } ).innerHTML : '';
            return `${
                LX.badge( iconStr, 'text-xs font-bold border-none ', {
                    style: { height: '1.4rem', borderRadius: '0.65rem', backgroundColor: status.bg ?? '', color: status.fg ?? '' }
                } )
            }`;
        }
        return tentry['LOCALIZADOR'];
    } ],
    [ 'Logistics Provider', null, () => 'SEUR' ],
    [ 'Delete', null, () => '' ]
];

class SheinApp
{
    constructor( core )
    {
        this.subtitle = 'Arrastra un <strong>.xlsx</strong> o haz click aquí para cargar un nuevo listado de envíos.';
        this.icon = 'Shein';
        this.core = core;
        this.area = new LX.Area( { skipAppend: true, className: 'hidden' } );
        this.core.area.attach( this.area );

        // Create utility buttons
        const utilButtonsPanel = new LX.Panel( { height: 'auto', className: Constants.UTILITY_BUTTONS_PANEL_CLASSNAME } );
        utilButtonsPanel.sameLine();
        utilButtonsPanel.addButton( null, 'ClearButton', this.core.clearData.bind( this.core ), {
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
        const seurContainer = LX.makeContainer( [ null, 'auto' ], Constants.TAB_CONTAINER_CLASSNAME );
        tabs.add( 'Pedidos', seurContainer, { selected: true, onSelect: ( event, name ) => this.showSheinList() } );
        const seurArea = new LX.Area( { className: Constants.TAB_AREA_CLASSNAME } );
        seurContainer.appendChild( seurArea.root );

        // Groups List
        const groupsListContainer = LX.makeContainer( [ null, 'auto' ], Constants.TAB_CONTAINER_CLASSNAME );
        tabs.add( 'Listado Stock', groupsListContainer, { xselected: true, onSelect: ( event, name ) => this.showStockList() } );
        const groupsListArea = new LX.Area( { className: Constants.TAB_AREA_CLASSNAME } );
        groupsListContainer.appendChild( groupsListArea.root );

        // Tracking info
        const trackingContainer = LX.makeContainer( [ null, 'auto' ], Constants.TAB_CONTAINER_CLASSNAME );
        tabs.add( 'Seguimiento', trackingContainer, { xselected: true, onSelect: ( event, name ) => {
            trackingArea.root.innerHTML = '';
            trackingArea.attach( this.core.createDropZone( this.area, this.showTrackingList.bind( this ), 'un listado de trackings' ) );
        } } );
        const trackingArea = new LX.Area( { className: Constants.TAB_AREA_CLASSNAME } );
        trackingContainer.appendChild( trackingArea.root );

        // Albaran/IVA/Etc List
        const albaranContainer = LX.makeContainer( [ null, 'auto' ], Constants.TAB_CONTAINER_CLASSNAME );
        tabs.add( 'IVA/Albarán', albaranContainer, { xselected: true, onSelect: ( event, name ) => {
            albaranArea.root.innerHTML = '';
            albaranArea.attach( this.core.createDropZone( this.area, this.showAlbaranRelatedInfo.bind( this ), 'listados de envíos' ) );
        } } );
        const albaranArea = new LX.Area( { className: Constants.TAB_AREA_CLASSNAME } );
        albaranContainer.appendChild( albaranArea.root );

        // Move up into the panel section
        utilButtonsPanel.attach( tabs.root );

        this.seurDataArea = seurArea;
        this.groupsListArea = groupsListArea;
        this.albaranArea = albaranArea;
        this.trackingArea = trackingArea;
        this._trackingSyncErrors = [];

        this.clear();
    }

    openData( fileData )
    {
        if ( !fileData?.length )
        {
            return;
        }

        // Map SKUs and Country once on load data
        fileData.forEach( r => {
            const ogSku = r[SKU_ATTR];
            r[SKU_ATTR] = this.core.mapSku( ogSku );
            // if( ogSku !== r[SKU_ATTR] ) console.warn( `SKU mapped from ${ogSku} to ${r[SKU_ATTR]}` );
            const ogCountry = r[PAIS_ATTR];
            r[PAIS_ATTR] = this.core.mapCountry( ogCountry );
            // if( ogCountry !== r[PAIS_ATTR] ) console.warn( `Country mapped from ${ogCountry} to ${r[PAIS_ATTR]}` );
            const ogZipCode = r[CP_ATTR];
            r[CP_ATTR] = this.core.mapZipCode( ogZipCode );
            // if( ogZipCode !== r[CP_ATTR] ) console.warn( `Zip Code mapped from ${ogZipCode} to ${r[CP_ATTR]}` );
        });

        this.showSheinList( fileData );
        this.showStockList( fileData );
    }

    showSheinList( data )
    {
        data = data ?? this.lastSeurData;

        const dom = this.seurDataArea.root;
        while ( dom.children.length > 0 )
        {
            dom.removeChild( dom.children[0] );
        }

        // Sort by ref
        {
            data = data.sort( ( a, b ) => {
                const sku_a = a[SKU_ATTR] ?? '?';
                const sku_b = b[SKU_ATTR] ?? '?';
                return sku_a.localeCompare( sku_b );
            } );
        }

        // console.log(data);

        // Create table data from the list
        const tableData = data.map( ( row ) => {
            const lRow = [];
            for ( let c of SHEIN_ORDERS_DATA )
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

        this.core.setHeaderTitle( `SHEIN: <i>${tableData.length} pedidos cargados</i>`, this.subtitle, this.icon );

        const tableWidget = new LX.Table( null, {
            head: SHEIN_ORDERS_DATA.map( ( c ) => {
                return c[1] ?? c[0];
            } ),
            body: tableData
        }, {
            selectable: true,
            sortable: false,
            toggleColumns: true,
            centered: [ 'Número del pedido', 'ID del artículo', SKU_ATTR ],
            filter: SKU_ATTR,
            hiddenColumns: [ 'ID del artículo', 'Provincia', 'Dirección', CP_ATTR, 'Número de Teléfono', 'Correo electrónico de usuario' ]
        } );

        dom.appendChild( tableWidget.root );

        this.lastSeurColumnData = tableWidget.data.head;
        this.lastShownSeurData = tableWidget.data.body;
        this.lastSeurData = data;
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
                const sku_a = a[SKU_ATTR] ?? '?';
                const sku_b = b[SKU_ATTR] ?? '?';
                return sku_a.localeCompare( sku_b );
            } );
        }

        let columnData = [
            [ SKU_ATTR ],
            [ 'Unidades', null ],
            [ 'Transporte', null, () => 'SEUR' ],
            [ 'Plataforma', null, () => 'SHEIN' ],
            [ PAIS_ATTR ],
            [ 'Observaciones', null ],
            [ 'Número del pedido', null ]
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
            const rest = repeats.slice( 1 );
            const trail = rest.reduce( ( p, c ) => p + ` + ${tableData[c][0]}`, '' );
            rest.forEach( ( r ) => {
                tableData[r] = undefined;
            } );
            finalRow[0] += trail;
            finalRow[5] = 'Mismo pedido';
        }

        tableData = tableData.filter( ( r ) => r !== undefined );

        // Remove unnecessary
        columnData.splice( 6, 1 );

        const listSKU = [];
        const skus = {};

        for ( let row of tableData )
        {
            let sku = `${row[0]}_${row[4]}`; // SKU _ País

            // if sku starts with 'JW-T60', never combine with others, so we must
            // add a unique identifier in the sku
            sku += sku.includes( 'JW-T60' ) ? `_${LX.guidGenerator()}` : '';

            if ( !skus[sku] )
            {
                skus[sku] = [ listSKU.length ];
                row[1] = 1;
                row.splice( 6, 1 );  // Delete order num
                listSKU.push( row );
            }
            else
            {
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

        // for the skus that contain '+', change the sku to sku x quantity in each of them
        // only for SHEIN, since we don't have the quantity until now
        for ( let row of listSKU )
        {
            const sku = row[0];

            if ( !sku.includes( '+' ) )
            {
                continue;
            }

            const skusList = sku.split( '+' ).map( ( s ) => s.trim() );
            const uniqueSkus = Array.from( new Set( skusList ) );
            const quantities = uniqueSkus.map( ( s ) => skusList.filter( ( x ) => x === s ).length );
            const newSkuParts = uniqueSkus.map( ( s, i ) => {
                const q = quantities[i];
                return `${s}${q > 1 ? ` x ${q}` : ''}`;
            } );
            row[0] = newSkuParts.join( ' + ' );
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
            filter: SKU_ATTR,
            customFilters: [
                { name: PAIS_ATTR, options: [ 'ESPAÑA', 'FRANCIA', 'PORTUGAL' ] }
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
            for ( let c of SHEIN_TRACKING_DATA )
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
            head: SHEIN_TRACKING_DATA.map( ( c ) => {
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

    exportSEUR( ignoreErrors = false, sheinData )
    {
        let columnData = SHEIN_LABEL_DATA;

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
        const filename = `SEUR_shein_${todayStringDate}.xlsx`;

        let err = 0;
        let errMsg = '';
        let data = columnData.map( ( c, index ) => {
            return c[1] ?? c[0];
        } );

        let errorFn = () => {
            LX.toast( 'Error de exportación', `❌ No se pudo exportar el archivo: ${filename}. ${errMsg}`, {
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
                    const v = c[2] ? c[2]( row[ogColName], row ) : row[ogColName];

                    if ( !ignoreErrors && v === undefined )
                    {
                        err = 1;
                        errMsg = `No existen datos de ${ogColName} (${row[uid]}).`;
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
            const skuIdx = data.indexOf( SKU_ATTR );
            const rest = repeats.slice( 1 );
            const trail = rest.reduce( ( p, c ) => p + ` + ${rows[c][skuIdx]}`, '' );
            rest.forEach( ( r ) => {
                rows[r] = undefined;
            } );
            rows[repeats[0]][skuIdx] += trail;
        }

        rows = rows.filter( ( r ) => r !== undefined );

        // for the skus that contain '+', change the sku to sku x quantity in each of them
        // only for SHEIN, since we don't have the quantity until now
        for ( let row of rows )
        {
            const sku = row[2];

            if ( !sku.includes( '+' ) )
            {
                continue;
            }

            const skusList = sku.split( '+' ).map( ( s ) => s.trim() );
            const uniqueSkus = Array.from( new Set( skusList ) );
            const quantities = uniqueSkus.map( ( s ) => skusList.filter( ( x ) => x === s ).length );
            const newSkuParts = uniqueSkus.map( ( s, i ) => {
                const q = quantities[i];
                return `${s}${q > 1 ? ` x ${q}` : ''}`;
            } );
            row[2] = newSkuParts.join( ' + ' );
        }

        this.core.exportXLSXData( [ data, ...rows ], filename, ignoreErrors );
    }

    exportSEURTrackings( fixedData, ignoreErrors )
    {
        const filename = 'NUMERODEGUIA_SHEIN.xlsx';
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
                    const possibleIndex = data.findIndex( d => `${d[0]}_${d[1]}` === uid );
                    // console.log(possibleIndex)
                    const trackAttrName = 'Tracking Number';
                    pTop.addText( trackAttrName, '', ( v ) => {
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
        
        this.core.exportXLSXData( data, filename );
    }

    showAlbaranRelatedInfo( data, albNumber )
    {
        if( !albNumber || Number.isNaN( albNumber ) )
        {
            LX.prompt( null, 'Número de albarán', (v) => {
                albNumber = parseFloat( v );
                this.showAlbaranRelatedInfo( data, albNumber );
            } );
            return;
        }

        this.albNumber = albNumber;

        data = data ?? this.lastSeurData;

        // Map SKUs and Country once on load data
        data.forEach( r => {
            const ogSku = r[SKU_ATTR];
            r[SKU_ATTR] = this.core.mapSku( ogSku );
            // if( ogSku !== r[SKU_ATTR] ) console.warn( `SKU mapped from ${ogSku} to ${r[SKU_ATTR]}` );
            const ogCountry = r[PAIS_ATTR];
            r[PAIS_ATTR] = this.core.mapCountry( ogCountry );
            // if( ogCountry !== r[PAIS_ATTR] ) console.warn( `Country mapped from ${ogCountry} to ${r[PAIS_ATTR]}` );
            const ogZipCode = r[CP_ATTR];
            r[CP_ATTR] = this.core.mapZipCode( ogZipCode );
            // if( ogZipCode !== r[CP_ATTR] ) console.warn( `Zip Code mapped from ${ogZipCode} to ${r[CP_ATTR]}` );
        });

        const dom = this.albaranArea.root;
        while ( dom.children.length > 0 )
        {
            dom.removeChild( dom.children[0] );
        }

        // Sort by ref
        {
            data = data.sort( ( a, b ) => {
                const sku_a = a[SKU_ATTR] ?? '?';
                const sku_b = b[SKU_ATTR] ?? '?';
                return sku_a.localeCompare( sku_b );
            } );
        }

        console.log(data);
        
        const tmpArea = new LX.Area( { className: 'w-full h-full p-0 m-0', skipAppend: true } );
        this.albaranArea.attach( tmpArea );

        // Create utility buttons
        const utilButtonsPanel = new LX.Panel( { height: 'auto', className: Constants.UTILITY_BUTTONS_PANEL_CLASSNAME } );
        utilButtonsPanel.sameLine();
        utilButtonsPanel.addButton( null, 'ExportIVAButton', () => this.exportIVA(), {
            buttonClass: 'lg outline',
            icon: 'Euro',
            title: 'Exportar IVA',
            tooltip: true
        } );
        utilButtonsPanel.addButton( null, 'ExportAlbaranes', () => this.exportAlbaranes(), {
            buttonClass: 'lg outline',
            icon: 'FileArchive',
            title: 'Exportar Albaranes',
            tooltip: true
        } );
        const exportOptionsButton = utilButtonsPanel.addButton( null, 'ExportOptions', () => {
            LX.addDropdownMenu( exportOptionsButton.root, [
                {
                    name: 'Exportar LAL',
                    icon: 'List',
                    submenu: [
                        {
                            name: 'España',
                            callback: ( v ) => this.exportLAL( v.toUpperCase() )
                        },
                        {
                            name: 'Portugal',
                            callback: ( v ) => this.exportLAL( v.toUpperCase() )
                        },
                    ]
                },
                null,
                {
                    name: 'Exportar ALB',
                    icon: 'File',
                    submenu: [
                        {
                            name: 'España',
                            callback: ( v ) => this.exportALB( v.toUpperCase() )
                        },
                        {
                            name: 'Portugal',
                            callback: ( v ) => this.exportALB( v.toUpperCase() )
                        },
                    ]
                },
            ], { side: 'bottom', align: 'start' } );
        }, {
            buttonClass: 'lg outline',
            icon: 'EllipsisVertical',
            title: 'Más opciones',
            tooltip: true
        } );
        utilButtonsPanel.addLabel( `NÚMERO ALBARÁN: ${this.albNumber}`, { fit: true } );
        utilButtonsPanel.endLine();
        tmpArea.attach( utilButtonsPanel.root );

        const tabs = tmpArea.addTabs( { parentClass: 'p-4', sizes: [ 'auto', 'auto' ], contentClass: 'p-0' } );
        const weekN = this.core.getWeekNumber();

        const getPriceWithoutIVA = ( row ) => {
            let country = row[PAIS_ATTR];
            const iva = core.countryIVA[country];
            if( !iva ) LX.toast( 'Aviso!', `⚠️ Falta IVA para el país ${country}: Using 21%.`, { timeout: 5000, position: 'top-center' } );
            const priceWithoutIVA = parseFloat( row['precio de los productos básicos'] ) / ( iva ?? 1.21 );
            const formatted = NumberFormatter.format( priceWithoutIVA );
            return parseFloat( formatted.replace( '€', '' ).replace( ',', '.' ).trim() );
        };

        // IVA
        {
            const IVAContainer = LX.makeContainer( [ null, 'auto' ], Constants.TAB_CONTAINER_CLASSNAME.replace( 'rounded-lg', '' ) );
            tabs.add( 'IVA', IVAContainer, { selected: true } );

            const IVA_COLS = [
                [ PAIS_ATTR ],
                [ 'Número del pedido', 'NÚMERO PEDIDO' ],
                [ 'Fecha y hora de creación de pedido', 'FECHA PEDIDO' ],
                [ SKU_ATTR, 'REF' ],
                [ 'CANTIDAD', null, ( str, row ) => {
                    const sku = row[SKU_ATTR];
                    return core.getIndividualQuantityPerPack( sku, 1 );
                } ],
                [ 'PRECIO SIN IVA', null, ( str, row ) => getPriceWithoutIVA( row ) ],
                [ 'IVA', null, ( str, row ) => {
                    const priceWithoutIVA = getPriceWithoutIVA( row );
                    const totalIva = parseFloat( row['precio de los productos básicos'] ) - priceWithoutIVA;
                    const formatted = NumberFormatter.format( totalIva );
                    return parseFloat( formatted.replace( '€', '' ).replace( ',', '.' ).trim() );
                } ],
                [ 'precio de los productos básicos', 'PVP', ( str, row ) => {
                    const formatted = NumberFormatter.format( str );
                    return parseFloat( formatted.replace( '€', '' ).replace( ',', '.' ).trim() );
                } ],
            ];

            // Create table data from the list
            const tableData = data.map( ( row ) => {
                const lRow = [];
                for ( let c of IVA_COLS )
                {
                    const ogColName = c[0];
                    const fn = c[2] ?? ( ( str ) => str );
                    lRow.push( fn( row[ogColName] ?? '?', row ) );
                }
                return lRow;
            } );

            const tableWidget = new LX.Table( null, {
                head: IVA_COLS.map( ( c ) => {
                    return c[1] ?? c[0];
                } ),
                body: tableData
            }, {
                selectable: false,
                sortable: false,
                toggleColumns: true,
                centered: [ 'CANTIDAD', 'PRECIO SIN IVA', 'IVA', 'PVP' ],
                filter: 'NÚMERO PEDIDO',
                customFilters: [
                    { name: PAIS_ATTR, options: Object.keys( this.core.countryIVA ) }
                ]
            } );

            IVAContainer.appendChild( tableWidget.root );

            this.lastSeurIVAColumnData = tableWidget.data.head;
            this.lastShownSeurIVAData = tableWidget.data.body;
        }

        // LAL
        {
            const LALContainer = LX.makeContainer( [ null, 'auto' ], Constants.TAB_CONTAINER_CLASSNAME.replace( 'rounded-lg', '' ) );
            tabs.add( 'LAL', LALContainer, { xselected: true } );

            const getProductPrice = ( row ) => {
                const totalFormatted = NumberFormatter.format( row['Total'] );
                const total = parseFloat( totalFormatted.replace( '€', '' ).replace( ',', '.' ).trim() );
                const productPrice = total / row['Cantidad'];
                const productPriceFormatted = NumberFormatter.format( productPrice );
                return parseFloat( productPriceFormatted.replace( '€', '' ).replace( ',', '.' ).trim() );
            };

            this.LAL_COLS = [
                [ PAIS_ATTR ],
                [ 'Serie', null, () => '1' ], // 'A',
                [ 'Número', null, () => -1 ], // 'B',   -> fixed on export
                [ 'Posición', null, () => -1 ], // 'C', -> fixed on export
                [ 'Artículo' ], // 'D',
                [ 'Descripción' ], // 'E',
                [ 'Cantidad' ], // 'F',
                [ '' ], // 'G',
                [ '' ], // 'H',
                [ '' ], // 'I',
                [ 'Precio', null, ( str, row ) => getProductPrice( row ) ], // 'J',
                [ 'Base', null, ( str, row ) => {
                    const productPrice = getProductPrice( row );
                    const basePrice = productPrice * row['Cantidad'];
                    const basePriceFormatted = NumberFormatter.format( basePrice );
                    return parseFloat( basePriceFormatted.replace( '€', '' ).replace( ',', '.' ).trim() );
                } ], // 'K',
                [ 'T', null, () => 0 ], // 'L',
                [ '' ], // 'M',
                [ '' ], // 'N',
                [ '' ], // 'O',
                [ '' ], // 'P',
                [ '' ], // 'Q',
                [ '' ], // 'R',
                [ '' ], // 'S',
                [ '' ], // 'T',
                [ '' ], // 'U',
                [ '' ], // 'V',
                [ '' ], // 'W',
                [ '' ], // 'X',
                [ '' ], // 'Y',
                [ 'I', null, () => 0 ], // 'Z',
                [ '' ], // 'AA'
                [ '' ], // 'AB'
                [ '' ], // 'AC'
                [ '' ], // 'AD'
                [ '' ], // 'AE'
                [ 'Total', null, ( str ) => {
                    const formatted = NumberFormatter.format( str );
                    return parseFloat( formatted.replace( '€', '' ).replace( ',', '.' ).trim() );
                } ], // 'AF'
                [ 'Cantidad', 'CantidadR' ], // 'AG'
            ];

            const skus = {};
            const totalTransportPerComp = {};

            data.forEach( ( row ) => {
                const sku = row[SKU_ATTR];
                const prefix = sku.substring( 0, sku.indexOf( '-' ) );
                const country = row[PAIS_ATTR];
                const priceWithoutIVA = getPriceWithoutIVA( row );
                const transportPrice = ( country === 'ESPAÑA' ) ? 0.25 : 0.26;
                const totalProductTransport = priceWithoutIVA * transportPrice;
                
                const productTotalFormatted = NumberFormatter.format( priceWithoutIVA - totalProductTransport );
                const productTotal = parseFloat( productTotalFormatted.replace( '€', '' ).replace( ',', '.' ).trim() );
                const totalQuantity = this.core.getIndividualQuantityPerPack( sku, 1 );

                let skuIdx = `${sku}_${country}`;
                if( !skus[skuIdx] )
                {
                    const product = Data.sku[sku];
                    skus[skuIdx] = {
                        'Artículo': sku,
                        'Descripción': product?.['DESCRIPCIÓN'] ?? '',
                        'Cantidad': totalQuantity,
                        'Total': productTotal,
                        PAIS_ATTR: country
                    }
                }
                else
                {
                    const product = skus[skuIdx];
                    product['Cantidad'] += totalQuantity;
                    product['Total'] += productTotal;
                }

                // Update transport total per country
                const tCompIdx = `${prefix}_${country}`;
                if( !totalTransportPerComp[tCompIdx] ) totalTransportPerComp[tCompIdx] = 0;
                totalTransportPerComp[tCompIdx] += totalProductTransport;
            } );

            // Create table data from the list
            let modifiedData = Object.values( skus );

            modifiedData.push(
                // España
                { 'Artículo': 'P01', 'Descripción': 'Transporte Jowy', 'Cantidad': 1, 'Total': totalTransportPerComp['JW_ESPAÑA'] ?? 0, PAIS_ATTR: 'ESPAÑA' },
                { 'Artículo': 'P02', 'Descripción': 'Transporte HxG', 'Cantidad': 1, 'Total': totalTransportPerComp['HG_ESPAÑA'] ?? 0, PAIS_ATTR: 'ESPAÑA' },
                { 'Artículo': 'P03', 'Descripción': 'Transporte Fucklook', 'Cantidad': 1, 'Total': totalTransportPerComp['FL_ESPAÑA'] ?? 0, PAIS_ATTR: 'ESPAÑA' },
                { 'Artículo': 'P04', 'Descripción': 'Transporte Bathby', 'Cantidad': 1, 'Total': totalTransportPerComp['BY_ESPAÑA'] ?? 0, PAIS_ATTR: 'ESPAÑA' },
                // Portugal
                { 'Artículo': 'P01', 'Descripción': 'Transporte Jowy', 'Cantidad': 1, 'Total': totalTransportPerComp['JW_PORTUGAL'] ?? 0, PAIS_ATTR: 'PORTUGAL' },
                { 'Artículo': 'P02', 'Descripción': 'Transporte HxG', 'Cantidad': 1, 'Total': totalTransportPerComp['HG_PORTUGAL'] ?? 0, PAIS_ATTR: 'PORTUGAL' },
                { 'Artículo': 'P03', 'Descripción': 'Transporte Fucklook', 'Cantidad': 1, 'Total': totalTransportPerComp['FL_PORTUGAL'] ?? 0, PAIS_ATTR: 'PORTUGAL' },
                { 'Artículo': 'P04', 'Descripción': 'Transporte Bathby', 'Cantidad': 1, 'Total': totalTransportPerComp['BY_PORTUGAL'] ?? 0, PAIS_ATTR: 'PORTUGAL' },
            );

            // Remove rows with total = 0 (e.g. transports not used, etc)
            modifiedData = modifiedData.filter( d => d['Total'] > 0 );

            // Process with COL info
            const tableData = modifiedData.map( ( row ) => {
                const lRow = [];
                for ( let c of this.LAL_COLS )
                {
                    const ogColName = c[0];
                    if( ogColName === '' ) continue;
                    const fn = c[2] ?? ( ( str ) => str );
                    lRow.push( fn( row[ogColName] ?? '?', row ) );
                }
                return lRow;
            } );

            const tableWidget = new LX.Table( null, {
                head: this.LAL_COLS.map( ( c ) => {
                    return c[1] ?? c[0];
                } ).filter( v => v !== '' ),
                body: tableData
            }, {
                selectable: false,
                sortable: false,
                toggleColumns: true,
                centered: [ 'Serie', 'Posición', 'Número', 'Cantidad', 'Precio', 'Base', 'T', 'I', 'Total', 'CantidadR' ],
                filter: 'Artículo',
                hiddenColumns: [ 'Serie', 'Posición', 'Número' ]
            } );

            LALContainer.appendChild( tableWidget.root );

            this.lastShownSeurLALData = tableWidget.data.body;
        }

        // ALB
        {
            const ALBContainer = LX.makeContainer( [ null, 'auto' ], Constants.TAB_CONTAINER_CLASSNAME.replace( 'rounded-lg', '' ) );
            tabs.add( 'ALB', ALBContainer, { xselected: true } );

            this.ALB_COLS = [
                [ PAIS_ATTR ],
                [ 'Serie', null, () => '1' ], // 'A',
                [ 'Número', null, () => -1 ], // 'B',
                [ '' ], // 'C',
                [ 'Fecha', null, () => {
                    const date = new Date();
                    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
                } ], // 'D',
                [ 'Estado', null, () => 0 ], // 'E',
                [ 'Alm', null, () => 'LLA' ], // 'F',
                [ 'Agente', null, () => 7 ], // 'G',
                [ '' ], // 'H',
                [ 'CD.Cliente', 'Cliente' ], // 'I',
                [ 'Cliente' ], // 'J',
                [ '' ], [ '' ], [ '' ], [ '' ], [ '' ],// 'K', 'L', 'M', 'N', 'O',
                [ 'IVA', null, () => 0 ], // 'P',
                [ 'Recargo', null, () => 0 ], // 'Q',
                [ '' ], // 'R',
                [ 'Neto' ], // 'S',
                // 'T' -> 'AS'
                [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ],
                [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ],
                [ 'Neto', 'Base' ], // 'AT'
                [ '' ], [ '' ], // 'AU', 'AV'
                [ 'IVA' ], // 'AW'
                [ '' ], [ '' ], // 'AX', 'AY'
                [ 'Cuota', null, ( str, row ) => {
                    const net = row['Neto'];
                    return net * parseInt( row['IVA'] ) * 0.01;
                } ], // 'AZ'
                [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ],// 'BA', 'BB', 'BC', 'BD', 'BE','BF', 'BG','BH', 'BI', 'BJ'
                [ 'Total', null, ( str, row ) => {
                    const net = row['Neto'];
                    return net * ( 1.0 + parseInt( row['IVA'] ) * 0.01 );
                } ], // 'BK'
                [ 'Pago', null, () => 'TR' ], // 'BL'
                [ 'Portes', null, () => 0 ], // 'BM'
                [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ],// 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BU', 'BV', 'BW'
                [ 'Cobrado', null, () => 0 ], // 'BX'
                [ 'Traspaso', null, () => 0 ], // 'BY'
                [ 'Impreso', null, () => 'N' ], // 'BZ'
                [ 'Transporte', null, () => 9 ], // 'CA'
                // 'CB' -> 'DH'
                // [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ],
                // [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ],
            ];

            let modifiedData = [
                // España
                { 'Neto': -200, PAIS_ATTR: 'ESPAÑA', 'IVA': '21%', 'Cliente': `Ventas Shein España Semana ${weekN}`, 'CD.Cliente': '131' },
                // Portugal
                { 'Neto': -200, PAIS_ATTR: 'PORTUGAL', 'IVA': '23%', 'Cliente': `Ventas Shein Portugal Semana ${weekN}`, 'CD.Cliente': '132' },
            ];

            // Process with COL info
            const tableData = modifiedData.map( ( row ) => {
                const lRow = [];
                for ( let c of this.ALB_COLS )
                {
                    const ogColName = c[0];
                    if( ogColName === '' ) continue;
                    const fn = c[2] ?? ( ( str ) => str );
                    lRow.push( fn( row[ogColName] ?? '?', row ) );
                }
                return lRow;
            } );

            const tableWidget = new LX.Table( null, {
                head: this.ALB_COLS.map( ( c ) => {
                    return c[1] ?? c[0];
                } ).filter( v => v !== '' ),
                body: tableData
            }, {
                selectable: false,
                sortable: false,
                toggleColumns: true,
                centered: [ 'Serie', 'Posición', 'Número', 'Cantidad', 'Precio', 'Base', 'T', 'I', 'Total', 'CantidadR' ],
                filter: 'Artículo',
                hiddenColumns: [ 'Serie', 'Número' ]
            } );

            ALBContainer.appendChild( tableWidget.root );

            this.lastShownSeurALBData = tableWidget.data.body;
        }

        // Move up into the panel section
        utilButtonsPanel.attach( tabs.root );

        // i don't know what is this.. removing it by now
        tmpArea.root.children[1].remove();
    }

    exportIVA()
    {
        const weekN = this.core.getWeekNumber();
        const filename = `IVA_SHEIN_semana${weekN}.xlsx`;
        const sheets = [];

        {
            const spainFilteredRows = LX.deepCopy( this.lastShownSeurIVAData )
                .filter( row => ( row[0] === 'ESPAÑA' ) )
                .map( row => row.slice( 1 ) );
            const data = [ LX.deepCopy( this.lastSeurIVAColumnData ).slice( 1 ), ...spainFilteredRows ];
            sheets.push( this.core.createXLSXSheet( data ) );
        }

        {
            const portugalFilteredRows = LX.deepCopy( this.lastShownSeurIVAData )
                .filter( row => ( row[0] === 'PORTUGAL' ) )
                .map( row => row.slice( 1 ) );
            const data = [ LX.deepCopy( this.lastSeurIVAColumnData ).slice( 1 ), ...portugalFilteredRows ];
            sheets.push( this.core.createXLSXSheet( data ) );
        }

        const workbook = this.core.createXLSXWorkbook( sheets, [ 'ESPAÑA', 'PORTUGAL' ] );
        this.core.exportXLSXWorkbook( workbook, filename );
    }

    getLALData( country, albNumberOffset )
    {
        const LALColumnData = this.LAL_COLS.map( ( c ) => {
            return c[1] ?? c[0];
        } ).slice( 1 );

        const filename = `LAL.xlsx`;
        const filteredRows = LX.deepCopy( this.lastShownSeurLALData )
            .filter( row => ( row[0] === country ) )
            .map( ( row, index ) => {
                const m = row.slice( 1 );
                m[1] = this.albNumber + ( albNumberOffset ?? 0 ); // Add NUMBER offset based on new ALBARAN
                m[2] = index + 1; // Update _POSICIÓN_ based on new filtered data
                return m;
            } );
        const finalRowsWithEmptyColumns = [];
        filteredRows.forEach( ( row, index ) => {
            let lastFilledIndex = 0;
            const newRow = LALColumnData.map( d => {
                if( d === '' ) return '';
                else return row[ lastFilledIndex++ ];
            } );
            finalRowsWithEmptyColumns.push( newRow );
        } );
        const data = [ LALColumnData, ...finalRowsWithEmptyColumns ];
        return { filename, data  };
    }

    getALBData( country, albNumberOffset )
    {
        const ALBColumnData = this.ALB_COLS.map( ( c ) => {
            return c[1] ?? c[0];
        } ).slice( 1 );

        const filename = `ALB.xlsx`;
        const filteredRows = LX.deepCopy( this.lastShownSeurALBData )
            .filter( row => ( row[0] === country ) )
            .map( ( row, index ) => {
                const m = row.slice( 1 );
                m[1] = this.albNumber + ( albNumberOffset ?? 0 ); // Add NUMBER offset based on new ALBARAN
                return m;
            } );
        const finalRowsWithEmptyColumns = [];
        filteredRows.forEach( ( row, index ) => {
            let lastFilledIndex = 0;
            const newRow = ALBColumnData.map( d => {
                if( d === '' ) return '';
                else return row[ lastFilledIndex++ ];
            } );
            finalRowsWithEmptyColumns.push( newRow );
        } );
        const data = [ ALBColumnData, ...finalRowsWithEmptyColumns ];
        return { filename, data  };
    }

    exportLAL( country )
    {
        const countries = [ 'ESPAÑA', 'PORTUGAL' ];
        const offset = countries.indexOf( country );
        const { filename, data } = this.getLALData( country, offset );
        this.core.exportXLSXData( data, filename );
    }

    exportALB( country )
    {
        const countries = [ 'ESPAÑA', 'PORTUGAL' ];
        const offset = countries.indexOf( country );
        const { filename, data } = this.getALBData( country, offset );
        this.core.exportXLSXData( data, filename );
    }

    async exportAlbaranes()
    {
        const countries = [ 'ESPAÑA', 'PORTUGAL' ];
        const albaranFiles = countries.map( ( c, i ) => {
            return [ this.getLALData( c, i ), this.getALBData( c, i ) ];
        } );

        const folders = {
            'ESPAÑA': albaranFiles[countries.indexOf( 'ESPAÑA' )],
            'PORTUGAL': albaranFiles[countries.indexOf( 'PORTUGAL' )],
        };

        const zip = await this.core.zipWorkbooks( folders );
        LX.downloadFile( 'ALBARANES.zip', zip );
    }

    open( params )
    {
        this.core.tool = 'shein';
        this.core.setHeaderTitle( `SHEIN`, this.subtitle, this.icon );
        this.area.root.classList.toggle( 'hidden', false );
    }

    close()
    {
    }

    clear()
    {
        delete this.lastSeurData;
        this.showSheinList( [] );
    }
}

export { SheinApp };
