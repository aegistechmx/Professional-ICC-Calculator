/**
 * electricalUtils.js - Electrical utility functions
 * 
 * Provides precision formatting and conversion utilities
 */

/**
 * Convert to electrical precision (6 decimal places)
 * @param {number} value - Value to convert
 * @returns {number} Precision value
 */
function toElectricalPrecision(value) {
  return parseFloat(value.toFixed(6));
}

/**
 * Format electrical value for display
 * @param {number} value - Value to format
 * @param {number} [decimals=6] - Number of decimal places
 * @returns {string} Formatted string
 */
function formatElectricalValue(value, decimals = 6) {
  return value.toFixed(decimals);
}

module.exports = {
  toElectricalPrecision,
  formatElectricalValue
};
