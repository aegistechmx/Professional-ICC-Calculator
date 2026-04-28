/**
 * curvas_tcc_pro.js — Módulo de Curvas TCC Reales (Log-Log)
 * Modelo híbrido: ecuaciones analíticas + puntos digitalizados
 * Para coordinación selectiva real tipo ETAP/SKM
 */

var CurvasTCCPro = (function() {
    
    /**
     * Ecuación térmica (aproximación IEC inverse)
     * @param {number} I - Corriente (A)
     * @param {number} In - Corriente nominal (A)
     * @returns {number} Tiempo de disparo térmico (s)
     */
    function t_termico(I, In) {
        var M = I / In;
        if (M <= 1) return Infinity;
        return 0.14 / (Math.pow(M, 0.02) - 1);
    }

    /**
     * Zona instantánea TM
     * @param {number} I - Corriente (A)
     * @param {number} I_inst - Corriente instantánea (A)
     * @returns {number|null} Tiempo de disparo instantáneo (s)
     */
    function t_instantaneo_TM(I, I_inst) {
        if (I >= I_inst) return 0.02;
        return null;
    }

    /**
     * Generar curva TM completa
     * @param {Object} params - { In, I_inst }
     * @returns {Array} Puntos de curva [{I, t}]
     */
    function generarCurvaTM(params) {
        var curva = [];
        var In = params.In;
        var I_inst = params.I_inst || In * 10;

        for (var I = In; I <= In * 100; I *= 1.2) {
            var t = t_instantaneo_TM(I, I_inst) || t_termico(I, In);
            if (t && t < Infinity) {
                curva.push({ I: I, t: t });
            }
        }

        return curva;
    }

    /**
     * Long Delay (térmica LSIG)
     * @param {number} I - Corriente (A)
     * @param {number} In - Corriente nominal (A)
     * @param {number} Ir - Pickup relativo (0.4-1.0)
     * @param {number} tr - Tiempo de retardo (s)
     * @returns {number|null} Tiempo de disparo (s)
     */
    function t_long(I, In, Ir, tr) {
        var M = I / (In * Ir);
        if (M <= 1) return Infinity;
        return tr / Math.pow(M, 2);
    }

    /**
     * Short Delay
     * @param {number} I - Corriente (A)
     * @param {number} In - Corriente nominal (A)
     * @param {number} Isd - Pickup relativo (1.5-10)
     * @param {number} tsd - Tiempo de retardo (s)
     * @returns {number|null} Tiempo de disparo (s)
     */
    function t_short(I, In, Isd, tsd) {
        if (I >= In * Isd) return tsd;
        return null;
    }

    /**
     * Instantáneo LSIG
     * @param {number} I - Corriente (A)
     * @param {number} In - Corriente nominal (A)
     * @param {number} Ii - Pickup relativo (2-15)
     * @returns {number|null} Tiempo de disparo (s)
     */
    function t_instantaneo_LSIG(I, In, Ii) {
        if (I >= In * Ii) return 0.02;
        return null;
    }

    /**
     * Ground Fault (G)
     * @param {number} I - Corriente (A)
     * @param {number} In - Corriente nominal (A)
     * @param {number} Ig - Pickup relativo (0.2-1.0)
     * @param {number} tg - Tiempo de retardo (s)
     * @returns {number|null} Tiempo de disparo (s)
     */
    function t_ground(I, In, Ig, tg) {
        if (I >= In * Ig) return tg;
        return null;
    }

    /**
     * Generar curva LSIG completa con prioridad correcta
     * Orden: INST → SHORT → GROUND → LONG
     * @param {Object} params - { In, long_pickup, long_delay, short_pickup, short_delay, instantaneo, ground_pickup, ground_delay }
     * @returns {Array} Puntos de curva [{I, t}]
     */
    function generarCurvaLSIG(params) {
        var curva = [];
        var In = params.In;

        for (var I = In; I <= In * 100; I *= 1.1) {
            var t = t_instantaneo_LSIG(I, In, params.instantaneo) ||
                    t_short(I, In, params.short_pickup, params.short_delay) ||
                    t_ground(I, In, params.ground_pickup, params.ground_delay) ||
                    t_long(I, In, params.long_pickup, params.long_delay);

            if (t && t < Infinity) {
                curva.push({ I: I, t: t });
            }
        }

        return curva;
    }

    /**
     * Interpolación log-log real
     * @param {Array} curva - Puntos de curva [{I, t}]
     * @param {number} I - Corriente a interpolar (A)
     * @returns {number|null} Tiempo interpolado (s)
     */
    function interpolarLogLog(curva, I) {
        var p1, p2;

        for (var i = 0; i < curva.length - 1; i++) {
            if (curva[i].I <= I && curva[i + 1].I >= I) {
                p1 = curva[i];
                p2 = curva[i + 1];
                break;
            }
        }

        if (!p1 || !p2) return null;

        var logI = Math.log10(I);
        var logI1 = Math.log10(p1.I);
        var logI2 = Math.log10(p2.I);

        var logT1 = Math.log10(p1.t);
        var logT2 = Math.log10(p2.t);

        var logT = logT1 + (logI - logI1) * (logT2 - logT1) / (logI2 - logI1);

        return Math.pow(10, logT);
    }

    /**
     * Validar si dos curvas se cruzan
     * @param {Array} curvaA - Curva upstream
     * @param {Array} curvaB - Curva downstream
     * @returns {boolean} true si se cruzan
     */
    function curvasSeCruzan(curvaA, curvaB) {
        for (var i = 0; i < curvaA.length; i++) {
            var p = curvaA[i];
            var tB = interpolarLogLog(curvaB, p.I);

            if (tB && tB <= p.t) {
                return true;
            }
        }
        return false;
    }

    /**
     * Validar coordinación selectiva
     * Criterio: t_upstream >= t_downstream * 1.3
     * @param {Array} curvaUpstream - Curva upstream
     * @param {Array} curvaDownstream - Curva downstream
     * @returns {Object} { coordinado, cruces, margenMinimo }
     */
    function validarCoordinacion(curvaUpstream, curvaDownstream) {
        var cruces = [];
        var margenMinimo = Infinity;

        for (var i = 0; i < curvaDownstream.length; i++) {
            var p = curvaDownstream[i];
            var tUp = interpolarLogLog(curvaUpstream, p.I);

            if (tUp) {
                var margen = tUp / p.t;
                margenMinimo = Math.min(margenMinimo, margen);

                if (margen < 1.3) {
                    cruces.push({
                        I: p.I,
                        t_downstream: p.t,
                        t_upstream: tUp,
                        margen: margen
                    });
                }
            }
        }

        return {
            coordinado: cruces.length === 0,
            cruces: cruces,
            margenMinimo: margenMinimo === Infinity ? 0 : margenMinimo
        };
    }

    /**
     * Ajustar parámetros LSIG para coordinación
     * @param {Object} params - Parámetros actuales
     * @param {Array} curvaUpstream - Curva upstream
     * @returns {Object} Parámetros ajustados
     */
    function ajustarParaCoordinacion(params, curvaUpstream) {
        var ajustados = JSON.parse(JSON.stringify(params));
        var maxIteraciones = 10;
        var iteracion = 0;

        while (iteracion < maxIteraciones) {
            iteracion++;
            var curva = generarCurvaLSIG(ajustados);
            var validacion = validarCoordinacion(curvaUpstream, curva);

            if (validacion.coordinado) {
                break;
            }

            // Ajustar short_delay hacia arriba
            if (ajustados.short_delay < 0.5) {
                ajustados.short_delay += 0.05;
            } else {
                // Ajustar long_delay hacia arriba
                if (ajustados.long_delay < 10) {
                    ajustados.long_delay += 0.5;
                } else {
                    break;
                }
            }
        }

        return ajustados;
    }

    /**
     * Generar puntos para graficación log-log
     * @param {Array} curva - Puntos de curva
     * @returns {Array} Puntos transformados [{logI, logT, I, t}]
     */
    function generarPuntosGrafica(curva) {
        return curva.map(function(p) {
            return {
                logI: Math.log10(p.I),
                logT: Math.log10(p.t),
                I: p.I,
                t: p.t
            };
        });
    }

    /**
     * Encontrar punto de cruce entre dos curvas
     * @param {Array} curvaA - Curva A
     * @param {Array} curvaB - Curva B
     * @returns {Object|null} Punto de cruce {I, t}
     */
    function encontrarCruce(curvaA, curvaB) {
        for (var i = 0; i < curvaA.length; i++) {
            var p = curvaA[i];
            var tB = interpolarLogLog(curvaB, p.I);

            if (tB && Math.abs(tB - p.t) < p.t * 0.1) {
                return { I: p.I, t: (p.t + tB) / 2 };
            }
        }
        return null;
    }

    return {
        // Funciones TM
        t_termico: t_termico,
        t_instantaneo_TM: t_instantaneo_TM,
        generarCurvaTM: generarCurvaTM,

        // Funciones LSIG
        t_long: t_long,
        t_short: t_short,
        t_instantaneo_LSIG: t_instantaneo_LSIG,
        t_ground: t_ground,
        generarCurvaLSIG: generarCurvaLSIG,

        // Interpolación y validación
        interpolarLogLog: interpolarLogLog,
        curvasSeCruzan: curvasSeCruzan,
        validarCoordinacion: validarCoordinacion,

        // Ajuste automático
        ajustarParaCoordinacion: ajustarParaCoordinacion,

        // Graficación
        generarPuntosGrafica: generarPuntosGrafica,
        encontrarCruce: encontrarCruce
    };
})();

if (typeof window !== 'undefined') {
    window.CurvasTCCPro = CurvasTCCPro;
}
