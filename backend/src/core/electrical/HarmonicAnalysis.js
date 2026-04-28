/**
 * Harmonic Analysis Module
 * 
 * Calculates harmonic currents and voltages in power systems
 * Includes harmonic distortion analysis and filter design
 */

const { Complex, j } = require('./Complex');

/**
 * Harmonic Analysis Class
 */
class HarmonicAnalysis {
  constructor() {
    this.harmonicOrders = [1, 3, 5, 7, 11, 13, 17, 19, 23, 25];
    this.harmonicSources = [];
  }

  /**
   * Add harmonic source
   */
  addHarmonicSource(source) {
    this.harmonicSources.push({
      bus: source.bus,
      type: source.type || 'rectifier', // rectifier, inverter, arc_furnace
      fundamentalCurrent: source.fundamentalCurrent || 0,
      harmonics: source.harmonics || {},
      power: source.power || 0
    });
    return this;
  }

  /**
   * Calculate harmonic currents
   */
  calculateHarmonicCurrents(baseCurrent) {
    const harmonicCurrents = {};
    
    this.harmonicSources.forEach(source => {
      this.harmonicOrders.forEach(order => {
        const harmonicMagnitude = this.getHarmonicMagnitude(source, order);
        const harmonicCurrent = (baseCurrent * harmonicMagnitude) / order;
        
        if (!harmonicCurrents[order]) {
          harmonicCurrents[order] = [];
        }
        harmonicCurrents[order].push({
          bus: source.bus,
          current: harmonicCurrent,
          angle: this.getHarmonicAngle(source, order)
        });
      });
    });
    
    return harmonicCurrents;
  }

  /**
   * Get harmonic magnitude for a specific order
   */
  getHarmonicMagnitude(source, order) {
    // Default harmonic spectrum for 6-pulse rectifier
    const defaultSpectrum = {
      1: 1.0,
      5: 0.2,
      7: 0.14,
      11: 0.09,
      13: 0.07,
      17: 0.04,
      19: 0.03,
      23: 0.02,
      25: 0.01
    };
    
    return source.harmonics[order] || defaultSpectrum[order] || 0;
  }

  /**
   * Get harmonic phase angle
   */
  getHarmonicAngle(source, order) {
    // Default phase angles for harmonics
    const defaultAngles = {
      1: 0,
      5: -90,
      7: -90,
      11: -90,
      13: -90,
      17: -90,
      19: -90,
      23: -90,
      25: -90
    };
    
    return source.harmonicAngles?.[order] || defaultAngles[order] || 0;
  }

  /**
   * Calculate total harmonic distortion (THD)
   */
  calculateTHD(harmonicCurrents, fundamentalCurrent) {
    let sumOfSquares = 0;
    
    Object.keys(harmonicCurrents).forEach(order => {
      if (order !== '1') {
        harmonicCurrents[order].forEach(h => {
          sumOfSquares += Math.pow(h.current, 2);
        });
      }
    });
    
    const rmsHarmonics = Math.sqrt(sumOfSquares);
    const thd = (rmsHarmonics / fundamentalCurrent) * 100;
    
    return thd;
  }

  /**
   * Calculate voltage distortion
   */
  calculateVoltageDistortion(harmonicCurrents, impedance, fundamentalVoltage) {
    const voltageDistortion = {};
    
    Object.keys(harmonicCurrents).forEach(order => {
      if (order !== '1') {
        const h = parseInt(order);
        const harmonicImpedance = impedance * h; // Impedance increases with harmonic order
        
        harmonicCurrents[order].forEach(current => {
          const voltageDrop = current.current * harmonicImpedance;
          const voltageDistortionPercent = (voltageDrop / fundamentalVoltage) * 100;
          
          if (!voltageDistortion[order]) {
            voltageDistortion[order] = [];
          }
          voltageDistortion[order].push({
            bus: current.bus,
            voltageDrop,
            distortionPercent: voltageDistortionPercent
          });
        });
      }
    });
    
    return voltageDistortion;
  }

  /**
   * Calculate total voltage distortion (THDv)
   */
  calculateTHDv(voltageDistortion) {
    let sumOfSquares = 0;
    
    Object.keys(voltageDistortion).forEach(order => {
      voltageDistortion[order].forEach(v => {
        sumOfSquares += Math.pow(v.voltageDrop, 2);
      });
    });
    
    const rmsVoltageDistortion = Math.sqrt(sumOfSquares);
    
    return rmsVoltageDistortion;
  }

  /**
   * Design passive harmonic filter
   */
  designFilter(order, reactivePower, systemVoltage) {
    // Calculate capacitance
    const Xc = Math.pow(systemVoltage, 2) / reactivePower;
    const capacitance = 1 / (2 * Math.PI * 60 * Xc);
    
    // Calculate inductance for tuning
    const frequency = 60;
    const harmonicFreq = order * frequency;
    const Xl = Xc / (order * order);
    const inductance = Xl / (2 * Math.PI * harmonicFreq);
    
    // Calculate quality factor
    const Q = 30; // Typical quality factor for passive filters
    const resistance = Xl / Q;
    
    return {
      order,
      capacitance,
      inductance,
      resistance,
      reactivePower,
      tunedFrequency: harmonicFreq
    };
  }

  /**
   * Analyze resonance condition
   */
  analyzeResonance(systemInductance, filterCapacitance) {
    const resonantFrequency = 1 / (2 * Math.PI * Math.sqrt(systemInductance * filterCapacitance));
    const resonantOrder = resonantFrequency / 60;
    
    return {
      resonantFrequency,
      resonantOrder,
      isDangerous: resonantOrder > 4 && resonantOrder < 13
    };
  }

  /**
   * Get harmonic limits (IEEE 519)
   */
  getHarmonicLimits(systemVoltage) {
    // IEEE 519-2014 harmonic limits
    if (systemVoltage <= 1) {
      return {
        voltageDistortion: 8.0,
        individualHarmonic: 5.0,
        currentDistortion: 5.0
      };
    } else if (systemVoltage <= 69) {
      return {
        voltageDistortion: 5.0,
        individualHarmonic: 3.0,
        currentDistortion: 8.0
      };
    } else {
      return {
        voltageDistortion: 2.5,
        individualHarmonic: 1.5,
        currentDistortion: 12.0
      };
    }
  }

  /**
   * Check compliance with standards
   */
  checkCompliance(thd, thdv, systemVoltage) {
    const limits = this.getHarmonicLimits(systemVoltage);
    
    return {
      thdCompliant: thd <= limits.currentDistortion,
      thdvCompliant: thdv <= limits.voltageDistortion,
      limits,
      violations: []
    };
  }

  /**
   * Generate harmonic report
   */
  generateReport(harmonicCurrents, thd, thdv, compliance) {
    return {
      harmonicCurrents,
      thd: thd.toFixed(2) + '%',
      thdv: thdv.toFixed(2) + '%',
      compliance,
      recommendations: this.getRecommendations(thd, thdv, compliance)
    };
  }

  /**
   * Get recommendations for harmonic mitigation
   */
  getRecommendations(thd, thdv, compliance) {
    const recommendations = [];
    
    if (!compliance.thdCompliant) {
      recommendations.push('Install active harmonic filters');
      recommendations.push('Consider passive harmonic filters at harmonic source');
      recommendations.push('Use 12-pulse or 18-pulse converters instead of 6-pulse');
    }
    
    if (!compliance.thdvCompliant) {
      recommendations.push('Install capacitor banks with detuning reactors');
      recommendations.push('Consider harmonic filtering at point of common coupling');
      recommendations.push('Increase system short-circuit capacity');
    }
    
    if (compliance.thdCompliant && compliance.thdvCompliant) {
      recommendations.push('System is within harmonic limits');
      recommendations.push('Continue periodic monitoring');
    }
    
    return recommendations;
  }
}

module.exports = HarmonicAnalysis;
