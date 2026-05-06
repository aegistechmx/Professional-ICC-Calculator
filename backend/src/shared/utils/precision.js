/**
 * Centralized precision handling for electrical calculations
 * Ensures consistent IEEE 1584 and IEC 60909 standards compliance
 */

/**
 * Standard precision levels for different calculation types
 */
const PRECISION_LEVELS = {
  INTERNAL: 6,      // Internal calculations (IEEE 1584 requirement)
  DISPLAY: 2,       // Display output for users
  CRITICAL: 8,      // Critical safety calculations
  COORDINATION: 4,   // Protection coordination
  VOLTAGE: 3,       // Voltage levels
  CURRENT: 2,        // Current values
  POWER: 2,          // Power calculations
  IMPEDANCE: 6       // Impedance values
};

/**
 * Convert to electrical precision with specified decimal places
 * @param {number} value - Input value
 * @param {number} precision - Decimal places (default 6 for internal)
 * @returns {number} Value with electrical precision
 */
function toElectricalPrecision(value, precision = PRECISION_LEVELS.INTERNAL) {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return value;
  }
  return Number(value.toFixed(precision));
}

/**
 * Convert to display precision for user interface
 * @param {number} value - Input value
 * @param {string} type - Calculation type for precision selection
 * @returns {number} Value with display precision
 */
function toDisplayPrecision(value, type = 'default') {
  const precision = getPrecisionForType(type, 'display');
  return toElectricalPrecision(value, precision);
}

/**
 * Get appropriate precision for calculation type
 * @param {string} type - Calculation type
 * @param {string} context - 'internal' or 'display'
 * @returns {number} Precision level
 */
function getPrecisionForType(type, context = 'internal') {
  const contextKey = context === 'display' ? 'DISPLAY' : 'INTERNAL';
  
  switch (type.toLowerCase()) {
    case 'voltage':
    case 'voltaje':
      return context === 'display' ? PRECISION_LEVELS.VOLTAGE : PRECISION_LEVELS.INTERNAL;
    
    case 'current':
    case 'corriente':
    case 'isc':
    case 'icc':
      return context === 'display' ? PRECISION_LEVELS.CURRENT : PRECISION_LEVELS.INTERNAL;
    
    case 'power':
    case 'potencia':
    case 'mw':
    case 'mvar':
    case 'mva':
      return context === 'display' ? PRECISION_LEVELS.POWER : PRECISION_LEVELS.INTERNAL;
    
    case 'impedance':
    case 'impedancia':
    case 'resistance':
    case 'resistencia':
    case 'reactance':
    case 'reactancia':
      return context === 'display' ? PRECISION_LEVELS.IMPEDANCE : PRECISION_LEVELS.INTERNAL;
    
    case 'coordination':
    case 'coordinacion':
    case 'tcc':
      return PRECISION_LEVELS.COORDINATION;
    
    case 'critical':
    case 'safety':
    case 'seguridad':
      return PRECISION_LEVELS.CRITICAL;
    
    default:
      return PRECISION_LEVELS[contextKey] || PRECISION_LEVELS.INTERNAL;
  }
}

/**
 * Format value with appropriate precision and unit
 * @param {number} value - Value to format
 * @param {string} unit - Unit string
 * @param {string} type - Calculation type for precision
 * @returns {string} Formatted value with unit
 */
function formatElectricalValue(value, unit = '', type = 'default') {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return `Invalid ${unit}`;
  }
  
  const precision = getPrecisionForType(type, 'display');
  return `${value.toFixed(precision)} ${unit}`.trim();
}

/**
 * Round value to specified precision with proper IEEE rounding
 * @param {number} value - Value to round
 * @param {number} precision - Decimal places
 * @returns {number} Rounded value
 */
function roundToPrecision(value, precision = PRECISION_LEVELS.INTERNAL) {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return value;
  }
  
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

/**
 * Validate if value meets precision requirements
 * @param {number} value - Value to validate
 * @param {string} type - Calculation type
 * @returns {Object} Validation result
 */
function validatePrecision(value, type = 'default') {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return { valid: false, error: 'Value must be a finite number' };
  }
  
  const requiredPrecision = getPrecisionForType(type, 'internal');
  const rounded = roundToPrecision(value, requiredPrecision);
  const difference = Math.abs(value - rounded);
  
  // Check if difference is within acceptable tolerance (1e-12 for double precision)
  const tolerance = Math.pow(10, -requiredPrecision - 6);
  
  return {
    valid: difference <= tolerance,
    error: difference > tolerance ? `Value does not meet ${requiredPrecision} decimal place precision requirement` : null,
    rounded,
    tolerance
  };
}

/**
 * Convert between precision levels
 * @param {number} value - Input value
 * @param {string} fromType - Source calculation type
 * @param {string} toType - Target calculation type
 * @returns {number} Converted precision value
 */
function convertPrecision(value, fromType, toType) {
  const fromPrecision = getPrecisionForType(fromType, 'internal');
  const toPrecision = getPrecisionForType(toType, 'internal');
  
  if (fromPrecision === toPrecision) {
    return value;
  }
  
  // Round to source precision first, then to target precision
  const rounded = roundToPrecision(value, fromPrecision);
  return roundToPrecision(rounded, toPrecision);
}

module.exports = {
  PRECISION_LEVELS,
  toElectricalPrecision,
  toDisplayPrecision,
  getPrecisionForType,
  formatElectricalValue,
  roundToPrecision,
  validatePrecision,
  convertPrecision
};
