/**
 * securityConstraints.js - Security constraints for SCOPF
 *
 * Responsibility: Evaluate security constraints for contingency analysis
 * NO Express, NO axios, NO UI logic
 */

const { solve } = require('../../solver')
const { solveFDLF } = require('../../fastDecoupled')

/**
 * Evaluate contingency security constraints
 * @param {Object} baseSystem - Original system model
 * @param {Object} solution - OPF solution
 * @param {Array} contingencies - Contingency scenarios
 * @param {Object} options - Evaluation options
 * @returns {Object} Security constraint violations
 */
function evaluateSecurityConstraints(
  baseSystem,
  solution,
  contingencies,
  options = {}
) {
  const {
    voltageMin = 0.9,
    voltageMax = 1.1,
    lineLimitFactor = 1.0,
    tolerance = 1e-6,
    maxIterations = 30,
    method = 'FDLF',
  } = options

  const violations = []
  let secure = true

  // Evaluate each contingency
  for (const contingency of contingencies) {
    const violation = evaluateContingency(baseSystem, solution, contingency, {
      voltageMin,
      voltageMax,
      lineLimitFactor,
      tolerance,
      maxIterations,
      method,
    })

    if (violation.hasViolations) {
      violations.push(violation)
      secure = false
    }
  }

  return {
    secure,
    violations,
    totalContingencies: contingencies.length,
    criticalViolations: violations.filter(v => v.severity === 'critical'),
    marginalViolations: violations.filter(v => v.severity === 'marginal'),
  }
}

/**
 * Evaluate single contingency
 * @param {Object} baseSystem - Original system model
 * @param {Object} solution - OPF solution
 * @param {Object} contingency - Contingency scenario
 * @param {Object} options - Evaluation options
 * @returns {Object} Contingency evaluation result
 */
function evaluateContingency(baseSystem, solution, contingency, options) {
  // Apply contingency to system
  const contingencySystem = applyContingency(baseSystem, contingency)

  // Update generation from OPF solution
  updateSystemGeneration(contingencySystem, solution)

  // Solve power flow
  const pfResult =
    options.method === 'FDLF'
      ? solveFDLF(contingencySystem, {
          tolerance: options.tolerance,
          maxIterations: options.maxIterations,
        })
      : solve(contingencySystem, {
          tolerance: options.tolerance,
          maxIterations: options.maxIterations,
        })

  if (!pfResult.converged) {
    return {
      contingency,
      converged: false,
      hasViolations: true,
      severity: 'critical',
      violations: [{ type: 'non_convergence' }],
    }
  }

  // Check voltage violations
  const voltageViolations = checkVoltageViolations(pfResult.voltages, options)

  // Check line flow violations
  const flowViolations = checkLineFlowViolations(
    contingencySystem,
    pfResult,
    options.lineLimitFactor
  )

  // Check generation violations
  const generationViolations = checkGenerationViolations(
    contingencySystem,
    solution
  )

  const allViolations = [
    ...voltageViolations,
    ...flowViolations,
    ...generationViolations,
  ]

  return {
    contingency,
    converged: true,
    hasViolations: allViolations.length > 0,
    severity: determineSeverity(allViolations),
    violations: allViolations,
    voltages: pfResult.voltages,
    flows: pfResult.flows || [],
  }
}

/**
 * Apply contingency to system
 * @param {Object} system - Original system
 * @param {Object} contingency - Contingency to apply
 * @returns {Object} Modified system
 */
function applyContingency(system, contingency) {
  const modified = JSON.parse(JSON.stringify(system))

  if (contingency.type === 'line_outage') {
    // Remove line
    modified.branches = modified.branches.filter(
      (b, i) => i !== contingency.index
    )
  } else if (contingency.type === 'generator_outage') {
    // Set generation to zero
    const gen = modified.generators.find(g => g.id === contingency.elementId)
    if (gen) {
      gen.P = 0
      gen.status = 'outage'
    }
  }

  return modified
}

/**
 * Update system generation from OPF solution
 * @param {Object} system - System model to update
 * @param {Object} solution - OPF solution
 */
function updateSystemGeneration(system, solution) {
  solution.generation.forEach((gen, _i) => {
    const systemGen = system.generators.find(g => g.id === gen.id)
    if (systemGen) {
      systemGen.P = gen.P
      systemGen.Q = gen.Q || 0
    }
  })
}

/**
 * Check voltage violations
 * @param {Array} voltages - Voltage results
 * @param {Object} options - Voltage limits
 * @returns {Array} Voltage violations
 */
function checkVoltageViolations(voltages, options) {
  const violations = []

  voltages.forEach((V, i) => {
    const magnitude = Math.sqrt(V.re * V.re + V.im * V.im)

    if (magnitude < options.voltageMin) {
      violations.push({
        type: 'undervoltage',
        bus: i,
        value: magnitude,
        limit: options.voltageMin,
        violation: options.voltageMin - magnitude,
        severity:
          magnitude < options.voltageMin * 0.9 ? 'critical' : 'marginal',
      })
    } else if (magnitude > options.voltageMax) {
      violations.push({
        type: 'overvoltage',
        bus: i,
        value: magnitude,
        limit: options.voltageMax,
        violation: magnitude - options.voltageMax,
        severity:
          magnitude > options.voltageMax * 1.1 ? 'critical' : 'marginal',
      })
    }
  })

  return violations
}

/**
 * Check line flow violations
 * @param {Object} system - System model
 * @param {Object} pfResult - Power flow results
 * @param {number} limitFactor - Line limit factor
 * @returns {Array} Flow violations
 */
function checkLineFlowViolations(system, pfResult, limitFactor) {
  const violations = []

  if (!pfResult.flows) {
    // Calculate flows if not provided
    pfResult.flows = calculateLineFlows(system, pfResult.voltages)
  }

  pfResult.flows.forEach((flow, _i) => {
    const branch = system.branches.find(b => b.id === flow.id)
    if (branch && branch.limit) {
      const loading = Math.abs(flow.power) / branch.limit
      const limit = branch.limit * limitFactor

      if (Math.abs(flow.power) > limit) {
        violations.push({
          type: 'overload',
          line: flow.id,
          from: flow.from,
          to: flow.to,
          value: Math.abs(flow.power),
          limit: limit,
          loading: loading,
          violation: Math.abs(flow.power) - limit,
          severity: loading > 1.2 ? 'critical' : 'marginal',
        })
      }
    }
  })

  return violations
}

/**
 * Check generation violations
 * @param {Object} system - System model
 * @param {Object} solution - OPF solution
 * @returns {Array} Generation violations
 */
function checkGenerationViolations(system, solution) {
  const violations = []

  solution.generation.forEach((gen, _i) => {
    if (gen.P < gen.Pmin) {
      violations.push({
        type: 'generation_below_min',
        generator: gen.id,
        value: gen.P,
        limit: gen.Pmin,
        violation: gen.Pmin - gen.P,
        severity: 'marginal',
      })
    } else if (gen.P > gen.Pmax) {
      violations.push({
        type: 'generation_above_max',
        generator: gen.id,
        value: gen.P,
        limit: gen.Pmax,
        violation: gen.P - gen.Pmax,
        severity: 'critical',
      })
    }
  })

  return violations
}

/**
 * Calculate line flows from power flow results
 * @param {Object} system - System model
 * @param {Array} voltages - Voltage results
 * @returns {Array} Line flows
 */
function calculateLineFlows(system, voltages) {
  const flows = []

  system.branches.forEach(branch => {
    const Vfrom = voltages[branch.from]
    const Vto = voltages[branch.to]

    if (Vfrom && Vto) {
      const VfromMag = Math.sqrt(Vfrom.re * Vfrom.re + Vfrom.im * Vfrom.im)
      const VtoMag = Math.sqrt(Vto.re * Vto.re + Vto.im * Vto.im)
      const thetaFrom = Math.atan2(Vfrom.im, Vfrom.re)
      const thetaTo = Math.atan2(Vto.im, Vto.re)
      const _theta = thetaFrom - thetaTo

      // Simplified power flow calculation
      const Z = Math.sqrt(branch.R * branch.R + branch.X * branch.X)
      const VdiffMag = Math.sqrt(
        Math.pow(
          VfromMag * Math.cos(thetaFrom) - VtoMag * Math.cos(thetaTo),
          2
        ) +
          Math.pow(
            VfromMag * Math.sin(thetaFrom) - VtoMag * Math.sin(thetaTo),
            2
          )
      )

      const I = VdiffMag / Z
      const S = VfromMag * I

      flows.push({
        id: branch.id,
        from: branch.from,
        to: branch.to,
        current: I,
        power: S,
        loading: branch.limit ? S / branch.limit : 0,
      })
    }
  })

  return flows
}

/**
 * Determine violation severity
 * @param {Array} violations - All violations
 * @returns {string} Severity level
 */
function determineSeverity(violations) {
  if (violations.some(v => v.severity === 'critical')) {
    return 'critical'
  } else if (violations.some(v => v.severity === 'marginal')) {
    return 'marginal'
  }
  return 'secure'
}

module.exports = {
  evaluateSecurityConstraints,
  evaluateContingency,
  applyContingency,
  updateSystemGeneration,
  checkVoltageViolations,
  checkLineFlowViolations,
  checkGenerationViolations,
  calculateLineFlows,
  determineSeverity,
}
