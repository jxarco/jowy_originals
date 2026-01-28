import { LX } from 'lexgui';
import * as Utils from '../utils.js';

class BaseApp
{
    static SKU_ATTR = 'SKU del vendedor';
    static PAIS_ATTR = 'País';
    static ORDER_ATTR = 'Número del pedido';
    static ART_ID_ATTR = 'ID del artículo';
    static ART_NAME_ATTR = 'Nombre del producto';
    static CLIENT_NAME_ATTR = 'Nombre de usuario completo';
    static CP_ATTR = 'Código Postal';
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
                    const val = fn( row[ogColName] ?? '?', row );
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
            centered: [ BaseApp.ORDER_ATTR, BaseApp.SKU_ATTR, ...( options.centered ?? [] ) ],
            filter: BaseApp.SKU_ATTR,
            customFilters: [
                { name: BaseApp.PAIS_ATTR, options: this.countries }
            ],
            hiddenColumns: [ BaseApp.ART_ID_ATTR, BaseApp.CP_ATTR, 
                'Provincia', 'Dirección', 'Número de Teléfono', 'Correo electrónico de usuario', ...( options.hiddenColumns ?? [] ) ]
        } );

        this.lastOrdersData = data;

        return tableWidget;
    }

    getPackUnits( sku )
    {
        return this._packUnits[sku] ?? 1;
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
