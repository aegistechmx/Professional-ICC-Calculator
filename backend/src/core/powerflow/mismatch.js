/**
 * calcMismatch.js - Pure mathematical power mismatch calculation
 *
 * Responsibility: ONLY calculates P and Q mismatches from voltages and G/B matrices
 * NO Express, NO axios, NO UI logic
 *
 * Architecture:
 * Voltages + G/B matrices → Power Injections → Mismatch Vector
 */

/**
 * Calculate power mismatches using G/B matrices
 * @param {Array} V - Voltage vector with complex numbers { re, im }
 * @param {Array} G - Conductance matrix (real part of Ybus)
 * @param {Array} B - Susceptance matrix (imaginary part of Ybus)
 * @param {Array} buses - Array of buses with { type, P, Q }
 * @returns {Object} Object with { P, Q, dP, dQ }
 */
function calcMismatch(V, G, B, buses) {
  const n = V.length

  // Calculate power injections
  const P = Array(n).fill(0)
  const Q = Array(n).fill(0)

  for (let i = 0; i < n; i++) {
    const Vi = V[i]
    const magVi = Math.hypot(Vi.re, Vi.im)
    const angVi = Math.atan2(Vi.im, Vi.re)

    for (let j = 0; j < n; j++) {
      const Vj = V[j]
      const Gij = G[i][j]
      const Bij = B[i][j]

      const magVj = Math.hypot(Vj.re, Vj.im)
      const angVj = Math.atan2(Vj.im, Vj.re)

      const theta = angVi - angVj

      P[i] += magVi * magVj * (Gij * Math.cos(theta) + Bij * Math.sin(theta))

      Q[i] += magVi * magVj * (Gij * Math.sin(theta) - Bij * Math.cos(theta))
    }
  }

  // Calculate mismatches
  const dP = []
  const dQ = []

  buses.forEach((bus, i) => {
    if (bus.type !== 'Slack') {
      dP.push(bus.P - P[i])
    }
  })

  buses.forEach((bus, i) => {
    if (bus.type === 'PQ') {
      dQ.push(bus.Q - Q[i])
    }
  })

  return { P, Q, dP, dQ }
}

module.exports = { calcMismatch }
