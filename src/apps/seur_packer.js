import { LX } from 'lexgui';
import { Constants, NumberFormatter } from '../constants.js';
import * as Utils from '../utils.js';
import { BaseApp } from './base_app.js';

const columnData = [
    [ 'Número del pedido' ],
    [ 'Bultos' ],
    [ 'SKU del vendedor' ],
    [ 'Código Postal' ],
    [ 'País' ],
    [ 'Provincia' ],
    [ 'Ciudad' ],
    [ 'Dirección' ],
    [ 'Nombre de usuario completo' ],
    [ 'Número de Teléfono' ],
    [ 'Correo electrónico de usuario' ],
];

class SeurPackerApp extends BaseApp
{
    constructor( core, tool )
    {
        super( core, tool );

        this.title = 'Packer: <i>Etiquetas SEUR</i>';
        this.subtitle = 'Arrastra archivos <strong>.xlsx</strong> de etiquetas para combinarlos.';
        this.icon = 'Barcode';

        // Create utility buttons
        const utilsPanel = new LX.Panel( { height: 'auto', className: Constants.UTILITY_BUTTONS_PANEL_CLASSNAME } );
        utilsPanel.sameLine();
        Utils.addUtilityButton( utilsPanel, 'ClearButton', 'Trash2', 'Limpiar datos anteriores', () => this.core.clearData() );
        this.exportButton = Utils.addUtilityButton( utilsPanel, 'ExportButton', 'Download', 'Exportar Etiquetas', () => this.exportAll(), true );
        utilsPanel.endLine();
        this.area.attach( utilsPanel.root );

        this.listArea = new LX.Area();
        this.area.attach( this.listArea );
        
        this.clear();
    }

    openData( data )
    {
        if ( !data?.length )
        {
            return;
        }

        // Sort by ref once
        data = data.sort( ( a, b ) => {
            const sku_a = a['SKU del vendedor'] ?? '?';
            const sku_b = b['SKU del vendedor'] ?? '?';
            return sku_a.localeCompare( sku_b );
        } );

        this.showList( data );

        console.log(data)

        Utils.toggleButtonDisabled( this.exportButton, false );
    }

    async showList( list = [] )
    {
        Utils.clearArea( this.listArea );

        // Create table data from the list
        const tableData = list.map( ( row ) => {
            const lRow = [];
            for ( let c of columnData )
            {
                const ogColName = c[0];
                const fn = c[2] ?? ( ( str ) => str );
                lRow.push( fn( row[ogColName] ?? '?', row ) );
            }
            return lRow;
        } );

        const tableWidget = new LX.Table( null, {
            head: columnData.map( ( c ) => {
                return c[1] ?? c[0];
            } ),
            body: tableData
        }, {
            selectable: false,
            sortable: false,
            toggleColumns: false,
            // hiddenColumns: [],
            filter: 'SKU del vendedor',
            centered: false,
            customFilters: [
                { name: 'País', options:  [ 'ESPAÑA' , 'PORTUGAL', 'FRANCIA', 'ITALIA' ] },
            ]
        } );

        this.listArea.attach( tableWidget );

        this.lastData = tableWidget.data.body;
    }

    exportAll()
    {
        const filename = `ETIQUETAS_SEUR_TODOS_${Utils.getTodayStringDate()}.xlsx`;
        const data = [ columnData, ...this.lastData ];
        this.core.exportXLSXData( data, filename );
    }

    clear()
    {
        super.clear();

        delete this.lastData;
        this.showList( [] );

        Utils.toggleButtonDisabled( this.exportButton, true );
    }
}

export { SeurPackerApp };
