/**
 * core/electrical/cdt_blindado.js — CDT blindado con validación estricta
 * Función de cálculo de ampacidad con validación total de inputs
 * Previene el bug de I_final = 0 causado por paralelos = 0
 */

var CDTBlindado = (function() {
    
    /**
     * Validar y convertir a número seguro
     * @param {*} v - Valor a convertir
     * @param {string} name - Nombre del parámetro para error
     * @returns {number} Número validado
     */
    function toNumber(v, name) {
        var n = Number(v);
        if (isNaN(n)) {
            throw new Error(name + " inválido: " + v + " (no es un número)");
        }
        return n;
    }
    
    /**
     * Calcular CDT blindado (validación total)
     * @param {Object} data - Datos de cálculo
     * @param {number} data.I_tabla - Ampacidad base de tabla
     * @param {number} data.F_temp - Factor de temperatura
     * @param {number} data.F_agrupamiento - Factor de agrupamiento
     * @param {number} data.paralelos - Número de conductores en paralelo
     * @param {boolean} data.debug - Habilitar logs de debug
     * @returns {Object} Resultado con I_final y datos de cálculo
     */
    function calcularCDT(data) {
        // Sanitizar y validar inputs
        var I_tabla = toNumber(data.I_tabla, "I_tabla");
        var F_temp = toNumber(data.F_temp !== undefined ? data.F_temp : 1, "F_temp");
        var F_agrupamiento = toNumber(data.F_agrupamiento !== undefined ? data.F_agrupamiento : 1, "F_agrupamiento");
        var paralelos = toNumber(data.paralelos !== undefined ? data.paralelos : 1, "paralelos");
        
        // Validaciones estrictas
        if (I_tabla <= 0) {
            throw new Error("I_tabla debe ser > 0: " + I_tabla);
        }
        
        if (F_temp <= 0) {
            throw new Error("F_temp debe ser > 0: " + F_temp);
        }
        
        if (F_agrupamiento <= 0) {
            throw new Error("F_agrupamiento debe ser > 0: " + F_agrupamiento);
        }
        
        if (paralelos <= 0) {
            throw new Error("Paralelos debe ser >= 1: " + paralelos);
        }
        
        // Debug log antes del cálculo
        if (data.debug) {
            console.log("[CDT_BLINDADO] Inputs validados:", {
                I_tabla: I_tabla,
                F_temp: F_temp,
                F_agrupamiento: F_agrupamiento,
                paralelos: paralelos
            });
        }
        
        // Cálculo
        var I_final = I_tabla * F_temp * F_agrupamiento * paralelos;
        
        // Debug log del resultado
        if (data.debug) {
            console.log("[CDT_BLINDADO] Resultado:", {
                I_final: I_final,
                formula: I_tabla + " × " + F_temp + " × " + F_agrupamiento + " × " + paralelos + " = " + I_final
            });
        }
        
        // Validación del resultado
        if (I_final <= 0) {
            throw new Error("CDT resultado inválido: I_final = " + I_final + ". Fórmula: " + I_tabla + " × " + F_temp + " × " + F_agrupamiento + " × " + paralelos);
        }
        
        if (!isFinite(I_final)) {
            throw new Error("CDT resultado no finito: I_final = " + I_final);
        }
        
        return {
            I_final: I_final,
            I_tabla: I_tabla,
            F_temp: F_temp,
            F_agrupamiento: F_agrupamiento,
            paralelos: paralelos,
            valido: true
        };
    }
    
    /**
     * Validar paralelos específicamente
     * @param {*} paralelos - Valor a validar
     * @returns {number} Paralelos validado (default 1)
     */
    function validarParalelos(paralelos) {
        var p = Number(paralelos);
        if (isNaN(p) || p <= 0) {
            console.warn("[CDT_BLINDADO] Paralelos inválido: " + paralelos + ", usando default 1");
            return 1;
        }
        return p;
    }
    
    return {
        calcularCDT: calcularCDT,
        validarParalelos: validarParalelos,
        toNumber: toNumber
    };
})();

if (typeof window !== 'undefined') {
    window.CDTBlindado = CDTBlindado;
}
