/**
 * governor.js - Governor model for mechanical power control
 *
 * Responsibility: Simplified governor model for generator control
 * NO Express, NO axios, NO UI logic
 */

/**
 * Governor model - Simplified
 */
class GovernorModel {
  constructor(params) {
    this.Tg = params.Tg || 0.3 // Governor time constant
    this.R = params.R || 0.05 // Droop
    this.Pref = params.Pref || params.P || 0.8 // Reference power
    this.Pmax = params.Pmax || 1.5 // Maximum power
    this.Pmin = params.Pmin || 0.2 // Minimum power
    this.Pm = params.Pm || params.P || 0.8 // Mechanical power
  }

  /**
   * Calculate governor output
   * @param {number} omega - Angular velocity
   * @returns {number} Mechanical power derivative
   */
  calculateOutput(omega) {
    // Speed deviation
    const speedError = omega - 1.0

    // Governor differential equation
    const dPm = (this.Pref - this.Pm - this.R * speedError) / this.Tg

    return dPm
  }

  /**
   * Update governor state
   * @param {number} omega - Angular velocity
   * @param {number} dt - Time step
   * @returns {number} New mechanical power
   */
  updateState(omega, dt) {
    const dPm = this.calculateOutput(omega)
    const PmNew = this.Pm + dPm * dt

    // Apply limits
    this.Pm = Math.max(this.Pmin, Math.min(this.Pmax, PmNew))

    return this.Pm
  }

  /**
   * Get current state
   * @returns {Object} Current governor state
   */
  getState() {
    return {
      Tg: this.Tg,
      R: this.R,
      Pref: this.Pref,
      Pmax: this.Pmax,
      Pmin: this.Pmin,
      Pm: this.Pm,
      speedError: this.Pm - this.Pref,
    }
  }

  /**
   * Reset to initial conditions
   */
  reset() {
    this.Pm = this.Pref
  }
}

module.exports = GovernorModel
