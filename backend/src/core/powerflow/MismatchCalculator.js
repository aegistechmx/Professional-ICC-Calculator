const logger = require('@/infrastructure/logger/logger');

/**
 * MismatchCalculator - Pure mathematical power mismatch calculation
 * Responsibility: ONLY calculates P and Q mismatches from voltages and Ybus
 */
class MismatchCalculator {
  /**
   * Calculate power mismatches
   * @param {Array} V - Voltage vector (Complex objects)
   * @param {Array} Y - Ybus matrix (Complex objects)
   * @param {Array} buses - Bus data
   * @param {number} Sbase - System base MVA
   * @returns {Object} - Mismatch arrays { P, Q }
   */
  static calculate(V, Y, buses, Sbase = 100) {
    const n = buses.length;

    // Calculate calculated power injections
    const P_calc = Array(n).fill(0);
    const Q_calc = Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const Yij = Y[i][j];
        const Vi = V[i];
        const Vj = V[j];
        
        if (!Vi || !Vj) continue;

        const Vi_mag = Vi.mag();
        const Vj_mag = Vj.mag();
        const theta_i = Vi.angle();
        const theta_j = Vj.angle();
        const theta_ij = theta_i - theta_j;

        if (Vi_mag > 0 && Vj_mag > 0) {
          P_calc[i] += Vi_mag * Vj_mag * (Yij.re * Math.cos(theta_ij) + Yij.im * Math.sin(theta_ij));
          Q_calc[i] += Vi_mag * Vj_mag * (Yij.re * Math.sin(theta_ij) - Yij.im * Math.cos(theta_ij));
        }
      }
    }

    // Calculate mismatches (per-unit)
    const P_mismatch = [];
    const Q_mismatch = [];

    for (let i = 0; i < n; i++) {
      const bus = buses[i];
      const P_spec = (bus.generation?.P - bus.load?.P || 0) / Sbase;
      const Q_spec = (bus.generation?.Q - bus.load?.Q || 0) / Sbase;

      if (bus.type !== 'Slack') {
        P_mismatch.push(P_spec - P_calc[i]);
      }
      if (bus.type === 'PQ') {
        Q_mismatch.push(Q_spec - Q_calc[i]);
      }
    }

    logger.debug('Power mismatches calculated', {
      nP: P_mismatch.length,
      nQ: Q_mismatch.length,
      maxP: Math.max(...P_mismatch.map(Math.abs)),
      maxQ: Math.max(...Q_mismatch.map(Math.abs))
    });

    return { P: P_mismatch, Q: Q_mismatch };
  }

  /**
   * Calculate maximum mismatch
   * @param {Object} mismatches - { P, Q } arrays
   * @returns {number} - Maximum absolute mismatch
   */
  static maxMismatch(mismatches) {
    const all = [...mismatches.P, ...mismatches.Q];
    return Math.max(...all.map(Math.abs));
  }
}

module.exports = { MismatchCalculator };
