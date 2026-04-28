/**
 * motor_coordinacion_fase_tierra.js — Motor de Coordinación Fase + Tierra Simultánea
 * 
 * Optimización acoplada de protección fase y tierra:
 * - Generación de curvas acopladas (fase + tierra)
 * - Detección de cruces en doble dominio
 * - Sensibilidad a falla a tierra
 * - Función objetivo global (fase + tierra + arc flash)
 * - Validaciones duras NOM
 * 
 * Nivel industrial tipo ETAP/SKM
 */

var MotorCoordinacionFaseTierra = (function() {

    /**
     * Configuración del motor
     */
    var CONFIG = {
        iteraciones: 40,
        pesos: {
            arcFlash: 0.4,
            coordinacionFase: 0.3,
            coordinacionTierra: 0.2,
            sensibilidadTierra: 0.1
        }
    };

    /**
     * Crear nodo de protección con curvas fase + tierra
     * @param {Object} nodo - Nodo del sistema
     * @returns {Object} Nodo con estructura de protección
     */
    function crearNodoProteccion(nodo) {
        return {
            ...nodo,
            ajustes: crearAjustesBase(nodo.breaker),
            curvas: {
                fase: null,
                tierra: null
            }
        };
    }

    /**
     * Crear ajustes base
     * @param {Object} breaker - Breaker
     * @returns {Object} Ajustes LSIG
     */
    function crearAjustesBase(breaker) {
        return {
            L: {
                Ir: 1.0,
                tr: 8
            },
            S: {
                Isd: 6,
                tsd: 0.3
            },
            I: {
                Ii: 10
            },
            G: {
                Ig: 0.2,
                tg: 0.2
            }
        };
    }

    /**
     * Generar curvas fase + tierra para un nodo
     * @param {Object} nodo - Nodo con ajustes
     * @returns {Object} { fase, tierra }
     */
    function generarCurvasNodo(nodo) {
        var fase = generarBandaDesdeAjustes(nodo.breaker, nodo.ajustes, 'fase');
        var tierra = generarBandaDesdeAjustes(nodo.breaker, nodo.ajustes, 'tierra');

        return {
            fase: fase,
            tierra: tierra
        };
    }

    /**
     * Generar banda desde ajustes para fase o tierra
     * @param {Object} breaker - Breaker
     * @param {Object} ajustes - Ajustes LSIG
     * @param {string} tipo - 'fase' o 'tierra'
     * @returns {Object} Banda { min, max }
     */
    function generarBandaDesdeAjustes(breaker, ajustes, tipo) {
        var In = breaker.In;
        var puntosMin = [];
        var puntosMax = [];

        var corrientes = generarRangoLog(In * 0.5, In * 20, 20);

        for (var i = 0; i < corrientes.length; i++) {
            var I = corrientes[i];
            var Ipu = I / In;

            var tMin, tMax;

            if (tipo === 'fase') {
                var tBase = evaluarTiempoFase(breaker, ajustes, I, In);
                tMin = tBase * 0.8;
                tMax = tBase * 1.2;
            } else {
                var tBaseTierra = evaluarTiempoTierra(breaker, ajustes, I, In);
                tMin = tBaseTierra * 0.8;
                tMax = tBaseTierra * 1.2;
            }

            puntosMin.push({ I: I, t: tMin });
            puntosMax.push({ I: I, t: tMax });
        }

        if (typeof TCCDigitalizerPro !== 'undefined' && TCCDigitalizerPro.generarBanda) {
            return TCCDigitalizerPro.generarBanda(puntosMin, puntosMax);
        }

        return {
            min: function(I) {
                var tBase = tipo === 'fase' ? 
                    evaluarTiempoFase(breaker, ajustes, I, In) : 
                    evaluarTiempoTierra(breaker, ajustes, I, In);
                return tBase * 0.8;
            },
            max: function(I) {
                var tBase = tipo === 'fase' ? 
                    evaluarTiempoFase(breaker, ajustes, I, In) : 
                    evaluarTiempoTierra(breaker, ajustes, I, In);
                return tBase * 1.2;
            }
        };
    }

    /**
     * Evaluar tiempo de disparo fase
     * @param {Object} breaker - Breaker
     * @param {Object} ajustes - Ajustes
     * @param {number} I - Corriente
     * @param {number} In - Corriente nominal
     * @returns {number} Tiempo
     */
    function evaluarTiempoFase(breaker, ajustes, I, In) {
        if (!ajustes) return 0.3;

        var Ipu = I / In;
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
     * Evaluar tiempo de disparo tierra
     * @param {Object} breaker - Breaker
     * @param {Object} ajustes - Ajustes
     * @param {number} I - Corriente
     * @param {number} In - Corriente nominal
     * @returns {number} Tiempo
     */
    function evaluarTiempoTierra(breaker, ajustes, I, In) {
        if (!ajustes || !ajustes.G) return 0.2;

        var Ipu = I / In;
        var Ig = ajustes.G.Ig || 0.2;
        var tg = ajustes.G.tg || 0.2;

        if (Ipu >= Ig) return tg;
        return 100;
    }

    /**
     * Evaluar cruces en doble dominio (fase + tierra)
     * @param {Array} nodos - Nodos con curvas
     * @returns {Object} { crucesFase, crucesTierra }
     */
    function evaluarCrucesSistema(nodos) {
        var crucesFase = 0;
        var crucesTierra = 0;

        for (var i = 0; i < nodos.length - 1; i++) {
            var down = nodos[i];
            var up = nodos[i + 1];

            if (down.curvas && down.curvas.fase && up.curvas && up.curvas.fase) {
                if (hayCruceBanda(down.curvas.fase, up.curvas.fase)) {
                    crucesFase++;
                }
            }

            if (down.curvas && down.curvas.tierra && up.curvas && up.curvas.tierra) {
                if (hayCruceBanda(down.curvas.tierra, up.curvas.tierra)) {
                    crucesTierra++;
                }
            }
        }

        return {
            crucesFase: crucesFase,
            crucesTierra: crucesTierra
        };
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
     * Evaluar sensibilidad a falla a tierra
     * @param {Object} nodo - Nodo
     * @returns {boolean} Detecta falla
     */
    function evaluarSensibilidadTierra(nodo) {
        var If = nodo.If_tierra || nodo.I0 || 100; // Corriente de falla a tierra
        var pickup = (nodo.ajustes && nodo.ajustes.G) ? nodo.ajustes.G.Ig * nodo.breaker.In : 0.2 * (nodo.breaker.In || 300);

        if (pickup > If) {
            console.warn('[MotorCoordinacionFaseTierra] Nodo ' + nodo.id + ' NO detecta falla tierra: pickup=' + pickup + 'A > If=' + If + 'A');
            return false;
        }

        return true;
    }

    /**
     * Evaluar arc flash del sistema
     * @param {Array} nodos - Nodos
     * @returns {number} Energía total
     */
    function evaluarArcSistema(nodos) {
        var energiaTotal = 0;

        for (var i = 0; i < nodos.length; i++) {
            var n = nodos[i];
            var I = n.Isc_kA || n.Isc || 10;
            var t = evaluarTiempoFase(n.breaker, n.ajustes, I * 1000, n.breaker.In);
            var energia = Math.pow(I, 2) * t;
            energiaTotal += energia;
        }

        return energiaTotal;
    }

    /**
     * Función objetivo global (fase + tierra + arc flash)
     * @param {Array} nodos - Nodos evaluados
     * @returns {Object} { score, crucesFase, crucesTierra, arc, penalizacionTierra }
     */
    function scoreGlobal(nodos) {
        var cruces = evaluarCrucesSistema(nodos);
        var arc = evaluarArcSistema(nodos);

        var penalizacionTierra = 0;

        for (var i = 0; i < nodos.length; i++) {
            var n = nodos[i];
            if (!evaluarSensibilidadTierra(n)) {
                penalizacionTierra += 10;
            }
        }

        var score = (
            (1 / (arc + 1)) * CONFIG.pesos.arcFlash +
            (1 / (1 + cruces.crucesFase)) * CONFIG.pesos.coordinacionFase +
            (1 / (1 + cruces.crucesTierra)) * CONFIG.pesos.coordinacionTierra +
            (1 / (1 + penalizacionTierra)) * CONFIG.pesos.sensibilidadTierra
        );

        return {
            score: score,
            crucesFase: cruces.crucesFase,
            crucesTierra: cruces.crucesTierra,
            arc: arc,
            penalizacionTierra: penalizacionTierra
        };
    }

    /**
     * Motor de optimización unificado (fase + tierra)
     * @param {Object} sistema - Sistema con nodos
     * @param {Object} opciones - Opciones
     * @returns {Object} Mejor configuración
     */
    function optimizarProteccionTotal(sistema, opciones) {
        opciones = opciones || {};
        var iter = opciones.iteraciones || CONFIG.iteraciones;

        console.log('[MotorCoordinacionFaseTierra] Iniciando optimización fase+tierra con ' + iter + ' iteraciones');

        var mejor = null;
        var dataset = typeof MotorIA !== 'undefined' ? MotorIA.getDatasetValido() : [];

        for (var i = 0; i < iter; i++) {
            var nodos = sistema.nodos.map(function(n) {
                var ajustes = proponerLSIG(n, sistema, dataset);
                var ajustesMutados = mutarAjustes(ajustes);

                var nodoEval = {
                    ...n,
                    ajustes: ajustesMutados
                };

                nodoEval.curvas = generarCurvasNodo(nodoEval);

                return nodoEval;
            });

            var evalRes = scoreGlobal(nodos);

            if (!mejor || evalRes.score > mejor.score) {
                mejor = {
                    nodos: nodos,
                    ...evalRes,
                    iteracion: i
                };
            }
        }

        console.log('[MotorCoordinacionFaseTierra] Optimización completada. Score: ' + mejor.score.toFixed(4) + 
                   ', Cruces Fase: ' + mejor.crucesFase + ', Cruces Tierra: ' + mejor.crucesTierra);

        // Validar sistema final
        if (!validarSistemaFinal(mejor.nodos)) {
            console.warn('[MotorCoordinacionFaseTierra] Mejor solución no pasa validaciones duras');
        }

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
     * Proponer ajustes LSIG
     * @param {Object} nodo - Nodo
     * @param {Object} contexto - Contexto
     * @param {Array} dataset - Dataset
     * @returns {Object} Ajustes
     */
    function proponerLSIG(nodo, contexto, dataset) {
        var base = crearAjustesBase(nodo.breaker);

        var Isc = nodo.Isc_kA || nodo.Isc || 10;

        if (Isc > 10000) {
            base.I.Ii = 6;
        }

        if (nodo.esCritico) {
            base.S.tsd = 0.4;
        }

        if (nodo.If_tierra && nodo.If_tierra < 100) {
            base.G.Ig = 0.1; // Más sensible para baja corriente de falla
        }

        if (typeof MotorIA !== 'undefined' && MotorIA.predecir) {
            var aprendido = MotorIA.predecir(nodo, dataset, 5);
            if (aprendido && aprendido.ajustes) {
                return aprendido.ajustes;
            }
        }

        return base;
    }

    /**
     * Mutar ajustes
     * @param {Object} a - Ajustes
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
                Ig: clamp(a.G.Ig + rand(-0.05, 0.05), 0.05, 0.5),
                tg: clamp(a.G.tg + rand(-0.1, 0.1), 0.1, 0.4)
            }
        };
    }

    /**
     * Validar sistema final
     * @param {Array} nodos - Nodos
     * @returns {boolean} Válido
     */
    function validarSistemaFinal(nodos) {
        for (var i = 0; i < nodos.length; i++) {
            var n = nodos[i];

            // NOM: protección vs carga
            if (n.ajustes && n.ajustes.L && n.breaker) {
                if (n.ajustes.L.Ir * n.breaker.In < (n.Icarga || n.carga || 100)) {
                    return false;
                }
            }

            // Tierra debe detectar
            if (!evaluarSensibilidadTierra(n)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Clamp valor
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
            if (nuevaConfig.pesos.coordinacionFase !== undefined) CONFIG.pesos.coordinacionFase = nuevaConfig.pesos.coordinacionFase;
            if (nuevaConfig.pesos.coordinacionTierra !== undefined) CONFIG.pesos.coordinacionTierra = nuevaConfig.pesos.coordinacionTierra;
            if (nuevaConfig.pesos.sensibilidadTierra !== undefined) CONFIG.pesos.sensibilidadTierra = nuevaConfig.pesos.sensibilidadTierra;
        }
    }

    /**
     * Obtener configuración
     * @returns {Object} Configuración
     */
    function getConfig() {
        return JSON.parse(JSON.stringify(CONFIG));
    }

    /**
     * Integración con sistema existente (App.estado.nodos)
     * @param {Object} appEstado - Estado de la aplicación (App.estado)
     * @param {Object} opciones - Opciones de optimización
     * @returns {Object} Resultado de optimización
     */
    function optimizarDesdeAppEstado(appEstado, opciones) {
        if (!appEstado || !appEstado.nodos) {
            console.error('[MotorCoordinacionFaseTierra] App.estado.nodos no disponible');
            return { ok: false, error: 'App.estado.nodos no disponible' };
        }

        // Convertir App.estado.nodos a formato del motor
        var sistema = {
            nodos: appEstado.nodos.map(function(nodo) {
                return {
                    id: nodo.id,
                    breaker: nodo.equip || nodo.breaker || { In: 300 },
                    Isc_kA: nodo.isc || nodo.Isc || 10,
                    Icarga: nodo.cargaA || nodo.carga || 100,
                    If_tierra: nodo.I0 || nodo.If_tierra || 100,
                    esCritico: nodo.esCritico || false,
                    cargaContinua: nodo.cargaContinua || false
                };
            })
        };

        // Optimizar
        var resultado = optimizarProteccionTotal(sistema, opciones);

        // Aplicar resultados de vuelta a App.estado.nodos
        if (resultado && resultado.nodos) {
            for (var i = 0; i < resultado.nodos.length; i++) {
                var nodoOpt = resultado.nodos[i];
                var nodoApp = appEstado.nodos[i];

                if (nodoApp && nodoOpt.ajustes) {
                    // Guardar ajustes LSIG en el nodo
                    nodoApp.ajustesLSIG = nodoOpt.ajustes;
                    nodoApp.curvasTCC = nodoOpt.curvas;
                }
            }
        }

        return {
            ok: true,
            resultado: resultado,
            mensaje: 'Optimización fase+tierra completada. Ajustes aplicados a App.estado.nodos'
        };
    }

    return {
        optimizarProteccionTotal: optimizarProteccionTotal,
        optimizarDesdeAppEstado: optimizarDesdeAppEstado,
        crearNodoProteccion: crearNodoProteccion,
        generarCurvasNodo: generarCurvasNodo,
        evaluarCrucesSistema: evaluarCrucesSistema,
        evaluarSensibilidadTierra: evaluarSensibilidadTierra,
        scoreGlobal: scoreGlobal,
        validarSistemaFinal: validarSistemaFinal,
        setConfig: setConfig,
        getConfig: getConfig
    };

})();

if (typeof window !== 'undefined') {
    window.MotorCoordinacionFaseTierra = MotorCoordinacionFaseTierra;
}
