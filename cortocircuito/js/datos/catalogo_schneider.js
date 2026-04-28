/**
 * catalogo_schneider.js — Catálogo Estructurado Schneider Electric
 * 
 * Estructura industrial real tipo ETAP/SKM
 * - PowerPact (termomagnético)
 * - ComPactNSX (electrónico)
 * - Masterpact (LSIG completo)
 * 
 * Normalización:
 * - Icu por voltaje
 * - Ajustes reales por tipo de curva
 * - Rangos de corriente por frame
 */

var CatalogoSchneider = (function() {

    /**
     * Catálogo completo Schneider Electric
     * Estructura jerárquica: Línea → Modelo → Datos técnicos
     */
    var catalogo = {
        PowerPact: {
            P: {
                frame: "P-Frame",
                descripcion: "PowerPact P-Frame (termomagnético)",
                rangos: [100, 150, 175, 200, 225, 250, 300],
                Icu: {
                    240: 14,  // kA @ 240V
                    480: 25,  // kA @ 480V
                    600: 18   // kA @ 600V
                },
                tipoCurva: "termomagnetico",
                ajustes: {
                    longDelay: [2, 4, 6, 8, 10],      // segundos
                    shortDelay: [0.1, 0.2, 0.3, 0.4], // segundos
                    instantaneo: [5, 7, 10, 12]      // múltiplos de In
                }
            },
            H: {
                frame: "H-Frame",
                descripcion: "PowerPact H-Frame (termomagnético)",
                rangos: [250, 300, 350, 400, 500, 600],
                Icu: {
                    240: 25,
                    480: 35,
                    600: 25
                },
                tipoCurva: "termomagnetico",
                ajustes: {
                    longDelay: [2, 4, 6, 8, 10],
                    shortDelay: [0.1, 0.2, 0.3, 0.4],
                    instantaneo: [5, 7, 10, 12]
                }
            },
            J: {
                frame: "J-Frame",
                descripcion: "PowerPact J-Frame (termomagnético)",
                rangos: [250, 300, 350, 400, 500, 600, 800, 1000, 1200],
                Icu: {
                    240: 35,
                    480: 50,
                    600: 35
                },
                tipoCurva: "termomagnetico",
                ajustes: {
                    longDelay: [2, 4, 6, 8, 10],
                    shortDelay: [0.1, 0.2, 0.3, 0.4],
                    instantaneo: [5, 7, 10, 12]
                }
            },
            L: {
                frame: "L-Frame",
                descripcion: "PowerPact L-Frame (electrónico)",
                rangos: [250, 300, 350, 400, 500, 600, 800, 1000, 1200],
                Icu: {
                    240: 42,
                    480: 65,
                    600: 50
                },
                tipoCurva: "electronico",
                ajustes: {
                    Ir: [0.4, 0.5, 0.6, 0.8, 1.0],  // Long pickup (x In)
                    Isd: [1.5, 2, 3, 4, 5],          // Short pickup (x Ir)
                    Ii: [2, 3, 5, 8, 10]              // Instantaneous (x In)
                }
            }
        },

        ComPactNSX: {
            NSX100: {
                frame: "NSX100",
                descripcion: "ComPact NSX100 (electrónico)",
                rangos: [16, 25, 32, 40, 50, 63, 80, 100],
                Icu: {
                    240: 25,
                    480: 36,
                    600: 25
                },
                tipoCurva: "electronico",
                ajustes: {
                    Ir: [0.4, 0.5, 0.6, 0.8, 1.0],
                    Isd: [1.5, 2, 3, 4, 5],
                    Ii: [2, 3, 5, 8, 10]
                }
            },
            NSX160: {
                frame: "NSX160",
                descripcion: "ComPact NSX160 (electrónico)",
                rangos: [100, 125, 160],
                Icu: {
                    240: 25,
                    480: 36,
                    600: 25
                },
                tipoCurva: "electronico",
                ajustes: {
                    Ir: [0.4, 0.5, 0.6, 0.8, 1.0],
                    Isd: [1.5, 2, 3, 4, 5],
                    Ii: [2, 3, 5, 8, 10]
                }
            },
            NSX250: {
                frame: "NSX250",
                descripcion: "ComPact NSX250 (electrónico)",
                rangos: [160, 200, 250],
                Icu: {
                    240: 35,
                    480: 50,
                    600: 35
                },
                tipoCurva: "electronico",
                ajustes: {
                    Ir: [0.4, 0.5, 0.6, 0.8, 1.0],
                    Isd: [1.5, 2, 3, 4, 5],
                    Ii: [2, 3, 5, 8, 10]
                }
            },
            NSX400: {
                frame: "NSX400",
                descripcion: "ComPact NSX400 (electrónico)",
                rangos: [250, 320, 400],
                Icu: {
                    240: 35,
                    480: 50,
                    600: 35
                },
                tipoCurva: "electronico",
                ajustes: {
                    Ir: [0.4, 0.5, 0.6, 0.8, 1.0],
                    Isd: [1.5, 2, 3, 4, 5],
                    Ii: [2, 3, 5, 8, 10]
                }
            },
            NSX630: {
                frame: "NSX630",
                descripcion: "ComPact NSX630 (electrónico)",
                rangos: [400, 500, 630],
                Icu: {
                    240: 42,
                    480: 65,
                    600: 50
                },
                tipoCurva: "electronico",
                ajustes: {
                    Ir: [0.4, 0.5, 0.6, 0.8, 1.0],
                    Isd: [1.5, 2, 3, 4, 5],
                    Ii: [2, 3, 5, 8, 10]
                }
            }
        },

        Masterpact: {
            MTZ1: {
                frame: "MTZ1",
                descripcion: "Masterpact MTZ1 (LSIG)",
                rangos: [800, 1000, 1200, 1600],
                Icu: {
                    240: 50,
                    480: 65,
                    600: 50
                },
                tipoCurva: "LSIG",
                ajustes: {
                    L: [0.4, 0.5, 0.6, 0.8, 1.0],  // Long pickup (x In)
                    S: [1.5, 2, 3, 4],            // Short pickup (x Ir)
                    I: [2, 4, 6, 8, 10],          // Instantaneous (x In)
                    G: [0.2, 0.4, 0.6]            // Ground pickup (x In)
                }
            },
            MTZ2: {
                frame: "MTZ2",
                descripcion: "Masterpact MTZ2 (LSIG)",
                rangos: [2000, 2500, 3200, 4000],
                Icu: {
                    240: 65,
                    480: 100,
                    600: 85
                },
                tipoCurva: "LSIG",
                ajustes: {
                    L: [0.4, 0.5, 0.6, 0.8, 1.0],
                    S: [1.5, 2, 3, 4],
                    I: [2, 4, 6, 8, 10],
                    G: [0.2, 0.4, 0.6]
                }
            },
            MTZ3: {
                frame: "MTZ3",
                descripcion: "Masterpact MTZ3 (LSIG)",
                rangos: [4000, 5000, 6300],
                Icu: {
                    240: 85,
                    480: 130,
                    600: 100
                },
                tipoCurva: "LSIG",
                ajustes: {
                    L: [0.4, 0.5, 0.6, 0.8, 1.0],
                    S: [1.5, 2, 3, 4],
                    I: [2, 4, 6, 8, 10],
                    G: [0.2, 0.4, 0.6]
                }
            }
        }
    };

    /**
     * Motor de selección real Schneider
     * Basado en CDT (I_diseño) y corto circuito (Icc)
     * @param {Object} params - { I_diseno, Icc, V }
     * @returns {Object} Breaker seleccionado o null
     */
    function seleccionarBreakerSchneider(params) {
        var I_diseno = params.I_diseno || 0;
        var Icc = params.Icc || 0;
        var V = params.V || 480; // Voltaje por defecto 480V

        var candidatos = [];

        // Recorrer catálogo jerárquico
        Object.keys(catalogo).forEach(function(linea) {
            var frames = catalogo[linea];
            Object.keys(frames).forEach(function(modelo) {
                var data = frames[modelo];

                // Obtener Icu para el voltaje especificado
                var Icu = data.Icu[V] || data.Icu[480] || 0;

                // Recorrer rangos de corriente
                data.rangos.forEach(function(In) {
                    // Validar requisitos
                    if (In >= I_diseno && Icu >= Icc) {
                        candidatos.push({
                            linea: linea,
                            modelo: modelo,
                            frame: data.frame,
                            descripcion: data.descripcion,
                            In: In,
                            Icu: Icu,
                            tipoCurva: data.tipoCurva,
                            ajustes: data.ajustes,
                            voltaje: V
                        });
                    }
                });
            });
        });

        if (candidatos.length === 0) {
            console.warn('[CatalogoSchneider] No hay breaker para I_diseno=' + I_diseno + 'A, Icc=' + Icc + 'kA @ ' + V + 'V');
            return null;
        }

        // Ordenar por corriente nominal (mínimo sobredimensionamiento)
        candidatos.sort(function(a, b) {
            return a.In - b.In;
        });

        var seleccionado = candidatos[0];
        if (typeof Debug !== 'undefined') {
            Debug.log('[CatalogoSchneider] Breaker seleccionado: ' + seleccionado.linea + ' ' + seleccionado.modelo + ' ' + seleccionado.In + 'A (Icu=' + seleccionado.Icu + 'kA @ ' + V + 'V)');
        }

        return seleccionado;
    }

    /**
     * Generación de curva TCC real por tipo
     * @param {Object} breaker - Breaker seleccionado
     * @returns {Array} Puntos de curva [{I, t}, ...]
     */
    function generarCurvaSchneider(breaker) {
        if (!breaker) return [];

        var In = breaker.In;
        var tipo = breaker.tipoCurva;

        if (tipo === "termomagnetico") {
            // Curva termomagnética típica
            return [
                { I: In, t: 100 },
                { I: 1.5 * In, t: 50 },
                { I: 2 * In, t: 10 },
                { I: 5 * In, t: 1 },
                { I: 10 * In, t: 0.1 },
                { I: 20 * In, t: 0.02 }
            ];
        }

        if (tipo === "electronico") {
            // Curva electrónica (más rápida)
            return [
                { I: 0.8 * In, t: 50 },
                { I: In, t: 20 },
                { I: 2 * In, t: 5 },
                { I: 5 * In, t: 0.5 },
                { I: 10 * In, t: 0.05 }
            ];
        }

        if (tipo === "LSIG") {
            // Curva LSIG completa (Long, Short, Instantaneous, Ground)
            return [
                { I: 0.5 * In, t: 100 },
                { I: In, t: 20 },
                { I: 3 * In, t: 1 },
                { I: 8 * In, t: 0.1 },
                { I: 15 * In, t: 0.02 }
            ];
        }

        // Fallback genérico
        return [
            { I: In, t: 100 },
            { I: 2 * In, t: 10 },
            { I: 5 * In, t: 1 },
            { I: 10 * In, t: 0.1 }
        ];
    }

    /**
     * Genera parámetros TCC LSIG desde ajustes del breaker
     * @param {Object} breaker - Breaker seleccionado
     * @param {Object} params - { I_diseno }
     * @returns {Object} Parámetros TCC LSIG
     */
    function generarTCCSchneider(breaker, params) {
        if (!breaker) return null;

        var I_diseno = params.I_diseno || breaker.In;
        var In = breaker.In;
        var ajustes = breaker.ajustes;
        var tipo = breaker.tipoCurva;

        var tcc = {
            long: { pickup: 1.0, delay: 6 },
            short: { pickup: 5.0, delay: 0.3 },
            inst: { pickup: 10.0 },
            ground: { pickup: 0.3, delay: 0.2 }
        };

        if (tipo === "termomagnetico") {
            tcc.long.pickup = 1.0;
            tcc.long.delay = ajustes.longDelay[0] || 6;
            tcc.short.pickup = 5.0;
            tcc.short.delay = ajustes.shortDelay[0] || 0.3;
            tcc.inst.pickup = ajustes.instantaneo[0] || 10;
        }

        if (tipo === "electronico") {
            tcc.long.pickup = ajustes.Ir[0] || 0.8;
            tcc.long.delay = 6;
            tcc.short.pickup = ajustes.Isd[0] || 2;
            tcc.short.delay = 0.3;
            tcc.inst.pickup = ajustes.Ii[0] || 5;
        }

        if (tipo === "LSIG") {
            tcc.long.pickup = ajustes.L[0] || 0.8;
            tcc.long.delay = 6;
            tcc.short.pickup = ajustes.S[0] || 2;
            tcc.short.delay = 0.3;
            tcc.inst.pickup = ajustes.I[0] || 4;
            tcc.ground.pickup = ajustes.G[0] || 0.4;
            tcc.ground.delay = 0.2;
        }

        return tcc;
    }

    /**
     * Obtener todos los breakers disponibles (para UI)
     * @returns {Array} Lista de breakers
     */
    function obtenerTodosBreakers() {
        var lista = [];

        Object.keys(catalogo).forEach(function(linea) {
            var frames = catalogo[linea];
            Object.keys(frames).forEach(function(modelo) {
                var data = frames[modelo];
                data.rangos.forEach(function(In) {
                    lista.push({
                        linea: linea,
                        modelo: modelo,
                        frame: data.frame,
                        descripcion: data.descripcion,
                        In: In,
                        Icu: data.Icu,
                        tipoCurva: data.tipoCurva
                    });
                });
            });
        });

        return lista;
    }

    return {
        catalogo: catalogo,
        seleccionarBreakerSchneider: seleccionarBreakerSchneider,
        generarCurvaSchneider: generarCurvaSchneider,
        generarTCCSchneider: generarTCCSchneider,
        obtenerTodosBreakers: obtenerTodosBreakers
    };

})();

if (typeof window !== 'undefined') {
    window.CatalogoSchneider = CatalogoSchneider;
}
