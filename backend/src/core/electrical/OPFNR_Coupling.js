/**
 * OPF + NR Coupling Module
 * 
 * Couples Optimal Power Flow with Newton-Raphson solver
 * Iterates until convergence of both optimization and network solution
 */

const EconomicDispatch = require('./EconomicDispatch');
const { solveLoadFlow } = require('./NewtonRaphsonSolver');
const ElectricalState = require('./ElectricalState');

/**
 * OPF-NR Coupling Class
 */
class OPFNRCoupling {
  constructor(state) {
    this.state = state;
    this.economicDispatch = new EconomicDispatch();
    this.maxIterations = 20;
    this.tolerance = 0.001;
  }

  /**
   * Solve coupled OPF-NR problem
   * @param {Object} options - Solver options
   * @returns {Object} Coupled solution results
   */
  solveCoupled(options = {}) {
    const {
      maxIterations = this.maxIterations,
      tolerance = this.tolerance,
      verbose = false
    } = options;
    
    let converged = false;
    let iteration = 0;
    let prevCost = Infinity;
    
    while (iteration < maxIterations && !converged) {
      if (verbose) {
        console.log(`Iteration ${iteration + 1}`);
      }
      
      // Step 1: Economic Dispatch (optimizes generator outputs)
      const dispatchResult = this.runEconomicDispatch();
      
      // Step 2: Update generator outputs in state
      this.updateGeneratorOutputs(dispatchResult.generators);
      
      // Step 3: Newton-Raphson Power Flow (solves network)
      const pfResult = this.runPowerFlow();
      
      // Step 4: Check convergence
      const costChange = Math.abs(dispatchResult.totalCost - prevCost);
      const pfConverged = pfResult.converged;
      
      converged = costChange < tolerance && pfConverged;
      prevCost = dispatchResult.totalCost;
      
      iteration++;
      
      if (verbose) {
        console.log(`  Cost: ${dispatchResult.totalCost.toFixed(2)}, Change: ${costChange.toFixed(4)}`);
        console.log(`  PF Converged: ${pfConverged}`);
      }
    }
    
    // Final power flow
    const finalPF = this.runPowerFlow();
    
    return {
      success: finalPF.converged,
      converged: converged,
      iterations: iteration,
      totalCost: prevCost,
      generators: this.state.generators.map(gen => ({
        id: gen.id,
        bus: gen.bus,
        P: gen.currentP,
        Q: gen.Q,
        marginalCost: this.economicDispatch.calculateMarginalCost(gen, gen.currentP)
      })),
      powerFlow: finalPF
    };
  }

  /**
   * Run economic dispatch
   * @returns {Object} Dispatch results
   */
  runEconomicDispatch() {
    // Calculate total load
    const totalLoad = this.state.loads.reduce((sum, load) => sum + load.P, 0);
    
    // Set up economic dispatch
    this.economicDispatch.generators = [];
    this.state.generators.forEach(gen => {
      this.economicDispatch.addGenerator({
        id: gen.id,
        bus: gen.bus,
        Pmin: gen.Pmin || 0,
        Pmax: gen.Pmax || 100,
        a: gen.a || 0.001,
        b: gen.b || 10,
        c: gen.c || 0
      });
    });
    
    this.economicDispatch.setLoad(totalLoad);
    
    // Solve economic dispatch
    return this.economicDispatch.solveEconomicDispatch();
  }

  /**
   * Update generator outputs from dispatch results
   * @param {Array} generators - Generator outputs from dispatch
   */
  updateGeneratorOutputs(generators) {
    generators.forEach(genOutput => {
      const gen = this.state.getGenerator(genOutput.id);
      if (gen) {
        gen.currentP = genOutput.P;
      }
    });
  }

  /**
   * Run power flow with current generator outputs
   * @returns {Object} Power flow results
   */
  runPowerFlow() {
    // Build Ybus
    const Ybus = this.state.Ybus;
    
    if (!Ybus) {
      this.state.rebuildMatrices();
    }
    
    // Solve load flow
    const result = solveLoadFlow(this.state.buses, Ybus, {
      tolerance: 1e-6,
      maxIterations: 50
    });
    
    // Update state with results
    this.state.setPowerFlowResults(result);
    
    return result;
  }

  /**
   * Check if solution respects constraints
   * @returns {Object} Constraint violations
   */
  checkConstraints() {
    const violations = {
      voltage: [],
      thermal: [],
      generator: []
    };
    
    // Check voltage limits
    this.state.buses.forEach(bus => {
      if (bus.V < 0.95) {
        violations.voltage.push({
          bus: bus.id,
          type: 'low',
          value: bus.V,
          limit: 0.95
        });
      }
      if (bus.V > 1.05) {
        violations.voltage.push({
          bus: bus.id,
          type: 'high',
          value: bus.V,
          limit: 1.05
        });
      }
    });
    
    // Check generator limits
    this.state.generators.forEach(gen => {
      if (gen.currentP < gen.Pmin) {
        violations.generator.push({
          generator: gen.id,
          type: 'below_min',
          value: gen.currentP,
          limit: gen.Pmin
        });
      }
      if (gen.currentP > gen.Pmax) {
        violations.generator.push({
          generator: gen.id,
          type: 'above_max',
          value: gen.currentP,
          limit: gen.Pmax
        });
      }
    });
    
    return violations;
  }

  /**
   * Generate coupled solution report
   * @param {Object} result - Coupled solution result
   * @returns {Object} Report
   */
  generateReport(result) {
    const violations = this.checkConstraints();
    
    return {
      summary: {
        success: result.success,
        converged: result.converged,
        iterations: result.iterations,
        totalCost: result.totalCost
      },
      generators: result.generators,
      powerFlow: result.powerFlow,
      constraints: {
        violations: violations,
        totalViolations: violations.voltage.length + violations.thermal.length + violations.generator.length
      },
      recommendations: this.getRecommendations(violations)
    };
  }

  /**
   * Get recommendations based on violations
   * @param {Object} violations - Constraint violations
   * @returns {Array} Recommendations
   */
  getRecommendations(violations) {
    const recommendations = [];
    
    if (violations.voltage.length > 0) {
      recommendations.push('Add voltage support (capacitors/reactors)');
      recommendations.push('Adjust transformer tap positions');
    }
    
    if (violations.generator.length > 0) {
      recommendations.push('Adjust generator limits');
      recommendations.push('Consider additional generation capacity');
    }
    
    if (violations.totalViolations === 0) {
      recommendations.push('Solution respects all constraints');
    }
    
    return recommendations;
  }
}

module.exports = OPFNRCoupling;
