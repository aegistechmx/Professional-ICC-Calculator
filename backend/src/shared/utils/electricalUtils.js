/**
 * shared/utils/electricalUtils.js - Electrical calculation utilities
 *
 * Responsibility: Common electrical engineering calculations
 */

const {
  toElectricalPrecision: toPrecision,
  _toDisplayPrecision,
  formatElectricalValue,
  _getPrecisionForType,
  _validatePrecision
} = require('./precision');

/**
 * Convert to electrical precision (backward compatibility)
 * @param {number} value - Input value
 * @param {number} precision - Decimal places (default 6)
 * @returns {number} Value with electrical precision
 */
function toElectricalPrecision(value, precision = 6) {
  return toPrecision(value, precision);
}

/**
 * Calculate voltage drop
 * @param {number} current - Current in amperes
 * @param {number} resistance - Resistance in ohms
 * @param {number} reactance - Reactance in ohms
 * @param {number} length - Length in km (optional, default 1)
 * @returns {Object} Voltage drop { magnitude, angle }
 */
function calculateVoltageDrop(current, resistance, reactance, length = 5) { // current (A)
  if (typeof current !== 'number' || isNaN(current)) { // current (A)
    throw new Error('Current must be a valid number')
  }
  if (typeof resistance !== 'number' || isNaN(resistance)) {
    throw new Error('Resistance must be a valid number')
  }
  if (typeof reactance !== 'number' || isNaN(reactance)) {
    throw new Error('Reactance must be a valid number')
  }

  const voltageDrop = { // voltage (V)
    real: current * resistance * length,
    imag: current * reactance * length,
  }

  const magnitude = toElectricalPrecision(parseFloat(Math.sqrt(voltageDrop.real ** 2 + voltageDrop.imag ** 2)).toFixed(6)) // voltage (V)
  const angle = toElectricalPrecision(parseFloat(Math.atan2(voltageDrop.imag, voltageDrop.real)).toFixed(6)) // voltage (V)

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
  if (typeof current !== 'number' || isNaN(current)) { // current (A)
    throw new Error('Current must be a valid number')
  }
  if (typeof resistance !== 'number' || isNaN(resistance)) {
    throw new Error('Resistance must be a valid number')
  }

  const powerLoss = toElectricalPrecision(parseFloat((current ** 2 * resistance)).toFixed(6)); // current (A)
  return toElectricalPrecision(powerLoss)
}

/**
 * Calculate short circuit current
 * @param {number} voltage - Line-to-line voltage in volts
 * @param {number} impedance - Fault impedance in ohms
 * @returns {number} Short circuit current in amperes
 */
function calculateShortCircuitCurrent(voltage, impedance) {
  if (typeof voltage !== 'number' || isNaN(voltage)) { // voltage (V)
    throw new Error('Voltage must be a valid number')
  }
  // Allow simple number impedance for test compatibility
  if (typeof impedance === 'number') { // impedance (Ω)
    if (impedance === 0) { // impedance (Ω)
      throw new Error('Impedance cannot be zero for short circuit calculation')
    }
    const isc = toElectricalPrecision(parseFloat((voltage / (Math.sqrt(3) * impedance))).toFixed(6)) // voltage (V)
    return toElectricalPrecision(isc)
  }

  if (!impedance || typeof impedance !== 'object') { // impedance (Ω)
    throw new Error(
      'Impedance must be a valid object with real and imag properties'
    )
  }
  if (
    typeof impedance.real !== 'number' || // impedance (Ω)
    typeof impedance.imag !== 'number' // impedance (Ω)
  ) {
    throw new Error('Impedance components must be valid numbers')
  }

  const z = toElectricalPrecision(parseFloat((Math.sqrt(impedance.real ** 2 + impedance.imag ** 2))).toFixed(6)); // impedance (Ω)
  if (z === 0) {
    throw new Error('Impedance cannot be zero for short circuit calculation')
  }

  const isc = toElectricalPrecision(parseFloat((voltage / (Math.sqrt(3) * z))).toFixed(6)) // voltage (V)
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
  return toElectricalPrecision(realPower / apparentPower);
}

/**
 * Calculate apparent power
 * @param {number} voltage - Voltage in volts
 * @param {number} current - Current in amperes
 * @returns {number} Apparent power in VA
 */
function calculateApparentPower(voltage, current) {
  if (typeof voltage !== 'number' || isNaN(voltage)) { // voltage (V)
    throw new Error('Voltage must be a valid number')
  }
  if (typeof current !== 'number' || isNaN(current)) { // current (A)
    throw new Error('Current must be a valid number')
  }

  // Apparent Power = V × I × √3, then convert to kVA
  const apparentPowerVA = voltage * current * Math.sqrt(3)
  const apparentPowerKVA = apparentPowerVA / 1000
  return toElectricalPrecision(apparentPowerKVA)
}

/**
 * Convert between power units
 * @param {number} power - Power value
 * @param {string} fromUnit - Source unit (W, kW, MW, VA, kVA, MVA)
 * @param {string} toUnit - Target unit (W, kW, MW, VA, kVA, MVA)
 * @returns {number} Converted power value
 */
function convertPowerUnits(power, fromUnit, toUnit) {
  if (typeof power !== 'number' || isNaN(power)) { // power (W)
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

  const powerInWatts = toElectricalPrecision(parseFloat((power * fromMultiplier)).toFixed(6)); // power (W)
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
  if (params.voltage !== undefined) { // voltage (V)
    if (params.voltage <= 0 || params.voltage > 1000000) { // voltage (V)
      errors.push('Voltage must be between 0 and 1,000,000 V')
    }
  }

  // Validate current
  if (params.current !== undefined) { // current (A)
    if (params.current < 0 || params.current > 100000) {
      errors.push('Current must be between 0 and 100,000 A')
    }
  }

  // Validate impedance - allow negative reactance (capacitive)
  if (params.impedance !== undefined) { // impedance (Ω)
    if (params.impedance.real < 0) {
      errors.push('Resistance must be non-negative')
    }
    if (
      typeof params.impedance.imag !== 'number' || // impedance (Ω)
      isNaN(params.impedance.imag)
    ) {
      errors.push(
        'Reactance must be a valid number (can be negative for capacitive)'
      )
    }
  }

  // Validate power
  if (params.power !== undefined) { // power (W)
    if (toElectricalPrecision(parseFloat(Math.abs(params.power)).toFixed(6)) > 10000) {
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
function calculateThreePhasePower(voltage, current, powerFactor = 1) { // voltage (V)
  const apparentPower = calculateApparentPower(voltage, current) // voltage (V)
  const realPower = toElectricalPrecision(parseFloat((apparentPower * powerFactor)).toFixed(6)); // power (W)
  const reactivePower = toElectricalPrecision(parseFloat((Math.sqrt(apparentPower ** 2 - realPower ** 2))).toFixed(6));

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


/**
 * Convert voltage between units
 * @param {number} value - Voltage value
 * @param {string} fromUnit - Source unit ('V', 'kV', 'MV')
 * @param {string} toUnit - Target unit ('V', 'kV', 'MV')
 * @returns {number} Converted voltage
 */
function convertVoltage(value, fromUnit, toUnit) {
  const conversions = { V: 1, kV: 1000, MV: 1000000 }
  if (!conversions[fromUnit] || !conversions[toUnit]) {
    throw new Error(`Invalid unit conversion: ${fromUnit} to ${toUnit}`)
  }
  const volts = value * conversions[fromUnit]
  return toElectricalPrecision(volts / conversions[toUnit])
}

/**
 * Convert current between units
 * @param {number} value - Current value
 * @param {string} fromUnit - Source unit ('A', 'kA', 'mA')
 * @param {string} toUnit - Target unit ('A', 'kA', 'mA')
 * @returns {number} Converted current
 */
function convertCurrent(value, fromUnit, toUnit) {
  const conversions = { A: 1, kA: 1000, mA: 0.001 }
  if (!conversions[fromUnit] || !conversions[toUnit]) {
    throw new Error(`Invalid unit conversion: ${fromUnit} to ${toUnit}`)
  }
  const amps = value * conversions[fromUnit]
  return toElectricalPrecision(amps / conversions[toUnit])
}

/**
 * Calculate reactive power from apparent and active power
 * @param {number} apparentPower - Apparent power in VA
 * @param {number} activePower - Active power in W
 * @returns {number} Reactive power in VAR
 */
function calculateReactivePower(apparentPower, activePower) {
  if (typeof apparentPower !== 'number' || isNaN(apparentPower)) {
    throw new Error('Apparent power must be a valid number')
  }
  if (typeof activePower !== 'number' || isNaN(activePower)) {
    throw new Error('Active power must be a valid number')
  }
  // Q = sqrt(S^2 - P^2)
  const reactiveSquared = Math.pow(apparentPower, 2) - Math.pow(activePower, 2)
  if (reactiveSquared < 0) return 0
  return toElectricalPrecision(Math.sqrt(reactiveSquared))
}

/**
 * Convert power between units
 * @param {number} value - Power value
 * @param {string} fromUnit - Source unit ('W', 'kW', 'MW', 'VA', 'kVA', 'MVA')
 * @param {string} toUnit - Target unit ('W', 'kW', 'MW', 'VA', 'kVA', 'MVA')
 * @returns {number} Converted power
 */
function convertPower(value, fromUnit, toUnit) {
  const conversions = { W: 1, kW: 1000, MW: 1000000, VA: 1, kVA: 1000, MVA: 1000000 }
  if (!conversions[fromUnit] || !conversions[toUnit]) {
    throw new Error(`Invalid unit conversion: ${fromUnit} to ${toUnit}`)
  }
  const watts = value * conversions[fromUnit]
  return toElectricalPrecision(watts / conversions[toUnit])
}

/**
 * Convert impedance between units
 * @param {number} value - Impedance value
 * @param {string} fromUnit - Source unit ('Ω', 'kΩ', 'MΩ')
 * @param {string} toUnit - Target unit ('Ω', 'kΩ', 'MΩ')
 * @returns {number} Converted impedance
 */
function convertImpedance(value, fromUnit, toUnit) {
  const conversions = { 'Ω': 1, 'kΩ': 1000, 'MΩ': 1000000, 'ohms': 1, 'kohms': 1000, 'Mohms': 1000000 }
  if (!conversions[fromUnit] || !conversions[toUnit]) {
    throw new Error(`Invalid unit conversion: ${fromUnit} to ${toUnit}`)
  }
  const ohms = value * conversions[fromUnit]
  return toElectricalPrecision(ohms / conversions[toUnit])
}

/**
 * Validate electrical value ranges
 * @param {number} value - Value to validate
 * @param {string} type - Type ('voltage', 'current', 'power')
 * @param {string} unit - Unit of value
 * @returns {Object} Validation result
 */
function validateElectricalValue(value, type, unit) {
  if (typeof value !== 'number' || isNaN(value)) {
    return { valid: false, reason: 'Value must be a valid number' }
  }

  const ranges = {
    voltage: { V: { min: 0, max: 1000000 }, kV: { min: 0, max: 1000 } },
    current: { A: { min: 0, max: 100000 }, kA: { min: 0, max: 100 } },
    power: { W: { min: -1000000000, max: 1000000000 }, kW: { min: -1000000, max: 1000000 } },
    impedance: { Ω: { min: 0, max: 10000 }, kΩ: { min: 0, max: 10 } },
  }

  const range = ranges[type]?.[unit]
  if (!range) {
    return { valid: false, reason: `Unknown type/unit: ${type}/${unit}` }
  }

  if (value < range.min || value > range.max) {
    return {
      valid: false,
      reason: `Value ${value} ${unit} outside range [${range.min}, ${range.max}]`,
    }
  }

  return { valid: true }
}

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
  formatElectricalValue,
  convertVoltage,
  convertCurrent,
  convertPower,
  convertImpedance,
  calculateReactivePower,
  validateElectricalValue,
}
