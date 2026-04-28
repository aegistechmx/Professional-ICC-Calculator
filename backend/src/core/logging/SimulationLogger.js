/**
 * SimulationLogger.js - Advanced Simulation Event Logging
 * 
 * This module provides detailed logging for electrical system simulations
 * including thermal memory tracking, relay operations, and fault events.
 * - Explainable → Defendable → Usable
 * 
 * Architecture:
 * Simulation Events → Logger → Event Log → Replay/Reports
 * 
 * @class SimulationLogger
 */

const logger = require('../../utils/logger');

// Log levels
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  CRITICAL: 4
};

// Log level names
const LogLevelNames = {
  0: 'DEBUG',
  1: 'INFO',
  2: 'WARN',
  3: 'ERROR',
  4: 'CRITICAL'
};

// Log level colors for console
const LogLevelColors = {
  0: '\x1b[36m', // Cyan for DEBUG
  1: '\x1b[32m', // Green for INFO
  2: '\x1b[33m', // Yellow for WARN
  3: '\x1b[31m', // Red for ERROR
  4: '\x1b[35m'  // Magenta for CRITICAL
};

const ResetColor = '\x1b[0m';

class SimulationLogger {
  /**
   * Create a new simulation logger
   * @param {Object} options - Logger options
   */
  constructor(options = {}) {
    this.options = {
      maxEvents: options.maxEvents || 10000,
      enableConsole: options.enableConsole !== false,
      minLevel: options.minLevel !== undefined ? options.minLevel : LogLevel.INFO,
      ...options
    };
    
    this.events = [];
    this.startTime = null;
    this.currentSimTime = 0;
    this.sessionId = this.generateSessionId();
    
    // Event counters
    this.counters = {
      RELAY_TRIP: 0,
      BREAKER_OPEN: 0,
      BREAKER_CLOSE: 0,
      VOLTAGE_VIOLATION: 0,
      CURRENT_VIOLATION: 0,
      THERMAL_LIMIT: 0,
      FAULT_DETECTED: 0,
      SOLVER_ITERATION: 0,
      CONVERGENCE: 0,
      DIVERGENCE: 0
    };
  }

  /**
   * Generate unique session ID
   * @returns {string} Session ID
   */
  generateSessionId() {
    return `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start simulation session
   */
  startSession() {
    this.startTime = Date.now();
    this.currentSimTime = 0;
    this.logEvent({
      time: 0,
      type: 'SESSION_START',
      sessionId: this.sessionId,
      message: 'Simulation session started'
    });
  }

  /**
   * End simulation session
   */
  endSession() {
    const duration = Date.now() - this.startTime;
    this.logEvent({
      time: this.currentSimTime,
      type: 'SESSION_END',
      sessionId: this.sessionId,
      duration,
      totalEvents: this.events.length,
      message: 'Simulation session ended'
    });
  }

  /**
   * Log an event with structured level
   * @param {Object} event - Event object
   * @param {number} level - Log level (DEBUG, INFO, WARN, ERROR, CRITICAL)
   */
  logEvent(event, level = LogLevel.INFO) {
    // Check if event meets minimum log level
    if (level < this.options.minLevel) {
      return;
    }

    const logEntry = {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      simTime: this.currentSimTime,
      level: level,
      levelName: LogLevelNames[level],
      ...event
    };

    // Add to events array
    this.events.push(logEntry);

    // Limit events array size
    if (this.events.length > this.options.maxEvents) {
      this.events.shift();
    }

    // Update counter if event type exists
    if (event.type && this.counters[event.type] !== undefined) {
      this.counters[event.type]++;
    }

    // Console output if enabled
    if (this.options.enableConsole) {
      this.consoleLog(logEntry);
    }
  }

  /**
   * Log a DEBUG message
   * @param {Object} event - Event object
   */
  debug(event) {
    this.logEvent(event, LogLevel.DEBUG);
  }

  /**
   * Log an INFO message
   * @param {Object} event - Event object
   */
  info(event) {
    this.logEvent(event, LogLevel.INFO);
  }

  /**
   * Log a WARN message
   * @param {Object} event - Event object
   */
  warn(event) {
    this.logEvent(event, LogLevel.WARN);
  }

  /**
   * Log an ERROR message
   * @param {Object} event - Event object
   */
  error(event) {
    this.logEvent(event, LogLevel.ERROR);
  }

  /**
   * Log a CRITICAL message
   * @param {Object} event - Event object
   */
  critical(event) {
    this.logEvent(event, LogLevel.CRITICAL);
  }

  /**
   * Console log event
   * @param {Object} event - Event object
   */
  consoleLog(event) {
    const timeStr = event.simTime.toFixed(3).padStart(8, ' ');
    const typeStr = event.type.padEnd(20, ' ');
    const levelStr = event.levelName.padEnd(8, ' ');
    const color = LogLevelColors[event.level] || '';
    const reset = ResetColor;
    
    logger.debug(`${color}[${levelStr}]${reset} [${timeStr}s] ${typeStr} ${event.device || ''} ${event.reason || event.message || ''}`);
    
    if (event.thermalMemory !== undefined) {
      logger.debug(`${color}          └─ Thermal Memory: ${(event.thermalMemory * 100).toFixed(1)}%${reset}`);
    }
    
    if (event.details) {
      logger.debug(`${color}          └─ Details: ${JSON.stringify(event.details)}${reset}`);
    }
  }

  /**
   * Log relay trip
   * @param {Object} data - Trip data
   */
  logRelayTrip(data) {
    this.logEvent({
      time: data.time,
      type: 'RELAY_TRIP',
      device: data.device,
      reason: data.reason,
      thermalMemory: data.thermalMemory,
      current: data.current,
      pickup: data.pickup,
      tripTime: data.tripTime,
      details: {
        current_pu: data.current_pu,
        element: data.element,
        curve: data.curve
      }
    }, LogLevel.WARN);
  }

  /**
   * Log breaker operation
   * @param {Object} data - Breaker data
   */
  logBreakerOperation(data) {
    this.logEvent({
      time: data.time,
      type: data.open ? 'BREAKER_OPEN' : 'BREAKER_CLOSE',
      device: data.device,
      reason: data.reason,
      details: {
        line: data.line,
        from: data.from,
        to: data.to,
        preState: data.preState,
        postState: data.postState
      }
    }, LogLevel.INFO);
  }

  /**
   * Log voltage violation
   * @param {Object} data - Voltage violation data
   */
  logVoltageViolation(data) {
    this.logEvent({
      time: data.time,
      type: 'VOLTAGE_VIOLATION',
      device: data.busId,
      reason: data.reason,
      details: {
        voltage: data.voltage,
        voltage_pu: data.voltage_pu,
        limit: data.limit,
        severity: data.severity
      }
    }, LogLevel.WARN);
  }

  /**
   * Log current violation
   * @param {Object} data - Current violation data
   */
  logCurrentViolation(data) {
    this.logEvent({
      time: data.time,
      type: 'CURRENT_VIOLATION',
      device: data.lineId,
      reason: data.reason,
      thermalMemory: data.thermalMemory,
      details: {
        current: data.current,
        current_pu: data.current_pu,
        limit: data.limit,
        rating: data.rating
      }
    }, LogLevel.WARN);
  }

  /**
   * Log thermal limit exceeded
   * @param {Object} data - Thermal data
   */
  logThermalLimit(data) {
    this.logEvent({
      time: data.time,
      type: 'THERMAL_LIMIT',
      device: data.device,
      reason: data.reason,
      thermalMemory: data.thermalMemory,
      details: {
        accumulatedI2t: data.accumulatedI2t,
        limit: data.limit,
        utilization: data.utilization
      }
    }, LogLevel.WARN);
  }

  /**
   * Log fault detected
   * @param {Object} data - Fault data
   */
  logFaultDetected(data) {
    this.logEvent({
      time: data.time,
      type: 'FAULT_DETECTED',
      device: data.busId,
      reason: data.reason,
      details: {
        faultType: data.faultType,
        faultCurrent: data.faultCurrent,
        faultImpedance: data.faultImpedance
      }
    }, LogLevel.ERROR);
  }

  /**
   * Log solver iteration
   * @param {Object} data - Solver data
   */
  logSolverIteration(data) {
    this.logEvent({
      time: data.time,
      type: 'SOLVER_ITERATION',
      device: data.solver,
      reason: `Iteration ${data.iteration}, maxMismatch = ${data.maxMismatch.toExponential(4)}`,
      details: {
        iteration: data.iteration,
        maxMismatch: data.maxMismatch,
        solver: data.solver,
        damping: data.damping
      }
    }, LogLevel.DEBUG);
  }

  /**
   * Log convergence
   * @param {Object} data - Convergence data
   */
  logConvergence(data) {
    this.logEvent({
      time: data.time,
      type: 'CONVERGENCE',
      device: data.solver,
      reason: data.reason,
      details: {
        iterations: data.iterations,
        finalMismatch: data.finalMismatch,
        solver: data.solver
      }
    }, LogLevel.INFO);
  }

  /**
   * Log divergence
   * @param {Object} data - Divergence data
   */
  logDivergence(data) {
    this.logEvent({
      time: data.time,
      type: 'DIVERGENCE',
      device: data.solver,
      reason: data.reason,
      details: {
        iterations: data.iterations,
        finalMismatch: data.finalMismatch,
        fallback: data.fallback
      }
    }, LogLevel.ERROR);
  }

  /**
   * Get event log
   * @param {Object} filters - Optional filters
   * @returns {Array} Filtered events
   */
  getEventLog(filters = {}) {
    let events = [...this.events];
    
    if (filters.type) {
      events = events.filter(e => e.type === filters.type);
    }
    
    if (filters.device) {
      events = events.filter(e => e.device === filters.device);
    }
    
    if (filters.startTime !== undefined) {
      events = events.filter(e => e.simTime >= filters.startTime);
    }
    
    if (filters.endTime !== undefined) {
      events = events.filter(e => e.simTime <= filters.endTime);
    }
    
    return events;
  }

  /**
   * Get event timeline
   * @returns {Array} Timeline of events
   */
  getTimeline() {
    return this.events.map(e => ({
      time: e.simTime,
      type: e.type,
      device: e.device,
      description: e.reason || e.message
    }));
  }

  /**
   * Get summary
   * @returns {Object} Session summary
   */
  getSummary() {
    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      duration: Date.now() - this.startTime,
      totalEvents: this.events.length,
      counters: this.counters,
      timeline: this.getTimeline()
    };
  }

  /**
   * Export event log
   * @param {string} format - Export format ('json', 'csv')
   * @returns {string} Exported data
   */
  exportLog(format = 'json') {
    switch (format) {
    case 'json':
      return JSON.stringify(this.events, null, 2);
    case 'csv':
      return this.exportToCSV();
    default:
      return JSON.stringify(this.events, null, 2);
    }
  }

  /**
   * Export to CSV format
   * @returns {string} CSV string
   */
  exportToCSV() {
    const headers = ['id', 'simTime', 'type', 'device', 'reason', 'thermalMemory'];
    const rows = this.events.map(e => [
      e.id,
      e.simTime.toFixed(3),
      e.type,
      e.device || '',
      e.reason || e.message || '',
      e.thermalMemory !== undefined ? e.thermalMemory.toFixed(3) : ''
    ]);
    
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  /**
   * Clear event log
   */
  clear() {
    this.events = [];
    Object.keys(this.counters).forEach(key => {
      this.counters[key] = 0;
    });
  }

  /**
   * Reset logger
   */
  reset() {
    this.clear();
    this.startTime = null;
    this.currentSimTime = 0;
    this.sessionId = this.generateSessionId();
  }
}

// Global logger instance
let globalLogger = null;

/**
 * Get global logger instance
 * @returns {SimulationLogger} Global logger
 */
function getGlobalLogger() {
  if (!globalLogger) {
    globalLogger = new SimulationLogger();
  }
  return globalLogger;
}

/**
 * Set global logger instance
 * @param {SimulationLogger} logger - Logger instance
 */
function setGlobalLogger(logger) {
  globalLogger = logger;
}

/**
 * Convenience function to log event using global logger
 * @param {Object} eventData - Event data
 */
function logEvent(eventData) {
  const logger = getGlobalLogger();
  return logger.logEvent(eventData);
}

module.exports = {
  SimulationLogger,
  getGlobalLogger,
  setGlobalLogger,
  logEvent
};
