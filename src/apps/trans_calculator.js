import { LX } from 'lexgui';
import { Data } from '../data.js';

const VOLUME_BRACKETS = [
    5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
    150, 200, 250, 300
];

class TransportCalculatorApp {

    // _sku = "Vacío";
    _sku = "PEPE";
    get sku() { return this._sku; }
    set sku(v) { this._sku = v; this.updateBoth(); }

    _quantity = "10";
    get quantity() { return this._quantity; }
    set quantity(v) { this._quantity = v; this.updateBoth(); }

    _cp = "12345";
    get cp() { return this._cp; }
    set cp(v) { this._cp = v; this.updateBoth(); }

    _country = "España";
    get country() { return this._country; }
    set country(v) { this._country = v; this.updateBoth(); }

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

        const resultArea = new LX.Area({ skipAppend: true, className: "p-4 gap-2 overflow-scroll" });
        this.area.attach(resultArea);
        const [left, right] = resultArea.split({ type: "horizontal", sizes: ["50%", "50%"], resize: false });
        left.root.classList.add("p-1", "rounded-xl", "bg-secondary");
        right.root.classList.add("p-1", "rounded-xl", "bg-secondary");

        this.leftArea = left;
        this.rightArea = right;

        core.transCalculatorArea = this.area;

        this.update(left);
        this.update(right);
    }

    execute() {

        if (this.sku == "Vacío" || !this.quantity.length || !this.cp.length) {
            return;
        }

        let packageCount,
            packageType,
            quantityPerPackage,
            height,
            totalVolume,
            totalVolumeKgs,
            volFactor,
            zoneNumber,
            city,
            price,
            finalPrice;

        const q = parseInt(this.quantity);
        if (Number.isNaN(q)) {
            return;
        }

        // 1. Determinar número de bultos
        // - 2 cm: 10 piezas por saca (11 solo en caso de que sean solo 11).
        // - 2,5 y 3 cm: 5 piezas por saca (hasta 6 solo en caso de que sean solo 6).
        // - 4 cm: 5 piezas por saca

        // Se utiliza pallet cuando el envío supera los siguientes rangos:
        // - 2 cm: desde 51 hasta un máximo de 92 (por pallet) -> 93 sería nuevo pallet
        // - 2,5 cm / 3 cm: entre 26, hasta un máximo de 77.
        // - 4 cm: 30 piezas, hasta un máximo de 45.
        packageType = "Pallet";
        packageCount = 2;

        // - Altura: grosor (en m) × nº de piezas.
        const thickness = (Data["sku"][this.sku]?.thickness ?? 0) * 0.01;
        height = q * thickness;

        // - Si va en pallet: sumar 0,15 m por cada pallet.
        if (packageType == "Pallet") {
            height += 0.15 * packageCount;
        }
        // - Ancho y largo: siempre 1,06 m × 1,06 m.
        // - Volumen final: Altura × 1,06 × 1,06.
        const width = 1.06;
        const depth = 1.06;
        totalVolume = height * width * depth;

        // Ciudad
        const cz = this.getCityZoneByPrefix(this.cp, this.country, Data.zoneRules[this.country]);
        city = cz.city ?? "";
        zoneNumber = cz.zone ?? 0;
        const balears = this.cp.startsWith("07");

        // 3. Obtener los kg volumétricos
        // - 220 → Península
        // - 333 → Baleares y Portugal
        // - 300 → Francia (OTRA TARIFA: SALVAT -> DELEGACIÓN CBL)
        volFactor = this.country === "Francia" ? 300 : (balears || this.country === "Portugal" ? 333 : 220);
        totalVolumeKgs = totalVolume * volFactor;
        
        const zp = Data.pricesByZone[zoneNumber[0]] ?? {};
        price = zp[this.getVolumeBracket(totalVolumeKgs)] ?? -1;
        const gasPrice = 1.09;
        // - Aplicar recargo por combustible: multiplicar el importe por 1,09.
        finalPrice = price * gasPrice;

        return {
            packageCount,
            packageType,
            quantityPerPackage,
            height,
            width,
            depth,
            totalVolume,
            totalVolumeKgs,
            volFactor,
            zoneNumber,
            city,
            price,
            gasPrice,
            finalPrice
        }
    }

    updateBoth() {
        this.update(this.leftArea);
        this.update(this.rightArea);
    }

    update(area) {

        area.root.innerHTML = "";

        const r = this.execute();
        if (!r) return;

        const {
            packageCount,
            packageType,
            quantityPerPackage,
            height,
            width,
            depth,
            totalVolume,
            totalVolumeKgs,
            volFactor,
            zoneNumber,
            city,
            price,
            gasPrice,
            finalPrice
        } = r;

        LX.makeContainer(["100%", "auto"], "px-4 py-4 flex flex-row gap-2 font-light text-xxl fg-secondary items-center align-center", `
            ${LX.makeIcon("FileDigit", {svgClass:"xl"}).innerHTML}
            <span>Resumen</span>
            `, area);

        {
            const resultsContainer = LX.makeContainer(["100%", "100%"], "flex flex-col gap-4 p-4", ``, area);
            LX.makeContainer(["100%", "auto"], "flex flex-row gap-8", `
            <div class="flex flex-row gap-2"><span class="fg-secondary text-lg font-light">Altura</span><span class="font-semibold">${LX.round(height, 2)}m</span></div>
            <div class="flex flex-row gap-2"><span class="fg-secondary text-lg font-light">Ancho</span><span class="font-semibold">${width}m</span></div>
            <div class="flex flex-row gap-2"><span class="fg-secondary text-lg font-light">Largo</span><span class="font-semibold">${depth}m</span></div>
        `, resultsContainer);
            LX.makeContainer(["100%", "auto"], "flex flex-row gap-8", `
            <div class="flex flex-row gap-2"><span class="fg-secondary text-lg font-light">Bultos</span><span class="font-semibold">${packageCount}</span></div>
        `, resultsContainer);

            const packagesContainer = LX.makeContainer(["100%", "100%"], "flex flex-col gap-2 ml-8", ``, resultsContainer);
            for (var i = 0; i < packageCount; ++i) {
                LX.makeContainer(["100%", "auto"], "flex flex-row gap-8", `
                    <div class="flex flex-row gap-2"><span class="fg-secondary text-lg font-light">Bulto</span><span class="font-semibold">${i + 1}</span></div>
                    <div class="flex flex-row gap-2"><span class="fg-secondary text-lg font-light">Tipo</span><span class="font-semibold">${packageType}</span></div>
            <div class="flex flex-row gap-2"><span class="fg-secondary text-lg font-light">Cantidad</span><span class="font-semibold">${quantityPerPackage}</span></div>
        `, packagesContainer);
            }

            LX.makeContainer(["100%", "auto"], "flex flex-row gap-8", `
            <div class="flex flex-row gap-2"><span class="fg-secondary text-lg font-light">Volumen</span><span class="font-semibold">${LX.round(totalVolume, 4)}</span></div>
            <div class="flex flex-row gap-2"><span class="fg-secondary text-lg font-light">Kgs Volumétricos</span><span class="font-semibold">${LX.round(totalVolumeKgs, 4)}</span></div>
        `, resultsContainer);

            LX.makeContainer(["100%", "auto"], "flex flex-row gap-8", `
                <div class="flex flex-row gap-2"><span class="fg-secondary text-lg font-light">Tarifa Kgs Combustible</span><span class="font-semibold">${volFactor}</span></div>
            <div class="flex flex-row gap-2"><span class="fg-secondary text-lg font-light">Recargo Combustible</span><span class="font-semibold">${gasPrice}</span></div>
        `, resultsContainer);

            LX.makeContainer(["100%", "1px"], "border", "", area);
        }

        {
            const resultsContainer = LX.makeContainer(["100%", "100%"], "flex flex-col gap-4 p-4", ``, area);
            LX.makeContainer(["100%", "auto"], "flex flex-row gap-8", `
            <div class="flex flex-row gap-2"><span class="fg-secondary text-lg font-light">Zona</span><span class="font-semibold">${zoneNumber}</span></div>
            <div class="flex flex-row gap-2"><span class="fg-secondary text-lg font-light">Ciudad</span><span class="font-semibold">${city}</span></div>
        `, resultsContainer);
            LX.makeContainer(["100%", "auto"], "flex flex-row gap-8", `
            <div class="flex flex-row gap-2"><span class="fg-secondary text-lg font-light">Coste</span><span class="font-semibold">${LX.round(price, 3)}€</span></div>
            <div class="flex flex-row gap-2"><span class="fg-secondary text-lg font-light">Total con Combustible</span><span class="font-semibold">${LX.round(finalPrice, 3)}€</span></div>
        `, resultsContainer);
        }
    }

    getCityZoneByPrefix(postalCode, country, rules) {
        if (!postalCode || !country) return null;

        const pc = String(postalCode).trim();
        const c = country.toUpperCase().trim();

        // Get all rules matching the country or global rules
        const countryRules = rules.filter(r =>
            !r.country || r.country.toUpperCase() === c
        );

        // Find rules where the postal code starts with the prefix
        const matches = countryRules.filter(r => pc.startsWith(r.prefix));

        if (matches.length === 0) return null;

        // Choose the rule with the longest prefix (best precision)
        const best = matches.sort((a, b) => b.prefix.length - a.prefix.length)[0];

        return {
            city: best.city,
            zone: best.zone
        };
    }

    getVolumeBracket(vol) {
        for (const bracket of VOLUME_BRACKETS) {
            if (vol <= bracket) return bracket;
        }
        return -1;//"300+";
    }
    open(params) {
        this.core.tool = "t-calc";
        this.core.setHeaderTitle(`Calculadora: <i>Transporte</i>`, "", "Calculator");
        this.area.root.classList.toggle("hidden", false);
    }

    clear() {
        delete this.orders;
        this.updateOrders();
    }
}

export { TransportCalculatorApp };