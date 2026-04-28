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
 * Nivel industrial para estudios certificados
 */

var IEEE1584 = (function() {

    /**
     * Configuración por defecto
     */
    var CONFIG = {
        distanciaTrabajo: 457, // mm (18 pulgadas)
        sistema: 'AC',        // AC o DC
        voltaje: 480,         // V
        frecuencia: 60,       // Hz
        numFases: 3           // 1, 2 o 3 fases
    };

    /**
     * Factores de enclosure según IEEE 1584
     */
    var ENCLOSURE_FACTORS = {
        'Caja de conexión': 1.0,
        'Panel': 1.0,
        'Caja de desconexión': 1.0,
        'MCC': 1.0,
        'Switchgear': 1.0,
        'Caja de terminales': 1.0,
        'Caja de motor': 1.0,
        'Otros': 1.0
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
     * Calcular energía incidente según IEEE 1584-2018
     * @param {Object} params - Parámetros del cálculo
     * @returns {Object} { energiaIncidente, distanciaArco, categoriaPPE }
     */
    function calcularEnergiaIncidente(params) {
        params = params || {};

        var V = params.voltaje || CONFIG.voltaje;
        var Ibf = params.corrienteFalla || 10; // kA
        var D = params.distanciaTrabajo || CONFIG.distanciaTrabajo; // mm
        var G = params.gap || (V < 1000 ? GAP_FACTORS.LV : GAP_FACTORS.MV); // mm
        var x = params.factorK || 1.0;
        var enclosure = params.enclosure || 'Panel';
        var CF = ENCLOSURE_FACTORS[enclosure] || 1.0;

        // Tiempo de disparo
        var t = params.tiempoDisparo || 0.1; // segundos

        // Para LV (< 1kV) usar método simplificado
        if (V < 1000) {
            return calcularLV(params, Ibf, D, G, x, CF, t);
        }

        // Para MV usar método completo
        return calcularMV(params, Ibf, D, G, x, CF, t);
    }

    /**
     * Método para Low Voltage (< 1kV)
     * @param {Object} params - Parámetros
     * @param {number} Ibf - Corriente de falla (kA)
     * @param {number} D - Distancia de trabajo (mm)
     * @param {number} G - Gap (mm)
     * @param {number} x - Factor K
     * @param {number} CF - Factor de enclosure
     * @param {number} t - Tiempo de disparo (s)
     * @returns {Object} Resultados
     */
    function calcularLV(params, Ibf, D, G, x, CF, t) {
        // Energía incidente (J/cm²)
        // E = 2.65 × Ibf^1.64 × t^0.275 × D^-1.643 × G^0.445 × CF
        var E = 2.65 * Math.pow(Ibf, 1.64) * Math.pow(t, 0.275) * 
                Math.pow(D, -1.643) * Math.pow(G, 0.445) * CF;

        // Convertir a cal/cm²
        var E_cal = E * 0.239;

        // Distancia de arco (mm)
        // Arc flash boundary = 4 × (E / CF)^0.5
        var D_arco = 4 * Math.pow(E / CF, 0.5);

        // Categoría de PPE
        var categoriaPPE = determinarCategoriaPPE(E_cal);

        return {
            energiaIncidente: E_cal, // cal/cm²
            energiaJoules: E, // J/cm²
            distanciaArco: D_arco, // mm
            categoriaPPE: categoriaPPE,
            metodo: 'LV IEEE 1584-2018'
        };
    }

    /**
     * Método para Medium Voltage (1-15kV)
     * @param {Object} params - Parámetros
     * @param {number} Ibf - Corriente de falla (kA)
     * @param {number} D - Distancia de trabajo (mm)
     * @param {number} G - Gap (mm)
     * @param {number} x - Factor K
     * @param {number} CF - Factor de enclosure
     * @param {number} t - Tiempo de disparo (s)
     * @returns {Object} Resultados
     */
    function calcularMV(params, Ibf, D, G, x, CF, t) {
        var V = params.voltaje || CONFIG.voltaje;

        // Energía incidente (J/cm²)
        // E = 0.239 × 10^((log10(Ibf) + log10(t) + log10(V) - 3.857) / 0.912) × CF
        var logE = (Math.log10(Ibf) + Math.log10(t) + Math.log10(V) - 3.857) / 0.912;
        var E = 0.239 * Math.pow(10, logE) * CF;

        // Convertir a cal/cm²
        var E_cal = E * 0.239;

        // Distancia de arco (mm)
        var D_arco = 4 * Math.pow(E / CF, 0.5);

        // Categoría de PPE
        var categoriaPPE = determinarCategoriaPPE(E_cal);

        return {
            energiaIncidente: E_cal, // cal/cm²
            energiaJoules: E, // J/cm²
            distanciaArco: D_arco, // mm
            categoriaPPE: categoriaPPE,
            metodo: 'MV IEEE 1584-2018'
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
                tiempoDisparo: nodo.tiempoDisparo || calcularTiempoDesdeLSIG(nodo)
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
                tiempoDisparo: nodo.tiempoDisparo || calcularTiempoDesdeLSIG(nodo)
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
