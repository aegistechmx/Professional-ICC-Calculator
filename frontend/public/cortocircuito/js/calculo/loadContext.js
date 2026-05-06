/**
 * loadContext.js — Sistema de Contexto de Carga
 * 
 * Este módulo maneja el contexto de carga real que viene de Cuadros,
 * permitiendo a ICC usar datos de operación reales (neutro, desbalance, armónicos)
 * en lugar de asumir condiciones ideales.
 * 
 * REGLAS CLAVE:
 * - ICC no recalcula neutro
 * - ICC no asume balance
 * - ICC usa el contexto real
 * - Si no hay contexto → WARNING o modo ideal explícito
 */

var LoadContext = (function() {

    /**
     * Estructura del payload de entrada (contrato con Cuadros)
     * @typedef {Object} LoadContextPayload
     * @property {Object} phases - Corrientes de fase y neutro
     * @property {number} phases.Ia - Corriente fase A (A)
     * @property {number} phases.Ib - Corriente fase B (A)
     * @property {number} phases.Ic - Corriente fase C (A)
     * @property {number} phases.In - Corriente neutro fundamental (A)
     * @property {Object} harmonics - Datos de armónicos
     * @property {number} harmonics.In_harm - RMS de armónicos en neutro (A)
     * @property {number} harmonics.THDi - THD de corriente (opcional)
     * @property {Object} system - Configuración del sistema
     * @property {number} system.unbalance - Desbalance (0-1)
     * @property {boolean} system.hasSinglePhaseLoads - Tiene cargas monofásicas
     * @property {number} system.Fcc - Factor de carga continua
     */

    /**
     * Contexto actual del sistema (se inyecta en App.estado)
     */
    var currentContext = null;

    /**
     * Valida el contexto de entrada antes de usarlo
     * @param {LoadContextPayload} ctx - Contexto a validar
     * @returns {Array<string>} Lista de errores (vacío si es válido)
     */
    function validateContext(ctx) {
        var errs = [];

        if (!ctx) {
            errs.push("Contexto no proporcionado");
            return errs;
        }

        // Validar phases
        if (!ctx.phases) {
            errs.push("Faltan datos de phases");
        } else {
            ["Ia", "Ib", "Ic", "In"].forEach(function(k) {
                if (ctx.phases[k] == null || isNaN(ctx.phases[k])) {
                    errs.push("Falta " + k + " en phases");
                }
                if (ctx.phases[k] < 0) {
                    errs.push(k + " debe ser >= 0");
                }
            });
        }

        // Validar harmonics (opcional)
        if (ctx.harmonics) {
            if (ctx.harmonics.In_harm != null && ctx.harmonics.In_harm < 0) {
                errs.push("In_harm debe ser >= 0");
            }
            if (ctx.harmonics.THDi != null && (ctx.harmonics.THDi < 0 || ctx.harmonics.THDi > 1)) {
                errs.push("THDi fuera de rango 0-1");
            }
        }

        // Validar system
        if (!ctx.system) {
            errs.push("Faltan datos de system");
        } else {
            if (ctx.system.unbalance != null && (ctx.system.unbalance < 0 || ctx.system.unbalance > 1)) {
                errs.push("unbalance fuera de rango 0-1");
            }
            if (ctx.system.Fcc != null && (ctx.system.Fcc < 0 || ctx.system.Fcc > 1)) {
                errs.push("Fcc (Factor de carga continua) fuera de rango 0-1");
            }
        }

        return errs;
    }

    /**
     * Aplica el contexto de carga al sistema
     * @param {Object} system - Objeto del sistema (App.estado)
     * @param {LoadContextPayload} ctx - Contexto a aplicar
     */
    function applyLoadContext(system, ctx) {
        if (!ctx) {
            console.warn("Sin contexto de cargas: se asume sistema balanceado");
            system.ctx = null;
            return;
        }

        // Validar antes de aplicar
        var errs = validateContext(ctx);
        if (errs.length > 0) {
            throw new Error("Contexto inválido: " + errs.join(", "));
        }

        // Guardar contexto en el sistema
        system.ctx = ctx;

        // Extraer corrientes de fase
        system.I_phase = {
            A: ctx.phases.Ia,
            B: ctx.phases.Ib,
            C: ctx.phases.Ic
        };

        // Corriente de neutro
        system.I_neutral = ctx.phases.In;

        // Desbalance y configuración del sistema
        system.unbalance = ctx.system.unbalance || 0;
        system.hasSinglePhaseLoads = ctx.system.hasSinglePhaseLoads || false;
        system.Fcc = ctx.system.Fcc || 0;

        console.log("Datos de operación real aplicados.");
    }

    /**
     * Ajusta la sensibilidad de falla fase-tierra según contexto
     * @param {Object} system - Sistema con contexto aplicado
     * @param {number} If_LG - Corriente de falla fase-tierra (A)
     * @returns {Object} { If_LG_adj, note }
     */
    function groundFaultSensitivity(system, If_LG) {
        if (!system.ctx) {
            // Sin contexto: modo ideal (balanceado)
            return {
                If_LG_adj: If_LG,
                note: "Sistema balanceado (sin contexto)"
            };
        }

        // Ajuste simple por desbalance
        var k_unb = 1 + (system.unbalance || 0);
        var In = system.I_neutral || 0;

        return {
            If_LG_adj: If_LG * k_unb,
            note: In > 0 ? "Neutro presente, revisar secuencia cero" : "Sistema balanceado",
            unbalance_factor: k_unb,
            neutral_current: In
        };
    }

    /**
     * Valida el neutro contra su ampacidad
     * @param {Object} system - Sistema con contexto aplicado
     * @param {number} neutralAmpacity - Ampacidad del neutro (A)
     * @returns {Object} { status, msg, data }
     */
    function validateNeutral(system, neutralAmpacity) {
        if (!system.ctx) {
            return {
                status: "WARNING",
                msg: "Sin contexto de carga: no se puede validar neutro",
                data: { hasContext: false }
            };
        }

        var In = system.I_neutral || 0;
        
        if (neutralAmpacity == null || neutralAmpacity <= 0) {
            return {
                status: "WARNING",
                msg: "Ampacidad de neutro no definida",
                data: { In: In, neutralAmpacity: neutralAmpacity }
            };
        }

        if (In > neutralAmpacity) {
            return {
                status: "FAIL",
                msg: "Neutro subdimensionado",
                data: {
                    In: In,
                    neutralAmpacity: neutralAmpacity,
                    deficit: In - neutralAmpacity,
                    ratio: In / neutralAmpacity
                }
            };
        }

        return {
            status: "PASS",
            msg: "Neutro verificado contra condición real",
            data: {
                In: In,
                neutralAmpacity: neutralAmpacity,
                margin: neutralAmpacity - In,
                ratio: In / neutralAmpacity
            }
        };
    }

    /**
     * Verifica presencia de armónicos (solo alerta, no recalcula)
     * @param {Object} ctx - Contexto de carga
     * @returns {Object} { status, msg, data }
     */
    function checkHarmonics(ctx) {
        if (!ctx || !ctx.harmonics) {
            return {
                status: "PASS",
                msg: "Sin datos de armónicos",
                data: { hasHarmonics: false }
            };
        }

        var In_harm = ctx.harmonics.In_harm || 0;
        var THDi = ctx.harmonics.THDi || 0;

        if (In_harm > 0 || THDi > 0.05) {
            return {
                status: "WARNING",
                msg: "Corriente armónica en neutro presente",
                data: {
                    In_harm: In_harm,
                    THDi: THDi,
                    hasHarmonics: true
                }
            };
        }

        return {
            status: "PASS",
            msg: "Armónicos despreciables",
            data: {
                In_harm: In_harm,
                THDi: THDi,
                hasHarmonics: false
            }
        };
    }

    /**
     * Obtiene el contexto actual
     * @returns {LoadContextPayload|null} Contexto actual o null
     */
    function getContext() {
        return currentContext;
    }

    /**
     * Establece el contexto actual
     * @param {LoadContextPayload} ctx - Contexto a establecer
     */
    function setContext(ctx) {
        currentContext = ctx;
    }

    /**
     * Limpia el contexto actual
     */
    function clearContext() {
        currentContext = null;
    }

    /**
     * Verifica si hay contexto cargado
     * @returns {boolean} True si hay contexto
     */
    function hasContext() {
        return currentContext != null;
    }

    /**
     * Genera un resumen del contexto para UI
     * @param {Object} system - Sistema con contexto
     * @returns {Object} Resumen formateado
     */
    function getContextSummary(system) {
        if (!system.ctx) {
            return {
                hasContext: false,
                message: "Sin contexto de cargas: resultados en condición ideal"
            };
        }

        var ctx = system.ctx;
        var I_avg = (ctx.phases.Ia + ctx.phases.Ib + ctx.phases.Ic) / 3;
        var unbalancePct = (ctx.system.unbalance || 0) * 100;

        return {
            hasContext: true,
            message: "Datos de operación real aplicados",
            phases: {
                Ia: ctx.phases.Ia,
                Ib: ctx.phases.Ib,
                Ic: ctx.phases.Ic,
                In: ctx.phases.In,
                I_avg: I_avg
            },
            harmonics: {
                In_harm: ctx.harmonics?.In_harm || 0,
                THDi: ctx.harmonics?.THDi || 0
            },
            system: {
                unbalance: unbalancePct,
                hasSinglePhaseLoads: ctx.system.hasSinglePhaseLoads
            }
        };
    }

    /**
     * Calcula el estado general del sistema (semáforo)
     * @param {Object} system - Sistema con contexto
     * @param {number} neutralAmpacity - Ampacidad del neutro
     * @returns {Object} { status, color, message }
     */
    function getSystemStatus(system, neutralAmpacity) {
        if (!system.ctx) {
            return {
                status: "INFO",
                color: "gray",
                message: "Sin contexto: modo ideal"
            };
        }

        var neutralValid = validateNeutral(system, neutralAmpacity);
        var harmonicsCheck = checkHarmonics(system.ctx);
        var unbalance = system.unbalance || 0;

        // Prioridad: FAIL > WARNING > OK
        if (neutralValid.status === "FAIL") {
            return {
                status: "FAIL",
                color: "red",
                message: neutralValid.msg
            };
        }

        if (unbalance > 0.15 || harmonicsCheck.status === "WARNING") {
            return {
                status: "WARNING",
                color: "yellow",
                message: unbalance > 0.15 ? 
                    "Desbalance alto (" + ((unbalance * 100) || 0).toFixed(1) + "%)" : 
                    harmonicsCheck.msg
            };
        }

        if (neutralValid.status === "WARNING") {
            return {
                status: "WARNING",
                color: "yellow",
                message: neutralValid.msg
            };
        }

        return {
            status: "OK",
            color: "green",
            message: "Sistema en condición normal"
        };
    }

    return {
        validateContext: validateContext,
        applyLoadContext: applyLoadContext,
        groundFaultSensitivity: groundFaultSensitivity,
        validateNeutral: validateNeutral,
        checkHarmonics: checkHarmonics,
        getContext: getContext,
        setContext: setContext,
        clearContext: clearContext,
        hasContext: hasContext,
        getContextSummary: getContextSummary,
        getSystemStatus: getSystemStatus
    };

})();

if (typeof window !== 'undefined') {
    window.LoadContext = LoadContext;
}
