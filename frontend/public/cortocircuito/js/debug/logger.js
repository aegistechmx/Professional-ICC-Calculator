/**
 * logger.js — Logger estructurado para debugging profesional
 * Captura logs con timestamp, nivel de severidad y datos inmutables
 */

var DebugLogger = (function() {
    
    /**
     * Log un paso del sistema con datos estructurados
     * @param {string} step - Nombre del paso/ejecución
     * @param {Object} data - Datos a loggear (se clonan para evitar mutación)
     * @param {string} level - Nivel de log: "info", "warn", "error", "debug"
     */
    function logStep(step, data, level) {
        level = level || "info";
        
        var entry = {
            time: new Date().toISOString(),
            step: step,
            level: level,
            data: data ? JSON.parse(JSON.stringify(data)) : {}
        };
        
        // Console output con formato
        var prefix = "[" + level.toUpperCase() + "] " + step;
        if (level === "error") {
            console.error(prefix, entry);
        } else if (level === "warn") {
            console.warn(prefix, entry);
        } else if (level === "debug") {
            console.debug(prefix, entry);
        } else {
            console.log(prefix, entry);
        }
        
        // Almacenar en memoria global
        if (typeof window !== 'undefined') {
            window.__DEBUG_LOGS__ = window.__DEBUG_LOGS__ || [];
            window.__DEBUG_LOGS__.push(entry);
            
            // Limitar a últimos 1000 entradas para evitar overflow
            if (window.__DEBUG_LOGS__.length > 1000) {
                window.__DEBUG_LOGS__.shift();
            }
        }
        
        return entry;
    }
    
    /**
     * Limpiar todos los logs
     */
    function clearLogs() {
        if (typeof window !== 'undefined') {
            window.__DEBUG_LOGS__ = [];
            logStep("LOGS_CLEARED", {}, "info");
        }
    }
    
    /**
     * Obtener todos los logs
     * @returns {Array} Array de entradas de log
     */
    function getLogs() {
        if (typeof window !== 'undefined') {
            return window.__DEBUG_LOGS__ || [];
        }
        return [];
    }
    
    /**
     * Filtrar logs por nivel
     * @param {string} level - Nivel a filtrar
     * @returns {Array} Logs filtrados
     */
    function filterByLevel(level) {
        return getLogs().filter(function(entry) {
            return entry.level === level;
        });
    }
    
    /**
     * Filtrar logs por paso
     * @param {string} step - Nombre del paso
     * @returns {Array} Logs filtrados
     */
    function filterByStep(step) {
        return getLogs().filter(function(entry) {
            return entry.step === step;
        });
    }
    
    /**
     * Exportar logs a JSON
     * @returns {string} JSON string de logs
     */
    function exportLogs() {
        return JSON.stringify(getLogs(), null, 2);
    }
    
    return {
        logStep: logStep,
        clearLogs: clearLogs,
        getLogs: getLogs,
        filterByLevel: filterByLevel,
        filterByStep: filterByStep,
        exportLogs: exportLogs
    };
})();

if (typeof window !== 'undefined') {
    window.DebugLogger = DebugLogger;
}
