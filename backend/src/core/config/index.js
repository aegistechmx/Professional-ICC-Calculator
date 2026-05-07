/**
 * core/config/index.js - Core Configuration Module
 *
 * Responsibility: Central configuration for core modules
 */

// Default tolerances for calculations
const tolerances = {
  powerFlow: 1e-6,
  shortCircuit: 1e-4,
  protection: 0.01,
  stability: 1e-8,
}

// System limits
const limits = {
  maxVoltage: 1000000, // 1MV
  maxCurrent: 100000, // 100kA
  maxImpedance: 1000,
  maxIterations: 100,
}

// Performance settings
const performance = {
  enableCaching: true,
  cacheSize: 1000,
  parallelProcessing: true,
  maxWorkers: 4,
}

// Validation settings
const validation = {
  strictMode: false,
  enableWarnings: true,
  checkBounds: true,
  validateUnits: true,
}

module.exports = {
  tolerances,
  limits,
  performance,
  validation,

  // Helper functions
  getTolerance: type => tolerances[type] || 1e-6,
  getLimit: type => limits[type] || Infinity,
  getPerformanceSetting: key => performance[key],
  getValidationSetting: key => validation[key],
}
