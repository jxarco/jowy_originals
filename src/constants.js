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
    { prefix: 'JW-DF3', max: 1 },
    { prefix: 'JW-DF4', max: 1 },
    { prefix: 'JW-DT4', max: 1 }
];

export const ALWAYS_CBL = [
    'HG-AD24',
    'HG-AD32',
    'HG-AD40',
    'HG-BPB02',
    'HG-CD225',
    'HG-CD250',
    'HG-CD275',
    'HG-CD300'
];

export const PLATFORM_CLIENT_CODES = {
    'SHEIN_ESPAÑA_2025': '504',
    'SHEIN_PORTUGAL_2025': '505',
    'Miravia_ESPAÑA_2025': '497',
    'Miravia_PORTUGAL_2025': '597',
    'Miravia_FRANCIA_2025': '497', // Spain code for 2025
    'Miravia_ITALIA_2025': '598',
    'TikTok_ESPAÑA_2025': '502',
    'Decathlon_ESPAÑA_2025': '600',

    'SHEIN_ESPAÑA_2026': '131',
    'SHEIN_PORTUGAL_2026': '132',
    'Miravia_ESPAÑA_2026': '121',
    'Miravia_PORTUGAL_2026': '122',
    'Miravia_FRANCIA_2026': '123',
    'Miravia_ITALIA_2026': '124',
    'TikTok_ESPAÑA_2026': '163',
    'Decathlon_ESPAÑA_2026': '161',
};
