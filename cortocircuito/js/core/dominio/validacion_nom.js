/**
 * core/dominio/validacion_nom.js — Dominio de Validación NOM
 * Módulo de validación según NOM-001-SEDE-2012
 */

var DominioValidacionNOM = (function() {
    
    /**
     * Validar sistema completo según NOM
     * @param {Object} params - Parámetros de validación
     * @returns {Object} Resultado de validación
     */
    function validarNOM(params) {
        var errores = [];
        var warnings = [];
        
        // 1. Ampacidad (NOM 210/215)
        if (params.conductor.I_final < params.sistema.I_diseño) {
            errores.push("Ampacidad insuficiente (NOM 210/215)");
        }
        
        // 2. Caída de tensión (NOM 215.2)
        if (params.caida.porcentaje > 3) {
            warnings.push("Caída de tensión > 3% (NOM 215.2)");
        }
        
        // 3. Protección (NOM 240)
        // FIX: Asumir que ambos valores están en mismas unidades (kA)
        if (params.proteccion.Icu < params.falla.Isc) {
            errores.push("Capacidad interruptiva insuficiente (NOM 240)");
        }
        
        // 4. Terminal (NOM 110.14(C))
        if (params.ampacidad.violacionTerminal) {
            warnings.push("Violación de terminal NOM 110.14(C)");
        }
        
        // 5. Falla a tierra (NOM 230.95)
        if (params.proteccion.tipo !== "LSIG" && params.proteccion.tipo !== "GFP") {
            warnings.push("Se recomienda GFP/LSIG (NOM 230.95)");
        }
        
        return {
            ok: errores.length === 0,
            errores: errores,
            warnings: warnings
        };
    }
    
    /**
     * Validar ampacidad
     * @param {Object} conductor - Datos del conductor
     * @param {number} I_diseño - Corriente de diseño
     * @returns {Object} Resultado de validación
     */
    function validarAmpacidad(conductor, I_diseño) {
        var errores = [];
        
        if (conductor.I_final < I_diseño) {
            errores.push("Ampacidad insuficiente");
        }
        
        return {
            ok: errores.length === 0,
            errores: errores
        };
    }
    
    /**
     * Validar caída de tensión
     * @param {Object} caida - Resultado de caída de tensión
     * @param {number} limite - Límite máximo (%)
     * @returns {Object} Resultado de validación
     */
    function validarCaidaTension(caida, limite) {
        limite = limite || 3;
        
        return {
            ok: caida.porcentaje <= limite,
            porcentaje: caida.porcentaje,
            limite: limite
        };
    }
    
    return {
        validarNOM: validarNOM,
        validarAmpacidad: validarAmpacidad,
        validarCaidaTension: validarCaidaTension
    };
})();

if (typeof window !== 'undefined') {
    window.DominioValidacionNOM = DominioValidacionNOM;
}
