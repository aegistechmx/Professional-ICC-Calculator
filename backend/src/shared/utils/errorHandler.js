/**
 * Utilidad estándar para manejo de errores
 * Centraliza el manejo de errores y logging
 */

/* eslint-disable no-console */
class ErrorHandler {
  static logError(context, error, additionalInfo = {}) {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      context,
      message: error.message || 'Unknown error',
      stack: error.stack,
      additionalInfo
    };

    // En producción, esto iría a un sistema de logging
    console.error(`[${context}] Error:`, errorInfo);

    return errorInfo;
  }

  static createError(message, context, code = null) {
    const error = new Error(message);
    error.context = context;
    error.code = code;
    error.timestamp = new Date().toISOString();
    return error;
  }

  static handleValidationError(field, value, expectedType) {
    const message = `Validation failed: ${field} expected ${expectedType}, got ${typeof value}`;
    return this.createError(message, 'validation', 'VALIDATION_ERROR');
  }

  static handleNullError(field, context) {
    const message = `Null/undefined error: ${field} is null or undefined in ${context}`;
    return this.createError(message, context, 'NULL_ERROR');
  }
}

module.exports = ErrorHandler;
