var CONSTANTES = {
    CALIBRES: ['14','12','10','8','6','4','2','1','1/0','2/0','3/0','4/0','250','300','350','400','500','600','750','1000'],
    CAPACIDADES_KA: [5, 10, 14, 18, 22, 25, 30, 35, 42, 50, 65, 85, 100, 125, 150, 200],
    FACTOR_AL_COBRE: 1.64,
    XR_FUENTE_DEFAULT: 15,
    MAX_FEEDERS: 8,
    MAX_PARALELO: 8,
    MAX_MOTORES: 5,
    CAIDA_MAXIMA_ALIMENTADOR: 3,
    CAIDA_MAXIMA_TOTAL: 5,
    TEMP_CONDUCTOR_CORTO: 75,
    TEMP_CONDUCTOR_CARGA: 75,
    TEMP_AMBIENTE_DEFAULT: 30,
    
    /* NEC Tabla 310-15(g) - Factores de ajuste para más de 3 conductores */
    FACTOR_CONDUCTORES: {
        '0-3': 1.0,
        '4-6': 0.8,
        '7-9': 0.7,
        '10-20': 0.5,
        '21-30': 0.45,
        '31-40': 0.4,
        '41+': 0.35,
        'default': 0.8
    },
    
    /* NEC Tabla 310-16 - Capacidad de conducción de corriente (A) */
    AMPACIDAD_CU: {
        '60': { // 60°C
            '14': 15, '12': 20, '10': 30, '8': 40, '6': 55, '4': 70, '3': 85, '2': 95,
            '1': 110, '1/0': 125, '2/0': 145, '3/0': 165, '4/0': 195, '250': 215,
            '300': 240, '350': 260, '400': 280, '500': 320, '600': 355, '700': 385,
            '750': 400, '800': 410, '900': 435, '1000': 455, '1250': 495, '1500': 520,
            '1750': 545, '2000': 560
        },
        '75': { // 75°C
            '14': 15, '12': 20, '10': 30, '8': 40, '6': 55, '4': 75, '3': 100, '2': 115,
            '1': 130, '1/0': 150, '2/0': 175, '3/0': 200, '4/0': 230, '250': 290,
            '300': 285, '350': 310, '400': 335, '500': 380, '600': 420, '700': 460,
            '750': 475, '800': 490, '900': 520, '1000': 545, '1250': 590, '1500': 625,
            '1750': 650, '2000': 665
        },
        '90': { // 90°C
            '14': 25, '12': 30, '10': 40, '8': 55, '6': 75, '4': 95, '3': 110, '2': 130,
            '1': 150, '1/0': 170, '2/0': 195, '3/0': 225, '4/0': 260, '250': 290,
            '300': 320, '350': 350, '400': 380, '500': 430, '600': 475, '700': 520,
            '750': 535, '800': 555, '900': 585, '1000': 615, '1250': 665, '1500': 705,
            '1750': 735, '2000': 750
        }
    },
    
    AMPACIDAD_AL: {
        '60': { // 60°C
            '6': 40, '4': 55, '3': 65, '2': 75, '1': 85, '1/0': 100, '2/0': 115,
            '3/0': 130, '4/0': 150, '250': 170, '300': 190, '350': 210, '400': 225,
            '500': 260, '600': 285, '700': 310, '750': 320, '800': 330, '900': 355,
            '1000': 375, '1250': 405, '1500': 435, '1750': 455, '2000': 470
        },
        '75': { // 75°C
            '6': 50, '4': 65, '3': 75, '2': 90, '1': 100, '1/0': 120, '2/0': 135,
            '3/0': 155, '4/0': 180, '250': 205, '300': 230, '350': 250, '400': 270,
            '500': 310, '600': 340, '700': 375, '750': 385, '800': 395, '900': 425,
            '1000': 445, '1250': 485, '1500': 520, '1750': 545, '2000': 560
        },
        '90': { // 90°C
            '6': 60, '4': 75, '3': 85, '2': 100, '1': 115, '1/0': 135, '2/0': 150,
            '3/0': 175, '4/0': 205, '250': 230, '300': 255, '350': 280, '400': 305,
            '500': 350, '600': 385, '700': 420, '750': 435, '800': 450, '900': 480,
            '1000': 500, '1250': 545, '1500': 585, '1750': 615, '2000': 630
        }
    },
    
    /* Factores de corrección por temperatura ambiente (NEC Tabla 310-16) */
    FACTOR_TEMPERATURA: {
        '21-25': { '60': 1.08, '75': 1.05, '90': 1.04 },
        '26-30': { '60': 1.0, '75': 1.0, '90': 1.0 },
        '31-35': { '60': 0.91, '75': 0.94, '90': 0.96 },
        '36-40': { '60': 0.82, '75': 0.88, '90': 0.91 },
        '41-45': { '60': 0.71, '75': 0.82, '90': 0.87 },
        '46-50': { '60': 0.58, '75': 0.75, '90': 0.82 },
        '51-55': { '60': 0.41, '75': 0.67, '90': 0.76 },
        '56-60': { '60': 0, '75': 0.58, '90': 0.71 },
        '61-70': { '60': 0, '75': 0.33, '90': 0.58 },
        '71-80': { '60': 0, '75': 0, '90': 0.41 },
        'default': 0.91 // Puerto Vallarta default (31-35°C)
    },
    
    /* Regla de temperatura de conductor por corriente nominal */
    TEMP_CONDUCTOR_POR_CORRIENTE: 100, // <100A usa 60°C, >=100A usa 75°C
    /* Fase 5: Factores para secuencia cero */
    FACTOR_R0_NEUTRO: 2,           // R0 = R1 * 2 (neutro mismo calibre)
    FACTOR_Z0_FUENTE: 1.0,         // Z0_fuente = Z1_fuente (red CFE, Yg solido)
    FACTOR_Z0_TRAFO_YG: 1.0,        // Z0_trafo = Z_trafo para Yg solido
    FACTOR_Z0_TRAFO_YG_R: 3.0,       // Factor adicional para Yg con resistencia de neutro
    Z0_CONFIG_DEFAULT: 'plano_acero', // Configuracion por defecto para X0
    /* Capacidades comerciales de transformadores en México (kVA) */
    CAPACIDADES_TRAFO_KVA: [
        15, 30, 45, 75, 112.5, 150, 225, 300, 500, 750, 1000, 1500, 2000, 2500, 3000, 3750, 5000, 7500, 10000, 15000, 20000, 25000, 30000, 37500, 50000, 75000, 100000
    ],
    /* Datos de zonas eléctricas de México - Corrientes de cortocircuito típicas en MEDIA TENSIÓN */
    ZONAS_ELECTRICAS: {
        'CDMX': {
            nombre: 'Ciudad de México - Zona Metropolitana',
            v_primario: 23000,
            isc_primario: 28.0,
            xr_típico: 12,
            tipo: 'utility',
            confiabilidad: 'alta',
            isc_mínimo: 22.0,
            isc_máximo: 35.0,
            descripción: 'Red robusta con alta densidad de carga (23 kV)'
        },
        'MONTERREY': {
            nombre: 'Monterrey - Nuevo León',
            v_primario: 23000,
            isc_primario: 25.0,
            xr_típico: 12,
            tipo: 'utility',
            confiabilidad: 'alta',
            isc_mínimo: 20.0,
            isc_máximo: 30.0,
            descripción: 'Zona industrial con red fuerte (23 kV)'
        },
        'GUADALAJARA': {
            nombre: 'Guadalajara - Jalisco',
            v_primario: 23000,
            isc_primario: 22.0,
            xr_típico: 15,
            tipo: 'utility',
            confiabilidad: 'alta',
            isc_mínimo: 18.0,
            isc_máximo: 26.0,
            descripción: 'Red urbana consolidada (23 kV)'
        },
        'PUEBLA': {
            nombre: 'Puebla - Tlaxcala',
            v_primario: 23000,
            isc_primario: 20.0,
            xr_típico: 15,
            tipo: 'utility',
            confiabilidad: 'media',
            isc_mínimo: 16.0,
            isc_máximo: 24.0,
            descripción: 'Red industrial en desarrollo (23 kV)'
        },
        'LEON': {
            nombre: 'León - Guanajuato',
            v_primario: 23000,
            isc_primario: 18.0,
            xr_típico: 18,
            tipo: 'utility',
            confiabilidad: 'media',
            isc_mínimo: 14.0,
            isc_máximo: 22.0,
            descripción: 'Zona industrial mediana (23 kV)'
        },
        'TIJUANA': {
            nombre: 'Tijuana - Baja California',
            v_primario: 23000,
            isc_primario: 16.0,
            xr_típico: 18,
            tipo: 'utility',
            confiabilidad: 'media',
            isc_mínimo: 12.0,
            isc_máximo: 20.0,
            descripción: 'Red fronteriza con crecimiento (23 kV)'
        },
        'VERACRUZ': {
            nombre: 'Veracruz - Xalapa',
            v_primario: 23000,
            isc_primario: 15.0,
            xr_típico: 18,
            tipo: 'utility',
            confiabilidad: 'media',
            isc_mínimo: 12.0,
            isc_máximo: 18.0,
            descripción: 'Red portuaria e industrial (23 kV)'
        },
        'MERIDA': {
            nombre: 'Mérida - Yucatán',
            v_primario: 23000,
            isc_primario: 14.0,
            xr_típico: 20,
            tipo: 'utility',
            confiabilidad: 'media',
            isc_mínimo: 11.0,
            isc_máximo: 17.0,
            descripción: 'Red turística y comercial (23 kV)'
        },
        'TORREON': {
            nombre: 'Torreón - La Laguna',
            v_primario: 23000,
            isc_primario: 17.0,
            xr_típico: 18,
            tipo: 'utility',
            confiabilidad: 'media',
            isc_mínimo: 13.0,
            isc_máximo: 21.0,
            descripción: 'Zona agrícola-industrial (23 kV)'
        },
        'QUERETARO': {
            nombre: 'Querétaro - Corregidora',
            v_primario: 23000,
            isc_primario: 19.0,
            xr_típico: 15,
            tipo: 'utility',
            confiabilidad: 'alta',
            isc_mínimo: 15.0,
            isc_máximo: 23.0,
            descripción: 'Zona industrial en expansión (23 kV)'
        },
        'TOLUCA': {
            nombre: 'Toluca - Estado de México',
            v_primario: 23000,
            isc_primario: 21.0,
            xr_típico: 15,
            tipo: 'utility',
            confiabilidad: 'alta',
            isc_mínimo: 17.0,
            isc_máximo: 25.0,
            descripción: 'Red suburbana densa (23 kV)'
        },
        'CULIACAN': {
            nombre: 'Culiacán - Sinaloa',
            v_primario: 23000,
            isc_primario: 13.0,
            xr_típico: 20,
            tipo: 'utility',
            confiabilidad: 'media',
            isc_mínimo: 10.0,
            isc_máximo: 16.0,
            descripción: 'Red agrícola-comercial (23 kV)'
        },
        'HERMOSILLO': {
            nombre: 'Hermosillo - Sonora',
            v_primario: 23000,
            isc_primario: 12.0,
            xr_típico: 20,
            tipo: 'utility',
            confiabilidad: 'media',
            isc_mínimo: 9.0,
            isc_máximo: 15.0,
            descripción: 'Red desértica industrial (23 kV)'
        },
        'VILLAHERMOSA': {
            nombre: 'Villahermosa - Tabasco',
            v_primario: 23000,
            isc_primario: 11.0,
            xr_típico: 20,
            tipo: 'utility',
            confiabilidad: 'media',
            isc_mínimo: 8.0,
            isc_máximo: 14.0,
            descripción: 'Red petrolera y tropical (23 kV)'
        },
        'PVALLARTA': {
            nombre: 'Puerto Vallarta - Jalisco',
            v_primario: 13200,
            isc_primario: 16.0,
            xr_típico: 18,
            tipo: 'utility',
            confiabilidad: 'media',
            isc_mínimo: 12.0,
            isc_máximo: 20.0,
            descripción: 'Red turística 13.2kV en expansión'
        },
        'RURAL': {
            nombre: 'Zona Rural - General',
            v_primario: 13200,
            isc_primario: 8.0,
            xr_típico: 20,
            tipo: 'utility',
            confiabilidad: 'baja',
            isc_mínimo: 5.0,
            isc_máximo: 12.0,
            descripción: 'Red rural con baja densidad (13.2 kV)'
        },
        'CUSTOM': {
            nombre: 'Valor Personalizado',
            v_primario: 13200,
            isc_primario: 10.0,
            xr_típico: 20,
            tipo: 'custom',
            confiabilidad: 'variable',
            isc_mínimo: 5.0,
            isc_máximo: 50.0,
            descripción: 'Ingresar valor manualmente'
        }
    },

    /* Catálogo de Breakers (IEC) para selección automática */
    BREAKERS: [
        // Molded Case Circuit Breakers (MCCB) - 3P
        { modelo: 'MCCB-100', In: 100, Icu: 25, tipo: 'MCCB', polos: 3 },
        { modelo: 'MCCB-125', In: 125, Icu: 25, tipo: 'MCCB', polos: 3 },
        { modelo: 'MCCB-160', In: 160, Icu: 25, tipo: 'MCCB', polos: 3 },
        { modelo: 'MCCB-200', In: 200, Icu: 35, tipo: 'MCCB', polos: 3 },
        { modelo: 'MCCB-250', In: 250, Icu: 35, tipo: 'MCCB', polos: 3 },
        { modelo: 'MCCB-320', In: 320, Icu: 50, tipo: 'MCCB', polos: 3 },
        { modelo: 'MCCB-400', In: 400, Icu: 50, tipo: 'MCCB', polos: 3 },
        { modelo: 'MCCB-500', In: 500, Icu: 65, tipo: 'MCCB', polos: 3 },
        { modelo: 'MCCB-630', In: 630, Icu: 65, tipo: 'MCCB', polos: 3 },
        { modelo: 'MCCB-800', In: 800, Icu: 85, tipo: 'MCCB', polos: 3 },
        { modelo: 'MCCB-1000', In: 1000, Icu: 100, tipo: 'MCCB', polos: 3 },
        { modelo: 'MCCB-1250', In: 1250, Icu: 100, tipo: 'MCCB', polos: 3 },
        { modelo: 'MCCB-1600', In: 1600, Icu: 125, tipo: 'MCCB', polos: 3 },
        // Air Circuit Breakers (ACB) - 3P
        { modelo: 'ACB-2000', In: 2000, Icu: 150, tipo: 'ACB', polos: 3 },
        { modelo: 'ACB-2500', In: 2500, Icu: 150, tipo: 'ACB', polos: 3 },
        { modelo: 'ACB-3200', In: 3200, Icu: 200, tipo: 'ACB', polos: 3 },
        { modelo: 'ACB-4000', In: 4000, Icu: 200, tipo: 'ACB', polos: 3 },
        { modelo: 'ACB-5000', In: 5000, Icu: 250, tipo: 'ACB', polos: 3 },
        { modelo: 'ACB-6300', In: 6300, Icu: 250, tipo: 'ACB', polos: 3 }
    ],

    /* Catálogo de Conductores para selección automática */
    CONDUCTORES: [
        { calibre: '14', material: 'cobre', I_tabla: 25, area: 2.08 },
        { calibre: '12', material: 'cobre', I_tabla: 30, area: 3.31 },
        { calibre: '10', material: 'cobre', I_tabla: 40, area: 5.26 },
        { calibre: '8', material: 'cobre', I_tabla: 55, area: 8.37 },
        { calibre: '6', material: 'cobre', I_tabla: 75, area: 13.3 },
        { calibre: '4', material: 'cobre', I_tabla: 95, area: 21.2 },
        { calibre: '2', material: 'cobre', I_tabla: 130, area: 33.6 },
        { calibre: '1', material: 'cobre', I_tabla: 150, area: 42.4 },
        { calibre: '1/0', material: 'cobre', I_tabla: 170, area: 53.5 },
        { calibre: '2/0', material: 'cobre', I_tabla: 195, area: 67.4 },
        { calibre: '3/0', material: 'cobre', I_tabla: 225, area: 85.0 },
        { calibre: '4/0', material: 'cobre', I_tabla: 260, area: 107.2 },
        { calibre: '250', material: 'cobre', I_tabla: 290, area: 126.7 },
        { calibre: '300', material: 'cobre', I_tabla: 320, area: 152.0 },
        { calibre: '350', material: 'cobre', I_tabla: 350, area: 177.3 },
        { calibre: '400', material: 'cobre', I_tabla: 380, area: 202.7 },
        { calibre: '500', material: 'cobre', I_tabla: 430, area: 253.4 },
        { calibre: '600', material: 'cobre', I_tabla: 475, area: 304.0 },
        { calibre: '750', material: 'cobre', I_tabla: 535, area: 380.0 },
        { calibre: '1000', material: 'cobre', I_tabla: 615, area: 506.7 }
    ]
};

if (typeof window !== 'undefined') {
    window.CONSTANTES = CONSTANTES;
}
