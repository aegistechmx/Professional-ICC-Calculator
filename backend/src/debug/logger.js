/**
 * debug/logger.js - Professional logging system
 *
 * Responsibility: Structured logging with multiple levels and output formats
 */

const fs = require('fs')
const _path = require('path')

// Log levels
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
}

// Log colors for console output
const colors = {
  DEBUG: '\x1b[36m', // cyan
  INFO: '\x1b[32m', // green
  WARN: '\x1b[33m', // yellow
  ERROR: '\x1b[31m', // red
  RESET: '\x1b[0m',
}

/**
 * Logger class
 */
class Logger {
  constructor(name = 'ICC', level = LogLevel.INFO) {
    this.name = name
    this.level = level
    this.logs = []
    this.maxLogs = 1000
  }

  /**
   * Format log message
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   * @returns {string} Formatted message
   */
  formatMessage(level, message, data = {}) {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level}] [${this.name}]`
    const dataStr =
      Object.keys(data).length > 0 ? ` ${JSON.stringify(data)}` : ''
    return `${prefix} ${message}${dataStr}`
  }

  /**
   * Log message
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  log(level, message, data = {}) {
    if (level < this.level) return

    const entry = {
      timestamp: new Date().toISOString(),
      level: Object.keys(LogLevel)[level],
      name: this.name,
      message,
      data: JSON.parse(JSON.stringify(data)),
    }

    // Console output
    const color = colors[Object.keys(LogLevel)[level]] || colors.RESET
    const reset = colors.RESET
    const formatted = this.formatMessage(
      Object.keys(LogLevel)[level],
      message,
      data
    )

    if (level === LogLevel.ERROR) {
      // eslint-disable-next-line no-console
      console.error(`${color}${formatted}${reset}`)
    } else if (level === LogLevel.WARN) {
      // eslint-disable-next-line no-console
      console.warn(`${color}${formatted}${reset}`)
    } else {
      // eslint-disable-next-line no-console
      console.log(`${color}${formatted}${reset}`)
    }

    // Store in memory
    this.logs.push(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }
  }

  /**
   * Debug level log
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  debug(message, data) {
    this.log(LogLevel.DEBUG, message, data)
  }

  /**
   * Info level log
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  info(message, data) {
    this.log(LogLevel.INFO, message, data)
  }

  /**
   * Warning level log
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  warn(message, data) {
    this.log(LogLevel.WARN, message, data)
  }

  /**
   * Error level log
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  error(message, data) {
    this.log(LogLevel.ERROR, message, data)
  }

  /**
   * Get all logs
   * @returns {Array} Array of log entries
   */
  getLogs() {
    return [...this.logs]
  }

  /**
   * Clear logs
   */
  clearLogs() {
    this.logs = []
  }

  /**
   * Export logs to file
   * @param {string} filePath - Output file path
   */
  exportToFile(filePath) {
    try {
      const logData = {
        exported: new Date().toISOString(),
        logger: this.name,
        level: Object.keys(LogLevel)[this.level],
        count: this.logs.length,
        logs: this.logs,
      }

      fs.writeFileSync(filePath, JSON.stringify(logData, null, 2))
      this.info(`Logs exported to ${filePath}`, { count: this.logs.length })
    } catch (error) {
      this.error('Failed to export logs', { error: error.message })
    }
  }

  /**
   * Set log level
   * @param {number} level - New log level
   */
  setLevel(level) {
    this.level = level
    this.info(`Log level set to ${Object.keys(LogLevel)[level]}`)
  }

  /**
   * Create child logger
   * @param {string} childName - Child logger name
   * @returns {Logger} Child logger instance
   */
  child(childName) {
    const fullName = `${this.name}:${childName}`
    return new Logger(fullName, this.level)
  }
}

// Default logger instance
const defaultLogger = new Logger('ICC')

// Convenience functions
const createLogger = (name, level) => new Logger(name, level)

const logError = (message, data) => defaultLogger.error(message, data)
const logInfo = (message, data) => defaultLogger.info(message, data)
const logWarn = (message, data) => defaultLogger.warn(message, data)
const logDebug = (message, data) => defaultLogger.debug(message, data)

// Export
module.exports = {
  Logger,
  LogLevel,
  createLogger,
  logError,
  logInfo,
  logWarn,
  logDebug,
  defaultLogger,
}
