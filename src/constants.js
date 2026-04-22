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

export const PLATFORM_TRANSPORT_COST_PCT = {
    // 'Amazon_ESPAÑA': 0.186,
    // 'Amazon_PORTUGAL': 0.196,
    // 'Amazon_FRANCIA': 0.19,
    'Miravia_ESPAÑA': 0.167,
    'Miravia_PORTUGAL': 0.184,
    // TODO: Needs confirmation!
    'Miravia_FRANCIA': 0.32,
    'Miravia_ITALIA': 0.32,
    // .........................
    'SHEIN_ESPAÑA': 0.303,
    'SHEIN_PORTUGAL': 0.32,
    'LeroyMerlin_ESPAÑA': 0.19,
    'LeroyMerlin_PORTUGAL': 0.27,
    'Worten_ESPAÑA': 0.194,
    'Worten_PORTUGAL': 0.215,
    'Decathlon_ESPAÑA': 0.19,
    'Carrefour_ESPAÑA': 0.216,
    'TikTok_ESPAÑA': 0.29,
    'TEMU_ESPAÑA': 0.1,
    'PlanetaHuerto_ESPAÑA': 0.1,
    // TODO: Needs confirmation!
    'Sprinter_ESPAÑA': 0.19,
    'Sprinter_PORTUGAL': 0.27,
};

export const PLATFORM_CLIENT_CODES = {
    'SHEIN_ESPAÑA_2025': '504',
    'SHEIN_PORTUGAL_2025': '505',
    'Miravia_ESPAÑA_2025': '497',
    'Miravia_PORTUGAL_2025': '597',
    'Miravia_FRANCIA_2025': '497', // Spain code for 2025
    'Miravia_ITALIA_2025': '598',
    'TikTok_ESPAÑA_2025': '502',
    'Decathlon_ESPAÑA_2025': '600',
    'Worten_ESPAÑA_2025': '596',
    'Worten_PORTUGAL_2025': '496',
    'Carrefour_ESPAÑA_2025': '495',
    'Temu_ESPAÑA_2025': '498',
    'LeroyMerlin_ESPAÑA_2025': '499',
    'LeroyMerlin_PORTUGAL_2025': '501',
    'LeroyMerlin_FRANCIA_2025': '500',
    'PlanetaHuerto_ESPAÑA_2025': '503',
    'Sprinter_ESPAÑA_2025': '165', // No client code for Sprinter, using new 2026 code

    'SHEIN_ESPAÑA_2026': '131',
    'SHEIN_PORTUGAL_2026': '132',
    'Miravia_ESPAÑA_2026': '121',
    'Miravia_PORTUGAL_2026': '122',
    'Miravia_FRANCIA_2026': '123',
    'Miravia_ITALIA_2026': '124',
    'TikTok_ESPAÑA_2026': '163',
    'Decathlon_ESPAÑA_2026': '161',
    'Worten_ESPAÑA_2026': '151',
    'Worten_PORTUGAL_2026': '152',
    'Carrefour_ESPAÑA_2026': '162',
    'Temu_ESPAÑA_2026': '166',
    'LeroyMerlin_ESPAÑA_2026': '141',
    'LeroyMerlin_PORTUGAL_2026': '142',
    'LeroyMerlin_FRANCIA_2026': '143',
    'PlanetaHuerto_ESPAÑA_2026': '164',
    'Sprinter_ESPAÑA_2026': '165',
};

export const PLATFORM_AGENT_CODES = {
    // 'Amazon': '7',
    'Carrefour': '10',
    'Worten': '11',
    'Miravia': '12',
    'TEMU': '15',
    'LeroyMerlin': '17',
    'TikTok': '19',
    'PlanetaHuerto': '20',
    'SHEIN': '21',
    'Sprinter': '22',
    'Decathlon': '23'
};