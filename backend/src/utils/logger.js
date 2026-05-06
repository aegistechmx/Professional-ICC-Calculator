/**
 * utils/logger.js - Logger Profesional Simple
 * Logging simple y efectivo para producción
 */

const isProd = process.env.NODE_ENV === 'production';

/**
 * Log debug (solo desarrollo)
 */
function log(...args) {
  if (!isProd) {
    // eslint-disable-next-line no-console
    console.log('[DEBUG]', ...args);
  }
}

/**
 * Log error (siempre)
 */
function error(...args) {
  // eslint-disable-next-line no-console
  console.error('[ERROR]', ...args);
}

/**
 * Log info (siempre)
 */
function info(...args) {
  // eslint-disable-next-line no-console
  console.log('[INFO]', ...args);
}

/**
 * Log warning (siempre)
 */
function warn(...args) {
  // eslint-disable-next-line no-console
  console.warn('[WARN]', ...args);
}

module.exports = {
  log,
  error,
  info,
  warn
};
