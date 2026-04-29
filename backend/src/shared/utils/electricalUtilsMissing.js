/**
 * Missing electrical utility functions for test compatibility
 * These functions are referenced in tests but not implemented in the main utils file
 */

// Local definition to avoid circular dependency
function toElectricalPrecision(value, precision = 6) {
  if (typeof value !== 'number' || isNaN(value)) {
    return value
  }
  return Number(value.toFixed(precision))
}

/**
 * Convert voltage between units with precision
 * @param {number} value - Voltage value
 * @param {string} fromUnit - Source unit ('V', 'kV', 'MV', 'per-unit')
 * @param {string} toUnit - Target unit ('V', 'kV', 'MV', 'per-unit')
 * @param {number} baseVoltage - Base voltage for per-unit conversion (kV)
 * @returns {number} Converted voltage with IEEE precision
 */
function convertVoltage(value, fromUnit, toUnit, baseVoltage = 1.0) {
  const VOLTAGE_CONVERSIONS = {
    V: 1,
    kV: 1000,
    MV: 1000000,
    'per-unit': null, // Needs base voltage
  }

  // Validate units
  if (
    !VOLTAGE_CONVERSIONS.hasOwnProperty(fromUnit) ||
    !VOLTAGE_CONVERSIONS.hasOwnProperty(toUnit)
  ) {
    throw new Error(`Invalid unit conversion: ${fromUnit} to ${toUnit}`)
  }

  // Convert to volts first
  let volts
  if (fromUnit === 'per-unit') {
    volts = value * baseVoltage * 1000 // Convert kV to V
  } else {
    volts = value * VOLTAGE_CONVERSIONS[fromUnit]
  }

  // Convert from volts to target unit
  if (toUnit === 'per-unit') {
    return toElectricalPrecision(volts / (baseVoltage * 1000))
  } else {
    return toElectricalPrecision(volts / VOLTAGE_CONVERSIONS[toUnit])
  }
}

/**
 * Convert current between units with precision
 * @param {number} value - Current value
 * @param {string} fromUnit - Source unit ('A', 'kA', 'mA')
 * @param {string} toUnit - Target unit ('A', 'kA', 'mA')
 * @returns {number} Converted current with IEEE precision
 */
function convertCurrent(value, fromUnit, toUnit) {
  const CURRENT_CONVERSIONS = {
    A: 1,
    kA: 1000,
    mA: 0.001,
  }

  // Validate units
  if (
    !CURRENT_CONVERSIONS.hasOwnProperty(fromUnit) ||
    !CURRENT_CONVERSIONS.hasOwnProperty(toUnit)
  ) {
    throw new Error(`Invalid unit conversion: ${fromUnit} to ${toUnit}`)
  }

  const amps = value * CURRENT_CONVERSIONS[fromUnit]
  return toElectricalPrecision(amps / CURRENT_CONVERSIONS[toUnit])
}

/**
 * Convert power between units with precision
 * @param {number} value - Power value
 * @param {string} fromUnit - Source unit ('W', 'kW', 'MW', 'VA', 'kVA', 'MVA')
 * @param {string} toUnit - Target unit ('W', 'kW', 'MW', 'VA', 'kVA', 'MVA')
 * @returns {number} Converted power with IEEE precision
 */
function convertPower(value, fromUnit, toUnit) {
  const POWER_CONVERSIONS = {
    W: 1,
    kW: 1000,
    MW: 1000000,
    VA: 1,
    kVA: 1000,
    MVA: 1000000,
  }

  // Validate units
  if (
    !POWER_CONVERSIONS.hasOwnProperty(fromUnit) ||
    !POWER_CONVERSIONS.hasOwnProperty(toUnit)
  ) {
    throw new Error(`Invalid unit conversion: ${fromUnit} to ${toUnit}`)
  }

  const watts = value * POWER_CONVERSIONS[fromUnit]
  return toElectricalPrecision(watts / POWER_CONVERSIONS[toUnit])
}

/**
 * Convert impedance between units with precision
 * @param {number} value - Impedance value
 * @param {string} fromUnit - Source unit ('Ω', 'kΩ', 'MΩ', 'pu')
 * @param {string} toUnit - Target unit ('Ω', 'kΩ', 'MΩ', 'pu')
 * @param {number} baseImpedance - Base impedance for per-unit conversion (Ω)
 * @returns {number} Converted impedance with IEEE precision
 */
function convertImpedance(value, fromUnit, toUnit, baseImpedance = 1.0) {
  const IMPEDANCE_CONVERSIONS = {
    Ω: 1,
    kΩ: 1000,
    MΩ: 1000000,
    pu: null, // Needs base impedance
  }

  // Validate units
  if (
    !IMPEDANCE_CONVERSIONS.hasOwnProperty(fromUnit) ||
    !IMPEDANCE_CONVERSIONS.hasOwnProperty(toUnit)
  ) {
    throw new Error(`Invalid unit conversion: ${fromUnit} to ${toUnit}`)
  }

  // Convert to ohms first
  let ohms
  if (fromUnit === 'pu') {
    ohms = value * baseImpedance
  } else {
    ohms = value * IMPEDANCE_CONVERSIONS[fromUnit]
  }

  // Convert from ohms to target unit
  if (toUnit === 'pu') {
    return toElectricalPrecision(ohms / baseImpedance)
  } else {
    return toElectricalPrecision(ohms / IMPEDANCE_CONVERSIONS[toUnit])
  }
}

/**
 * Calculate reactive power with IEEE precision
 * @param {number} apparentPower - Apparent power (VA)
 * @param {number} activePower - Active power (W)
 * @returns {number} Reactive power (VAR) with IEEE precision
 */
function calculateReactivePower(apparentPower, activePower) {
  if (typeof apparentPower !== 'number' || isNaN(apparentPower)) {
    throw new Error('Apparent power must be a valid number')
  }
  if (typeof activePower !== 'number' || isNaN(activePower)) {
    throw new Error('Active power must be a valid number')
  }

  const reactiveSquared = Math.pow(apparentPower, 2) - Math.pow(activePower, 2)
  if (reactiveSquared < 0) return 0
  return toElectricalPrecision(Math.sqrt(reactiveSquared))
}

/**
 * Validate electrical value ranges according to IEEE standards
 * @param {number} value - Value to validate
 * @param {string} type - Type of electrical value ('voltage', 'current', 'power', 'impedance')
 * @param {string} unit - Unit of the value
 * @returns {Object} Validation result with reason if invalid
 */
function validateElectricalValue(value, type, unit) {
  if (typeof value !== 'number' || isNaN(value)) {
    return {
      valid: false,
      reason: 'Value must be a valid number',
    }
  }

  const RANGES = {
    voltage: {
      V: { min: 0, max: 1000000 },
      kV: { min: 0, max: 1000 },
      MV: { min: 0, max: 1 },
      'per-unit': { min: 0, max: 2 },
    },
    current: {
      A: { min: 0, max: 100000 },
      kA: { min: 0, max: 100 },
      mA: { min: 0, max: 100000000 },
    },
    power: {
      W: { min: -1000000000, max: 1000000000 },
      kW: { min: -1000000, max: 1000000 },
      MW: { min: -1000, max: 1000 },
      VA: { min: 0, max: 1000000000 },
      kVA: { min: 0, max: 1000000 },
      MVA: { min: 0, max: 1000 },
    },
    impedance: {
      Ω: { min: 0, max: 10000 },
      kΩ: { min: 0, max: 10 },
      MΩ: { min: 0, max: 0.01 },
      pu: { min: 0, max: 10 },
    },
  }

  const range = RANGES[type]?.[unit]
  if (!range) {
    return {
      valid: false,
      reason: `Unknown type/unit combination: ${type}/${unit}`,
    }
  }

  if (value < range.min || value > range.max) {
    return {
      valid: false,
      reason: `Value ${value} ${unit} outside valid range [${range.min}, ${range.max}]`,
    }
  }

  return { valid: true }
}

/**
 * Format electrical value with unit and IEEE precision
 * @param {number} value - Electrical value
 * @param {string} unit - Unit
 * @param {number} precision - Decimal precision (default: 6)
 * @returns {string} Formatted string with unit
 */
function formatElectricalValue(value, unit, precision = 6) {
  if (typeof value !== 'number' || isNaN(value)) {
    return `${value} ${unit}`
  }
  const formattedValue = toElectricalPrecision(value, precision)
  return `${formattedValue} ${unit}`
}

module.exports = {
  convertVoltage,
  convertCurrent,
  convertPower,
  convertImpedance,
  calculateReactivePower,
  validateElectricalValue,
  formatElectricalValue,
}
