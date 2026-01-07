import { LX } from 'lexgui';
import { MiraklClient } from '../mirakl-api.js';

class LabelsApp
{
    constructor( core )
    {
        this.core = core;
        this.area = new LX.Area( { skipAppend: true, className: 'hidden' } );
        core.area.attach( this.area );

        const panel = new LX.Panel( { height: 'h-full', className: 'bg-none border-none p-4 flex flex-col gap-2' } );
        this.area.attach( panel.root );

        panel.addButton( null, 'Click here', async ( v ) => {
            this.client = new MiraklClient( {
                baseUrl: 'https://marketplace-decathlon-eu.mirakl.net/',
                apiKey: window.apiKey
            } );

            await this.client.listOrders();
        }, { className: 'block z-100 contrast self-center', width: 'fit-content' } );

        core.labelsAppArea = this.area;

        this.clear();
    }

    open( params )
    {
        this.core.tool = 'labels';
        this.core.setHeaderTitle( `Etiquetas para Marketplaces`, '', 'StickyNote' );
        this.area.root.classList.toggle( 'hidden', false );
    }

    clear()
    {
    }
}

export { LabelsApp };
