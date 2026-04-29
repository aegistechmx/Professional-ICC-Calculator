const logger = require('@/infrastructure/logger/logger');
const Complex = require('../../shared/math/Complex');

/**
 * VoltageUpdater - Pure mathematical voltage update operations
 * Responsibility: ONLY applies corrections to voltage vector
 */
class VoltageUpdater {
  /**
   * Apply corrections to voltages
   * @param {Array} V - Current voltage vector (Complex objects)
   * @param {Array} corrections - Correction vector [dθ, dV]
   * @param {Array} buses - Bus data
   * @param {number} damping - Damping factor
   * @returns {Array} - Updated voltage vector
   */
  static apply(V, corrections, buses, damping = 1.0) {
    const n = buses.length;
    const newV = V.map(v => new Complex(v.re, v.im));

    let correctionIndex = 0;

    for (let i = 0; i < n; i++) {
      const bus = buses[i];
      
      if (bus.type === 'Slack') continue;

      // Apply angle correction (for PQ and PV buses)
      if (correctionIndex < corrections.length) {
        const dTheta = corrections[correctionIndex] * damping;
        const currentMag = V[i].mag(); // current (A)
        const currentAngle = V[i].angle(); // current (A)
        const newAngle = currentAngle + dTheta; // current (A)
        
        newV[i] = Complex.fromPolar(currentMag, newAngle); // current (A)
        correctionIndex++;
      }

      // Apply magnitude correction for PQ buses only
      if (bus.type === 'PQ' && correctionIndex < corrections.length) {
        const dV = corrections[correctionIndex] * damping;
        const currentMag = V[i].mag(); // current (A)
        const currentAngle = V[i].angle(); // current (A)
        const newMag = Math.max(0.9, Math.min(1.1, currentMag + dV)); // current (A)
        
        newV[i] = Complex.fromPolar(newMag, currentAngle); // current (A)
        correctionIndex++;
      }
    }

    logger.debug('Voltages updated', {
      damping,
      correctionsApplied: correctionIndex
    });

    return newV;
  }

  /**
   * Initialize voltages with smart flat start
   * @param {Array} buses - Bus data
   * @returns {Array} - Initial voltage vector (Complex objects)
   */
  static initialize(buses) {
    const n = buses.length;
    const V = Array(n).fill(null);

    for (let i = 0; i < n; i++) {
      const bus = buses[i];
      
      if (bus.type === 'Slack') {
        const mag = bus.voltage?.magnitude || 1.0; // voltage (V)
        const ang = (bus.voltage?.angle || 0) * Math.PI / 180; // voltage (V)
        V[i] = Complex.fromPolar(mag, ang);
      } else if (bus.type === 'PV') {
        const mag = bus.voltage?.magnitude || 1.0; // voltage (V)
        // Small angle variation to break symmetry
        const ang = (i * 0.01) * Math.PI / 180;
        V[i] = Complex.fromPolar(mag, ang);
      } else {
        // PQ bus - flat start with small angle variation
        const mag = 1.0;
        const ang = (i * 0.01) * Math.PI / 180;
        V[i] = Complex.fromPolar(mag, ang);
      }
    }

    logger.debug('Voltages initialized', {
      n,
      slackIndex: buses.findIndex(b => b.type === 'Slack')
    });

    return V;
  }
}

module.exports = { VoltageUpdater };
