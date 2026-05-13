/* eslint-disable no-console */
/**
 * debug/index.js - Professional debugging system for ICC Calculator
 *
 * Responsibility: Centralized debugging with logging, tracing, and performance monitoring
 */

// Global debug state
let DEBUG_MODE = false
let DEBUG_LOGS = []
const MAX_LOGS = 1000

/**
 * Get high-resolution timestamp
 * @returns {number} Timestamp in ms
 */
const getNow = () => {
  if (typeof performance !== 'undefined' && performance.now) {
    return performance.now()
  }
  return Date.now()
}

/**
 * Engineering constraints for electrical parameters
 */
const BRIDGE_CONSTRAINTS = {
  tension: { min: 120, max: 500000, unit: 'V' },
  voltage: { min: 120, max: 500000, unit: 'V' },
  corriente: { min: 0.1, max: 100000, unit: 'A' },
  current: { min: 0.1, max: 100000, unit: 'A' },
  fp: { min: 0.1, max: 1.0, unit: 'p.u.' },
  longitud: { min: 0.1, max: 10000, unit: 'm' },
  temperatura: { min: -40, max: 100, unit: '°C' }
}

/**
 * Audits a value for potential precision leaks or numerical instability
 * @param {any} value - The value to audit
 * @param {number} depth - Current recursion depth (to prevent stack overflow)
 * @param {string|null} key - The property key name
 * @returns {string[]} List of warnings
 */
const auditPrecision = (value, depth = 0, key = null) => {
  const warnings = []
  if (depth > 5) return warnings // Prevent stack overflow on circular references

  // Check for type mismatch if property has constraints
  if (key && BRIDGE_CONSTRAINTS[key.toLowerCase()]) {
    if (value === null || typeof value === 'undefined') {
      warnings.push(`Sync Error: Required property "${key}" is missing or null.`)
      return warnings
    }
    if (typeof value !== 'number') {
      warnings.push(`Sync Error: Property "${key}" expects a number but received type "${typeof value}".`)
    }
  }

  // Flag explicit error properties to elevate log level
  if (key && ['error', 'err', 'exception', 'failure', 'statuscode'].includes(key.toLowerCase())) {
    warnings.push(`Explicit Error Property Detected: ${key}=${value}`);
  }

  if (typeof value === 'number') {
    if (isNaN(value)) warnings.push('Numerical instability: NaN detected')
    if (!isFinite(value)) warnings.push('Numerical instability: Infinity detected')
    // Check for null/undefined if a number is expected, though typeof check below handles most cases
    if (Math.abs(value) > 0 && Math.abs(value) < 1e-12) warnings.push('Precision risk: Potential underflow (value near zero)')
    if (value > Number.MAX_SAFE_INTEGER) warnings.push('Precision risk: Exceeds MAX_SAFE_INTEGER')

    // Range validation based on property name
    if (key && BRIDGE_CONSTRAINTS[key.toLowerCase()]) {
      const limit = BRIDGE_CONSTRAINTS[key.toLowerCase()]
      if (value < limit.min || value > limit.max) {
        warnings.push(`Physical limit violation: ${key}=${value}${limit.unit} is outside standard range [${limit.min}, ${limit.max}]`)
      }
    }
  } else if (value && typeof value === 'object') {
    // Check for naming consistency in the object (e.g. tension vs voltage)
    const keys = Object.keys(value).map(k => k.toLowerCase())
    if (keys.includes('tension') && keys.includes('voltage')) {
      warnings.push('Consistency error: Message contains both "tension" and "voltage" properties.')
    }
    if (keys.includes('corriente') && keys.includes('current')) {
      warnings.push('Consistency error: Message contains both "corriente" and "current" properties.')
    }

    Object.entries(value).forEach(([k, v]) => {
      if (typeof v === 'number' || (v && typeof v === 'object')) {
        const vWarnings = auditPrecision(v, depth + 1, k)
        if (vWarnings.length > 0) warnings.push(...vWarnings)
      }
    })
  }
  // Return unique warnings
  return [...new Set(warnings)]
}

/**
 * Initialize debug system
 * @param {boolean} enabled - Enable debugging
 */
function init(enabled = false) {
  DEBUG_MODE = enabled
  clearLogs()
  logStep('DEBUG_INIT', { enabled: DEBUG_MODE }, 'info')

  // Initialize UI panel if in browser
  if (typeof window !== 'undefined' && typeof DebugPanel !== 'undefined') {
    DebugPanel.init(false)
  }

  // Setup global shortcuts
  if (typeof window !== 'undefined') {
    window.DebugSystem = DebugSystem
    window.showDebug = showDebug
    window.clearDebug = clearLogs
    window.exportDebug = exportDebug
  }
}

/**
 * Log a debug step
 * @param {string} step - Step name
 * @param {Object} data - Step data
 * @param {string} level - Log level (info, warn, error, debug)
 */
function logStep(step, data = {}, level = 'info') {
  if (!DEBUG_MODE) return

  // Audit precision before serialization
  const precisionWarnings = auditPrecision(data)
  const finalLevel = precisionWarnings.length > 0 && level === 'info' ? 'warn' : level

  // Protect against circular references during serialization
  let sanitizedData = {}
  try {
    // Handle BigInt and circular references
    const json = JSON.stringify(data, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
    sanitizedData = data ? JSON.parse(json) : {}
  } catch (e) {
    sanitizedData = { _error: 'Serialization failed', _message: e.message }
  }

  const entry = {
    time: new Date().toISOString(),
    step: step,
    level: finalLevel,
    data: sanitizedData,
    metadata: { precisionWarnings }
  }

  // Console output (only in debug mode)
  const prefix = `[${finalLevel.toUpperCase()}] ${step}`
  if (finalLevel === 'error') {
    // eslint-disable-next-line no-console
    console.error(prefix, entry)
  } else if (finalLevel === 'warn') {
    // eslint-disable-next-line no-console
    console.warn(prefix, entry)
  } else {
    // eslint-disable-next-line no-console
    console.log(prefix, entry)
  }

  // Store in memory
  DEBUG_LOGS.push(entry)

  // Limit logs
  if (DEBUG_LOGS.length > MAX_LOGS) {
    DEBUG_LOGS = DEBUG_LOGS.slice(-MAX_LOGS)
  }

  // If in an iframe and it's a warning or error, postMessage to parent
  if (typeof window !== 'undefined' && window.parent !== window && (finalLevel === 'warn' || finalLevel === 'error')) {
    try {
      window.parent.postMessage({
        type: 'DEBUG_WARNING', // New message type for parent to listen to
        payload: entry
      }, '*'); // Consider a more specific origin for security in production
    } catch (e) {
      console.error('Failed to post debug message to parent:', e);
    }
  }
  return entry
}

/**
 * Simulates a bridge communication failure for testing purposes
 * @param {string} reason - Error code or description
 */
function simulateBridgeFailure(reason = 'NETWORK_TIMEOUT') {
  return logStep('BRIDGE_FAILURE_SIM', { 
    error: reason, 
    message: 'Simulated communication failure between React and Iframe',
    timestamp: new Date().toISOString() 
  }, 'error');
}

/**
 * Get all debug logs
 * @returns {Array} Array of log entries
 */
function getLogs() {
  return [...DEBUG_LOGS]
}

/**
 * Clear all debug logs
 */
function clearLogs() {
  DEBUG_LOGS = []
  if (typeof window !== 'undefined') {
    window.__DEBUG_LOGS__ = DEBUG_LOGS
  }
}

/**
 * Export logs to JSON
 * @returns {string} JSON string of logs
 */
function exportDebug() {
  return JSON.stringify(DEBUG_LOGS, null, 2)
}

/**
 * Show debug panel (browser only)
 */
function showDebug() {
  if (typeof window !== 'undefined' && typeof DebugPanel !== 'undefined') {
    DebugPanel.toggle()
  }
}

/**
 * Trace function execution
 * @param {string} name - Function name
 * @param {Function} fn - Function to trace
 * @returns {Function} Wrapped function
 */
function traceStep(name, fn) {
  return function (...args) {
    logStep(name + ':START', { args: args }, 'info')
    const start = getNow()

    const handleSuccess = (result, isAsync = false) => {
      const duration = getNow() - start
      logStep(name + (isAsync ? ':END_ASYNC' : ':END'), { duration: duration.toFixed(2) + 'ms' }, 'info')
      return result
    }

    const handleError = (error, isAsync = false) => {
      const duration = getNow() - start
      logStep(
        name + (isAsync ? ':ERROR_ASYNC' : ':ERROR'),
        {
          duration: duration.toFixed(2) + 'ms',
          message: error.message,
          stack: error.stack,
        },
        'error'
      )
      throw error
    }

    try {
      const result = fn.apply(this, args)
      if (result && typeof result.then === 'function') {
        return result.then(res => handleSuccess(res, true)).catch(err => handleError(err, true))
      }
      return handleSuccess(result)
    } catch (error) {
      return handleError(error)
    }
  }
}

/**
 * Performance monitor
 */
const PerformanceMonitor = {
  timers: new Map(),

  start(name) {
    this.timers.set(name, getNow())
  },

  end(name) {
    const start = this.timers.get(name)
    if (start) {
      const duration = getNow() - start
      this.timers.delete(name)
      logStep('PERF', { name, duration: duration.toFixed(2) + 'ms' }, 'info')
      return duration
    }
    return 0
  },

  measure(name, fn) {
    this.start(name)
    try {
      const result = fn()
      if (result && typeof result.then === 'function') {
        return result.then(res => { this.end(name); return res })
                     .catch(err => { this.end(name); throw err })
      }
      this.end(name)
      return result
    } catch (error) {
      this.end(name)
      throw error
    }
  },
}

/**
 * Memory monitor
 */
const MemoryMonitor = {
  measure() {
    // Node.js environment
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const mem = process.memoryUsage()
      const memory = {
        rss: (mem.rss / 1024 / 1024).toFixed(2) + ' MB',
        heapUsed: (mem.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
        heapTotal: (mem.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
      }
      logStep('MEMORY_NODE', memory, 'info')
      return memory
    }
    // Browser environment (Chrome specific)
    if (typeof performance !== 'undefined' && performance.memory) {
      const memory = {
        used:
          (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
        total:
          (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
        limit:
          (performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + ' MB',
      }
      logStep('MEMORY', memory, 'info')
      return memory
    }
    return null
  },
}

/**
 * Debug system API
 */
const DebugSystem = {
  init,
  logStep,
  getLogs,
  clearLogs,
  exportDebug,
  simulateBridgeFailure,
  traceStep,
  PerformanceMonitor,
  MemoryMonitor,
  isEnabled: () => DEBUG_MODE,
  enable: () => {
    DEBUG_MODE = true
  },
  disable: () => {
    DEBUG_MODE = false
  },
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DebugSystem
}

// Global assignment for browser
if (typeof window !== 'undefined') {
  window.DebugSystem = DebugSystem
  window.__DEBUG_LOGS__ = DEBUG_LOGS
}
