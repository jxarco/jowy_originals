const Data = {
    xlsx_loaded: 0,
    ready: false,
    sku: {}, // LOADED USING THE XLSX,
    sku_map: {}, // LOADED USING THE XLSX,
    zoneRules: {
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
            { 'prefix': [ '03', '05', '07', '26', '74' ], city: 'FRANCIA Z3', zone: [ [], [], [ 3 ] ] },
            { 'prefix': [ '04' ], city: 'FRANCIA Z4', zone: [ [], [], [ 4 ] ] },
            { 'prefix': [ '06' ], city: 'FRANCIA Z5', zone: [ [], [], [ 5 ] ] },
            { 'prefix': [ '09', '65' ], city: 'FRANCIA Z6', zone: [ [], [], [ 6 ] ] },
            { 'prefix': [ '10' ], city: 'FRANCIA Z7', zone: [ [], [], [ 7 ] ] },
            { 'prefix': [ '11', '32', '81' ], city: 'FRANCIA Z8', zone: [ [], [], [ 8 ] ] },
            { 'prefix': [ '12', '34', '40', '46', '47' ], city: 'FRANCIA Z9', zone: [ [], [], [ 9 ] ] },
            { 'prefix': [ '13' ], city: 'FRANCIA Z10', zone: [ [], [], [ 10 ] ] },
            { 'prefix': [ '14', '50' ], city: 'FRANCIA Z11', zone: [ [], [], [ 11 ] ] },
            { 'prefix': [ '15', '21', '48' ], city: 'FRANCIA Z12', zone: [ [], [], [ 12 ] ] },
            { 'prefix': [ '16' ], city: 'FRANCIA Z13', zone: [ [], [], [ 13 ] ] },
            { 'prefix': [ '17', '24' ], city: 'FRANCIA Z14', zone: [ [], [], [ 14 ] ] },
            { 'prefix': [ '18', '28', '41' ], city: 'FRANCIA Z15', zone: [ [], [], [ 15 ] ] },
            { 'prefix': [ '19', '87' ], city: 'FRANCIA Z16', zone: [ [], [], [ 16 ] ] },
            { 'prefix': [ '20' ], city: 'FRANCIA Z17', zone: [ [], [], [ 17 ] ] },
            { 'prefix': [ '22', '29' ], city: 'FRANCIA Z18', zone: [ [], [], [ 18 ] ] },
            { 'prefix': [ '23' ], city: 'FRANCIA Z19', zone: [ [], [], [ 19 ] ] },
            { 'prefix': [ '25' ], city: 'FRANCIA Z20', zone: [ [], [], [ 20 ] ] },
            { 'prefix': [ '27', '76' ], city: 'FRANCIA Z21', zone: [ [], [], [ 21 ] ] },
            { 'prefix': [ '30' ], city: 'FRANCIA Z22', zone: [ [], [], [ 22 ] ] },
            { 'prefix': [ '31' ], city: 'FRANCIA Z23', zone: [ [], [], [ 23 ] ] },
            { 'prefix': [ '33' ], city: 'FRANCIA Z24', zone: [ [], [], [ 24 ] ] },
            { 'prefix': [ '35', '37', '49', '53', '56', '72', '79', '85', '86' ], city: 'FRANCIA Z25', zone: [ [], [], [ 25 ] ] },
            { 'prefix': [ '36' ], city: 'FRANCIA Z26', zone: [ [], [], [ 26 ] ] },
            { 'prefix': [ '39', '71', '73' ], city: 'FRANCIA Z27', zone: [ [], [], [ 27 ] ] },
            { 'prefix': [ '44' ], city: 'FRANCIA Z28', zone: [ [], [], [ 28 ] ] },
            { 'prefix': [ '45' ], city: 'FRANCIA Z29', zone: [ [], [], [ 29 ] ] },
            { 'prefix': [ '51', '89' ], city: 'FRANCIA Z30', zone: [ [], [], [ 30 ] ] },
            { 'prefix': [ '52' ], city: 'FRANCIA Z31', zone: [ [], [], [ 31 ] ] },
            { 'prefix': [ '54', '88' ], city: 'FRANCIA Z32', zone: [ [], [], [ 32 ] ] },
            { 'prefix': [ '55' ], city: 'FRANCIA Z33', zone: [ [], [], [ 33 ] ] },
            { 'prefix': [ '57', '68', '90' ], city: 'FRANCIA Z34', zone: [ [], [], [ 34 ] ] },
            { 'prefix': [ '58' ], city: 'FRANCIA Z35', zone: [ [], [], [ 35 ] ] },
            { 'prefix': [ '59' ], city: 'FRANCIA Z36', zone: [ [], [], [ 36 ] ] },
            { 'prefix': [ '60' ], city: 'FRANCIA Z37', zone: [ [], [], [ 37 ] ] },
            { 'prefix': [ '61' ], city: 'FRANCIA Z38', zone: [ [], [], [ 38 ] ] },
            { 'prefix': [ '62', '80' ], city: 'FRANCIA Z39', zone: [ [], [], [ 39 ] ] },
            { 'prefix': [ '64', '66' ], city: 'FRANCIA Z40', zone: [ [], [], [ 40 ] ] },
            { 'prefix': [ '67' ], city: 'FRANCIA Z41', zone: [ [], [], [ 41 ] ] },
            { 'prefix': [ '69' ], city: 'FRANCIA Z42', zone: [ [], [], [ 42 ] ] },
            { 'prefix': [ '70' ], city: 'FRANCIA Z43', zone: [ [], [], [ 43 ] ] },
            { 'prefix': [ '75', '91', '92', ' 93', '94' ], city: 'FRANCIA Z44', zone: [ [], [], [ 44 ] ] },
            { 'prefix': [ '77', '78', '95' ], city: 'FRANCIA Z45', zone: [ [], [], [ 45 ] ] },
            { 'prefix': [ '82' ], city: 'FRANCIA Z46', zone: [ [], [], [ 46 ] ] },
            { 'prefix': [ '83' ], city: 'FRANCIA Z47', zone: [ [], [], [ 47 ] ] },
            { 'prefix': [ '84' ], city: 'FRANCIA Z48', zone: [ [], [], [ 48 ] ] },
            { 'prefix': [ '98' ], city: 'FRANCIA Z49', zone: [ [], [], [ 49 ] ] }
        ]
    },
    pricesByZone: {
        'CBL': {}, // LOADED USING THE XLSX
        'SEUR': {}, // LOADED USING THE XLSX
        'SALVAT': {} // LOADED USING THE XLSX
    },
    load: function( callback ) {

        this.callback = callback;

        LX.requestBinary( 'data/cbl.xlsx', ( binary ) => {
            const workbook = XLSX.read( binary, { type: 'binary' } );
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json( sheet, { raw: false } );

            for ( let i = 1; i <= 11; ++i )
            {
                const zone = `${i}`;
                this.pricesByZone.CBL[i] = {};

                for ( const row of data )
                {
                    const price = row[zone];
                    if ( !price )
                    {
                        throw ( 'Something happened reading CBL prices' );
                    }
                    const kgs = row['KG'];

                    this.pricesByZone.CBL[i][kgs] = parseFloat( price );
                }
            }

            // console.log(this.pricesByZone.CBL)

            this.onLoad();
        } );
        LX.requestBinary( 'data/salvat.xlsx', ( binary ) => {
            const workbook = XLSX.read( binary, { type: 'binary' } );
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json( sheet, { raw: false } );

            for ( let i = 1; i <= 49; ++i )
            {
                const zone = `ZONA ${i}`;
                this.pricesByZone.SALVAT[i] = {};

                for ( const row of data )
                {
                    const price = row[zone];
                    if ( !price )
                    {
                        throw ( 'Something happened reading SALVAT prices' );
                    }
                    const kgs = row['KG'];

                    this.pricesByZone.SALVAT[i][kgs] = parseFloat( price );
                }
            }

            // console.log(this.pricesByZone.SALVAT)

            this.onLoad();
        } );
        LX.requestBinary( 'data/seur.xlsx', ( binary ) => {
            const workbook = XLSX.read( binary, { type: 'binary' } );
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json( sheet, { raw: false } );

            for ( let i = 1; i <= 7; ++i )
            {
                this.pricesByZone.SEUR[i] = {};

                for ( const row of data )
                {
                    const price = row[i];
                    if ( !price )
                    {
                        throw ( 'Something happened reading SALVAT prices' );
                    }
                    const kgs = row['Kilos'];

                    this.pricesByZone.SEUR[i][kgs] = parseFloat( price );
                }
            }

            // console.log(this.pricesByZone.SEUR)

            this.onLoad();
        } );
        LX.requestBinary( 'data/products.xlsx', ( binary ) => {
            const workbook = XLSX.read( binary, { type: 'binary' } );

            // MEDIDAS
            {
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const data = XLSX.utils.sheet_to_json( sheet, { raw: false } );

                for ( const p of data )
                {
                    if ( !p['GROSOR'] )
                    {
                        continue;
                    }

                    // Default values
                    p['ANCHO'] = parseFloat( p['ANCHO'] ?? 0 ) / 100;
                    p['GROSOR'] = parseFloat( p['GROSOR'] ?? 0 ) / 100;
                    p['LARGO'] = parseFloat( p['LARGO'] ?? 0 ) / 100;
                    p['PESO'] = parseFloat( p['PESO'] ?? 0 );
                    p['UDS./BULTO'] = parseFloat( p['UDS./BULTO'] ?? 1 );
                    p['EXCLUIR'] = !!parseFloat( p['EXCLUIR'] ?? 0 );

                    // Remove prefix and store
                    // const ogSku = p['CÓDIGO'];
                    // p['CÓDIGO'] = ogSku.substring( ogSku.indexOf( '-' ) + 1 );

                    this.sku[p['CÓDIGO']] = p;
                }

                // console.log(this.sku)
            }

            // SKU MAP
            {
                const sheetName = workbook.SheetNames[1];
                const sheet = workbook.Sheets[sheetName];
                const data = XLSX.utils.sheet_to_json( sheet, { raw: true } );

                for ( const p of data )
                {
                    const oldSku = p['platform_sku'];
                    if ( !oldSku )
                    {
                        continue;
                    }

                    const newSkuText = p['excel_sku'];
                    const newSku = newSkuText ? newSkuText.trim().split( ',' ).map( ( s ) => s.trim() ) : undefined;
                    const priceDistribution = p['price_distr'];

                    this.sku_map[oldSku.toString().trim()] = {
                        skus: newSku,
                        prices: priceDistribution ? priceDistribution.trim().split( ',' ).map( ( s ) => parseFloat( s.trim() ) ) : 
                            ( newSku?.length ? newSku.map( v => 1.0 / newSku.length ) : undefined ),
                        quantity: parseInt( p['quantity'] ?? 1 )
                    };
                }

                // console.log(this.sku_map)
            }

            this.onLoad();
        } );
    },
    onLoad: function() {
        this.xlsx_loaded++;
        if ( this.xlsx_loaded === 4 )
        {
            this.ready = true;
            console.log( 'XLSX data ready!' );
            if( this.callback )
            {
                this.callback( this );
            }
        }
    }
};

window.Data = Data;

export { Data };
