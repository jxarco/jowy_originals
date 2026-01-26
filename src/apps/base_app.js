import { LX } from 'lexgui';

class BaseApp
{
    static SKU_ATTR = 'SKU del vendedor';
    static PAIS_ATTR = 'País';
    static ORDER_ATTR = 'Número del pedido';
    static ART_ID_ATTR = 'ID del artículo';
    static ART_NAME_ATTR = 'Nombre del producto';
    static CLIENT_NAME_ATTR = 'Nombre de usuario completo';
    static CP_ATTR = 'Código Postal';

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
    }

    getOrdersListTable( data, columnData )
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
            centered: [ BaseApp.ORDER_ATTR, BaseApp.SKU_ATTR ],
            filter: BaseApp.SKU_ATTR,
            customFilters: [
                { name: BaseApp.PAIS_ATTR, options: this.countries }
            ],
            hiddenColumns: [ BaseApp.ART_ID_ATTR, BaseApp.CP_ATTR, 'Provincia', 'Dirección', 'Número de Teléfono', 'Correo electrónico de usuario' ]
        } );

        this.lastOrdersData = data;

        return tableWidget;
    }
}

export { BaseApp };
