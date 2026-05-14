/**
 * debug/index.js — Punto de entrada del sistema de debugging
 * Carga todos los módulos y expone API unificada
 */

// Cargar módulos (asumiendo que están en el mismo directorio)
// En producción, esto se cargaría vía HTML script tags

var DebugSystem = (function() {
    
    var DEBUG_MODE = false;
    
    /**
     * Inicializar sistema de debug
     * @param {boolean} enabled - Habilitar modo debug
     */
    function init(enabled) {
        DEBUG_MODE = enabled !== undefined ? enabled : true;
        
        if (DEBUG_MODE) {
            DebugLogger.clearLogs();
            DebugLogger.logStep("DEBUG_INIT", { enabled: DEBUG_MODE }, "info");
            console.log("[DEBUG] Sistema de debugging inicializado");
        }
    }
    
    /**
     * Habilitar modo debug
     */
    function enable() {
        init(true);
    }
    
    /**
     * Deshabilitar modo debug
     */
    function disable() {
        DEBUG_MODE = false;
        DebugLogger.logStep("DEBUG_DISABLE", {}, "info");
    }
    
    /**
     * Verificar si modo debug está activo
     * @returns {boolean}
     */
    function isEnabled() {
        return DEBUG_MODE;
    }
    
    /**
     * Log condicional (solo si debug está activo)
     */
    function log(step, data, level) {
        if (DEBUG_MODE) {
            DebugLogger.logStep(step, data, level);
        }
    }
    
    /**
     * Snapshot condicional
     */
    function snapshot(name, sistema) {
        if (DEBUG_MODE) {
            DebugTracer.snapshot(name, sistema);
        }
    }
    
    /**
     * Assert siempre ejecuta (independiente de modo debug)
     */
    function assert(condition, message, data) {
        DebugValidator.assert(condition, message, data);
    }
    
    /**
     * Mostrar panel de debug en consola
     */
    function showPanel() {
        console.log("=== DEBUG PANEL ===");
        console.log("Mode:", DEBUG_MODE ? "ENABLED" : "DISABLED");
        console.log("Total logs:", DebugLogger.getLogs().length);
        console.log("\n--- STATS ---");
        DebugTimeline.renderStats();
        console.log("\n--- TIMELINE ---");
        DebugTimeline.renderTimeline();
        console.log("\n=== END PANEL ===");
    }
    
    /**
     * Exportar reporte completo
     * @returns {Object} Reporte con logs, stats y timeline
     */
    function exportReport() {
        return {
            mode: DEBUG_MODE,
            timestamp: new Date().toISOString(),
            logs: DebugLogger.getLogs(),
            stats: DebugTimeline.getStats(),
            csv: DebugTimeline.exportCSV()
        };
    }
    
    return {
        init: init,
        enable: enable,
        disable: disable,
        isEnabled: isEnabled,
        log: log,
        snapshot: snapshot,
        assert: assert,
        showPanel: showPanel,
        exportReport: exportReport,
        // Exponer módulos directamente
        Logger: DebugLogger,
        Tracer: DebugTracer,
        Validator: DebugValidator,
        Timeline: DebugTimeline
    };
})();

if (typeof window !== 'undefined') {
    window.DebugSystem = DebugSystem;
    
    // Atajo global para consola
    window.showDebug = function() {
        DebugSystem.showPanel();
    };
    
    window.clearDebug = function() {
        DebugLogger.clearLogs();
    };
    
    window.exportDebug = function() {
        var report = DebugSystem.exportReport();
        console.log(JSON.stringify(report, null, 2));
        return report;
    };
    
    // Inicializar panel UI automáticamente
    if (typeof DebugPanel !== 'undefined') {
        DebugPanel.init(false); // No mostrar automáticamente
    }
}
