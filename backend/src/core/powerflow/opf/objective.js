/**
 * objective.js - Objective function for OPF optimization
 *
 * Responsibility: Calculate total generation cost and gradients
 * NO Express, NO axios, NO UI logic
 */

/**
 * Calculate total generation cost
 * @param {Array} generators - Array of generator objects
 * @returns {number} Total cost ($/hour)
 */
function totalCost(generators) {
  return generators.reduce((sum, gen) => {
    return sum + gen.getCost()
  }, 0)
}

/**
 * Calculate cost gradient for all generators
 * @param {Array} generators - Array of generator objects
 * @returns {Array} Gradient vector (∂C/∂P)
 */
function costGradient(generators) {
  return generators.map(gen => {
    return gen.getMarginalCost()
  })
}

/**
 * Calculate Hessian matrix (second derivatives of cost)
 * @param {Array} generators - Array of generator objects
 * @returns {Array} Hessian matrix (∂²C/∂P²)
 */
function costHessian(generators) {
  const n = generators.length
  const H = Array(n)
    .fill()
    .map(() => Array(n).fill(0))

  for (let i = 0; i < n; i++) {
    // Second derivative of quadratic cost: ∂²C/∂P² = 2a
    H[i][i] = 2 * generators[i].cost.a
  }

  return H
}

/**
 * Calculate incremental cost for small change
 * @param {Array} generators - Array of generator objects
 * @param {Array} deltaP - Change in generation
 * @returns {number} Incremental cost
 */
function incrementalCost(generators, deltaP) {
  let cost = 0

  for (let i = 0; i < generators.length; i++) {
    const gen = generators[i]
    const P_new = gen.P + deltaP[i]
    const { a, b, c } = gen.cost
    cost += a * P_new * P_new + b * P_new + c
  }

  return cost
}

/**
 * Check if cost function is convex
 * @param {Array} generators - Array of generator objects
 * @returns {boolean} True if convex
 */
function isConvex(generators) {
  return generators.every(gen => gen.cost.a > 0)
}

/**
 * Calculate cost reduction from current solution
 * @param {Array} generators - Array of generator objects
 * @param {Array} P_old - Previous generation
 * @returns {number} Cost reduction
 */
function costReduction(generators, P_old) {
  const cost_new = totalCost(generators)

  // Calculate old cost
  let cost_old = 0
  for (let i = 0; i < generators.length; i++) {
    const gen = generators[i]
    const { a, b, c } = gen.cost
    cost_old += a * P_old[i] * P_old[i] + b * P_old[i] + c
  }

  return cost_old - cost_new
}

module.exports = {
  totalCost,
  costGradient,
  costHessian,
  incrementalCost,
  isConvex,
  costReduction,
}
