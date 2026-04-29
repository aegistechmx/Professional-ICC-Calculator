/**
 * avr.js - Automatic Voltage Regulator (AVR) model
 * 
 * Responsibility: IEEE Type 1 simplified AVR implementation
 * NO Express, NO axios, NO UI logic
 */

/**
 * AVR model - IEEE Type 1 simplified
 */
class AVRModel {
  constructor(params) {
    this.Ka = params.Ka || 200;              // AVR gain
    this.Ta = params.Ta || 0.05;             // AVR time constant
    this.Vref = params.Vref || 1.0;            // Reference voltage
    this.Vmax = params.Vmax || 5.0;            // Maximum field voltage
    this.Vmin = params.Vmin || 0.0;             // Minimum field voltage
    this.Efd = params.Efd || 1.0;             // Initial field voltage
  }

  /**
   * Calculate AVR output
   * @param {number} V - Terminal voltage
   * @param {number} pssSignal - PSS output signal
   * @returns {number} Field voltage derivative
   */
  calculateOutput(V, pssSignal) {
    // Voltage error with PSS signal
    const error = this.Vref - V + pssSignal;

    // AVR differential equation
    const dEfd = (this.Ka * error - this.Efd) / this.Ta;

    return dEfd;
  }

  /**
   * Update AVR state
   * @param {number} V - Terminal voltage
   * @param {number} pssSignal - PSS output signal
   * @param {number} dt - Time step
   * @returns {number} New field voltage
   */
  updateState(V, pssSignal, dt) {
    const dEfd = this.calculateOutput(V, pssSignal);
    const EfdNew = this.Efd + dEfd * dt;

    // Apply limits
    this.Efd = Math.max(this.Vmin, Math.min(this.Vmax, EfdNew));

    return this.Efd;
  }

  /**
   * Get current state
   * @returns {Object} Current AVR state
   */
  getState() {
    return {
      Efd: this.Efd,
      Vref: this.Vref,
      Ka: this.Ka,
      Ta: this.Ta,
      Vmax: this.Vmax,
      Vmin: this.Vmin
    };
  }

  /**
   * Reset to initial conditions
   */
  reset() {
    this.Efd = 1.0;
  }
}

module.exports = AVRModel;
