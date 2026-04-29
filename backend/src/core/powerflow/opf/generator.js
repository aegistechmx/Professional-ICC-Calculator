/**
 * generator.js - Generator model for OPF with cost functions
 *
 * Responsibility: Model generator cost curves and constraints
 * NO Express, NO axios, NO UI logic
 */

/**
 * Generator model for economic dispatch
 */
class Generator {
  /**
   * Create generator model
   * @param {Object} params - Generator parameters
   * @param {number} params.id - Generator ID
   * @param {number} params.Pmin - Minimum generation (MW)
   * @param {number} params.Pmax - Maximum generation (MW)
   * @param {Object} params.cost - Cost coefficients
   * @param {number} params.cost.a - Quadratic coefficient ($/MW²)
   * @param {number} params.cost.b - Linear coefficient ($/MW)
   * @param {number} params.cost.c - Fixed coefficient ($)
   * @param {number} params.bus - Bus ID where generator is connected
   */
  constructor({ id, Pmin, Pmax, cost, bus }) {
    this.id = id
    this.Pmin = Pmin
    this.Pmax = Pmax
    this.bus = bus

    // Cost function: C(P) = a*P² + b*P + c
    this.cost = {
      a: cost.a || 0.01,
      b: cost.b || 10.0,
      c: cost.c || 100.0,
    }

    // Current operating point
    this.P = Pmin // Start at minimum
    this.Q = 0 // Reactive power
  }

  /**
   * Calculate generation cost
   * @param {number} P - Generation output (MW)
   * @returns {number} Cost ($/hour)
   */
  getCost(P = this.P) {
    const { a, b, c } = this.cost
    return a * P * P + b * P + c
  }

  /**
   * Calculate marginal cost (derivative of cost)
   * @param {number} P - Generation output (MW)
   * @returns {number} Marginal cost ($/MWh)
   */
  getMarginalCost(P = this.P) {
    const { a, b } = this.cost
    return 2 * a * P + b
  }

  /**
   * Set generation within limits
   * @param {number} P - Desired generation
   * @returns {number} Clipped generation
   */
  setGeneration(P) {
    this.P = Math.max(this.Pmin, Math.min(this.Pmax, P))
    return this.P
  }

  /**
   * Check if generation is within limits
   * @returns {boolean} True if within limits
   */
  isWithinLimits() {
    return this.P >= this.Pmin && this.P <= this.Pmax
  }

  /**
   * Get generator state
   * @returns {Object} Current state
   */
  getState() {
    return {
      id: this.id,
      bus: this.bus,
      P: this.P,
      Q: this.Q,
      Pmin: this.Pmin,
      Pmax: this.Pmax,
      cost: this.getCost(),
      marginalCost: this.getMarginalCost(),
      withinLimits: this.isWithinLimits(),
    }
  }

  /**
   * Reset to initial conditions
   */
  reset() {
    this.P = this.Pmin
    this.Q = 0
  }
}

module.exports = Generator
