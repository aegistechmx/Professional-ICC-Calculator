/**
 * shared/helpers.js - General helper functions
 * 
 * Responsibility: Common utility functions
 */

/**
 * Deep clone object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const cloned = {};
    Object.keys(obj).forEach(key => {
      cloned[key] = deepClone(obj[key]);
    });
    return cloned;
  }
}

/**
 * Validate input parameters
 * @param {Object} params - Parameters to validate
 * @param {Object} schema - Validation schema
 * @returns {Object} Validation result
 */
function validateInputs(params, schema) {
  const errors = [];
  
  Object.keys(schema).forEach(key => {
    const rules = schema[key];
    const value = params[key];
    
    if (rules.required && (value === undefined || value === null)) {
      errors.push(`Missing required parameter: ${key}`);
    }
    
    if (rules.type && value !== undefined && typeof value !== rules.type) {
      errors.push(`Invalid type for ${key}: expected ${rules.type}, got ${typeof value}`);
    }
    
    if (rules.min !== undefined && value < rules.min) {
      errors.push(`Value for ${key} must be >= ${rules.min}`);
    }
    
    if (rules.max !== undefined && value > rules.max) {
      errors.push(`Value for ${key} must be <= ${rules.max}`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Handle errors consistently
 * @param {Error} error - Error to handle
 * @param {string} context - Context where error occurred
 * @returns {Object} Error response
 */
function handleErrors(error, context = 'Unknown') {
  return {
    success: false,
    error: error.message,
    context,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  };
}

/**
 * Create safe object with default values
 * @param {Object} defaults - Default values
 * @param {Object} overrides - Override values
 * @returns {Object} Merged object
 */
function createSafeObject(defaults, overrides = {}) {
  return deepClone({ ...defaults, ...overrides });
}

/**
 * Check if value is numeric
 * @param {*} value - Value to check
 * @returns {boolean} True if numeric
 */
function isNumeric(value) {
  return !isNaN(parseFloat(value)) && isFinite(value);
}

/**
 * Generate unique ID
 * @param {string} prefix - ID prefix
 * @returns {string} Unique ID
 */
function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = {
  deepClone,
  validateInputs,
  handleErrors,
  createSafeObject,
  isNumeric,
  generateId
};
