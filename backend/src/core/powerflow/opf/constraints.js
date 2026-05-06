/**
 * constraints.js - Power flow constraints for OPF
 *
 * Responsibility: Enforce physical and operational constraints
 * NO Express, NO axios, NO UI logic
 */

/**
 * Calculate power balance mismatch
 * @param {Object} model - System model
 * @param {Array} Pgen - Generation vector
 * @param {Array} Pload - Load vector
 * @returns {number} Power mismatch
 */
function powerBalanceMismatch(model, Pgen, Pload) {
  const totalGen = Pgen.reduce((sum, P) => sum + P, 0)
  const totalLoad = Pload.reduce((sum, P) => sum + P, 0)
  return totalGen - totalLoad
}

/**
 * Enforce power balance by adjusting slack generator
 * @param {Object} model - System model
 * @param {Array} generators - Generator array
 * @param {Array} loads - Load array
 */
function enforcePowerBalance(model, generators, loads) {
  const Pgen = generators.map(g => g.P)
  const Pload = loads.map(l => l.P)

  const mismatch = powerBalanceMismatch(model, Pgen, Pload) // power (W)

  // Adjust slack generator (first generator)
  if (generators.length > 0) {
    generators[0].P -= mismatch
    generators[0].P = Math.max(
      generators[0].Pmin,
      Math.min(generators[0].Pmax, generators[0].P)
    )
  }
}

/**
 * Check generation limits
 * @param {Array} generators - Generator array
 * @returns {Object} Violation information
 */
function checkGenerationLimits(generators) {
  const violations = []

  generators.forEach((gen, i) => {
    if (gen.P < gen.Pmin) {
      violations.push({
        type: 'generation_below_min',
        generator: i,
        value: gen.P,
        limit: gen.Pmin,
        violation: gen.Pmin - gen.P,
      })
    }

    if (gen.P > gen.Pmax) {
      violations.push({
        type: 'generation_above_max',
        generator: i,
        value: gen.P,
        limit: gen.Pmax,
        violation: gen.P - gen.Pmax,
      })
    }
  })

  return {
    violations,
    feasible: violations.length === 0,
  }
}

/**
 * Check voltage limits
 * @param {Array} voltages - Voltage vector
 * @param {number} Vmin - Minimum voltage (pu)
 * @param {number} Vmax - Maximum voltage (pu)
 * @returns {Object} Violation information
 */
function checkVoltageLimits(voltages, Vmin = 0.95, Vmax = 1.05) { // voltage (V)
  const violations = []

  voltages.forEach((V, i) => { // voltage (V)
    const Vmag = Math.sqrt(V.re * V.re + V.im * V.im)

    if (Vmag < Vmin) {
      violations.push({
        type: 'voltage_below_min',
        bus: i,
        value: Vmag,
        limit: Vmin,
        violation: Vmin - Vmag,
      })
    }

    if (Vmag > Vmax) {
      violations.push({
        type: 'voltage_above_max',
        bus: i,
        value: Vmag,
        limit: Vmax,
        violation: Vmag - Vmax,
      })
    }
  })

  return {
    violations,
    feasible: violations.length === 0,
  }
}

/**
 * Check line flow limits
 * @param {Array} flows - Line flow array
 * @param {Array} limits - Line limit array
 * @returns {Object} Violation information
 */
function checkLineFlowLimits(flows, limits) {
  const violations = []

  flows.forEach((flow, i) => {
    if (Math.abs(flow) > limits[i]) {
      violations.push({
        type: 'line_flow_limit',
        line: i,
        value: Math.abs(flow),
        limit: limits[i],
        violation: Math.abs(flow) - limits[i],
      })
    }
  })

  return {
    violations,
    feasible: violations.length === 0,
  }
}

/**
 * Calculate penalty for constraint violations
 * @param {Object} violations - Violation object
 * @param {number} penalty - Penalty factor
 * @returns {number} Total penalty
 */
function calculatePenalty(violations, penalty = 1000) {
  let totalPenalty = 0

  if (violations.violations) {
    violations.violations.forEach(v => {
      totalPenalty += penalty * Math.abs(v.violation)
    })
  }

  return totalPenalty
}

/**
 * Check all constraints
 * @param {Object} model - System model
 * @param {Array} generators - Generator array
 * @param {Array} voltages - Voltage vector
 * @param {Object} options - Constraint options
 * @returns {Object} Overall constraint status
 */
function checkAllConstraints(model, generators, voltages, options = {}) { // voltage (V)
  const { Vmin = 0.95, Vmax = 1.05, penalty = 1000 } = options

  // Check generation limits
  const genConstraints = checkGenerationLimits(generators)

  // Check voltage limits
  const voltConstraints = checkVoltageLimits(voltages, Vmin, Vmax) // voltage (V)

  // Check line flow limits (if available)
  let flowConstraints = { violations: [], feasible: true }
  if (model.branches && model.branches.every(b => b.limit)) {
    const flows = [] // Would need power flow to calculate
    const limits = model.branches.map(b => b.limit)
    flowConstraints = checkLineFlowLimits(flows, limits)
  }

  const allViolations = [
    ...genConstraints.violations,
    ...voltConstraints.violations,
    ...flowConstraints.violations,
  ]

  return {
    feasible: allViolations.length === 0,
    violations: allViolations,
    penalty: calculatePenalty({ violations: allViolations }, penalty),
    generation: genConstraints,
    voltage: voltConstraints,
    flow: flowConstraints,
  }
}

module.exports = {
  powerBalanceMismatch,
  enforcePowerBalance,
  checkGenerationLimits,
  checkVoltageLimits,
  checkLineFlowLimits,
  calculatePenalty,
  checkAllConstraints,
}
