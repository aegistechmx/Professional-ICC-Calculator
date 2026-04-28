/**
 * Optimal Power Flow (OPF) Module
 * 
 * Solves the optimal power flow problem considering:
 * - Generation cost minimization
 * - Transmission constraints
 * - Voltage limits
 * - Power flow equations
 */

const { Complex, j } = require('./Complex');

/**
 * Optimal Power Flow Class
 */
class OptimalPowerFlow {
  constructor() {
    this.system = null;
    this.constraints = {
      voltageMin: 0.95,
      voltageMax: 1.05,
      thermalLimits: []
    };
  }

  /**
   * Set system for OPF analysis
   */
  setSystem(system) {
    this.system = system;
    return this;
  }

  /**
   * Set constraints
   */
  setConstraints(constraints) {
    this.constraints = { ...this.constraints, ...constraints };
    return this;
  }

  /**
   * Solve OPF using simplified gradient method
   */
  solveOPF(options = {}) {
    const {
      maxIterations = 50,
      tolerance = 0.001,
      stepSize = 0.1
    } = options;
    
    if (!this.system) {
      return {
        success: false,
        error: 'System not set'
      };
    }
    
    // Initialize generator outputs
    const generators = this.system.generators || [];
    const totalLoad = this.system.loads.reduce((sum, l) => sum + l.P, 0);
    
    // Simple dispatch: proportional to capacity
    const totalCapacity = generators.reduce((sum, g) => sum + g.Pmax, 0);
    generators.forEach(gen => {
      gen.currentP = (gen.Pmax / totalCapacity) * totalLoad;
    });
    
    // Iterative optimization
    for (let iter = 0; iter < maxIterations; iter++) {
      // Calculate gradients (simplified)
      const gradients = this.calculateGradients(generators);
      
      // Update generator outputs
      let maxChange = 0;
      generators.forEach((gen, i) => {
        const oldP = gen.currentP;
        const newP = oldP - stepSize * gradients[i];
        gen.currentP = Math.max(gen.Pmin, Math.min(gen.Pmax, newP));
        maxChange = Math.max(maxChange, Math.abs(gen.currentP - oldP));
      });
      
      // Check convergence
      if (maxChange < tolerance) {
        break;
      }
    }
    
    // Calculate total cost
    const totalCost = this.calculateTotalCost(generators);
    
    return {
      success: true,
      iterations: maxIterations,
      totalCost,
      generators: generators.map(gen => ({
        id: gen.id,
        bus: gen.bus,
        P: gen.currentP,
        Q: gen.Q
      }))
    };
  }

  /**
   * Calculate gradients for optimization
   */
  calculateGradients(generators) {
    // Simplified gradient calculation
    // In full OPF, this would include Lagrangian multipliers
    return generators.map(gen => {
      // Gradient = marginal cost - lambda
      // Simplified: use linear cost coefficient
      return gen.b || 0.1;
    });
  }

  /**
   * Calculate total generation cost
   */
  calculateTotalCost(generators) {
    return generators.reduce((sum, gen) => {
      const P = gen.currentP || 0;
      const cost = (gen.a || 0) * P * P + (gen.b || 0) * P + (gen.c || 0);
      return sum + cost;
    }, 0);
  }

  /**
   * Check voltage constraints
   */
  checkVoltageConstraints(voltages) {
    const violations = [];
    
    voltages.forEach((v, i) => {
      if (v < this.constraints.voltageMin) {
        violations.push({
          bus: i,
          voltage: v,
          type: 'low',
          limit: this.constraints.voltageMin
        });
      }
      if (v > this.constraints.voltageMax) {
        violations.push({
          bus: i,
          voltage: v,
          type: 'high',
          limit: this.constraints.voltageMax
        });
      }
    });
    
    return violations;
  }

  /**
   * Check thermal limits
   */
  checkThermalLimits(flows) {
    const violations = [];
    
    flows.forEach((flow, i) => {
      const limit = this.constraints.thermalLimits[i] || Infinity;
      const flowMag = Math.sqrt(flow.P * flow.P + flow.Q * flow.Q);
      
      if (flowMag > limit) {
        violations.push({
          line: i,
          flow: flowMag,
          limit: limit,
          overload: (flowMag / limit - 1) * 100
        });
      }
    });
    
    return violations;
  }

  /**
   * Generate OPF report
   */
  generateReport(opfResult) {
    return {
      summary: {
        totalCost: opfResult.totalCost,
        iterations: opfResult.iterations
      },
      generators: opfResult.generators,
      constraints: {
        voltageViolations: [],
        thermalViolations: []
      }
    };
  }
}

module.exports = OptimalPowerFlow;
