/**
 * verification/nom.verifier.js — Verificador NOM-001-SEDE-2012
 * Arquitectura limpia: validación final del sistema
 */

var NOMVerifier = (function() {
    
    /**
     * Verificar sistema completo
     * @param {Object} ctx - Contexto del sistema
     */
    function verificarSistema(ctx) {
        ctx.nodos.forEach(function(nodo) {
            // Verificar ampacidad
            if (nodo.ampacidadFinal && nodo.I_diseño) {
                if (nodo.ampacidadFinal < nodo.I_diseño) {
                    ctx.errores.push("Nodo " + nodo.id + ": no cumple ampacidad (requiere " + nodo.I_diseño.toFixed(1) + "A, tiene " + nodo.ampacidadFinal.toFixed(1) + "A)");
                }
            }
            
            // Verificar caída de tensión
            if (nodo.caida && nodo.caida.porcentaje > 3) {
                ctx.warnings.push("Nodo " + nodo.id + ": caída de tensión > 3% (" + nodo.caida.porcentaje.toFixed(2) + "%)");
            }
            
            // Verificar breaker
            if (!nodo.breaker) {
                ctx.errores.push("Nodo " + nodo.id + ": sin breaker seleccionado");
            } else if (nodo.Isc && nodo.breaker.Icu < nodo.Isc) {
                ctx.errores.push("Nodo " + nodo.id + ": breaker insuficiente (Icu=" + nodo.breaker.Icu + "A < Isc=" + nodo.Isc + "A)");
            }
            
            // Verificar terminal (NOM 110.14C)
            if (nodo.ampacidad && nodo.ampacidad.violacionTerminal) {
                ctx.warnings.push("Nodo " + nodo.id + ": violación de terminal NOM 110.14C");
            }
            
            // Verificar falla a tierra (NOM 230.95)
            if (nodo.breaker && nodo.breaker.tipo !== "LSIG" && nodo.breaker.tipo !== "GFP") {
                ctx.warnings.push("Nodo " + nodo.id + ": se recomienda GFP/LSIG (NOM 230.95)");
            }
        });
    }
    
    /**
     * Verificar nodo individual
     * @param {Object} nodo - Nodo a verificar
     * @returns {Object} { ok, errores, warnings }
     */
    function verificarNodo(nodo) {
        var errores = [];
        var warnings = [];
        
        // Ampacidad
        if (nodo.ampacidadFinal && nodo.I_diseño) {
            if (nodo.ampacidadFinal < nodo.I_diseño) {
                errores.push("No cumple ampacidad");
            }
        }
        
        // Caída de tensión
        if (nodo.caida && nodo.caida.porcentaje > 3) {
            warnings.push("Caída de tensión > 3%");
        }
        
        // Breaker
        if (!nodo.breaker) {
            errores.push("Sin breaker seleccionado");
        } else if (nodo.Isc && nodo.breaker.Icu < nodo.Isc) {
            errores.push("Breaker insuficiente");
        }
        
        return {
            ok: errores.length === 0,
            errores: errores,
            warnings: warnings
        };
    }
    
    return {
        verificarSistema: verificarSistema,
        verificarNodo: verificarNodo
    };
})();

if (typeof window !== 'undefined') {
    window.NOMVerifier = NOMVerifier;
}
