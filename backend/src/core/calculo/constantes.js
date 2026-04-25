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
    /* Datos de zonas eléctricas de México - Corrientes de cortocircuito típicas (kA) */
    ZONAS_ELECTRICAS: {
        'CDMX': {
            nombre: 'Ciudad de México - Zona Metropolitana',
            isc_típico: 28.0,
            isc_mínimo: 22.0,
            isc_máximo: 35.0,
            descripción: 'Red robusta con alta densidad de carga'
        },
        'MONTERREY': {
            nombre: 'Monterrey - Nuevo León',
            isc_típico: 25.0,
            isc_mínimo: 20.0,
            isc_máximo: 30.0,
            descripción: 'Zona industrial con red fuerte'
        },
        'GUADALAJARA': {
            nombre: 'Guadalajara - Jalisco',
            isc_típico: 22.0,
            isc_mínimo: 18.0,
            isc_máximo: 26.0,
            descripción: 'Red urbana consolidada'
        },
        'PUEBLA': {
            nombre: 'Puebla - Tlaxcala',
            isc_típico: 20.0,
            isc_mínimo: 16.0,
            isc_máximo: 24.0,
            descripción: 'Red industrial en desarrollo'
        },
        'LEON': {
            nombre: 'León - Guanajuato',
            isc_típico: 18.0,
            isc_mínimo: 14.0,
            isc_máximo: 22.0,
            descripción: 'Zona industrial mediana'
        },
        'TIJUANA': {
            nombre: 'Tijuana - Baja California',
            isc_típico: 16.0,
            isc_mínimo: 12.0,
            isc_máximo: 20.0,
            descripción: 'Red fronteriza con crecimiento'
        },
        'VERACRUZ': {
            nombre: 'Veracruz - Xalapa',
            isc_típico: 15.0,
            isc_mínimo: 12.0,
            isc_máximo: 18.0,
            descripción: 'Red portuaria e industrial'
        },
        'MERIDA': {
            nombre: 'Mérida - Yucatán',
            isc_típico: 14.0,
            isc_mínimo: 11.0,
            isc_máximo: 17.0,
            descripción: 'Red turística y comercial'
        },
        'TORREON': {
            nombre: 'Torreón - La Laguna',
            isc_típico: 17.0,
            isc_mínimo: 13.0,
            isc_máximo: 21.0,
            descripción: 'Zona agrícola-industrial'
        },
        'QUERETARO': {
            nombre: 'Querétaro - Corregidora',
            isc_típico: 19.0,
            isc_mínimo: 15.0,
            isc_máximo: 23.0,
            descripción: 'Zona industrial en expansión'
        },
        'TOLUCA': {
            nombre: 'Toluca - Estado de México',
            isc_típico: 21.0,
            isc_mínimo: 17.0,
            isc_máximo: 25.0,
            descripción: 'Red suburbana densa'
        },
        'CULIACAN': {
            nombre: 'Culiacán - Sinaloa',
            isc_típico: 13.0,
            isc_mínimo: 10.0,
            isc_máximo: 16.0,
            descripción: 'Red agrícola-comercial'
        },
        'HERMOSILLO': {
            nombre: 'Hermosillo - Sonora',
            isc_típico: 12.0,
            isc_mínimo: 9.0,
            isc_máximo: 15.0,
            descripción: 'Red desértica industrial'
        },
        'VILLAHERMOSA': {
            nombre: 'Villahermosa - Tabasco',
            isc_típico: 11.0,
            isc_mínimo: 8.0,
            isc_máximo: 14.0,
            descripción: 'Red petrolera y tropical'
        },
        'RURAL': {
            nombre: 'Zona Rural - General',
            isc_típico: 8.0,
            isc_mínimo: 5.0,
            isc_máximo: 12.0,
            descripción: 'Red rural con baja densidad'
        },
        'CUSTOM': {
            nombre: 'Valor Personalizado',
            isc_típico: 10.0,
            isc_mínimo: 5.0,
            isc_máximo: 50.0,
            descripción: 'Ingresar valor manualmente'
        }
    }
};

module.exports = CONSTANTES;
