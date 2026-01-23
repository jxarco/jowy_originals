export const Constants = {
    UTILITY_BUTTONS_PANEL_CLASSNAME: 'bg-none bg-card border-none p-2 flex flex-row gap-2',
    TAB_CONTAINER_CLASSNAME: 'flex flex-col relative bg-card p-1 rounded-lg overflow-hidden',
    TAB_AREA_CLASSNAME: 'bg-inherit rounded-lg'
};

export const NumberFormatter = new Intl.NumberFormat( 'es-ES', { style: 'currency', currency: 'EUR' } );

export const SKU_MAPPING = {
    // Wrong and missing prefix
    'BER01G': 'BY-BER090G', 'BY-BER01G': 'BY-BER090G',
    'BER02G': 'BY-BER110G', 'BY-BER02G': 'BY-BER110G',
    'BER03G': 'BY-BER140G', 'BY-BER03G': 'BY-BER140G',
    'BER04G': 'BY-BER150G', 'BY-BER04G': 'BY-BER150G',
    'BER05G': 'BY-BER180G', 'BY-BER05G': 'BY-BER180G',
    'DOR01G': 'BY-DOR01W', 'BY-DOR01G': 'BY-DOR01W',
    'DOR02G': 'BY-EXT07W', 'BY-DOR02G': 'BY-EXT07W',
    'DOR03G': 'BY-EXT10W', 'BY-DOR03G': 'BY-EXT10W',
    'DOR04G': 'BY-EXT20W', 'BY-DOR04G': 'BY-EXT20W',
    'DOR05G': 'BY-EXT30W', 'BY-DOR05G': 'BY-EXT30W',
    'DOR06G': 'BY-EXT45W', 'BY-DOR06G': 'BY-EXT45W',
    'DOR07G': 'BY-EXT80W', 'BY-DOR07G': 'BY-EXT80W',
    'PT01G': 'BY-WC01P', 'BY-PT01G': 'BY-WC01P',
    'PT02B': 'BY-WC02B', 'BY-PT02B': 'BY-WC02B',
    'CM01G': 'BY-WC03E', 'BY-CM01G': 'BY-WC03E',
    'TIL01G': 'BY-WC04G', 'BY-TIL01G': 'BY-WC04G',
    'BTT02G': 'BY-BTM01G', 'BY-BTT02G': 'BY-BTM01G',
    'BTT02P': 'BY-BTM01P', 'BY-BTT02P': 'BY-BTM01P',
    'BHC007H': 'BY-BHC01G', 'BY-BHC007H': 'BY-BHC01G',
    'BHC07W': 'BY-BHC01W', 'BY-BHC07W': 'BY-BHC01W',
    'BHC07K': 'BY-BHC01K', 'BY-BHC07K': 'BY-BHC01K',
    'BHC350W': 'BY-BHC01N', 'BY-BHC350W': 'BY-BHC01N',
    // Wrong
    'BY-SBW01GN': 'BY-SBW01V',
    'BY-FBT05GN': 'BY-FBT05V',
    'BY-FBT02GN': 'BY-FBT02V',
    'BY-FBT03GN': 'BY-FBT03V',
    'BY-FBT04GN': 'BY-FBT04V',
    'BY-FBT01BSINCOJ': 'BY-FBT01B',
    'BY-BCS01': 'BY-BCS02',
    'BY-PT02': 'BY-WC02B',
    // Change prefix
    'HG-AT20G1': 'JW-AT20G1',
    'HG-AT20G2': 'JW-AT20G2',
    'HG-AT30G1': 'JW-AT30G1',
    'HG-AT30G2': 'JW-AT30G2',
    'HG-AT40G1': 'JW-AT40G1',
    'HG-AT40G2': 'JW-AT40G2',
    // Missing prefix
    'FM01': 'BY-FM01',
    'FM02': 'BY-FM02',
    'FM03': 'BY-FM03',
    'AT20G1': 'JW-AT20G1',
    'AT20G2': 'JW-AT20G2',
    'AT30G1': 'JW-AT30G1',
    'AT30G2': 'JW-AT30G2',
    'AT40G1': 'JW-AT40G1',
    'AT40G2': 'JW-AT40G2',
    'AD32': 'HG-AD32',
    'AD40': 'HG-AD40' 
};

export const LAL_SKU_MAPPINGS = {
    "BY-SUP01-FBT05V": [
        { sku: 'BY-SUP01', price: 0.55 },
        { sku: 'BY-FBT05V', price: 0.45 }
    ],
    "BY-SUP01-FBT05P": [
        { sku: 'BY-SUP01', price: 0.55 },
        { sku: 'BY-FBT05P', price: 0.45 }
    ],
    "BY-SUP01-FBT05G": [
        { sku: 'BY-SUP01', price: 0.55 },
        { sku: 'BY-FBT05G', price: 0.45 }
    ],
    "BY-SUP01-FBT05B": [
        { sku: 'BY-SUP01', price: 0.55 },
        { sku: 'BY-FBT05B', price: 0.45 }
    ],
    "BY-SBW01P/B": [
        { sku: 'BY-SBW01P', price: 0.50 },
        { sku: 'BY-SBW01B', price: 0.50 }
    ],
    "BY-SBW01GN/BW": [
        { sku: 'BY-SBW01V', price: 0.50 },
        { sku: 'BY-SBW01BW', price: 0.50 }
    ],
    "BY-SBW01W/G": [
        { sku: 'BY-SBW01W', price: 0.50 },
        { sku: 'BY-SBW01G', price: 0.50 }
    ],
    "BY-BTT01P1": [
        { sku: 'BY-BTT01P', price: 0.95 },
        { sku: 'BY-BCS02', price: 0.05 }
    ],
    "BY-BTT01G1": [
        { sku: 'BY-BTT01G', price: 0.95 },
        { sku: 'BY-BCS02', price: 0.05 }
    ],
};

export const PLATFORM_CLIENT_CODES = {
    'SHEIN_ESPAÑA_2025': '504',
    'SHEIN_PORTUGAL_2025': '505',
    'Miravia_ESPAÑA_2025': '497',
    'Miravia_PORTUGAL_2025': '597',
    'Miravia_FRANCIA_2025': '497', // Spain code for 2025
    'Miravia_ITALIA_2025': '598',

    'SHEIN_ESPAÑA_2026': '131',
    'SHEIN_PORTUGAL_2026': '132',
    'Miravia_ESPAÑA_2026': '121',
    'Miravia_PORTUGAL_2026': '122',
    'Miravia_FRANCIA_2026': '123',
    'Miravia_ITALIA_2026': '124',
};