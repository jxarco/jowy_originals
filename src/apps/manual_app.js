import { LX } from 'lexgui';
import { BaseApp } from './base_app.js';
import { DocMaker } from 'lexgui/extensions/DocMaker.js';

const collapsibleClass = 'bg-accent/30 hover:bg-accent/50! rounded-xl border-color cursor-pointer [&_svg]:w-5! [&_svg]:h-5!';

class ManualApp extends BaseApp
{
    constructor( core, tool )
    {
        super( core, tool );

        this.title = 'Manual de Uso de Operaciones';
        this.subtitle = 'Guía detalladas de las acciones a realizar con la aplicación.';
        this.icon = 'Info@solid';

        const tabs = this.area.addTabs( { parentClass: 'p-4', sizes: [ 'auto', 'auto' ], contentClass: 'p-2 pt-0' } );

        {
            const introContainer = LX.makeContainer( [ null, 'auto' ], 'flex flex-col relative bg-card p-1 pt-0 rounded-lg overflow-hidden' );
            tabs.add( 'General', introContainer, { selected: true, onSelect: ( event, name ) => {} } );
            introContainer.appendChild( this.createIntroDocs() );
        }

        {
            const webContainer = LX.makeContainer( [ null, 'auto' ], 'flex flex-col relative bg-card p-1 pt-0 rounded-lg overflow-hidden' );
            tabs.add( 'Web', webContainer, { xselected: true, onSelect: ( event, name ) => {} } );
            webContainer.appendChild( this.createWebDocs() );
        }

        {
            const sheinContainer = LX.makeContainer( [ null, 'auto' ], 'flex flex-col relative bg-card p-1 pt-0 rounded-lg overflow-hidden' );
            tabs.add( 'SHEIN', sheinContainer, { selected: true, onSelect: ( event, name ) => {} } );
            sheinContainer.appendChild( this.createSheinDocs( 'SHEIN', 'shein.com' ) );
        }

        {
            const tiktokContainer = LX.makeContainer( [ null, 'auto' ], 'flex flex-col relative bg-card p-1 pt-0 rounded-lg overflow-hidden' );
            tabs.add( 'TikTok', tiktokContainer, { xselected: true, onSelect: ( event, name ) => {} } );
            tiktokContainer.appendChild( this.createSheinDocs( 'TikTok', 'tiktok.com' ) );
        }

        {
            const miraviaContainer = LX.makeContainer( [ null, 'auto' ], 'flex flex-col relative bg-card p-1 pt-0 rounded-lg overflow-hidden' );
            tabs.add( 'Miravia', miraviaContainer, { xselected: true, onSelect: ( event, name ) => {} } );
            miraviaContainer.appendChild( this.createMiraviaDocs() );
        }

        {
            const decathlonContainer = LX.makeContainer( [ null, 'auto' ], 'flex flex-col relative bg-card p-1 pt-0 rounded-lg overflow-hidden' );
            tabs.add( 'Decathlon', decathlonContainer, { xselected: true, onSelect: ( event, name ) => {} } );
            decathlonContainer.appendChild( this.createDecathlonDocs() );
        }

        // {
        //     const transportCalcContainer = LX.makeContainer( [ null, 'auto' ], 'flex flex-col relative bg-card p-1 pt-0 rounded-lg overflow-hidden' );
        //     tabs.add( 'Calc. Transporte', transportCalcContainer, { xselected: true, onSelect: ( event, name ) => {} } );
        //     transportCalcContainer.appendChild( this.createTransportCalcDocs() );
        // }

        this.clear();
    }

    createIntroDocs()
    {
        const area = new LX.Area( { className: 'help-content rounded-lg bg-card p-8' } );

        const docMaker = new DocMaker();
        docMaker.setDomTarget( area.root );

        docMaker.header( 'Objetivo del manual.', 'h1' );
        {
            docMaker.paragraph( `Este manual tiene como objetivo permitir que cualquier persona de la empresa pueda ejecutar correctamente los procesos diarios asociados a la gestión de pedidos de todas las plataformas de venta, utilizando las aplicaciones internas desarrolladas, sin necesidad de conocimientos técnicos ni apoyo del equipo de desarrollo.` );
            docMaker.lineBreak();
            docMaker.paragraph( `El manual está orientado al <b>uso operativo</b>, por lo que no incluye explicaciones técnicas ni reglas internas de automatización.` );
        }

        docMaker.header( 'Objetivos comunes de las plataformas.', 'h1' );
        {
            docMaker.paragraph( `Independientemente de la plataforma de venta, <b>todas deben cumplir los mismos cinco objetivos operativos</b>. El proceso concreto puede variar entre plataformas, pero el resultado final siempre debe ser el mismo.` );
            
            docMaker.header( '1. Extracción y registro de pedidos.', 'h2', area.root, { className: collapsibleClass, collapsable: true, collapsed: true, collapsableContentCallback: () => {
                docMaker.paragraph( `Extraer la información de los pedidos recibidos en cada plataforma y registrarla correctamente en el Excel interno de Control de Stock, que actúa como referencia operativa diaria del almacén.` );
            } } );

            docMaker.header( '2. Elaboración de etiquetas de transporte (SEUR).', 'h2', area.root, { className: collapsibleClass, collapsable: true, collapsed: true, collapsableContentCallback: () => {
                docMaker.paragraph( `Generar las etiquetas de envío necesarias para todos los pedidos del día, en el formato requerido por SEUR, a partir de la información facilitada por cada plataforma.` );
            } } );

            docMaker.header( '3. Incorporación de la información de seguimiento.', 'h2', area.root, { className: collapsibleClass, collapsable: true, collapsed: true, collapsableContentCallback: () => {
                docMaker.paragraph( `Asignar e incorporar en cada plataforma el número y enlace de seguimiento del envío por cada etiqueta generada previamente, de manera que el cliente pueda consultar el estado de su pedido.` );
            } } );

            docMaker.header( '4. Extracción de datos tributarios.', 'h2', area.root, { className: collapsibleClass, collapsable: true, collapsed: true, collapsableContentCallback: () => {
                docMaker.paragraph( `Extraer y organizar los datos necesarios a nivel fiscal (artículos, bases imponibles, IVA e importes totales) con fines de control y posibles inspecciones. El Excel generado se enviará al contable.` );
            } } );

            docMaker.header( '5. Elaboración de albaranes y documentación de facturación.', 'h2', area.root, { className: collapsibleClass, collapsable: true, collapsed: true, collapsableContentCallback: () => {
                docMaker.paragraph( `Generar los dos archivos necesarios (ALB y LAL) para la facturación y contabilidad diaria mediante Factusol y Contasol, asegurando la coherencia entre pedidos, stock y fiscalidad:` );
                docMaker.bulletList( [
                    `<span class='font-bold'>ALB</span>: Se requieren los <b>importes totales</b> (bases imponibles, IVAs y totales) de todos los pedidos agregados`,
                    `<span class='font-bold'>LAL</span>: Se debe detallar para cada artículo <b>unidades totales y bases imponibles totales</b>.`
                ] );
            } } );
        }

        docMaker.header( 'Principios generales de uso.', 'h1' );
        {
            docMaker.bulletList( [
                `Todos los procesos deben realizarse <b>siguiendo el orden indicado</b>`,
                `Los archivos generados por la aplicación <b>no deben modificarse manualmente</b>`,
                `Ante cualquier error, se debe seguir el protocolo de incidencias`
            ] );
        }

        docMaker.header( 'Protocolo de incidencias.', 'h1' );
        {
            docMaker.paragraph( `...` );
        }

        return area.root;
    }

    createWebDocs()
    {
        const area = new LX.Area( { className: 'help-content rounded-lg bg-card p-8' } );

        const docMaker = new DocMaker();
        docMaker.setDomTarget( area.root );

        docMaker.header( 'Seguimiento y facturas.', 'h1' );
        {
            docMaker.paragraph( `La aplicación permite gestionar el seguimiento de envíos y la facturación de los pedidos correspondientes a la sección WEB de la empresa, utilizando como base los pedidos del marketplace WooCommerce (WC). La aplicación se conecta a la API oficial de WooCommerce, desde donde:` );
            docMaker.bulletList( [
                `<span class='font-bold'>Lee pedidos existentes</span>`,
                `<span class='font-bold'>Modifica datos del pedido (estado, seguimiento y facturación)</span>`
            ] );

            docMaker.header( 'Requisitos de acceso.', 'h2', area.root, { className: collapsibleClass, collapsable: true, collapsed: true, collapsableContentCallback: () => {
                docMaker.paragraph( `Para utilizar la aplicación es necesario disponer de <b>Clave de cliente</b> y <b>Clave secreta</b> de cada compañía. Estas credenciales permiten establecer la conexión con la API oficial de WooCommerce.` );
                docMaker.image( 'data/docs/wc_login.png', 'wc_login', null, 'my-4 w-full md:w-2/3 lg:w-1/3 place-self-center' );
                docMaker.paragraph( `Por seguridad, <b>no guardes las claves en el navegador</b> (para el autocompletado). La aplicación usa un sistema de <b>almacenamiento local</b> para recordarte las claves si vuelves a hacer login. ` );
            } } );

            docMaker.header( 'Carga del listado de envíos (CBL).', 'h2', area.root, { className: collapsibleClass, collapsable: true, collapsed: true, collapsableContentCallback: () => {
                docMaker.paragraph( `En la parte superior de la aplicación se encuentra el área de carga de archivos, donde se puede arrastrar el archivo XLSX generado desde CBL (o hacer click para buscarlo) para cargar el listado de envíos. Al realizar la carga, la aplicación leerá el listado de envíos y relacionará cada una de las filas con los pedidos existentes en WooCommerce, <b>sincronizando únicamente aquellos pedidos cuyo número de pedido esté incluido en el campo de referencia</b>.` );
                docMaker.paragraph( `Si un pedido no dispone de número de referencia, <b>no podrá ser leído ni sincronizado por la aplicación</b>. En listados con más de 100 pedidos, el proceso puede comenzar a funcionar de forma más lenta, lo cual es un comportamiento normal del sistema.` );
            } } );
            
            docMaker.header( 'Selección por empresa.', 'h2', area.root, { className: collapsibleClass, collapsable: true, collapsed: true, collapsableContentCallback: () => {
                docMaker.paragraph( `En la parte superior de la aplicación justo después del encabezado se encuentra el selector de compañía, dividido en pestañas (Jowy, HxG, Bathby, y Otros), donde cada una de ellas muestra los pedidos correspondientes a su plataforma.
                    En la pestaña <b>Otros</b> no se realiza ninguna relación ni sincronización; los pedidos se muestran únicamente en forma de lista informativa, como por ejemplo los pedidos de Amazon.` );
                docMaker.image( 'data/docs/company_tabs.png', 'company_tabs', null, 'my-4 w-[90%] md:w-[400px] place-self-center' );
                docMaker.paragraph( `Al hacer click en una de las pestañas, la aplicación automáticamente carga los pedidos de dicha compañía e inicia la sincronización con el listado de CBL. <b>Recuerda que en ese instante es cuando se requerirán las claves de acceso</b>.` );
            } } );
            
            docMaker.header( 'Acciones principales.', 'h2', area.root, { className: collapsibleClass, collapsable: true, collapsed: true, collapsableContentCallback: () => {
                docMaker.paragraph( `A la derecha de las pestañas de cada compañia se encuentran las acciones principales representadas mediante iconos:` );

                docMaker.header( LX.makeIcon( 'Eye', { svgClass: 'border-color rounded-lg p-2 mr-2 w-10! h-10! inline-flex!' } ).innerHTML + 'Ver mensajes.', 'h3' );
                docMaker.paragraph( `Permite visualizar los pedidos de forma individual. En esta vista se muestra la información completa del pedido junto con el formulario de facturación de WooCommerce. En dicho formulario es posible editar <b>únicamente el número de factura y la fecha de factura<b>.
                    Si ya existe facturación para ese pedido, se mostrarán la información de factura:` );
                docMaker.image( 'data/docs/invoice_example.png', 'invoice_example', null, 'my-4 w-full lg:w-2/3 p-2 border-color rounded-xl place-self-center' );
                docMaker.lineBreak();

                docMaker.paragraph( `Justo debajo del formulario aparece el mensaje de seguimiento que se enviará como nota al cliente en WooCommerce, el cual puede copiarse manualmente en caso de que sea necesario. En la parte inferior de la pantalla se incluyen los controles que permiten desplazarse entre los distintos pedidos.` );

                docMaker.header( LX.makeIcon( 'Trash2', { svgClass: 'border-color rounded-lg p-2 mr-2 w-10! h-10! inline-flex!' } ).innerHTML + 'Limpiar datos anteriores.', 'h3' );
                docMaker.paragraph( `Elimina completamente los datos cargados en la aplicación y limpia la tabla, permitiendo cargar un nuevo listado XLSX e iniciar un nuevo proceso desde cero.` );

                docMaker.header( LX.makeIcon( 'Plus', { svgClass: 'border-color rounded-lg p-2 mr-2 w-10! h-10! inline-flex!' } ).innerHTML + 'Nuevo pedido.', 'h3' );
                docMaker.paragraph( `Abre una ventana de edición manual para un pedido individual sin necesidad de cargar un listado de CBL, con las siguientes operaciones disponibles:` );
                docMaker.bulletList(
                    [
                        `<span class='font-bold'>Enviar nota de seguimiento al cliente</span>`,
                        `<span class='font-bold'>Facturar pedido</span>`,
                        `<span class='font-bold'>Cambiar estado del pedido</span>`,
                    ]
                );
                docMaker.paragraph( `Este modo resulta especialmente útil para el envío manual de seguimientos de SEUR, para la gestión de pedidos que no han entrado correctamente en el flujo automático de la aplicación o para aquellos pedidos que se encuentran pendientes o en situaciones excepcionales. En el lado derecho de la ventana se muestra también el mensaje de seguimiento, el cual está disponible para copiar manualmente en caso de que sea necesario.` );

                docMaker.header( LX.makeIcon( 'EllipsisVertical', { svgClass: 'border-color rounded-lg p-2 mr-2 w-10! h-10! inline-flex!' } ).innerHTML + 'Más opciones.', 'h3' );
                docMaker.paragraph( `Abre un menú desplegable con las siguientes acciones:` );
                docMaker.bulletList(
                    [
                        `<span class='font-bold'>Abrir pedidos</span>: Abre los pedidos seleccionados directamente en el cliente web de WooCommerce.`,
                        `<span class='font-bold'>Marcar seleccionados</span>: Despliega un submenú con distintos estados de pedido. Al seleccionar uno, se modifica el estado de <b>todos los pedidos seleccionados</b>.`,
                        `<span class='font-bold'>Actualizar pedidos</span>: Recarga los pedidos directamente desde WooCommerce.`,
                    ]
                );
            } } );

            docMaker.header( 'Tabla de pedidos.', 'h2', area.root, { className: collapsibleClass, collapsable: true, collapsed: true, collapsableContentCallback: () => {
                docMaker.paragraph( `El área central de la aplicación contiene una tabla donde cada fila representa un pedido, donde se pueden ocultar o mostrar columnas, y la cual puede filtrar por:` );
                docMaker.bulletList(
                    [
                        `<span class='font-bold'>Nombre del cliente</span>`,
                        `<span class='font-bold'>Estado del pedido</span>`,
                        `<span class='font-bold'>Situación (estado de CBL)</span>`,
                        `<span class='font-bold'>Fecha de documentación</span>`,
                    ]
                );
                docMaker.paragraph( `Para cada fila de pedido, se pueden realizar diferentes acciones dependiendo de la situación del pedido (WooCommerce+CBL), como <b>cambiar de estado</b>.` );
            } } );
        }

        docMaker.header( 'Pedidos.', 'h1' );
        {
            docMaker.paragraph( `La subaplicación Pedidos está orientada a la extracción directa de pedidos desde la API oficial de WooCommerce, y su función principal es facilitar el <b>registro de estos pedidos en el Excel interno de Control de Stock</b>, que actúa como referencia operativa diaria del almacén.` );
            docMaker.lineBreak();
            docMaker.paragraph( `Al igual que la aplicación <b>Seguimiento y facturas</b>, esta aplicación se conecta a WooCommerce utilizando las credenciales de acceso correspondientes, por lo que requiere la <b>Clave de cliente</b> y la <b>Clave secreta</b> de cada compañía para su funcionamiento.` );
        }

        return area.root;
    }

    createSheinDocs( appName, appMarketplaceUrl )
    {
        const area = new LX.Area( { className: 'help-content rounded-lg bg-card p-8' } );

        const docMaker = new DocMaker();
        docMaker.setDomTarget( area.root );

        docMaker.header( `${ appName }.`, 'h1' );
        {
            docMaker.paragraph( `La aplicación de ${ appName } agrupa todos los procesos operativos necesarios para la gestión diaria y semanal de pedidos,
                incluyendo el control de stock, la generación de etiquetas de transporte SEUR, la incorporación de información de seguimiento y la creación de la
                documentación fiscal (IVA) y de albaranes, los cuales serán posteriormente traspasados a Factusol.
                <b>Todos los procesos se realizan a partir de archivos Excel generados por plataformas externas y por las propias aplicaciones internas</b>.` );
            docMaker.lineBreak();
            docMaker.paragraph( `Para completar todos los procesos, necesitarás acceso al Marketplace de ${appName}
                (<a class='bg-red-600 text-primary underline underline-offset-4' href=''>${appMarketplaceUrl}</a>)
                y al cliente web de SEUR (<a class='bg-red-600 text-primary underline underline-offset-4' href=''>seur.com</a>).` );

            docMaker.header( 'Carga del listado de envíos.', 'h2', area.root, { className: collapsibleClass, collapsable: true, collapsed: true, collapsableContentCallback: () => {
                
                docMaker.paragraph( `El primer paso es obtener un archivo <span class='font-code'>.xlsx</span> con la información de los pedidos.
                    Para ello, accede al marketplace, usando el enlace <a class='bg-red-600 text-primary underline underline-offset-4' href=''>${appMarketplaceUrl}</a>.
                    <span class='bg-red-600'>Una vez dentro, ...</span>` );

                docMaker.paragraph( `Obtenido el listado de pedidos, dirígete a la parte superior de la aplicación donde se encuentra el área de carga de archivos, y de nuevo
                    arrastra allí el archivo exportado. Estos datos actuarán como base para los siguientes procesos dentro de la aplicación.` );
            } } );

            docMaker.header( 'Ver datos importados.', 'h2', area.root, { className: collapsibleClass, collapsable: true, collapsed: true, collapsableContentCallback: () => {
                docMaker.paragraph( `En la parte superior de la aplicación justo después del encabezado se encuentra el selector de datos, dividido en pestañas, donde se puede
                    ver la información importada y los pasos intermedios del proceso. Revisa estos datos siempre que puedas para comprobar que no haya ningún error.` );
                docMaker.image( 'data/docs/company_tabs.png', 'company_tabs', null, 'my-4 w-[90%] md:w-[400px] place-self-center' );
                docMaker.paragraph( `<span class='bg-red-600'>....</span>` );
            } } );

            docMaker.header( 'Listado stock.', 'h2', area.root, { className: collapsibleClass, collapsable: true, collapsed: true, collapsableContentCallback: () => {
                docMaker.paragraph( `Pulsando <b>Listado stock</b> en el selector de datos, tendrás acceso a una tabla con la información preparada para ser transferida
                    al excel interno de <b>control de stock</b>. Actualiza ese archivo siguiendo estos pasos:` );
                docMaker.bulletList(
                    [
                        `<span class='bg-red-600'>En Google Drive, abre el archivo <span class='font-code'>CONTROL STOCK [AÑO].xls</span>, ubicado en la ruta <span class='font-code'>RUTA/1/2/3</span>`,
                        `<span class='bg-red-600'>Copia cada una de las columnas de la tabla, y pégalas en su correspodiente columna del excel de stock, en la pestaña <span class='font-code'>PESTAÑA</span></span>`,
                        `<span class='bg-red-600'>...</span>`,
                    ]
                );
            } } );

            docMaker.header( 'Etiquetas y seguimiento.', 'h2', area.root, { className: collapsibleClass, collapsable: true, collapsed: true, collapsableContentCallback: () => {
                docMaker.paragraph( `En la parte superior de la aplicación, justo después del encabezado, se encuentran las acciones principales relacionadas con las etiquetas de SEUR, representadas mediante iconos:` );

                docMaker.header( LX.makeIcon( 'Trash2', { svgClass: 'border-color rounded-lg p-2 mr-2 w-10! h-10! inline-flex!' } ).innerHTML + 'Limpiar datos anteriores.', 'h3' );
                docMaker.paragraph( `Elimina completamente los datos cargados en la aplicación y limpia la tabla, permitiendo cargar un nuevo listado <span class='font-code'>.xlsx</span> e iniciar un nuevo proceso desde cero.` );

                docMaker.header( LX.makeIcon( 'Download', { svgClass: 'border-color rounded-lg p-2 mr-2 w-10! h-10! inline-flex!' } ).innerHTML + 'Exportar Etiquetas.', 'h3' );
                docMaker.paragraph( `A partir del excel de pedidos importado, descarga el fichero <span class='font-code'>ETIQUETAS_SEUR_${appName}_[FECHA].xlsx</span>, que tendrá los datos necesarios para generar etiquetas en la web de SEUR.
                    Una vez exportado, accede a <a class='bg-red-600 text-primary underline underline-offset-4' href=''>seur.com</a> y sigue estos pasos para poder generarlas:` );
                docMaker.bulletList(
                    [
                        `<span class='bg-red-600'>Abrir....</span>`,
                        `<span class='bg-red-600'>Hacer click en....</span>`,
                    ]
                );

                docMaker.header( LX.makeIcon( 'FileDown', { svgClass: 'border-color rounded-lg p-2 mr-2 w-10! h-10! inline-flex!' } ).innerHTML + 'Exportar Seguimiento.', 'h3' );
                
                docMaker.paragraph( `Para exportar los números de siguimiento de SEUR para asignar a los pedidos de ${appName}, necesitarás haber generado previamente las etiquetas y descargar de la web de SEUR un documento <span class='font-code'>.xlsx</span>
                    con la información de las mismas, el cual contendrá el número de seguimiento de cada pedido. Para exportar dicho documento, <span class='bg-red-600'>abre....</span>` );
                docMaker.lineBreak();
                docMaker.paragraph( `Una vez dispongas de la lista de números de seguimiento, haz click en <b>Seguimiento</b> en el selector de datos y arrastra la lista exportada en el contenedor que aparecerá justo debajo
                    para ver la información sincronizada con el listado de pedidos importado en el primer paso. Si todo está correcto, descarga el fichero <span class='font-code'>NUMERODEGUIA_SEUR_${appName}_[FECHA].xlsx</span> con los datos necesarios para asignar números de seguimiento a cada pedido dentro de ${appName}.
                    Para hacerlo, usa el enlace <a class='bg-red-600 text-primary underline underline-offset-4' href=''>${appMarketplaceUrl}</a> de nuevo y sigue estos pasos:` );
                
                docMaker.bulletList(
                    [
                        `<span class='bg-red-600'>Abrir....</span>`,
                        `<span class='bg-red-600'>Hacer click en....</span>`,
                    ]
                );
            } } );

            docMaker.header( 'IVA/Albaranes.', 'h2', area.root, { className: collapsibleClass, collapsable: true, collapsed: true, collapsableContentCallback: () => {
                docMaker.paragraph( `La pestaña de IVA y albaranes concentra toda la información fiscal asociada a los pedidos.
                    En esta vista se muestran los datos de <b>IVA</b>, el listado <b>LAL</b> con el detalle agregado de artículos y el listado <b>ALB</b> con la información por albarán.
                    En esta sección es posible descargar el <b>documento de IVA generado<b> y un <b>archivo ZIP que contiene todos los albaranes organizados por país</b>.
                    Para generar correctamente esta información, es necesario arrastrar uno o varios archivos <span class='font-code'>.xlsx</span> de pedidos en la zona de carga habilitada dentro de esta pestaña,
                    permitiendo combinar información diaria, semanal o mensual según sea necesario.` );
                docMaker.lineBreak();
                docMaker.paragraph( `<span class='bg-red-600'>...</span>` );
            } } );
        }

        return area.root;
    }

    createMiraviaDocs()
    {
        const area = new LX.Area( { className: 'help-content rounded-lg bg-card p-8' } );

        const docMaker = new DocMaker();
        docMaker.setDomTarget( area.root );

        docMaker.header( LX.makeIcon( 'Construction', { svgClass: 'mr-4 2xl inline-flex!' } ).innerHTML + 'Miravia.', 'h1' );

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

    createTransportCalcDocs()
    {
        const area = new LX.Area( { className: 'help-content rounded-lg bg-card p-8' } );

        const docMaker = new DocMaker();
        docMaker.setDomTarget( area.root );

        docMaker.header( LX.makeIcon( 'Construction', { svgClass: 'mr-4 2xl inline-flex!' } ).innerHTML + 'Calculadora de transporte.', 'h1' );

        return area.root;
    }
}

export { ManualApp };
