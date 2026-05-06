/**
 * Engine Index - Punto de entrada unificado para el motor eléctrico
 * Exporta todos los módulos del engine para uso con require
 */

const { calcAmpacity } = require('./ampacity.js');
const { calcTerminalLimit } = require('./terminal.js');
const { calcDesignCurrent, finalAmpacity, checkAmpacity } = require('./design.js');
const { checkInterrupting } = require('./interrupting.js');
const { calcVoltageDrop, checkVoltageDrop } = require('./voltageDrop.js');
const { calcTripTime, getTripTimeReal, generateCurve, checkCoordinationReal, checkCoordination } = require('./tccCoordination.js');
const { validateFeeder } = require('./validator.js');
const { runFullAnalysis } = require('./fullAnalysis.js');
const { costFunction, optimizeBreakers, generateReport } = require('./optimizer.js');
const { BREAKER_CATALOG, getBreaker, listBreakers } = require('./breakerCatalog.js');
const { AMPACITY, TEMP_CORRECTION_90C, TEMP_FACTOR_90C, GROUPING_FACTOR, getAmpacity, getAmpacity75C } = require('./catalogs.js');
const { assertElectricalPrecision, assertPositive, assertEnum } = require('./guards.js');

module.exports = {
  // Ampacity
  calcAmpacity,
  calcTerminalLimit,
  
  // Design
  calcDesignCurrent,
  finalAmpacity,
  checkAmpacity,
  
  // Interrupting
  checkInterrupting,
  
  // Voltage Drop
  calcVoltageDrop,
  checkVoltageDrop,
  
  // TCC Coordination
  calcTripTime,
  getTripTimeReal,
  generateCurve,
  checkCoordinationReal,
  checkCoordination,
  
  // Validation
  validateFeeder,
  
  // Analysis
  runFullAnalysis,
  
  // Optimization
  costFunction,
  optimizeBreakers,
  generateReport,
  
  // Catalogs
  BREAKER_CATALOG,
  getBreaker,
  listBreakers,
  AMPACITY,
  TEMP_CORRECTION_90C,
  TEMP_FACTOR_90C,
  GROUPING_FACTOR,
  getAmpacity,
  getAmpacity75C,
  
  // Guards
  assertElectricalPrecision,
  assertPositive,
  assertEnum
};
