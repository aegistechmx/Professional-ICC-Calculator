/**
 * shared/logging.js - Logging utilities
 * 
 * Responsibility: Common logging functions
 */

/**
 * Create logger with specified level
 * @param {string} level - Log level
 * @returns {Function} Logger function
 */
function createLogger(level = 'info') {
  return (message, ...args) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    switch (level) {
      case 'error':
        console.error(logMessage, ...args);
        break;
      case 'warn':
        console.warn(logMessage, ...args);
        break;
      case 'debug':
        console.debug(logMessage, ...args);
        break;
      default:
        console.log(logMessage, ...args);
    }
  };
}

/**
 * Log error message
 * @param {string} message - Error message
 * @param {...any} args - Additional arguments
 */
function logError(message, ...args) {
  const logger = createLogger('error');
  logger(message, ...args);
}

/**
 * Log info message
 * @param {string} message - Info message
 * @param {...any} args - Additional arguments
 */
function logInfo(message, ...args) {
  const logger = createLogger('info');
  logger(message, ...args);
}

/**
 * Log debug message
 * @param {string} message - Debug message
 * @param {...any} args - Additional arguments
 */
function logDebug(message, ...args) {
  const logger = createLogger('debug');
  logger(message, ...args);
}

module.exports = {
  createLogger,
  logError,
  logInfo,
  logDebug
};
