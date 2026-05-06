/**
 * core/protection/nom.js — Core de validación NOM (única fuente de verdad)
 * TODOS los módulos del sistema deben usar estas funciones para validación NOM
 * 
 * Este módulo unifica validaciones de:
 * - nom_validacion.js
 * - motor_validacion_inteligente.js
 * - validador_sistema.js
 * - motor.js (evaluarSistema)
 */

var CoreNOM = (function () {

    /**
     * Validar sistema completo contra NOM-001
     * @param {Object} sistema - Sistema a validar
     * @returns {Object} Resultado de validación { valido, errores, warnings }
     */
    function validarSistema(sistema) {
        var errores = [];
        var warnings = [];

        if (!sistema || !sistema.puntos || !sistema.estado) {
            errores.push("Sistema inválido: falta puntos o estado");
            return { valido: false, errores: errores, warnings: warnings };
        }

        for (var i = 0; i < sistema.puntos.length; i++) {
            var punto = sistema.puntos[i];
            var nodo = sistema.estado.nodos[i];

            if (!nodo) continue;

            var validacionPunto = validarPunto(punto, nodo);
            errores = errores.concat(validacionPunto.errores);
            warnings = warnings.concat(validacionPunto.warnings);
        }

        // Deduplicar errores
        errores = deduplicarErrores(errores);
        warnings = deduplicarErrores(warnings);

        return {
            valido: errores.length === 0,
            errores: errores,
            warnings: warnings
        };
    }

    /**
     * Validar punto individual contra NOM
     * @param {Object} punto - Punto del sistema
     * @param {Object} nodo - Nodo del sistema
     * @returns {Object} Resultado { errores, warnings }
     */
    function validarPunto(punto, nodo) {
        var errores = [];
        var warnings = [];

        // 1. NOM 110.14C - Terminal
        var validacionTerminal = validarTerminal(punto, nodo);
        errores = errores.concat(validacionTerminal.errores);
        warnings = warnings.concat(validacionTerminal.warnings);

        // 2. NOM 310 - Ampacidad
        var validacionAmpacidad = validarAmpacidad(punto, nodo);
        errores = errores.concat(validacionAmpacidad.errores);
        warnings = warnings.concat(validacionAmpacidad.warnings);

        // 3. NOM 230.95 - Falla a tierra
        var validacionTierra = validarFallaTierra(punto, nodo);
        errores = errores.concat(validacionTierra.errores);
        warnings = warnings.concat(validacionTierra.warnings);

        // 4. NOM 240 - Protección contra sobrecorriente
        var validacionProteccion = validarProteccion(punto, nodo);
        errores = errores.concat(validacionProteccion.errores);
        warnings = warnings.concat(validacionProteccion.warnings);

        return { errores: errores, warnings: warnings };
    }

    /**
     * Validar NOM 110.14C - Terminal
     * @param {Object} punto - Punto del sistema
     * @param {Object} nodo - Nodo del sistema
     * @returns {Object} Resultado { errores, warnings }
     */
    function validarTerminal(punto, nodo) {
        var errores = [];
        var warnings = [];

        if (!punto.CDT) return { errores: errores, warnings: warnings };

        if (punto.CDT.violacionTerminal) {
            errores.push({
                codigo: "NOM_110_14C",
                tipo: "VIOLACION_TERMINAL",
                severidad: "CRITICO",
                mensaje: "VIOLACIÓN NOM 110.14C: I_corregida=" + (punto.CDT.I_corregida || 0).toFixed(1) + "A > I_limite_terminal=" + (punto.CDT.I_limite_terminal || 0).toFixed(1) + "A",
                nodo: punto.id,
                solucion: "Subir calibre o usar terminal 90°C"
            });
        }

        return { errores: errores, warnings: warnings };
    }

    /**
     * Validar NOM 310 - Ampacidad
     * @param {Object} punto - Punto del sistema
     * @param {Object} nodo - Nodo del sistema
     * @returns {Object} Resultado { errores, warnings }
     */
    function validarAmpacidad(punto, nodo) {
        var errores = [];
        var warnings = [];

        if (!punto.CDT) return { errores: errores, warnings: warnings };

        // Ampacidad insuficiente
        if (punto.CDT.I_final < (punto.CDT.I_diseño || 0)) {
            errores.push({
                codigo: "NOM_310",
                tipo: "AMPACIDAD_INSUFICIENTE",
                severidad: "CRITICO",
                mensaje: "AMPACIDAD INSUFICIENTE NOM 310: I_final=" + (punto.CDT.I_final || 0).toFixed(1) + "A < I_diseño=" + (punto.CDT.I_diseño || 0).toFixed(1) + "A",
                nodo: punto.id,
                solucion: "Subir calibre de conductor"
            });
        }

        // Margen bajo
        if (punto.CDT.margen < 10 && punto.CDT.margen >= 0) {
            warnings.push({
                codigo: "NOM_310_WARN",
                tipo: "MARGEN_BAJO",
                severidad: "MEDIO",
                mensaje: "Margen térmico bajo (<10%): " + punto.CDT.margen.toFixed(1) + "A",
                nodo: punto.id
            });
        }

        // Sin factor 125%
        if (punto.CDT.sinFactor125) {
            warnings.push({
                codigo: "NOM_210_20",
                tipo: "SIN_FACTOR_125",
                severidad: "MEDIO",
                mensaje: "Sin factor 125% para carga continua (NOM-001)",
                nodo: punto.id
            });
        }

        return { errores: errores, warnings: warnings };
    }

    /**
     * Validar NOM 230.95 - Falla a tierra
     * @param {Object} punto - Punto del sistema
     * @param {Object} nodo - Nodo del sistema
     * @returns {Object} Resultado { errores, warnings }
     */
    function validarFallaTierra(punto, nodo) {
        var errores = [];
        var warnings = [];

        if (!punto.faseTierra || punto.faseTierra.iscFt <= 0) {
            return { errores: errores, warnings: warnings };
        }

        var iDisparo = (nodo.equip && nodo.equip.iDisparo) ? nodo.equip.iDisparo : 0;
        var If_tierra = punto.faseTierra.iscFt * 1000;

        if (If_tierra < iDisparo) {
            errores.push({
                codigo: "NOM_230_95",
                tipo: "FALLA_TIERRA",
                severidad: "CRITICO",
                mensaje: "FALLA A TIERRA NOM 230.95: If_tierra=" + If_tierra.toFixed(1) + "A < iDisparo=" + iDisparo + "A",
                nodo: punto.id,
                solucion: "Bajar pickup o usar GFP"
            });
        }

        // GFP obligatorio para Yg sólido
        var tipoAterrizaje = leerTipoAterrizamiento();
        if (tipoAterrizaje === 'yg_solido' && nodo.equip && !nodo.equip.tieneGFP) {
            errores.push({
                codigo: "NOM_230_95_GFP",
                tipo: "GFP_REQUERIDO",
                severidad: "CRITICO",
                mensaje: "NOM 230.95: Sistema Yg sólido requiere GFP",
                nodo: punto.id,
                solucion: "Usar breaker con GFP/LSIG"
            });
        }

        return { errores: errores, warnings: warnings };
    }

    /**
     * Validar NOM 240 - Protección contra sobrecorriente
     * @param {Object} punto - Punto del sistema
     * @param {Object} nodo - Nodo del sistema
     * @returns {Object} Resultado { errores, warnings }
     */
    function validarProteccion(punto, nodo) {
        var errores = [];
        var warnings = [];

        if (!nodo.equip) return { errores: errores, warnings: warnings };

        // Capacidad interruptiva
        if (punto.isc && nodo.equip.cap) {
            var Icu = nodo.equip.cap || 0;
            var Isc = punto.isc * 1000;

            if (Icu < Isc) {
                errores.push({
                    codigo: "NOM_240",
                    tipo: "CAPACIDAD_INTERRUPTIVA",
                    severidad: "CRITICO",
                    mensaje: "CAPACIDAD INTERRUPTIVA INSUFICIENTE: Icu=" + Icu + "kA < Isc=" + (Isc / 1000).toFixed(2) + "kA",
                    nodo: punto.id,
                    solucion: "Usar breaker con mayor capacidad interruptiva"
                });
            }
        }

        return { errores: errores, warnings: warnings };
    }

    /**
     * Deduplicar errores por tipo y nodo
     * @param {Array} errores - Array de errores
     * @returns {Array} Errores deduplicados
     */
    function deduplicarErrores(errores) {
        var mapa = {};

        errores.forEach(function (err) {
            var key = err.tipo + "_" + (err.nodo || "global");
            if (!mapa[key]) {
                mapa[key] = err;
            }
        });

        return Object.keys(mapa).map(function (key) {
            return mapa[key];
        });
    }

    /**
     * Leer tipo de aterrizamiento (helper)
     * @returns {string} Tipo de aterrizamiento
     */
    function leerTipoAterrizamiento() {
        // Safe for both browser and Node.js environments
        if (typeof document === 'undefined' || !document.getElementById) {
            return 'yg_solido'; // Default value for server-side
        }
        var sel = document.getElementById('input-trafo-aterr');
        return sel ? sel.value : 'yg_solido';
    }

    return {
        validarSistema: validarSistema,
        validarPunto: validarPunto,
        validarTerminal: validarTerminal,
        validarAmpacidad: validarAmpacidad,
        validarFallaTierra: validarFallaTierra,
        validarProteccion: validarProteccion,
        deduplicarErrores: deduplicarErrores
    };
})();

if (typeof window !== 'undefined') {
    window.CoreNOM = CoreNOM;
}
