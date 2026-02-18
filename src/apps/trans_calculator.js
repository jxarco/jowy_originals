import { LX } from 'lexgui';
import { NumberFormatter } from '../constants.js';
import { Data } from '../data.js';
import { BaseApp } from './base_app.js';

const TRANSPORT_NAMES = [ 'CBL', 'SEUR', 'SALVAT' ];

let lastTotalPrice = [];
// let lastTotalPackages = 0;

class TransportCalculatorApp extends BaseApp
{
    // _sku = "Vacío";
    _sku = 'HG-AD12';
    get sku()
    {
        return this._sku;
    }
    set sku( v )
    {
        this._sku = v;
        this.updateTransports();
    }

    _quantity = '1';
    get quantity()
    {
        return this._quantity;
    }
    set quantity( v )
    {
        this._quantity = v;
        this.updateTransports();
    }

    _cp = '08150';
    get cp()
    {
        return this._cp;
    }
    set cp( v )
    {
        this._cp = v;
        this.updateTransports();
    }

    _country = 'España';
    get country()
    {
        return this._country;
    }
    set country( v )
    {
        this._country = v;
        this.updateTransports();
    }

    constructor( core, tool )
    {
        super( core, tool );

        this.title = 'Calculadora: <i>Transporte</i>';
        this.subtitle = '';
        this.icon = 'Calculator';

        // Create utility buttons
        const utilButtonsPanel = new LX.Panel( { height: 'auto', className: 'bg-none bg-card border-bottom p-2 flex flex-row gap-2' } );
        utilButtonsPanel.sameLine();
        utilButtonsPanel.addButton( null, 'AddCalc', this.openNewCalcDialog.bind( this ), { className: 'flex flex-auto-keep', icon: 'Plus', title: 'Cálculo personalizado', tooltip: true } );
        utilButtonsPanel.addSelect( 'Ref', Object.keys( Data.sku ), this.sku, ( v ) => {
            this.sku = v;
        }, { className: 'flex flex-auto-fill', filter: true, overflowContainer: null, skipReset: true, emptyMsg: 'No hay resultados.' } );
        utilButtonsPanel.addText( 'Unidades', this.quantity, ( v ) => {
            this.quantity = v;
        }, { trigger: 'input', className: 'flex flex-auto-fill', nameWidth: '50%', placeholder: '0', skipReset: true } );
        utilButtonsPanel.addText( 'CP', this.cp, ( v ) => {
            this.cp = v;
        }, { trigger: 'input', className: 'flex flex-auto-fill', placeholder: '00000', skipReset: true } );
        utilButtonsPanel.addSelect( 'País', 'España Francia Portugal'.split( ' ' ), this.country, ( v ) => {
            this.country = v;
        }, { className: 'flex flex-auto-fill', overflowContainer: null, skipReset: true } );
        utilButtonsPanel.endLine( 'w-full' );
        this.area.attach( utilButtonsPanel.root );

        // const tabs = this.area.addTabs({ parentClass: "p-4", sizes: ["auto", "auto"], contentClass: "p-2 pt-0" });

        // // CBL
        // {
        //     const tabContainer = LX.makeContainer([null, "auto"], "flex flex-col relative bg-card p-1 pt-0 rounded-lg overflow-hidden");
        //     tabs.add("CBL", tabContainer, { selected: true, onSelect: (event, name) => this.transportComp = name });

        //     const tabArea = new LX.Area({ className: "rounded-lg" });
        //     tabContainer.appendChild(tabArea.root);
        // }

        // // SEUR
        // {
        //     const tabContainer = LX.makeContainer([null, "auto"], "flex flex-col relative bg-card p-1 pt-0 rounded-lg overflow-hidden");
        //     tabs.add("SEUR", tabContainer, { xselected: true, onSelect: (event, name) => this.transportComp = name });

        //     const tabArea = new LX.Area({ className: "rounded-lg" });
        //     tabContainer.appendChild(tabArea.root);
        // }

        // // center tabs
        // tabs.root.parentElement.classList.add("flex", "justify-center");

        this.resultArea = new LX.Area( { skipAppend: true, className: 'flex justify-center p-4 gap-2 overflow-scroll' } );
        this.area.attach( this.resultArea );
        const [ left, right ] = this.resultArea.split( { type: 'horizontal', sizes: [ '50%', '50%' ], resize: false } );
        left.root.classList.add( 'flex', 'flex-col', 'gap-2' );
        right.root.classList.add( 'flex', 'flex-col', 'gap-2' );

        this.leftArea = left;
        this.rightArea = right;

        this.updateTransports();
    }

    execute( transportName, customWidth, customHeight, customDepth, customWeight )
    {
        if ( this.sku == 'Vacío' || !this.quantity.length || !this.cp.length || !Data.ready )
        {
            return;
        }

        let fullHeight,
            fullDepth,
            fullWeight,
            totalVolume,
            totalVolumeKgs,
            volFactor,
            useVolFactor = true,
            zoneNumber,
            city,
            price,
            finalPrice;

        const q = parseInt( this.quantity );
        if ( Number.isNaN( q ) )
        {
            return;
        }

        // 1. Determinar número de bultos
        // - 2 cm: 10 piezas por saca (11 solo en caso de que sean solo 11, sino dividir).
        // - 2,5 y 3 cm: 5 piezas por saca (hasta 6 solo en caso de que sean solo 6, sino dividir).
        // - 4 cm: 5 piezas por saca

        // Se utiliza pallet cuando el envío supera los siguientes rangos:
        // - 2 cm: desde 51 hasta un máximo de 92 (por pallet) -> 93 sería nuevo pallet
        // - 2,5 cm / 3 cm: entre 26, hasta un máximo de 77.
        // - 4 cm: 30 piezas, hasta un máximo de 45.

        const product = Data['sku'][this.sku];
        const width = customWidth ?? product['ANCHO'];
        const height = customHeight ?? product['GROSOR'];
        const depth = customDepth ?? product['LARGO'];
        const weight = customWeight ?? product['PESO'];
        const packagingOptions = width === 1.06 && depth === 1.06 ? this.getPackaging( height, q ) : [
            { type: 'Saca', count: 1, unitsPerPackage: [ q ] }
        ];

        // Ciudad
        const cz = this.getCityZoneByPrefix( this.cp, this.country, Data.zoneRules[this.country], transportName ) ?? {};
        if ( !cz.city ) return;
        city = cz.city;
        zoneNumber = cz.zone ?? [];
        const balears = this.cp.startsWith( '07' );
        volFactor = this.country === 'Francia' ? 300 : ( balears || this.country === 'Portugal' ? 333 : 220 );
        if ( transportName === 'SEUR' ) volFactor = 200;
        const shippingOptions = [];

        for ( let packaging of packagingOptions )
        {
            price = 0;

            // - Altura: grosor (en m) × nº de piezas.
            fullHeight = q * height;
            fullWeight = q * weight;
            fullDepth = q * depth;

            // - Si va en pallet: sumar 0,15 m por cada pallet.
            if ( packaging.type == 'Pallet' )
            {
                fullHeight += 0.15 * packaging.count;
            }

            totalVolume = fullHeight * width * depth;

            // 3. Obtener los kg volumétricos
            // - 220 → Península
            // - 333 → Baleares y Portugal
            // - 300 → Francia (OTRA TARIFA: SALVAT -> DELEGACIÓN CBL)
            totalVolumeKgs = totalVolume * volFactor;

            // Coger el max entre totalVolumeKgs o Kgs
            if ( fullWeight >= totalVolumeKgs )
            {
                useVolFactor = false;
                totalVolumeKgs = fullWeight;
            }

            const bracket = this.getVolumeBracket( totalVolumeKgs, transportName ) ?? 'max';
            zoneNumber.forEach( ( v ) => {
                const zp = Data.pricesByZone[transportName][v] ?? {};
                price += zp[bracket] ?? 0;
            } );

            // Desde 300, precio en eu/kg
            if ( transportName === 'CBL' )
            {
                if ( totalVolumeKgs > 300 )
                {
                    price *= totalVolumeKgs;
                }
            }
            else if ( transportName === 'SEUR' )
            {
                if ( totalVolumeKgs > 30 )
                {
                    const diffKgs = totalVolumeKgs - 30;
                    const zN = zoneNumber[0];
                    if ( zN !== undefined )
                    {
                        price = Data.pricesByZone[transportName][zN]['30']
                            + diffKgs * Data.pricesByZone[transportName][zN]['max'];
                    }
                    else
                    {
                        price = 0;
                    }
                }
            }
            else
            {
                // SALVAT DOES NOTHING SPECIAL FOR NOW
            }

            // - Aplicar recargo por combustible
            const gasPrice = ( this.country === 'Francia' ) ? 1.065 : 1.09;
            finalPrice = price * gasPrice;

            shippingOptions.push( {
                packaging,
                height: fullHeight,
                width,
                depth,
                weight: fullWeight,
                totalVolume,
                totalVolumeKgs,
                volFactor,
                useVolFactor,
                zoneNumber,
                city,
                price,
                gasPrice,
                finalPrice
            } );
        }

        return shippingOptions;
    }

    updateTransports( customWidth, customHeight, customDepth, customWeight, pArea, sArea )
    {
        this.update( ( this.country === 'Francia' ) ? 'SALVAT' : 'CBL', customWidth, customHeight, customDepth, customWeight, pArea );
        this.update( 'SEUR', customWidth, customHeight, customDepth, customWeight, sArea ?? pArea );
    }

    update( transportName = 'CBL', customWidth, customHeight, customDepth, customWeight, area )
    {
        const transportIdx = TRANSPORT_NAMES.indexOf( transportName ) % 2;
        area = area ?? this.resultArea.sections[transportIdx];
        area.root.innerHTML = '';

        const r = this.execute( transportName, customWidth, customHeight, customDepth, customWeight );
        if ( !r ) return;

        for ( let i = 0; i < r.length; ++i )
        {
            const shippingOption = r[i];
            const {
                packaging,
                height,
                width,
                depth,
                weight,
                totalVolume,
                totalVolumeKgs,
                volFactor,
                useVolFactor,
                zoneNumber,
                city,
                price,
                gasPrice,
                finalPrice
            } = shippingOption;

            const roundedTotalPrice = LX.round( finalPrice, 3 );
            const totalPriceDiff = LX.round( roundedTotalPrice - lastTotalPrice[i], 3 );
            // const totalPackagesDiff = packaging.count - lastTotalPackages;
            const finalFormatted = NumberFormatter.format( finalPrice );

            const packagingModeContainer = LX.makeContainer( [ '100%', 'auto' ], 'flex flex-col p-1 rounded-xl bg-card', ``, area );

            LX.makeContainer( [ '100%', 'auto' ], 'px-4 py-4 flex flex-row gap-2 font-light text-2xl text-secondary-foreground items-center align-center', `
                ${
                LX.makeIcon( packaging.type == 'Pallet' ? 'Package2' : 'Handbag', {
                    svgClass: `xl ${transportName == 'CBL' ? 'text-destructive' : 'text-info'}`
                } ).innerHTML
            }
                <span>
                    <span class="text-muted-foreground">Resumen</span> <span class="font-semibold text-foreground">${transportName}: ${finalFormatted}</span>
                    ${
                transportName == 'SEUR'
                    ? `<span class="text-xl ${totalPriceDiff > 0 ? 'text-destructive' : 'text-lime-600 dark:text-lime-500'}">(${totalPriceDiff > 0 ? '+' : ''}${
                        NumberFormatter.format( totalPriceDiff )
                    })</span>
                    `
                    : ''
            }
                </span>
                `, packagingModeContainer );

            {
                const resultsContainer = LX.makeContainer( [ '100%', '100%' ], 'flex flex-col gap-4 p-4', ``, packagingModeContainer );
                LX.makeContainer( [ '100%', 'auto' ], 'flex flex-row gap-8', `
                <div class="flex flex-row gap-2"><span class="flex text-secondary-foreground text-lg font-light items-center">Alto</span><span class="font-semibold">${
                    LX.round( height, 3 )
                }m</span></div>
                <div class="flex flex-row gap-2"><span class="flex text-secondary-foreground text-lg font-light items-center">Ancho</span><span class="font-semibold">${width}m</span></div>
                <div class="flex flex-row gap-2"><span class="flex text-secondary-foreground text-lg font-light items-center">Largo</span><span class="font-semibold">${depth}m</span></div>
            `, resultsContainer );
                LX.makeContainer( [ '100%', 'auto' ], 'flex flex-row gap-8', `
                <div class="flex flex-row gap-2"><span class="flex text-secondary-foreground text-lg font-light items-center">Volumen</span><span class="font-semibold">${
                    LX.round( totalVolume, 5 )
                }m<sup class="text-sm">3</sup></span></div>
                <div class="flex flex-row gap-2"><span class="flex text-secondary-foreground text-lg font-light items-center">Peso</span><span class="font-semibold">${weight}kg</span></div>
            `, resultsContainer );

                const bultos = LX.makeContainer( [ '100%', 'auto' ], 'flex flex-row gap-8 p-2 px-3 bg-muted rounded-lg cursor-pointer', `
                <div class="flex flex-row gap-2"><span class="flex text-secondary-foreground text-lg font-light items-center">Bultos</span><span class="font-semibold">${packaging.count}</span><span class="text-xl">(${packaging.type}s)</span></div>
            `, resultsContainer );
                const collapsed = true; // (packaging.count > 5) && (r.length == 1);
                bultos.addEventListener( 'click', function()
                {
                    this.querySelector( '.collapser' ).click();
                } );
                const packagesContainer = LX.makeContainer( [ '100%', '100%' ], 'flex flex-col gap-2 py-3 pl-8 bg-muted rounded-b-lg', ``, resultsContainer, {
                    display: collapsed ? 'none' : '',
                    marginTop: '-1.25rem'
                } );

                for ( var j = 0; j < packaging.count; ++j )
                {
                    const quantityPerPackage = packaging.unitsPerPackage[j];
                    LX.makeContainer( [ '100%', 'auto' ], 'flex flex-row gap-8', `
                        <div class="flex flex-row gap-2"><span class="flex text-secondary-foreground text-lg font-light items-center">Bulto</span><span class="font-semibold">${j + 1}</span></div>
                        <div class="flex flex-row gap-2"><span class="flex text-secondary-foreground text-lg font-light items-center">Cantidad</span><span class="font-semibold">${quantityPerPackage}</span></div>
                    `, packagesContainer );
                }

                LX.makeCollapsible( bultos, packagesContainer, resultsContainer, { collapsed, display: 'flex' } );

                if ( useVolFactor )
                {
                    LX.makeContainer( [ '100%', 'auto' ], 'flex flex-row gap-8', `
                    <div class="flex flex-row gap-2"><span class="flex text-secondary-foreground text-lg font-light items-center">Factor Conversión</span><span class="font-semibold">${volFactor}</span></div>
            `, resultsContainer );
                }

                LX.makeContainer( [ '100%', 'auto' ], 'flex flex-row gap-8', `
                <div class="flex flex-row gap-2"><span class="flex text-secondary-foreground text-lg font-light items-center">Kgs Volumétricos</span><span class="font-semibold">${
                    LX.round( totalVolumeKgs, 5 )
                }kg/m<sup class="text-sm">3</span></div>
            `, resultsContainer );

                //     LX.makeContainer(["100%", "auto"], "flex flex-row gap-8", `
                //         <div class="flex flex-row gap-2"><span class="flex text-secondary-foreground text-lg font-light items-center">Recargo Combustible</span><span class="font-semibold">${gasPrice}</span></div>
                // `, resultsContainer);

                LX.makeContainer( [ '100%', '1px' ], 'border-color', '', packagingModeContainer );
            }

            {
                const resultsContainer = LX.makeContainer( [ '100%', '100%' ], 'flex flex-col gap-4 p-4 items-center', ``, packagingModeContainer );
                LX.makeContainer( [ '100%', 'auto' ], 'flex flex-row gap-8', `
                <div class="flex flex-row gap-2"><span class="flex text-secondary-foreground text-lg font-light items-center">Zona</span><span class="font-semibold">${zoneNumber}</span></div>
                <div class="flex flex-row gap-2"><span class="flex text-secondary-foreground text-lg font-light items-center">Ciudad/Provincia</span><span class="font-semibold">${city}</span></div>
            `, resultsContainer );

                const priceContainer = LX.makeContainer( [ '100%', 'auto' ], 'flex flex-row gap-8 items-center', `
                <div class="flex flex-row gap-2"><span class="flex text-secondary-foreground text-lg font-light items-center">Coste</span><span class="font-semibold text-secondary-foreground">${
                    NumberFormatter.format( price )
                }</span></div>
                <div class="flex flex-row gap-2"><span class="flex text-secondary-foreground text-lg font-light items-center">Total Combustible (${gasPrice})</span><span class="font-semibold text-2xl">${finalFormatted}</span></div>
            `, resultsContainer );

                const copyButtonWidget = new LX.Button( null, 'CopyButton', async function()
                {
                    const textToCopy = finalFormatted.replace( '€', '' ).trim();
                    navigator.clipboard.writeText( textToCopy ).then( () => {
                        LX.toast( 'Hecho!', `✅ ${textToCopy} Copiado al portapapeles.`, { timeout: 5000, position: 'top-center' } );
                    } ).catch( ( err ) => {
                        console.error( 'Error copying text: ', err );
                        LX.toast( 'Error', '❌ No se pudo copiar.', { timeout: -1, position: 'top-center' } );
                    } );
                    copyButtonWidget.root.querySelector( "input[type='checkbox']" ).style.pointerEvents = 'none';

                    LX.doAsync( () => {
                        copyButtonWidget.swap( true );
                        copyButtonWidget.root.querySelector( "input[type='checkbox']" ).style.pointerEvents = 'auto';
                    }, 3000 );
                }, { swap: 'Check', icon: 'Copy', title: 'Copiar', tooltip: true, className: 'ml-auto' } );
                LX.addClass( copyButtonWidget.root.querySelector( '.swap-on svg' ), 'text-success' );
                priceContainer.appendChild( copyButtonWidget.root );
            }

            lastTotalPrice[i] = roundedTotalPrice;
            // lastTotalPackages = packaging.count;
        }
    }

    matchPostalCode( postalCode, prefixRule )
    {
        postalCode = postalCode.toString();

        if ( prefixRule.constructor === Array )
        {
            for ( const prefix of prefixRule )
            {
                if ( postalCode.startsWith( prefix ) ) return true;
            }
        }
        else if ( prefixRule.includes( '-' ) )
        {
            let [ start, end ] = prefixRule.split( '-' ).map( ( s ) => s.trim() );
            start = Number( start[0] );
            end = Number( end[0] );
            if ( Number.isNaN( start ) || Number.isNaN( end ) || end < start ) return false;

            for ( let n = start; n <= end; n++ )
            {
                if ( postalCode.startsWith( String( n ) ) ) return true;
            }
        }

        return postalCode.startsWith( prefixRule );
    }

    getCityZoneByPrefix( postalCode, country, rules, transportName )
    {
        if ( !postalCode || !country ) return null;

        const pc = String( postalCode ).trim();
        const c = country.toUpperCase().trim();

        // Get all rules matching the country or global rules
        const countryRules = rules.filter( ( r ) => !r.country || r.country.toUpperCase() === c );

        // Find rules where the postal code starts with the prefix
        const matches = countryRules.filter( ( r ) => this.matchPostalCode( pc, r.prefix ) );
        if ( matches.length === 0 ) return null;

        // Choose the rule with the longest prefix (best precision)
        const best = matches.sort( ( a, b ) => b.prefix.length - a.prefix.length )[0];
        const transportIdx = TRANSPORT_NAMES.indexOf( transportName );

        return {
            city: best.city,
            zone: best.zone[transportIdx]
        };
    }

    getVolumeBracket( vol, transportName )
    {
        // get always zone 1 to get brackets
        const brackets = Object.keys( Data.pricesByZone[transportName][1] )
            .map( v => parseInt( v ) )
            .filter( v => !Number.isNaN( v ) );

        for ( const bracket of brackets )
        {
            if ( vol <= bracket ) return bracket;
        }
        return null; // "3000+";
    }

    getPackaging( sizeM, units )
    {
        const size = Number( sizeM * 100 );

        const bagCap = ( () => {
            if ( size === 2 ) return { perBag: 10, special: 11 };
            if ( size === 2.5 || size === 3 ) return { perBag: 5, special: 6 };
            if ( size === 4 ) return { perBag: 5 };
            return null;
        } )();

        const palletCap = ( () => {
            if ( size === 2 ) return { min: 51, max: 92 };
            if ( size === 2.5 || size === 3 ) return { min: 26, max: 77 };
            if ( size === 4 ) return { min: 30, max: 45 };
            return null;
        } )();

        const options = [];

        if ( palletCap && units >= palletCap.min )
        {
            const unitsPerPackage = [];
            const max = palletCap.max;
            const numPallets = Math.ceil( units / max );
            const base = Math.floor( units / numPallets );
            const extra = units % numPallets;

            for ( let i = 0; i < numPallets; i++ )
            {
                unitsPerPackage.push( base + ( i < extra ? 1 : 0 ) );
            }

            options.push( {
                type: 'Pallet',
                count: unitsPerPackage.length,
                unitsPerPackage
            } );
        }

        if ( bagCap )
        {
            let unitsPerPackage = [];

            if ( bagCap.special && units === bagCap.special )
            {
                // Special rule: exactly 1 bag with 11 or 6 units
                unitsPerPackage = [ units ];
            }
            else
            {
                const full = bagCap.perBag;
                let remaining = units;

                while ( remaining > 0 )
                {
                    if ( remaining >= full )
                    {
                        unitsPerPackage.push( full );
                        remaining -= full;
                    }
                    else
                    {
                        // last partial bag
                        unitsPerPackage.push( remaining );
                        remaining = 0;
                    }
                }
            }

            options.push( {
                type: 'Saca',
                count: unitsPerPackage.length,
                unitsPerPackage
            } );
        }

        return options;
    }

    openNewCalcDialog()
    {
        const core = this.core;
        const dialogClosable = new LX.Dialog( 'Nuevo cálculo personalizado', ( dialogPanel ) => {
            dialogPanel.root.className += ' bg-card border-none p-2';

            let height = 0, width = 0, depth = 0, weight = 0;

            dialogPanel.sameLine();
            dialogPanel.addText( 'Alto', height, ( value, event ) => {
                height = value;
                this.updateTransports( width, height, depth, weight, left, right );
            }, { skipReset: true, trigger: 'input', placeholder: '0' } );
            dialogPanel.addText( 'Ancho', width, ( value, event ) => {
                width = value;
                this.updateTransports( width, height, depth, weight, left, right );
            }, { skipReset: true, trigger: 'input', placeholder: '0' } );
            dialogPanel.addText( 'Largo', depth, ( value, event ) => {
                depth = value;
                this.updateTransports( width, height, depth, weight, left, right );
            }, { skipReset: true, trigger: 'input', placeholder: '0' } );
            dialogPanel.addText( 'Peso', weight, ( value, event ) => {
                weight = value;
                this.updateTransports( width, height, depth, weight, left, right );
            }, { skipReset: true, trigger: 'input', placeholder: '0' } );
            dialogPanel.addButton( null, 'RefreshButton', () => {
                this.updateTransports( width, height, depth, weight, left, right );
            }, { icon: 'RefreshCw', title: 'Actualizar cálculo', className: 'self-center' } );
            dialogPanel.endLine();
            dialogPanel.addSeparator();

            const dialogArea = new LX.Area( { className: 'mt-2 gap-2' } );
            dialogPanel.attach( dialogArea.root );
            const [ left, right ] = dialogArea.split( { type: 'horizontal', sizes: [ '50%', '50%' ], resize: false } );
        }, { position: [ '10%', '250px' ], size: [ '80%', null ], closable: true, draggable: false } );
    }
}

export { TransportCalculatorApp };
