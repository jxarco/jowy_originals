import { LX } from 'lexgui';
import { DocMaker } from 'lexgui/extensions/DocMaker.js';

class ManualApp
{
    constructor( core )
    {
        this.core = core;
        this.area = new LX.Area( { skipAppend: true, className: 'hidden' } );
        core.area.attach( this.area );

        const tabs = this.area.addTabs( { parentClass: 'p-4', sizes: [ 'auto', 'auto' ], contentClass: 'p-2 pt-0' } );

        {
            const webContainer = LX.makeContainer( [ null, 'auto' ], 'flex flex-col relative bg-card p-1 pt-0 rounded-lg overflow-hidden' );
            tabs.add( 'Web', webContainer, { selected: true, onSelect: ( event, name ) => {} } );
            webContainer.appendChild( this.createWebDocs() );
        }

        {
            const sheinContainer = LX.makeContainer( [ null, 'auto' ], 'flex flex-col relative bg-card p-1 pt-0 rounded-lg overflow-hidden' );
            tabs.add( 'Shein', sheinContainer, { xselected: true, onSelect: ( event, name ) => {} } );
            sheinContainer.appendChild( this.createSheinDocs() );
        }

        {
            const decathlonContainer = LX.makeContainer( [ null, 'auto' ], 'flex flex-col relative bg-card p-1 pt-0 rounded-lg overflow-hidden' );
            tabs.add( 'Decathlon', decathlonContainer, { xselected: true, onSelect: ( event, name ) => {} } );
            decathlonContainer.appendChild( this.createDecathlonDocs() );
        }

        this.clear();
    }

    createWebDocs()
    {
        const area = new LX.Area( { className: 'help-content rounded-lg bg-card p-8' } );

        const docMaker = new DocMaker();
        docMaker.setDomTarget( area.root );

        docMaker.header( 'Seguimiento y Facturas.', 'h1' );
        {
            docMaker.lineBreak();

            docMaker.paragraph(
                `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur condimentum nisl vel fermentum porta. Aliquam sit amet lacus in quam vestibulum pellentesque vitae et orci. Duis lobortis, sapien vitae molestie rhoncus, leo leo rutrum diam, vitae imperdiet felis nulla eget urna. Quisque id urna nec diam blandit posuere. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed efficitur magna facilisis tellus porta, id porta ante feugiat. Maecenas elementum, neque nec laoreet bibendum, tellus leo malesuada ligula, vitae interdum nunc nulla nec purus. Etiam lorem ligula, ullamcorper sit amet massa ac, pretium mollis sem.`
            );

            docMaker.lineBreak();

            docMaker.header( 'Shader Passes.', 'h2', 'shader-passes' );

            docMaker.paragraph(
                `ShaderHub supports multiple shader passes, which are essentially different stages of rendering that can be combined to create complex visual effects. There are 3 types of passes you can create:`
            );
            docMaker.bulletList( [
                `<span class='font-bold underline underline-offset-4'>Buffers</span>: Offscreen render targets that can be used to store intermediate results. You can create up to four buffer passes, which can be referenced in subsequent passes using the iChannel uniforms (iChannel0, iChannel1, etc.). This allows you to build effects step by step, using the output of one pass as the input for another.`,
                `<span class='font-bold underline underline-offset-4'>Compute</span>: A compute pass that runs independently of the render pipeline and writes directly to buffers or textures. This is useful for general-purpose GPU computations such as simulations, particle updates, procedural data generation, or precomputing values that will later be used by render or buffer passes.`,
                `<span class='font-bold underline underline-offset-4'>Common</span>: Used for shared code that can be included in other passes. This is useful for defining functions or variables that you want to reuse across multiple shader passes. You can only have one Common pass per shader.`
            ] );
        }

        docMaker.lineBreak();
        docMaker.lineBreak();

        docMaker.header( 'Pedidos.', 'h1' );
        {
            docMaker.lineBreak();

            docMaker.paragraph(
                `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur condimentum nisl vel fermentum porta. Aliquam sit amet lacus in quam vestibulum pellentesque vitae et orci. Duis lobortis, sapien vitae molestie rhoncus, leo leo rutrum diam, vitae imperdiet felis nulla eget urna. Quisque id urna nec diam blandit posuere. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed efficitur magna facilisis tellus porta, id porta ante feugiat. Maecenas elementum, neque nec laoreet bibendum, tellus leo malesuada ligula, vitae interdum nunc nulla nec purus. Etiam lorem ligula, ullamcorper sit amet massa ac, pretium mollis sem.`
            );
        }

        return area.root;
    }

    createSheinDocs()
    {
        const area = new LX.Area( { className: 'help-content rounded-lg bg-card p-8' } );

        const docMaker = new DocMaker();
        docMaker.setDomTarget( area.root );

        docMaker.header( LX.makeIcon( 'Construction', { svgClass: 'mr-4 2xl inline-flex!' } ).innerHTML + 'Shein.', 'h1' );

        return area.root;
    }

    createDecathlonDocs()
    {
        const area = new LX.Area( { className: 'help-content rounded-lg bg-card p-8' } );

        const docMaker = new DocMaker();
        docMaker.setDomTarget( area.root );

        docMaker.header( LX.makeIcon( 'Construction', { svgClass: 'mr-4 2xl inline-flex!' } ).innerHTML + 'Decathlon.', 'h1' );

        return area.root;
    }

    open( params )
    {
        this.core.tool = 'manual';
        this.core.setHeaderTitle( `Web: <i>Pedidos</i>`, '', 'WooCommerce' );
        this.area.root.classList.toggle( 'hidden', false );
    }

    close()
    {
    }

    clear()
    {
    }
}

export { ManualApp };
