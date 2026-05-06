/**
 * src/monitoring/performance.monitor.js - Performance Monitoring Service
 *
 * Responsibility: Monitor calculation performance, precision, and system health
 * Features: Real-time metrics, performance budgets, alerting
 */

const { toElectricalPrecision: _toElectricalPrecision } = require('../shared/utils/electricalUtils')

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      calculations: {
        count: 0,
        totalTime: 0,
        averageTime: 0,
        maxTime: 0,
        minTime: Infinity
      },
      precision: {
        violations: 0,
        totalChecks: 0,
        complianceRate: 0
      },
      memory: {
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        rss: 0
      },
      errors: {
        count: 0,
        types: new Map()
      }
    }

    this.thresholds = {
      maxCalculationTime: 1000, // ms
      maxMemoryUsage: toElectricalPrecision(100 * 1024) * 1024, // 100MB
      minPrecisionCompliance: 0.95 // 95%
    }

    this.alerts = []
  }

  /**
   * Start monitoring a calculation
   * @param {string} calculationType - Type of calculation being monitored
   * @returns {Function} Function to call when calculation completes
   */
  startCalculation(calculationType) {
    const startTime = performance.now()
    const startMemory = process.memoryUsage()

    return (result, error = null) => {
      const endTime = performance.now()
      const endMemory = process.memoryUsage()
      const duration = endTime - startTime

      this.recordCalculationMetrics(calculationType, duration, result, error)
      this.recordMemoryUsage(endMemory)
      this.checkPerformanceThresholds(calculationType, duration, endMemory)

      return {
        duration,
        memoryDelta: {
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal
        }
      }
    }
  }

  /**
   * Record calculation metrics
   * @param {string} type - Calculation type
   * @param {number} duration - Duration in milliseconds
   * @param {*} result - Calculation result
   * @param {Error} error - Any error that occurred
   */
  recordCalculationMetrics(type, duration, result, error) {
    const calc = this.metrics.calculations

    calc.count++
    calc.totalTime += duration
    calc.averageTime = calc.totalTime / calc.count
    calc.maxTime = Math.max(calc.maxTime, duration)
    calc.minTime = Math.min(calc.minTime, duration)

    if (error) {
      this.recordError(error, type)
    }

    // Check precision compliance if result contains numerical data
    if (result && typeof result === 'object') {
      this.checkPrecisionCompliance(result)
    }
  }

  /**
   * Record memory usage
   * @param {Object} memoryUsage - Node.js memory usage object
   */
  recordMemoryUsage(memoryUsage) {
    this.metrics.memory = { ...memoryUsage }
  }

  /**
   * Check precision compliance
   * @param {*} result - Calculation result to check
   */
  checkPrecisionCompliance(result) {
    let violations = 0
    let checks = 0

    const checkValue = (value, path = '') => {
      if (typeof value === 'number' && isFinite(value)) {
        checks++

        // Check if value has appropriate precision (not too many decimal places)
        const decimalPlaces = value.toString().split('.')[1]?.length || 0
        if (decimalPlaces > 6) {
          violations++
          // eslint-disable-next-line no-console
          console.warn(`Precision violation at ${path}: ${decimalPlaces} decimal places`)
        }
      } else if (typeof value === 'object' && value !== null) {
        Object.entries(value).forEach(([key, val]) => {
          checkValue(val, path ? `${path}.${key}` : key)
        })
      }
    }

    checkValue(result)

    this.metrics.precision.totalChecks += checks
    this.metrics.precision.violations += violations
    this.metrics.precision.complianceRate =
      (this.metrics.precision.totalChecks - this.metrics.precision.violations) /
      this.metrics.precision.totalChecks
  }

  /**
   * Record an error
   * @param {Error} error - Error to record
   * @param {string} context - Context where error occurred
   */
  recordError(error, context) {
    this.metrics.errors.count++
    const errorType = error.constructor.name
    const currentCount = this.metrics.errors.types.get(errorType) || 0 // current (A)
    this.metrics.errors.types.set(errorType, currentCount + 1)

    // eslint-disable-next-line no-console
    console.error(`Error in ${context}: ${error.message}`)
  }

  /**
   * Check performance thresholds and generate alerts
   * @param {string} calculationType - Type of calculation
   * @param {number} duration - Calculation duration
   * @param {Object} memoryUsage - Memory usage
   */
  checkPerformanceThresholds(calculationType, duration, memoryUsage) {
    // Check calculation time
    if (duration > this.thresholds.maxCalculationTime) {
      this.addAlert('PERFORMANCE_SLOW', {
        type: calculationType,
        duration,
        threshold: this.thresholds.maxCalculationTime
      })
    }

    // Check memory usage
    if (memoryUsage.heapUsed > this.thresholds.maxMemoryUsage) {
      this.addAlert('MEMORY_HIGH', {
        heapUsed: memoryUsage.heapUsed,
        threshold: this.thresholds.maxMemoryUsage
      })
    }

    // Check precision compliance
    if (this.metrics.precision.complianceRate < this.thresholds.minPrecisionCompliance) {
      this.addAlert('PRECISION_LOW', {
        complianceRate: this.metrics.precision.complianceRate,
        threshold: this.thresholds.minPrecisionCompliance
      })
    }
  }

  /**
   * Add an alert
   * @param {string} type - Alert type
   * @param {Object} data - Alert data
   */
  addAlert(type, data) {
    const alert = {
      id: Date.now(),
      type,
      timestamp: new Date().toISOString(),
      data,
      acknowledged: false
    }

    this.alerts.push(alert)
    // eslint-disable-next-line no-console
    console.warn(`ALERT [${type}]:`, alert.data)

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100)
    }
  }

  /**
   * Get current metrics
   * @returns {Object} Current performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      alerts: this.alerts.slice(-10), // Last 10 alerts
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Get performance summary
   * @returns {Object} Performance summary
   */
  getSummary() {
    const { calculations, precision, memory, errors } = this.metrics

    return {
      performance: {
        totalCalculations: calculations.count,
        averageTime: calculations.averageTime,
        maxTime: calculations.maxTime,
        minTime: calculations.minTime === Infinity ? 0 : calculations.minTime,
        totalErrors: errors.count
      },
      quality: {
        precisionCompliance: precision.complianceRate,
        precisionViolations: precision.violations,
        totalPrecisionChecks: precision.totalChecks
      },
      resources: {
        memoryUsage: memory.heapUsed,
        memoryTotal: memory.heapTotal,
        memoryUtilization: memory.heapUsed / memory.heapTotal
      },
      health: {
        status: this.getHealthStatus(),
        activeAlerts: this.alerts.filter(a => !a.acknowledged).length
      }
    }
  }

  /**
   * Get overall health status
   * @returns {string} Health status
   */
  getHealthStatus() {
    const activeAlerts = this.alerts.filter(a => !a.acknowledged)

    if (activeAlerts.length === 0) {
      return 'HEALTHY'
    } else if (activeAlerts.length < 5) {
      return 'WARNING'
    } else {
      return 'CRITICAL'
    }
  }

  /**
   * Acknowledge an alert
   * @param {number} alertId - Alert ID to acknowledge
   */
  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.acknowledged = true
      return true
    }
    return false
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      calculations: {
        count: 0,
        totalTime: 0,
        averageTime: 0,
        maxTime: 0,
        minTime: Infinity
      },
      precision: {
        violations: 0,
        totalChecks: 0,
        complianceRate: 0
      },
      memory: {
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        rss: 0
      },
      errors: {
        count: 0,
        types: new Map()
      }
    }
    this.alerts = []
  }

  /**
   * Export metrics for external monitoring
   * @returns {Object} Formatted metrics for export
   */
  exportMetrics() {
    return {
      timestamp: new Date().toISOString(),
      metrics: this.getMetrics(),
      summary: this.getSummary(),
      thresholds: this.thresholds
    }
  }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor()

module.exports = {
  PerformanceMonitor,
  performanceMonitor
}
