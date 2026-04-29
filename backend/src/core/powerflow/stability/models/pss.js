/**
 * pss.js - Power System Stabilizer (PSS) model
 *
 * Responsibility: Simplified PSS implementation for stability enhancement
 * NO Express, NO axios, NO UI logic
 */

/**
 * PSS model - Simplified
 */
class PSSModel {
  constructor(params) {
    this.K = params.K || 10 // PSS gain
    this.Tw = params.Tw || 10 // Washout time constant
    this.T1 = params.T1 || 0.1 // Lead time constant 1
    this.T2 = params.T2 || 0.05 // Lead time constant 2
    this.T3 = params.T3 || 1.0 // Lag time constant
    this.output = 0 // PSS output signal
  }

  /**
   * Calculate PSS output
   * @param {number} omega - Angular velocity deviation
   * @returns {number} PSS output signal
   */
  calculateOutput(omega) {
    // Speed deviation (input to PSS)
    const speedError = omega - 1.0

    // Washout filter
    const washoutOutput = this.washoutFilter(speedError)

    // Lead-lag compensation
    const leadLagOutput = this.leadLagFilter(washoutOutput)

    // Lag filter
    const pssSignal = this.lagFilter(leadLagOutput)

    this.output = this.K * pssSignal

    return this.output
  }

  /**
   * Washout filter for PSS
   * @param {number} input - Input signal
   * @returns {number} Washout output
   */
  washoutFilter(input) {
    // Simple washout implementation
    const output = input / (1 + this.Tw * Math.abs(input))
    return output
  }

  /**
   * Lead-lag filter for PSS
   * @param {number} input - Input signal
   * @returns {number} Lead-lag output
   */
  leadLagFilter(input) {
    // Simplified lead-lag implementation
    const output = (input * (1 + this.T1)) / (1 + this.T2)
    return output
  }

  /**
   * Lag filter for PSS
   * @param {number} input - Input signal
   * @returns {number} Lag output
   */
  lagFilter(input) {
    // Simple lag implementation
    const output = input / (1 + this.T3)
    return output
  }

  /**
   * Get current state
   * @returns {Object} Current PSS state
   */
  getState() {
    return {
      K: this.K,
      Tw: this.Tw,
      T1: this.T1,
      T2: this.T2,
      T3: this.T3,
      output: this.output,
    }
  }

  /**
   * Reset to initial conditions
   */
  reset() {
    this.output = 0
  }
}

module.exports = PSSModel
