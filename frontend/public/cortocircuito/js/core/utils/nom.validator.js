/**
 * core/utils/nom.validator.js — Validador NOM-001-SEDE-2012 [DEPRECATED]
 * 
 * ⚠️ DEPRECATED: Este archivo está obsoleto y será eliminado en una versión futura.
 * 
 * ✅ USAR EN SU LUGAR: js/core/domain/validation.engine.js
 *    - ValidationEngine.runAll() para validación completa
 *    - ValidationEngine.validateAmpacity() para validación de ampacidad
 *    - ValidationEngine.validateProtection() para validación de protección
 * 
 * 📚 Migración:
 *    - NOMValidator.validarNOM(params) → ValidationEngine.runAll(ctx)
 *    - Usar SimulationContext.buildContext() para normalizar datos antes de validar
 * 
 * @deprecated Desde versión 2.0.0 - Usar ValidationEngine
 * @see js/core/domain/validation.engine.js
 * @see js/core/domain/simulationContext.js
 */

var NOMValidator = (function () {

    /**
     * Validar cumplimiento NOM-001-SEDE-2012
     * @param {Object} params - Parámetros de validación
     * @param {number} params.I_carga - Corriente de carga (A)
     * @param {number} params.ampacidad - Ampacidad del conductor (A)
     * @param {number} params.Isc - Corriente de cortocircuito (A)
     * @param {Object} params.interruptor - Datos del interruptor
     * @param {boolean} params.esContinua - Si la carga es continua
     * @returns {Object} { ok, errores, warnings }
     */
    function validarNOM(params) {
        var I_carga = params.I_carga;
        var ampacidad = params.ampacidad;
        var Isc = params.Isc;
        var interruptor = params.interruptor || {};
        var esContinua = params.esContinua !== undefined ? params.esContinua : true;

        var errores = [];
        var warnings = [];

        // 🔴 NOM 210/215 (carga continua)
        if (esContinua) {
            var I_diseño = I_carga * 1.25;
            if (ampacidad < I_diseño) {
                errores.push("NOM 210/215: No cumple ampacidad para carga continua (requiere " + I_diseño.toFixed(1) + "A, tiene " + ampacidad.toFixed(1) + "A)");
            }
        }

        // 🔴 NOM 110.9 (capacidad interruptiva)
        if (interruptor.Icu && Isc) {
            var Icu_kA = interruptor.Icu; // kA
            var Isc_kA = Isc / 1000; // Convertir A a kA

            if (Icu_kA < Isc_kA) {
                errores.push("NOM 110.9: Interruptor no soporta cortocircuito (Icu=" + Icu_kA + "kA < Isc=" + Isc_kA.toFixed(2) + "kA)");
            }
        }

        // 🔴 NOM 240.4 (protección de conductor)
        if (interruptor.cap && ampacidad) {
            var maxProteccion = ampacidad * 1.25; // Máximo permitido según tabla 240.4
            if (interruptor.cap > maxProteccion) {
                errores.push("NOM 240.4: Interruptor excede máximo permitido para conductor (cap=" + interruptor.cap + "A > " + maxProteccion.toFixed(1) + "A)");
            }
        }

        // 🟡 NOM 230.95 (falla a tierra)
        if (interruptor.tipo !== "LSIG" && interruptor.tipo !== "GFP") {
            warnings.push("NOM 230.95: Se recomienda protección de falla a tierra (GFP/LSIG) para sistemas Yg sólido");
        }

        // 🟡 NOM 110.14C (terminal)
        if (params.violacionTerminal) {
            warnings.push("NOM 110.14C: Violación de terminal (ampacidad corregida excede límite terminal)");
        }

        // 🟡 NOM 250.4 (aterrizaje)
        if (!params.tieneAterrizaje) {
            warnings.push("NOM 250.4: Se recomienda sistema de aterrizaje");
        }

        return {
            ok: errores.length === 0,
            errores: errores,
            warnings: warnings,
            numErrores: errores.length,
            numWarnings: warnings.length
        };
    }

    /**
     * Validar ampacidad para carga continua
     * @param {number} ampacidad - Ampacidad del conductor
     * @param {number} I_carga - Corriente de carga
     * @returns {Object} { cumple, I_diseño, margen }
     */
    function validarCargaContinua(ampacidad, I_carga) {
        var I_diseño = I_carga * 1.25;
        var margen = ampacidad - I_diseño;

        return {
            cumple: ampacidad >= I_diseño,
            I_diseño: I_diseño,
            margen: margen,
            deficit: Math.max(0, I_diseño - ampacidad),
            porcentajeMargen: I_diseño > 0 ? (margen / I_diseño * 100) : 0
        };
    }

    /**
     * Validar capacidad interruptiva
     * @param {number} Icu - Capacidad interruptiva del equipo (kA)
     * @param {number} Isc - Corriente de cortocircuito (A)
     * @returns {Object} { cumple, margen }
     */
    function validarCapacidadInterruptiva(Icu, Isc) {
        var Isc_kA = Isc / 1000;
        var margen = Icu - Isc_kA;

        return {
            cumple: Icu >= Isc_kA,
            Icu: Icu,
            Isc: Isc_kA,
            margen: margen,
            deficit: Math.max(0, Isc_kA - Icu),
            porcentajeMargen: Icu > 0 ? (margen / Icu * 100) : 0
        };
    }

    /**
     * Validar coordinación de protección
     * @param {Object} upstream - Dispositivo aguas arriba
     * @param {Object} downstream - Dispositivo aguas abajo
     * @returns {Object} { coordinado, margen }
     */
    function validarCoordinacion(upstream, downstream) {
        if (!upstream.cap || !downstream.cap) {
            return {
                coordinado: false,
                razon: "Datos de capacidad incompletos"
            };
        }

        // Regla general: upstream debe ser al menos 1.6x downstream
        var margen = upstream.cap / downstream.cap;
        var coordinado = margen >= 1.6;

        return {
            coordinado: coordinado,
            margen: margen,
            razon: coordinado ? null : "Margen de coordinación insuficiente (requere >= 1.6)"
        };
    }

    return {
        validarNOM: validarNOM,
        validarCargaContinua: validarCargaContinua,
        validarCapacidadInterruptiva: validarCapacidadInterruptiva,
        validarCoordinacion: validarCoordinacion
    };
})();

if (typeof window !== 'undefined') {
    window.NOMValidator = NOMValidator;
}
