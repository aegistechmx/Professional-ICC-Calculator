/**
 * debug/simulation.js - Professional simulation debugging system
 *
 * Responsibility: Specialized debugging for power system simulations
 */

const { _logInfo, _logWarn, _logError, _logDebug } = require('./logger')

/**
 * Simulation event levels
 */
const SimulationLogLevel = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARNING: 3,
  ERROR: 4,
  CRITICAL: 5,
}

/**
 * Simulation Logger class
 */
class SimulationLogger {
  constructor(sessionId = null) {
    this.sessionId = sessionId || this.generateSessionId()
    this.events = []
    this.startTime = null
    this.minLogLevel = SimulationLogLevel.INFO
  }

  /**
   * Generate unique session ID
   * @returns {string} Session ID
   */
  generateSessionId() {
    return `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Start simulation session
   * @param {Object} config - Simulation configuration
   */
  startSession(config) {
    this.startTime = new Date()
    this.events = []

    this.logEvent(
      'SESSION_START',
      {
        sessionId: this.sessionId,
        timestamp: this.startTime.toISOString(),
        config: config,
      },
      SimulationLogLevel.INFO
    )
  }

  /**
   * End simulation session
   * @param {Object} results - Simulation results
   */
  endSession(results) {
    const endTime = new Date()
    const duration = endTime - this.startTime

    this.logEvent(
      'SESSION_END',
      {
        sessionId: this.sessionId,
        timestamp: endTime.toISOString(),
        duration: `${duration}ms`,
        results: results,
      },
      SimulationLogLevel.INFO
    )
  }

  /**
   * Log simulation event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   * @param {number} level - Log level
   */
  logEvent(event, data = {}, level = SimulationLogLevel.INFO) {
    if (level < this.minLogLevel) return

    const logEntry = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      event: event,
      level: SimulationLogLevel[level] || 'INFO',
      data: JSON.parse(JSON.stringify(data)),
    }

    this.events.push(logEntry)
    this.consoleLog(logEntry)
  }

  /**
   * Console output with formatting
   * @param {Object} logEntry - Log entry
   */
  consoleLog(logEntry) {
    const colors = {
      TRACE: '\x1b[90m', // Gray
      DEBUG: '\x1b[36m', // Cyan
      INFO: '\x1b[32m', // Green
      WARNING: '\x1b[33m', // Yellow
      ERROR: '\x1b[31m', // Red
      CRITICAL: '\x1b[35m', // Magenta
    }

    const reset = '\x1b[0m'
    const color = colors[logEntry.level] || ''

    const message = `[SIM] ${logEntry.timestamp} [${logEntry.level}] ${logEntry.event}`
    const dataStr =
      Object.keys(logEntry.data).length > 0
        ? `\n${JSON.stringify(logEntry.data, null, 2)}`
        : ''

    // eslint-disable-next-line no-console
    console.log(`${color}${message}${reset}${dataStr}`)
  }

  /**
   * Log power flow iteration
   * @param {number} iteration - Iteration number
   * @param {Object} state - Power flow state
   * @param {Object} metrics - Convergence metrics
   */
  logPowerFlowIteration(iteration, state, metrics) {
    this.logEvent(
      'POWERFLOW_ITERATION',
      {
        iteration,
        maxMismatch: metrics.maxMismatch,
        converged: metrics.converged,
        busCount: state.buses?.length || 0,
        branchCount: state.branches?.length || 0,
      },
      SimulationLogLevel.DEBUG
    )
  }

  /**
   * Log relay trip event
   * @param {Object} relay - Relay information
   * @param {Object} fault - Fault information
   * @param {number} time - Trip time
   */
  logRelayTrip(relay, fault, time) {
    this.logEvent(
      'RELAY_TRIP',
      {
        relayId: relay.id,
        relayType: relay.type,
        faultType: fault.type,
        faultLocation: fault.location,
        tripTime: `${time}ms`,
        timestamp: new Date().toISOString(),
      },
      SimulationLogLevel.WARNING
    )
  }

  /**
   * Log breaker operation
   * @param {Object} breaker - Breaker information
   * @param {string} operation - Operation type
   * @param {number} time - Operation time
   */
  logBreakerOperation(breaker, operation, time) {
    this.logEvent(
      'BREAKER_OPERATION',
      {
        breakerId: breaker.id,
        operation: operation,
        time: `${time}ms`,
        status: breaker.status,
      },
      SimulationLogLevel.INFO
    )
  }

  /**
   * Log fault detection
   * @param {Object} fault - Fault information
   * @param {Object} detection - Detection details
   */
  logFaultDetected(fault, detection) {
    this.logEvent(
      'FAULT_DETECTED',
      {
        faultType: fault.type,
        faultLocation: fault.location,
        faultMagnitude: fault.magnitude,
        detectionTime: detection.time,
        detectedBy: detection.detector,
        confidence: detection.confidence,
      },
      SimulationLogLevel.WARNING
    )
  }

  /**
   * Log convergence analysis
   * @param {Object} analysis - Convergence analysis
   */
  logConvergenceAnalysis(analysis) {
    this.logEvent(
      'CONVERGENCE_ANALYSIS',
      {
        algorithm: analysis.algorithm,
        iterations: analysis.iterations,
        finalMismatch: analysis.finalMismatch,
        convergenceRate: analysis.convergenceRate,
        converged: analysis.converged,
        warnings: analysis.warnings || [],
      },
      SimulationLogLevel.INFO
    )
  }

  /**
   * Log performance metrics
   * @param {Object} metrics - Performance metrics
   */
  logPerformanceMetrics(metrics) {
    this.logEvent(
      'PERFORMANCE_METRICS',
      {
        cpuTime: metrics.cpuTime,
        memoryUsage: metrics.memoryUsage,
        solverTime: metrics.solverTime,
        totalNodes: metrics.totalNodes,
        totalBranches: metrics.totalBranches,
        throughput: metrics.throughput,
      },
      SimulationLogLevel.DEBUG
    )
  }

  /**
   * Get events by type
   * @param {string} eventType - Event type to filter
   * @returns {Array} Filtered events
   */
  getEventsByType(eventType) {
    return this.events.filter(event => event.event === eventType)
  }

  /**
   * Get events by level
   * @param {number} minLevel - Minimum log level
   * @returns {Array} Filtered events
   */
  getEventsByLevel(minLevel) {
    return this.events.filter(
      event =>
        Object.values(SimulationLogLevel).indexOf(event.level) >= minLevel
    )
  }

  /**
   * Export session data
   * @returns {Object} Session data
   */
  exportSession() {
    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      endTime: new Date(),
      eventCount: this.events.length,
      events: this.events,
    }
  }

  /**
   * Set minimum log level
   * @param {number} level - Minimum log level
   */
  setLogLevel(level) {
    this.minLogLevel = level
  }
}

/**
 * Power Flow specific debugger
 */
class PowerFlowDebugger extends SimulationLogger {
  constructor(sessionId) {
    super(sessionId)
    this.iterations = []
    this.convergenceHistory = []
  }

  /**
   * Log Newton-Raphson step
   * @param {number} iteration - Iteration number
   * @param {Object} jacobian - Jacobian matrix info
   * @param {Object} mismatch - Mismatch vector
   * @param {Object} solution - Solution vector
   */
  logNewtonStep(iteration, jacobian, mismatch, solution) {
    const step = {
      iteration,
      jacobianCondition: jacobian.condition,
      maxMismatch: Math.max(...mismatch.map(m => Math.abs(m))),
      maxVoltageChange: Math.max(...solution.map(s => Math.abs(s))),
      converged: Math.max(...mismatch.map(m => Math.abs(m))) < 1e-6,
    }

    this.iterations.push(step)
    this.convergenceHistory.push(step.maxMismatch)

    this.logEvent('NEWTON_STEP', step, SimulationLogLevel.DEBUG)
  }

  /**
   * Log voltage profile
   * @param {Array} voltages - Voltage magnitudes and angles
   * @param {number} iteration - Current iteration
   */
  logVoltageProfile(voltages, iteration) {
    const profile = voltages.map((v, i) => ({ // voltage (V)
      bus: i + 1,
      magnitude: v.magnitude,
      angle: v.angle,
      deviation: v.deviation || 0,
    }))

    this.logEvent(
      'VOLTAGE_PROFILE',
      {
        iteration,
        profile,
      },
      SimulationLogLevel.DEBUG
    )
  }

  /**
   * Get convergence statistics
   * @returns {Object} Convergence statistics
   */
  getConvergenceStats() {
    if (this.iterations.length === 0) return null

    const mismatches = this.iterations.map(i => i.maxMismatch)

    return {
      totalIterations: this.iterations.length,
      finalMismatch: mismatches[mismatches.length - 1],
      convergenceRate: mismatches.map((m, i) =>
        i > 0 ? mismatches[i - 1] / m : 0
      ),
      averageReduction:
        mismatches.reduce((sum, m) => sum + m, 0) / mismatches.length,
    }
  }
}

/**
 * Export simulation debugging utilities
 */
module.exports = {
  SimulationLogger,
  PowerFlowDebugger,
  SimulationLogLevel,
}
