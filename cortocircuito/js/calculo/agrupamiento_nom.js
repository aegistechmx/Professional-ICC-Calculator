/**
 * agrupamiento_nom.js — Validación y Cálculo de Factor de Agrupamiento
 * Fuente de verdad única según Tabla 310-15(g) NOM-001-SEDE-2012
 */

var AgrupamientoNOM = (function() {
    /**
     * Tabla 310-15(g) NOM-001-SEDE-2012
     * Fuente de verdad única para factor de agrupamiento
     */
    var TABLA_310_15_G = {
        0: 1.0,    // 0-3 conductores
        4: 0.80,   // 4-6 conductores
        7: 0.70,   // 7-9 conductores
        10: 0.50,  // 10-20 conductores
        21: 0.45,  // 21-30 conductores
        31: 0.40,  // 31-40 conductores
        41: 0.35   // 41+ conductores
    };

    /**
     * Obtener factor de agrupamiento según CCC (número de conductores)
     * @param {number} ccc - Número de conductores actuales
     * @returns {number} Factor de agrupamiento
     */
    function getFactorAgrupamiento(ccc) {
        if (!ccc || ccc <= 0) return 1.0;
        if (ccc <= 3) return 1.0;
        if (ccc <= 6) return 0.80;
        if (ccc <= 9) return 0.70;
        if (ccc <= 20) return 0.50;
        if (ccc <= 30) return 0.45;
        if (ccc <= 40) return 0.40;
        return 0.35;
    }

    /**
     * Validar consistencia de factor de agrupamiento
     * @param {number} ccc - Número de conductores
     * @param {number} factor - Factor de agrupamiento a validar
     * @returns {Object} Resultado de validación
     */
    function validarTablaAgrupamiento(ccc, factor) {
        var esperado = getFactorAgrupamiento(ccc);
        var tolerancia = 0.01;

        if (Math.abs(factor - esperado) > tolerancia) {
            return {
                ok: false,
                msg: 'Factor incorrecto: ' + factor.toFixed(2) + ' → ' + esperado.toFixed(2) + ' (CCC=' + ccc + ')',
                esperado: esperado,
                actual: factor
            };
        }

        return { ok: true, esperado: esperado, actual: factor };
    }

    /**
     * Detectar CCC real según tipo de sistema y carga
     * @param {Object} config - Configuración del sistema
     * @returns {Object} CCC real y metadata
     */
    function detectarCCCReal(config) {
        var sistema = config.sistema || '3f'; // 3f, 1f
        var tieneNeutro = config.tieneNeutro !== false; // Default true
        var neutroContado = config.neutroContado || false;
        var tieneArmonicos = config.tieneArmonicos || false;
        var paralelos = config.paralelos || 1;
        var numConductoresInput = config.numConductores || 3;

        var cccBase = numConductoresInput;
        var razon = '';

        // Lógica de conteo de neutro según NOM-001
        if (sistema === '3f') {
            if (tieneArmonicos) {
                // Cargas no lineales: neutro siempre cuenta
                cccBase = numConductoresInput; // Ya incluye neutro
                razon = 'Cargas no lineales: neutro cuenta';
            } else if (neutroContado) {
                // Cargas lineales con neutro contado
                cccBase = numConductoresInput;
                razon = 'Neutro contado explícitamente';
            } else {
                // Cargas lineales balanceadas: neutro NO cuenta
                // Si input incluye neutro, restarlo
                cccBase = tieneNeutro ? numConductoresInput - 1 : numConductoresInput;
                razon = 'Cargas lineales balanceadas: neutro no cuenta';
            }
        } else {
            // Sistema monofásico
            cccBase = numConductoresInput;
            razon = 'Sistema monofásico';
        }

        // Aplicar paralelos
        var cccFinal = cccBase * paralelos;

        return {
            ccc: cccFinal,
            cccBase: cccBase,
            paralelos: paralelos,
            razon: razon,
            tieneNeutro: tieneNeutro,
            neutroContado: neutroContado,
            tieneArmonicos: tieneArmonicos
        };
    }

    /**
     * Calcular factor de agrupamiento con validación automática
     * @param {Object} config - Configuración completa
     * @returns {Object} Factor y metadata de validación
     */
    function calcularFactorValidado(config) {
        var cccDetectado = detectarCCCReal(config);
        var factorCalculado = getFactorAgrupamiento(cccDetectado.ccc);
        var factorManual = config.F_agrupamiento;

        var resultado = {
            ccc: cccDetectado.ccc,
            cccBase: cccDetectado.cccBase,
            factor: factorCalculado,
            fuente: 'AUTO',
            razonCCC: cccDetectado.razon,
            validacion: null,
            autocorreccion: null
        };

        // Si hay factor manual, validar consistencia
        if (factorManual !== null && factorManual !== undefined) {
            var validacion = validarTablaAgrupamiento(cccDetectado.ccc, factorManual);
            resultado.validacion = validacion;

            if (!validacion.ok) {
                resultado.autocorreccion = {
                    antes: factorManual,
                    despues: validacion.esperado,
                    msg: validacion.msg
                };
                resultado.factor = validacion.esperado;
                resultado.fuente = 'AUTO_CORREGIDO';
            } else {
                resultado.factor = factorManual;
                resultado.fuente = 'MANUAL_VALIDADO';
            }
        }

        return resultado;
    }

    return {
        TABLA_310_15_G: TABLA_310_15_G,
        getFactorAgrupamiento: getFactorAgrupamiento,
        validarTablaAgrupamiento: validarTablaAgrupamiento,
        detectarCCCReal: detectarCCCReal,
        calcularFactorValidado: calcularFactorValidado
    };
})();

if (typeof window !== 'undefined') {
    window.AgrupamientoNOM = AgrupamientoNOM;
}
