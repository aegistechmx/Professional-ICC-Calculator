/**
 * timeline.js — Timeline visual del flujo de ejecución
 * Renderiza logs en formato tabla para análisis visual
 */

var DebugTimeline = (function() {
    
    /**
     * Renderizar timeline en consola como tabla
     */
    function renderTimeline() {
        var logs = DebugLogger.getLogs();
        
        if (logs.length === 0) {
            console.log("[TIMELINE] No hay logs para mostrar");
            return;
        }
        
        var tableData = logs.map(function(log) {
            return {
                step: log.step,
                time: log.time,
                level: log.level,
                data: JSON.stringify(log.data).substring(0, 50) + "..."
            };
        });
        
        console.table(tableData);
    }
    
    /**
     * Renderizar timeline filtrado por nivel
     * @param {string} level - Nivel a filtrar
     */
    function renderTimelineByLevel(level) {
        var logs = DebugLogger.filterByLevel(level);
        
        if (logs.length === 0) {
            console.log("[TIMELINE] No hay logs de nivel: " + level);
            return;
        }
        
        var tableData = logs.map(function(log) {
            return {
                step: log.step,
                time: log.time,
                data: JSON.stringify(log.data).substring(0, 50) + "..."
            };
        });
        
        console.table(tableData);
    }
    
    /**
     * Renderizar timeline de errores solamente
     */
    function renderErrors() {
        renderTimelineByLevel("error");
    }
    
    /**
     * Renderizar timeline de warnings solamente
     */
    function renderWarnings() {
        renderTimelineByLevel("warn");
    }
    
    /**
     * Obtener estadísticas de ejecución
     * @returns {Object} Estadísticas
     */
    function getStats() {
        var logs = DebugLogger.getLogs();
        
        var stats = {
            total: logs.length,
            byLevel: {
                info: 0,
                warn: 0,
                error: 0,
                debug: 0
            },
            byStep: {},
            durations: []
        };
        
        logs.forEach(function(log) {
            // Contar por nivel
            if (stats.byLevel[log.level] !== undefined) {
                stats.byLevel[log.level]++;
            }
            
            // Contar por paso
            var stepName = log.step.split(":")[0]; // Remover :START/:END
            stats.byStep[stepName] = (stats.byStep[stepName] || 0) + 1;
            
            // Extraer duraciones si existen
            if (log.data && log.data.duration) {
                var duration = parseFloat(log.data.duration);
                if (!isNaN(duration)) {
                    stats.durations.push(duration);
                }
            }
        });
        
        // Calcular estadísticas de duración
        if (stats.durations.length > 0) {
            stats.durationStats = {
                total: stats.durations.reduce(function(a, b) { return a + b; }, 0).toFixed(2) + "ms",
                avg: (stats.durations.reduce(function(a, b) { return a + b; }, 0) / stats.durations.length).toFixed(2) + "ms",
                max: Math.max.apply(Math, stats.durations).toFixed(2) + "ms",
                min: Math.min.apply(Math, stats.durations).toFixed(2) + "ms"
            };
        }
        
        return stats;
    }
    
    /**
     * Renderizar estadísticas
     */
    function renderStats() {
        var stats = getStats();
        
        console.log("[TIMELINE STATS]");
        console.log("Total logs:", stats.total);
        console.log("Por nivel:", stats.byLevel);
        console.log("Por paso:", stats.byStep);
        if (stats.durationStats) {
            console.log("Duraciones:", stats.durationStats);
        }
    }
    
    /**
     * Exportar timeline a CSV
     * @returns {string} CSV string
     */
    function exportCSV() {
        var logs = DebugLogger.getLogs();
        
        if (logs.length === 0) {
            return "";
        }
        
        var header = "time,step,level,data\n";
        var rows = logs.map(function(log) {
            return [
                log.time,
                log.step,
                log.level,
                JSON.stringify(log.data).replace(/"/g, '""')
            ].join(",");
        });
        
        return header + rows.join("\n");
    }
    
    /**
     * Buscar logs por texto
     * @param {string} text - Texto a buscar
     * @returns {Array} Logs que coinciden
     */
    function search(text) {
        var logs = DebugLogger.getLogs();
        var lowerText = text.toLowerCase();
        
        return logs.filter(function(log) {
            var logStr = JSON.stringify(log).toLowerCase();
            return logStr.indexOf(lowerText) !== -1;
        });
    }
    
    return {
        renderTimeline: renderTimeline,
        renderTimelineByLevel: renderTimelineByLevel,
        renderErrors: renderErrors,
        renderWarnings: renderWarnings,
        getStats: getStats,
        renderStats: renderStats,
        exportCSV: exportCSV,
        search: search
    };
})();

if (typeof window !== 'undefined') {
    window.DebugTimeline = DebugTimeline;
}
