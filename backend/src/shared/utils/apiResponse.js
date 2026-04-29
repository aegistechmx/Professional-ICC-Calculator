/**
 * Standardized API response utilities
 * Provides consistent response format across all endpoints
 */

/**
 * Success response wrapper
 * @param {import('express').Response} res - Express response object
 * @param {*} data - Response data
 * @param {string} [message] - Optional success message
 * @param {number} [statusCode] - HTTP status code (default: 200)
 */
const success = (res, data = null, message = null, statusCode = 200) => {
  const response = {
    success: true,
    ...(data !== null && { data }),
    ...(message && { message }),
  }
  return res.status(statusCode).json(response)
}

/**
 * Error response wrapper
 * @param {import('express').Response} res - Express response object
 * @param {string} error - Error message
 * @param {string} [code] - Error code
 * @param {number} [statusCode] - HTTP status code (default: 400)
 * @param {*} [details] - Additional error details
 */
const error = (res, error, code = null, statusCode = 400, details = null) => {
  const response = {
    success: false,
    error,
    ...(code && { code }),
    ...(details && { details }),
  }
  return res.status(statusCode).json(response)
}

/**
 * Paginated response wrapper
 * @param {import('express').Response} res - Express response object
 * @param {Array} data - Array of data items
 * @param {Object} pagination - Pagination metadata
 * @param {string} [message] - Optional success message
 */
const paginated = (res, data, pagination, message = null) => {
  const response = {
    success: true,
    data,
    pagination: {
      page: pagination.page || 1,
      limit: pagination.limit || 10,
      total: pagination.total || data.length,
      totalPages: Math.ceil(
        (pagination.total || data.length) / (pagination.limit || 10)
      ),
    },
    ...(message && { message }),
  }
  return res.status(200).json(response)
}

/**
 * Created response (201)
 * @param {import('express').Response} res - Express response object
 * @param {*} data - Created resource data
 * @param {string} [message] - Optional success message
 */
const created = (res, data, message = 'Resource created successfully') => {
  return success(res, data, message, 201)
}

/**
 * No content response (204)
 * @param {import('express').Response} res - Express response object
 */
const noContent = res => {
  return res.status(204).send()
}

/**
 * Bad request response (400)
 * @param {import('express').Response} res - Express response object
 * @param {string} error - Error message
 * @param {*} [details] - Additional error details
 */
const badRequest = (res, error, details = null) => {
  return error(res, error, 'BAD_REQUEST', 400, details)
}

/**
 * Unauthorized response (401)
 * @param {import('express').Response} res - Express response object
 * @param {string} [error] - Error message
 */
const unauthorized = (res, error = 'Unauthorized') => {
  return error(res, error, 'UNAUTHORIZED', 401)
}

/**
 * Forbidden response (403)
 * @param {import('express').Response} res - Express response object
 * @param {string} [error] - Error message
 */
const forbidden = (res, error = 'Forbidden') => {
  return error(res, error, 'FORBIDDEN', 403)
}

/**
 * Not found response (404)
 * @param {import('express').Response} res - Express response object
 * @param {string} [error] - Error message
 */
const notFound = (res, error = 'Resource not found') => {
  return error(res, error, 'NOT_FOUND', 404)
}

/**
 * Conflict response (409)
 * @param {import('express').Response} res - Express response object
 * @param {string} error - Error message
 * @param {*} [details] - Additional error details
 */
const conflict = (res, error, details = null) => {
  return error(res, error, 'CONFLICT', 409, details)
}

/**
 * Internal server error response (500)
 * @param {import('express').Response} res - Express response object
 * @param {string} [error] - Error message
 */
const internalError = (res, error = 'Internal server error') => {
  return error(res, error, 'INTERNAL_ERROR', 500)
}

module.exports = {
  success,
  error,
  paginated,
  created,
  noContent,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  internalError,
}
