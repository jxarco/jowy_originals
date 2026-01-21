
let xlsx_loaded = 0;

const Data = {
    'ready': false,
    'sku': {}, // LOADED USING THE XLSX
    'zoneRules': {
        'España': [
            { 'prefix': '04', city: 'ALMERÍA', zone: [ [ 6 ], [ 3 ] ] },
            { 'prefix': '11', city: 'CÄDIZ', zone: [ [ 6 ], [ 3 ] ] },
            { 'prefix': '14', city: 'CORDOBA', zone: [ [ 6 ], [ 3 ] ] },
            { 'prefix': '18', city: 'GRANADA', zone: [ [ 6 ], [ 3 ] ] },
            { 'prefix': '21', city: 'HUELVA', zone: [ [ 6 ], [ 3 ] ] },
            { 'prefix': '23', city: 'JAÉN', zone: [ [ 6 ], [ 3 ] ] },
            { 'prefix': '29', city: 'MÁLAGA', zone: [ [ 6 ], [ 3 ] ] },
            { 'prefix': '41', city: 'SEVILLA', zone: [ [ 6 ], [ 3 ] ] },
            { 'prefix': '22', city: 'HUESCA', zone: [ [ 5 ], [ 2 ] ] },
            { 'prefix': '44', city: 'TERUEL', zone: [ [ 6 ], [ 2 ] ] },
            { 'prefix': '50', city: 'ZARAGOZA', zone: [ [ 3 ], [ 2 ] ] },
            { 'prefix': '33', city: 'ASTURIAS', zone: [ [ 5 ], [ 3 ] ] },
            { 'prefix': '39', city: 'CANTABRIA', zone: [ [ 5 ], [ 3 ] ] },
            { 'prefix': '02', city: 'ALBACETE', zone: [ [ 5 ], [ 3 ] ] },
            { 'prefix': '13', city: 'CIUDAD REAL', zone: [ [ 5 ], [ 3 ] ] },
            { 'prefix': '16', city: 'CUENCA', zone: [ [ 6 ], [ 2 ] ] },
            { 'prefix': '19', city: 'GUADALAJARA', zone: [ [ 5 ], [ 2 ] ] },
            { 'prefix': '45', city: 'TOLEDO', zone: [ [ 5 ], [ 3 ] ] },
            { 'prefix': '05', city: 'ÁVILA', zone: [ [ 6 ], [ 3 ] ] },
            { 'prefix': '09', city: 'BURGOS', zone: [ [ 4 ], [ 3 ] ] },
            { 'prefix': '24', city: 'LEON', zone: [ [ 5 ], [ 3 ] ] },
            { 'prefix': '34', city: 'PALENCIA', zone: [ [ 5 ], [ 3 ] ] },
            { 'prefix': '37', city: 'SALAMANCA', zone: [ [ 5 ], [ 3 ] ] },
            { 'prefix': '40', city: 'SEGOVIA', zone: [ [ 6 ], [ 3 ] ] },
            { 'prefix': '42', city: 'SORIA', zone: [ [ 6 ], [ 2 ] ] },
            { 'prefix': '47', city: 'VALLADOLID', zone: [ [ 5 ], [ 3 ] ] },
            { 'prefix': '49', city: 'ZAMORA', zone: [ [ 6 ], [ 3 ] ] },
            { 'prefix': '08', city: 'BARCELONA', zone: [ [ 1 ], [ 1 ] ] },
            { 'prefix': '17', city: 'GIRONA', zone: [ [ 2 ], [ 2 ] ] },
            { 'prefix': '25', city: 'LLEIDA', zone: [ [ 2 ], [ 2 ] ] },
            { 'prefix': '43', city: 'TARRAGONA', zone: [ [ 2 ], [ 2 ] ] },
            { 'prefix': '06', city: 'BADAJOZ', zone: [ [ 6 ], [ 3 ] ] },
            { 'prefix': '10', city: 'CÁCERES', zone: [ [ 6 ], [ 3 ] ] },
            { 'prefix': '15', city: 'LA CORUÑA', zone: [ [ 6 ], [ 3 ] ] },
            { 'prefix': '27', city: 'LUGO', zone: [ [ 6 ], [ 3 ] ] },
            { 'prefix': '32', city: 'ORENSE', zone: [ [ 6 ], [ 3 ] ] },
            { 'prefix': '36', city: 'PONTEVEDRA', zone: [ [ 6 ], [ 3 ] ] },
            { 'prefix': '26', city: 'LA RIOJA', zone: [ [ 4 ], [ 2 ] ] },
            { 'prefix': '03', city: 'ALICANTE', zone: [ [ 4 ], [ 2 ] ] },
            { 'prefix': '12', city: 'CASTELLÓN', zone: [ [ 3 ], [ 2 ] ] },
            { 'prefix': '46', city: 'VALENCIA', zone: [ [ 3 ], [ 2 ] ] },
            { 'prefix': '28', city: 'MADRID', zone: [ [ 5 ], [ 2 ] ] },
            { 'prefix': '30', city: 'MURCIA', zone: [ [ 5 ], [ 2 ] ] },
            { 'prefix': '31', city: 'NAVARRA', zone: [ [ 4 ], [ 2 ] ] },
            { 'prefix': '48', city: 'VIZCAYA', zone: [ [ 4 ], [ 3 ] ] },
            { 'prefix': '20', city: 'GIPUZKOA', zone: [ [ 4 ], [ 2 ] ] },
            { 'prefix': '01', city: 'ÁLAVA', zone: [ [ 4 ], [ 3 ] ] },
            { 'prefix': '07', city: 'BALEARES', zone: [ [ 7 ], [ 5 ] ] },
            // ESPECIALES
            { 'prefix': 'AD', city: 'ANDORRA', zone: [ [ 7 ], [] ] },
            { 'prefix': '51', city: 'CEUTA', zone: [ [ 6, 10 ], [ 7 ] ] },
            { 'prefix': '52', city: 'MELILLA', zone: [ [ 6, 10 ], [ 7 ] ] },
            { 'prefix': '35', city: 'CANARIAS', zone: [ [], [ 6 ] ] },
            { 'prefix': '38', city: 'CANARIAS', zone: [ [], [ 6 ] ] }
            // { "prefix": "GX", city: "GIBRALTAR", zone: [ [6, 11], [6, 11] ] },
        ],
        'Portugal': [
            { 'prefix': '1-49', city: 'Portugal 1', zone: [ [ 8 ], [ 4 ] ] }, // CP_1_49
            { 'prefix': '50-89', city: 'Portugal 2', zone: [ [ 9 ], [ 4 ] ] }, // CP_50_89
            { 'prefix': '9', city: 'ISLAS', zone: [ [ 9, 10 ], [ 4 ] ] }
        ],
        'Francia': [
            { 'prefix': [ '01', '38', '42', '43', '63' ], city: 'FRANCIA Z1', zone: [ [], [], [ 1 ] ] },
            { 'prefix': [ '02', '08' ], city: 'FRANCIA Z2', zone: [ [], [], [ 2 ] ] },
            { 'prefix': [ '03','05','07','26','74' ], city: 'FRANCIA Z3', zone: [ [], [], [ 3 ] ] },
            { 'prefix': [ '04' ], city: 'FRANCIA Z4', zone: [ [], [], [ 4 ] ] },
            { 'prefix': [ '06' ], city: 'FRANCIA Z5', zone: [ [], [], [ 5 ] ] },
            { 'prefix': [ '09','65' ], city: 'FRANCIA Z6', zone: [ [], [], [ 6 ] ] },
            { 'prefix': [ '10' ], city: 'FRANCIA Z7', zone: [ [], [], [ 7 ] ] },
            { 'prefix': [ '11','32','81' ], city: 'FRANCIA Z8', zone: [ [], [], [ 8 ] ] },
            { 'prefix': [ '12','34','40','46','47' ], city: 'FRANCIA Z9', zone: [ [], [], [ 9 ] ] },
            { 'prefix': [ '13' ], city: 'FRANCIA Z10', zone: [ [], [], [ 10 ] ] },
            { 'prefix': [ '14','50' ], city: 'FRANCIA Z11', zone: [ [], [], [ 11 ] ] },
            { 'prefix': [ '15','21','48' ], city: 'FRANCIA Z12', zone: [ [], [], [ 12 ] ] },
            { 'prefix': [ '16' ], city: 'FRANCIA Z13', zone: [ [], [], [ 13 ] ] },
            { 'prefix': [ '17','24' ], city: 'FRANCIA Z14', zone: [ [], [], [ 14 ] ] },
            { 'prefix': [ '18','28','41' ], city: 'FRANCIA Z15', zone: [ [], [], [ 15 ] ] },
            { 'prefix': [ '19','87' ], city: 'FRANCIA Z16', zone: [ [], [], [ 16 ] ] },
            { 'prefix': [ '20' ], city: 'FRANCIA Z17', zone: [ [], [], [ 17 ] ] },
            { 'prefix': [ '22','29' ], city: 'FRANCIA Z18', zone: [ [], [], [ 18 ] ] },
            { 'prefix': [ '23' ], city: 'FRANCIA Z19', zone: [ [], [], [ 19 ] ] },
            { 'prefix': [ '25' ], city: 'FRANCIA Z20', zone: [ [], [], [ 20 ] ] },
            { 'prefix': [ '27','76' ], city: 'FRANCIA Z21', zone: [ [], [], [ 21 ] ] },
            { 'prefix': [ '30' ], city: 'FRANCIA Z22', zone: [ [], [], [ 22 ] ] },
            { 'prefix': [ '31' ], city: 'FRANCIA Z23', zone: [ [], [], [ 23 ] ] },
            { 'prefix': [ '33' ], city: 'FRANCIA Z24', zone: [ [], [], [ 24 ] ] },
            { 'prefix': [ '35','37','49','53','56','72','79','85','86' ], city: 'FRANCIA Z25', zone: [ [], [], [ 25 ] ] },
            { 'prefix': [ '36' ], city: 'FRANCIA Z26', zone: [ [], [], [ 26 ] ] },
            { 'prefix': [ '39','71','73' ], city: 'FRANCIA Z27', zone: [ [], [], [ 27 ] ] },
            { 'prefix': [ '44' ], city: 'FRANCIA Z28', zone: [ [], [], [ 28 ] ] },
            { 'prefix': [ '45' ], city: 'FRANCIA Z29', zone: [ [], [], [ 29 ] ] },
            { 'prefix': [ '51','89' ], city: 'FRANCIA Z30', zone: [ [], [], [ 30 ] ] },
            { 'prefix': [ '52' ], city: 'FRANCIA Z31', zone: [ [], [], [ 31 ] ] },
            { 'prefix': [ '54','88' ], city: 'FRANCIA Z32', zone: [ [], [], [ 32 ] ] },
            { 'prefix': [ '55' ], city: 'FRANCIA Z33', zone: [ [], [], [ 33 ] ] },
            { 'prefix': [ '57','68','90' ], city: 'FRANCIA Z34', zone: [ [], [], [ 34 ] ] },
            { 'prefix': [ '58' ], city: 'FRANCIA Z35', zone: [ [], [], [ 35 ] ] },
            { 'prefix': [ '59' ], city: 'FRANCIA Z36', zone: [ [], [], [ 36 ] ] },
            { 'prefix': [ '60' ], city: 'FRANCIA Z37', zone: [ [], [], [ 37 ] ] },
            { 'prefix': [ '61' ], city: 'FRANCIA Z38', zone: [ [], [], [ 38 ] ] },
            { 'prefix': [ '62','80' ], city: 'FRANCIA Z39', zone: [ [], [], [ 39 ] ] },
            { 'prefix': [ '64','66' ], city: 'FRANCIA Z40', zone: [ [], [], [ 40 ] ] },
            { 'prefix': [ '67' ], city: 'FRANCIA Z41', zone: [ [], [], [ 41 ] ] },
            { 'prefix': [ '69' ], city: 'FRANCIA Z42', zone: [ [], [], [ 42 ] ] },
            { 'prefix': [ '70' ], city: 'FRANCIA Z43', zone: [ [], [], [ 43 ] ] },
            { 'prefix': [ '75','91','92',' 93','94' ], city: 'FRANCIA Z44', zone: [ [], [], [ 44 ] ] },
            { 'prefix': [ '77','78','95' ], city: 'FRANCIA Z45', zone: [ [], [], [ 45 ] ] },
            { 'prefix': [ '82' ], city: 'FRANCIA Z46', zone: [ [], [], [ 46 ] ] },
            { 'prefix': [ '83' ], city: 'FRANCIA Z47', zone: [ [], [], [ 47 ] ] },
            { 'prefix': [ '84' ], city: 'FRANCIA Z48', zone: [ [], [], [ 48 ] ] },
            { 'prefix': [ '98' ], city: 'FRANCIA Z49', zone: [ [], [], [ 49 ] ] },
        ]
    },
    'pricesByZone': {
        'CBL': {
            '1': { '5': 5.03, '10': 6.10, '20': 7.81, '30': 8.26, '40': 9.52, '50': 9.82, '60': 10.83, '70': 12.08, '80': 13.50, '90': 15.03, '100': 16.52, '150': 21.69, '200': 29.39, '250': 30.54, '300': 33.58, '500': 0.129, '750': 0.125, '1000': 0.107, '3000': 0.102, 'max': 0.098 },
            '2': { '5': 5.55, '10': 6.54, '20': 8.26, '30': 8.76, '40': 9.66, '50': 10.51, '60': 10.91, '70': 12.95, '80': 14.95, '90': 16.76, '100': 18.67, '150': 23.35, '200': 31.51, '250': 36.93, '300': 39.73, '500': 0.151, '750': 0.134, '1000': 0.118, '3000': 0.115, 'max': 0.109 },
            '3': { '5': 6.30, '10': 7.42, '20': 8.35, '30': 9.12, '40': 9.69, '50': 10.74, '60': 11.08, '70': 13.02, '80': 15.10, '90': 16.92, '100': 18.76, '150': 23.51, '200': 31.55, '250': 39.52, '300': 46.59, '500': 0.164, '750': 0.151, '1000': 0.141, '3000': 0.134, 'max': 0.131 },
            '4': { '5': 7.05, '10': 8.30, '20': 9.31, '30': 9.98, '40': 11.31, '50': 13.12, '60': 14.41, '70': 16.28, '80': 17.91, '90': 19.93, '100': 21.60, '150': 27.61, '200': 37.07, '250': 41.31, '300': 49.44, '500': 0.174, '750': 0.158, '1000': 0.146, '3000': 0.137, 'max': 0.131 },
            '5': { '5': 7.47, '10': 8.79, '20': 9.76, '30': 10.57, '40': 12.91, '50': 15.66, '60': 17.59, '70': 21.08, '80': 22.21, '90': 24.59, '100': 27.16, '150': 30.20, '200': 39.73, '250': 44.94, '300': 54.38, '500': 0.199, '750': 0.183, '1000': 0.174, '3000': 0.164, 'max': 0.154 },
            '6': { '5': 8.16, '10': 9.53, '20': 11.23, '30': 12.10, '40': 14.78, '50': 17.88, '60': 20.12, '70': 24.01, '80': 25.39, '90': 28.16, '100': 31.05, '150': 40.85, '200': 51.12, '250': 52.35, '300': 60.14, '500': 0.205, '750': 0.191, '1000': 0.180, '3000': 0.171, 'max': 0.162 },
            '7': { '5': 14.13, '10': 14.13, '20': 15.70, '30': 20.16, '40': 24.58, '50': 29.83, '60': 33.50, '70': 40.13, '80': 42.29, '90': 44.90, '100': 48.28, '150': 51.76, '200': 66.23, '250': 71.32, '300': 84.18, '500': 0.293, '750': 0.274, '1000': 0.261, '3000': 0.247, 'max': 0.229 },
            '8': { '5': 14.48, '10': 14.48, '20': 17.71, '30': 23.57, '40': 28.74, '50': 32.97, '60': 36.50, '70': 39.92, '80': 43.52, '90': 47.24, '100': 51.05, '150': 66.47, '200': 83.23, '250': 93.00, '300': 102.25, '500': 0.347, '750': 0.327, '1000': 0.308, '3000': 0.292, 'max': 0.272 },
            '9': { '5': 18.88, '10': 18.88, '20': 25.00, '30': 31.99, '40': 38.05, '50': 43.89, '60': 49.89, '70': 56.48, '80': 62.57, '90': 68.22, '100': 73.35, '150': 102.68, '200': 127.12, '250': 152.78, '300': 176.02, '500': 0.488, '750': 0.463, '1000': 0.439, '3000': 0.415, 'max': 0.390 },
            '10': { '5': 40.34, '10': 40.34, '20': 43.66, '30': 48.96, '40': 52.55, '50': 60.21, '60': 62.04, '70': 67.76, '80': 74.96, '90': 80.88, '100': 87.15, '150': 118.24, '200': 136.52, '250': 151.80, '300': 170.73, '500': 0.510, '750': 0.489, '1000': 0.465, '3000': 0.477, 'max': 0.477 },
            '11': { '5': 63.20, '10': 63.20, '20': 66.07, '30': 67.88, '40': 68.91, '50': 70.71, '60': 71.75, '70': 73.23, '80': 74.59, '90': 75.88, '100': 77.42, '150': 86.36, '200': 98.70, '250': 105.77, '300': 111.02, '500': 0.268, '750': 0.166, '1000': 0.158, '3000': 0.143, 'max': 0.143 }
        },
        'SEUR': {}, // LOADED USING THE XLSX
        'SALVAT': {} // LOADED USING THE XLSX
    }
};

const onLoad = () => {
    xlsx_loaded++;
    if( xlsx_loaded === 3 )
    {
        Data.ready = true;
        console.log("Data ready")
    }
}

LX.requestBinary( "data/salvat.xlsx", (binary) => {
    const workbook = XLSX.read(binary, {type: "binary"});
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[ sheetName ];
    const data = XLSX.utils.sheet_to_json(sheet, { raw: false });
    
    for( let i = 1; i <= 49; ++i )
    {
        const zone = `ZONA ${i}`;
        Data.pricesByZone.SALVAT[ i ] = {};

        for( const row of data )
        {
            const price = row[ zone ];
            if( !price )
                throw( 'Something happened reading SALVAT prices' );
            const kgs = row[ 'KG' ];

            Data.pricesByZone.SALVAT[ i ][ kgs ] = parseFloat( price );
        }
    }

    // console.log(Data.pricesByZone.SALVAT)

    onLoad();
} );

LX.requestBinary( "data/seur.xlsx", (binary) => {
    const workbook = XLSX.read(binary, {type: "binary"});
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[ sheetName ];
    const data = XLSX.utils.sheet_to_json(sheet, { raw: false });

    for( let i = 1; i <= 7; ++i )
    {
        Data.pricesByZone.SEUR[ i ] = {};

        for( const row of data )
        {
            const price = row[ i ];
            if( !price )
                throw( 'Something happened reading SALVAT prices' );
            const kgs = row[ 'Kilos' ];

            Data.pricesByZone.SEUR[ i ][ kgs ] = parseFloat( price );
        }
    }

    // console.log(Data.pricesByZone.SEUR)

    onLoad();

} );

LX.requestBinary( "data/products.xlsx", (binary) => {
    const workbook = XLSX.read(binary, {type: "binary"});
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[ sheetName ];
    const data = XLSX.utils.sheet_to_json(sheet, { raw: false });

    for( const p of data )
    {
        if( !p['GROSOR'] )
        {
            continue;
        }

        // Default values
        p['ANCHO'] = parseFloat( p['ANCHO'] ?? 0 ) / 100;
        p['GROSOR'] = parseFloat( p['GROSOR'] ?? 0 ) / 100;
        p['LARGO'] = parseFloat( p['LARGO'] ?? 0 ) / 100;
        p['PESO'] = parseFloat( p['PESO'] ?? 0 );
        p['UDS./BULTO'] = parseFloat( p['UDS./BULTO'] ?? 0 );
        p['EXCLUIR'] = !!parseFloat( p['EXCLUIR'] ?? 0 );

        // Remove prefix and store
        const ogSku = p['CÓDIGO'];
        p['CÓDIGO'] = ogSku.substring( ogSku.indexOf( '-' ) + 1 );

        Data.sku[ p['CÓDIGO'] ] = p;
    }

    // console.log(Data.sku)

    onLoad();

} );

export { Data };
