export const Constants = {
    UTILITY_BUTTONS_PANEL_CLASSNAME: 'bg-none bg-card border-none p-2 flex flex-row gap-2',
    TAB_CONTAINER_CLASSNAME: 'flex flex-col relative bg-card p-1 rounded-lg overflow-hidden',
    TAB_AREA_CLASSNAME: 'bg-inherit rounded-lg',

    IVA_EXPORTS_COUNTRY: false,
};

export const NumberFormatter = new Intl.NumberFormat( 'es-ES', { style: 'currency', currency: 'EUR' } );