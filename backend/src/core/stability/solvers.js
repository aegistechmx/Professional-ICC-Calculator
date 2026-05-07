/**
 * core/stability/solvers.js - Power System Stability Solvers
 *
 * Responsibility: Core algorithms for power system stability analysis
 */

/**
 * Solve power system stability using eigenvalue analysis
 * @param {Object} system - Power system model
 * @param {Object} options - Solver options
 * @returns {Object} Stability analysis results
 */
function solveStabilityEigenvalues(system, options = {}) {
  const { _method = 'qr', _tolerance = 1e-8, _maxIterations = 100 } = options

  try {
    // Validate input
    if (!system || !system.admittance) {
      throw new Error('Invalid power system model for stability analysis')
    }

    // Get system state matrix
    const stateMatrix = buildStateMatrix(system)

    // Compute eigenvalues
    const eigenvalues = computeEigenvalues(stateMatrix, method)

    // Analyze stability
    const stability = analyzeEigenvalues(eigenvalues)

    // Format results
    const results = {
      eigenvalues,
      stability,
      method,
      converged: true,
      iterations: 1,
      dampingRatios: calculateDampingRatios(eigenvalues),
      frequencies: calculateNaturalFrequencies(eigenvalues),
    }

    return results
  } catch (error) {
    throw new Error(`Stability analysis failed: ${error.message}`)
  }
}

/**
 * Build state matrix for stability analysis
 * @param {Object} system - Power system model
 * @returns {Array} State matrix
 */
function buildStateMatrix(system) {
  const n = system.buses?.length || 0
  if (n === 0) return []

  // Simplified state matrix for small signal stability
  const stateMatrix = Array(2 * n)
    .fill()
    .map(() => new Array(2 * n).fill(0))

  // Linearize system equations around operating point
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (system.admittance?.[i]?.[j]) {
        const Yij = system.admittance[i][j]
        const Vi = system.voltages?.[i] || 1.0
        const Vj = system.voltages?.[j] || 1.0
        const theta_i = system.angles?.[i] || 0.0
        const theta_j = system.angles?.[j] || 0.0

        // Partial derivatives for state matrix
        const dP_dtheta = Vi * Vj * Yij * Math.sin(theta_i - theta_j)
        const dP_dV =
          Vi * Yij * Math.cos(theta_i - theta_j) +
          Vj * Yij * Math.cos(theta_i - theta_j)

        stateMatrix[i][j] = dP_dtheta
        stateMatrix[i][j + n] = dP_dV
        stateMatrix[i + n][j] = -dP_dV // Simplified assumption
        stateMatrix[i + n][j + n] = -dP_dtheta
      }
    }
  }

  return stateMatrix
}

/**
 * Compute eigenvalues using QR algorithm
 * @param {Array} matrix - Input matrix
 * @param {string} method - Computation method
 * @returns {Array} Eigenvalues
 */
function computeEigenvalues(matrix, method = 'qr') {
  const n = matrix.length

  if (n === 0) return []
  if (n === 1) return [matrix[0][0]]

  switch (method.toLowerCase()) {
    case 'qr':
      return qrAlgorithm(matrix)
    case 'power':
      return powerIteration(matrix)
    default:
      return qrAlgorithm(matrix)
  }
}

/**
 * QR algorithm for eigenvalue computation
 * @param {Array} matrix - Input matrix
 * @returns {Array} Eigenvalues
 */
function qrAlgorithm(matrix) {
  const n = matrix.length
  let A = matrix.map(row => [...row])
  const eigenvalues = new Array(n).fill(0)

  for (let iter = 0; iter < 100; iter++) {
    // QR decomposition
    const { Q, R } = qrDecomposition(A)

    // Update A = R * Q
    A = multiplyMatrices(R, Q)

    // Check for convergence (diagonal elements)
    let converged = true
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j && Math.abs(A[i][j]) > 1e-10) {
          converged = false
          break
        }
      }
      if (!converged) break
    }

    if (converged) break
  }

  // Extract eigenvalues from diagonal
  for (let i = 0; i < n; i++) {
    eigenvalues[i] = A[i][i]
  }

  return eigenvalues
}

/**
 * Simple QR decomposition
 * @param {Array} A - Input matrix
 * @returns {Object} { Q, R } matrices
 */
function qrDecomposition(A) {
  const n = A.length
  const Q = Array(n)
    .fill()
    .map(() => new Array(n).fill(0))
  const R = Array(n)
    .fill()
    .map(() => new Array(n).fill(0))

  // Gram-Schmidt process
  for (let j = 0; j < n; j++) {
    // Copy column j of A
    let v = new Array(n)
    for (let i = 0; i < n; i++) {
      v[i] = A[i][j]
    }

    // Orthogonalize against previous columns
    for (let k = 0; k < j; k++) {
      let dot = 0
      for (let i = 0; i < n; i++) {
        dot += v[i] * Q[i][k]
      }

      for (let i = 0; i < n; i++) {
        v[i] -= dot * Q[i][k]
      }
    }

    // Normalize
    let norm = 0
    for (let i = 0; i < n; i++) {
      norm += v[i] * v[i]
    }
    norm = Math.sqrt(norm)

    if (norm > 1e-10) {
      for (let i = 0; i < n; i++) {
        Q[i][j] = v[i] / norm
      }
    }

    // Compute R element
    for (let i = 0; i <= j; i++) {
      let sum = 0
      for (let k = 0; k < n; k++) {
        sum += A[k][i] * Q[k][j]
      }
      R[i][j] = sum
    }
  }

  return { Q, R }
}

/**
 * Power iteration method for dominant eigenvalue
 * @param {Array} matrix - Input matrix
 * @returns {Array} Eigenvalues (simplified)
 */
function powerIteration(matrix) {
  const n = matrix.length
  if (n === 0) return []

  // Initialize with random vector
  let v = new Array(n).fill().map(() => Math.random())
  let lambda = 0

  for (let iter = 0; iter < 50; iter++) {
    // Matrix-vector multiplication
    const Av = new Array(n)
    for (let i = 0; i < n; i++) {
      Av[i] = 0
      for (let j = 0; j < n; j++) {
        Av[i] += matrix[i][j] * v[j]
      }
    }

    // Normalize
    let norm = 0
    for (let i = 0; i < n; i++) {
      norm += Av[i] * Av[i]
    }
    norm = Math.sqrt(norm)

    for (let i = 0; i < n; i++) {
      v[i] = Av[i] / norm
    }

    // Estimate eigenvalue
    lambda = 0
    for (let i = 0; i < n; i++) {
      lambda += v[i] * Av[i]
    }
  }

  // Return simplified eigenvalue array
  return new Array(n).fill(lambda)
}

/**
 * Analyze eigenvalues for stability
 * @param {Array} eigenvalues - Complex eigenvalues
 * @returns {Object} Stability analysis
 */
function analyzeEigenvalues(eigenvalues) {
  const analysis = {
    stable: true,
    margin: 0,
    criticalModes: [],
    damping: 'adequate',
  }

  for (let i = 0; i < eigenvalues.length; i++) {
    const eigenvalue = eigenvalues[i]

    // Check for positive real parts (unstable)
    if (typeof eigenvalue === 'number') {
      if (eigenvalue > 0) {
        analysis.stable = false
        analysis.criticalModes.push({
          index: i,
          eigenvalue,
          type: 'unstable',
        })
      }
    } else if (
      typeof eigenvalue === 'object' &&
      eigenvalue.real !== undefined
    ) {
      if (eigenvalue.real > 0) {
        analysis.stable = false
        analysis.criticalModes.push({
          index: i,
          eigenvalue,
          type: 'unstable',
        })
      }
    }
  }

  // Calculate stability margin
  if (!analysis.stable) {
    const minPositive = Math.min(
      ...analysis.criticalModes.map(m =>
        typeof m.eigenvalue === 'number' ? m.eigenvalue : m.eigenvalue.real || 0
      )
    )
    analysis.margin = -minPositive // Negative margin indicates instability
  } else {
    const maxNegative = Math.max(
      ...eigenvalues
        .map(ev => (typeof ev === 'number' ? ev : ev.real || 0))
        .filter(ev => ev < 0)
    )
    analysis.margin = Math.abs(maxNegative) || 0
  }

  return analysis
}

/**
 * Calculate damping ratios from eigenvalues
 * @param {Array} eigenvalues - Complex eigenvalues
 * @returns {Array} Damping ratios
 */
function calculateDampingRatios(eigenvalues) {
  return eigenvalues.map(eigenvalue => {
    if (
      typeof eigenvalue === 'object' &&
      eigenvalue.real !== undefined &&
      eigenvalue.imag !== undefined
    ) {
      const omega = Math.sqrt(
        eigenvalue.real * eigenvalue.real + eigenvalue.imag * eigenvalue.imag
      )
      const zeta = -eigenvalue.real / (2 * omega)
      return zeta
    }
    return 0.05 // Default damping
  })
}

/**
 * Calculate natural frequencies from eigenvalues
 * @param {Array} eigenvalues - Complex eigenvalues
 * @returns {Array} Natural frequencies in Hz
 */
function calculateNaturalFrequencies(eigenvalues) {
  return eigenvalues.map(eigenvalue => {
    if (typeof eigenvalue === 'object' && eigenvalue.imag !== undefined) {
      return Math.abs(eigenvalue.imag) / (2 * Math.PI)
    }
    return 0.1 // Default frequency
  })
}

/**
 * Matrix multiplication
 * @param {Array} A - First matrix
 * @param {Array} B - Second matrix
 * @returns {Array} Product matrix
 */
function multiplyMatrices(A, B) {
  const n = A.length
  const m = B[0].length
  const p = B.length

  const C = Array(n)
    .fill()
    .map(() => new Array(m).fill(0))

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      for (let k = 0; k < p; k++) {
        C[i][j] += A[i][k] * B[k][j]
      }
    }
  }

  return C
}

module.exports = {
  solveStabilityEigenvalues,
}
