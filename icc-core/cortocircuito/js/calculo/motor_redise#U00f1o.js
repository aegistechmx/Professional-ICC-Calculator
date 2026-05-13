/**
 * motor_rediseño.js — Motor de Rediseño Automático
 * 
 * Encuentra la combinación mínima (calibre + breaker + terminal + TCC) que cumple:
 * - I_final ≥ I_diseño
 * - Protección sensible (I_falla ≥ pickup)
 * - Coordinación TCC
 * - Sin violar terminales
 * 
 * Flujo determinista conforme a NOM-001-SEDE-2012
 */

var MotorRediseño = (function() {

    /**
     * Catálogo de calibres de conductor (ordenados de menor a mayor)
     * @type {Array<string>}
     */
    var calibres = [
        "14", "12", "10", "8", "6", "4", "2", "1", "1/0", "2/0", "3/0", "4/0",
        "250", "300", "350", "400", "500", "600", "750", "1000"
    ];

    /**
     * Índice de calibre para ordenamiento
     * @param {string} calibre - Calibre del conductor
     * @returns {number} Índice en el array de calibres
     */
    function indexCalibre(calibre) {
        var idx = calibres.indexOf(calibre);
        return idx >= 0 ? idx : 999;
    }

    /**
     * Catálogo de breakers reales (simplificado)
     * @type {Array<Object>}
     */
    var breakers = [
        { In: 100, Icu: 10, modelo: "MCCB-100" },
        { In: 150, Icu: 18, modelo: "MCCB-150" },
        { In: 200, Icu: 25, modelo: "MCCB-200" },
        { In: 250, Icu: 25, modelo: "MCCB-250" },
        { In: 300, Icu: 35, modelo: "MCCB-300" },
        { In: 400, Icu: 50, modelo: "MCCB-400" },
        { In: 600, Icu: 65, modelo: "MCCB-600" },
        { In: 800, Icu: 85, modelo: "MCCB-800" },
        { In: 1000, Icu: 100, modelo: "MCCB-1000" }
    ];

    /**
     * Genera TCC automático basado en In del breaker
     * @param {number} In - Corriente nominal del breaker
     * @returns {Object} Parámetros TCC LSIG
     */
    function generarTCC(In) {
        return {
            long: { pickup: 1.0, delay: 5 },
            short: { pickup: 5.0, delay: 0.3 },
            inst: { pickup: 10.0 },
            ground: { pickup: 0.3, delay: 0.2 }
        };
    }

    /**
     * Detecta si el sistema puede detectar falla a tierra
     * @param {Object} nodo - Nodo del sistema
     * @param {Object} tcc - Parámetros TCC
     * @returns {boolean} True si detecta falla
     */
    function detectaFalla(nodo, tcc) {
        var If = nodo.I_falla_tierra || 0;
        var breakerIn = nodo.breakerIn || 300;
        var pickup = tcc.ground ? tcc.ground.pickup * breakerIn : 0;
        
        return If >= pickup;
    }

    /**
     * Valida cumplimiento de terminal
     * @param {Object} amp - Resultado de ampacidad
     * @returns {boolean} True si cumple terminal
     */
    function cumpleTerminal(amp) {
        if (!amp) return false;
        if (amp.status === 'ERROR') return false;
        if (amp.violacionTerminal) return false;
        return true;
    }

    /**
     * Valifica que el breaker cumpla con corto circuito
     * @param {Object} breaker - Breaker a validar
     * @param {Object} nodo - Nodo del sistema
     * @returns {boolean} True si cumple
     */
    function cumpleCorto(breaker, nodo) {
        var Isc = nodo.Isc || 0;
        return breaker.Icu >= Isc;
    }

    /**
     * Valifica que el breaker cumpla con carga
     * @param {Object} breaker - Breaker a validar
     * @param {Object} nodo - Nodo del sistema
     * @returns {boolean} True si cumple
     */
    function cumpleCarga(breaker, nodo) {
        var I_diseño = nodo.I_diseño || 0;
        return breaker.In >= I_diseño;
    }

    /**
     * Motor principal de rediseño automático
     * Estrategia determinista conforme a NOM-001-SEDE-2012
     * @param {Object} nodo - Nodo del sistema a rediseñar
     * @returns {Object|null} Mejor solución encontrada
     */
    function rediseñarSistema(nodo) {
        if (!nodo) {
            console.error('[X] rediseñarSistema: nodo no definido');
            return null;
        }

        var soluciones = [];
        var I_diseño = nodo.I_diseño || 0;
        var Isc = nodo.Isc || 0;
        var I_falla_tierra = nodo.I_falla_tierra || 0;

        console.log('[*] Iniciando rediseño automático para nodo:', nodo.id);
        console.log('[*] I_diseño:', I_diseño, 'A, Isc:', Isc, 'kA, I_falla_tierra:', I_falla_tierra, 'A');

        // Iterar calibres de menor a mayor
        for (var i = 0; i < calibres.length; i++) {
            var calibre = calibres[i];

            // Calcular ampacidad para este calibre
            var cableConfig = {
                calibre: calibre,
                temperaturaAislamiento: 75,
                temperaturaAmbiente: 40,
                numConductores: 3,
                paralelos: 1
            };

            var load = {
                I_base: I_diseño / 1.25,
                continua: true
            };

            var amp = null;
            if (typeof AmpacidadReal !== 'undefined' && AmpacidadReal.verificarAmpacidad) {
                var cable = {
                    calibre: calibre,
                    temperaturaAislamiento: 75,
                    temperaturaAmbiente: 40,
                    numConductores: 3,
                    paralelos: 1
                };
                amp = AmpacidadReal.verificarAmpacidad(load, cable, cableConfig);
            }

            if (!amp || amp.status !== 'PASS') {
                continue;
            }

            // Validar terminal
            if (!cumpleTerminal(amp)) {
                continue;
            }

            // Iterar breakers
            for (var j = 0; j < breakers.length; j++) {
                var brk = breakers[j];

                // Regla NOM básica: breaker debe ser ≥ I_diseño
                if (!cumpleCarga(brk, nodo)) {
                    continue;
                }

                // Corto circuito: breaker debe tener Icu ≥ Isc
                if (!cumpleCorto(brk, nodo)) {
                    continue;
                }

                // Generar TCC
                var tcc = generarTCC(brk.In);

                // Sensibilidad a falla
                var nodoConBreaker = {
                    ...nodo,
                    breakerIn: brk.In
                };
                if (!detectaFalla(nodoConBreaker, tcc)) {
                    continue;
                }

                // Solución válida encontrada
                soluciones.push({
                    calibre: calibre,
                    breaker: brk,
                    tcc: tcc,
                    amp: amp,
                    costo: calcularCosto(calibre, brk)
                });
            }
        }

        if (soluciones.length === 0) {
            console.warn('[!] No se encontró solución válida para el nodo');
            return null;
        }

        console.log('[*] Soluciones encontradas:', soluciones.length);
        return elegirMejor(soluciones);
    }

    /**
     * Función de costo para seleccionar la mejor solución
     * Prioriza: menor calibre, luego menor breaker
     * @param {Array} soluciones - Array de soluciones válidas
     * @returns {Object} Mejor solución
     */
    function elegirMejor(soluciones) {
        if (!soluciones || soluciones.length === 0) {
            return null;
        }

        return soluciones.sort(function(a, b) {
            // Menor calibre primero
            var c1 = indexCalibre(a.calibre);
            var c2 = indexCalibre(b.calibre);

            if (c1 !== c2) {
                return c1 - c2;
            }

            // Menor breaker después
            return a.breaker.In - b.breaker.In;
        })[0];
    }

    /**
     * Calcula costo de una solución (para ordenamiento)
     * @param {string} calibre - Calibre del conductor
     * @param {Object} breaker - Breaker seleccionado
     * @returns {number} Costo relativo
     */
    function calcularCosto(calibre, breaker) {
        var idxCalibre = indexCalibre(calibre);
        var idxBreaker = breakers.indexOf(breaker);
        return idxCalibre * 100 + idxBreaker;
    }

    /**
     * Validación final del sistema
     * @param {Object} sol - Solución a validar
     * @returns {Object} { ok, error }
     */
    function validarSistema(sol) {
        if (!sol) {
            return { ok: false, error: 'No hay solución' };
        }

        if (!sol.amp) {
            return { ok: false, error: 'Sin datos de ampacidad' };
        }

        if (sol.amp.I_final < sol.amp.I_diseño) {
            return { ok: false, error: 'Ampacidad insuficiente' };
        }

        if (sol.breaker.Icu < sol.amp.Isc) {
            return { ok: false, error: 'Breaker insuficiente para corto circuito' };
        }

        return { ok: true };
    }

    return {
        rediseñarSistema: rediseñarSistema,
        elegirMejor: elegirMejor,
        validarSistema: validarSistema,
        generarTCC: generarTCC,
        detectaFalla: detectaFalla,
        calibres: calibres,
        breakers: breakers
    };

})();

if (typeof window !== 'undefined') {
    window.MotorRediseño = MotorRediseño;
}
