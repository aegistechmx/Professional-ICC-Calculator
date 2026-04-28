/**
 * core/dominio/proteccion.js — Dominio de Protección
 * Módulo de selección y validación de protecciones
 */

var DominioProteccion = (function() {
    
    var BREAKERS_ESTANDAR = [15, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 225, 250, 300, 350, 400, 450, 500, 600, 700, 800, 1000, 1200, 1600, 2000, 2500, 3000, 4000, 5000, 6000];
    
    /**
     * Seleccionar protección
     * @param {Object} params - Parámetros de selección
     * @returns {Object} Protección seleccionada
     */
    function seleccionarProteccion(params) {
        var In = params.I_diseño;
        var Icu = params.Isc ? params.Isc * 1.25 : 25000;
        
        return {
            In: redondearBreaker(In),
            Icu: Icu,
            tipo: "LSIG"
        };
    }
    
    /**
     * Validar protección
     * @param {Object} proteccion - Datos de protección
     * @param {number} Isc - Corriente de cortocircuito
     * @returns {Object} Resultado de validación
     */
    function validarProteccion(proteccion, Isc) {
        var errores = [];
        
        if (proteccion.Icu < Isc) {
            errores.push("Capacidad interruptiva insuficiente");
        }
        
        return {
            ok: errores.length === 0,
            errores: errores
        };
    }
    
    /**
     * Redondear breaker estándar
     * @param {number} In - Corriente de diseño
     * @returns {number} Breaker estándar
     */
    function redondearBreaker(In) {
        for (var i = 0; i < BREAKERS_ESTANDAR.length; i++) {
            if (BREAKERS_ESTANDAR[i] >= In) {
                return BREAKERS_ESTANDAR[i];
            }
        }
        
        return BREAKERS_ESTANDAR[BREAKERS_ESTANDAR.length - 1];
    }
    
    return {
        seleccionarProteccion: seleccionarProteccion,
        validarProteccion: validarProteccion,
        redondearBreaker: redondearBreaker
    };
})();

if (typeof window !== 'undefined') {
    window.DominioProteccion = DominioProteccion;
}
