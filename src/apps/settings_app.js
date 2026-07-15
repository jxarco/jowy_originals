import { LX } from 'lexgui';
import { Constants, NumberFormatter } from '../constants.js';
import * as Utils from '../utils.js';
import { BaseApp } from './base_app.js';
import { Data } from '../data.js';

export class SettingsApp extends BaseApp
{
    constructor( core, tool )
    {
        super( core, tool );

        this.title = 'Ajustes';
        this.subtitle = '';
        this.icon = 'Cog';

        // Create utility buttons
        // const utilsPanel = new LX.Panel( { height: 'auto', className: Constants.UTILITY_BUTTONS_PANEL_CLASSNAME } );
        // utilsPanel.sameLine();
        // Utils.addUtilityButton( utilsPanel, 'ClearButton', 'Trash2', 'Limpiar datos anteriores', () => this.core.clearData() );
        // this.exportButton = Utils.addUtilityButton( utilsPanel, 'ExportButton', 'Download', 'Exportar Etiquetas', () => this.exportAll(), true );
        // utilsPanel.endLine();
        // this.area.attach( utilsPanel.root );

        const container = LX.makeElement( 'div', 'flex flex-row gap-2 p-2', '', this.area );
        const panelClass = Constants.UTILITY_BUTTONS_PANEL_CLASSNAME.replace('flex-row', 'flex-col') + ' rounded-lg border-color';
        const refreshFnToast = () => LX.toast( `Atención ⚠️`, 'Recarga la página para aplicar los cambios.', { position: 'top-center', timeout: 5000 } );
        
        if( localStorage.getItem( 'jowy_loadDataOnHeadersClick' ) === null ) localStorage.setItem( 'jowy_loadDataOnHeadersClick', true );
        if( localStorage.getItem( 'jowy_showSidePanel' ) === null ) localStorage.setItem( 'jowy_showSidePanel', true );
        if( localStorage.getItem( 'jowy_rememberLastApp' ) === null ) localStorage.setItem( 'jowy_rememberLastApp', true );

        {
            const utilsPanel = new LX.Panel( { height: 'auto', className: panelClass } );
            utilsPanel.addToggle( 'Click en encabezados para cargar datos', JSON.parse( localStorage.getItem( 'jowy_loadDataOnHeadersClick' ) ), ( v ) => {
                localStorage.setItem( 'jowy_loadDataOnHeadersClick', v );
                refreshFnToast();
            }, { className: 'success', label: '', skipReset: true, nameWidth: '75%' } );
            utilsPanel.addToggle( 'Recordar última aplicación utilizada', JSON.parse( localStorage.getItem( 'jowy_rememberLastApp' ) ), ( v ) => {
                localStorage.setItem( 'jowy_rememberLastApp', v );
                refreshFnToast();
            }, { className: 'success', label: '', skipReset: true, nameWidth: '75%' } );
            container.appendChild( utilsPanel.root );
        }

        {
            const utilsPanel = new LX.Panel( { height: 'auto', className: panelClass } );
            utilsPanel.addToggle( 'Mostrar panel lateral de aplicaciones', JSON.parse( localStorage.getItem( 'jowy_showSidePanel' ) ), ( v ) => {
                localStorage.setItem( 'jowy_showSidePanel', v );
                refreshFnToast();
            }, { className: 'success', label: '', skipReset: true, nameWidth: '75%' } );
            container.appendChild( utilsPanel.root );
        }

        this.clear();
    }

    clear()
    {
        super.clear();

        // Utils.toggleButtonDisabled( this.exportButton, true );
    }
}