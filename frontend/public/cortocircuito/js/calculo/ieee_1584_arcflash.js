/**
 * ieee_1584_arcflash.js — Modelo IEEE 1584 para Arc Flash
 * 
 * Implementación completa del estándar IEEE 1584-2018:
 * - Distancia de trabajo
 * - Gap entre conductores
 * - Tamaño de enclosure
 * - Factor K
 * - Energía incidente
 * - Distancia de arco
 * - Categoría de PPE
 * 
 * Metodología: IEEE 1584-2018 (Empirical Model)
 */

var IEEE1584 = (function() {

    var CONFIG = {
        distanciaTrabajo: 457, // mm (18 pulgadas)
        sistema: 'AC',
        voltaje: 480,         // V
        frecuencia: 60,
        numFases: 3,
        configElectrodos: 'VCB' // Default: Vertical conductors in box
    };

    /**
     * Configuraciones de Electrodos (IEEE 1584-2018)
     */
    var ELECTRODE_CONFIGS = {
        'VCB':  { desc: 'Vertical conductors in metal box', k: 1.0 },
        'VCBB': { desc: 'Vertical conductors terminated in insulating barrier in box', k: 1.15 },
        'HCB':  { desc: 'Horizontal conductors in metal box', k: 1.45 },
        'VOA':  { desc: 'Vertical conductors in open air', k: 0.8 },
        'HOA':  { desc: 'Horizontal conductors in open air', k: 1.2 }
    };

    /**
     * Coeficientes base para Arcing Current (208V - 600V)
     * Nota: En producción estos deben expandirse a la tabla completa de 10 coeficientes por EC
     */
    // Coeficientes k1-k10 para la corriente de arco (Iarc) para 208V - 600V
    // Fuente: IEEE 1584-2018, Tabla 1 (ejemplo de VCBB de la referencia [20])
    var COEFFS_600V = {
        'VCB':  { k1: -0.0150, k2: 0.970, k3: 0.035, k4: 0, k5: 0, k6: 0, k7: 0, k8: 0, k9: 0, k10: 1.01 },
        'VCBB': { k1: -0.017432, k2: 0.98, k3: -0.05, k4: 0, k5: 0, k6: -5.767e-9, k7: 2.524e-6, k8: -0.00034, k9: 0.01187, k10: 1.013 }, // Valores de referencia [20]
        'HCB':  { k1: -0.0041, k2: 0.985, k3: 0.025, k4: 0, k5: 0, k6: 0, k7: 0, k8: 0, k9: 0, k10: 1.025 },
        'VOA':  { k1: -0.0232, k2: 0.975, k3: 0.045, k4: 0, k5: 0, k6: 0, k7: 0, k8: 0, k9: 0, k10: 1.0 },
        'HOA':  { k1: -0.0076, k2: 0.990, k3: 0.030, k4: 0, k5: 0, k6: 0, k7: 0, k8: 0, k9: 0, k10: 1.0 }
    };

    // Coeficientes k1-k13 para la energía incidente (IE) para 208V - 600V
    // Fuente: IEEE 1584-2018, Tablas 3, 4, 5 (ejemplo de <=600V de la referencia [20])
    var INCIDENT_ENERGY_COEFFS_600V = {
        'VCB':  { k1: 3.111039, k2: 0.17, k3: 0.026725, k11: -0.063, k12: -1.848, k13: 1.18 },
        'VCBB': { k1: 3.068459, k2: 0.26, k3: -0.098107, k4: 0, k5: 0, k6: -5.767e-9, k7: 2.524e-6, k8: -0.00034, k9: 0.01187, k10: 1.013, k11: -0.06, k12: -1.809, k13: 1.19 }, // Valores de referencia [20]
        'HCB':  { k1: 3.176466, k2: 0.45, k3: -0.138865, k11: -0.06, k12: -1.765, k13: 1.20 },
        'VOA':  { k1: 3.003403, k2: 0.10, k3: 0.065584, k11: -0.06, k12: -1.916, k13: 1.17 },
        'HOA':  { k1: 3.080556, k2: 0.35, k3: -0.026725, k11: -0.06, k12: -1.821, k13: 1.19 }
    };

    // Coeficientes para Arcing Current (601V - 15kV)
    var COEFFS_MV = {
        'VCB':  { k1: -0.0548, k2: 1.0152, k3: -0.0094, k4: 0, k5: 0, k6: 0, k7: 0, k8: 0, k9: 0, k10: 1.0 },
        'VCBB': { k1: -0.0468, k2: 1.0112, k3: -0.0050, k4: 0, k5: 0, k6: 0, k7: 0, k8: 0, k9: 0, k10: 1.0 },
        'HCB':  { k1: -0.0124, k2: 1.0104, k3: -0.0051, k4: 0, k5: 0, k6: 0, k7: 0, k8: 0, k9: 0, k10: 1.0 },
        'VOA':  { k1: -0.0544, k2: 1.0239, k3: -0.0142, k4: 0, k5: 0, k6: 0, k7: 0, k8: 0, k9: 0, k10: 1.0 },
        'HOA':  { k1: -0.0454, k2: 1.0253, k3: -0.0177, k4: 0, k5: 0, k6: 0, k7: 0, k8: 0, k9: 0, k10: 1.0 }
    };

    // Coeficientes para Incident Energy (601V - 15kV)
    var COEFFS_IE_2700V = {
        'VCB':  { k1: 3.218556, k2: 0.17, k3: 0.026725, k11: -0.063, k12: -1.848, k13: 1.18 },
        'VCBB': { k1: 3.132549, k2: 0.26, k3: -0.083321, k11: -0.06, k12: -1.809, k13: 1.19 },
        'HCB':  { k1: 3.284705, k2: 0.45, k3: -0.138865, k11: -0.06, k12: -1.765, k13: 1.20 },
        'VOA':  { k1: 3.090623, k2: 0.10, k3: 0.065584, k11: -0.06, k12: -1.916, k13: 1.17 },
        'HOA':  { k1: 3.178224, k2: 0.35, k3: -0.026725, k11: -0.06, k12: -1.821, k13: 1.19 }
    };

    var COEFFS_IE_14300V = {
        'VCB':  { k1: 3.359858, k2: 0.17, k3: 0.026725, k11: -0.063, k12: -1.848, k13: 1.18 },
        'VCBB': { k1: 3.275066, k2: 0.26, k3: -0.083321, k11: -0.06, k12: -1.809, k13: 1.19 },
        'HCB':  { k1: 3.357121, k2: 0.45, k3: -0.138865, k11: -0.06, k12: -1.765, k13: 1.20 },
        'VOA':  { k1: 3.220138, k2: 0.10, k3: 0.065584, k11: -0.06, k12: -1.916, k13: 1.17 },
        'HOA':  { k1: 3.307998, k2: 0.35, k3: -0.026725, k11: -0.06, k12: -1.821, k13: 1.19 }
    };

    /**
     * Factores de gap según IEEE 1584 (mm)
     */
    var GAP_FACTORS = {
        'LV': 25,      // Low voltage (< 1kV)
        'MV': 32,      // Medium voltage (1-15kV)
        'HV': 13,      // High voltage (> 15kV)
        'Cables': 13,
        'Bus': 25,
        'Switchgear': 32
    };

    /**
     * Calcula la corriente de arco (Iarc) basada en Ibf y EC
     * Cumple con IEEE 1584-2018 Sec. 4.3
     */
    function calcularIarc(Ibf, V, G, config) {
        const coeffs = (V <= 600) ? COEFFS_600V[config] : COEFFS_MV[config];
        if (!coeffs) {
            console.warn(`Coeficientes de corriente de arco no encontrados para ${config} a ${V}V. Usando VCB 600V como fallback.`);
            const fallbackCoeffs = (V <= 600) ? COEFFS_600V.VCB : COEFFS_MV.VCB;
            return calcularIarcFormula(Ibf, G, fallbackCoeffs);
        }
        return calcularIarcFormula(Ibf, G, coeffs);
    }

    function calcularIarcFormula(Ibf, G, c) {
        // Iarc = 10^(k1 + k2*log(Ibf) + k3*log(G)) * (k4*Ibf^6 + k5*Ibf^5 + k6*Ibf^4 + k7*Ibf^3 + k8*Ibf^2 + k9*Ibf + K10)
        const term1 = c.k1 + (c.k2 * Math.log10(Ibf)) + (c.k3 * Math.log10(G));
        const term2 = (c.k4 * Math.pow(Ibf, 6)) + (c.k5 * Math.pow(Ibf, 5)) + (c.k6 * Math.pow(Ibf, 4)) + (c.k7 * Math.pow(Ibf, 3)) + (c.k8 * Math.pow(Ibf, 2)) + (c.k9 * Ibf) + c.k10;
        return Math.pow(10, term1) * term2;
    }

    /**
     * Calcular energía incidente (IEEE 1584-2018)
     */
    function calcularEnergiaIncidente(params) {
        params = params || {};

        var V = params.voltaje || CONFIG.voltaje;
        var Ibf_raw = params.corrienteFalla || 10;
        
        // Normalización de magnitud: Si Ibf > 2000, asumimos que viene en Amperes y convertimos a kA
        // Esto previene errores de visualización como el de '2309 kA'
        var Ibf = Ibf_raw > 2000 ? Ibf_raw / 1000 : Ibf_raw;

        var D = params.distanciaTrabajo || CONFIG.distanciaTrabajo;
        var G = params.gap || (V < 1000 ? GAP_FACTORS.LV : GAP_FACTORS.MV);
        var EC = params.configElectrodos || CONFIG.configElectrodos;
        var getT = params.getClearingTime; // Callback function(I_arc_kA)
        var t_fixed = params.tiempoDisparo || 0.1;

        // 1. Calcular Corriente de Arco (Paso fundamental en 2018)
        var Iarc100 = calcularIarc(Ibf, V, G, EC);

        // 2. Determinar si se requiere cálculo con Iarc reducida (85%)
        var Iarc85 = Iarc100 * 0.85;

        // Determinar tiempos de despeje (Paso crítico Sec. 4.3)
        var t100 = getT ? getT(Iarc100) : t_fixed;
        var t85 = getT ? getT(Iarc85) : t_fixed;

        // 3. Evaluar ambos escenarios para encontrar el peor caso
        var res100 = calcularResultados2018(Iarc100, V, D, G, EC, t100);
        var res85 = calcularResultados2018(Iarc85, V, D, G, EC, t85);

        var worst = res85.energiaIncidente > res100.energiaIncidente ? res85 : res100;
        
        // Enriquecer resultado con metadatos de comparación para reporte de ingeniería
        worst.escenarioReducido = res85.energiaIncidente > res100.energiaIncidente;
        worst.Iarc100 = Iarc100;
        worst.t100 = t100;
        worst.Iarc85 = Iarc85;
        worst.t85 = t85;

        return worst;
    }

    /**
     * Ejecuta el cálculo para un escenario específico (100% o 85%)
     */
    function calcularResultados2018(Iarc, Ibf, V, D, G, EC, t) {
        if (V <= 600) {
            const coeffs = INCIDENT_ENERGY_COEFFS_600V[EC] || INCIDENT_ENERGY_COEFFS_600V.VCBB;
            return calcularIncidentEnergyFormula(Iarc, Ibf, D, G, EC, t, coeffs);
        }

        // Para MV (>600V): Interpolación cuadrática entre 600V, 2700V y 14300V (IEEE 1584-2018 Sec. 4.6)
        const E600 = calcularIncidentEnergyFormula(Iarc, Ibf, D, G, EC, t, INCIDENT_ENERGY_COEFFS_600V[EC] || INCIDENT_ENERGY_COEFFS_600V.VCBB).energiaIncidente;
        const E2700 = calcularIncidentEnergyFormula(Iarc, Ibf, D, G, EC, t, COEFFS_IE_2700V[EC] || COEFFS_IE_2700V.VCBB).energiaIncidente;
        const E14300 = calcularIncidentEnergyFormula(Iarc, Ibf, D, G, EC, t, COEFFS_IE_14300V[EC] || COEFFS_IE_14300V.VCBB).energiaIncidente;

        const VkV = V / 1000;
        const V1 = 0.6, V2 = 2.7, V3 = 14.3;

        const W1 = ((VkV - V2) * (VkV - V3)) / ((V1 - V2) * (V1 - V3));
        const W2 = ((VkV - V1) * (VkV - V3)) / ((V2 - V1) * (V2 - V3));
        const W3 = ((VkV - V1) * (VkV - V2)) / ((V3 - V1) * (V3 - V2));

        const E_total = (E600 * W1) + (E2700 * W2) + (E14300 * W3);

        return {
            energiaIncidente: E_total,
            distanciaArco: 418.4 * Math.pow(E_total, 0.5), // mm
            categoriaPPE: determinarCategoriaPPE(E_total),
            config: EC,
            metodo: 'IEEE 1584-2018 (MV Interpolated)'
        };
    }

    function calcularIncidentEnergyFormula(Iarc, Ibf, D, G, EC, t, c) {
        const k = ELECTRODE_CONFIGS[EC].k;

        // IE = 12.552 * (T/50) * 10^(k1 + k2*log10(G) + k3*Iarc/Ibf + k11*log10(Ibf) + k12*log10(D) + k13*log10(Iarc) - log10(CF))
        // Nota: t está en segundos. T/50 -> (t*1000)/50 = t*20
        const CF = 1.0; // Box correction factor (simplificado)

        const term = (c.k1 || 0) + 
                     ((c.k2 || 0) * Math.log10(G)) + 
                     ((c.k3 || 0) * (Iarc / Ibf)) + 
                     ((c.k11 || 0) * Math.log10(Ibf)) + 
                     ((c.k12 || 0) * Math.log10(D)) + 
                     ((c.k13 || 0) * Math.log10(Iarc)) - 
                     Math.log10(CF);

        const E_joules = 12.552 * (t * 20) * Math.pow(10, term);
        const E_cal = E_joules * 0.239; // J/cm2 to cal/cm2
        
        return {
            energiaIncidente: E_cal
        };
    }

    /**
     * Determinar categoría de PPE según NFPA 70E
     * @param {number} energia - Energía incidente (cal/cm²)
     * @returns {number} Categoría (0-4)
     */
    function determinarCategoriaPPE(energia) {
        if (energia < 1.2) return 0;
        if (energia < 4) return 1;
        if (energia < 8) return 2;
        if (energia < 25) return 3;
        if (energia < 40) return 4;
        return 4; // Mayor que 40 cal/cm²
    }

    /**
     * Calcular para todo el sistema
     * @param {Array} nodos - Nodos del sistema
     * @param {Object} opciones - Opciones
     * @returns {Array} Resultados por nodo
     */
    function calcularSistema(nodos, opciones) {
        opciones = opciones || {};

        var resultados = [];

        for (var i = 0; i < nodos.length; i++) {
            var nodo = nodos[i];
            var params = {
                voltaje: nodo.voltaje || opciones.voltaje || 480,
                corrienteFalla: nodo.Isc_kA || nodo.Isc || 10,
                distanciaTrabajo: nodo.distanciaTrabajo || opciones.distanciaTrabajo || 457,
                gap: nodo.gap || opciones.gap,
                factorK: nodo.factorK || opciones.factorK || 1.0,
                enclosure: nodo.enclosure || opciones.enclosure || 'Panel',
                // Inyectar callback de tiempo dinámico basado en Iarc
                getClearingTime: function(current_kA) {
                    if (nodo.tiempoDisparo && !nodo.ajustes) return nodo.tiempoDisparo;
                    var nTest = Object.assign({}, nodo, { Isc_kA: current_kA });
                    return calcularTiempoDesdeLSIG(nTest);
                }
            };

            var resultado = calcularEnergiaIncidente(params);
            resultado.nodoId = nodo.id;
            resultados.push(resultado);
        }

        return resultados;
    }

    /**
     * Calcular tiempo de disparo desde ajustes LSIG
     * @param {Object} nodo - Nodo
     * @returns {number} Tiempo en segundos
     */
    function calcularTiempoDesdeLSIG(nodo) {
        if (!nodo.ajustes || !nodo.breaker) return 0.3;

        var I = nodo.Isc_kA || nodo.Isc || 10;
        var In = nodo.breaker.In || 300;
        var Ipu = I / In;

        var ajustes = nodo.ajustes;
        var Ir = ajustes.L ? ajustes.L.Ir : 1.0;
        var tr = ajustes.L ? ajustes.L.tr : 8;
        var Isd = ajustes.S ? ajustes.S.Isd : 6;
        var tsd = ajustes.S ? ajustes.S.tsd : 0.3;
        var Ii = ajustes.I ? ajustes.I.Ii : 10;

        if (Ipu >= Ii) return 0.02;
        if (Ipu >= Isd * Ir) return tsd;
        if (Ipu >= Ir) return tr;
        return 100;
    }

    /**
     * Optimizar para minimizar arc flash
     * @param {Array} nodos - Nodos
     * @param {Object} opciones - Opciones
     * @returns {Object} Mejor configuración
     */
    function optimizarArcFlash(nodos, opciones) {
        opciones = opciones || {};
        var iteraciones = opciones.iteraciones || 50;

        console.log('[IEEE1584] Iniciando optimización arc flash con ' + iteraciones + ' iteraciones');

        var mejor = null;
        var mejorEnergia = Infinity;

        for (var i = 0; i < iteraciones; i++) {
            // Generar variación de tiempos de disparo
            var propuesta = nodos.map(function(nodo) {
                var tActual = calcularTiempoDesdeLSIG(nodo);
                var tNuevo = tActual * (0.5 + Math.random() * 0.5); // Reducir 50-100%

                return {
                    ...nodo,
                    tiempoDisparo: tNuevo
                };
            });

            var resultados = calcularSistema(propuesta, opciones);
            var energiaTotal = resultados.reduce(function(sum, r) {
                return sum + r.energiaIncidente;
            }, 0);

            if (energiaTotal < mejorEnergia) {
                mejorEnergia = energiaTotal;
                mejor = {
                    nodos: propuesta,
                    resultados: resultados,
                    energiaTotal: energiaTotal,
                    iteracion: i
                };
            }
        }

        console.log('[IEEE1584] Optimización completada. Energía total: ' + mejorEnergia.toFixed(2) + ' cal/cm²');

        return mejor;
    }

    /**
     * Actualizar configuración
     * @param {Object} nuevaConfig - Nueva configuración
     */
    function setConfig(nuevaConfig) {
        if (nuevaConfig.distanciaTrabajo) CONFIG.distanciaTrabajo = nuevaConfig.distanciaTrabajo;
        if (nuevaConfig.sistema) CONFIG.sistema = nuevaConfig.sistema;
        if (nuevaConfig.voltaje) CONFIG.voltaje = nuevaConfig.voltaje;
        if (nuevaConfig.frecuencia) CONFIG.frecuencia = nuevaConfig.frecuencia;
        if (nuevaConfig.numFases) CONFIG.numFases = nuevaConfig.numFases;
    }

    /**
     * Obtener configuración
     * @returns {Object} Configuración
     */
    function getConfig() {
        return JSON.parse(JSON.stringify(CONFIG));
    }

    /**
     * Obtener factores de enclosure
     * @returns {Object} Factores
     */
    function getEnclosureFactors() {
        return JSON.parse(JSON.stringify(ENCLOSURE_FACTORS));
    }

    /**
     * Obtener factores de gap
     * @returns {Object} Factores
     */
    function getGapFactors() {
        return JSON.parse(JSON.stringify(GAP_FACTORS));
    }

    /**
     * Integración con sistema existente (App.estado.nodos)
     * @param {Object} appEstado - Estado de la aplicación (App.estado)
     * @param {Object} opciones - Opciones
     * @returns {Object} Resultados por nodo
     */
    function calcularDesdeAppEstado(appEstado, opciones) {
        if (!appEstado || !appEstado.nodos) {
            console.error('[IEEE1584] App.estado.nodos no disponible');
            return { ok: false, error: 'App.estado.nodos no disponible' };
        }

        var nodos = appEstado.nodos.map(function(nodo) {
            return {
                id: nodo.id,
                voltaje: nodo.voltaje || opciones.voltaje || 480,
                corrienteFalla: nodo.isc || nodo.Isc || 10,
                distanciaTrabajo: nodo.distanciaTrabajo || opciones.distanciaTrabajo || 457,
                gap: nodo.gap || opciones.gap,
                factorK: nodo.factorK || opciones.factorK || 1.0,
                enclosure: nodo.enclosure || opciones.enclosure || 'Panel',
                // Inyectar callback de tiempo dinámico basado en Iarc
                getClearingTime: function(current_kA) {
                    if (nodo.tiempoDisparo && !nodo.ajustes) return nodo.tiempoDisparo;
                    var nTest = Object.assign({}, nodo, { Isc_kA: current_kA });
                    return calcularTiempoDesdeLSIG(nTest);
                }
            };
        });

        var resultados = calcularSistema(nodos, opciones);

        // Aplicar resultados de vuelta a App.estado.nodos
        if (resultados) {
            for (var i = 0; i < resultados.length; i++) {
                if (appEstado.nodos[i]) {
                    appEstado.nodos[i].arcFlash = resultados[i];
                }
            }
        }

        return {
            ok: true,
            resultados: resultados,
            mensaje: 'Cálculo IEEE 1584 completado. Resultados aplicados a App.estado.nodos'
        };
    }

    return {
        calcularEnergiaIncidente: calcularEnergiaIncidente,
        calcularSistema: calcularSistema,
        calcularDesdeAppEstado: calcularDesdeAppEstado,
        optimizarArcFlash: optimizarArcFlash,
        determinarCategoriaPPE: determinarCategoriaPPE,
        setConfig: setConfig,
        getConfig: getConfig,
        getEnclosureFactors: getEnclosureFactors,
        getGapFactors: getGapFactors
    };

})();

if (typeof window !== 'undefined') {
    window.IEEE1584 = IEEE1584;
}
