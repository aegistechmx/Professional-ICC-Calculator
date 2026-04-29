/**
 * debug/index.js - Professional debugging system for ICC Calculator
 * 
 * Responsibility: Centralized debugging with logging, tracing, and performance monitoring
 */

// Global debug state
let DEBUG_MODE = false;
let DEBUG_LOGS = [];
const MAX_LOGS = 1000;

/**
 * Initialize debug system
 * @param {boolean} enabled - Enable debugging
 */
function init(enabled = false) {
  DEBUG_MODE = enabled;
  clearLogs();
  logStep("DEBUG_INIT", { enabled: DEBUG_MODE }, "info");
  
  // Initialize UI panel if in browser
  if (typeof window !== 'undefined' && typeof DebugPanel !== 'undefined') {
    DebugPanel.init(false);
  }
  
  // Setup global shortcuts
  if (typeof window !== 'undefined') {
    window.DebugSystem = DebugSystem;
    window.showDebug = showDebug;
    window.clearDebug = clearLogs;
    window.exportDebug = exportDebug;
  }
}

/**
 * Log a debug step
 * @param {string} step - Step name
 * @param {Object} data - Step data
 * @param {string} level - Log level (info, warn, error, debug)
 */
function logStep(step, data = {}, level = "info") {
  if (!DEBUG_MODE) return;
  
  const entry = {
    time: new Date().toISOString(),
    step: step,
    level: level,
    data: data ? JSON.parse(JSON.stringify(data)) : {}
  };
  
  // Console output (only in debug mode)
  const prefix = `[${level.toUpperCase()}] ${step}`;
  if (level === "error") {
    // eslint-disable-next-line no-console
    console.error(prefix, entry);
  } else if (level === "warn") {
    // eslint-disable-next-line no-console
    console.warn(prefix, entry);
  } else {
    // eslint-disable-next-line no-console
    console.log(prefix, entry);
  }
  
  // Store in memory
  DEBUG_LOGS.push(entry);
  
  // Limit logs
  if (DEBUG_LOGS.length > MAX_LOGS) {
    DEBUG_LOGS = DEBUG_LOGS.slice(-MAX_LOGS);
  }
  
  return entry;
}

/**
 * Get all debug logs
 * @returns {Array} Array of log entries
 */
function getLogs() {
  return [...DEBUG_LOGS];
}

/**
 * Clear all debug logs
 */
function clearLogs() {
  DEBUG_LOGS = [];
  if (typeof window !== 'undefined') {
    window.__DEBUG_LOGS__ = DEBUG_LOGS;
  }
}

/**
 * Export logs to JSON
 * @returns {string} JSON string of logs
 */
function exportDebug() {
  return JSON.stringify(DEBUG_LOGS, null, 2);
}

/**
 * Show debug panel (browser only)
 */
function showDebug() {
  if (typeof window !== 'undefined' && typeof DebugPanel !== 'undefined') {
    DebugPanel.toggle();
  }
}

/**
 * Trace function execution
 * @param {string} name - Function name
 * @param {Function} fn - Function to trace
 * @returns {Function} Wrapped function
 */
function traceStep(name, fn) {
  return function(...args) {
    logStep(name + ":START", { args: args }, "info");
    const start = performance.now();
    
    try {
      const result = fn.apply(this, args);
      const duration = performance.now() - start;
      logStep(name + ":END", { duration: duration.toFixed(2) + "ms" }, "info");
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      logStep(name + ":ERROR", { 
        duration: duration.toFixed(2) + "ms", 
        message: error.message, 
        stack: error.stack 
      }, "error");
      throw error;
    }
  };
}

/**
 * Performance monitor
 */
const PerformanceMonitor = {
  timers: new Map(),
  
  start(name) {
    this.timers.set(name, performance.now());
  },
  
  end(name) {
    const start = this.timers.get(name);
    if (start) {
      const duration = performance.now() - start;
      this.timers.delete(name);
      logStep("PERF", { name, duration: duration.toFixed(2) + "ms" }, "info");
      return duration;
    }
    return 0;
  },
  
  measure(name, fn) {
    this.start(name);
    try {
      const result = fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }
};

/**
 * Memory monitor
 */
const MemoryMonitor = {
  measure() {
    if (typeof performance !== 'undefined' && performance.memory) {
      const memory = {
        used: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + " MB",
        total: (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + " MB",
        limit: (performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + " MB"
      };
      logStep("MEMORY", memory, "info");
      return memory;
    }
    return null;
  }
};

/**
 * Debug system API
 */
const DebugSystem = {
  init,
  logStep,
  getLogs,
  clearLogs,
  exportDebug,
  traceStep,
  PerformanceMonitor,
  MemoryMonitor,
  isEnabled: () => DEBUG_MODE,
  enable: () => { DEBUG_MODE = true; },
  disable: () => { DEBUG_MODE = false; }
};

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DebugSystem;
}

// Global assignment for browser
if (typeof window !== 'undefined') {
  window.DebugSystem = DebugSystem;
  window.__DEBUG_LOGS__ = DEBUG_LOGS;
}
