/**
 * tracer.js — Tracer de flujo con timing y error tracking
 * Envuelve funciones para trace automático de ejecución
 */

var DebugTracer = (function() {
    
    /**
     * Envuelve una función con trace automático
     * @param {string} name - Nombre del paso para logging
     * @param {Function} fn - Función a envolver
     * @returns {Function} Función envuelta con trace
     */
    function traceStep(name, fn) {
        return function() {
            var args = Array.prototype.slice.call(arguments);
            
            // Log START
            DebugLogger.logStep(name + ":START", { args: args }, "info");
            
            var start = performance.now();
            
            try {
                var result = fn.apply(this, args);
                
                var end = performance.now();
                var duration = (end - start).toFixed(2) + "ms";
                
                // Log END
                DebugLogger.logStep(name + ":END", {
                    duration: duration,
                    result: typeof result === 'object' ? JSON.parse(JSON.stringify(result)) : result
                }, "info");
                
                return result;
                
            } catch (error) {
                var end = performance.now();
                var duration = (end - start).toFixed(2) + "ms";
                
                // Log ERROR
                DebugLogger.logStep(name + ":ERROR", {
                    duration: duration,
                    message: error.message,
                    stack: error.stack
                }, "error");
                
                throw error;
            }
        };
    }
    
    /**
     * Envuelve función asíncrona con trace
     * @param {string} name - Nombre del paso para logging
     * @param {Function} fn - Función asíncrona a envolver
     * @returns {Function} Función envuelta con trace
     */
    function traceStepAsync(name, fn) {
        return function() {
            var args = Array.prototype.slice.call(arguments);
            
            DebugLogger.logStep(name + ":START", { args: args }, "info");
            
            var start = performance.now();
            
            return fn.apply(this, args)
                .then(function(result) {
                    var end = performance.now();
                    var duration = (end - start).toFixed(2) + "ms";
                    
                    DebugLogger.logStep(name + ":END", {
                        duration: duration,
                        result: typeof result === 'object' ? JSON.parse(JSON.stringify(result)) : result
                    }, "info");
                    
                    return result;
                })
                .catch(function(error) {
                    var end = performance.now();
                    var duration = (end - start).toFixed(2) + "ms";
                    
                    DebugLogger.logStep(name + ":ERROR", {
                        duration: duration,
                        message: error.message,
                        stack: error.stack
                    }, "error");
                    
                    throw error;
                });
        };
    }
    
    /**
     * Trace de snapshot del sistema
     * @param {string} name - Nombre del snapshot
     * @param {Object} sistema - Sistema a snapshot
     */
    function snapshot(name, sistema) {
        DebugLogger.logStep(name + ":SNAPSHOT", {
            sistema: sistema ? JSON.parse(JSON.stringify(sistema)) : null
        }, "debug");
    }
    
    return {
        traceStep: traceStep,
        traceStepAsync: traceStepAsync,
        snapshot: snapshot
    };
})();

if (typeof window !== 'undefined') {
    window.DebugTracer = DebugTracer;
}
