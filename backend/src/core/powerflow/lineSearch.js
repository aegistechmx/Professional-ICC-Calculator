/**
 * lineSearch.js - Line search with backtracking for NR stability
 *
 * Responsibility: Reduce step size if mismatch increases
 * NO Express, NO axios, NO UI logic
 */

/**
 * Apply line search with backtracking
 * @param {Array} V - Current voltage vector
 * @param {Array} delta - Correction vector
 * @param {Function} computeMismatch - Function to calculate mismatch
 * @param {number} maxIter - Maximum line search iterations
 * @returns {Object} { V: updated voltages, alpha: step size }
 */
function lineSearch(V, delta, computeMismatch, maxIter = 10) {
  let alpha = 1.0
  const baseMismatch = computeMismatch(V)

  for (let i = 0; i < maxIter; i++) {
    const Vtrial = applyUpdate(V, delta, alpha)
    const newMismatch = computeMismatch(Vtrial)

    if (newMismatch < baseMismatch) {
      return { V: Vtrial, alpha }
    }

    alpha *= 0.5
  }

  return { V, alpha: 0 } // fallback - no improvement
}

/**
 * Apply voltage update with step size
 * @param {Array} V - Current voltage vector
 * @param {Array} delta - Correction vector
 * @param {number} alpha - Step size multiplier
 * @returns {Array} Updated voltage vector
 */
function applyUpdate(V, delta, alpha) {
  const newV = V.map(v => ({ ...v }))
  let correctionIndex = 0

  // Apply angle corrections
  for (let i = 0; i < V.length; i++) {
    if (correctionIndex < delta.length) {
      const dTheta = parseFloat((delta[correctionIndex] * alpha).toFixed(6))
      const currentMag = parseFloat(Math.hypot(V[i].re, V[i].im).toFixed(6))
      const currentAng = parseFloat(Math.atan2(V[i].im, V[i].re).toFixed(6))
      const newAng = parseFloat((currentAng + dTheta).toFixed(6))

      newV[i].re = parseFloat((currentMag * Math.cos(newAng)).toFixed(6))
      newV[i].im = parseFloat((currentMag * Math.sin(newAng)).toFixed(6))
      correctionIndex++
    }
  }

  return newV
}

module.exports = { lineSearch, applyUpdate }
