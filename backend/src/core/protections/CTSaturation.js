/**
 * CTSaturation - Current Transformer Saturation Model
 * 
 * This module models CT saturation effects:
 * - Saturation curve modeling
 * - Secondary current distortion
 * - Impact on protection relay accuracy
 * 
 * Architecture:
 * Primary Current → CT → Saturation Model → Secondary Current → Relay
 * 
 * @class CTSaturation
 */

class CTSaturation {
  /**
   * Create a new CT saturation model
   * @param {Object} config - CT configuration
   * @param {number} config.ratio - CT ratio (primary/secondary)
   * @param {number} config.saturationVoltage - Saturation voltage (V)
   * @param {number} config.burden - CT burden (ohms)
   * @param {number} config.secondaryResistance - Secondary winding resistance (ohms)
   * @param {number} config.kneePoint - Knee point voltage (V)
   */
  constructor(config = {}) {
    this.ratio = config.ratio || 100; // 100:1 CT
    this.saturationVoltage = config.saturationVoltage || 100; // V
    this.burden = config.burden || 1; // ohms
    this.secondaryResistance = config.secondaryResistance || 0.5; // ohms
    this.kneePoint = config.kneePoint || 80; // V
    
    // Saturation curve parameters
    this.saturationCurve = config.saturationCurve || {
      type: 'exponential',
      a: 1.0,
      b: 0.5
    };
    
    // State
    this.state = {
      primaryCurrent: 0,
      secondaryCurrent: 0,
      saturationFactor: 1.0,
      isSaturated: false,
      distortion: 0
    };
  }

  /**
   * Calculate secondary current with saturation
   * @param {number} primaryCurrent - Primary current (A)
   * @returns {Object} Secondary current with saturation effects
   */
  calculateSecondaryCurrent(primaryCurrent) {
    // Ideal secondary current (without saturation)
    const idealSecondary = primaryCurrent / this.ratio;
    
    // Calculate secondary voltage
    const secondaryVoltage = idealSecondary * (this.burden + this.secondaryResistance);
    
    // Calculate saturation factor
    const saturationFactor = this.calculateSaturationFactor(secondaryVoltage);
    
    // Apply saturation
    const saturatedSecondary = idealSecondary * saturationFactor;
    
    // Calculate distortion
    const distortion = this.calculateDistortion(saturationFactor);
    
    // Update state
    this.state.primaryCurrent = primaryCurrent;
    this.state.secondaryCurrent = saturatedSecondary;
    this.state.saturationFactor = saturationFactor;
    this.state.isSaturated = saturationFactor < 0.95;
    this.state.distortion = distortion;
    
    return {
      secondaryCurrent: saturatedSecondary,
      idealSecondary,
      saturationFactor,
      isSaturated: saturationFactor < 0.95,
      distortion,
      secondaryVoltage,
      kneePoint: this.kneePoint
    };
  }

  /**
   * Calculate saturation factor
   * @param {number} voltage - Secondary voltage (V)
   * @returns {number} Saturation factor (0-1)
   */
  calculateSaturationFactor(voltage) {
    const { type, a, b } = this.saturationCurve;
    
    if (voltage < this.kneePoint) {
      // Linear region - no saturation
      return 1.0;
    }
    
    // Saturation region
    const overVoltage = (voltage - this.kneePoint) / this.saturationVoltage;
    
    switch (type) {
    case 'exponential':
      return Math.exp(-a * overVoltage);
    case 'tanh':
      return Math.tanh(b / overVoltage);
    case 'polynomial':
      return 1.0 / (1.0 + a * Math.pow(overVoltage, b));
    default:
      return Math.exp(-a * overVoltage);
    }
  }

  /**
   * Calculate current distortion due to saturation
   * @param {number} saturationFactor - Saturation factor
   * @returns {number} Distortion percentage (0-1)
   */
  calculateDistortion(saturationFactor) {
    if (saturationFactor >= 0.95) return 0;
    return 1.0 - saturationFactor;
  }

  /**
   * Check if CT is saturated
   * @returns {boolean} True if CT is saturated
   */
  isSaturated() {
    return this.state.isSaturated;
  }

  /**
   * Get saturation percentage
   * @returns {number} Saturation percentage (0-100)
   */
  getSaturationPercentage() {
    return (1.0 - this.state.saturationFactor) * 100;
  }

  /**
   * Reset CT state
   */
  reset() {
    this.state = {
      primaryCurrent: 0,
      secondaryCurrent: 0,
      saturationFactor: 1.0,
      isSaturated: false,
      distortion: 0
    };
  }

  /**
   * Get CT state
   * @returns {Object} Current CT state
   */
  getState() {
    return {
      ...this.state,
      saturationPercentage: this.getSaturationPercentage(),
      ratio: this.ratio,
      kneePoint: this.kneePoint,
      burden: this.burden
    };
  }
}

/**
 * CTSaturationProtection - Protection with CT Saturation Model
 * 
 * This class combines protection logic with CT saturation
 * to account for measurement errors during fault conditions.
 * 
 * @class CTSaturationProtection
 */
class CTSaturationProtection {
  /**
   * Create a new CT saturation protection
   * @param {Object} config - Protection configuration
   */
  constructor(config = {}) {
    this.id = config.id || 'ct_saturation_protection_1';
    this.ratedCurrent = config.ratedCurrent || 100; // A
    
    // CT saturation model
    this.ctSaturation = new CTSaturation(config.ct || {});
    
    // Protection settings
    this.pickup = config.pickup || 1.0; // pu
    this.timeDelay = config.timeDelay || 0.1; // s
    
    // State
    this.state = {
      primaryCurrent: 0,
      secondaryCurrent: 0,
      measuredCurrent: 0, // Current seen by relay (with saturation)
      trip: false,
      tripTime: null,
      ctSaturated: false
    };
  }

  /**
   * Evaluate protection with CT saturation
   * @param {Object} measurement - Current measurement
   * @param {number} measurement.I - Primary current (A)
   * @param {number} currentTime - Current simulation time (s)
   * @returns {Object} Protection evaluation result
   */
  evaluate(measurement, currentTime = 0) {
    const { I } = measurement;
    
    // Calculate secondary current with saturation
    const ctResult = this.ctSaturation.calculateSecondaryCurrent(I);
    
    // Update state
    this.state.primaryCurrent = I;
    this.state.secondaryCurrent = ctResult.secondaryCurrent;
    this.state.measuredCurrent = ctResult.secondaryCurrent * this.ctSaturation.ratio;
    this.state.ctSaturated = ctResult.isSaturated;
    
    // Check trip condition using measured current (with saturation)
    const measured_pu = this.state.measuredCurrent / this.ratedCurrent;
    const shouldTrip = measured_pu >= this.pickup;
    
    // Update trip state
    if (shouldTrip && !this.state.trip) {
      this.state.trip = true;
      this.state.tripTime = currentTime + this.timeDelay;
    }
    
    return {
      trip: shouldTrip,
      tripTime: this.state.trip,
      primaryCurrent: I,
      primary_pu: I / this.ratedCurrent,
      measuredCurrent: this.state.measuredCurrent,
      measured_pu,
      ctSaturation: ctResult,
      pickup: this.pickup,
      timeDelay: this.timeDelay
    };
  }

  /**
   * Reset protection
   */
  reset() {
    this.state = {
      primaryCurrent: 0,
      secondaryCurrent: 0,
      measuredCurrent: 0,
      trip: false,
      tripTime: null,
      ctSaturated: false
    };
    this.ctSaturation.reset();
  }

  /**
   * Get protection state
   * @returns {Object} Current protection state
   */
  getState() {
    return {
      ...this.state,
      ctState: this.ctSaturation.getState()
    };
  }
}

module.exports = {
  CTSaturation,
  CTSaturationProtection
};
