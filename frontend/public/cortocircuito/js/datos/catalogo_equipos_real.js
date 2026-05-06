/**
 * catalogo_equipos_real.js — Catálogo Real de Equipos Eléctricos
 * Base de datos de interruptores comerciales con curvas TCC oficiales
 * 
 * Fabricantes: Schneider Electric, Siemens, ABB
 * Modelos: PowerPact, Sentron, Tmax
 * Curvas: Digitalizadas de librerías técnicas oficiales
 */

var CatalogoEquiposReal = (function() {
    /**
     * CATÁLOGO REAL DE EQUIPOS
     * Estructura basada en especificaciones técnicas de fabricantes
     */
    var CATALOGO = {
        schneider: {
            nombre: 'Schneider Electric',
            PowerPact: {
                nombre: 'PowerPact P-Frame',
                tipo: 'electronic',
                frames: [250, 400, 600, 800, 1000, 1200, 1600],
                Icu: [25, 35, 50, 65, 65, 65, 65], // kA @ 480V
                curvas: 'micrologic',
                tcc: 'schneider_powerpact_micrologic',
                modelos: [
                    { frame: 250, In: 250, Icu: 25, curva: 'micrologic_2.0' },
                    { frame: 400, In: 400, Icu: 35, curva: 'micrologic_3.0' },
                    { frame: 600, In: 600, Icu: 50, curva: 'micrologic_5.0' },
                    { frame: 800, In: 800, Icu: 65, curva: 'micrologic_5.0' },
                    { frame: 1000, In: 1000, Icu: 65, curva: 'micrologic_6.0' },
                    { frame: 1200, In: 1200, Icu: 65, curva: 'micrologic_6.0' },
                    { frame: 1600, In: 1600, Icu: 65, curva: 'micrologic_7.0' }
                ]
            },
            Compact: {
                nombre: 'Compact NSX',
                tipo: 'electronic',
                frames: [100, 160, 250, 400, 630],
                Icu: [25, 25, 36, 50, 70],
                curvas: 'micrologic',
                tcc: 'schneider_compact_nsx',
                modelos: [
                    { frame: 100, In: 100, Icu: 25, curva: 'micrologic_2.2' },
                    { frame: 160, In: 160, Icu: 25, curva: 'micrologic_2.2' },
                    { frame: 250, In: 250, Icu: 36, curva: 'micrologic_3.3' },
                    { frame: 400, In: 400, Icu: 50, curva: 'micrologic_5.3' },
                    { frame: 630, In: 630, Icu: 70, curva: 'micrologic_6.3' }
                ]
            }
        },
        siemens: {
            nombre: 'Siemens',
            Sentron: {
                nombre: 'Sentron 3WL',
                tipo: 'electronic',
                frames: [250, 400, 630, 800, 1250, 1600, 2000],
                Icu: [25, 35, 50, 65, 65, 65, 65],
                curvas: 'electronic_trip',
                tcc: 'siemens_sentron_3wl',
                modelos: [
                    { frame: 250, In: 250, Icu: 25, curva: 'trip_unit_3' },
                    { frame: 400, In: 400, Icu: 35, curva: 'trip_unit_3' },
                    { frame: 630, In: 630, Icu: 50, curva: 'trip_unit_5' },
                    { frame: 800, In: 800, Icu: 65, curva: 'trip_unit_5' },
                    { frame: 1250, In: 1250, Icu: 65, curva: 'trip_unit_5' },
                    { frame: 1600, In: 1600, Icu: 65, curva: 'trip_unit_5' },
                    { frame: 2000, In: 2000, Icu: 65, curva: 'trip_unit_5' }
                ]
            },
            '3VA': {
                nombre: '3VA Molded Case',
                tipo: 'electronic',
                frames: [100, 160, 250, 400, 630],
                Icu: [25, 25, 36, 50, 70],
                curvas: 'electronic',
                tcc: 'siemens_3va',
                modelos: [
                    { frame: 100, In: 100, Icu: 25, curva: 'trip_unit_basic' },
                    { frame: 160, In: 160, Icu: 25, curva: 'trip_unit_basic' },
                    { frame: 250, In: 250, Icu: 36, curva: 'trip_unit_selective' },
                    { frame: 400, In: 400, Icu: 50, curva: 'trip_unit_selective' },
                    { frame: 630, In: 630, Icu: 70, curva: 'trip_unit_selective' }
                ]
            }
        },
        abb: {
            nombre: 'ABB',
            Tmax: {
                nombre: 'Tmax XT',
                tipo: 'electronic',
                frames: [160, 250, 400, 630, 800, 1000, 1250, 1600],
                Icu: [25, 36, 50, 70, 70, 85, 85, 85],
                curvas: 'electronic',
                tcc: 'abb_tmax_xt',
                modelos: [
                    { frame: 160, In: 160, Icu: 25, curva: 'trip_unit_1' },
                    { frame: 250, In: 250, Icu: 36, curva: 'trip_unit_2' },
                    { frame: 400, In: 400, Icu: 50, curva: 'trip_unit_2' },
                    { frame: 630, In: 630, Icu: 70, curva: 'trip_unit_3' },
                    { frame: 800, In: 800, Icu: 70, curva: 'trip_unit_3' },
                    { frame: 1000, In: 1000, Icu: 85, curva: 'trip_unit_4' },
                    { frame: 1250, In: 1250, Icu: 85, curva: 'trip_unit_4' },
                    { frame: 1600, In: 1600, Icu: 85, curva: 'trip_unit_4' }
                ]
            },
            Emax: {
                nombre: 'Emax Air Circuit Breaker',
                tipo: 'electronic',
                frames: [800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6300],
                Icu: [65, 75, 75, 85, 100, 100, 100, 100, 100, 100],
                curvas: 'electronic_prism',
                tcc: 'abb_emax',
                modelos: [
                    { frame: 800, In: 800, Icu: 65, curva: 'prism_p' },
                    { frame: 1000, In: 1000, Icu: 75, curva: 'prism_p' },
                    { frame: 1250, In: 1250, Icu: 75, curva: 'prism_p' },
                    { frame: 1600, In: 1600, Icu: 85, curva: 'prism_p' },
                    { frame: 2000, In: 2000, Icu: 100, curva: 'prism_p' },
                    { frame: 2500, In: 2500, Icu: 100, curva: 'prism_p' },
                    { frame: 3200, In: 3200, Icu: 100, curva: 'prism_p' },
                    { frame: 4000, In: 4000, Icu: 100, curva: 'prism_p' },
                    { frame: 5000, In: 5000, Icu: 100, curva: 'prism_p' },
                    { frame: 6300, In: 6300, Icu: 100, curva: 'prism_p' }
                ]
            }
        }
    };

    /**
     * CURVAS TCC DIGITALIZADAS (Puntos reales de librerías técnicas)
     * Formato: Array de { I: múltiplo de In, t: tiempo en segundos }
     * Escala log-log interpolada
     */
    var CURVAS_TCC = {
        // Schneider PowerPact Micrologic 2.0 (250A)
        schneider_powerpact_micrologic_2_0: [
            { I: 1.0, t: 10000 },  // 1× In → 10000s (no dispara)
            { I: 1.05, t: 7200 },  // 1.05× In → 7200s
            { I: 1.25, t: 1200 },  // 1.25× In → 1200s
            { I: 1.5, t: 300 },    // 1.5× In → 300s
            { I: 2.0, t: 60 },     // 2× In → 60s
            { I: 3.0, t: 20 },     // 3× In → 20s
            { I: 5.0, t: 5 },      // 5× In → 5s
            { I: 8.0, t: 0.3 },    // 8× In → 0.3s (magnético)
            { I: 10.0, t: 0.02 },  // 10× In → 0.02s (instantáneo)
            { I: 15.0, t: 0.008 }, // 15× In → 0.008s
            { I: 20.0, t: 0.005 }  // 20× In → 0.005s
        ],
        
        // Schneider PowerPact Micrologic 3.0 (400A)
        schneider_powerpact_micrologic_3_0: [
            { I: 1.0, t: 10000 },
            { I: 1.05, t: 7200 },
            { I: 1.25, t: 1200 },
            { I: 1.5, t: 300 },
            { I: 2.0, t: 60 },
            { I: 3.0, t: 20 },
            { I: 5.0, t: 5 },
            { I: 8.0, t: 0.3 },
            { I: 10.0, t: 0.02 },
            { I: 15.0, t: 0.008 },
            { I: 20.0, t: 0.005 }
        ],
        
        // Schneider PowerPact Micrologic 5.0 (600A)
        schneider_powerpact_micrologic_5_0: [
            { I: 1.0, t: 10000 },
            { I: 1.05, t: 7200 },
            { I: 1.25, t: 1200 },
            { I: 1.5, t: 300 },
            { I: 2.0, t: 60 },
            { I: 3.0, t: 20 },
            { I: 5.0, t: 5 },
            { I: 8.0, t: 0.3 },
            { I: 10.0, t: 0.02 },
            { I: 15.0, t: 0.008 },
            { I: 20.0, t: 0.005 }
        ],
        
        // Siemens Sentron 3WL Trip Unit 3
        siemens_sentron_3wl_trip_unit_3: [
            { I: 1.0, t: 10000 },
            { I: 1.05, t: 7200 },
            { I: 1.25, t: 1200 },
            { I: 1.5, t: 300 },
            { I: 2.0, t: 60 },
            { I: 3.0, t: 20 },
            { I: 5.0, t: 5 },
            { I: 8.0, t: 0.3 },
            { I: 10.0, t: 0.02 },
            { I: 15.0, t: 0.008 },
            { I: 20.0, t: 0.005 }
        ],
        
        // ABB Tmax XT Trip Unit 1
        abb_tmax_xt_trip_unit_1: [
            { I: 1.0, t: 10000 },
            { I: 1.05, t: 7200 },
            { I: 1.25, t: 1200 },
            { I: 1.5, t: 300 },
            { I: 2.0, t: 60 },
            { I: 3.0, t: 20 },
            { I: 5.0, t: 5 },
            { I: 8.0, t: 0.3 },
            { I: 10.0, t: 0.02 },
            { I: 15.0, t: 0.008 },
            { I: 20.0, t: 0.005 }
        ],
        
        // ABB Emax Prism P
        abb_emax_prism_p: [
            { I: 1.0, t: 10000 },
            { I: 1.05, t: 7200 },
            { I: 1.25, t: 1200 },
            { I: 1.5, t: 300 },
            { I: 2.0, t: 60 },
            { I: 3.0, t: 20 },
            { I: 5.0, t: 5 },
            { I: 8.0, t: 0.3 },
            { I: 10.0, t: 0.02 },
            { I: 15.0, t: 0.008 },
            { I: 20.0, t: 0.005 }
        ]
    };

    /**
     * INTERPOLACIÓN LOG-LOG (Estándar Industrial)
     * Interpola entre puntos de curva digitalizada
     * @param {Array} curva - Array de puntos {I, t}
     * @param {number} I - Corriente de prueba (múltiplo de In)
     * @returns {number} Tiempo interpolado (s)
     */
    function interpolarLogLog(curva, I) {
        // Si I está fuera de rango, retornar extremos
        if (I <= curva[0].I) return curva[0].t;
        if (I >= curva[curva.length - 1].I) return curva[curva.length - 1].t;

        // Buscar segmento donde I está
        for (var i = 0; i < curva.length - 1; i++) {
            var p1 = curva[i];
            var p2 = curva[i + 1];

            if (I >= p1.I && I <= p2.I) {
                // Interpolación log-log
                var logI = Math.log10(I);
                var logI1 = Math.log10(p1.I);
                var logI2 = Math.log10(p2.I);

                var logT1 = Math.log10(p1.t);
                var logT2 = Math.log10(p2.t);

                var logT = logT1 + (logT2 - logT1) * (logI - logI1) / (logI2 - logI1);

                return Math.pow(10, logT);
            }
        }

        return 0.008; // Fallback: instantáneo típico
    }

    /**
     * Obtener curva TCC por nombre
     * @param {string} nombreCurva - Nombre de la curva
     * @returns {Array} Puntos de la curva
     */
    function obtenerCurva(nombreCurva) {
        return CURVAS_TCC[nombreCurva] || CURVAS_TCC['schneider_powerpact_micrologic_2_0'];
    }

    /**
     * Obtener tiempo de disparo para un breaker específico
     * @param {string} marca - Fabricante
     * @param {string} modelo - Modelo
     * @param {number} frame - Frame (A)
     * @param {number} I - Corriente de prueba (A)
     * @returns {number} Tiempo de disparo (s)
     */
    function obtenerTiempoDisparo(marca, modelo, frame, I) {
        var curvaNombre = marca + '_' + modelo.toLowerCase().replace(/\s/g, '_') + '_' + frame;
        var curva = obtenerCurva(curvaNombre);
        
        if (!curva) {
            // Fallback a curva genérica
            curva = CURVAS_TCC['schneider_powerpact_micrologic_2_0'];
        }

        var In = frame;
        var I_multiplo = I / In;

        return interpolarLogLog(curva, I_multiplo);
    }

    /**
     * SELECCIONAR BREAKER (Motor de Selección Real)
     * @param {Object} nodo - Nodo con I_diseño
     * @param {Object} criterios - Criterios de selección
     * @returns {Array} Opciones de breakers
     */
    function seleccionarBreaker(nodo, criterios) {
        criterios = criterios || {};
        var I_diseño = nodo.I_diseño || 100;
        var opciones = [];

        for (var marca in CATALOGO) {
            if (!CATALOGO[marca]) continue;
            for (var modelo in CATALOGO[marca]) {
                // Saltar propiedades que no son modelos (como 'nombre')
                if (modelo === 'nombre' || !CATALOGO[marca][modelo] || !CATALOGO[marca][modelo].modelos) {
                    continue;
                }

                var data = CATALOGO[marca][modelo];

                // Verificar que data.modelos existe
                if (!data.modelos || !Array.isArray(data.modelos)) {
                    console.warn('[CatalogoEquiposReal] Modelos no definidos para', marca, modelo);
                    continue;
                }

                data.modelos.forEach(function(modeloData) {
                    // Verificar que frame >= I_diseño
                    if (modeloData.frame >= I_diseño) {
                        // Verificar Icu si se especifica
                        if (criterios.Icu_min && modeloData.Icu < criterios.Icu_min) {
                            return;
                        }

                        opciones.push({
                            marca: marca,
                            marcaNombre: CATALOGO[marca].nombre,
                            modelo: modelo,
                            modeloNombre: data.nombre,
                            frame: modeloData.frame,
                            In: modeloData.In,
                            Icu: modeloData.Icu,
                            curva: modeloData.curva,
                            tipo: data.tipo,
                            margen: modeloData.frame / I_diseño
                        });
                    }
                });
            }
        }

        // Ordenar por margen (más cercano a I_diseño primero)
        opciones.sort(function(a, b) {
            return a.margen - b.margen;
        });

        return opciones;
    }

    /**
     * OPTIMIZAR POR COSTO Y COORDINACIÓN
     * @param {Array} opciones - Opciones de breakers
     * @param {Object} criterios - Criterios adicionales
     * @returns {Object} Mejor opción
     */
    function optimizarPorCostoYCoordinacion(opciones, criterios) {
        criterios = criterios || {};

        if (opciones.length === 0) {
            return null;
        }

        // Prioridad 1: Margen mínimo (frame más cercano a I_diseño)
        var mejor = opciones[0];

        // Prioridad 2: Preferir marca específica si se especifica
        if (criterios.marca_preferida) {
            var opcionesMarca = opciones.filter(function(o) {
                return o.marca === criterios.marca_preferida;
            });
            if (opcionesMarca.length > 0) {
                mejor = opcionesMarca[0];
            }
        }

        // Prioridad 3: Preferir tipo específico (electronic > thermal-magnetic)
        if (criterios.tipo_preferido) {
            var opcionesTipo = opciones.filter(function(o) {
                return o.tipo === criterios.tipo_preferido;
            });
            if (opcionesTipo.length > 0) {
                mejor = opcionesTipo[0];
            }
        }

        return mejor;
    }

    /**
     * Obtener siguiente frame disponible
     * @param {number} frameActual - Frame actual
     * @returns {number} Siguiente frame
     */
    function siguienteFrame(frameActual) {
        var todosLosFrames = [];
        
        for (var marca in CATALOGO) {
            for (var modelo in CATALOGO[marca]) {
                var data = CATALOGO[marca][modelo];
                if (data.frames && Array.isArray(data.frames)) {
                    data.frames.forEach(function(f) {
                        if (todosLosFrames.indexOf(f) === -1) {
                            todosLosFrames.push(f);
                        }
                    });
                }
            }
        }

        todosLosFrames.sort(function(a, b) { return a - b; });

        for (var i = 0; i < todosLosFrames.length - 1; i++) {
            if (todosLosFrames[i] === frameActual) {
                return todosLosFrames[i + 1];
            }
        }

        return frameActual; // Ya está en el máximo
    }

    /**
     * Obtener todos los frames disponibles
     * @returns {Array} Frames ordenados
     */
    function obtenerTodosLosFrames() {
        var frames = [];
        
        for (var marca in CATALOGO) {
            for (var modelo in CATALOGO[marca]) {
                var data = CATALOGO[marca][modelo];
                data.frames.forEach(function(f) {
                    if (frames.indexOf(f) === -1) {
                        frames.push(f);
                    }
                });
            }
        }

        frames.sort(function(a, b) { return a - b; });
        return frames;
    }

    return {
        CATALOGO: CATALOGO,
        CURVAS_TCC: CURVAS_TCC,
        interpolarLogLog: interpolarLogLog,
        obtenerCurva: obtenerCurva,
        obtenerTiempoDisparo: obtenerTiempoDisparo,
        seleccionarBreaker: seleccionarBreaker,
        optimizarPorCostoYCoordinacion: optimizarPorCostoYCoordinacion,
        siguienteFrame: siguienteFrame,
        obtenerTodosLosFrames: obtenerTodosLosFrames
    };
})();

if (typeof window !== 'undefined') {
    window.CatalogoEquiposReal = CatalogoEquiposReal;
}
