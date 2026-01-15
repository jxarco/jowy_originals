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

            docMaker.header( 'Acciones.', 'h2' );
            docMaker.lineBreak();

            docMaker.paragraph(
                `Acciones principales:`
            );
            docMaker.bulletList( [
                `<span class='font-bold'>Ver mensajes</span>: ...`,
                `<span class='font-bold'>Limpiar datos anteriores</span>: ...`,
                `<span class='font-bold'>Nuevo pedido</span>: ...`,
                `<span class='font-bold'>Más opciones</span>: ...`,
                [
                    `<span class=''>Abrir pedidos</span>: ...`,
                    `<span class=''>Marcar seleccionados</span>: ...`,
                    `<span class=''>Actualizar pedidos</span>: ...`,
                ]
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
