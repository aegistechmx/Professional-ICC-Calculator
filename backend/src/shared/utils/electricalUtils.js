/**
 * shared/utils/electricalUtils.js - Electrical calculation utilities
 *
 * Responsibility: Common electrical engineering calculations
 */

/**
 * Convert to electrical precision
 * @param {number} value - Input value
 * @param {number} precision - Decimal places (default 6)
 * @returns {number} Value with electrical precision
 */
function toElectricalPrecision(value, precision = 6) {
  if (typeof value !== 'number' || isNaN(value)) {
    return value
  }
  return Number(value.toFixed(precision))
}

/**
 * Calculate voltage drop
 * @param {number} current - Current in amperes
 * @param {number} resistance - Resistance in ohms
 * @param {number} reactance - Reactance in ohms
 * @param {number} length - Length in km (optional, default 1)
 * @returns {Object} Voltage drop { magnitude, angle }
 */
function calculateVoltageDrop(current, resistance, reactance, length = 5) {
  if (typeof current !== 'number' || isNaN(current)) {
    throw new Error('Current must be a valid number')
  }
  if (typeof resistance !== 'number' || isNaN(resistance)) {
    throw new Error('Resistance must be a valid number')
  }
  if (typeof reactance !== 'number' || isNaN(reactance)) {
    throw new Error('Reactance must be a valid number')
  }

  const voltageDrop = {
    real: current * resistance * length,
    imag: current * reactance * length,
  }

  const magnitude = Math.sqrt(voltageDrop.real ** 2 + voltageDrop.imag ** 2)
  const angle = Math.atan2(voltageDrop.imag, voltageDrop.real)

  return {
    magnitude: toElectricalPrecision(magnitude),
    angle: toElectricalPrecision(angle),
    complex: voltageDrop,
  }
}

/**
 * Calculate power loss
 * @param {number} current - Current in amperes
 * @param {number} resistance - Resistance in ohms
 * @returns {number} Power loss in watts
 */
function calculatePowerLoss(current, resistance) {
  if (typeof current !== 'number' || isNaN(current)) {
    throw new Error('Current must be a valid number')
  }
  if (typeof resistance !== 'number' || isNaN(resistance)) {
    throw new Error('Resistance must be a valid number')
  }

  const powerLoss = current ** 2 * resistance
  return toElectricalPrecision(powerLoss)
}

/**
 * Calculate short circuit current
 * @param {number} voltage - Line-to-line voltage in volts
 * @param {number} impedance - Fault impedance in ohms
 * @returns {number} Short circuit current in amperes
 */
function calculateShortCircuitCurrent(voltage, impedance) {
  if (typeof voltage !== 'number' || isNaN(voltage)) {
    throw new Error('Voltage must be a valid number')
  }
  // Allow simple number impedance for test compatibility
  if (typeof impedance === 'number') {
    if (impedance === 0) {
      throw new Error('Impedance cannot be zero for short circuit calculation')
    }
    const isc = voltage / (Math.sqrt(3) * impedance)
    return toElectricalPrecision(isc)
  }

  if (!impedance || typeof impedance !== 'object') {
    throw new Error(
      'Impedance must be a valid object with real and imag properties'
    )
  }
  if (
    typeof impedance.real !== 'number' ||
    typeof impedance.imag !== 'number'
  ) {
    throw new Error('Impedance components must be valid numbers')
  }

  const z = Math.sqrt(impedance.real ** 2 + impedance.imag ** 2)
  if (z === 0) {
    throw new Error('Impedance cannot be zero for short circuit calculation')
  }

  const isc = voltage / (Math.sqrt(3) * z)
  return toElectricalPrecision(isc)
}

/**
 * Calculate power factor
 * @param {number} realPower - Real power in watts
 * @param {number} apparentPower - Apparent power in VA
 * @returns {number} Power factor (0-1)
 */
function calculatePowerFactor(realPower, apparentPower) {
  if (typeof realPower !== 'number' || isNaN(realPower)) {
    throw new Error('Real power must be a valid number')
  }
  if (typeof apparentPower !== 'number' || isNaN(apparentPower)) {
    throw new Error('Apparent power must be a valid number')
  }
  if (apparentPower === 0) {
    return 0 // Power factor is 0 when apparent power is 0
  }
  return toElectricalPrecision(realPower / apparentPower)
}

/**
 * Calculate apparent power
 * @param {number} voltage - Voltage in volts
 * @param {number} current - Current in amperes
 * @returns {number} Apparent power in VA
 */
function calculateApparentPower(voltage, current) {
  if (typeof voltage !== 'number' || isNaN(voltage)) {
    throw new Error('Voltage must be a valid number')
  }
  if (typeof current !== 'number' || isNaN(current)) {
    throw new Error('Current must be a valid number')
  }

  const apparentPower = voltage * current * Math.sqrt(3)
  return toElectricalPrecision(apparentPower / 1000) // Return in kVA
}

/**
 * Convert between power units
 * @param {number} power - Power value
 * @param {string} fromUnit - Source unit (W, kW, MW, VA, kVA, MVA)
 * @param {string} toUnit - Target unit (W, kW, MW, VA, kVA, MVA)
 * @returns {number} Converted power value
 */
function convertPowerUnits(power, fromUnit, toUnit) {
  if (typeof power !== 'number' || isNaN(power)) {
    throw new Error('Power must be a valid number')
  }
  if (typeof fromUnit !== 'string' || typeof toUnit !== 'string') {
    throw new Error('Units must be valid strings')
  }

  const units = {
    W: 1,
    kW: 1000,
    MW: 1000000,
    VA: 1,
    kVA: 1000,
    MVA: 1000000,
  }

  if (!units.hasOwnProperty(fromUnit)) {
    throw new Error(
      `Invalid source unit: ${fromUnit}. Valid units: ${Object.keys(units).join(', ')}`
    )
  }
  if (!units.hasOwnProperty(toUnit)) {
    throw new Error(
      `Invalid target unit: ${toUnit}. Valid units: ${Object.keys(units).join(', ')}`
    )
  }

  const fromMultiplier = units[fromUnit]
  const toMultiplier = units[toUnit]

  const powerInWatts = power * fromMultiplier
  return toElectricalPrecision(powerInWatts / toMultiplier)
}

/**
 * Validate electrical parameters
 * @param {Object} params - Electrical parameters to validate
 * @returns {Object} Validation result { valid, errors }
 */
function validateElectricalParams(params) {
  const errors = []

  // Validate voltage levels
  if (params.voltage !== undefined) {
    if (params.voltage <= 0 || params.voltage > 1000000) {
      errors.push('Voltage must be between 0 and 1,000,000 V')
    }
  }

  // Validate current
  if (params.current !== undefined) {
    if (params.current < 0 || params.current > 100000) {
      errors.push('Current must be between 0 and 100,000 A')
    }
  }

  // Validate impedance - allow negative reactance (capacitive)
  if (params.impedance !== undefined) {
    if (params.impedance.real < 0) {
      errors.push('Resistance must be non-negative')
    }
    if (
      typeof params.impedance.imag !== 'number' ||
      isNaN(params.impedance.imag)
    ) {
      errors.push(
        'Reactance must be a valid number (can be negative for capacitive)'
      )
    }
  }

  // Validate power
  if (params.power !== undefined) {
    if (Math.abs(params.power) > 10000) {
      errors.push('Power magnitude should not exceed 10 MW')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Calculate three-phase power
 * @param {number} voltage - Line-to-line voltage in volts
 * @param {number} current - Line current in amperes
 * @param {number} powerFactor - Power factor (0-1)
 * @returns {Object} Three-phase power { real, reactive, apparent }
 */
function calculateThreePhasePower(voltage, current, powerFactor = 1) {
  const apparentPower = calculateApparentPower(voltage, current)
  const realPower = apparentPower * powerFactor
  const reactivePower = Math.sqrt(apparentPower ** 2 - realPower ** 2)

  return {
    real: toElectricalPrecision(realPower),
    reactive: toElectricalPrecision(reactivePower),
    apparent: toElectricalPrecision(apparentPower),
    powerFactor: toElectricalPrecision(powerFactor),
  }
}

/**
 * Calculate per-unit values
 * @param {number} actualValue - Actual value
 * @param {number} baseValue - Base value
 * @returns {number} Per-unit value
 */
function calculatePerUnit(actualValue, baseValue) {
  if (typeof actualValue !== 'number' || isNaN(actualValue)) {
    throw new Error('Actual value must be a valid number')
  }
  if (typeof baseValue !== 'number' || isNaN(baseValue)) {
    throw new Error('Base value must be a valid number')
  }
  if (baseValue === 0) {
    throw new Error('Base value cannot be zero for per-unit calculation')
  }
  return toElectricalPrecision(actualValue / baseValue)
}

/**
 * Convert per-unit to actual value
 * @param {number} puValue - Per-unit value
 * @param {number} baseValue - Base value
 * @returns {number} Actual value
 */
function convertPerUnitToActual(puValue, baseValue) {
  if (typeof puValue !== 'number' || isNaN(puValue)) {
    throw new Error('Per-unit value must be a valid number')
  }
  if (typeof baseValue !== 'number' || isNaN(baseValue)) {
    throw new Error('Base value must be a valid number')
  }
  return toElectricalPrecision(puValue * baseValue)
}

// Import missing functions from separate file
const missingFunctions = require('./electricalUtilsMissing')

module.exports = {
  toElectricalPrecision,
  calculateVoltageDrop,
  calculatePowerLoss,
  calculateShortCircuitCurrent,
  calculatePowerFactor,
  calculateApparentPower,
  convertPowerUnits,
  validateElectricalParams,
  calculateThreePhasePower,
  calculatePerUnit,
  convertPerUnitToActual,
  // Include missing functions from separate module
  ...missingFunctions,
}
