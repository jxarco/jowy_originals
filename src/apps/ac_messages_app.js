import { LX } from 'lexgui';
import { Constants, NumberFormatter } from '../constants.js';
import * as Utils from '../utils.js';
import { BaseApp } from './base_app.js';
import { Data } from '../data.js';

const messageTypeIcons = {
    'info': { icon: 'Info', bg: '#2560da', fg: '#e5e5e5' },
    'failed': { icon: 'X', bg: '#dc2626', fg: '#e5e5e5' },
    'refund': { icon: 'Coins', bg: '#cf00df', fg: '#e5e5e5' },
    'out_of_stock': { icon: 'CircleOff', bg: '#dc6226', fg: '#e5e5e5' },
};

const columnData = [
    [ 'type', 'Tipo', ( str ) => {
        if ( messageTypeIcons[str] )
        {
            const status = messageTypeIcons[str] ?? {};
            let iconStr = status.icon ? LX.makeIcon( status.icon, { svgClass: 'md text-inherit!' } ).innerHTML : '';
            return `${
                LX.badge( iconStr + str, 'text-xs font-bold border-none ', {
                    style: { height: '1.4rem', borderRadius: '0.65rem', backgroundColor: status.bg ?? '', color: status.fg ?? '' }
                } )
            }`;
        }
        return '';
    } ],
    [ 'title', 'Título' ],
    // Add element with html title to show full message on hover
    [ 'message', 'Mensaje', (str) => {
        return `<span title="${str}">${str}</span>`;
    } ]
];

export class ACMessagesApp extends BaseApp
{
    constructor( core, tool )
    {
        super( core, tool );

        this.title = 'Mensajes AC';
        this.subtitle = '';
        this.icon = 'MessageSquare';

        // Create utility buttons
        // const utilsPanel = new LX.Panel( { height: 'auto', className: Constants.UTILITY_BUTTONS_PANEL_CLASSNAME } );
        // utilsPanel.sameLine();
        // Utils.addUtilityButton( utilsPanel, 'ClearButton', 'Trash2', 'Limpiar datos anteriores', () => this.core.clearData() );
        // this.exportButton = Utils.addUtilityButton( utilsPanel, 'ExportButton', 'Download', 'Exportar Etiquetas', () => this.exportAll(), true );
        // utilsPanel.endLine();
        // this.area.attach( utilsPanel.root );

        this.listArea = new LX.Area();
        this.area.attach( this.listArea );
        
        this.clear();
    }

    async showList()
    {
        Utils.clearArea( this.listArea );

        const list = Object.values( Data.ac_messages );

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

        const filterOptions = list.map( ( row ) => row['type'] ).filter( ( v, i, a ) => a.indexOf( v ) === i );

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
            filter: 'Título',
            centered: false,
            customFilters: [
                { name: 'Tipo', options: filterOptions },
            ],
            rowActions: [
                {
                    icon: 'Copy',
                    title: 'Copiar',
                    callback: ( rowIndex, rowData ) => {
                        const data = rowData[ 2 ];
                        const tsv = LX.stripTags( data );
                        // console.log(tsv)
                        navigator.clipboard.writeText( tsv ).then( () => {
                            LX.toast( 'Hecho!', `✅ "${rowData[ 1 ]}" copiado al portapapeles.`, { timeout: 5000, position: 'top-center' } );
                        } ).catch( ( err ) => {
                            console.error( 'Error copying text: ', err );
                            LX.toast( 'Error', '❌ No se pudo copiar.', { timeout: -1, position: 'top-center' } );
                        } );
                    }
                }
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

        // Utils.toggleButtonDisabled( this.exportButton, true );
    }
}