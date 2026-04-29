/**
 * logger.js - Centralized logging utility
 * Provides structured logging with different levels
 */

const isDevelopment = process.env.NODE_ENV === 'development'

const logger = {
  info: (message, ...args) => {
    if (isDevelopment) {
      // eslint-disable-next-line no-console
      console.log(`[INFO] ${message}`, ...args)
    }
  },
  warn: (message, ...args) => {
    if (isDevelopment) {
      // eslint-disable-next-line no-console
      console.warn(`[WARN] ${message}`, ...args)
    }
  },
  error: (message, ...args) => {
    // Always log errors regardless of environment
    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${message}`, ...args)
  },
  debug: (message, ...args) => {
    if (isDevelopment) {
      // eslint-disable-next-line no-console
      console.log(`[DEBUG] ${message}`, ...args)
    }
  },
}

module.exports = logger
