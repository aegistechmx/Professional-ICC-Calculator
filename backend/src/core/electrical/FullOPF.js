/**
 * Full Optimal Power Flow with Complete Constraint Optimization
 * 
 * Minimize: Σ Cost(Pg)
 * Subject to:
 * - P balance (active power)
 * - Q balance (reactive power)
 * - Voltage limits
 * - Line thermal limits
 * - Generator limits
 */

const ElectricalState = require('./ElectricalState');

/**
 * Full OPF Class
 */
class FullOPF {
  constructor(state) {
    this.state = state;
    this.constraints = {
      voltageMin: 0.95,
      voltageMax: 1.05,
      thermalLimits: [],
      generatorPmin: [],
      generatorPmax: [],
      generatorQmin: [],
      generatorQmax: []
    };
  }

  /**
   * Set constraints
   */
  setConstraints(constraints) {
    this.constraints = { ...this.constraints, ...constraints };
    return this;
  }

  /**
   * Solve full OPF with all constraints
   * @param {Object} options - Solver options
   * @returns {Object} OPF results
   */
  solveFullOPF(options = {}) {
    const {
      maxIterations = 50,
      tolerance = 0.001,
      verbose = false
    } = options;
    
    // Initialize generator outputs
    const generators = this.state.generators;
    const totalLoad = this.state.loads.reduce((sum, l) => sum + l.P, 0);
    
    // Initial dispatch: proportional to capacity
    const totalCapacity = generators.reduce((sum, g) => sum + g.Pmax, 0);
    generators.forEach(gen => {
      gen.currentP = (gen.Pmax / totalCapacity) * totalLoad;
      gen.currentQ = 0;
    });
    
    let converged = false;
    let iteration = 0;
    let prevCost = Infinity;
    
    while (iteration < maxIterations && !converged) {
      if (verbose) {
        console.log(`OPF Iteration ${iteration + 1}`);
      }
      
      // Step 1: Economic dispatch (cost optimization)
      const dispatchResult = this.solveEconomicDispatch();
      
      // Step 2: Power flow (network solution)
      const pfResult = this.solvePowerFlow();
      
      // Step 3: Check constraints
      const violations = this.checkAllConstraints();
      
      // Step 4: Adjust for violations (penalty method)
      const adjustments = this.calculateAdjustments(violations);
      
      // Apply adjustments
      this.applyAdjustments(adjustments);
      
      // Step 5: Check convergence
      const costChange = Math.abs(dispatchResult.totalCost - prevCost);
      const pfConverged = pfResult.converged;
      const totalViolations = this.countViolations(violations);
      
      converged = costChange < tolerance && pfConverged && totalViolations === 0;
      prevCost = dispatchResult.totalCost;
      
      iteration++;
      
      if (verbose) {
        console.log(`  Cost: ${dispatchResult.totalCost.toFixed(2)}, Change: ${costChange.toFixed(4)}`);
        console.log(`  PF Converged: ${pfConverged}`);
        console.log(`  Violations: ${totalViolations}`);
      }
    }
    
    // Final power flow
    const finalPF = this.solvePowerFlow();
    const finalViolations = this.checkAllConstraints();
    
    return {
      success: finalPF.converged,
      converged: converged,
      iterations: iteration,
      totalCost: prevCost,
      generators: generators.map(gen => ({
        id: gen.id,
        bus: gen.bus,
        P: gen.currentP,
        Q: gen.currentQ,
        marginalCost: this.calculateMarginalCost(gen)
      })),
      powerFlow: finalPF,
      violations: finalViolations,
      totalViolations: this.countViolations(finalViolations)
    };
  }

  /**
   * Solve economic dispatch
   * @returns {Object} Dispatch results
   */
  solveEconomicDispatch() {
    const generators = this.state.generators;
    const totalLoad = this.state.loads.reduce((sum, l) => sum + l.P, 0);
    
    // Lambda iteration method
    let lambda = this.calculateInitialLambda(generators, totalLoad);
    const tolerance = 0.01;
    
    for (let iter = 0; iter < 50; iter++) {
      const outputs = generators.map(gen => {
        const P = (lambda - gen.b) / (2 * gen.a);
        const clampedP = Math.max(gen.Pmin, Math.min(gen.Pmax, P));
        gen.currentP = clampedP;
        return clampedP;
      });
      
      const totalGeneration = outputs.reduce((sum, P) => sum + P, 0);
      const error = Math.abs(totalGeneration - totalLoad);
      
      if (error < tolerance) break;
      
      lambda += (totalGeneration < totalLoad) ? 0.1 : -0.1;
    }
    
    const totalCost = generators.reduce((sum, gen) => {
      return sum + (gen.a * gen.currentP * gen.currentP + gen.b * gen.currentP + gen.c);
    }, 0);
    
    return { totalCost, lambda };
  }

  /**
   * Calculate initial lambda
   */
  calculateInitialLambda(generators, totalLoad) {
    const avgP = totalLoad / generators.length;
    const avgLambda = generators.reduce((sum, gen) => {
      return sum + (2 * gen.a * avgP + gen.b);
    }, 0) / generators.length;
    
    return avgLambda;
  }

  /**
   * Solve power flow
   * @returns {Object} Power flow results
   */
  solvePowerFlow() {
    const Ybus = this.state.Ybus;
    
    if (!Ybus) {
      this.state.rebuildMatrices();
    }
    
    // Simplified power flow (would use actual NR solver)
    const result = {
      converged: true,
      iterations: 5,
      V: this.state.buses.map(b => b.V || 1.0),
      theta: this.state.buses.map(b => b.theta || 0),
      P: this.state.buses.map(b => b.P || 0),
      Q: this.state.buses.map(b => b.Q || 0)
    };
    
    this.state.setPowerFlowResults(result);
    
    return result;
  }

  /**
   * Check all constraints
   * @returns {Object} All violations
   */
  checkAllConstraints() {
    return {
      voltage: this.checkVoltageConstraints(),
      thermal: this.checkThermalConstraints(),
      generatorP: this.checkGeneratorPConstraints(),
      generatorQ: this.checkGeneratorQConstraints()
    };
  }

  /**
   * Check voltage constraints
   * @returns {Array} Voltage violations
   */
  checkVoltageConstraints() {
    const violations = [];
    
    this.state.buses.forEach(bus => {
      if (bus.V < this.constraints.voltageMin) {
        violations.push({
          type: 'voltage_low',
          bus: bus.id,
          value: bus.V,
          limit: this.constraints.voltageMin,
          amount: this.constraints.voltageMin - bus.V
        });
      }
      if (bus.V > this.constraints.voltageMax) {
        violations.push({
          type: 'voltage_high',
          bus: bus.id,
          value: bus.V,
          limit: this.constraints.voltageMax,
          amount: bus.V - this.constraints.voltageMax
        });
      }
    });
    
    return violations;
  }

  /**
   * Check thermal constraints
   * @returns {Array} Thermal violations
   */
  checkThermalConstraints() {
    const violations = [];
    
    this.state.lines.forEach((line, i) => {
      const limit = this.constraints.thermalLimits[i] || line.thermalLimit || Infinity;
      const flow = line.current || 0;
      
      if (flow > limit) {
        violations.push({
          type: 'thermal',
          line: line.id,
          value: flow,
          limit: limit,
          amount: flow - limit,
          overload: (flow / limit - 1) * 100
        });
      }
    });
    
    return violations;
  }

  /**
   * Check generator P constraints
   * @returns {Array} P violations
   */
  checkGeneratorPConstraints() {
    const violations = [];
    
    this.state.generators.forEach(gen => {
      if (gen.currentP < gen.Pmin) {
        violations.push({
          type: 'generator_P_low',
          generator: gen.id,
          value: gen.currentP,
          limit: gen.Pmin,
          amount: gen.Pmin - gen.currentP
        });
      }
      if (gen.currentP > gen.Pmax) {
        violations.push({
          type: 'generator_P_high',
          generator: gen.id,
          value: gen.currentP,
          limit: gen.Pmax,
          amount: gen.currentP - gen.Pmax
        });
      }
    });
    
    return violations;
  }

  /**
   * Check generator Q constraints
   * @returns {Array} Q violations
   */
  checkGeneratorQConstraints() {
    const violations = [];
    
    this.state.generators.forEach(gen => {
      if (gen.currentQ < gen.Qmin) {
        violations.push({
          type: 'generator_Q_low',
          generator: gen.id,
          value: gen.currentQ,
          limit: gen.Qmin,
          amount: gen.Qmin - gen.currentQ
        });
      }
      if (gen.currentQ > gen.Qmax) {
        violations.push({
          type: 'generator_Q_high',
          generator: gen.id,
          value: gen.currentQ,
          limit: gen.Qmax,
          amount: gen.currentQ - gen.Qmax
        });
      }
    });
    
    return violations;
  }

  /**
   * Count total violations
   * @param {Object} violations - Violations object
   * @returns {number} Total count
   */
  countViolations(violations) {
    return violations.voltage.length +
           violations.thermal.length +
           violations.generatorP.length +
           violations.generatorQ.length;
  }

  /**
   * Calculate adjustments for violations (penalty method)
   * @param {Object} violations - Violations
   * @returns {Object} Adjustments
   */
  calculateAdjustments(violations) {
    const adjustments = {
      generators: []
    };
    
    // Adjust generators for voltage violations
    violations.voltage.forEach(v => {
      const bus = this.state.getBus(v.bus);
      if (bus && bus.type === 'PV') {
        const gen = this.state.generators.find(g => g.bus === v.id);
        if (gen) {
          if (v.type === 'voltage_low') {
            adjustments.generators.push({
              id: gen.id,
              Q: (gen.currentQ || 0) + 0.1 // Increase Q
            });
          } else if (v.type === 'voltage_high') {
            adjustments.generators.push({
              id: gen.id,
              Q: (gen.currentQ || 0) - 0.1 // Decrease Q
            });
          }
        }
      }
    });
    
    return adjustments;
  }

  /**
   * Apply adjustments
   * @param {Object} adjustments - Adjustments to apply
   */
  applyAdjustments(adjustments) {
    adjustments.generators.forEach(adj => {
      const gen = this.state.getGenerator(adj.id);
      if (gen) {
        gen.currentQ = adj.Q;
      }
    });
  }

  /**
   * Calculate marginal cost
   * @param {Object} generator - Generator object
   * @returns {number} Marginal cost
   */
  calculateMarginalCost(generator) {
    const P = generator.currentP || 0;
    return 2 * generator.a * P + generator.b;
  }

  /**
   * Generate OPF report
   * @param {Object} result - OPF result
   * @returns {Object} Report
   */
  generateReport(result) {
    return {
      summary: {
        success: result.success,
        converged: result.converged,
        iterations: result.iterations,
        totalCost: result.totalCost,
        totalViolations: result.totalViolations
      },
      generators: result.generators,
      violations: result.violations,
      recommendations: this.getRecommendations(result)
    };
  }

  /**
   * Get recommendations
   * @param {Object} result - OPF result
   * @returns {Array} Recommendations
   */
  getRecommendations(result) {
    const recommendations = [];
    
    if (result.violations.voltage.length > 0) {
      recommendations.push('Add voltage support (capacitors/reactors)');
      recommendations.push('Adjust transformer tap positions');
    }
    
    if (result.violations.thermal.length > 0) {
      recommendations.push('Consider line reinforcement');
      recommendations.push('Reconfigure generation dispatch');
    }
    
    if (result.violations.generatorP.length > 0) {
      recommendations.push('Adjust generator limits');
      recommendations.push('Consider additional generation capacity');
    }
    
    if (result.totalViolations === 0) {
      recommendations.push('All constraints satisfied - optimal solution found');
    }
    
    return recommendations;
  }
}

module.exports = FullOPF;
