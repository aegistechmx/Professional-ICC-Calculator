/**
 * breaker_selector.js — Selector de Protección Completo
 * 
 * Flujo industrial real: Ampacidad → Breaker → TCC → Coordinación
 * Integra calcularAmpacidadCDT con selección automática de interruptores
 */

var BreakerSelector = (function() {

    /**
     * Catálogo simplificado de breakers (base para expansión)
     * Datos reales de fabricantes comunes
     */
    var BREAKERS = [
        // Square D PowerPact
        {
            marca: "Square D",
            linea: "PowerPact",
            modelo: "MGL36200",
            In: 200,
            Icu: 35, // kA @ 480V
            curva: "electronic",
            ajustes: {
                longDelay: [0.5, 1, 2, 4],
                shortDelay: [0.1, 0.2, 0.3],
                inst: [1000, 1500, 2000, 2500]
            }
        },
        {
            marca: "Square D",
            linea: "PowerPact",
            modelo: "MGL36250",
            In: 250,
            Icu: 35,
            curva: "electronic",
            ajustes: {
                longDelay: [0.5, 1, 2, 4],
                shortDelay: [0.1, 0.2, 0.3],
                inst: [1250, 1875, 2500, 3125]
            }
        },
        {
            marca: "Square D",
            linea: "PowerPact",
            modelo: "MGL36300",
            In: 300,
            Icu: 35,
            curva: "electronic",
            ajustes: {
                longDelay: [0.5, 1, 2, 4],
                shortDelay: [0.1, 0.2, 0.3],
                inst: [1500, 2250, 3000, 3750]
            }
        },
        {
            marca: "Square D",
            linea: "PowerPact",
            modelo: "MGL36400",
            In: 400,
            Icu: 35,
            curva: "electronic",
            ajustes: {
                longDelay: [0.5, 1, 2, 4],
                shortDelay: [0.1, 0.2, 0.3],
                inst: [2000, 3000, 4000, 5000]
            }
        },
        {
            marca: "Square D",
            linea: "PowerPact",
            modelo: "MGL36500",
            In: 500,
            Icu: 35,
            curva: "electronic",
            ajustes: {
                longDelay: [0.5, 1, 2, 4],
                shortDelay: [0.1, 0.2, 0.3],
                inst: [2500, 3750, 5000, 6250]
            }
        },
        {
            marca: "Square D",
            linea: "PowerPact",
            modelo: "MGL36600",
            In: 600,
            Icu: 50,
            curva: "electronic",
            ajustes: {
                longDelay: [0.5, 1, 2, 4],
                shortDelay: [0.1, 0.2, 0.3],
                inst: [3000, 4500, 6000, 7500]
            }
        },
        // Siemens Sentron
        {
            marca: "Siemens",
            linea: "Sentron",
            modelo: "3VL4720",
            In: 200,
            Icu: 50,
            curva: "electronic",
            ajustes: {
                longDelay: [0.5, 1, 2, 4],
                shortDelay: [0.1, 0.2, 0.3],
                inst: [1000, 1500, 2000, 2500]
            }
        },
        {
            marca: "Siemens",
            linea: "Sentron",
            modelo: "3VL4740",
            In: 400,
            Icu: 50,
            curva: "electronic",
            ajustes: {
                longDelay: [0.5, 1, 2, 4],
                shortDelay: [0.1, 0.2, 0.3],
                inst: [2000, 3000, 4000, 5000]
            }
        },
        {
            marca: "Siemens",
            linea: "Sentron",
            modelo: "3VL4760",
            In: 600,
            Icu: 65,
            curva: "electronic",
            ajustes: {
                longDelay: [0.5, 1, 2, 4],
                shortDelay: [0.1, 0.2, 0.3],
                inst: [3000, 4500, 6000, 7500]
            }
        }
    ];

    /**
     * Selecciona breaker basado en ampacidad y requisitos del nodo
     * @param {Object} nodo - Nodo del sistema con Isc_kA
     * @param {Object} ampacidad - Resultado de calcularAmpacidadCDT
     * @returns {Object} { ok, breaker, error }
     */
    function seleccionarBreaker(nodo, ampacidad) {
        var I_diseno = ampacidad.I_diseno;
        var I_final = ampacidad.I_final;
        var Isc_kA = nodo.Isc_kA || 0;

        // 🔥 1. Corriente mínima requerida
        var In_min = Math.max(I_diseno, I_final * 0.8);

        // 🔥 2. Filtrar por corriente nominal
        var candidatos = BREAKERS.filter(function(b) {
            return b.In >= In_min;
        });

        if (candidatos.length === 0) {
            return {
                ok: false,
                error: "No hay breaker disponible para corriente requerida: In_min=" + In_min.toFixed(1) + "A"
            };
        }

        // 🔥 3. Filtrar por corto circuito
        candidatos = candidatos.filter(function(b) {
            return b.Icu >= Isc_kA;
        });

        if (candidatos.length === 0) {
            return {
                ok: false,
                error: "Ningún breaker soporta Isc=" + Isc_kA.toFixed(1) + "kA (mínimo requerido)"
            };
        }

        // 🔥 4. Seleccionar el más cercano (optimización costo)
        candidatos.sort(function(a, b) {
            return a.In - b.In;
        });

        var seleccionado = candidatos[0];

        console.log('[BreakerSelector] Breaker seleccionado: ' + seleccionado.marca + ' ' + seleccionado.modelo + ' ' + seleccionado.In + 'A (Icu=' + seleccionado.Icu + 'kA)');

        return {
            ok: true,
            breaker: seleccionado
        };
    }

    /**
     * Ajusta automáticamente parámetros TCC basado en ampacidad y breaker
     * @param {Object} breaker - Breaker seleccionado
     * @param {Object} ampacidad - Resultado de calcularAmpacidadCDT
     * @returns {Object} Parámetros TCC ajustados
     */
    function ajustarTCC(breaker, ampacidad) {
        var I_diseno = ampacidad.I_diseno;
        var In = breaker.In;

        return {
            longDelayPickup: I_diseno * 1.1,   // no dispara en carga
            longDelayTime: 6,                  // segundos (normalizado)
            shortPickup: I_diseno * 3,
            shortDelay: 0.3,
            instantaneous: In * 10
        };
    }

    /**
     * Integración completa: Ampacidad → Breaker → TCC
     * @param {Object} nodo - Nodo del sistema
     * @param {Object} params - Parámetros para calcularAmpacidadCDT
     * @returns {Object} { ampacidad, breaker, tcc, ok, error }
     */
    function seleccionarProteccionCompleta(nodo, params) {
        // Usar AmpacidadReal.calcularAmpacidadCDT
        if (typeof AmpacidadReal === 'undefined' || !AmpacidadReal.calcularAmpacidadCDT) {
            return {
                ok: false,
                error: "AmpacidadReal.calcularAmpacidadCDT no disponible"
            };
        }

        var amp = AmpacidadReal.calcularAmpacidadCDT(params);

        if (!amp.ok) {
            return {
                ok: false,
                error: amp.error,
                ampacidad: amp
            };
        }

        // Prioridad: CatalogoSchneider si está disponible
        var sel;
        if (typeof CatalogoSchneider !== 'undefined' && CatalogoSchneider.seleccionarBreakerSchneider) {
            sel = seleccionarBreakerSchneider(nodo, amp);
        } else {
            sel = seleccionarBreaker(nodo, amp);
        }

        if (!sel.ok) {
            return {
                ok: false,
                error: sel.error,
                ampacidad: amp
            };
        }

        var tcc;
        if (typeof CatalogoSchneider !== 'undefined' && CatalogoSchneider.generarTCCSchneider) {
            tcc = CatalogoSchneider.generarTCCSchneider(sel.breaker, { I_diseno: amp.I_diseno });
        } else {
            tcc = ajustarTCC(sel.breaker, amp);
        }

        return {
            ok: true,
            ampacidad: amp,
            breaker: sel.breaker,
            tcc: tcc
        };
    }

    /**
     * Seleccionar breaker usando catálogo Schneider
     * @param {Object} nodo - Nodo del sistema
     * @param {Object} ampacidad - Resultado de calcularAmpacidadCDT
     * @returns {Object} { ok, breaker, error }
     */
    function seleccionarBreakerSchneider(nodo, ampacidad) {
        var I_diseno = ampacidad.I_diseno;
        var I_final = ampacidad.I_final;
        var Isc_kA = nodo.Isc_kA || 0;
        var V = nodo.voltaje || 480;

        var breaker = CatalogoSchneider.seleccionarBreakerSchneider({
            I_diseno: I_diseno,
            Icc: Isc_kA,
            V: V
        });

        if (!breaker) {
            return {
                ok: false,
                error: "No hay breaker Schneider disponible para I_diseno=" + I_diseno.toFixed(1) + "A, Icc=" + Isc_kA.toFixed(1) + "kA @ " + V + "V"
            };
        }

        return {
            ok: true,
            breaker: breaker
        };
    }

    /**
     * Validación final de protección
     * @param {Object} resultado - Resultado de seleccionarProteccionCompleta
     * @param {Object} nodo - Nodo del sistema
     * @returns {Object} { ok, detalles }
     */
    function validarProteccion(resultado, nodo) {
        var ampacidad = resultado.ampacidad;
        var breaker = resultado.breaker;

        var ok1 = breaker.In >= ampacidad.I_diseno;
        var ok2 = breaker.In <= ampacidad.I_final;
        var ok3 = breaker.Icu >= (nodo.Isc_kA || 0);

        return {
            ok: ok1 && ok2 && ok3,
            detalles: {
                cumpleCarga: ok1,
                cumpleAmpacidad: ok2,
                cumpleIsc: ok3,
                In_breaker: breaker.In,
                I_diseno: ampacidad.I_diseno,
                I_final: ampacidad.I_final,
                Icu_breaker: breaker.Icu,
                Isc_nodo: nodo.Isc_kA
            }
        };
    }

    return {
        BREAKERS: BREAKERS,
        seleccionarBreaker: seleccionarBreaker,
        seleccionarBreakerSchneider: seleccionarBreakerSchneider,
        ajustarTCC: ajustarTCC,
        seleccionarProteccionCompleta: seleccionarProteccionCompleta,
        validarProteccion: validarProteccion
    };

})();

if (typeof window !== 'undefined') {
    window.BreakerSelector = BreakerSelector;
}
