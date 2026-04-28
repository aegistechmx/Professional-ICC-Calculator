/**
 * ToleranceConfig - Real-World Tolerance Configuration
 * 
 * This module defines real-world tolerance standards for:
 * - Static power flow analysis (0.01 pu)
 * - Dynamic simulation (2-5%)
 * - Fault analysis
 * - Protection coordination
 * 
 * These tolerances are based on industry standards and best practices.
 * 
 * Architecture:
 * ToleranceConfig → Solvers → Validation
 */

class ToleranceConfig {
  /**
   * Get static tolerance (power flow)
   * @returns {number} Static tolerance in pu
   */
  static getStaticTolerance() {
    return 0.01; // 0.01 pu = 1% voltage/power mismatch
  }

  /**
   * Get dynamic tolerance (transient stability)
   * @returns {number} Dynamic tolerance as percentage
   */
  static getDynamicTolerance() {
    return 0.05; // 5% for dynamic variables (angle, speed)
  }

  /**
   * Get dynamic tolerance range
   * @returns {Object} Dynamic tolerance range
   */
  static getDynamicToleranceRange() {
    return {
      min: 0.02, // 2% - for fast transients
      max: 0.05  // 5% - for slower dynamics
    };
  }

  /**
   * Get fault tolerance
   * @returns {number} Fault tolerance in pu
   */
  static getFaultTolerance() {
    return 0.005; // 0.5% for fault currents
  }

  /**
   * Get protection tolerance
   * @returns {number} Protection tolerance
   */
  static getProtectionTolerance() {
    return 0.1; // 10% for protection coordination
  }

  /**
   * Get voltage tolerance
   * @param {string} mode - Simulation mode ('static', 'dynamic')
   * @returns {number} Voltage tolerance in pu
   */
  static getVoltageTolerance(mode = 'static') {
    if (mode === 'static') {
      return 0.01; // 1% for static voltage
    } else {
      return 0.05; // 5% for dynamic voltage
    }
  }

  /**
   * Get angle tolerance
   * @param {string} mode - Simulation mode ('static', 'dynamic')
   * @returns {number} Angle tolerance in degrees
   */
  static getAngleTolerance(mode = 'static') {
    if (mode === 'static') {
      return 0.5; // 0.5 degrees for static angle
    } else {
      return 2.0; // 2 degrees for dynamic angle
    }
  }

  /**
   * Get current tolerance
   * @param {string} mode - Simulation mode ('static', 'dynamic')
   * @returns {number} Current tolerance in pu
   */
  static getCurrentTolerance(mode = 'static') {
    if (mode === 'static') {
      return 0.01; // 1% for static current
    } else {
      return 0.05; // 5% for dynamic current
    }
  }

  /**
   * Get convergence tolerance for Newton-Raphson
   * @returns {number} Convergence tolerance
   */
  static getNRConvergenceTolerance() {
    return 1e-6; // 1e-6 pu for NR convergence
  }

  /**
   * Get convergence tolerance for iterative solvers
   * @returns {number} Convergence tolerance
   */
  static getIterativeSolverTolerance() {
    return 1e-6; // 1e-6 for CG/GMRES
  }

  /**
   * Get tolerance for specific variable type
   * @param {string} variableType - Variable type ('voltage', 'angle', 'current', 'power')
   * @param {string} mode - Simulation mode ('static', 'dynamic')
   * @returns {number} Tolerance
   */
  static getTolerance(variableType, mode = 'static') {
    const tolerances = {
      static: {
        voltage: 0.01,
        angle: 0.0087, // 0.5 degrees in radians
        current: 0.01,
        power: 0.01
      },
      dynamic: {
        voltage: 0.05,
        angle: 0.035, // 2 degrees in radians
        current: 0.05,
        power: 0.05
      }
    };

    return tolerances[mode][variableType] || tolerances.static.voltage;
  }

  /**
   * Validate if result is within tolerance
   * @param {number} actual - Actual value
   * @param {number} expected - Expected value
   * @param {string} variableType - Variable type
   * @param {string} mode - Simulation mode
   * @returns {boolean} True if within tolerance
   */
  static isWithinTolerance(actual, expected, variableType, mode = 'static') {
    const tolerance = this.getTolerance(variableType, mode);
    
    if (expected === 0) {
      return Math.abs(actual) < tolerance;
    }
    
    const relativeError = Math.abs((actual - expected) / expected);
    return relativeError < tolerance;
  }

  /**
   * Get tolerance configuration object
   * @returns {Object} Complete tolerance configuration
   */
  static getConfig() {
    return {
      static: {
        powerFlow: this.getStaticTolerance(),
        voltage: this.getVoltageTolerance('static'),
        angle: this.getAngleTolerance('static'),
        current: this.getCurrentTolerance('static'),
        power: this.getTolerance('power', 'static'),
        nrConvergence: this.getNRConvergenceTolerance(),
        iterativeSolver: this.getIterativeSolverTolerance()
      },
      dynamic: {
        simulation: this.getDynamicTolerance(),
        voltage: this.getVoltageTolerance('dynamic'),
        angle: this.getAngleTolerance('dynamic'),
        current: this.getCurrentTolerance('dynamic'),
        power: this.getTolerance('power', 'dynamic'),
        range: this.getDynamicToleranceRange()
      },
      fault: {
        current: this.getFaultTolerance(),
        impedance: this.getFaultTolerance()
      },
      protection: {
        coordination: this.getProtectionTolerance(),
        timing: 0.1, // 10% timing tolerance
        pickup: 0.05 // 5% pickup tolerance
      }
    };
  }

  /**
   * Apply tolerance configuration to solver options
   * @param {Object} options - Solver options
   * @param {string} mode - Simulation mode
   * @returns {Object} Updated solver options
   */
  static applyToOptions(options = {}, mode = 'static') {
    const config = this.getConfig();
    
    const modeConfig = mode === 'static' ? config.static : config.dynamic;
    
    return {
      ...options,
      tolerance: options.tolerance || modeConfig.powerFlow,
      voltageTolerance: options.voltageTolerance || modeConfig.voltage,
      angleTolerance: options.angleTolerance || modeConfig.angle,
      currentTolerance: options.currentTolerance || modeConfig.current,
      powerTolerance: options.powerTolerance || modeConfig.power
    };
  }
}

module.exports = ToleranceConfig;
