/**
 * core/powerflow/newton/solver.js - Newton-Raphson Power Flow Solver
 *
 * Responsibility: Implement Newton-Raphson method for power flow analysis
 */

/**
 * Solve power flow using Newton-Raphson method
 * @param {Object} system - Power system model
 * @param {Object} options - Solver options
 * @returns {Object} Power flow solution
 */
function solveLoadFlowRobust(system, options = {}) {
  const {
    maxIterations = 100,
    tolerance = 1e-6,
    voltageInit = 1.0,
    angleInit = 0.0,
  } = options

  try {
    // Validate input
    if (!system || !system.buses || !system.branches) {
      throw new Error('Invalid power system model')
    }

    const n = system.buses.length
    if (n === 0) {
      return { converged: false, voltages: [], angles: [] }
    }

    // Initialize voltages and angles
    const voltages = new Array(n).fill(voltageInit)
    const angles = new Array(n).fill(angleInit)

    // Set slack bus voltage
    for (let i = 0; i < n; i++) {
      const bus = system.buses[i]
      if (bus && bus.type === 'slack') {
        voltages[i] = bus.voltage || 1.0
        angles[i] = bus.angle || 0.0
        break
      }
    }

    // Build admittance matrix
    const Y = buildAdmittanceMatrix(system)

    // Newton-Raphson iterations with improved convergence
    let converged = false
    let iterations = 0
    let maxMismatch = Infinity
    let previousMismatch = Infinity

    for (iterations = 0; iterations < maxIterations; iterations++) {
      // Calculate power mismatches
      const mismatches = calculatePowerMismatches(system, Y, voltages, angles)

      // Check convergence
      maxMismatch = Math.max(...mismatches.map(m => Math.abs(m)))
      if (maxMismatch < tolerance) {
        converged = true
        break
      }

      // Check for divergence
      if (iterations > 5 && maxMismatch > previousMismatch * 2) {
        break // Diverging
      }
      previousMismatch = maxMismatch

      // Build Jacobian matrix
      const J = buildJacobianMatrix(system, Y, voltages, angles)

      // Solve linear system with better numerical stability
      const corrections = solveLinearSystem(J, mismatches)

      // Update voltages and angles with damping for better convergence
      const dampingFactor = iterations < 5 ? 0.5 : 1.0
      for (let i = 0; i < n; i++) {
        if (i < corrections.length / 2) {
          angles[i] += dampingFactor * corrections[i]
          const voltageCorrection = dampingFactor * corrections[i + n]
          voltages[i] = Math.max(
            0.5,
            Math.min(1.5, voltages[i] + voltageCorrection)
          ) // Clamp voltages
        }
      }
    }

    return {
      converged,
      voltages,
      angles,
      iterations,
      maxMismatch,
      admittanceMatrix: Y,
    }
  } catch (error) {
    throw new Error(`Newton-Raphson solver failed: ${error.message}`)
  }
}

/**
 * Build admittance matrix for power system
 * @param {Object} system - Power system model
 * @returns {Array} Admittance matrix
 */
function buildAdmittanceMatrix(system) {
  const n = system.buses.length
  const Y = Array(n)
    .fill()
    .map(() => new Array(n).fill(0))

  // Initialize diagonal elements
  for (let i = 0; i < n; i++) {
    Y[i][i] = { real: 0, imag: 0 }
  }

  // Add branch contributions
  for (const branch of system.branches || []) {
    const from = branch.from
    const to = branch.to

    if (from >= 0 && from < n && to >= 0 && to < n) {
      const impedance = branch.impedance || { real: 0.01, imag: 0.1 }
      const admittance = {
        real:
          impedance.real /
          (impedance.real * impedance.real + impedance.imag * impedance.imag),
        imag:
          -impedance.imag /
          (impedance.real * impedance.real + impedance.imag * impedance.imag),
      }

      // Off-diagonal elements
      Y[from][to].real -= admittance.real
      Y[from][to].imag -= admittance.imag
      Y[to][from].real -= admittance.real
      Y[to][from].imag -= admittance.imag

      // Diagonal elements
      Y[from][from].real += admittance.real
      Y[from][from].imag += admittance.imag
      Y[to][to].real += admittance.real
      Y[to][to].imag += admittance.imag
    }
  }

  return Y
}

/**
 * Calculate power mismatches
 * @param {Object} system - Power system model
 * @param {Array} Y - Admittance matrix
 * @param {Array} voltages - Voltage magnitudes
 * @param {Array} angles - Voltage angles
 * @returns {Array} Power mismatches
 */
function calculatePowerMismatches(system, Y, voltages, angles) {
  const n = system.buses.length
  const mismatches = new Array(2 * n).fill(0)

  for (let i = 0; i < n; i++) {
    const bus = system.buses[i]
    if (!bus) continue

    // Calculate injected power
    let P_calc = 0
    let Q_calc = 0

    for (let j = 0; j < n; j++) {
      const Vj = voltages[j]
      const Vi = voltages[i]
      const theta_ij = angles[i] - angles[j]
      const Gij = Y[i][j].real
      const Bij = Y[i][j].imag

      P_calc += Vi * Vj * (Gij * Math.cos(theta_ij) + Bij * Math.sin(theta_ij))
      Q_calc += Vi * Vj * (Gij * Math.sin(theta_ij) - Bij * Math.cos(theta_ij))
    }

    // Power mismatches
    const P_spec = bus.power?.P || 0
    const Q_spec = bus.power?.Q || 0

    mismatches[i] = P_spec - P_calc // Real power mismatch
    mismatches[i + n] = Q_spec - Q_calc // Reactive power mismatch
  }

  return mismatches
}

/**
 * Build Jacobian matrix
 * @param {Object} system - Power system model
 * @param {Array} Y - Admittance matrix
 * @param {Array} voltages - Voltage magnitudes
 * @param {Array} angles - Voltage angles
 * @returns {Array} Jacobian matrix
 */
function buildJacobianMatrix(system, Y, voltages, angles) {
  const n = system.buses.length
  const J = Array(2 * n)
    .fill()
    .map(() => new Array(2 * n).fill(0))

  // Simplified Jacobian calculation
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const Vi = voltages[i]
      const Vj = voltages[j]
      const theta_ij = angles[i] - angles[j]
      const Gij = Y[i][j].real
      const Bij = Y[i][j].imag

      // Partial derivatives
      const dP_dtheta =
        Vi * Vj * (-Gij * Math.sin(theta_ij) + Bij * Math.cos(theta_ij))
      const dP_dV = Vj * (Gij * Math.cos(theta_ij) + Bij * Math.sin(theta_ij))
      const dQ_dtheta =
        Vi * Vj * (Gij * Math.cos(theta_ij) + Bij * Math.sin(theta_ij))
      const dQ_dV = Vj * (Gij * Math.sin(theta_ij) - Bij * Math.cos(theta_ij))

      // Fill Jacobian matrix
      if (i === j) {
        J[i][j] = -dQ_dtheta // dQ/dθ
        J[i][j + n] = dQ_dV + 2 * Vi * Y[i][i].imag // dQ/dV
        J[i + n][j] = dP_dtheta // dP/dθ
        J[i + n][j + n] = dP_dV + 2 * Vi * Y[i][i].real // dP/dV
      } else {
        J[i][j] = -dQ_dtheta // dQ/dθ
        J[i][j + n] = dQ_dV // dQ/dV
        J[i + n][j] = dP_dtheta // dP/dθ
        J[i + n][j + n] = dP_dV // dP/dV
      }
    }
  }

  return J
}

/**
 * Solve linear system using Gaussian elimination
 * @param {Array} A - Coefficient matrix
 * @param {Array} b - Right-hand side vector
 * @returns {Array} Solution vector
 */
function solveLinearSystem(A, b) {
  const n = b.length
  const x = new Array(n).fill(0)

  // Forward elimination
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
        maxRow = k
      }
    }

    // Swap rows
    ;[A[i], A[maxRow]] = [A[maxRow], A[i]]
    ;[b[i], b[maxRow]] = [b[maxRow], b[i]]

    // Eliminate column
    for (let k = i + 1; k < n; k++) {
      const factor = A[k][i] / A[i][i]
      for (let j = i; j < n; j++) {
        A[k][j] -= factor * A[i][j]
      }
      b[k] -= factor * b[i]
    }
  }

  // Back substitution
  for (let i = n - 1; i >= 0; i--) {
    x[i] = b[i]
    for (let j = i + 1; j < n; j++) {
      x[i] -= A[i][j] * x[j]
    }
    x[i] /= A[i][i]
  }

  return x
}

module.exports = {
  solveLoadFlowRobust,
  buildAdmittanceMatrix,
  calculatePowerMismatches,
  buildJacobianMatrix,
  solveLinearSystem,
}
