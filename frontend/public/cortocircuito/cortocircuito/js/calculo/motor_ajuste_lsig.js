/**
 * motor_ajuste_lsig.js — Motor de Ajuste LSIG con IA
 * 
 * Optimización de ajustes LSIG (Long, Short, Instantaneous, Ground):
 * - IA propone ajustes (heurísticas + memoria)
 * - Reducción de arc flash
 * - Coordinación por bandas
 * - Validación NOM dura
 * 
 * Nivel industrial tipo ETAP/SKM
 */

var MotorAjusteLSIG = (function() {

    /**
     * Configuración del motor
     */
    var CONFIG = {
        iteraciones: 30,
        pesos: {
            arcFlash: 0.6,
            coordinacion: 0.4
        }
    };

    /**
     * Crear ajustes base para un breaker
     * @param {Object} breaker - Breaker
     * @returns {Object} Ajustes LSIG base
     */
    function crearAjustesBase(breaker) {
        return {
            L: {
                Ir: 1.0,      // Long delay pickup (x In)
                tr: 8         // Long delay time (s)
            },
            S: {
                Isd: 6,       // Short delay pickup (x Ir)
                tsd: 0.3      // Short delay time (s)
            },
            I: {
                Ii: 10        // Instantaneous pickup (x In)
            },
            G: {
                Ig: 0.2,      // Ground pickup (x In)
                tg: 0.2       // Ground delay time (s)
            }
        };
    }

    /**
     * Proponer ajustes LSIG usando IA + heurísticas
     * @param {Object} nodo - Nodo del sistema
     * @param {Object} contexto - Contexto del sistema
     * @param {Array} dataset - Dataset de experiencias
     * @returns {Object} Ajustes propuestos
     */
    function proponerLSIG(nodo, contexto, dataset) {
        var base = crearAjustesBase(nodo.breaker);

        // Heurística inicial (ingeniería real)
        var Isc = nodo.Isc_kA || nodo.Isc || 10;

        if (Isc > 10000) {
            // Alta corriente de falla → bajar instantáneo para reducir arc flash
            base.I.Ii = 6;
        }

        if (nodo.esCritico) {
            // Nodo crítico → más retardo para mejorar coordinación
            base.S.tsd = 0.4;
        }

        if (nodo.cargaContinua) {
            // Carga continua → pickup más alto
            base.L.Ir = 1.1;
        }

        // Aprendizaje (si hay historial)
        if (typeof MotorIA !== 'undefined' && MotorIA.predecir) {
            var aprendido = MotorIA.predecir(nodo, dataset, 5);
            if (aprendido && aprendido.ajustes) {
                if (typeof Debug !== 'undefined') {
                    Debug.log('[MotorAjusteLSIG] Usando ajustes aprendidos para nodo ' + nodo.id);
                }
                return aprendido.ajustes;
            }
        }

        return base;
    }

    /**
     * Calcular arc flash (simplificado pero útil)
     * @param {Object} nodo - Nodo
     * @param {Object} ajustes - Ajustes LSIG
     * @returns {Object} { energia, tiempo }
     */
    function calcularArcFlash(nodo, ajustes) {
        var I = nodo.Isc_kA || nodo.Isc || 10;
        var In = nodo.breaker ? nodo.breaker.In : 300;

        // Tiempo depende de la curva y ajustes
        var t = evaluarTiempoDisparo(nodo.breaker, ajustes, I, In);

        // Energía proporcional (E ∝ I² × t)
        var energia = Math.pow(I, 2) * t;

        return {
            energia: energia,
            tiempo: t
        };
    }

    /**
     * Evaluar tiempo de disparo desde ajustes LSIG
     * @param {Object} breaker - Breaker
     * @param {Object} ajustes - Ajustes LSIG
     * @param {number} I - Corriente de falla
     * @param {number} In - Corriente nominal
     * @returns {number} Tiempo en segundos
     */
    function evaluarTiempoDisparo(breaker, ajustes, I, In) {
        if (!ajustes) return 0.3;

        var Ipu = I / In;

        // Long delay
        var Ir = ajustes.L ? ajustes.L.Ir : 1.0;
        var tr = ajustes.L ? ajustes.L.tr : 8;

        // Short delay
        var Isd = ajustes.S ? ajustes.S.Isd : 6;
        var tsd = ajustes.S ? ajustes.S.tsd : 0.3;

        // Instantaneous
        var Ii = ajustes.I ? ajustes.I.Ii : 10;

        if (Ipu >= Ii) {
            return 0.02; // Instantáneo
        }

        if (Ipu >= Isd * Ir) {
            return tsd; // Short delay
        }

        if (Ipu >= Ir) {
            return tr; // Long delay
        }

        return 100; // Sobrecarga (no dispara)
    }

    /**
     * Generar banda desde ajustes LSIG
     * @param {Object} breaker - Breaker
     * @param {Object} ajustes - Ajustes LSIG
     * @returns {Object} Banda { min, max }
     */
    function generarBandaDesdeAjustes(breaker, ajustes) {
        var In = breaker.In;

        // Generar puntos de curva
        var puntosMin = [];
        var puntosMax = [];

        var corrientes = generarRangoLog(In * 0.5, In * 20, 20);

        for (var i = 0; i < corrientes.length; i++) {
            var I = corrientes[i];
            var Ipu = I / In;

            var tMin, tMax;

            // Banda de tolerancia (±20% tiempo)
            var tBase = evaluarTiempoDisparo(breaker, ajustes, I, In);
            tMin = tBase * 0.8;
            tMax = tBase * 1.2;

            puntosMin.push({ I: I, t: tMin });
            puntosMax.push({ I: I, t: tMax });
        }

        // Crear funciones interpoladoras
        if (typeof TCCDigitalizerPro !== 'undefined' && TCCDigitalizerPro.generarBanda) {
            return TCCDigitalizerPro.generarBanda(puntosMin, puntosMax);
        }

        // Fallback simple
        return {
            min: function(I) { return evaluarTiempoDisparo(breaker, ajustes, I, In) * 0.8; },
            max: function(I) { return evaluarTiempoDisparo(breaker, ajustes, I, In) * 1.2; }
        };
    }

    /**
     * Evaluar coordinación por banda
     * @param {Array} nodos - Nodos con bandas
     * @returns {number} Número de conflictos
     */
    function evaluarCoordinacionLSIG(nodos) {
        var conflictos = 0;

        for (var i = 0; i < nodos.length - 1; i++) {
            var down = nodos[i];
            var up = nodos[i + 1];

            if (down.banda && up.banda && hayCruceBanda(down.banda, up.banda)) {
                conflictos++;
            }
        }

        return conflictos;
    }

    /**
     * Verificar cruce entre bandas
     * @param {Object} b1 - Banda 1
     * @param {Object} b2 - Banda 2
     * @returns {boolean} Hay cruce
     */
    function hayCruceBanda(b1, b2) {
        var corrientes = generarRangoLog(10, 100000, 30);

        for (var i = 0; i < corrientes.length; i++) {
            var I = corrientes[i];
            var t1min = b1.min ? b1.min(I) : 10;
            var t1max = b1.max ? b1.max(I) : 0.1;
            var t2min = b2.min ? b2.min(I) : 10;

            if (t2min <= t1max) return true;
        }

        return false;
    }

    /**
     * Función objetivo multi-objetivo
     * @param {Array} nodos - Nodos evaluados
     * @returns {Object} { score, conflictos, totalArc }
     */
    function scoreSistema(nodos) {
        var totalArc = 0;

        for (var i = 0; i < nodos.length; i++) {
            totalArc += nodos[i].arcFlash.energia;
        }

        var conflictos = evaluarCoordinacionLSIG(nodos);

        var score = (
            (1 / (totalArc + 1)) * CONFIG.pesos.arcFlash +
            (1 / (1 + conflictos)) * CONFIG.pesos.coordinacion
        );

        return {
            score: score,
            conflictos: conflictos,
            totalArc: totalArc
        };
    }

    /**
     * Optimización iterativa de LSIG
     * @param {Object} sistema - Sistema con nodos
     * @param {Object} opciones - Opciones
     * @returns {Object} Mejor configuración
     */
    function optimizarLSIG(sistema, opciones) {
        opciones = opciones || {};
        var iter = opciones.iteraciones || CONFIG.iteraciones;

        console.log('[MotorAjusteLSIG] Iniciando optimización LSIG con ' + iter + ' iteraciones');

        var mejor = null;
        var dataset = typeof MotorIA !== 'undefined' ? MotorIA.getDatasetValido() : [];

        for (var i = 0; i < iter; i++) {
            var propuesta = sistema.nodos.map(function(nodo) {
                var ajustes = proponerLSIG(nodo, sistema, dataset);
                var ajustesMutados = mutarAjustes(ajustes);

                // Validar antes de usar
                if (!validarLSIG_NOM(nodo, ajustesMutados)) {
                    ajustesMutados = ajustes; // Fallback a original
                }

                var arc = calcularArcFlash(nodo, ajustesMutados);
                var banda = generarBandaDesdeAjustes(nodo.breaker, ajustesMutados);

                // Clonar objeto nodo y extenderlo manualmente para evitar spread operator
                var nObj = JSON.parse(JSON.stringify(nodo));
                nObj.ajustes = ajustesMutados;
                nObj.arcFlash = arc;
                nObj.banda = banda;
                return nObj;
            });

            var evalRes = scoreSistema(propuesta);

            if (!mejor || evalRes.score > mejor.score) {
                mejor = {
                    nodos: propuesta,
                    score: evalRes.score,
                    conflictos: evalRes.conflictos,
                    arc: evalRes.totalArc,
                    iteracion: i
                };
            }
        }

        console.log('[MotorAjusteLSIG] Optimización completada. Score: ' + mejor.score.toFixed(4) + ', Conflictos: ' + mejor.conflictos);

        // Aprender de la mejor solución
        if (typeof MotorIA !== 'undefined' && MotorIA.aprender) {
            sistema.nodos.forEach(function(nodo, i) {
                var config = mejor.nodos[i];
                if (config) {
                    MotorIA.registrarExperiencia(
                        MotorIA.extraerFeatures(nodo),
                        {
                            config: config.ajustes,
                            eval: { score: mejor.score, valido: true }
                        }
                    );
                }
            });
        }

        return mejor;
    }

    /**
     * Mutación inteligente de ajustes
     * @param {Object} a - Ajustes actuales
     * @returns {Object} Ajustes mutados
     */
    function mutarAjustes(a) {
        return {
            L: {
                Ir: clamp(a.L.Ir + rand(-0.1, 0.1), 0.8, 1.1),
                tr: clamp(a.L.tr + rand(-1, 1), 4, 12)
            },
            S: {
                Isd: clamp(a.S.Isd + rand(-1, 1), 2, 10),
                tsd: clamp(a.S.tsd + rand(-0.1, 0.1), 0.1, 0.5)
            },
            I: {
                Ii: clamp(a.I.Ii + rand(-1, 1), 4, 12)
            },
            G: {
                Ig: clamp(a.G.Ig + rand(-0.05, 0.05), 0.1, 0.5),
                tg: clamp(a.G.tg + rand(-0.1, 0.1), 0.1, 0.4)
            }
        };
    }

    /**
     * Validación NOM dura para LSIG
     * @param {Object} nodo - Nodo
     * @param {Object} ajustes - Ajustes LSIG
     * @returns {boolean} Válido
     */
    function validarLSIG_NOM(nodo, ajustes) {
        if (!ajustes || !nodo.breaker) return false;

        var In = nodo.breaker.In;
        var Icarga = nodo.Icarga || nodo.carga || 100;
        var Isc = nodo.Isc_kA || nodo.Isc || 10;

        // No bajar L por debajo de carga
        if (ajustes.L.Ir * In < Icarga) {
            return false;
        }

        // Instantáneo no puede eliminar protección
        if (ajustes.I.Ii * In > Isc * 1000) {
            return false;
        }

        // Pickup L debe ser ≥ 0.8
        if (ajustes.L.Ir < 0.8) {
            return false;
        }

        // Pickup I debe ser ≥ 4
        if (ajustes.I.Ii < 4) {
            return false;
        }

        return true;
    }

    /**
     * Clamp valor entre min y max
     * @param {number} val - Valor
     * @param {number} min - Mínimo
     * @param {number} max - Máximo
     * @returns {number} Valor clamped
     */
    function clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    }

    /**
     * Random float
     * @param {number} min - Mínimo
     * @param {number} max - Máximo
     * @returns {number} Random
     */
    function rand(min, max) {
        return Math.random() * (max - min) + min;
    }

    /**
     * Generar rango logarítmico
     * @param {number} min - Mínimo
     * @param {number} max - Máximo
     * @param {number} n - Número de puntos
     * @returns {Array} Rango
     */
    function generarRangoLog(min, max, n) {
        n = n || 30;
        var arr = [];
        var logMin = Math.log10(min);
        var logMax = Math.log10(max);

        for (var i = 0; i < n; i++) {
            var val = Math.pow(10, logMin + (i / n) * (logMax - logMin));
            arr.push(val);
        }

        return arr;
    }

    /**
     * Actualizar configuración
     * @param {Object} nuevaConfig - Nueva configuración
     */
    function setConfig(nuevaConfig) {
        if (nuevaConfig.iteraciones) CONFIG.iteraciones = nuevaConfig.iteraciones;
        if (nuevaConfig.pesos) {
            if (nuevaConfig.pesos.arcFlash !== undefined) CONFIG.pesos.arcFlash = nuevaConfig.pesos.arcFlash;
            if (nuevaConfig.pesos.coordinacion !== undefined) CONFIG.pesos.coordinacion = nuevaConfig.pesos.coordinacion;
        }
    }

    /**
     * Obtener configuración
     * @returns {Object} Configuración
     */
    function getConfig() {
        return JSON.parse(JSON.stringify(CONFIG));
    }

    return {
        optimizarLSIG: optimizarLSIG,
        crearAjustesBase: crearAjustesBase,
        proponerLSIG: proponerLSIG,
        calcularArcFlash: calcularArcFlash,
        evaluarCoordinacionLSIG: evaluarCoordinacionLSIG,
        scoreSistema: scoreSistema,
        validarLSIG_NOM: validarLSIG_NOM,
        setConfig: setConfig,
        getConfig: getConfig
    };

})();

if (typeof window !== 'undefined') {
    window.MotorAjusteLSIG = MotorAjusteLSIG;
}
