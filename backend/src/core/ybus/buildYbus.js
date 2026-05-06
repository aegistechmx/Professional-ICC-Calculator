/**
 * buildYbus.js - Pure mathematical Ybus construction
 *
 * Responsibility: ONLY builds Ybus admittance matrix from system data
 * NO Express, NO axios, NO UI logic
 *
 * Architecture:
 * System Data → Impedance Calculation → Admittance Matrix → G/B Matrices
 */

/**
 * Build Ybus admittance matrix
 * @param {Object} system - Power system data
 * @param {Array} system.buses - Array of buses
 * @param {Array} system.branches - Array of branches with { from, to, R, X }
 * @returns {Object} Object with { Y, G, B } matrices
 * @throws {Error} If invalid impedance or indices
 */
function buildYbus(system) {
  const n = system.buses.length

  // Pre-validate all branch impedances
  system.branches.forEach((branch, idx) => {
    const { from, to, R, X } = branch

    if (!isFinite(R) || !isFinite(X)) {
      throw new Error(`Branch ${idx} invalid impedance: R=${R}, X=${X}`) // impedance (Ω)
      // impedance (Ω)
    }

    if (R === 0 && X === 0) {
      throw new Error(
        `Branch ${idx} (${from}→${to}) has zero impedance: R=0, X=0` // impedance (Ω)
      )
      // impedance (Ω)
    }
  })

  // Initialize Ybus with zeros
  const Y = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => ({ re: 0, im: 0 }))
  )

  // Build Ybus from branches
  system.branches.forEach(branch => {
    const { from, to, R, X } = branch

    // Validate indices
    if (from < 0 || from >= n || to < 0 || to >= n) {
      throw new Error(`Invalid bus indices: from=${from}, to=${to}, n=${n}`)
    }

    // Calculate admittance: y = 1 / (R + jX) = (R - jX) / (R² + X²)
    const denom = R * R + X * X
    const y = {
      re: R / denom,
      im: -X / denom,
    }

    // Off-diagonal elements (negative admittance)
    Y[from][to].re -= y.re
    Y[from][to].im -= y.im

    Y[to][from].re -= y.re
    Y[to][from].im -= y.im

    // Diagonal elements (sum of connected admittances)
    Y[from][from].re += y.re
    Y[from][from].im += y.im

    Y[to][to].re += y.re
    Y[to][to].im += y.im
  })

  // Extract G and B matrices
  const G = Array.from({ length: n }, () => Array(n).fill(0))
  const B = Array.from({ length: n }, () => Array(n).fill(0))

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      G[i][j] = Y[i][j].re
      B[i][j] = Y[i][j].im
    }
  }

  return { Y, G, B }
}

module.exports = { buildYbus }
