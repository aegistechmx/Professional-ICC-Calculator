/**
 * core/dominio/cortocircuito.js — Dominio de Cortocircuito
 * Módulo de cálculo de corrientes de falla
 */

var DominioCortocircuito = (function() {
    
    /**
     * Calcular cortocircuito
     * @param {Object} sistema - Datos del sistema
     * @returns {Object} Resultado de cortocircuito
     */
    function calcularCortocircuito(sistema) {
        if (typeof ShortcircuitEngine !== 'undefined' && sistema.Z_fuente) {
            return ShortcircuitEngine.calcularFalla(sistema, sistema);
        }
        
        // Fallback básico si ShortcircuitEngine no está disponible
        if (sistema.voltaje && sistema.Z_fuente) {
            var Z = Math.sqrt(Math.pow(sistema.Z_fuente.R || 0, 2) + Math.pow(sistema.Z_fuente.X || 0, 2));
            var Isc = Z > 0 ? (sistema.voltaje / (Math.sqrt(3) * Z)) : 0;
            var xr = (sistema.Z_fuente.X || 0) / (sistema.Z_fuente.R || 1);
            var Ipeak = Isc * (1.41 + 1.0 / xr);
            
            return {
                Isc: Isc,
                Ipeak: Ipeak,
                xr: xr
            };
        }
        
        return { Isc: 0, Ipeak: 0, xr: 0 };
    }
    
    return {
        calcularCortocircuito: calcularCortocircuito
    };
})();

if (typeof window !== 'undefined') {
    window.DominioCortocircuito = DominioCortocircuito;
}
