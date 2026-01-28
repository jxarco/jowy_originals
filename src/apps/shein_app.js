import { LX } from 'lexgui';
import { BaseApp } from './base_app.js';
import { Constants } from '../constants.js';
import { Data } from '../data.js';
import * as Utils from '../utils.js';

const SKU_ATTR = BaseApp.SKU_ATTR;
const ORDER_ATTR = BaseApp.ORDER_ATTR;
const ART_ID_ATTR = BaseApp.ART_ID_ATTR;
const ART_NAME_ATTR = BaseApp.ART_NAME_ATTR;
const CLIENT_NAME_ATTR = BaseApp.CLIENT_NAME_ATTR;
const PAIS_ATTR = BaseApp.PAIS_ATTR;
const CP_ATTR = BaseApp.CP_ATTR;
const PVP_ATTR = 'precio de los productos básicos';
const ORDER_DATE_ATTR = 'Fecha y hora de creación de pedido';

const ORDERS_DATA = [
    [ ORDER_ATTR ],
    [ ART_ID_ATTR ],
    [ SKU_ATTR ],
    [ ART_NAME_ATTR, null, ( str, row ) => {
        return `<span title='${str}'>${str}</span>`;
    } ],
    [ CLIENT_NAME_ATTR ],
    [ CP_ATTR ],
    [ PAIS_ATTR ],
    [ 'Provincia', null ],
    [ 'Ciudad', null ],
    [ 'dirección de usuario 1+dirección de usuario 2', 'Dirección' ],
    [ 'Número de Teléfono' ],
    [ 'Correo electrónico de usuario' ]
];

const LABEL_DATA = [
    [ ORDER_ATTR ],
    [ 'Bultos', null, ( row, i ) => 1 ],
    [ SKU_ATTR ],
    [ CP_ATTR ],
    [ PAIS_ATTR ],
    [ 'Provincia', null ],
    [ 'Ciudad', null ],
    [ 'dirección de usuario 1+dirección de usuario 2', 'Dirección' ],
    [ CLIENT_NAME_ATTR ],
    [ 'Número de Teléfono' ],
    [ 'Correo electrónico de usuario' ]
];

const TRACKING_DATA = [
    [ ORDER_ATTR, 'Order Number' ],
    [ ART_ID_ATTR, 'Item ID' ],
    [ 'Tracking Number', null, ( str, row, tdata, app ) => {
        const name = row[CLIENT_NAME_ATTR].toUpperCase();
        const tentry = tdata.find( ( d ) => d['CLIENTE DESTINATARIO'] === name );
        if ( !tentry )
        {
            app._trackingSyncErrors.push( { name, uid: `${row[ORDER_ATTR]}_${row[ART_ID_ATTR]}` } );
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

class SheinApp extends BaseApp
{
    constructor( core, tool )
    {
        super( core, tool );

        this.title = 'SHEIN';
        this.subtitle = 'Arrastra un <strong>.xlsx</strong> o haz click aquí para cargar un nuevo listado de envíos.';
        this.icon = 'Shein';
        
        // Create utility buttons
        const utilsPanel = new LX.Panel( { height: 'auto', className: Constants.UTILITY_BUTTONS_PANEL_CLASSNAME } );
        utilsPanel.sameLine();
        Utils.addUtilityButton( utilsPanel, 'ClearButton', 'Trash2', 'Limpiar datos anteriores', () => this.core.clearData() );
        this.exportLabelsButton = Utils.addUtilityButton( utilsPanel, 'ExportLabelsButton', 'Download', 'Exportar Etiquetas', () => this.exportSEUR( false, this.lastOrdersData ), true );
        this.exportTrackingsButton = Utils.addUtilityButton( utilsPanel, 'ExportTrackingsButton', 'FileDown', 'Exportar Seguimiento', () => this.exportSEURTrackings(), true );
        utilsPanel.endLine();
        this.area.attach( utilsPanel.root );

        const tabs = this.area.addTabs( { parentClass: 'p-4', sizes: [ 'auto', 'auto' ], contentClass: 'p-2 pt-0' } );

        // Orders
        const ordersContainer = LX.makeContainer( [ null, 'auto' ], Constants.TAB_CONTAINER_CLASSNAME );
        tabs.add( 'Pedidos', ordersContainer, { selected: true, onSelect: ( event, name ) => this.showOrdersList() } );
        const ordersArea = new LX.Area( { className: Constants.TAB_AREA_CLASSNAME } );
        ordersContainer.appendChild( ordersArea.root );

        // Stock List
        const stockListContainer = LX.makeContainer( [ null, 'auto' ], Constants.TAB_CONTAINER_CLASSNAME );
        tabs.add( 'Listado Stock', stockListContainer, { xselected: true, onSelect: ( event, name ) => this.showStockList() } );
        const stockListArea = new LX.Area( { className: Constants.TAB_AREA_CLASSNAME } );
        stockListContainer.appendChild( stockListArea.root );

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
        utilsPanel.attach( tabs.root );

        this.ordersArea = ordersArea;
        this.stockListArea = stockListArea;
        this.trackingArea = trackingArea;
        this.albaranArea = albaranArea;

        this.countries = [ 'ESPAÑA', 'PORTUGAL' ];
        this.countryTransportCostPct['ESPAÑA'] = 0.303;
        this.countryTransportCostPct['PORTUGAL'] = 0.32;

        this.clear();
    }

    openData( data )
    {
        if ( !data?.length )
        {
            return;
        }

        // Map SKUs and Country once on load data
        data.forEach( ( r ) => {
            const ogSku = r[SKU_ATTR];
            if ( !ogSku || ogSku === '' ) LX.toast( 'Aviso!', `⚠️ Falta SKU para el pedido ${r[ORDER_ATTR]}.`, { timeout: -1, position: 'top-center' } );
            else {
                
                r[SKU_ATTR + '_OLD'] = ogSku; // Store old sku in case it's necessary
                const skuData = this.core.mapSku( ogSku );
                r[SKU_ATTR] = skuData.sku; // replace with new sku
                this._packUnits[skuData.sku] = skuData.quantity; // save pack quantity
                r[BaseApp.PACK_U_ATTR] = skuData.quantity; // store also in row
            }
            const ogCountry = r[PAIS_ATTR];
            r[PAIS_ATTR] = this.core.mapCountry( ogCountry );
            // if( ogCountry !== r[PAIS_ATTR] ) console.warn( `Country mapped from ${ogCountry} to ${r[PAIS_ATTR]}` );
            const ogZipCode = r[CP_ATTR];
            r[CP_ATTR] = this.core.mapZipCode( ogZipCode );
            // if( ogZipCode !== r[CP_ATTR] ) console.warn( `Zip Code mapped from ${ogZipCode} to ${r[CP_ATTR]}` );
        } );

        // Sort by ref once
        data = data.sort( ( a, b ) => {
            const sku_a = a[SKU_ATTR] ?? '?';
            const sku_b = b[SKU_ATTR] ?? '?';
            return sku_a.localeCompare( sku_b );
        } );

        console.log("shein", data)

        this.showOrdersList( data );
        this.showStockList( data );

        Utils.toggleButtonDisabled( this.exportLabelsButton, false );
    }

    showOrdersList( data )
    {
        data = data ?? this.lastOrdersData;

        Utils.clearArea( this.ordersArea );

        const tableWidget = this.getOrdersListTable( data, ORDERS_DATA );
        this.ordersArea.attach( tableWidget );
    }

    showStockList( ogData )
    {
        ogData = ogData ?? this.lastOrdersData;

        let data = LX.deepCopy( ogData );

        Utils.clearArea( this.stockListArea );

        let columnData = [
            [ SKU_ATTR ],
            [ 'Unidades' ],
            [ 'Transporte', null, () => 'SEUR' ],
            [ 'Plataforma', null, () => 'SHEIN' ],
            [ PAIS_ATTR ],
            [ 'Observaciones' ],
            [ ORDER_ATTR ]
        ];

        const uid = columnData[6][0]; // This is to get in this case 'Número del pedido'
        const orderNumbers = new Map();

        // Create table data from the list
        let rows = data.map( ( row, index ) => {
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

        // Remove unnecessary 'NUMERO PEDIDO', used only to combine
        columnData = columnData.slice( 0, -1 );
        const headData = columnData.map( ( c ) => c[1] ?? c[0] );

        const multipleItemsOrderNames = Array.from( orderNumbers.values() ).filter( ( v ) => v.length > 1 );
        const skuIdx = headData.indexOf( BaseApp.SKU_ATTR );

        for ( const repeats of multipleItemsOrderNames )
        {
            const finalIndex = repeats[0];
            const finalRow = rows[finalIndex];
            const rest = repeats.slice( 1 );
            const trail = rest.reduce( ( p, c ) => p + ` + ${rows[c][skuIdx]}`, '' );
            rest.forEach( ( r ) => {
                rows[r] = undefined;
            } );
            finalRow[skuIdx] += trail;
            finalRow[5] = 'Mismo pedido';
        }

        const tableData = [];
        const skus = {};

        for ( let row of rows )
        {
            if ( row === undefined ) continue;

            let sku = `${row[skuIdx]}_${row[4]}`; // SKU _ País

            // if sku starts with 'JW-T60', never combine with others, so we must
            // add a unique identifier in the sku
            sku += sku.includes( 'JW-T60' ) ? `_${LX.guidGenerator()}` : '';

            if ( !skus[sku] )
            {
                skus[sku] = [ tableData.length ];
                row[1] = 1;
                row.splice( 6, 1 ); // Delete order num
                tableData.push( row );
            }
            else
            {
                const idx = skus[sku][0];
                tableData[idx][1] += 1;
            }
        }

        // do it by individual units, not in item combined orders
        for ( let row of tableData )
        {
            const sku = row[skuIdx];

            if ( sku.includes( '+' ) )
            {
                continue;
            }

            row[1] = parseInt( row[1] ) * this.getPackUnits( sku );
        }

        // for the skus that contain '+', change the sku to sku x quantity in each of them
        // only for SHEIN, since we don't have the quantity until now
        for ( let row of tableData )
        {
            const sku = row[skuIdx];

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
            row[skuIdx] = newSkuParts.join( ' + ' );
        }

        const tableWidget = new LX.Table( null, {
            head: headData,
            body: tableData
        }, {
            selectable: true,
            sortColumns: false,
            toggleColumns: true,
            centered: true,
            columnActions: [
                {
                    icon: 'Copy',
                    name: 'Copiar',
                    callback: ( colData ) => {
                        if ( !colData?.length )
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
                { name: BaseApp.PAIS_ATTR, options: this.countries }
            ]
        } );

        this.stockListArea.attach( tableWidget );
    }

    showTrackingList( trackingData )
    {
        const data = this.lastOrdersData;

        Utils.clearArea( this.trackingArea );

        this._trackingSyncErrors = [];

        // Create table data from the list
        const tableData = data.map( ( row ) => {
            const lRow = [];
            for ( let c of TRACKING_DATA )
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
            head: TRACKING_DATA.map( ( c ) => c[1] ?? c[0] ),
            body: tableData
        }, {
            selectable: true,
            toggleColumns: true,
            centered: true,
            filter: 'Tracking Number',
            hiddenColumns: [ 'Delete' ]
        } );

        this.lastSeurTrackingsColumnData = tableWidget.data.head;
        this.lastShownSeurTrackingsData = tableWidget.data.body;

        this.trackingArea.attach( tableWidget );

        Utils.toggleButtonDisabled( this.exportTrackingsButton, false );
    }

    exportSEUR( ignoreErrors = false, rawData )
    {
        let columnData = LABEL_DATA;

        const currentPlatformData = rawData ?? this.lastOrdersData;
        const uid = columnData[0][0]; // 'Número del pedido'

        // Process the xlsx first to detect empty fields
        if ( !ignoreErrors )
        {
            const errorFields = [];
            currentPlatformData.forEach( ( row, index ) => {
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

                    const fixedData = LX.deepCopy( currentPlatformData );

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
                    }, { width: '50%', buttonClass: 'destructive' } );
                    pBottom.addButton( null, 'Exportar', () => {
                        dialog.close();
                        this.exportSEUR( false, fixedData );
                    }, { width: '50%', buttonClass: 'primary' } );
                }, { position: [ 'calc(50% - 300px)', '250px' ], size: [ '600px', 'min(600px, 80%)' ] } );

                return;
            }
        }

        const filename = `ETIQUETAS_SEUR_${this.title}_${Utils.getTodayStringDate()}.xlsx`;

        let err = 0;
        let errMsg = '';
        let data = columnData.map( ( c ) => c[1] ?? c[0] );

        let errorFn = () => {
            LX.toast( 'Error de exportación', `❌ No se pudo exportar el archivo: ${filename}. ${errMsg}`, {
                timeout: -1,
                position: 'top-center'
            } );
        };

        if ( !currentPlatformData?.length )
        {
            errMsg = `No existen datos.`;
            errorFn();
            return;
        }

        const orderNumbers = new Map();

        let rows = currentPlatformData.map( ( row, index ) => {
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
        const skuIdx = data.indexOf( SKU_ATTR );

        for ( const repeats of multipleItemsOrderNames )
        {
            const finalIndex = repeats[0];
            const finalRow = rows[finalIndex];
            const rest = repeats.slice( 1 );
            const trail = rest.reduce( ( p, c ) => p + ` + ${rows[c][skuIdx]}`, '' );
            rest.forEach( ( r ) => {
                rows[r] = undefined;
            } );
            finalRow[skuIdx] += trail;
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
            row[skuIdx] = newSkuParts.join( ' + ' );
        }

        this.core.exportXLSXData( [ data, ...rows ], filename, ignoreErrors );
    }

    exportSEURTrackings( fixedData, ignoreErrors )
    {
        const filename = `NUMERODEGUIA_SEUR_${this.title}_${Utils.getTodayStringDate()}.xlsx`;
        const data = fixedData ?? [ this.lastSeurTrackingsColumnData, ...this.lastShownSeurTrackingsData ];

        if ( !ignoreErrors && this._trackingSyncErrors.length )
        {
            const dialog = new LX.Dialog( '❌ Solucionar errores', ( p ) => {
                LX.addClass( p.root, 'p-2 flex flex-col overflow-scroll' );

                const pTop = new LX.Panel( { className: 'flex flex-col gap-1 overflow-scroll' } );
                p.attach( pTop );

                for ( const { name, uid } of this._trackingSyncErrors )
                {
                    LX.makeElement( 'div', '[&_span]:font-bold [&_span]:text-foreground', `No existe tracking para <span>${name}</span> (${uid})`, pTop );
                    const possibleIndex = data.findIndex( ( d ) => `${d[0]}_${d[1]}` === uid );
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
                    this.exportSEURTrackings( data, true );
                }, { width: '50%', buttonClass: 'destructive' } );
                pBottom.addButton( null, 'Exportar', () => {
                    dialog.close();
                    this.exportSEURTrackings( data, true );
                }, { width: '50%', buttonClass: 'primary' } );
            }, { position: [ 'calc(50% - 300px)', '250px' ], size: [ '600px', 'min(600px, 80%)' ] } );
            return;
        }

        this.core.exportXLSXData( data, filename );
    }

    showAlbaranRelatedInfo( data )
    {
        Utils.clearArea( this.albaranArea );

        data = data ?? this.lastOrdersData;

        // Map SKUs and Country once on load data
        data.forEach( ( r ) => {
            const ogSku = r[SKU_ATTR];
            if ( !ogSku || ogSku === '' ) LX.toast( 'Aviso!', `⚠️ Falta SKU para el pedido ${r[ORDER_ATTR]}.`, { timeout: -1, position: 'top-center' } );
            else {
                
                r[SKU_ATTR + '_OLD'] = ogSku; // Store old sku in case it's necessary
                const skuData = this.core.mapSku( ogSku );
                r[SKU_ATTR] = skuData.sku; // replace with new sku
                this._packUnits[skuData.sku] = skuData.quantity; // save pack quantity
                r[BaseApp.PACK_U_ATTR] = skuData.quantity; // store also in row
            }
            const ogCountry = r[PAIS_ATTR];
            r[PAIS_ATTR] = this.core.mapCountry( ogCountry );
            // if( ogCountry !== r[PAIS_ATTR] ) console.warn( `Country mapped from ${ogCountry} to ${r[PAIS_ATTR]}` );
            const ogZipCode = r[CP_ATTR];
            r[CP_ATTR] = this.core.mapZipCode( ogZipCode );
            // if( ogZipCode !== r[CP_ATTR] ) console.warn( `Zip Code mapped from ${ogZipCode} to ${r[CP_ATTR]}` );
        } );

        // Sort by ref once
        {
            data = data.sort( ( a, b ) => {
                const sku_a = a[SKU_ATTR] ?? '?';
                const sku_b = b[SKU_ATTR] ?? '?';
                return sku_a.localeCompare( sku_b );
            } );
        }

        const totalIncome = this.countries.reduce( ( o, c ) => {
            o[c] = LX.round( data.reduce( ( acc, row ) => {
                if ( row[PAIS_ATTR] !== c ) return acc;
                return acc + parseFloat( row[PVP_ATTR] );
            }, 0 ) );
            return o;
        }, {} );

        // console.log(data);

        const tmpArea = new LX.Area( { className: 'w-full h-full p-0 m-0', skipAppend: true } );
        this.albaranArea.attach( tmpArea );

        // Create utility buttons
        const subUtilsPanel = new LX.Panel( { height: 'auto', className: Constants.UTILITY_BUTTONS_PANEL_CLASSNAME } );
        subUtilsPanel.sameLine();
        Utils.addUtilityButton( subUtilsPanel, 'ExportIVAButton', 'Euro', 'Exportar IVA', () => this.exportIVA() );
        Utils.addUtilityButton( subUtilsPanel, 'ExportAlbaranesButton', 'FileArchive', 'Exportar Albaranes', () => this.exportAlbaranes() );
        const exportOptionsButton = Utils.addUtilityButton( subUtilsPanel, 'ExportOptionsButton', 'EllipsisVertical', 'Más opciones', () => {
            LX.addDropdownMenu( exportOptionsButton.root, [
                {
                    name: 'Exportar LAL',
                    icon: 'List',
                    submenu: this.countries.map( ( c ) => {
                        return { name: c, callback: () => this.exportLAL( c ) };
                    } )
                },
                null,
                {
                    name: 'Exportar ALB',
                    icon: 'File',
                    submenu: this.countries.map( ( c ) => {
                        return { name: c, callback: () => this.exportALB( c ) };
                    } )
                }
            ], { side: 'bottom', align: 'start' } );
        } );
        subUtilsPanel.endLine();
        tmpArea.attach( subUtilsPanel.root );

        const selectedTab = this.fiscalTabs?.selected;

        this.fiscalTabs = tmpArea.addTabs( { parentClass: 'p-4', sizes: [ 'auto', 'auto' ], contentClass: 'p-0' } );
        subUtilsPanel.attach( this.fiscalTabs.root ); // Move up into the panel section

        const weekN = Utils.getWeekNumber( Utils.convertDateDMYtoMDY( this.currentDate ) );
        const currentYear = this.currentDate.split( '/' )[2];

        const getPriceWithoutIVA = ( row ) => {
            let country = row[PAIS_ATTR];
            const iva = core.countryIVA[country];
            if ( !iva ) LX.toast( 'Aviso!', `⚠️ Falta IVA para el país ${country}: Using 21%.`, { timeout: -1, position: 'top-center' } );
            const priceWithoutIVA = parseFloat( row[PVP_ATTR] ) / ( iva ?? 1.21 );
            return LX.round( priceWithoutIVA );
        };

        // IVA
        {
            const IVAContainer = LX.makeContainer( [ null, 'auto' ], Constants.TAB_CONTAINER_CLASSNAME.replace( 'rounded-lg', '' ) );
            this.fiscalTabs.add( 'IVA', IVAContainer, { selected: ( selectedTab === 'IVA' || !this.fiscalTabs ) } );

            const IVA_COLS = [
                [ PAIS_ATTR, 'PAÍS' ],
                [ ORDER_ATTR, 'NÚMERO PEDIDO' ],
                [ ORDER_DATE_ATTR, 'FECHA PEDIDO' ],
                [ SKU_ATTR, 'REF' ],
                [ 'CANTIDAD', null, ( str, row ) => {
                    const sku = row[SKU_ATTR];
                    return this.getPackUnits( sku );
                } ],
                [ 'PRECIO SIN IVA', null, ( str, row ) => getPriceWithoutIVA( row ) ],
                [ 'IVA', null, ( str, row ) => {
                    const priceWithoutIVA = getPriceWithoutIVA( row );
                    const totalIva = parseFloat( row[PVP_ATTR] ) - priceWithoutIVA;
                    return LX.round( totalIva );
                } ],
                [ PVP_ATTR, 'PVP', ( str, row ) => {
                    return LX.round( parseFloat( str ) );
                } ]
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
                    { name: PAIS_ATTR, options: this.countries }
                ]
            } );

            IVAContainer.appendChild( tableWidget.root );

            this.lastIVAColumnData = tableWidget.data.head;
            this.lastShownIVAData = tableWidget.data.body;
        }

        // LAL
        {
            const LALContainer = LX.makeContainer( [ null, 'auto' ], Constants.TAB_CONTAINER_CLASSNAME.replace( 'rounded-lg', '' ) );
            this.fiscalTabs.add( 'LAL', LALContainer, { selected: ( selectedTab === 'LAL' ) } );

            const getProductPrice = ( row ) => {
                const total = LX.round( parseFloat( row['Total'] ) );
                const productPrice = total / row['Cantidad'];
                return LX.round( productPrice );
            };

            this.LAL_COLS = [
                [ 'País' ],
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
                    return LX.round( basePrice );
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
                    return LX.round( parseFloat( str ) );
                } ], // 'AF'
                [ 'Cantidad', 'CantidadR' ] // 'AG'
            ];

            const skuMap = {};
            const totalTransportPerComp = {};

            data.forEach( ( row ) => {
                const sku = row[SKU_ATTR];
                const skus = this.core.getIndividualSkusPerPack( sku );
                // console.log(skus);
                skus.forEach( ( skuObj ) => {
                    const itemSku = skuObj.sku;
                    const prefix = itemSku.substring( 0, itemSku.indexOf( '-' ) );
                    const totalQuantity = this.getPackUnits( itemSku );
                    const country = row[PAIS_ATTR];
                    const skuPriceFactor = skuObj.price;
                    const priceWithoutIVA = getPriceWithoutIVA( row ) * skuPriceFactor;
                    const transportPrice = this.countryTransportCostPct[country];
                    const totalProductTransport = LX.round( priceWithoutIVA * transportPrice );
                    const productTotal = LX.round( priceWithoutIVA - totalProductTransport );

                    let skuIdx = `${itemSku}_${country}`;
                    if ( !skuMap[skuIdx] )
                    {
                        const product = Data.sku[itemSku];
                        skuMap[skuIdx] = {
                            'Artículo': itemSku,
                            'Descripción': product?.['DESCRIPCIÓN'] ?? '',
                            'Cantidad': totalQuantity,
                            'Total': productTotal,
                            'País': country
                        };
                    }
                    else
                    {
                        const product = skuMap[skuIdx];
                        product['Cantidad'] += totalQuantity;
                        product['Total'] += productTotal;
                    }

                    // Update transport total per country
                    const tCompIdx = `${prefix}_${country}`;
                    if ( !totalTransportPerComp[tCompIdx] ) totalTransportPerComp[tCompIdx] = 0;
                    totalTransportPerComp[tCompIdx] += totalProductTransport;
                } );
            } );

            // Create table data from the list
            let modifiedData = Object.values( skuMap );

            const totalIncomeNetPlusIVA = {};

            this.countries.forEach( ( c ) => {
                modifiedData.push(
                    { 'Artículo': 'P01', 'Descripción': 'Transporte Jowy', 'Cantidad': 1, 'Total': totalTransportPerComp[`JW_${c}`] ?? 0, 'País': c },
                    { 'Artículo': 'P02', 'Descripción': 'Transporte HxG', 'Cantidad': 1, 'Total': totalTransportPerComp[`HG_${c}`] ?? 0, 'País': c },
                    { 'Artículo': 'P03', 'Descripción': 'Transporte Fucklook', 'Cantidad': 1, 'Total': totalTransportPerComp[`FL_${c}`] ?? 0, 'País': c },
                    { 'Artículo': 'P04', 'Descripción': 'Transporte Bathby', 'Cantidad': 1, 'Total': totalTransportPerComp[`BY_${c}`] ?? 0, 'País': c }
                );

                totalIncomeNetPlusIVA[c] = LX.round( modifiedData.reduce( ( acc, row ) => {
                    if ( row['País'] !== c ) return acc;
                    return acc + parseFloat( row['Total'] );
                }, 0 ) * this.core.countryIVA[c] );

                const lastTransportRow = modifiedData.at( -1 );
                const incomeDiff = totalIncome[c] - totalIncomeNetPlusIVA[c];
                lastTransportRow['Total'] = LX.round( lastTransportRow['Total'] + incomeDiff );
            } );

            // Remove rows with total = 0 (e.g. transports not used, etc)
            modifiedData = modifiedData.filter( ( d ) => d['Total'] > 0 );

            // Process with COL info
            const tableData = modifiedData.map( ( row ) => {
                const lRow = [];
                for ( let c of this.LAL_COLS )
                {
                    const ogColName = c[0];
                    if ( ogColName === '' ) continue;
                    const fn = c[2] ?? ( ( str ) => str );
                    lRow.push( fn( row[ogColName] ?? '?', row ) );
                }
                return lRow;
            } );

            const tableWidget = new LX.Table( null, {
                head: this.LAL_COLS.map( ( c ) => {
                    return c[1] ?? c[0];
                } ).filter( ( v ) => v !== '' ),
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

            // Add data labels
            subUtilsPanel.sameLine();
            subUtilsPanel.addText( 'NÚMERO ALBARÁN', this.albNumber, ( v ) => this.albNumber = parseFloat( v ), { placeholder: '# Albarán', nameWidth: 'fit-content', className: '[&_input]:px-4!',
                fit: true, skipReset: true } );
            subUtilsPanel.addDate( 'FECHA CREACIÓN', this.currentDate, ( v ) => {
                this.currentDate = v;
                LX.doAsync( () => this.showAlbaranRelatedInfo( data ) );
            }, { nameWidth: 'fit-content' } );
            const popoverButton = subUtilsPanel.addButton( null, 'Ver Ingresos', () => {
                const incomeArea = new LX.Area( { width: `${Math.max( 6 * this.countries.length, 16 )}rem`, skipAppend: true } );
                const tabs = incomeArea.addTabs( { fit: true } );
                this.countries.forEach( ( c ) => {
                    const p = new LX.Panel();
                    p.addText( 'Total brutos', totalIncome[c] + ' €', null, { nameWidth: '50%', disabled: true, className: '[&_input]:px-4!', fit: true } );
                    p.addText( 'Total neto + IVA', totalIncomeNetPlusIVA[c] + ' €', null, { nameWidth: '50%', disabled: true, className: '[&_input]:px-4!', fit: true } );
                    tabs.add( c, p.root );
                } );
                new LX.Popover( popoverButton.root, [ incomeArea ], { align: 'end' } );
            }, { icon: 'Eye', iconPosition: 'start' } );
            subUtilsPanel.endLine( 'ml-auto' );

            this.lastShownLALData = tableWidget.data.body;
        }

        // ALB
        {
            const ALBContainer = LX.makeContainer( [ null, 'auto' ], Constants.TAB_CONTAINER_CLASSNAME.replace( 'rounded-lg', '' ) );
            this.fiscalTabs.add( 'ALB', ALBContainer, { selected: ( selectedTab === 'ALB' ) } );

            this.ALB_COLS = [
                [ 'País' ],
                [ 'Serie', null, () => '1' ], // 'A',
                [ 'Número', null, () => -1 ], // 'B',
                [ '' ], // 'C',
                [ 'Fecha', null, () => this.currentDate ], // 'D',
                [ 'Estado', null, () => 0 ], // 'E',
                [ 'Alm', null, () => 'LLA' ], // 'F',
                [ 'Agente', null, () => 7 ], // 'G',
                [ '' ], // 'H',
                [ 'CD.Cliente', 'Cliente' ], // 'I',
                [ 'Cliente' ], // 'J',
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ], // 'K', 'L', 'M', 'N', 'O',
                [ 'IVA', null, () => 0 ], // 'P',
                [ 'Recargo', null, () => 0 ], // 'Q',
                [ '' ], // 'R',
                [ 'Neto', null, ( str, row ) => {
                    const net = row['Total'];
                    const country = row['País'];
                    const iva = this.core.countryIVA[country];
                    return LX.round( net / iva );
                } ], // 'S',
                // 'T' -> 'AS'
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ 'Base', null, ( str, row ) => {
                    const net = row['Total'];
                    const country = row['País'];
                    const iva = this.core.countryIVA[country];
                    return LX.round( net / iva );
                } ], // 'AT'
                [ '' ],
                [ '' ], // 'AU', 'AV'
                [ 'IVA', null, ( str, row ) => {
                    const country = row['País'];
                    return LX.round( ( this.core.countryIVA[country] - 1 ) * 100 );
                } ], // 'AW'
                [ '' ],
                [ '' ], // 'AX', 'AY'
                [ 'Cuota', null, ( str, row ) => {
                    const net = row['Total'];
                    const country = row['País'];
                    const iva = this.core.countryIVA[country];
                    return LX.round( net * ( iva - 1 ) );
                } ], // 'AZ'
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ], // 'BA', 'BB', 'BC', 'BD', 'BE','BF', 'BG','BH', 'BI', 'BJ'
                [ 'Total' ], // 'BK'
                [ 'Pago', null, () => 'TR' ], // 'BL'
                [ 'Portes', null, () => 0 ], // 'BM'
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ],
                [ '' ], // 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BU', 'BV', 'BW'
                [ 'Cobrado', null, () => 0 ], // 'BX'
                [ 'Traspaso', null, () => 0 ], // 'BY'
                [ 'Impreso', null, () => 'N' ], // 'BZ'
                [ 'Transporte', null, () => 9 ] // 'CA'
                // 'CB' -> 'DH'
                // [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ],
                // [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ], [ '' ],
            ];

            let modifiedData = this.countries.map( ( c ) => {
                return { 'Total': totalIncome[c], 'País': c, 'Cliente': `Ventas ${LX.toTitleCase( this.title )} ${c} Semana ${weekN}`,
                    'CD.Cliente': this.core.getClientCode( this.title, c, currentYear ) };
            } );

            // Process with COL info
            const tableData = modifiedData.map( ( row ) => {
                const lRow = [];
                for ( let c of this.ALB_COLS )
                {
                    const ogColName = c[0];
                    if ( ogColName === '' ) continue;
                    const fn = c[2] ?? ( ( str ) => str );
                    lRow.push( fn( row[ogColName] ?? '?', row ) );
                }
                return lRow;
            } );

            const tableWidget = new LX.Table( null, {
                head: this.ALB_COLS.map( ( c ) => {
                    return c[1] ?? c[0];
                } ).filter( ( v ) => v !== '' ),
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

            this.lastShownALBData = tableWidget.data.body;
        }

        // i don't know what is this.. removing it by now
        tmpArea.root.children[1].remove();
    }

    close()
    {
        this.clear();
    }

    clear()
    {
        super.clear();

        delete this.lastOrdersData;
        this.showOrdersList( [] );
        this.showStockList( [] );
        this.showTrackingList( [] );
        this.showAlbaranRelatedInfo( [], 0 );

        Utils.toggleButtonDisabled( this.exportLabelsButton, true );
        Utils.toggleButtonDisabled( this.exportTrackingsButton, true );
    }
}

export { SheinApp };
