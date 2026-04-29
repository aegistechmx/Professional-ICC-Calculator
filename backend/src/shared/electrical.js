/**
 * shared/electrical.js - Electrical utilities and calculations
 * 
 * Responsibility: Common electrical engineering calculations
 */

/**
 * Validate electrical system model
 * @param {Object} system - Power system model
 * @returns {Object} Validation result
 */
function validateElectricalSystem(system) {
  const errors = [];
  const warnings = [];

  // Check required properties
  if (!system.baseMVA) errors.push('Missing baseMVA');
  if (!system.baseKV) errors.push('Missing baseKV');
  if (!system.buses || !Array.isArray(system.buses)) errors.push('Missing or invalid buses array');
  if (!system.branches || !Array.isArray(system.branches)) errors.push('Missing or invalid branches array');

  // Validate buses
  if (system.buses) {
    system.buses.forEach((bus, i) => {
      if (!bus.id) errors.push(`Bus ${i}: Missing id`);
      if (!bus.type) errors.push(`Bus ${i}: Missing type`);
      if (bus.voltage && typeof bus.voltage.magnitude !== 'number') {
        errors.push(`Bus ${i}: Invalid voltage magnitude`);
      }
    });
  }

  // Validate branches
  if (system.branches) {
    system.branches.forEach((branch, i) => {
      if (branch.from === undefined || branch.to === undefined) {
        errors.push(`Branch ${i}: Missing from/to buses`);
      }
      if (typeof branch.R !== 'number' || typeof branch.X !== 'number') {
        errors.push(`Branch ${i}: Invalid impedance values`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Convert values to per-unit system
 * @param {number} value - Value to convert
 * @param {number} base - Base value
 * @returns {number} Per-unit value
 */
function convertToPerUnit(value, base) {
  if (base === 0) throw new Error('Base value cannot be zero');
  return value / base;
}

/**
 * Calculate power factor
 * @param {number} P - Real power
 * @param {number} Q - Reactive power
 * @returns {number} Power factor
 */
function calculatePowerFactor(P, Q) {
  const S = Math.sqrt(P * P + Q * Q);
  if (S === 0) return 0;
  return P / S;
}

module.exports = {
  validateElectricalSystem,
  convertToPerUnit,
  calculatePowerFactor
};
