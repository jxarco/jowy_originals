import { LX } from 'lexgui';
import { Data } from '../data.js';
import { Constants } from '../constants.js';
import * as Utils from '../utils.js';

class BaseApp
{
    static SKU_ATTR = 'SKU del vendedor';
    static OLD_SKU_ATTR = 'SKU del vendedor_OLD';
    static PAIS_ATTR = 'País';
    static ORDER_ATTR = 'Número del pedido';
    static ART_ID_ATTR = 'ID del artículo';
    static ART_NAME_ATTR = 'Nombre del producto';
    static CLIENT_NAME_ATTR = 'Nombre de usuario completo';
    static CP_ATTR = 'Código Postal';
    static PHONE_ATTR = 'Número de Teléfono';
    static PACK_U_ATTR = 'Pack Units';

    constructor( core, tool )
    {
        this.tool = tool;
        this.area = new LX.Area( { skipAppend: true, className: 'hidden' } );
        this.core = core;
        this.core.apps[tool] = this; // auto-register in core
        this.core.area.attach( this.area );

        const date = new Date();
        this.currentDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
        this.albNumber = -1;
        this.countries = [];
        this.countryTransportCostPct = {
            'ESPAÑA': 1e10,
            'PORTUGAL': 1e10,
            'FRANCIA': 1e10,
            'ITALIA': 1e10
        };

        this._trackingSyncErrors = [];
        this._packUnits = {};
        this._onParseRowData = null;
        this._onAlbaranData = null;
    }

    open( params )
    {
        this.core.setHeaderTitle( `${this.title}.`, this.subtitle, this.icon );
        this.area.root.classList.toggle( 'hidden', false );
        return this.tool;
    }

    close()
    {
    }

    hide()
    {
        this.area.root.classList.toggle( 'hidden', true );
    }

    clear()
    {
        this._trackingSyncErrors = [];
        this._packUnits = {};
    }

    getPackUnits( sku )
    {
        return this._packUnits[sku] ?? 1;
    }

    parseData( data, ATTR_PARAMS )
    {
        const { SKU_ATTR, OLD_SKU_ATTR, ORDER_ATTR, PAIS_ATTR, CP_ATTR, PHONE_ATTR, PVP_ATTR } = ATTR_PARAMS;

        // Map SKUs and Country once on load data
        data.forEach( ( r ) => {
            const ogSku = r[SKU_ATTR];
            if ( !ogSku || ogSku === '' ) LX.toast( 'Aviso!', `⚠️ Falta SKU para el pedido ${r[ORDER_ATTR]}.`, { timeout: -1, position: 'top-center' } );
            else
            {
                r[OLD_SKU_ATTR] = ogSku; // Store old sku in case it's necessary
                const skuData = this.core.mapSku( ogSku );
                r[SKU_ATTR] = skuData.sku; // replace with new sku
                this._packUnits[ogSku] = skuData.quantity; // save pack quantity
                r[BaseApp.PACK_U_ATTR] = skuData.quantity; // store also in row
            }
            const ogCountry = r[PAIS_ATTR];
            r[PAIS_ATTR] = this.core.mapCountry( ogCountry );
            const ogZipCode = r[CP_ATTR];
            r[CP_ATTR] = this.core.mapZipCode( ogZipCode );
            const ogPhone = r[PHONE_ATTR];
            if( ogPhone ) r[PHONE_ATTR] = ogPhone.replace( /[()]/g, '' );
            const ogPVP = r[PVP_ATTR];
            if( ogPVP ) r[PVP_ATTR] = ogPVP.constructor === String ?
                ogPVP.replace( '€', '' ).replace( ',', '.' ).trim() : ogPVP;
        } );

        // Sort by ref once
        data = data.sort( ( a, b ) => {
            const sku_a = a[SKU_ATTR] ?? '?';
            const sku_b = b[SKU_ATTR] ?? '?';
            return sku_a.localeCompare( sku_b );
        } );

        console.log( this.title, data );

        return data;
    }

    getOrdersListTable( data, columnData, options = {} )
    {
        const tableData = data.map( ( row ) => {
            const lRow = [];
            for ( let c of columnData )
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
                    const val = fn( row[ogColName] ?? '?', row, this );
                    lRow.push( val );
                }
            }
            return lRow;
        } );

        this.core.setHeaderTitle( `${this.title}: <i>${tableData.length} pedidos cargados</i>`, this.subtitle, this.icon );

        const tableWidget = new LX.Table( null, {
            head: columnData.map( ( c ) => c[1] ?? c[0] ),
            body: tableData
        }, {
            selectable: true,
            toggleColumns: true,
            centered: [ BaseApp.ORDER_ATTR, BaseApp.SKU_ATTR, BaseApp.OLD_SKU_ATTR, ...( options.centered ?? [] ) ],
            filter: BaseApp.SKU_ATTR,
            customFilters: [
                { name: BaseApp.PAIS_ATTR, options: this.countries }
            ],
            hiddenColumns: [ BaseApp.ART_ID_ATTR, BaseApp.CP_ATTR, 'Provincia', 'Dirección', 'Número de Teléfono', 'Correo electrónico de usuario', ...( options.hiddenColumns ?? [] ) ]
        } );

        this.lastOrdersData = data;

        return tableWidget;
    }

    getStockListTable( data, columnData, ORDER_ATTR )
    {
        data = LX.deepCopy( data );

        const orderNumbers = new Map();

        // Create table data from the list
        let rows = data.map( ( row, index ) => {
            const lRow = [];
            for ( let c of columnData )
            {
                let colName = c[0];

                if ( colName === ORDER_ATTR )
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
            const finalQuantity = finalRow[1];
            const rest = repeats.slice( 1 );
            const trail = rest.reduce( ( p, c ) => {
                const q = rows[c][1]; // Get quantity
                return p + ` + ${rows[c][skuIdx]}${q > 1 ? ` x ${q}` : ''}`;
            }, finalQuantity > 1 ? ` x ${finalQuantity}` : '' );
            rest.forEach( ( r ) => {
                rows[r] = undefined;
            } );
            finalRow[skuIdx] += trail;
            finalRow[1] = 1; // Set always 1 UNIT for multiple item orders
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

            // Delete order num
            row.splice( 6, 1 );

            // If same order or more than 1 unit, do not merge items
            const q = row[1];
            if ( q > 1 )
            {
                row[5] = 'Mismo pedido';
                tableData.push( row );
                continue;
            }

            if ( !skus[sku] )
            {
                skus[sku] = [ tableData.length ];
                tableData.push( row );
            }
            else
            {
                const idx = skus[sku][0]; // 0 here is to access the list index, not an attribute
                tableData[idx][1] += row[1]; // Add quantity (ALREDY WITH PACK UNIT FACTOR)
            }
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
            filter: BaseApp.SKU_ATTR,
            customFilters: [
                { name: BaseApp.PAIS_ATTR, options: this.countries }
            ]
        } );

        return tableWidget;
    }

    getTrackingListTable( tData, columnData, options = {} )
    {
        const data = this.lastOrdersData;

        this._trackingSyncErrors = [];

        // Create table data from the list
        const tableData = data.map( ( row ) => {
            const lRow = [];
            for ( let c of columnData )
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
                    const val = fn( row[ogColName] ?? '?', row, tData, this );
                    lRow.push( val );
                }
            }
            return lRow;
        } );

        const tableWidget = new LX.Table( null, {
            head: columnData.map( c => c[1] ?? c[0] ),
            body: tableData
        }, {
            selectable: true,
            toggleColumns: true,
            centered: options.centered,
            filter: options.filter,
            hiddenColumns: options.hiddenColumns
        } );

        this.lastSeurTrackingsColumnData = tableWidget.data.head;
        this.lastShownSeurTrackingsData = tableWidget.data.body;

        return tableWidget;
    }

    showAlbaranRelatedInfo( data, ATTR_PARAMS, external = false )
    {
        const { SKU_ATTR, OLD_SKU_ATTR, ORDER_ATTR, PAIS_ATTR, CP_ATTR, PHONE_ATTR, PVP_ATTR, ORDER_DATE_ATTR, QNT_ATTR } = ATTR_PARAMS;

        Utils.clearArea( this.albaranArea );

        data = data ?? this.lastOrdersData;

        if( this._onAlbaranData )
        {
            data = this._onAlbaranData( data, external );
        }

        // Map SKUs and Country once on load data
        data.forEach( ( r ) => {
            const ogSku = r[SKU_ATTR];
            if ( !ogSku || ogSku === '' ) LX.toast( 'Aviso!', `⚠️ Falta SKU para el pedido ${r[ORDER_ATTR]}.`, { timeout: -1, position: 'top-center' } );
            else
            {
                r[OLD_SKU_ATTR] = ogSku; // Store old sku in case it's necessary
                const skuData = this.core.mapSku( ogSku );
                r[SKU_ATTR] = skuData.sku; // replace with new sku
                this._packUnits[ogSku] = skuData.quantity; // save pack quantity
                r[BaseApp.PACK_U_ATTR] = skuData.quantity; // store also in row
            }
            const ogCountry = r[PAIS_ATTR];
            r[PAIS_ATTR] = this.core.mapCountry( ogCountry );
            const ogZipCode = r[CP_ATTR];
            r[CP_ATTR] = this.core.mapZipCode( ogZipCode );
            const ogPhone = r[PHONE_ATTR];
            r[PHONE_ATTR] = ogPhone.replace( /[()]/g, '' );
            const ogPVP = r[PVP_ATTR];
            r[PVP_ATTR] = ogPVP.constructor === String ? ogPVP.replace( '€', '' ).replace( ',', '.' ).trim() : ogPVP;
        } );

        // Sort by ref once
        data = data.sort( ( a, b ) => {
            const sku_a = a[SKU_ATTR] ?? '?';
            const sku_b = b[SKU_ATTR] ?? '?';
            return sku_a.localeCompare( sku_b );
        } );

        const totalIncome = this.countries.reduce( ( o, c ) => {
            o[c] = LX.round( data.reduce( ( acc, row ) => {
                if ( row[PAIS_ATTR] !== c ) return acc;
                const qnt = parseInt( row[QNT_ATTR] );
                return acc + qnt * parseFloat( row[PVP_ATTR] );
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
            const iva = this.core.countryIVA[country];
            if ( !iva ) LX.toast( 'Aviso!', `⚠️ Falta IVA para el país ${country}: Using 21%.`, { timeout: -1, position: 'top-center' } );
            const qnt = parseInt( row[QNT_ATTR] );
            const priceWithoutIVA = qnt * parseFloat( row[PVP_ATTR] ) / ( iva ?? 1.21 );
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
                    const oldSku = row[OLD_SKU_ATTR];
                    const qnt = parseInt( row[QNT_ATTR] );
                    return qnt * this.getPackUnits( oldSku );
                } ],
                [ 'PRECIO SIN IVA', null, ( str, row ) => getPriceWithoutIVA( row ) ],
                [ 'IVA', null, ( str, row ) => {
                    const qnt = parseInt( row[QNT_ATTR] );
                    const priceWithoutIVA = getPriceWithoutIVA( row );
                    const totalIva = qnt * parseFloat( row[PVP_ATTR] )  - priceWithoutIVA;
                    return LX.round( totalIva );
                } ],
                [ PVP_ATTR, 'PVP', ( str, row ) => {
                    const qnt = parseInt( row[QNT_ATTR] );
                    return LX.round( parseFloat( str ) * qnt );
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
                    { name: 'PAÍS', options: this.countries }
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
                const total = parseFloat( row['Total'] );
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
                    return LX.round( row['Total'] );
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
                    return LX.round( str );
                } ], // 'AF'
                [ 'Cantidad', 'CantidadR' ] // 'AG'
            ];

            const skuMap = {};
            const totalTransportPerComp = {};

            data.forEach( ( row ) => {
                const sku = row[SKU_ATTR];
                const oldSku = row[OLD_SKU_ATTR];
                const country = row[PAIS_ATTR];
                const skus = this.core.getIndividualSkusPerPack( sku );
                // console.log(skus);
                let prcPriceCheck = 0;
                skus.forEach( ( skuObj ) => {
                    const itemSku = skuObj.sku;
                    const totalQuantity = parseInt( row[QNT_ATTR] ) * this.getPackUnits( oldSku );
                    const skuPctPrice = skuObj.price;
                    prcPriceCheck += skuPctPrice;
                    const priceWithoutIVA = getPriceWithoutIVA( row ) * skuPctPrice;
                    const transportPrice = this.countryTransportCostPct[country];
                    const totalProductTransport = priceWithoutIVA * transportPrice * skuPctPrice;
                    const productTotal = priceWithoutIVA - totalProductTransport;

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
                    const prefix = itemSku.substring( 0, itemSku.indexOf( '-' ) );
                    const tCompIdx = `${prefix}_${country}`;
                    if ( !totalTransportPerComp[tCompIdx] ) totalTransportPerComp[tCompIdx] = 0;
                    totalTransportPerComp[tCompIdx] += totalProductTransport;
                } );

                if( prcPriceCheck !== 1.0 )
                {
                    LX.toast( 'Error', '❌ Han ocurrido problemas calculando el Total bruto..', { timeout: -1, position: 'top-center' } );
                    throw( 'prcPriceCheck not 1.0, bad sku price division ' );
                }
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
                head: this.LAL_COLS.map( c => c[1] ?? c[0] ).filter( ( v ) => v !== '' ),
                body: tableData
            }, {
                selectable: false,
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
                LX.doAsync( () => this.showAlbaranRelatedInfo( data, ATTR_PARAMS ) );
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

    getSEURLabelsData( ignoreErrors = false, currentData, columnData, ORDER_ATTR )
    {
        // Process the xlsx first to detect empty fields
        if ( !ignoreErrors )
        {
            const errorFields = [];
            currentData.forEach( ( row, index ) => {
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
                        const v = c[2] ? c[2]( row[ogColName], row, this ) : row[ogColName];
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

                    let columns = columnData.map( c => c[0].split( '+' )[0] );

                    const fixedData = LX.deepCopy( currentData );

                    for ( const [ errIndex, errName ] of errorFields )
                    {
                        pTop.addLabel( `No existe ${errName} (${fixedData[errIndex][ORDER_ATTR]})` );
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
                        this.exportSEUR( true, undefined, columnData, ORDER_ATTR );
                    }, { width: '50%', buttonClass: 'destructive' } );
                    pBottom.addButton( null, 'Exportar', () => {
                        dialog.close();
                        this.exportSEUR( false, fixedData, columnData, ORDER_ATTR );
                    }, { width: '50%', buttonClass: 'primary' } );
                }, { position: [ 'calc(50% - 300px)', '250px' ], size: [ '600px', 'min(600px, 80%)' ] } );

                return;
            }
        }

        let err = 0;
        let errMsg = '';
        let data = columnData.map( ( c ) => c[1] ?? c[0] );

        let errorFn = () => {
            LX.toast( 'Error de exportación', `❌ No se han podido generar las etiquetas: ${errMsg}`, {
                timeout: -1,
                position: 'top-center'
            } );
        };

        if ( !currentData?.length )
        {
            errMsg = `No existen datos.`;
            errorFn();
            return;
        }

        const orderNumbers = new Map();

        let rows = currentData.map( ( row, index ) => {
            const lRow = [];
            for ( let c of columnData )
            {
                const ogColName = c[0];

                if ( ogColName === ORDER_ATTR )
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
                        errMsg = `No existen direcciones válidas (${row[ORDER_ATTR]}).`;
                        return;
                    }

                    lRow.push( `${row[tks[0]] ?? ''}${row[tks[1]] ? ` ${row[tks[1]]}` : ''}` );
                }
                else
                {
                    const v = c[2] ? c[2]( row[ogColName], row, this ) : row[ogColName];

                    if ( !ignoreErrors && v === undefined )
                    {
                        err = 1;
                        errMsg = `No existen datos de ${ogColName} (${row[ORDER_ATTR]}).`;
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
        const skuIdx = data.indexOf( BaseApp.SKU_ATTR );

        for ( const repeats of multipleItemsOrderNames )
        {
            const finalIndex = repeats[0];
            const finalRow = rows[finalIndex];
            const finalQuantity = finalRow.at( -1 );
            const rest = repeats.slice( 1 );
            const trail = rest.reduce( ( p, c ) => {
                const q = rows[c].at( -1 ); // Get quantity
                return p + ` + ${rows[c][skuIdx]}${q > 1 ? ` x ${q}` : ''}`;
            }, finalQuantity > 1 ? ` x ${finalQuantity}` : '' );
            rest.forEach( ( r ) => {
                rows[r] = undefined;
            } );
            finalRow[skuIdx] += trail;
            finalRow[1] = 1; // Set always "1 BULTO" for multiple item orders
            finalRow[finalRow.length - 1] = 1; // Set always 1 UNIT for multiple item orders
        }

        // Remove tmp quantity from col data
        data = data.slice( 0, -1 );

        rows = rows
            .filter( r => r !== undefined )
            .map( r => {
                const q = r.at( -1 );
                if ( q > 1 )
                {
                    r[skuIdx] += ` x ${q}`;
                }
                return r.slice( 0, -1 );
            } );

        return [ data, ...rows ];
    }

    exportIVA()
    {
        const weekN = Utils.getWeekNumber( Utils.convertDateDMYtoMDY( this.currentDate ) );
        const filename = `IVA_${this.title}_SEMANA_${weekN}.xlsx`;
        const sheets = this.countries.map( ( c ) => {
            const filteredRows = LX.deepCopy( this.lastShownIVAData )
                .filter( ( row ) => ( row[0] === c ) )
                .map( ( row ) => row.slice( 1 ) );
            const data = [ LX.deepCopy( this.lastIVAColumnData ).slice( 1 ), ...filteredRows ];
            return this.core.createXLSXSheet( data );
        } );

        const workbook = this.core.createXLSXWorkbook( sheets, this.countries );
        this.core.exportXLSXWorkbook( workbook, filename );
    }

    getLALData( country, albNumberOffset )
    {
        const LALColumnData = this.LAL_COLS.map( ( c ) => {
            return c[1] ?? c[0];
        } ).slice( 1 );

        const filename = `LAL.xlsx`;
        const filteredRows = LX.deepCopy( this.lastShownLALData )
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
        const filteredRows = LX.deepCopy( this.lastShownALBData )
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

        const offset = this.countries.indexOf( country );
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

        const offset = this.countries.indexOf( country );
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

        this.countries.forEach( ( c, i ) => {
            folders[c] = [ this.getLALData( c, i ), this.getALBData( c, i ) ];
        } );

        const zip = await this.core.zipWorkbooks( folders );
        LX.downloadFile( 'ALBARANES.zip', zip );
    }
}

export { BaseApp };
