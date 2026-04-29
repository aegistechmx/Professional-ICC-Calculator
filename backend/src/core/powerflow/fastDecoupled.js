/**
 * fastDecoupled.js - Fast Decoupled Load Flow implementation
 *
 * Responsibility: Implement FDLF with B' and B'' matrices
 * Physical assumption: X >> R, decouple P-θ and Q-V equations
 * NO Express, NO axios, NO UI logic
 */

const { toElectricalPrecision } = require('../../shared/utils/electricalUtils')
const { buildYbus } = require('../ybus/buildYbus')

/**
 * Build B' matrix (for angle equations)
 * @param {Array} B - Susceptance matrix
 * @param {Array} slackIndex - Slack bus index
 * @returns {Object} { Bp, indices }
 */
function buildBprime(B, slackIndex) {
  const n = B.length
  const indices = []

  for (let i = 0; i < n; i++) {
    if (i !== slackIndex) indices.push(i)
  }

  const size = indices.length
  const Bp = Array(size)
    .fill(null)
    .map(() => Array(size).fill(0))

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      Bp[i][j] = -B[indices[i]][indices[j]]
    }
  }

  return { Bp, indices }
}

/**
 * Build B'' matrix (for voltage equations)
 * @param {Array} B - Susceptance matrix
 * @param {Array} pqBuses - PQ bus indices
 * @returns {Object} { Bpp, indices }
 */
function buildBdoubleprime(B, pqBuses) {
  const size = pqBuses.length
  const Bpp = Array(size)
    .fill(null)
    .map(() => Array(size).fill(0))

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      Bpp[i][j] = -B[pqBuses[i]][pqBuses[j]]
    }
  }

  return { Bpp, indices: pqBuses }
}

/**
 * Solve Fast Decoupled Load Flow
 * @param {Object} system - Power system data
 * @param {Array} system.buses - Array of buses
 * @param {Array} system.branches - Array of branches
 * @param {Object} options - Solver options
 * @returns {Object} Solution results
 */
function solveFDLF(system, options = {}) {
  const {
    tolerance = 1e-6,
    maxIterations = 30,
    acceleration = 1.0, // Acceleration factor
  } = options

  // Build Ybus and extract G/B matrices
  const { Y: _Y, G, B } = buildYbus(system)

  // Identify bus types
  const slack = []
  const pv = []
  const pq = []

  system.buses.forEach((b, i) => {
    if (b.type === 'Slack') slack.push(i)
    else if (b.type === 'PV') pv.push(i)
    else if (b.type === 'PQ') pq.push(i)
  })

  const slackIndex = slack.length > 0 ? slack[0] : -1
  const _pvBuses = pv
  const pqBuses = pq

  // Build decoupled matrices
  const { Bp, indices: _angleIndices } = buildBprime(B, slackIndex)
  const { Bpp, indices: _voltageIndices } = buildBdoubleprime(B, pqBuses)

  // Initialize voltages
  const V = system.buses.map(bus => {
    if (bus.type === 'Slack') {
      const mag = toElectricalPrecision(bus.voltage?.magnitude || 1.0)
      const ang = toElectricalPrecision(
        ((bus.voltage?.angle || 0) * Math.PI) / 180
      )
      return {
        re: toElectricalPrecision(mag * Math.cos(ang)),
        im: toElectricalPrecision(mag * Math.sin(ang)),
      }
    } else {
      return { re: 1.0, im: 0.0 }
    }
  })

  // Helper functions
  const getV = i => Math.sqrt(V[i].re ** 2 + V[i].im ** 2)
  const getTheta = i => Math.atan2(V[i].im, V[i].re)

  // FDLF iteration
  let converged = false
  let iterations = 0
  let maxMismatch = Infinity

  for (let iter = 0; iter < maxIterations; iter++) {
    iterations = iter + 1

    // Calculate power injections
    const P = Array(system.buses.length).fill(0)
    const Q = Array(system.buses.length).fill(0)

    for (let i = 0; i < system.buses.length; i++) {
      const Vi = getV(i)
      const angVi = getTheta(i)

      for (let j = 0; j < system.buses.length; j++) {
        const Vj = getV(j)
        const angVj = getTheta(j)
        const theta = angVi - angVj

        P[i] +=
          Vi * Vj * (G[i][j] * Math.cos(theta) + B[i][j] * Math.sin(theta))
        Q[i] +=
          Vi * Vj * (G[i][j] * Math.sin(theta) - B[i][j] * Math.cos(theta))
      }
    }

    // Calculate mismatches
    const dP = []
    const dQ = []

    // P mismatches (all except slack)
    for (let i = 0; i < system.buses.length; i++) {
      if (i !== slackIndex) {
        dP.push(system.buses[i].P - P[i])
      }
    }

    // Q mismatches (only PQ buses)
    for (let i = 0; i < pqBuses.length; i++) {
      const busIdx = pqBuses[i]
      dQ.push(system.buses[busIdx].Q - Q[busIdx])
    }

    const allMismatches = [...dP, ...dQ]
    maxMismatch = Math.max(...allMismatches.map(Math.abs))

    if (maxMismatch < tolerance) {
      converged = true
      break
    }

    // Solve decoupled systems
    // Δθ = B'⁻¹ * ΔP
    const deltaTheta = solveLinearSystem(Bp, dP)

    // ΔV = B''⁻¹ * ΔQ
    const deltaV = solveLinearSystem(Bpp, dQ)

    // Apply updates with acceleration
    // Update angles (all except slack)
    let correctionIndex = 0
    for (let i = 0; i < system.buses.length; i++) {
      if (i !== slackIndex && correctionIndex < deltaTheta.length) {
        const dTheta_i = toElectricalPrecision(deltaTheta[correctionIndex] * acceleration)
        const currentMag = toElectricalPrecision(getV(i))
        const currentAng = toElectricalPrecision(getTheta(i))
        const newAng = toElectricalPrecision(currentAng + dTheta_i)

        V[i].re = toElectricalPrecision(currentMag * Math.cos(newAng))
        V[i].im = toElectricalPrecision(currentMag * Math.sin(newAng))
        correctionIndex++
      }
    }

    // Update voltages (only PQ buses)
    correctionIndex = 0
    for (let i = 0; i < pqBuses.length; i++) {
      if (correctionIndex < deltaV.length) {
        const busIdx = pqBuses[i]
        const dV_i = toElectricalPrecision(deltaV[correctionIndex] * acceleration)
        const currentMag = toElectricalPrecision(getV(busIdx))
        const currentAng = toElectricalPrecision(getTheta(busIdx))
        const newMag = toElectricalPrecision(currentMag + dV_i)

        V[busIdx].re = toElectricalPrecision(newMag * Math.cos(currentAng))
        V[busIdx].im = toElectricalPrecision(newMag * Math.sin(currentAng))
        correctionIndex++
      }
    }
  }

  return {
    converged,
    iterations,
    maxMismatch,
    voltages: V,
    solver: 'FastDecoupledLoadFlow',
  }
}

/**
 * Solve linear system using Gaussian elimination
 * @param {Array} A - Coefficient matrix
 * @param {Array} b - Right-hand side vector
 * @returns {Array} Solution vector
 */
function solveLinearSystem(A, b) {
  const n = b.length
  const augmented = Array.from({ length: n }, () => Array(n + 1).fill(0))

  // Build augmented matrix
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      augmented[i][j] = A[i][j]
    }
    augmented[i][n] = b[i]
  }

  // Gaussian elimination with partial pivoting
  for (let k = 0; k < n; k++) {
    // Find pivot
    let maxRow = k
    let maxVal = Math.abs(augmented[k][k])
    for (let i = k + 1; i < n; i++) {
      if (Math.abs(augmented[i][k]) > maxVal) {
        maxVal = Math.abs(augmented[i][k])
        maxRow = i
      }
    }

    // Swap rows
    if (maxRow !== k) {
      ;[augmented[k], augmented[maxRow]] = [augmented[maxRow], augmented[k]]
    }

    // Handle singular matrix
    if (Math.abs(augmented[k][k]) < 1e-12) {
      augmented[k][k] = augmented[k][k] !== 0 ? augmented[k][k] + 1e-10 : 1e-10
    }

    // Eliminate column
    for (let i = k + 1; i < n; i++) {
      const factor = augmented[i][k] / augmented[k][k]
      for (let j = k; j <= n; j++) {
        augmented[i][j] -= factor * augmented[k][j]
      }
    }
  }

  // Back substitution
  const x = Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let sum = augmented[i][n]
    for (let j = i + 1; j < n; j++) {
      sum -= augmented[i][j] * x[j]
    }
    x[i] = sum / augmented[i][i]
  }

  return x
}

module.exports = { solveFDLF }
