export const Data = {
    "sku": {
        "PEPE": { "thickness": 2 },
        "NOEL": { "thickness": 2.5 },
        "TRES": { "thickness": 3 },
        "GORDITO": { "thickness": 4 },
        "ANTONIO": { "weight": 1.5 }
    },
    "zoneRules": {
        "España": [
            { "prefix": "1120", city: "ALGECIRAS", zone: [6] },
            { "prefix": "04", city: "ALMERIA", zone: [6] },
            { "prefix": "11", city: "CADIZ", zone: [6] },
            { "prefix": "14", city: "CORDOBA", zone: [6] },
            { "prefix": "18", city: "GRANADA", zone: [6] },
            { "prefix": "21", city: "HUELVA", zone: [6] },
            { "prefix": "23", city: "JAEN", zone: [6] },
            { "prefix": "1140", city: "JEREZ", zone: [6] },
            { "prefix": "29", city: "MALAGA", zone: [6] },
            { "prefix": "41", city: "SEVILLA", zone: [6] },
            { "prefix": "22", city: "HUESCA", zone: [5] },
            { "prefix": "44", city: "TERUEL", zone: [6] },
            { "prefix": "50", city: "ZARAGOZA", zone: [3] },
            { "prefix": "", city: "GIJON", zone: [5] },
            { "prefix": "", city: "OVIEDO", zone: [5] },
            { "prefix": "39", city: "SANTANDER", zone: [5] },
            { "prefix": "02", city: "ALBACETE", zone: [5] },
            { "prefix": "13", city: "CIUDAD REAL", zone: [5] },
            { "prefix": "16", city: "CUENCA", zone: [6] },
            { "prefix": "19", city: "GUADALAJARA", zone: [5] },
            { "prefix": "45", city: "TOLEDO", zone: [5] },
            { "prefix": "05", city: "AVILA", zone: [6] },
            { "prefix": "09", city: "BURGOS", zone: [4] },
            { "prefix": "24", city: "LEON", zone: [5] },
            { "prefix": "47400", city: "MEDINA", zone: [5] },
            { "prefix": "34", city: "PALENCIA", zone: [5] },
            { "prefix": "37", city: "SALAMANCA", zone: [5] },
            { "prefix": "40", city: "SEGOVIA", zone: [6] },
            { "prefix": "42", city: "SORIA", zone: [6] },
            { "prefix": "47", city: "VALLADOLID", zone: [5] },
            { "prefix": "49", city: "ZAMORA", zone: [6] },
            { "prefix": "08", city: "BARCELONA", zone: [1] },
            { "prefix": "17", city: "GERONA", zone: [2] },
            { "prefix": "25", city: "LERIDA", zone: [2] },
            { "prefix": "43", city: "TARRAGONA", zone: [2] },
            { "prefix": "06", city: "BADAJOZ", zone: [6] },
            { "prefix": "10", city: "CACERES", zone: [6] },
            { "prefix": "06800", city: "MERIDA", zone: [6] },
            { "prefix": "15", city: "LA CORUÑA", zone: [6] },
            { "prefix": "27", city: "LUGO", zone: [6] },
            { "prefix": "32", city: "ORENSE", zone: [6] },
            { "prefix": "", city: "SANTIAGO", zone: [6] },
            { "prefix": "", city: "VIGO", zone: [6] },
            { "prefix": "26", city: "LOGROÑO", zone: [4] },
            { "prefix": "03", city: "ALICANTE", zone: [4] },
            { "prefix": "12", city: "CASTELLON", zone: [3] },
            { "prefix": "46", city: "VALENCIA", zone: [3] },
            { "prefix": "28", city: "MADRID", zone: [5] },
            { "prefix": "30", city: "MURCIA", zone: [5] },
            { "prefix": "31", city: "PAMPLONA", zone: [4] },
            { "prefix": "48", city: "BILBAO", zone: [4] },
            { "prefix": "20500", city: "MONDRAGON", zone: [4] },
            { "prefix": "20", city: "SAN SEBASTIAN", zone: [4] },
            { "prefix": "01", city: "VITORIA", zone: [4] },
            { "prefix": "", city: "MALLORCA", zone: [7] }, // 07
            { "prefix": "", city: "MENORCA", zone: [7] }, // 07
            { "prefix": "", city: "IBIZA", zone: [7] }, // 07
            // ESPECIALES
            { "prefix": "AD", city: "ANDORRA", zone: [7] },
            { "prefix": "51", city: "CEUTA", zone: [6, 10] },
            { "prefix": "52", city: "MELILLA", zone: [6, 10] },
            { "prefix": "GX", city: "GIBRALTAR", zone: [6, 11] },
        ],
        "Portugal": [
            { "prefix": "", city: "CP_1_49", zone: [8] },
            { "prefix": "", city: "CP_50_89", zone: [9] },
            { "prefix": "", city: "ISLAS", zone: [9, 10] },
        ],
        "Francia": [

        ]
    },
    "pricesByZone": {
        "1": {
            5: 4.84, 10: 5.86, 20: 7.51, 30: 7.94, 40: 9.15, 50: 9.45,
            60: 10.41, 70: 11.61, 80: 12.98, 90: 14.46, 100: 15.88,
            150: 20.85, 200: 28.26, 250: 29.37, 300: 32.29
        },
        "2": {
            5: 5.34, 10: 6.28, 20: 7.94, 30: 8.43, 40: 9.29, 50: 10.11,
            60: 10.49, 70: 12.45, 80: 14.38, 90: 16.11, 100: 17.95,
            150: 22.45, 200: 30.30, 250: 35.51, 300: 38.20
        },
        "3": {
            5: 6.05, 10: 7.14, 20: 8.03, 30: 8.77, 40: 9.32, 50: 10.33,
            60: 10.66, 70: 12.52, 80: 14.52, 90: 16.27, 100: 18.04,
            150: 22.60, 200: 30.34, 250: 38.00, 300: 44.79
        },
        "4": {
            5: 6.78, 10: 7.98, 20: 8.95, 30: 9.60, 40: 10.87, 50: 12.62,
            60: 13.86, 70: 15.65, 80: 17.22, 90: 19.16, 100: 20.77,
            150: 26.55, 200: 35.64, 250: 39.72, 300: 47.54
        },
        "5": {
            5: 7.18, 10: 8.45, 20: 9.38, 30: 10.16, 40: 12.42, 50: 15.05,
            60: 16.92, 70: 20.27, 80: 21.35, 90: 23.65, 100: 26.12,
            150: 29.04, 200: 38.20, 250: 43.21, 300: 52.29
        },
        "6": {
            5: 7.85, 10: 9.17, 20: 10.80, 30: 11.64, 40: 14.21, 50: 17.20,
            60: 19.35, 70: 23.09, 80: 24.41, 90: 27.08, 100: 29.85,
            150: 39.27, 200: 49.15, 250: 50.34, 300: 57.82
        },
        "7": {
            5: 13.59, 10: 13.59, 20: 15.09, 30: 19.39, 40: 23.63, 50: 28.68,
            60: 32.21, 70: 38.59, 80: 40.66, 90: 43.18, 100: 46.43,
            150: 49.77, 200: 63.69, 250: 68.58, 300: 80.95
        },
        "8": {
            5: 13.92, 10: 13.92, 20: 17.03, 30: 22.66, 40: 27.64, 50: 31.70,
            60: 35.09, 70: 38.38, 80: 41.85, 90: 45.42, 100: 49.09,
            150: 63.92, 200: 80.03, 250: 89.42, 300: 98.32
        },
        "9": {
            5: 18.15, 10: 18.15, 20: 24.04, 30: 30.76, 40: 36.59, 50: 42.21,
            60: 47.97, 70: 54.30, 80: 60.17, 90: 65.60, 100: 70.53,
            150: 98.73, 200: 122.23, 250: 146.90, 300: 169.25
        }
    }
};