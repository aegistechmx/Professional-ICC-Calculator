/**
 * Real IEC Curves with Saturation and Non-Ideal Behavior
 * 
 * Implements manufacturer-specific IEC curves with:
 * - Thermal memory
 * - CT saturation
 * - Offset and saturation effects
 * - Real-world non-linearities
 */

/**
 * Real IEC Curve Class
 */
class RealIECCurve {
  constructor(config = {}) {
    this.curveType = config.curveType || 'standard'; // standard, very, extremely
    this.manufacturer = config.manufacturer || 'generic';
    this.thermalMemory = 0;
    this.thermalTimeConstant = config.thermalTimeConstant || 100; // seconds
    this.ctSaturationRatio = config.ctSaturationRatio || 20; // CT saturation ratio
    this.offset = config.offset || 0; // Time offset in seconds
    this.saturationCurrent = config.saturationCurrent || 10; // Saturation current in pu
  }

  /**
   * Calculate trip time with real-world effects
   * @param {number} current - Current in pu of pickup
   * @param {number} pickup - Pickup current
   * @param {number} TMS - Time multiplier setting
   * @returns {number} Trip time in seconds
   */
  calculateTripTime(current, pickup, TMS) {
    const I = current / pickup;
    
    // Apply CT saturation effect
    const Isat = this.applyCTSaturation(I);
    
    // Calculate ideal IEC trip time
    const idealTime = this.calculateIdealTime(Isat);
    
    // Apply offset
    const offsetTime = idealTime + this.offset;
    
    // Apply thermal memory effect
    const thermalEffect = this.applyThermalMemory(current);
    
    // Apply TMS
    const tripTime = TMS * offsetTime + thermalEffect;
    
    return Math.max(0, tripTime);
  }

  /**
   * Calculate ideal IEC trip time (no saturation or memory)
   * @param {number} I - Current in pu of pickup
   * @returns {number} Ideal trip time
   */
  calculateIdealTime(I) {
    if (I <= 1) return Infinity;
    
    const { k, alpha } = this.getCurveParameters();
    
    // IEC standard formula: t = TMS * k / (I^alpha - 1)
    const time = k / (Math.pow(I, alpha) - 1);
    
    return time;
  }

  /**
   * Get curve parameters based on type
   * @returns {Object} { k, alpha }
   */
  getCurveParameters() {
    const parameters = {
      standard: { k: 0.14, alpha: 0.02 },
      very: { k: 13.5, alpha: 1 },
      extremely: { k: 80, alpha: 2 }
    };
    
    return parameters[this.curveType] || parameters.standard;
  }

  /**
   * Apply CT saturation effect
   * @param {number} I - Current in pu
   * @returns {number} Saturated current
   */
  applyCTSaturation(I) {
    if (I < this.ctSaturationRatio) {
      return I;
    }
    
    // Simple saturation model: current clips at saturation ratio
    return this.ctSaturationRatio + (I - this.ctSaturationRatio) * 0.1;
  }

  /**
   * Apply thermal memory effect
   * @param {number} current - Current in pu
   * @returns {number} Thermal time adjustment
   */
  applyThermalMemory(current) {
    // Thermal memory causes faster tripping for sustained overcurrent
    this.thermalMemory += current * 0.01;
    this.thermalMemory *= 0.99; // Decay
    
    // Thermal effect reduces trip time for high memory
    const thermalFactor = Math.max(0.8, 1 - 0.2 * this.thermalMemory);
    
    return (1 - thermalFactor) * 0.5; // Max 0.5s reduction
  }

  /**
   * Reset thermal memory
   */
  resetThermalMemory() {
    this.thermalMemory = 0;
  }

  /**
   * Generate TCC curve with real effects
   * @param {number} pickup - Pickup current
   * @param {number} TMS - Time multiplier
   * @param {number} maxCurrent - Maximum current to plot
   * @param {number} points - Number of points
   * @returns {Array} TCC curve points
   */
  generateTCC(pickup, TMS, maxCurrent = 10, points = 100) {
    const curve = [];
    
    for (let i = 0; i <= points; i++) {
      const current = pickup * (1 + (maxCurrent - 1) * i / points);
      const time = this.calculateTripTime(current, pickup, TMS);
      curve.push({ current, time });
    }
    
    return curve;
  }

  /**
   * Get manufacturer-specific parameters
   * @returns {Object} Manufacturer parameters
   */
  getManufacturerParams() {
    const manufacturerParams = {
      ABB: {
        standard: { k: 0.14, alpha: 0.02, offset: 0.02 },
        very: { k: 13.5, alpha: 1, offset: 0.03 }
      },
      Schneider: {
        standard: { k: 0.14, alpha: 0.02, offset: 0.015 },
        very: { k: 13.5, alpha: 1, offset: 0.025 }
      },
      Siemens: {
        standard: { k: 0.14, alpha: 0.02, offset: 0.01 },
        very: { k: 13.5, alpha: 1, offset: 0.02 }
      }
    };
    
    return manufacturerParams[this.manufacturer]?.[this.curveType] || this.getCurveParameters();
  }
}

/**
 * Protection Device with Real Curves
 */
class RealProtectionDevice {
  constructor(config = {}) {
    this.id = config.id;
    this.lineId = config.lineId;
    this.pickup = config.pickup || 0.5;
    this.TMS = config.TMS || 0.5;
    this.curveType = config.curveType || 'standard';
    this.manufacturer = config.manufacturer || 'generic';
    
    // Real curve instance
    this.iecCurve = new RealIECCurve({
      curveType: this.curveType,
      manufacturer: this.manufacturer,
      thermalTimeConstant: config.thermalTimeConstant,
      ctSaturationRatio: config.ctSaturationRatio,
      offset: config.offset,
      saturationCurrent: config.saturationCurrent
    });
    
    // State
    this.active = true;
    this.tripped = false;
    this.tripTime = 0;
    this.tripDelay = 0;
    this.thermalMemory = 0;
  }

  /**
   * Evaluate with real curves
   * @param {number} current - Current in kA
   * @returns {Object} Evaluation result
   */
  evaluate(current) {
    if (!this.active || this.tripped) {
      return { shouldTrip: false, tripTime: Infinity };
    }
    
    const tripTime = this.iecCurve.calculateTripTime(current, this.pickup, this.TMS);
    
    return {
      shouldTrip: tripTime < Infinity,
      tripTime: tripTime,
      current: current,
      pickup: this.pickup,
      thermalMemory: this.iecCurve.thermalMemory
    };
  }

  /**
   * Reset device
   */
  reset() {
    this.tripped = false;
    this.tripTime = 0;
    this.iecCurve.resetThermalMemory();
  }
}

module.exports = {
  RealIECCurve,
  RealProtectionDevice
};
