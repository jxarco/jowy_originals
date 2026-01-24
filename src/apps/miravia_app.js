import { LX } from 'lexgui';
import { BaseApp } from './base_app.js';
import { Constants, NumberFormatter } from '../constants.js';
import { Data } from '../data.js';
import * as Utils from '../utils.js';

const countries = [ 'ESPAÑA', 'PORTUGAL', 'FRANCIA', 'ITALIA' ];
const SKU_ATTR = 'SKU del vendedor';
const ORDER_ATTR = 'Número de pedido';
const CLIENT_NAME_ATTR = 'Nombre del comprador';
const PAIS_ATTR = 'País de envío';
const CP_ATTR = 'Código postal';

const ORDERS_DATA = [
    [ ORDER_ATTR ],
    [ 'ID del artículo' ],
    [ SKU_ATTR ],
    [ 'Nombre del producto', null, ( str, row ) => {
        return `<span title='${str}'>${str}</span>`;
    } ],
    [ CLIENT_NAME_ATTR ],
    [ CP_ATTR ],
    [ PAIS_ATTR ],
    [ 'Dirección de envío 3', 'Ciudad' ],
    [ 'Dirección de envío+Dirección de envío 2', 'Dirección' ]
];

class MiraviaApp extends BaseApp
{
    constructor( core, tool )
    {
        super( core, tool );

        this.title = 'Miravia';
        this.subtitle = 'Arrastra un <strong>.xlsx</strong> o haz click aquí para cargar un nuevo listado de envíos.';
        this.icon = 'ShoppingBag';

        // Create utility buttons
        const utilsPanel = new LX.Panel( { height: 'auto', className: Constants.UTILITY_BUTTONS_PANEL_CLASSNAME } );
        utilsPanel.sameLine();
        Utils.addUtilityButton( utilsPanel, 'ClearButton', 'Trash2', 'Limpiar datos anteriores', () => this.core.clearData() );
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

        // Albaran/IVA/Etc List
        // const albaranContainer = LX.makeContainer( [ null, 'auto' ], Constants.TAB_CONTAINER_CLASSNAME );
        // tabs.add( 'IVA/Albarán', albaranContainer, { xselected: true, onSelect: ( event, name ) => {
        //     albaranArea.root.innerHTML = '';
        //     albaranArea.attach( this.core.createDropZone( this.area, this.showAlbaranRelatedInfo.bind( this ), 'listados de envíos' ) );
        // } } );
        // const albaranArea = new LX.Area( { className: Constants.TAB_AREA_CLASSNAME } );
        // albaranContainer.appendChild( albaranArea.root );

        // Move up into the panel section
        utilsPanel.attach( tabs.root );

        this.ordersArea = ordersArea;
        this.stockListArea = stockListArea;
        // this.albaranArea = albaranArea;
        // this.albNumber = -1;

        // const date = new Date();
        // this.currentDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

        this.clear();
    }

    openData( fileData )
    {
        if ( !fileData?.length )
        {
            return;
        }

        console.log("miravia", fileData)

        // Map SKUs and Country once on load data
        fileData.forEach( ( r ) => {
            const ogSku = r[SKU_ATTR];
            r[SKU_ATTR] = this.core.mapSku( ogSku );
            if ( !ogSku || ogSku === '' ) LX.toast( 'Aviso!', `⚠️ Falta SKU para el pedido ${r[ORDER_ATTR]}.`, { timeout: -1, position: 'top-center' } );
            // if( ogSku !== r[SKU_ATTR] ) console.warn( `SKU mapped from ${ogSku} to ${r[SKU_ATTR]}` );
            const ogCountry = r[PAIS_ATTR];
            r[PAIS_ATTR] = this.core.mapCountry( ogCountry );
            // if( ogCountry !== r[PAIS_ATTR] ) console.warn( `Country mapped from ${ogCountry} to ${r[PAIS_ATTR]}` );
            const ogZipCode = r[CP_ATTR];
            r[CP_ATTR] = this.core.mapZipCode( ogZipCode );
            // if( ogZipCode !== r[CP_ATTR] ) console.warn( `Zip Code mapped from ${ogZipCode} to ${r[CP_ATTR]}` );
        } );

        // Sort by ref once
        {
            fileData = fileData.sort( ( a, b ) => {
                const sku_a = a[SKU_ATTR] ?? '?';
                const sku_b = b[SKU_ATTR] ?? '?';
                return sku_a.localeCompare( sku_b );
            } );
        }

        this.showOrdersList( fileData );
        this.showStockList( fileData );
    }

    showOrdersList( data )
    {
        data = data ?? this.lastSeurData;

        Utils.clearArea( this.ordersArea );

        // Create table data from the list
        const tableData = data.map( ( row ) => {
            const lRow = [];
            for ( let c of ORDERS_DATA )
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

        this.core.setHeaderTitle( `${this.title}: <i>${tableData.length} pedidos cargados</i>`, this.subtitle, this.icon );

        const tableWidget = new LX.Table( null, {
            head: ORDERS_DATA.map( ( c ) => c[1] ?? c[0] ),
            body: tableData
        }, {
            selectable: true,
            toggleColumns: true,
            centered: [ ORDER_ATTR, 'ID del artículo', SKU_ATTR ],
            filter: SKU_ATTR,
            customFilters: [
                { name: PAIS_ATTR, options: countries }
            ],
            hiddenColumns: [ 'ID del artículo', 'Dirección', CP_ATTR ]
        } );

        this.ordersArea.attach( tableWidget );

        this.lastSeurColumnData = tableWidget.data.head;
        this.lastShownSeurData = tableWidget.data.body;
        this.lastSeurData = data;
    }

    showStockList( ogData )
    {
        ogData = ogData ?? this.lastSeurData;

        let data = LX.deepCopy( ogData );

        Utils.clearArea( this.stockListArea );

        let columnData = [
            [ SKU_ATTR ],
            [ 'Unidades', null ],
            [ 'Transporte', null, () => 'SEUR' ],
            [ 'Plataforma', null, ( str, row ) => {
                const oN = row[ORDER_ATTR];
                if( oN.length === 16 ) return 'ALIEXPRESS';
                if( oN.length === 13 ) return 'MIRAVIA';
                return 'NO DETECTADO';
            } ], // MIRAVIA OR ALIEXPRESS
            [ PAIS_ATTR ],
            [ 'Observaciones', null ],
            [ ORDER_ATTR, null ]
        ];

        const uid = columnData[6][0]; // This is to get in this case ORDER_ATTR
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
        const skuIdx = headData.indexOf( SKU_ATTR );

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
                const idx = skus[sku][skuIdx];
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

            row[1] = this.core.getIndividualQuantityPerPack( sku, parseInt( row[1] ) );
        }

        // for the skus that contain '+', change the sku to sku x quantity in each of them
        // only for SHEIN, since we don't have the quantity until now
        // for ( let row of tableData )
        // {
        //     const sku = row[skuIdx];

        //     if ( !sku.includes( '+' ) )
        //     {
        //         continue;
        //     }

        //     const skusList = sku.split( '+' ).map( ( s ) => s.trim() );
        //     const uniqueSkus = Array.from( new Set( skusList ) );
        //     const quantities = uniqueSkus.map( ( s ) => skusList.filter( ( x ) => x === s ).length );
        //     const newSkuParts = uniqueSkus.map( ( s, i ) => {
        //         const q = quantities[i];
        //         return `${s}${q > 1 ? ` x ${q}` : ''}`;
        //     } );
        //     row[skuIdx] = newSkuParts.join( ' + ' );
        // }

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
                { name: PAIS_ATTR, options: countries }
            ]
        } );

        this.lastSeurColumnData = tableWidget.data.head;
        this.lastShownSeurData = tableWidget.data.body;

        this.stockListArea.attach( tableWidget );
    }

    showAlbaranRelatedInfo( data )
    {
        Utils.clearArea( this.albaranArea );

        data = data ?? this.lastSeurData;

        // Map SKUs and Country once on load data
        data.forEach( ( r ) => {
            const ogSku = r[SKU_ATTR];
            r[SKU_ATTR] = this.core.mapSku( ogSku );
            if ( !ogSku || ogSku === '' ) LX.toast( 'Aviso!', `⚠️ Falta SKU para el pedido ${r[ORDER_ATTR]}.`, { timeout: -1, position: 'top-center' } );
            // if( ogSku !== r[SKU_ATTR] ) console.warn( `SKU mapped from ${ogSku} to ${r[SKU_ATTR]}` );
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

        const totalIncome = countries.reduce( ( o, c ) => {
            o[c] = LX.round( data.reduce( ( acc, row ) => {
                if ( row[PAIS_ATTR] !== c ) return acc;
                return acc + parseFloat( row['precio de los productos básicos'] );
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
                    submenu: countries.map( ( c ) => {
                        return { name: c, callback: () => this.exportLAL( c ) };
                    } )
                },
                null,
                {
                    name: 'Exportar ALB',
                    icon: 'File',
                    submenu: countries.map( ( c ) => {
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
            const priceWithoutIVA = parseFloat( row['precio de los productos básicos'] ) / ( iva ?? 1.21 );
            return LX.round( priceWithoutIVA );
        };

        // IVA
        {
            const IVAContainer = LX.makeContainer( [ null, 'auto' ], Constants.TAB_CONTAINER_CLASSNAME.replace( 'rounded-lg', '' ) );
            this.fiscalTabs.add( 'IVA', IVAContainer, { selected: ( selectedTab === 'IVA' || !this.fiscalTabs ) } );

            const IVA_COLS = [
                [ PAIS_ATTR ],
                [ ORDER_ATTR, 'NÚMERO PEDIDO' ],
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
            this.fiscalTabs.add( 'LAL', LALContainer, { selected: ( selectedTab === 'LAL' ) } );

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
                [ 'Cantidad', 'CantidadR' ] // 'AG'
            ];

            const skuMap = {};
            const totalTransportPerComp = {};

            data.forEach( ( row ) => {
                const sku = row[SKU_ATTR];
                const skus = this.core.getIndividualSkusPerPack( sku );
                // console.log(skus);
                skus.forEach( ( skuObj ) => {
                    const mappedSku = this.core.mapSku( skuObj.sku ); // mapping here shouldn't be necessary
                    const prefix = mappedSku.substring( 0, mappedSku.indexOf( '-' ) );
                    const totalQuantity = this.core.getIndividualQuantityPerPack( mappedSku, 1 );
                    const country = row[PAIS_ATTR];
                    const skuPriceFactor = skuObj.price;
                    const priceWithoutIVA = getPriceWithoutIVA( row ) * skuPriceFactor;
                    const transportPrice = this.core.countryTransportCostPct[country];
                    const totalProductTransport = LX.round( priceWithoutIVA * transportPrice );
                    const productTotal = LX.round( priceWithoutIVA - totalProductTransport );

                    let skuIdx = `${mappedSku}_${country}`;
                    if ( !skuMap[skuIdx] )
                    {
                        const product = Data.sku[mappedSku];
                        skuMap[skuIdx] = {
                            'Artículo': mappedSku,
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

            countries.forEach( ( c ) => {
                modifiedData.push(
                    { 'Artículo': 'P01', 'Descripción': 'Transporte Jowy', 'Cantidad': 1, 'Total': totalTransportPerComp[`JW_${c}`] ?? 0, 'País': c },
                    { 'Artículo': 'P02', 'Descripción': 'Transporte HxG', 'Cantidad': 1, 'Total': totalTransportPerComp[`HG_${c}`] ?? 0, 'País': c },
                    { 'Artículo': 'P03', 'Descripción': 'Transporte Fucklook', 'Cantidad': 1, 'Total': totalTransportPerComp[`FL_${c}`] ?? 0, 'País': c },
                    { 'Artículo': 'P04', 'Descripción': 'Transporte Bathby', 'Cantidad': 1, 'Total': totalTransportPerComp[`BY_${c}`] ?? 0, 'País': c }
                );

                totalIncomeNetPlusIVA[c] = LX.round( modifiedData.reduce( ( acc, row ) => {
                    if ( row[PAIS_ATTR] !== c ) return acc;
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
                const incomeArea = new LX.Area( { skipAppend: true } );
                const tabs = incomeArea.addTabs( { fit: true } );
                countries.forEach( ( c ) => {
                    const p = new LX.Panel();
                    p.addText( 'Total brutos', totalIncome[c] + ' €', null, { width: '16rem', nameWidth: '50%', disabled: true, className: '[&_input]:px-4!', fit: true } );
                    p.addText( 'Total neto + IVA', totalIncomeNetPlusIVA[c] + ' €', null, { width: '16rem', nameWidth: '50%', disabled: true, className: '[&_input]:px-4!', fit: true } );
                    tabs.add( c, p.root );
                } );
                new LX.Popover( popoverButton.root, [ incomeArea ], { align: 'end' } );
            }, { icon: 'Eye', iconPosition: 'start' } );
            subUtilsPanel.endLine( 'ml-auto' );

            this.lastShownSeurLALData = tableWidget.data.body;
        }

        // ALB
        {
            const ALBContainer = LX.makeContainer( [ null, 'auto' ], Constants.TAB_CONTAINER_CLASSNAME.replace( 'rounded-lg', '' ) );
            this.fiscalTabs.add( 'ALB', ALBContainer, { selected: ( selectedTab === 'ALB' ) } );

            this.ALB_COLS = [
                [ PAIS_ATTR ],
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
                    const country = row[PAIS_ATTR];
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
                    const country = row[PAIS_ATTR];
                    const iva = this.core.countryIVA[country];
                    return LX.round( net / iva );
                } ], // 'AT'
                [ '' ],
                [ '' ], // 'AU', 'AV'
                [ 'IVA', null, ( str, row ) => {
                    const country = row[PAIS_ATTR];
                    return LX.round( ( this.core.countryIVA[country] - 1 ) * 100 );
                } ], // 'AW'
                [ '' ],
                [ '' ], // 'AX', 'AY'
                [ 'Cuota', null, ( str, row ) => {
                    const net = row['Total'];
                    const country = row[PAIS_ATTR];
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

            let modifiedData = countries.map( ( c ) => {
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

            this.lastShownSeurALBData = tableWidget.data.body;
        }

        // i don't know what is this.. removing it by now
        tmpArea.root.children[1].remove();
    }

    exportIVA()
    {
        const weekN = Utils.getWeekNumber( Utils.convertDateDMYtoMDY( this.currentDate ) );
        const filename = `IVA_${this.title}_SEMANA_${weekN}.xlsx`;
        const sheets = countries.map( ( c ) => {
            const filteredRows = LX.deepCopy( this.lastShownSeurIVAData )
                .filter( ( row ) => ( row[0] === c ) )
                .map( ( row ) => row.slice( 1 ) );
            const data = [ LX.deepCopy( this.lastSeurIVAColumnData ).slice( 1 ), ...filteredRows ];
            return this.core.createXLSXSheet( data );
        } );

        const workbook = this.core.createXLSXWorkbook( sheets, countries );
        this.core.exportXLSXWorkbook( workbook, filename );
    }

    getLALData( country, albNumberOffset )
    {
        const LALColumnData = this.LAL_COLS.map( ( c ) => {
            return c[1] ?? c[0];
        } ).slice( 1 );

        const filename = `LAL.xlsx`;
        const filteredRows = LX.deepCopy( this.lastShownSeurLALData )
            .filter( ( row ) => ( row[0] === country ) )
            .map( ( row, index ) => {
                const m = row.slice( 1 );
                m[1] = this.albNumber + ( albNumberOffset ?? 0 ); // Add NUMBER offset based on new ALBARAN
                m[2] = index + 1; // Update _POSICIÓN_ based on new filtered data
                return m;
            } );
        const finalRowsWithEmptyColumns = [];
        filteredRows.forEach( ( row, index ) => {
            let lastFilledIndex = 0;
            const newRow = LALColumnData.map( ( d ) => {
                if ( d === '' ) return '';
                else return row[lastFilledIndex++];
            } );
            finalRowsWithEmptyColumns.push( newRow );
        } );
        const data = [ LALColumnData, ...finalRowsWithEmptyColumns ];
        return { filename, data };
    }

    getALBData( country, albNumberOffset )
    {
        const ALBColumnData = this.ALB_COLS.map( ( c ) => {
            return c[1] ?? c[0];
        } ).slice( 1 );

        const filename = `ALB.xlsx`;
        const filteredRows = LX.deepCopy( this.lastShownSeurALBData )
            .filter( ( row ) => ( row[0] === country ) )
            .map( ( row, index ) => {
                const m = row.slice( 1 );
                m[1] = this.albNumber + ( albNumberOffset ?? 0 ); // Add NUMBER offset based on new ALBARAN
                return m;
            } );
        const finalRowsWithEmptyColumns = [];
        filteredRows.forEach( ( row, index ) => {
            let lastFilledIndex = 0;
            const newRow = ALBColumnData.map( ( d ) => {
                if ( d === '' ) return '';
                else return row[lastFilledIndex++];
            } );
            finalRowsWithEmptyColumns.push( newRow );
        } );
        const data = [ ALBColumnData, ...finalRowsWithEmptyColumns ];
        return { filename, data };
    }

    exportLAL( country )
    {
        if ( Number.isNaN( this.albNumber ) || this.albNumber < 0 )
        {
            LX.toast( 'Error', '❌ Número de albarán inválido.', { timeout: -1, position: 'top-center' } );
            return;
        }

        const offset = countries.indexOf( country );
        const { filename, data } = this.getLALData( country, offset );
        this.core.exportXLSXData( data, filename );
    }

    exportALB( country )
    {
        if ( Number.isNaN( this.albNumber ) || this.albNumber < 0 )
        {
            LX.toast( 'Error', '❌ Número de albarán inválido.', { timeout: -1, position: 'top-center' } );
            return;
        }

        const offset = countries.indexOf( country );
        const { filename, data } = this.getALBData( country, offset );
        this.core.exportXLSXData( data, filename );
    }

    async exportAlbaranes()
    {
        if ( Number.isNaN( this.albNumber ) || this.albNumber < 0 )
        {
            LX.toast( 'Error', '❌ Número de albarán inválido.', { timeout: -1, position: 'top-center' } );
            return;
        }

        const folders = {};

        countries.forEach( ( c, i ) => {
            folders[c] = [ this.getLALData( c, i ), this.getALBData( c, i ) ];
        } );

        const zip = await this.core.zipWorkbooks( folders );
        LX.downloadFile( 'ALBARANES.zip', zip );
    }

    close()
    {
        this.clear();
    }

    clear()
    {
        delete this.lastSeurData;
        this.showOrdersList( [] );
        this.showStockList( [] );
        // this.showTrackingList( [] );
        // this.showAlbaranRelatedInfo( [], 0 );
    }
}

export { MiraviaApp };
