/**
 * modules/validator.js — Validador de Entrada
 * Arquitectura limpia: validación antes de cualquier cálculo
 */

var Validator = (function() {
    
    /**
     * Validar entrada del sistema
     * @param {Object} ctx - Contexto del sistema
     */
    function validarEntrada(ctx) {
        if (!ctx.nodos || ctx.nodos.length === 0) {
            ctx.errores.push("Sistema sin nodos");
            throw new Error("Entrada inválida: sin nodos");
        }
        
        ctx.nodos.forEach(function(nodo, index) {
            // Validar ID
            if (!nodo.id) {
                nodo.id = "nodo_" + index;
            }
            
            // Validar corriente de carga
            if (!nodo.I_carga || nodo.I_carga <= 0) {
                ctx.errores.push("Nodo " + nodo.id + ": sin corriente de carga válida");
            }
            
            // Validar longitud
            if (!nodo.longitud || nodo.longitud <= 0) {
                ctx.warnings.push("Nodo " + nodo.id + ": longitud no definida");
            }
            
            // Validar material
            if (!nodo.material) {
                nodo.material = 'cobre';
                ctx.warnings.push("Nodo " + nodo.id + ": material no definido, usando cobre");
            }
            
            // Validar temperatura ambiente
            if (!nodo.tempAmbiente || nodo.tempAmbiente <= 0) {
                nodo.tempAmbiente = 30;
                ctx.warnings.push("Nodo " + nodo.id + ": temperatura ambiente no definida, usando 30°C");
            }
            
            // Validar agrupamiento
            if (!nodo.agrupamiento || nodo.agrupamiento <= 0) {
                nodo.agrupamiento = 3;
                ctx.warnings.push("Nodo " + nodo.id + ": agrupamiento no definido, usando 3");
            }
            
            // Validar paralelos
            if (!nodo.paralelos || nodo.paralelos <= 0) {
                nodo.paralelos = 1;
                ctx.warnings.push("Nodo " + nodo.id + ": paralelos no definido, usando 1");
            }
            
            // Validar factor de potencia
            if (!nodo.FP || nodo.FP <= 0 || nodo.FP > 1) {
                nodo.FP = 0.9;
                ctx.warnings.push("Nodo " + nodo.id + ": FP no definido, usando 0.9");
            }
        });
        
        if (ctx.errores.length > 0) {
            throw new Error("Entrada inválida: " + ctx.errores.join(", "));
        }
    }
    
    /**
     * Validar nodo individual
     * @param {Object} nodo - Nodo a validar
     * @returns {Object} { valido, errores, warnings }
     */
    function validarNodo(nodo) {
        var errores = [];
        var warnings = [];
        
        if (!nodo.I_carga || nodo.I_carga <= 0) {
            errores.push("Sin corriente de carga válida");
        }
        
        if (!nodo.longitud || nodo.longitud <= 0) {
            warnings.push("Longitud no definida");
        }
        
        if (!nodo.material) {
            warnings.push("Material no definido");
        }
        
        if (!nodo.tempAmbiente) {
            warnings.push("Temperatura ambiente no definida");
        }
        
        return {
            valido: errores.length === 0,
            errores: errores,
            warnings: warnings
        };
    }
    
    return {
        validarEntrada: validarEntrada,
        validarNodo: validarNodo
    };
})();

if (typeof window !== 'undefined') {
    window.Validator = Validator;
}
