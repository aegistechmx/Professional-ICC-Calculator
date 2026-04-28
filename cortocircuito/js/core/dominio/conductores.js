/**
 * core/dominio/conductores.js — Dominio de Conductores
 * Módulo de selección y validación de conductores
 */

var DominioConductores = (function() {
    
    /**
     * Seleccionar conductor automáticamente
     * @param {Object} params - Parámetros de selección
     * @returns {Object} Conductor seleccionado
     */
    function seleccionarConductor(params) {
        if (typeof MotorAmpacidadNOM !== 'undefined') {
            return MotorAmpacidadNOM.seleccionarConductor(params.I_diseño, params);
        }
        
        throw new Error("MotorAmpacidadNOM no está disponible");
    }
    
    /**
     * Validar conductor
     * @param {Object} conductor - Datos del conductor
     * @param {number} I_diseño - Corriente de diseño
     * @returns {Object} Resultado de validación
     */
    function validarConductor(conductor, I_diseño) {
        var errores = [];
        
        if (conductor.I_final < I_diseño) {
            errores.push("Ampacidad insuficiente");
        }
        
        return {
            ok: errores.length === 0,
            errores: errores
        };
    }
    
    return {
        seleccionarConductor: seleccionarConductor,
        validarConductor: validarConductor
    };
})();

if (typeof window !== 'undefined') {
    window.DominioConductores = DominioConductores;
}
