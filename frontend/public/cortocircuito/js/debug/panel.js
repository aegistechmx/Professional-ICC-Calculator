/**
 * panel.js — Panel UI para debugging
 * Toggle y visualización de logs en la interfaz
 */

var DebugPanel = (function() {
    
    var panelVisible = false;
    var panelElement = null;
    
    /**
     * Crear elemento del panel
     */
    function createPanel() {
        if (panelElement) return panelElement;
        
        panelElement = document.createElement('div');
        panelElement.id = 'debug-panel';
        panelElement.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 400px;
            max-height: 80vh;
            background: #1e1e1e;
            color: #d4d4d4;
            border: 1px solid #454545;
            border-radius: 8px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 12px;
            z-index: 10000;
            display: none;
            flex-direction: column;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        `;
        
        panelElement.innerHTML = `
            <div style="padding: 10px; background: #2d2d2d; border-bottom: 1px solid #454545; display: flex; justify-content: space-between; align-items: center;">
                <strong>DEBUG PANEL</strong>
                <button id="debug-close" style="background: #454545; color: white; border: none; padding: 4px 8px; cursor: pointer; border-radius: 4px;">✕</button>
            </div>
            <div style="padding: 10px; display: flex; gap: 5px; border-bottom: 1px solid #454545;">
                <button id="debug-show-logs" style="flex: 1; background: #0e639c; color: white; border: none; padding: 6px; cursor: pointer; border-radius: 4px;">Logs</button>
                <button id="debug-show-stats" style="flex: 1; background: #0e639c; color: white; border: none; padding: 6px; cursor: pointer; border-radius: 4px;">Stats</button>
                <button id="debug-clear" style="flex: 1; background: #d73a49; color: white; border: none; padding: 6px; cursor: pointer; border-radius: 4px;">Clear</button>
            </div>
            <div id="debug-content" style="padding: 10px; overflow-y: auto; flex: 1; max-height: 60vh;">
                <div style="color: #888;">No logs yet</div>
            </div>
            <div style="padding: 10px; background: #2d2d2d; border-top: 1px solid #454545; font-size: 10px; color: #888;">
                Mode: <span id="debug-mode">DISABLED</span> | Logs: <span id="debug-count">0</span>
            </div>
        `;
        
        document.body.appendChild(panelElement);
        
        // Event listeners
        document.getElementById('debug-close').addEventListener('click', hidePanel);
        document.getElementById('debug-show-logs').addEventListener('click', showLogs);
        document.getElementById('debug-show-stats').addEventListener('click', showStats);
        document.getElementById('debug-clear').addEventListener('click', clearLogs);
        
        return panelElement;
    }
    
    /**
     * Mostrar panel
     */
    function showPanel() {
        var panel = createPanel();
        panel.style.display = 'flex';
        panelVisible = true;
        updateStatus();
    }
    
    /**
     * Ocultar panel
     */
    function hidePanel() {
        if (panelElement) {
            panelElement.style.display = 'none';
        }
        panelVisible = false;
    }
    
    /**
     * Toggle panel
     */
    function togglePanel() {
        if (panelVisible) {
            hidePanel();
        } else {
            showPanel();
        }
    }
    
    /**
     * Mostrar logs en el panel
     */
    function showLogs() {
        var content = document.getElementById('debug-content');
        var logs = DebugLogger.getLogs();
        
        if (logs.length === 0) {
            content.innerHTML = '<div style="color: #888;">No logs yet</div>';
            return;
        }
        
        var html = logs.map(function(log) {
            var color = log.level === 'error' ? '#f85149' : 
                       log.level === 'warn' ? '#d29922' : 
                       log.level === 'debug' ? '#79c0ff' : '#d4d4d4';
            return '<div style="margin-bottom: 8px; padding: 4px; background: #252526; border-left: 3px solid ' + color + ';">' +
                   '<div style="font-size: 10px; color: #888;">' + log.time + '</div>' +
                   '<div style="color: ' + color + '; font-weight: bold;">' + log.step + '</div>' +
                   '<div style="font-size: 11px; color: #888; margin-top: 4px;">' + JSON.stringify(log.data).substring(0, 100) + '...</div>' +
                   '</div>';
        }).join('');
        
        content.innerHTML = html;
    }
    
    /**
     * Mostrar estadísticas en el panel
     */
    function showStats() {
        var content = document.getElementById('debug-content');
        var stats = DebugTimeline.getStats();
        
        var html = '<div style="color: #d4d4d4;">' +
                   '<div>Total logs: <strong>' + stats.total + '</strong></div>' +
                   '<div style="margin-top: 10px;">By level:</div>' +
                   '<div style="margin-left: 10px;">Info: ' + stats.byLevel.info + '</div>' +
                   '<div style="margin-left: 10px;">Warn: ' + stats.byLevel.warn + '</div>' +
                   '<div style="margin-left: 10px;">Error: ' + stats.byLevel.error + '</div>' +
                   '<div style="margin-left: 10px;">Debug: ' + stats.byLevel.debug + '</div>' +
                   '<div style="margin-top: 10px;">By step:</div>';
        
        for (var step in stats.byStep) {
            html += '<div style="margin-left: 10px;">' + step + ': ' + stats.byStep[step] + '</div>';
        }
        
        if (stats.durationStats) {
            html += '<div style="margin-top: 10px;">Durations:</div>' +
                    '<div style="margin-left: 10px;">Total: ' + stats.durationStats.total + '</div>' +
                    '<div style="margin-left: 10px;">Avg: ' + stats.durationStats.avg + '</div>' +
                    '<div style="margin-left: 10px;">Max: ' + stats.durationStats.max + '</div>' +
                    '<div style="margin-left: 10px;">Min: ' + stats.durationStats.min + '</div>';
        }
        
        html += '</div>';
        content.innerHTML = html;
    }
    
    /**
     * Limpiar logs
     */
    function clearLogs() {
        DebugLogger.clearLogs();
        updateStatus();
        showLogs();
    }
    
    /**
     * Actualizar estado del panel
     */
    function updateStatus() {
        var modeEl = document.getElementById('debug-mode');
        var countEl = document.getElementById('debug-count');
        
        if (modeEl) {
            modeEl.textContent = DebugSystem.isEnabled() ? 'ENABLED' : 'DISABLED';
            modeEl.style.color = DebugSystem.isEnabled() ? '#3fb950' : '#f85149';
        }
        
        if (countEl) {
            countEl.textContent = DebugLogger.getLogs().length;
        }
    }
    
    /**
     * Crear botón toggle flotante
     */
    function createToggleButton() {
        var btn = document.createElement('button');
        btn.id = 'debug-toggle-btn';
        btn.innerHTML = '🐛';
        btn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: #0e639c;
            color: white;
            border: none;
            font-size: 24px;
            cursor: pointer;
            z-index: 9999;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            transition: transform 0.2s;
        `;
        
        btn.addEventListener('mouseenter', function() {
            btn.style.transform = 'scale(1.1)';
        });
        
        btn.addEventListener('mouseleave', function() {
            btn.style.transform = 'scale(1)';
        });
        
        btn.addEventListener('click', togglePanel);
        
        document.body.appendChild(btn);
        
        return btn;
    }
    
    /**
     * Inicializar panel
     * @param {boolean} autoShow - Mostrar automáticamente
     */
    function init(autoShow) {
        createToggleButton();
        
        if (autoShow) {
            showPanel();
        }
    }
    
    return {
        showPanel: showPanel,
        hidePanel: hidePanel,
        togglePanel: togglePanel,
        showLogs: showLogs,
        showStats: showStats,
        clearLogs: clearLogs,
        init: init
    };
})();

if (typeof window !== 'undefined') {
    window.DebugPanel = DebugPanel;
}
