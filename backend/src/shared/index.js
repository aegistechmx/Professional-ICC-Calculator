/**
 * shared/index.js - Shared utilities and common functions
 * 
 * Responsibility: Common utilities used across the application
 */

const { 
  validateElectricalSystem,
  convertToPerUnit,
  calculatePowerFactor
} = require('./electrical');

const {
  formatNumber,
  formatVoltage,
  formatPower
} = require('./formatting');

const {
  createLogger,
  logError,
  logInfo,
  logDebug
} = require('./logging');

const {
  deepClone,
  validateInputs,
  handleErrors
} = require('./helpers');

module.exports = {
  // Electrical utilities
  validateElectricalSystem,
  convertToPerUnit,
  calculatePowerFactor,
  
  // Formatting utilities
  formatNumber,
  formatVoltage,
  formatPower,
  
  // Logging utilities
  createLogger,
  logError,
  logInfo,
  logDebug,
  
  // General utilities
  deepClone,
  validateInputs,
  handleErrors
};
