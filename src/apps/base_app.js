import { LX } from 'lexgui';

class BaseApp
{
    constructor( core, tool )
    {
        this.tool = tool;
        this.area = new LX.Area( { skipAppend: true, className: 'hidden' } );
        this.core = core;
        this.core.apps[tool] = this; // auto-register in core
        this.core.area.attach( this.area );
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
}

export { BaseApp };
