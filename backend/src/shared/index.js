/**
 * shared/index.js - Shared utilities exports
 * 
 * Responsibility: Centralized shared utilities
 */

const { validateElectricalSystem } = require('./models/electrical');
const { formatNumber, formatVoltage, formatPower } = require('./utils/formatting');
const { createLogger, logError, logInfo } = require('./utils/logging');

module.exports = {
  // Models
  electrical: { validateElectricalSystem },
  
  // Utils
  formatting: { formatNumber, formatVoltage, formatPower },
  logging: { createLogger, logError, logInfo }
};