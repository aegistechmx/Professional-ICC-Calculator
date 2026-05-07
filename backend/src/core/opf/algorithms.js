/**
 * core/opf/algorithms.js - Optimal Power Flow Algorithms
 *
 * Responsibility: Core OPF calculation algorithms
 */

/**
 * Solve Optimal Power Flow problem
 * @param {Object} system - Power system model
 * @param {Object} options - Solver options
 * @returns {Object} OPF solution results
 */
function solveOPF(system, options = {}) {
  const {
    maxIterations = 100,
    tolerance = 1e-6,
    _method = 'interior-point',
  } = options

  try {
    // Validate input
    if (!system || !system.buses || !system.branches) {
      throw new Error('Invalid power system model')
    }

    // Initialize variables
    const nBuses = system.buses.length
    const _nBranches = system.branches.length

    // Power flow initialization
    const voltage = new Array(nBuses).fill(1.0) // p.u.
    const angle = new Array(nBuses).fill(0.0) // radians
    const generation = new Array(nBuses).fill(0.0)

    // OPF optimization loop
    let iteration = 0
    let converged = false

    while (iteration < maxIterations && !converged) {
      // Power flow calculation
      const _powerFlow = calculatePowerFlow(system, voltage, angle)

      // Gradient and Hessian calculation
      const gradient = calculateGradient(system, voltage, angle, generation)
      const hessian = calculateHessian(system, voltage, angle)

      // Newton step
      const step = solveLinearSystem(hessian, gradient)

      // Update variables
      for (let i = 0; i < nBuses; i++) {
        if (i < step.length) voltage[i] += step[i]
        if (i + nBuses < step.length) angle[i] += step[i + nBuses]
        if (i + 2 * nBuses < step.length) generation[i] += step[i + 2 * nBuses]
      }

      // Check convergence
      const maxMismatch = Math.max(...step.map(Math.abs))
      converged = maxMismatch < tolerance

      iteration++
    }

    // Format results
    const results = {
      converged,
      iterations: iteration,
      voltages: voltage,
      angles: angle,
      generation: generation,
      cost: calculateTotalCost(system, generation),
      constraints: checkConstraints(system, voltage, angle, generation),
    }

    return results
  } catch (error) {
    throw new Error(`OPF calculation failed: ${error.message}`)
  }
}

/**
 * Calculate power flow for current state
 * @param {Object} system - Power system
 * @param {Array} voltage - Voltage magnitudes
 * @param {Array} angle - Voltage angles
 * @returns {Object} Power flow results
 */
function calculatePowerFlow(system, voltage, angle) {
  const nBuses = system.buses.length
  const P = new Array(nBuses).fill(0)
  const Q = new Array(nBuses).fill(0)

  // Calculate power injections
  for (let i = 0; i < nBuses; i++) {
    for (let j = 0; j < nBuses; j++) {
      if (i !== j) {
        const Yij =
          system.admittance &&
          system.admittance[i] &&
          system.admittance[i][j] !== undefined
            ? system.admittance[i][j]
            : 0
        const Vij = voltage[i] * voltage[j]
        const theta_ij = angle[i] - angle[j]

        P[i] += Vij * Yij * Math.cos(theta_ij)
        Q[i] += Vij * Yij * Math.sin(theta_ij)
      }
    }
  }

  return { P, Q }
}

/**
 * Calculate gradient of objective function
 * @param {Object} system - Power system
 * @param {Array} voltage - Voltage magnitudes
 * @param {Array} angle - Voltage angles
 * @param {Array} generation - Generation values
 * @returns {Array} Gradient vector
 */
function calculateGradient(system, voltage, angle, generation) {
  const nBuses = system.buses.length
  const gradient = new Array(3 * nBuses).fill(0)

  // Objective: minimize generation cost
  for (let i = 0; i < nBuses; i++) {
    if (system.buses[i].type === 'generator') {
      const costCoeff = system.buses[i].cost || { a: 0.01, b: 10, c: 100 }
      gradient[i + 2 * nBuses] = 2 * costCoeff.a * generation[i] + costCoeff.b
    }
  }

  return gradient
}

/**
 * Calculate Hessian matrix
 * @param {Object} system - Power system
 * @param {Array} voltage - Voltage magnitudes
 * @param {Array} angle - Voltage angles
 * @returns {Array} Hessian matrix
 */
function calculateHessian(system, _voltage, _angle) {
  const nBuses = system.buses.length
  const size = 3 * nBuses
  const hessian = Array(size)
    .fill()
    .map(() => new Array(size).fill(0))

  // Second derivatives of cost function
  for (let i = 0; i < nBuses; i++) {
    if (system.buses[i].type === 'generator') {
      const costCoeff = system.buses[i].cost || { a: 0.01, b: 10, c: 100 }
      hessian[i + 2 * nBuses][i + 2 * nBuses] = 2 * costCoeff.a
    }
  }

  return hessian
}

/**
 * Solve linear system using Gaussian elimination
 * @param {Array} A - Coefficient matrix
 * @param {Array} b - Right-hand side vector
 * @returns {Array} Solution vector
 */
function solveLinearSystem(A, b) {
  const n = b.length
  const x = [...b]

  // Forward elimination
  for (let i = 0; i < n; i++) {
    // Partial pivoting
    let maxRow = i
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
        maxRow = k
      }
    }

    // Swap rows
    ;[A[i], A[maxRow]] = [A[maxRow], A[i]]
    ;[x[i], x[maxRow]] = [x[maxRow], x[i]]

    // Eliminate column
    for (let k = i + 1; k < n; k++) {
      const factor = A[k][i] / A[i][i]
      for (let j = i; j < n; j++) {
        A[k][j] -= factor * A[i][j]
      }
      x[k] -= factor * x[i]
    }
  }

  // Back substitution
  for (let i = n - 1; i >= 0; i--) {
    for (let j = i + 1; j < n; j++) {
      x[i] -= A[i][j] * x[j]
    }
    x[i] /= A[i][i]
  }

  return x
}

/**
 * Calculate total generation cost
 * @param {Object} system - Power system
 * @param {Array} generation - Generation values
 * @returns {number} Total cost
 */
function calculateTotalCost(system, generation) {
  let totalCost = 0

  for (let i = 0; i < system.buses.length; i++) {
    if (system.buses[i].type === 'generator') {
      const costCoeff = system.buses[i].cost || { a: 0.01, b: 10, c: 100 }
      const Pg = generation[i]
      totalCost += costCoeff.a * Pg * Pg + costCoeff.b * Pg + costCoeff.c
    }
  }

  return totalCost
}

/**
 * Check system constraints
 * @param {Object} system - Power system
 * @param {Array} voltage - Voltage magnitudes
 * @param {Array} angle - Voltage angles
 * @param {Array} generation - Generation values
 * @returns {Object} Constraint violations
 */
function checkConstraints(system, voltage, angle, generation) {
  const violations = {
    voltage: [],
    generation: [],
    flow: [],
  }

  // Voltage limits
  for (let i = 0; i < system.buses.length; i++) {
    const bus = system.buses[i]
    if (bus.voltageLimits) {
      if (voltage[i] < bus.voltageLimits.min) {
        violations.voltage.push({
          bus: i,
          type: 'low',
          value: voltage[i],
          limit: bus.voltageLimits.min,
        })
      }
      if (voltage[i] > bus.voltageLimits.max) {
        violations.voltage.push({
          bus: i,
          type: 'high',
          value: voltage[i],
          limit: bus.voltageLimits.max,
        })
      }
    }
  }

  // Generation limits
  for (let i = 0; i < system.buses.length; i++) {
    const bus = system.buses[i]
    if (bus.type === 'generator' && bus.generationLimits) {
      if (generation[i] < bus.generationLimits.min) {
        violations.generation.push({
          bus: i,
          type: 'low',
          value: generation[i],
          limit: bus.generationLimits.min,
        })
      }
      if (generation[i] > bus.generationLimits.max) {
        violations.generation.push({
          bus: i,
          type: 'high',
          value: generation[i],
          limit: bus.generationLimits.max,
        })
      }
    }
  }

  return violations
}

module.exports = {
  solveOPF,
}
