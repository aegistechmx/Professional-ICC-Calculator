/**
 * Global error handling middleware
 * Catches all errors and returns consistent error responses
 */

/**
 * @typedef {Object} ErrorResponse
 * @property {boolean} success - Always false for errors
 * @property {string} error - Error message
 * @property {string} [code] - Error code for client handling
 * @property {Object} [details] - Additional error details
 */

const logger = require('@/infrastructure/logger/logger')

/**
 * Error handler middleware
 * @param {Error} err - Error object
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Express next function
 */
const errorHandler = (err, req, res, _next) => {
  // Safe error logging to avoid circular reference issues
  try {
    logger.error('Error:', err.message || err)
    if (process.env.NODE_ENV === 'development' && err.stack) {
      logger.error('Stack:', err.stack)
    }
  } catch (logError) {
    // If logging fails, continue without crashing
    logger.error('Error logging failed')
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: err.errors,
    })
  }

  // Handle Prisma errors
  if (err.code && err.code.startsWith('P')) {
    return res.status(400).json({
      success: false,
      error: 'Database error',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    })
  }

  // Default error response
  const statusCode = err.statusCode || 500
  const message =
    process.env.NODE_ENV === 'development'
      ? err.message || 'Internal server error'
      : 'Internal server error'

  res.status(statusCode).json({
    success: false,
    error: message,
    code: 'INTERNAL_ERROR',
  })
}

/**
 * Async route wrapper to catch errors in async functions
 * @param {Function} fn - Async route handler
 * @returns {Function} Express middleware function
 */
const asyncHandler = fn => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * 404 Not Found handler
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
    code: 'NOT_FOUND',
  })
}

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
}
