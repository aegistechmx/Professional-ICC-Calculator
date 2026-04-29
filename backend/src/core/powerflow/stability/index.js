/**
 * stability/index.js - Stability analysis module exports
 *
 * Responsibility: Centralized exports for transient stability analysis
 * Architecture: Swing Equation → Fault Modeling → Dynamic Simulation → Stability Criteria
 */

const DynamicSimulator = require('./dynamicSimulator')
const {
  swingEquation,
  calculateElectricalPower,
  updateGeneratorState,
  isGeneratorStable,
  calculateCriticalClearingTime,
  calculateDampingRatio,
} = require('./swingEquation')
const {
  createThreePhaseFault,
  clearFault,
  generateFaultScenarios,
  applyFaultAtTime,
  calculateFaultCurrent,
  getFaultStatus,
  generateCriticalFaults,
} = require('./faultModel')
const {
  checkAngleStability,
  checkSpeedStability,
  checkEqualAreaCriterion,
  checkKineticEnergy,
  checkSystemStability,
  calculateStabilityIndices,
} = require('./stabilityCriteria')

module.exports = {
  // Main simulator
  DynamicSimulator,

  // Swing equation
  swingEquation,
  calculateElectricalPower,
  updateGeneratorState,
  isGeneratorStable,
  calculateCriticalClearingTime,
  calculateDampingRatio,

  // Fault modeling
  createThreePhaseFault,
  clearFault,
  generateFaultScenarios,
  applyFaultAtTime,
  calculateFaultCurrent,
  getFaultStatus,
  generateCriticalFaults,

  // Stability criteria
  checkAngleStability,
  checkSpeedStability,
  checkEqualAreaCriterion,
  checkKineticEnergy,
  checkSystemStability,
  calculateStabilityIndices,
}
