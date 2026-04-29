/**
 * generator.js - Synchronous generator model for transient stability
 * 
 * Responsibility: Model generator dynamics with swing equation
 * NO Express, NO axios, NO UI logic
 */

/**
 * Synchronous generator model
 * Implements classical swing equation: 2H d²δ/dt² + D dδ/dt = Pm - Pe
 */
class Generator {
  /**
   * Create generator model
   * @param {Object} params - Generator parameters
   * @param {number} params.H - Inertia constant (MW·s/MVA)
   * @param {number} params.D - Damping coefficient (pu)
   * @param {number} params.Pm - Mechanical power input (pu)
   * @param {number} params.xd - Direct axis reactance (pu)
   */
  constructor({ H, D, Pm, xd }) {
    this.H = H;     // Inertia constant
    this.D = D;     // Damping coefficient
    this.Pm = Pm;   // Mechanical power
    this.xd = xd;   // Direct axis reactance

    // State variables
    this.delta = 0;    // Rotor angle (radians)
    this.omega = 1;    // Angular velocity (pu, 1.0 = synchronous)
    this.Pe = 0;     // Electrical power output
  }

  /**
   * Calculate electrical power
   * @param {number} V - Terminal voltage magnitude (pu)
   * @param {number} theta - Terminal voltage angle (radians)
   * @param {number} Eq - Internal voltage magnitude (pu)
   * @returns {number} Electrical power (pu)
   */
  calculateElectricalPower(V, theta, Eq) {
    const deltaDiff = this.delta - theta;
    return (V * Eq / this.xd) * Math.sin(deltaDiff);
  }

  /**
   * Calculate derivatives for swing equation
   * @param {number} V - Terminal voltage magnitude (pu)
   * @param {number} theta - Terminal voltage angle (radians)
   * @param {number} Eq - Internal voltage magnitude (pu)
   * @returns {Object} Derivatives { dDelta, dOmega }
   */
  derivatives(V, theta, Eq) {
    // Electrical power
    this.Pe = this.calculateElectricalPower(V, theta, Eq);

    // Swing equation: 2H d²δ/dt² + D dδ/dt = Pm - Pe
    const dDelta = this.omega - 1;  // dδ/dt = ω - ωsynchronous

    const dOmega = (this.Pm - this.Pe - this.D * (this.omega - 1)) / (2 * this.H);

    return { dDelta, dOmega };
  }

  /**
   * Update generator state using Euler method
   * @param {number} V - Terminal voltage magnitude (pu)
   * @param {number} theta - Terminal voltage angle (radians)
   * @param {number} Eq - Internal voltage magnitude (pu)
   * @param {number} dt - Time step (seconds)
   */
  updateEuler(V, theta, Eq, dt) {
    const { dDelta, dOmega } = this.derivatives(V, theta, Eq);

    this.delta += dDelta * dt;
    this.omega += dOmega * dt;
  }

  /**
   * Update generator state using RK4 method
   * @param {number} V - Terminal voltage magnitude (pu)
   * @param {number} theta - Terminal voltage angle (radians)
   * @param {number} Eq - Internal voltage magnitude (pu)
   * @param {number} dt - Time step (seconds)
   */
  updateRK4(V, theta, Eq, dt) {
    // RK4 coefficients
    const k1 = this.derivatives(V, theta, Eq);
    
    const temp1 = {
      delta: this.delta + k1.dDelta * dt / 2,
      omega: this.omega + k1.dOmega * dt / 2
    };
    
    const k2 = this.derivatives(V, theta, Eq);
    
    const temp2 = {
      delta: this.delta + k2.dDelta * dt / 2,
      omega: this.omega + k2.dOmega * dt / 2
    };
    
    const k3 = this.derivatives(V, theta, Eq);
    
    const temp3 = {
      delta: this.delta + k3.dDelta * dt,
      omega: this.omega + k3.dOmega * dt
    };
    
    const k4 = this.derivatives(V, theta, Eq);
    
    // Final update
    this.delta += (dt / 6) * (k1.dDelta + 2*k2.dDelta + 2*k3.dDelta + k4.dDelta);
    this.omega += (dt / 6) * (k1.dOmega + 2*k2.dOmega + 2*k3.dOmega + k4.dOmega);
  }

  /**
   * Check if generator is unstable
   * @returns {boolean} True if angle exceeds π radians
   */
  isUnstable() {
    return Math.abs(this.delta) > Math.PI;
  }

  /**
   * Get generator state
   * @returns {Object} Current state
   */
  getState() {
    return {
      delta: this.delta,
      omega: this.omega,
      Pe: this.Pe,
      unstable: this.isUnstable()
    };
  }

  /**
   * Reset generator to initial conditions
   */
  reset() {
    this.delta = 0;
    this.omega = 1;
    this.Pe = 0;
  }
}

module.exports = Generator;
