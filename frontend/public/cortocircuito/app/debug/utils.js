/**
 * Debug utilities for cortocircuito application
 * Provides debugging tools and development helpers
 */

class DebugUtils {
    constructor() {
        this.enabled = false;
        this.logLevel = 'info'; // 'debug', 'info', 'warn', 'error'
        this.logs = [];
        this.maxLogs = 100;
        this.init();
    }

    init() {
        // Enable debug mode in development
        if (window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.search.includes('debug=true')) {
            this.enable();
        }

        // Add global debug functions
        window.debug = this;
        window.logData = (data) => this.logData(data);
        window.clearLogs = () => this.clearLogs();

        console.log('🔧 Debug Utils initialized');
    }

    /**
     * Enable debug mode
     */
    enable() {
        this.enabled = true;
        console.log('🔧 Debug mode enabled');
        this.showDebugPanel();
    }

    /**
     * Disable debug mode
     */
    disable() {
        this.enabled = false;
        this.hideDebugPanel();
        console.log('🔧 Debug mode disabled');
    }

    /**
     * Set log level
     * @param {string} level - Log level
     */
    setLogLevel(level) {
        this.logLevel = level;
        console.log(`🔧 Log level set to: ${level}`);
    }

    /**
     * Log debug message
     * @param {string} message - Debug message
     * @param {object} data - Additional data
     */
    debug(message, data = null) {
        this.log('debug', message, data);
    }

    /**
     * Log info message
     * @param {string} message - Info message
     * @param {object} data - Additional data
     */
    info(message, data = null) {
        this.log('info', message, data);
    }

    /**
     * Log warning message
     * @param {string} message - Warning message
     * @param {object} data - Additional data
     */
    warn(message, data = null) {
        this.log('warn', message, data);
    }

    /**
     * Log error message
     * @param {string} message - Error message
     * @param {object} data - Additional data
     */
    error(message, data = null) {
        this.log('error', message, data);
    }

    /**
     * Internal logging function
     * @param {string} level - Log level
     * @param {string} message - Log message
     * @param {object} data - Additional data
     */
    log(level, message, data = null) {
        if (!this.enabled) return;

        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data,
            stack: level === 'error' ? new Error().stack : null
        };

        // Add to logs array
        this.logs.push(logEntry);

        // Limit log size
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // Console output based on level
        const consoleMethod = level === 'debug' ? 'log' :
                             level === 'info' ? 'info' :
                             level === 'warn' ? 'warn' : 'error';

        console[consoleMethod](`[${level.toUpperCase()}] ${message}`, data || '');

        // Update debug panel if visible
        this.updateDebugPanel();
    }

    /**
     * Log data object with formatting
     * @param {object} data - Data to log
     * @param {string} label - Data label
     */
    logData(data, label = 'Data') {
        if (!this.enabled) return;

        console.group(`📊 ${label}`);
        console.log(JSON.stringify(data, null, 2));
        console.groupEnd();

        this.debug(`${label} logged`, data);
    }

    /**
     * Clear all logs
     */
    clearLogs() {
        this.logs = [];
        console.log('🧹 Debug logs cleared');
        this.updateDebugPanel();
    }

    /**
     * Export logs as JSON
     * @returns {string} - JSON string of logs
     */
    exportLogs() {
        return JSON.stringify(this.logs, null, 2);
    }

    /**
     * Show debug panel
     */
    showDebugPanel() {
        if (!this.enabled) return;

        let panel = document.getElementById('debug-panel');

        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'debug-panel';
            document.body.appendChild(panel);
        }

        panel.innerHTML = `
            <div class="debug-header">
                <h4>🔧 Debug Panel</h4>
                <div class="debug-controls">
                    <button onclick="debug.clearLogs()">Clear</button>
                    <button onclick="debug.exportLogsToConsole()">Export</button>
                    <button onclick="debug.hideDebugPanel()">Hide</button>
                </div>
            </div>
            <div id="debug-content">
                <div class="debug-stats">
                    <span>Logs: ${this.logs.length}</span>
                    <span>Level: ${this.logLevel}</span>
                </div>
                <div id="debug-entries"></div>
            </div>
        `;

        panel.classList.add('debug-panel');
        this.updateDebugPanel();
    }

    /**
     * Hide debug panel
     */
    hideDebugPanel() {
        const panel = document.getElementById('debug-panel');
        if (panel) {
            panel.remove();
        }
    }

    /**
     * Update debug panel content
     */
    updateDebugPanel() {
        if (!this.enabled) return;

        const panel = document.getElementById('debug-panel');
        if (!panel) return;

        const entriesEl = document.getElementById('debug-entries');
        if (!entriesEl) return;

        // Show last 10 entries
        const recentLogs = this.logs.slice(-10);
        entriesEl.innerHTML = recentLogs.map(log => `
            <div class="debug-entry debug-${log.level}">
                <span class="debug-time">${new Date(log.timestamp).toLocaleTimeString()}</span>
                <span class="debug-level">[${log.level.toUpperCase()}]</span>
                <span class="debug-message">${log.message}</span>
            </div>
        `).join('');
    }

    /**
     * Export logs to console
     */
    exportLogsToConsole() {
        console.group('📋 Debug Logs Export');
        console.log(this.exportLogs());
        console.groupEnd();
    }

    /**
     * Profile function execution
     * @param {string} name - Function name
     * @param {function} fn - Function to profile
     * @returns {*} - Function result
     */
    async profileFunction(name, fn) {
        if (!this.enabled) {
            return await fn();
        }

        const start = performance.now();
        this.debug(`Starting ${name}`);

        try {
            const result = await fn();
            const duration = performance.now() - start;
            this.debug(`${name} completed in ${duration.toFixed(2)}ms`);
            return result;
        } catch (error) {
            const duration = performance.now() - start;
            this.error(`${name} failed after ${duration.toFixed(2)}ms: ${error.message}`);
            throw error;
        }
    }

    /**
     * Monitor API calls
     * @param {string} endpoint - API endpoint
     * @param {object} params - Request parameters
     * @param {function} apiCall - API call function
     * @returns {*} - API response
     */
    async monitorAPICall(endpoint, params, apiCall) {
        if (!this.enabled) {
            return await apiCall();
        }

        this.debug(`API Call: ${endpoint}`, params);

        const start = performance.now();
        try {
            const result = await apiCall();
            const duration = performance.now() - start;
            this.info(`API ${endpoint} completed in ${duration.toFixed(2)}ms`, result);
            return result;
        } catch (error) {
            const duration = performance.now() - start;
            this.error(`API ${endpoint} failed after ${duration.toFixed(2)}ms`, error);
            throw error;
        }
    }

    /**
     * Create performance report
     * @returns {object} - Performance statistics
     */
    getPerformanceReport() {
        const apiCalls = this.logs.filter(log => log.message.includes('API'));
        const errors = this.logs.filter(log => log.level === 'error');

        return {
            totalLogs: this.logs.length,
            apiCalls: apiCalls.length,
            errors: errors.length,
            avgResponseTime: this.calculateAverageResponseTime(apiCalls),
            errorRate: errors.length / Math.max(apiCalls.length, 1)
        };
    }

    /**
     * Calculate average response time from API calls
     * @param {Array} apiCalls - API call logs
     * @returns {number} - Average response time
     */
    calculateAverageResponseTime(apiCalls) {
        const times = apiCalls
            .filter(log => log.data && typeof log.data === 'object' && log.data.duration)
            .map(log => log.data.duration);

        if (times.length === 0) return 0;

        return times.reduce((sum, time) => sum + time, 0) / times.length;
    }
}

// Add CSS styles for debug panel
const debugStyles = `
<style>
.debug-panel {
    position: fixed;
    bottom: 20px;
    left: 20px;
    background: rgba(0,0,0,0.9);
    color: white;
    padding: 15px;
    border-radius: 8px;
    max-width: 400px;
    max-height: 300px;
    overflow-y: auto;
    font-size: 12px;
    z-index: 1000;
    font-family: monospace;
}

.debug-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.debug-header h4 {
    margin: 0;
    color: #61dafb;
}

.debug-controls {
    display: flex;
    gap: 5px;
}

.debug-controls button {
    background: #333;
    color: white;
    border: 1px solid #555;
    padding: 2px 6px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 11px;
}

.debug-controls button:hover {
    background: #555;
}

.debug-stats {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
    font-size: 11px;
    color: #ccc;
}

.debug-entry {
    margin-bottom: 3px;
    padding: 2px 0;
    border-left: 2px solid transparent;
}

.debug-debug { border-left-color: #888; }
.debug-info { border-left-color: #61dafb; }
.debug-warn { border-left-color: #ffa500; }
.debug-error { border-left-color: #ff4444; }

.debug-time {
    color: #888;
    margin-right: 5px;
}

.debug-level {
    font-weight: bold;
    margin-right: 5px;
}

.debug-message {
    color: #fff;
}
</style>
`;

// Inject styles into document head
document.head.insertAdjacentHTML('beforeend', debugStyles);

// Global instance
const debugUtils = new DebugUtils();

// Export for use in other modules
window.DebugUtils = DebugUtils;
window.debugUtils = debugUtils;