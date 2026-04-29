/**
 * debug/tracer.js - Professional function tracing system
 *
 * Responsibility: Function execution tracing with performance monitoring
 */

const { logDebug, logError, logInfo } = require('./logger')

/**
 * Trace function execution
 * @param {string} name - Function name for tracing
 * @param {Function} fn - Function to trace
 * @returns {Function} Wrapped function with tracing
 */
function traceStep(name, fn) {
  return function (...args) {
    const startTime = performance.now()

    logDebug(`${name}:START`, {
      args: args.length > 0 ? args : undefined,
      type: typeof fn,
    })

    try {
      const result = fn.apply(this, args)
      const duration = performance.now() - startTime

      logInfo(`${name}:END`, {
        duration: `${duration.toFixed(2)}ms`,
        success: true,
      })

      return result
    } catch (error) {
      const duration = performance.now() - startTime

      logError(`${name}:ERROR`, {
        duration: `${duration.toFixed(2)}ms`,
        message: error.message,
        stack: error.stack,
      })

      throw error
    }
  }
}

/**
 * Async function tracer
 * @param {string} name - Function name for tracing
 * @param {Function} fn - Async function to trace
 * @returns {Function} Wrapped async function with tracing
 */
function traceAsync(name, fn) {
  return async function (...args) {
    const startTime = performance.now()

    logDebug(`${name}:START`, {
      args: args.length > 0 ? args : undefined,
      type: 'async',
    })

    try {
      const result = await fn.apply(this, args)
      const duration = performance.now() - startTime

      logInfo(`${name}:END`, {
        duration: `${duration.toFixed(2)}ms`,
        success: true,
        async: true,
      })

      return result
    } catch (error) {
      const duration = performance.now() - startTime

      logError(`${name}:ERROR`, {
        duration: `${duration.toFixed(2)}ms`,
        message: error.message,
        stack: error.stack,
        async: true,
      })

      throw error
    }
  }
}

/**
 * Class method tracer
 * @param {string} className - Class name
 * @param {string} methodName - Method name
 * @param {Function} method - Method to trace
 * @returns {Function} Wrapped method with tracing
 */
function traceMethod(className, methodName, method) {
  const fullName = `${className}.${methodName}`
  return traceStep(fullName, method)
}

/**
 * Performance profiler
 */
class Profiler {
  constructor() {
    this.profiles = new Map()
  }

  /**
   * Start profiling a function
   * @param {string} name - Profile name
   */
  start(name) {
    this.profiles.set(name, {
      start: performance.now(),
      calls: 0,
      totalTime: 0,
      errors: 0,
    })
  }

  /**
   * End profiling a function
   * @param {string} name - Profile name
   * @param {boolean} success - Whether function succeeded
   * @returns {number} Duration in milliseconds
   */
  end(name, success = true) {
    const profile = this.profiles.get(name)
    if (!profile) return 0

    const duration = performance.now() - profile.start
    profile.calls++
    profile.totalTime += duration
    if (!success) profile.errors++

    return duration
  }

  /**
   * Get profile statistics
   * @param {string} name - Profile name
   * @returns {Object} Profile statistics
   */
  getProfile(name) {
    const profile = this.profiles.get(name)
    if (!profile) return null

    return {
      name,
      calls: profile.calls,
      totalTime: profile.totalTime,
      averageTime: profile.totalTime / profile.calls,
      errors: profile.errors,
      errorRate: profile.errors / profile.calls,
    }
  }

  /**
   * Get all profiles
   * @returns {Array} Array of profile statistics
   */
  getAllProfiles() {
    return Array.from(this.profiles.keys()).map(name => this.getProfile(name))
  }

  /**
   * Clear all profiles
   */
  clear() {
    this.profiles.clear()
  }

  /**
   * Create a traced function with profiling
   * @param {string} name - Function name
   * @param {Function} fn - Function to profile
   * @returns {Function} Profiled function
   */
  profile(name, fn) {
    return function (...args) {
      this.start(name)
      try {
        const result = fn.apply(this, args)
        this.end(name, true)
        return result
      } catch (error) {
        this.end(name, false)
        throw error
      }
    }.bind(this)
  }
}

/**
 * Global profiler instance
 */
const globalProfiler = new Profiler()

/**
 * Convenience functions
 */
const trace = traceStep
const traceAsyncFunction = traceAsync

/**
 * Export
 */
module.exports = {
  traceStep,
  traceAsync,
  traceMethod,
  Profiler,
  globalProfiler,
  trace,
  traceAsyncFunction,
}
