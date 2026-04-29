/**
 * trustRegion.js - Trust region control for step size limiting
 * 
 * Responsibility: Limit correction step size to prevent divergence
 * NO Express, NO axios, NO UI logic
 */

/**
 * Apply trust region control to limit step size
 * @param {Array} delta - Correction vector
 * @param {number} maxStep - Maximum allowed step size
 * @returns {Array} Scaled correction vector
 */
function applyTrustRegion(delta, maxStep = 0.2) {
  // Calculate Euclidean norm of correction vector
  const norm = Math.sqrt(delta.reduce((sum, d) => sum + d * d, 0));

  if (norm > maxStep) {
    // Scale down the correction vector
    const scale = maxStep / norm;
    return delta.map(d => d * scale);
  }

  return delta;
}

module.exports = { applyTrustRegion };
