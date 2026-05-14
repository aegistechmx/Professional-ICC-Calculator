/**
 * selectors/breaker.selector.js — Selector de Breakers
 * Arquitectura limpia: selección basada en I_diseño y Isc
 */

var BreakerSelector = (function() {
    
    var BREAKERS_ESTANDAR = [15, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 225, 250, 300, 350, 400, 450, 500, 600, 700, 800, 1000, 1200, 1600, 2000, 2500, 3000, 4000, 5000, 6000];
    
    /**
     * Seleccionar breakers para todos los nodos
     * @param {Object} ctx - Contexto del sistema
     */
    function seleccionarBreakers(ctx) {
        ctx.nodos.forEach(function(nodo) {
            var In = nodo.I_diseño;
            var Icu = nodo.Isc ? nodo.Isc * 1.25 : 25000;
            
            nodo.breaker = {
                In: redondearBreaker(In),
                Icu: Icu,
                tipo: "LSIG"
            };
        });
    }
    
    /**
     * Seleccionar breaker para un nodo individual
     * @param {Object} nodo - Nodo del sistema
     * @returns {Object} { In, Icu, tipo }
     */
    function seleccionarBreaker(nodo) {
        var In = nodo.I_diseño;
        var Icu = nodo.Isc ? nodo.Isc * 1.25 : 25000;
        
        return {
            In: redondearBreaker(In),
            Icu: Icu,
            tipo: "LSIG"
        };
    }
    
    /**
     * Redondear a breaker estándar
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
        seleccionarBreakers: seleccionarBreakers,
        seleccionarBreaker: seleccionarBreaker,
        redondearBreaker: redondearBreaker
    };
})();

if (typeof window !== 'undefined') {
    window.BreakerSelector = BreakerSelector;
}
