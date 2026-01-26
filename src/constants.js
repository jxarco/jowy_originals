export const Constants = {
    UTILITY_BUTTONS_PANEL_CLASSNAME: 'bg-none bg-card border-none p-2 flex flex-row gap-2',
    TAB_CONTAINER_CLASSNAME: 'flex flex-col relative bg-card p-1 rounded-lg overflow-hidden',
    TAB_AREA_CLASSNAME: 'bg-inherit rounded-lg'
};

export const NumberFormatter = new Intl.NumberFormat( 'es-ES', { style: 'currency', currency: 'EUR' } );

export const CBL_RULES = [
    { prefix: 'JW-DF20', max: 3 },
    { prefix: 'JW-DT20', max: 3 },
    { prefix: 'JW-DF25', max: 2 },
    { prefix: 'JW-DT25', max: 2 },
    { prefix: 'JW-DS25', max: 2 },
    { prefix: 'JW-DF3',  max: 1 },
    { prefix: 'JW-DF4',  max: 1 },
    { prefix: 'JW-DT4',  max: 1 }
];

export const ALWAYS_CBL = [
    'HG-AD24', 'HG-AD32', 'HG-AD40',
    'HG-BPB02',
    'HG-CD225', 'HG-CD250', 'HG-CD275', 'HG-CD300'
];

export const LAL_SKU_MAPPINGS = {
    'BY-SUP01-FBT05V': [
        { sku: 'BY-SUP01', price: 0.55 },
        { sku: 'BY-FBT05V', price: 0.45 }
    ],
    'BY-SUP01-FBT05P': [
        { sku: 'BY-SUP01', price: 0.55 },
        { sku: 'BY-FBT05P', price: 0.45 }
    ],
    'BY-SUP01-FBT05G': [
        { sku: 'BY-SUP01', price: 0.55 },
        { sku: 'BY-FBT05G', price: 0.45 }
    ],
    'BY-SUP01-FBT05B': [
        { sku: 'BY-SUP01', price: 0.55 },
        { sku: 'BY-FBT05B', price: 0.45 }
    ],
    'BY-SBW01P/B': [
        { sku: 'BY-SBW01P', price: 0.50 },
        { sku: 'BY-SBW01B', price: 0.50 }
    ],
    'BY-SBW01GN/BW': [
        { sku: 'BY-SBW01V', price: 0.50 },
        { sku: 'BY-SBW01BW', price: 0.50 }
    ],
    'BY-SBW01W/G': [
        { sku: 'BY-SBW01W', price: 0.50 },
        { sku: 'BY-SBW01G', price: 0.50 }
    ],
    'BY-BTT01P1': [
        { sku: 'BY-BTT01P', price: 0.95 },
        { sku: 'BY-BCS02', price: 0.05 }
    ],
    'BY-BTT01G1': [
        { sku: 'BY-BTT01G', price: 0.95 },
        { sku: 'BY-BCS02', price: 0.05 }
    ]
};

export const PLATFORM_CLIENT_CODES = {
    'SHEIN_ESPAÑA_2025': '504',
    'SHEIN_PORTUGAL_2025': '505',
    'Miravia_ESPAÑA_2025': '497',
    'Miravia_PORTUGAL_2025': '597',
    'Miravia_FRANCIA_2025': '497', // Spain code for 2025
    'Miravia_ITALIA_2025': '598',
    'TikTok_ESPAÑA_2025': '502',

    'SHEIN_ESPAÑA_2026': '131',
    'SHEIN_PORTUGAL_2026': '132',
    'Miravia_ESPAÑA_2026': '121',
    'Miravia_PORTUGAL_2026': '122',
    'Miravia_FRANCIA_2026': '123',
    'Miravia_ITALIA_2026': '124',
    'TikTok_ESPAÑA_2026': '163'
};
