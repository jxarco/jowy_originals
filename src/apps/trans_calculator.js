import { LX } from 'lexgui';
import { Data } from '../data.js';

const VOLUME_BRACKETS = [
    5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
    150, 200, 250, 300, 500, 750, 1000, 3000
];

const TRANSPORT_NAMES = [ "CBL", "SEUR" ];

const NumberFormatter = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

class TransportCalculatorApp {

    // _sku = "Vacío";
    _sku = "JW-DF20";
    get sku() { return this._sku; }
    set sku(v) { this._sku = v; this.updateTransports(); }

    _quantity = "1";
    get quantity() { return this._quantity; }
    set quantity(v) { this._quantity = v; this.updateTransports(); }

    _cp = "08150";
    get cp() { return this._cp; }
    set cp(v) { this._cp = v; this.updateTransports(); }

    _country = "España";
    get country() { return this._country; }
    set country(v) { this._country = v; this.updateTransports(); }

    constructor(core) {
        this.core = core;
        this.area = new LX.Area({ skipAppend: true, className: "hidden" });
        core.area.attach(this.area);

        // Create utility buttons
        const utilButtonsPanel = new LX.Panel({ height: "auto", className: "bg-none bg-primary border-bottom p-2 flex flex-row gap-2" });
        utilButtonsPanel.sameLine();
        // utilButtonsPanel.addButton(null, "ClearButton", core.clearData.bind(core), { icon: "Trash2", title: "Limpiar datos anteriores", tooltip: true });
        utilButtonsPanel.addSelect("Ref", Object.keys(Data.sku), this.sku, (v) => {
            this.sku = v;
        }, { className: "w-full", filter: true, overflowContainer: null, skipReset: true });
        utilButtonsPanel.addText("Unidades", this.quantity, (v) => {
            this.quantity = v;
        }, { trigger: "input", className: "w-full", nameWidth: "50%", placeholder: "0", skipReset: true });
        utilButtonsPanel.addText("CP", this.cp, (v) => {
            this.cp = v;
        }, { trigger: "input", className: "w-full", placeholder: "00000", skipReset: true });
        utilButtonsPanel.addSelect("País", "España Francia Portugal".split(" "), this.country, (v) => {
            this.country = v;
        }, { className: "w-full", overflowContainer: null, skipReset: true });
        utilButtonsPanel.endLine("w-full");
        this.area.attach(utilButtonsPanel.root);

        // const tabs = this.area.addTabs({ parentClass: "p-4", sizes: ["auto", "auto"], contentClass: "p-2 pt-0" });

        // // CBL
        // {
        //     const tabContainer = LX.makeContainer([null, "auto"], "flex flex-col relative bg-primary p-1 pt-0 rounded-lg overflow-hidden");
        //     tabs.add("CBL", tabContainer, { selected: true, onSelect: (event, name) => this.transportComp = name });

        //     const tabArea = new LX.Area({ className: "rounded-lg" });
        //     tabContainer.appendChild(tabArea.root);
        // }

        // // SEUR
        // {
        //     const tabContainer = LX.makeContainer([null, "auto"], "flex flex-col relative bg-primary p-1 pt-0 rounded-lg overflow-hidden");
        //     tabs.add("SEUR", tabContainer, { xselected: true, onSelect: (event, name) => this.transportComp = name });

        //     const tabArea = new LX.Area({ className: "rounded-lg" });
        //     tabContainer.appendChild(tabArea.root);
        // }

        // // center tabs
        // tabs.root.parentElement.classList.add("flex", "justify-center");

        this.resultArea = new LX.Area({ skipAppend: true, className: "flex justify-center p-4 gap-2 overflow-scroll" });
        this.area.attach(this.resultArea);
        const [left, right] = this.resultArea.split({ type: "horizontal", sizes: ["50%", "50%"], resize: false });
        left.root.classList.add("flex", "flex-col", "gap-2");
        right.root.classList.add("flex", "flex-col", "gap-2");

        this.leftArea = left;
        this.rightArea = right;

        core.transCalculatorArea = this.area;

        this.updateTransports();
    }

    execute(transportName) {

        if (this.sku == "Vacío" || !this.quantity.length || !this.cp.length) {
            return;
        }

        let height,
            totalVolume,
            totalVolumeKgs,
            volFactor,
            useVolFactor = true,
            zoneNumber,
            city,
            price,
            finalPrice;

        const q = parseInt(this.quantity);
        if (Number.isNaN(q)) {
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

        const product = Object.assign({thickness: 0, weight: 0, width: 0, depth: 0}, Data["sku"][this.sku]);
        const { thickness, weight, width, depth } = product;
        const packagingOptions = thickness !== 0 ? this.getPackaging(thickness, q) : [
            {type: "Pallet", count: 1, unitsPerPackage: [q]}
        ];

        // Ciudad
        const cz = this.getCityZoneByPrefix(this.cp, this.country, Data.zoneRules[this.country], transportName) ?? {};
        if(!cz.city) return;
        city = cz.city;
        zoneNumber = cz.zone ?? [];
        const balears = this.cp.startsWith("07");
        volFactor = this.country === "Francia" ? 300 : (balears || this.country === "Portugal" ? 333 : 220);
        const shippingOptions = [];

        for (let packaging of packagingOptions) {

            price = 0;

            // - Altura: grosor (en m) × nº de piezas.
            height = q * thickness * 0.01;
    
            // - Si va en pallet: sumar 0,15 m por cada pallet.
            if (packaging.type == "Pallet") {
                height += 0.15 * packaging.count;
            }

            totalVolume = height * width * depth;
    
            // 3. Obtener los kg volumétricos
            // - 220 → Península
            // - 333 → Baleares y Portugal
            // - 300 → Francia (OTRA TARIFA: SALVAT -> DELEGACIÓN CBL)
            totalVolumeKgs = totalVolume * volFactor;

            // Coger el max entre totalVolumeKgs o Kgs
            if(weight >= totalVolumeKgs) {
                useVolFactor = false;
                totalVolumeKgs = weight;
            }
            
            const bracket = this.getVolumeBracket(totalVolumeKgs) ?? "max";
            zoneNumber.forEach(v => {
                const zp = Data.pricesByZone[v] ?? {};
                price += zp[bracket] ?? 0;
            });
            
            // Desde 300, precio en eu/kg
            if (totalVolumeKgs >= 300) {
                price *= totalVolumeKgs;
            }
    
            const gasPrice = 1.09;
            // - Aplicar recargo por combustible: multiplicar el importe por 1,09.
            finalPrice = price * gasPrice;
    
            shippingOptions.push({
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
            });
        }

        return shippingOptions;
    }

    updateTransports() {
        this.update("CBL");
        this.update("SEUR");
    }

    update(transportName = "CBL") {
        const transportIdx = TRANSPORT_NAMES.indexOf(transportName);
        const area = this.resultArea.sections[transportIdx];
        area.root.innerHTML = "";

        const r = this.execute(transportName);
        if (!r) return;

        let lastTotalPrice = 0,
            lastTotalPackages = 0;

        for(let i = 0; i < r.length; ++i){
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

            const roundedTotalPrice = LX.round(finalPrice, 3);
            const totalPriceDiff = LX.round(roundedTotalPrice - lastTotalPrice, 3);
            const totalPackagesDiff = packaging.count - lastTotalPackages;
            const finalFormatted = NumberFormatter.format(finalPrice);

            const packagingModeContainer = LX.makeContainer(["100%", "auto"], "flex flex-col p-1 rounded-xl bg-secondary",
            ``, area);

            LX.makeContainer(["100%", "auto"], "px-4 py-4 flex flex-row gap-2 font-light text-xxl fg-secondary items-center align-center", `
                ${LX.makeIcon(packaging.type == "Pallet" ? "Package2":"Handbag", { svgClass: "xl" }).innerHTML}
                <span>
                    <span class="fg-tertiary">Resumen</span> <span class="font-semibold fg-primary">${transportName}: ${finalFormatted}</span>
                    ${ i>0 ? `<span class="text-xl ${totalPriceDiff>0?"fg-error":"fg-success"}">(${totalPriceDiff>0?"+":""}${NumberFormatter.format(totalPriceDiff)})</span>
                    <span class="text-xl ${totalPackagesDiff>0?"fg-error":"fg-success"}">(${totalPackagesDiff>0?"+":"-"}${totalPackagesDiff} bulto/s)</span>` : ""}
                </span>
                `, packagingModeContainer);
    
            {
                const resultsContainer = LX.makeContainer(["100%", "100%"], "flex flex-col gap-4 p-4", ``, packagingModeContainer);
                LX.makeContainer(["100%", "auto"], "flex flex-row gap-8", `
                <div class="flex flex-row gap-2"><span class="flex fg-secondary text-lg font-light items-center">Altura</span><span class="font-semibold">${LX.round(height, 2)}m</span></div>
                <div class="flex flex-row gap-2"><span class="flex fg-secondary text-lg font-light items-center">Ancho</span><span class="font-semibold">${width}m</span></div>
                <div class="flex flex-row gap-2"><span class="flex fg-secondary text-lg font-light items-center">Largo</span><span class="font-semibold">${depth}m</span></div>
            `, resultsContainer);
                LX.makeContainer(["100%", "auto"], "flex flex-row gap-8", `
                <div class="flex flex-row gap-2"><span class="flex fg-secondary text-lg font-light items-center">Volumen</span><span class="font-semibold">${LX.round(totalVolume, 5)}m<sup class="text-sm">3</sup></span></div>
                <div class="flex flex-row gap-2"><span class="flex fg-secondary text-lg font-light items-center">Peso</span><span class="font-semibold">${weight}kg</span></div>
            `, resultsContainer);
    
                const bultos = LX.makeContainer(["100%", "auto"], "flex flex-row gap-8 p-2 px-3 bg-tertiary rounded-lg cursor-pointer", `
                <div class="flex flex-row gap-2"><span class="flex fg-secondary text-lg font-light items-center">Bultos</span><span class="font-semibold">${packaging.count}</span><span class="text-xl">(${packaging.type}s)</span></div>
            `, resultsContainer);
                const collapsed = true;//(packaging.count > 5) && (r.length == 1);
                bultos.addEventListener("click", function(){ this.querySelector( ".collapser" ).click()});
                const packagesContainer = LX.makeContainer(["100%", "100%"], "flex flex-col gap-2 py-3 pl-8 bg-tertiary rounded-b-lg", ``, resultsContainer, {
                    display: collapsed ? "none" : "",
                    marginTop: "-1.25rem"
                });
    
                for (var j = 0; j < packaging.count; ++j) {
                    const quantityPerPackage = packaging.unitsPerPackage[j];
                    LX.makeContainer(["100%", "auto"], "flex flex-row gap-8", `
                        <div class="flex flex-row gap-2"><span class="flex fg-secondary text-lg font-light items-center">Bulto</span><span class="font-semibold">${j + 1}</span></div>
                        <div class="flex flex-row gap-2"><span class="flex fg-secondary text-lg font-light items-center">Cantidad</span><span class="font-semibold">${quantityPerPackage}</span></div>
                    `, packagesContainer);
                }
    
                LX.makeCollapsible(bultos, packagesContainer, resultsContainer, {collapsed, display: "flex"});
    
                if(useVolFactor) {
                    LX.makeContainer(["100%", "auto"], "flex flex-row gap-8", `
                    <div class="flex flex-row gap-2"><span class="flex fg-secondary text-lg font-light items-center">Factor Conversión</span><span class="font-semibold">${volFactor}</span></div>
            `, resultsContainer);
                }

                LX.makeContainer(["100%", "auto"], "flex flex-row gap-8", `
                <div class="flex flex-row gap-2"><span class="flex fg-secondary text-lg font-light items-center">Kgs Volumétricos</span><span class="font-semibold">${LX.round(totalVolumeKgs, 5)}kg/m<sup class="text-sm">3</span></div>
            `, resultsContainer);

            //     LX.makeContainer(["100%", "auto"], "flex flex-row gap-8", `
            //         <div class="flex flex-row gap-2"><span class="flex fg-secondary text-lg font-light items-center">Recargo Combustible</span><span class="font-semibold">${gasPrice}</span></div>
            // `, resultsContainer);
    
                LX.makeContainer(["100%", "1px"], "border", "", packagingModeContainer);
            }
    
            {
                const resultsContainer = LX.makeContainer(["100%", "100%"], "flex flex-col gap-4 p-4 items-center", ``, packagingModeContainer);
                LX.makeContainer(["100%", "auto"], "flex flex-row gap-8", `
                <div class="flex flex-row gap-2"><span class="flex fg-secondary text-lg font-light items-center">Zona</span><span class="font-semibold">${zoneNumber}</span></div>
                <div class="flex flex-row gap-2"><span class="flex fg-secondary text-lg font-light items-center">Ciudad/Provincia</span><span class="font-semibold">${city}</span></div>
            `, resultsContainer);

                const priceContainer = LX.makeContainer(["100%", "auto"], "flex flex-row gap-8 items-center", `
                <div class="flex flex-row gap-2"><span class="flex fg-secondary text-lg font-light items-center">Coste</span><span class="font-semibold fg-secondary">${NumberFormatter.format(price)}</span></div>
                <div class="flex flex-row gap-2"><span class="flex fg-secondary text-lg font-light items-center">Total Combustible (${gasPrice})</span><span class="font-semibold text-xxl">${finalFormatted}</span></div>
            `, resultsContainer);

                const copyButtonWidget = new LX.Button(null, "CopyButton", async function () {
                    const textToCopy = roundedTotalPrice;
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        LX.toast("Copiado", `✅ ${textToCopy} Copiado al portapapeles.`, { timeout: 5000, position: "top-left" });
                    }).catch(err => {
                        console.error('Error copying text: ', err);
                        LX.toast("Error", "❌ No se pudo copiar.", { timeout: -1, position: "top-left" });
                    });
                    copyButtonWidget.root.querySelector("input[type='checkbox']").style.pointerEvents = "none";

                    LX.doAsync(() => {
                        copyButtonWidget.swap(true);
                        copyButtonWidget.root.querySelector("input[type='checkbox']").style.pointerEvents = "auto";
                    }, 3000);
                }, { swap: "Check", icon: "Copy", title: "Copiar", tooltip: true, className: "ml-auto"});
                copyButtonWidget.root.querySelector(".swap-on svg").addClass("fg-success");
                priceContainer.appendChild(copyButtonWidget.root);
            }

            lastTotalPrice = roundedTotalPrice;
            lastTotalPackages = packaging.count;
        }
    }

    matchPostalCode(postalCode, prefixRule) {
        postalCode = postalCode.toString();

        if (prefixRule.includes("-")) {
            let [start, end] = prefixRule.split("-").map(s => s.trim());
            start = Number(start[0]);
            end = Number(end[0]);
            if (Number.isNaN(start) || Number.isNaN(end) || end < start) return false;

            for (let n = start; n <= end; n++) {
                if (postalCode.startsWith(String(n))) return true;
            }
        }

        return postalCode.startsWith(prefixRule);
    }

    getCityZoneByPrefix(postalCode, country, rules, transportName) {
        if (!postalCode || !country) return null;

        const pc = String(postalCode).trim();
        const c = country.toUpperCase().trim();

        // Get all rules matching the country or global rules
        const countryRules = rules.filter(r =>
            !r.country || r.country.toUpperCase() === c
        );

        // Find rules where the postal code starts with the prefix
        const matches = countryRules.filter(r => this.matchPostalCode(pc, r.prefix));
        if (matches.length === 0) return null;

        // Choose the rule with the longest prefix (best precision)
        const best = matches.sort((a, b) => b.prefix.length - a.prefix.length)[0];
        const transportIdx = TRANSPORT_NAMES.indexOf(transportName);

        return {
            city: best.city,
            zone: best.zone[ transportIdx ]
        };
    }

    getVolumeBracket(vol) {
        for (const bracket of VOLUME_BRACKETS) {
            if (vol <= bracket) return bracket;
        }
        return null;//"3000+";
    }

    getPackaging(sizeCm, units) {
        const size = Number(sizeCm);

        const bagCap = (() => {
            if (size === 2) return { perBag: 10, special: 11 };
            if (size === 2.5 || size === 3) return { perBag: 5, special: 6 };
            if (size === 4) return { perBag: 5 };
            return null;
        })();

        const palletCap = (() => {
            if (size === 2) return { min: 51, max: 92 };
            if (size === 2.5 || size === 3) return { min: 26, max: 77 };
            if (size === 4) return { min: 30, max: 45 };
            return null;
        })();

        const options = [];

        if (palletCap && units >= palletCap.min) {
            const unitsPerPackage = [];
            const max = palletCap.max;
            const numPallets = Math.ceil(units / max);
            const base = Math.floor(units / numPallets);
            const extra = units % numPallets;

            for (let i = 0; i < numPallets; i++) {
                unitsPerPackage.push(base + (i < extra ? 1 : 0));
            }

            options.push({
                type: "Pallet",
                count: unitsPerPackage.length,
                unitsPerPackage
            });
        }

        if (bagCap) {
            let unitsPerPackage = [];

            if (bagCap.special && units === bagCap.special) {
                // Special rule: exactly 1 bag with 11 or 6 units
                unitsPerPackage = [units];
            } else {
                const full = bagCap.perBag;
                let remaining = units;

                while (remaining > 0) {
                    if (remaining >= full) {
                        unitsPerPackage.push(full);
                        remaining -= full;
                    } else {
                        // last partial bag
                        unitsPerPackage.push(remaining);
                        remaining = 0;
                    }
                }
            }

            options.push({
                type: "Saca",
                count: unitsPerPackage.length,
                unitsPerPackage
            });
        }

        return options;
    }

    open(params) {
        this.core.tool = "t-calc";
        this.core.setHeaderTitle(`Calculadora: <i>Transporte</i>`, "", "Calculator");
        this.area.root.classList.toggle("hidden", false);
    }

    clear() {
        
    }
}

export { TransportCalculatorApp };