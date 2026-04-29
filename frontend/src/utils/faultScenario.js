/**
 * Fault Scenario Generator
 * Creates and manages fault scenarios for dynamic simulation
 */

import { createFaultEvent } from './eventEngine'

/**
 * Fault types
 */
export const FAULT_TYPES = {
  THREE_PHASE: '3P',
  LINE_TO_GROUND: 'LG',
  LINE_TO_LINE: 'LL',
  DOUBLE_LINE_TO_GROUND: 'LLG',
}

/**
 * Create a fault scenario
 * @param {Object} scenario - Scenario configuration
 * @returns {Object} Fault scenario with events
 */
export function createFaultScenario(scenario) {
  const {
    busId,
    faultType = FAULT_TYPES.THREE_PHASE,
    startTime = 0,
    impedance = 0,
  } = scenario

  return {
    id: `fault_${busId}_${Date.now()}`,
    busId,
    faultType,
    startTime,
    impedance,
    events: [
      createFaultEvent(busId, startTime, {
        faultType,
        impedance,
      }),
    ],
    status: 'pending',
  }
}

/**
 * Create multiple fault scenarios
 * @param {Array} buses - Array of bus IDs
 * @param {Object} options - Fault options
 * @returns {Array} Array of fault scenarios
 */
export function createFaultScenarios(buses, options = {}) {
  const {
    faultType = FAULT_TYPES.THREE_PHASE,
    startTime = 0,
    impedance = 0,
  } = options

  return buses.map(busId =>
    createFaultScenario({
      busId,
      faultType,
      startTime,
      impedance,
    })
  )
}

/**
 * Create N-1 contingency scenarios
 * @param {Array} branches - Array of branch objects
 * @returns {Array} N-1 scenarios
 */
export function createN1Scenarios(branches) {
  return branches.map(branch => ({
    id: `n1_${branch.from}_${branch.to}`,
    type: 'n1',
    elementId: branch.id || `${branch.from}-${branch.to}`,
    from: branch.from,
    to: branch.to,
    status: 'pending',
  }))
}

/**
 * Validate fault scenario
 * @param {Object} scenario - Fault scenario
 * @returns {Object} Validation result
 */
export function validateFaultScenario(scenario) {
  const errors = []
  const warnings = []

  if (!scenario.busId) {
    errors.push('Bus ID is required')
  }

  if (!scenario.faultType) {
    errors.push('Fault type is required')
  }

  if (!Object.values(FAULT_TYPES).includes(scenario.faultType)) {
    warnings.push(`Unknown fault type: ${scenario.faultType}`)
  }

  if (scenario.startTime < 0) {
    errors.push('Start time cannot be negative')
  }

  if (scenario.impedance < 0) {
    errors.push('Fault impedance cannot be negative')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Get fault type description
 * @param {string} faultType - Fault type code
 * @returns {string} Human-readable description
 */
export function getFaultTypeDescription(faultType) {
  const descriptions = {
    '3P': 'Three-Phase Fault',
    LG: 'Line-to-Ground Fault',
    LL: 'Line-to-Line Fault',
    LLG: 'Double Line-to-Ground Fault',
  }

  return descriptions[faultType] || 'Unknown Fault Type'
}
