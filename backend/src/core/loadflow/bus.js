/**
 * Bus model for load flow analysis
 * Represents electrical buses (nodes) in power system
 */

const BUS_TYPES = {
  SLACK: 'slack', // Reference bus (swing bus) - fixed V and angle
  PV: 'pv',       // Generator bus - fixed P and V
  PQ: 'pq'        // Load bus - fixed P and Q
};

class Bus {
  /**
   * Create a bus instance
   * @param {Object} params - Bus parameters
   * @param {string} params.id - Bus identifier
   * @param {string} params.tipo - Bus type (slack, pv, pq)
   * @param {number} [params.V=1.0] - Voltage magnitude (per unit)
   * @param {number} [params.ang=0.0] - Voltage angle (radians)
   * @param {number} [params.P=0.0] - Active power injection (per unit)
   * @param {number} [params.Q=0.0] - Reactive power injection (per unit)
   * @param {number} [params.Pg=0.0] - Active power generation (per unit)
   * @param {number} [params.Qg=0.0] - Reactive power generation (per unit)
   * @param {number} [params.Pd=0.0] - Active power demand (per unit)
   * @param {number} [params.Qd=0.0] - Reactive power demand (per unit)
   * @param {number} [params.Vmin=0.95] - Minimum voltage limit (per unit)
   * @param {number} [params.Vmax=1.05] - Maximum voltage limit (per unit)
   * @param {number} [params.Qmin=-1.0] - Minimum reactive power limit (per unit)
   * @param {number} [params.Qmax=1.0] - Maximum reactive power limit (per unit)
   */
  constructor({
    id,
    tipo,
    V = 1.0,
    ang = 0.0,
    P = 0.0,
    Q = 0.0,
    Pg = 0.0,
    Qg = 0.0,
    Pd = 0.0,
    Qd = 0.0,
    Vmin = 0.95,
    Vmax = 1.05,
    Qmin = -1.0,
    Qmax = 1.0
  }) {
    this.id = id;
    this.tipo = tipo;
    this.V = V;
    this.ang = ang;
    this.P = P;
    this.Q = Q;
    this.Pg = Pg;
    this.Qg = Qg;
    this.Pd = Pd;
    this.Qd = Qd;
    this.Vmin = Vmin;
    this.Vmax = Vmax;
    this.Qmin = Qmin;
    this.Qmax = Qmax;
  }

  /**
   * Get net active power injection
   * @returns {number} P = Pg - Pd
   */
  getPnet() {
    return this.Pg - this.Pd;
  }

  /**
   * Get net reactive power injection
   * @returns {number} Q = Qg - Qd
   */
  getQnet() {
    return this.Qg - this.Qd;
  }

  /**
   * Check if voltage is within limits
   * @returns {boolean} True if voltage is within limits
   */
  voltajeEnLimites() {
    return this.V >= this.Vmin && this.V <= this.Vmax;
  }

  /**
   * Check if reactive power is within limits
   * @returns {boolean} True if Q is within limits
   */
  qEnLimites() {
    return this.Qg >= this.Qmin && this.Qg <= this.Qmax;
  }

  /**
   * Convert to JSON
   * @returns {Object} Bus data
   */
  toJSON() {
    return {
      id: this.id,
      tipo: this.tipo,
      V: this.V,
      ang: this.ang,
      P: this.P,
      Q: this.Q,
      Pg: this.Pg,
      Qg: this.Qg,
      Pd: this.Pd,
      Qd: this.Qd
    };
  }
}

module.exports = {
  Bus,
  BUS_TYPES
};
