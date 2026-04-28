/**
 * core/dominio/ampacidad.js — Dominio de Ampacidad
 * Módulo de cálculo de ampacidad según NOM-001-SEDE-2012
 */

var DominioAmpacidad = (function() {
    
    /**
     * Calcular ampacidad completa
     * @param {Object} params - Parámetros de cálculo
     * @returns {Object} Resultado de ampacidad
     */
    function calcularAmpacidad(params) {
        if (typeof MotorAmpacidadNOM !== 'undefined') {
            return MotorAmpacidadNOM.calcularAmpacidadNOM(params);
        }
        
        throw new Error("MotorAmpacidadNOM no está disponible");
    }
    
    /**
     * Calcular corriente de diseño
     * @param {number} I_carga - Corriente de carga
     * @param {number} Fcc - Factor de carga continua
     * @returns {number} Corriente de diseño
     */
    function calcularDiseño(I_carga, Fcc) {
        Fcc = Fcc || 1.25;
        return I_carga * Fcc;
    }
    
    return {
        calcularAmpacidad: calcularAmpacidad,
        calcularDiseño: calcularDiseño
    };
})();

if (typeof window !== 'undefined') {
    window.DominioAmpacidad = DominioAmpacidad;
}
