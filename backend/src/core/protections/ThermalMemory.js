/**
 * ThermalMemory - I²t Thermal Memory for Protection
 * 
 * This module implements thermal memory for protection devices:
 * - I²t accumulation for thermal limits
 * - Cooling characteristics
 * - Reset behavior
 * 
 * Architecture:
 * Current → I²t Calculation → Thermal Memory → Trip Decision
 * 
 * @class ThermalMemory
 */

class ThermalMemory {
  /**
   * Create a new thermal memory
   * @param {Object} config - Thermal memory configuration
   * @param {number} config.thermalLimit - Thermal limit (I²t)
   * @param {number} config.coolingTimeConstant - Cooling time constant (s)
   * @param {number} config.ratedCurrent - Rated current (A)
   */
  constructor(config = {}) {
    this.thermalLimit = config.thermalLimit || 10000; // I²t limit (A²·s)
    this.coolingTimeConstant = config.coolingTimeConstant || 1800; // 30 minutes cooling
    this.ratedCurrent = config.ratedCurrent || 100; // A
    
    // Thermal state
    this.state = {
      accumulatedI2t: 0, // Accumulated I²t
      currentI2t: 0, // Current I²t
      temperature: 0, // Normalized temperature (0-1)
      lastUpdateTime: null,
      overheated: false,
      tripTime: null
    };
  }

  /**
   * Update thermal memory with current measurement
   * @param {number} current - Current (A)
   * @param {number} dt - Time step (s)
   * @param {number} currentTime - Current simulation time (s)
   * @returns {Object} Thermal state
   */
  update(current, dt, currentTime = 0) {
    // Calculate I²t for this time step
    const i2t = current * current * dt;
    
    // Add to accumulated I²t
    this.state.accumulatedI2t += i2t;
    this.state.currentI2t = i2t;
    
    // Calculate cooling (exponential decay)
    if (this.state.lastUpdateTime !== null) {
      const timeSinceLastUpdate = currentTime - this.state.lastUpdateTime;
      const coolingFactor = Math.exp(-timeSinceLastUpdate / this.coolingTimeConstant);
      this.state.accumulatedI2t *= coolingFactor;
    }
    
    // Calculate normalized temperature
    this.state.temperature = this.state.accumulatedI2t / this.thermalLimit;
    
    // Check for overheating
    this.state.overheated = this.state.temperature >= 1.0;
    
    // Record trip time if overheating
    if (this.state.overheated && this.state.tripTime === null) {
      this.state.tripTime = currentTime;
    }
    
    this.state.lastUpdateTime = currentTime;
    
    return {
      accumulatedI2t: this.state.accumulatedI2t,
      temperature: this.state.temperature,
      overheated: this.state.overheated,
      tripTime: this.state.tripTime,
      thermalLimit: this.thermalLimit,
      utilization: (this.state.temperature * 100).toFixed(2) + '%'
    };
  }

  /**
   * Check if thermal limit is exceeded
   * @returns {boolean} True if thermal limit exceeded
   */
  isThermalLimitExceeded() {
    return this.state.accumulatedI2t >= this.thermalLimit;
  }

  /**
   * Get remaining thermal capacity
   * @returns {number} Remaining capacity (I²t)
   */
  getRemainingCapacity() {
    return Math.max(0, this.thermalLimit - this.state.accumulatedI2t);
  }

  /**
   * Reset thermal memory
   */
  reset() {
    this.state = {
      accumulatedI2t: 0,
      currentI2t: 0,
      temperature: 0,
      lastUpdateTime: null,
      overheated: false,
      tripTime: null
    };
  }

  /**
   * Cool down the thermal memory
   * @param {number} time - Cooling time (s)
   */
  coolDown(time) {
    const coolingFactor = Math.exp(-time / this.coolingTimeConstant);
    this.state.accumulatedI2t *= coolingFactor;
    this.state.temperature = this.state.accumulatedI2t / this.thermalLimit;
    this.state.overheated = this.state.temperature >= 1.0;
  }

  /**
   * Get thermal state
   * @returns {Object} Current thermal state
   */
  getState() {
    return {
      ...this.state,
      remainingCapacity: this.getRemainingCapacity(),
      utilization: (this.state.temperature * 100).toFixed(2) + '%'
    };
  }
}

/**
 * ThermalMemoryProtection - Protection with Thermal Memory
 * 
 * This class combines protection logic with thermal memory
 * for realistic protection coordination.
 * 
 * @class ThermalMemoryProtection
 */
class ThermalMemoryProtection {
  /**
   * Create a new thermal memory protection
   * @param {Object} config - Protection configuration
   */
  constructor(config = {}) {
    this.id = config.id || 'thermal_protection_1';
    this.ratedCurrent = config.ratedCurrent || 100; // A
    
    // Thermal memory for overload protection
    this.thermalMemory = new ThermalMemory({
      thermalLimit: config.thermalLimit || 10000,
      coolingTimeConstant: config.coolingTimeConstant || 1800,
      ratedCurrent: this.ratedCurrent
    });
    
    // Short-time thermal limit (for fault conditions)
    this.shortTimeLimit = config.shortTimeLimit || 50000; // I²t for short-time
    
    // Instantaneous thermal limit (for high fault currents)
    this.instantaneousLimit = config.instantaneousLimit || 100000; // I²t for instantaneous
    
    // State
    this.state = {
      current: 0,
      trip: false,
      tripType: null,
      tripTime: null
    };
  }

  /**
   * Evaluate protection with thermal memory
   * @param {Object} measurement - Current measurement
   * @param {number} measurement.I - Phase current (A)
   * @param {number} dt - Time step (s)
   * @param {number} currentTime - Current simulation time (s)
   * @returns {Object} Protection evaluation result
   */
  evaluate(measurement, dt, currentTime = 0) {
    const { I } = measurement;
    
    // Update state
    this.state.current = I;
    
    // Update thermal memory
    const thermalState = this.thermalMemory.update(I, dt, currentTime);
    
    // Check for trip conditions
    let trip = false;
    let tripType = null;
    
    // Check thermal limit (overload)
    if (this.thermalMemory.isThermalLimitExceeded()) {
      trip = true;
      tripType = 'thermal_overload';
    }
    
    // Check short-time limit (fault)
    const i2t = I * I * dt;
    if (i2t > this.shortTimeLimit && I > this.ratedCurrent * 6) {
      trip = true;
      tripType = 'short_time_fault';
    }
    
    // Check instantaneous limit (high fault)
    if (i2t > this.instantaneousLimit && I > this.ratedCurrent * 10) {
      trip = true;
      tripType = 'instantaneous_fault';
    }
    
    // Update state
    if (trip && !this.state.trip) {
      this.state.trip = true;
      this.state.tripType = tripType;
      this.state.tripTime = currentTime;
    }
    
    return {
      trip,
      tripType,
      tripTime: this.state.tripTime,
      current: I,
      current_pu: I / this.ratedCurrent,
      thermalState,
      i2t,
      shortTimeLimit: this.shortTimeLimit,
      instantaneousLimit: this.instantaneousLimit
    };
  }

  /**
   * Reset protection
   */
  reset() {
    this.state = {
      current: 0,
      trip: false,
      tripType: null,
      tripTime: null
    };
    this.thermalMemory.reset();
  }

  /**
   * Get protection state
   * @returns {Object} Current protection state
   */
  getState() {
    return {
      ...this.state,
      thermalState: this.thermalMemory.getState()
    };
  }
}

module.exports = {
  ThermalMemory,
  ThermalMemoryProtection
};
