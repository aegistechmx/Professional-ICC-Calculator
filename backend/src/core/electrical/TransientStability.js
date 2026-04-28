/**
 * Transient Stability Analysis Module
 * 
 * Analyzes system stability during and after disturbances
 * Includes swing equation simulation and critical clearing time calculation
 */

const { Complex, j } = require('./Complex');

/**
 * Transient Stability Class
 */
class TransientStability {
  constructor() {
    this.generators = [];
    this.timeStep = 0.01; // seconds
    this.simulationTime = 2.0; // seconds
  }

  /**
   * Add generator for stability analysis
   */
  addGenerator(generator) {
    this.generators.push({
      bus: generator.bus,
      P: generator.P || 0, // MW
      Q: generator.Q || 0, // MVAR
      H: generator.H || 5, // Inertia constant (seconds)
      xd: generator.xd || 1.8, // Direct axis reactance
      xd_prime: generator.xd_prime || 0.3, // Transient reactance
      Td0_prime: generator.Td0_prime || 5, // Open circuit time constant
      delta: generator.delta || 0, // Rotor angle (rad)
      omega: generator.omega || 1, // Speed (pu)
      E_prime: generator.E_prime || 1 // Transient emf (pu)
    });
    return this;
  }

  /**
   * Calculate critical clearing time
   */
  calculateCriticalClearingTime(generator, faultClearanceAngle) {
    const H = generator.H;
    const Pmax = this.calculatePmax(generator);
    const P0 = generator.P;
    
    // Equal area criterion
    const delta0 = Math.asin(P0 / Pmax);
    const deltaMax = Math.PI - delta0;
    
    // Critical clearing angle
    const deltaC = Math.acos((P0 / Pmax) * (deltaMax - delta0) + Math.cos(deltaMax));
    
    // Critical clearing time (simplified)
    const criticalTime = Math.sqrt((2 * H * (deltaC - delta0)) / (Math.PI * 60 * P0));
    
    return {
      delta0: delta0 * (180 / Math.PI),
      deltaMax: deltaMax * (180 / Math.PI),
      deltaC: deltaC * (180 / Math.PI),
      criticalTime
    };
  }

  /**
   * Calculate maximum power transfer
   */
  calculatePmax(generator) {
    const E_prime = generator.E_prime;
    const V_terminal = 1.0; // Assume 1 pu terminal voltage
    const X = generator.xd_prime;
    
    return (E_prime * V_terminal) / X;
  }

  /**
   * Run swing equation simulation
   */
  runSwingEquation(generator, faultDuration, faultClearanceAngle) {
    const results = [];
    const dt = this.timeStep;
    const steps = this.simulationTime / dt;
    
    // Initial conditions
    let delta = generator.delta;
    let omega = generator.omega;
    const H = generator.H;
    const P0 = generator.P;
    const Pmax = this.calculatePmax(generator);
    
    for (let i = 0; i <= steps; i++) {
      const time = i * dt;
      
      // Determine if fault is present
      const faultPresent = time < faultDuration;
      
      // Calculate electrical power
      let Pe;
      if (faultPresent) {
        Pe = 0; // Power drops to near zero during fault
      } else {
        Pe = Pmax * Math.sin(delta);
      }
      
      // Swing equation: 2H * d2delta/dt2 = Pm - Pe
      const Pm = P0; // Mechanical power (assumed constant)
      const acceleratingPower = Pm - Pe;
      const d2delta_dt2 = acceleratingPower / (2 * H);
      
      // Update speed and angle (Euler integration)
      omega += d2delta_dt2 * dt;
      delta += (omega - 1) * dt;
      
      results.push({
        time,
        delta: delta * (180 / Math.PI),
        omega,
        Pe,
        acceleratingPower
      });
    }
    
    // Check stability
    const isStable = this.checkStability(results);
    
    return {
      generator: generator.bus,
      faultDuration,
      results,
      isStable,
      maxAngle: Math.max(...results.map(r => r.delta)),
      maxSpeed: Math.max(...results.map(r => r.omega))
    };
  }

  /**
   * Check if system is stable
   */
  checkStability(results) {
    // System is stable if angle doesn't diverge
    const finalAngle = results[results.length - 1].delta;
    const maxAngle = Math.max(...results.map(r => r.delta));
    
    // If angle exceeds 180 degrees, system is unstable
    return maxAngle < 180 && finalAngle < 180;
  }

  /**
   * Calculate rotor angle stability margin
   */
  calculateStabilityMargin(generator) {
    const criticalClearing = this.calculateCriticalClearingTime(generator, 0);
    const actualClearingTime = 0.1; // Typical relay time
    const margin = criticalClearing.criticalTime - actualClearingTime;
    
    return {
      criticalClearingTime: criticalClearing.criticalTime,
      actualClearingTime,
      margin,
      marginPercent: (margin / criticalClearing.criticalTime) * 100
    };
  }

  /**
   * Multi-machine stability analysis
   */
  runMultiMachineStability(faultDuration) {
    const results = [];
    
    this.generators.forEach(gen => {
      const stabilityResult = this.runSwingEquation(gen, faultDuration);
      const marginResult = this.calculateStabilityMargin(gen);
      
      results.push({
        generator: gen.bus,
        stability: stabilityResult,
        margin: marginResult
      });
    });
    
    return results;
  }

  /**
   * Calculate inter-area oscillation modes
   */
  calculateOscillationModes() {
    if (this.generators.length < 2) {
      return null;
    }
    
    // Simplified inter-area mode calculation
    const avgH = this.generators.reduce((sum, g) => sum + g.H, 0) / this.generators.length;
    const avgXd = this.generators.reduce((sum, g) => sum + g.xd_prime, 0) / this.generators.length;
    
    // Approximate oscillation frequency
    const oscillationFreq = Math.sqrt(1 / (avgH * avgXd)) / (2 * Math.PI);
    
    return {
      oscillationFreq,
      dampingRatio: 0.05, // Typical damping
      modeShape: this.generators.map(g => ({
        bus: g.bus,
        amplitude: 1,
        phase: g.bus === this.generators[0].bus ? 0 : 180
      }))
    };
  }

  /**
   * Generate stability report
   */
  generateStabilityReport(faultDuration) {
    const multiMachineResults = this.runMultiMachineStability(faultDuration);
    const oscillationModes = this.calculateOscillationModes();
    
    return {
      faultDuration,
      generators: multiMachineResults,
      oscillationModes,
      overallStability: multiMachineResults.every(r => r.stability.isStable),
      recommendations: this.getStabilityRecommendations(multiMachineResults)
    };
  }

  /**
   * Get stability improvement recommendations
   */
  getStabilityRecommendations(results) {
    const recommendations = [];
    
    const unstableGenerators = results.filter(r => !r.stability.isStable);
    const lowMarginGenerators = results.filter(r => r.margin.margin < 0.05);
    
    if (unstableGenerators.length > 0) {
      recommendations.push('Install fast-acting protection systems');
      recommendations.push('Consider generator tripping for severe faults');
      recommendations.push('Implement special protection schemes');
    }
    
    if (lowMarginGenerators.length > 0) {
      recommendations.push('Increase generator inertia (H)');
      recommendations.push('Install power system stabilizers (PSS)');
      recommendations.push('Implement fast valving');
      recommendations.push('Consider braking resistors');
    }
    
    if (unstableGenerators.length === 0 && lowMarginGenerators.length === 0) {
      recommendations.push('System has adequate stability margins');
      recommendations.push('Continue periodic stability studies');
    }
    
    return recommendations;
  }
}

module.exports = TransientStability;
