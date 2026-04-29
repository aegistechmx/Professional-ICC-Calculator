/**
 * shared/formatting.js - Formatting utilities
 * 
 * Responsibility: Common formatting functions for display
 */

/**
 * Format number with specified precision
 * @param {number} value - Value to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number
 */
function formatNumber(value, decimals = 3) {
  if (typeof value !== 'number' || isNaN(value)) return 'N/A';
  return value.toFixed(decimals);
}

/**
 * Format voltage value with unit
 * @param {number} voltage - Voltage value
 * @param {string} unit - Voltage unit
 * @returns {string} Formatted voltage
 */
function formatVoltage(voltage, unit = 'pu') {
  return `${formatNumber(voltage)} ${unit}`;
}

/**
 * Format power value with unit
 * @param {number} power - Power value
 * @param {string} unit - Power unit
 * @returns {string} Formatted power
 */
function formatPower(power, unit = 'MW') {
  return `${formatNumber(power)} ${unit}`;
}

/**
 * Format angle in degrees
 * @param {number} angle - Angle in radians
 * @returns {string} Formatted angle
 */
function formatAngle(angle) {
  if (typeof angle !== 'number' || isNaN(angle)) return 'N/A';
  return `${(angle * 180 / Math.PI).toFixed(1)}°`;
}

/**
 * Format percentage
 * @param {number} value - Value to format
 * @returns {string} Formatted percentage
 */
function formatPercentage(value) {
  if (typeof value !== 'number' || isNaN(value)) return 'N/A';
  return `${(value * 100).toFixed(1)}%`;
}

module.exports = {
  formatNumber,
  formatVoltage,
  formatPower,
  formatAngle,
  formatPercentage
};
