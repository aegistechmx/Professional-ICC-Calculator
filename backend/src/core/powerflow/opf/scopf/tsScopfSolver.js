/**
 * tsScopfSolver.js - Transient Stability Security-Constrained OPF solver
 * 
 * Responsibility: Solve TS-SCOPF (OPF + N-1 + transient stability)
 * Architecture: OPF → Dynamic Simulation → Stability Constraints → Optimization
 * NO Express, NO axios, NO UI logic
 */

const NewtonOPFSolver = require('../solver');
const DynamicSimulator = require('../../stability/dynamicSimulator');
const { 
  generateN1Contingencies,
  applyContingency 
} = require('./contingencyGenerator');
const { 
  evaluateSecurityConstraints 
} = require('./securityConstraints');
const { 
  checkSystemStability,
  calculateStabilityIndices 
} = require('../../stability/stabilityCriteria');

/**
 * TS-SCOPF Solver - Transient Stability Security-Constrained OPF
 * Combines economic dispatch with N-1 contingencies and transient stability
 */
class TSSCOPFSolver {
  constructor(model, options = {}) {
    this.model = JSON.parse(JSON.stringify(model)); // Deep clone
    this.options = {
      tolerance: 1e-6,
      maxIterations: 20,
      alpha: 0.3,
      powerFlowMethod: 'FDLF',
      maxContingencies: 10,
      voltageMin: 0.9,
      voltageMax: 1.1,
      lineLimitFactor: 1.0,
      penalty: 1000,
      stabilityPenalty: 5000, // Higher penalty for instability
      simulationTime: 5.0, // seconds
      timeStep: 0.01, // seconds
      stabilityCriteria: ['angle', 'speed'], // 'angle', 'speed', 'energy'
      ...options
    };

    // Create OPF solver
    this.opfSolver = new NewtonOPFSolver(model, {
      tolerance: this.options.tolerance,
      maxIterations: this.options.maxIterations,
      alpha: this.options.alpha,
      powerFlowMethod: this.options.powerFlowMethod,
      penalty: this.options.penalty
    });

    // Create dynamic simulator
    this.dynamicSimulator = new DynamicSimulator(model, {
      dt: this.options.timeStep,
      tEnd: this.options.simulationTime,
      method: 'RK4',
      powerFlowMethod: this.options.powerFlowMethod
    });

    // Generate N-1 contingencies
    this.contingencies = generateN1Contingencies(model);
    console.log(`Generated ${this.contingencies.length} N-1 contingencies for TS-SCOPF`);
  }

  /**
   * Solve TS-SCOPF problem
   * @returns {Object} TS-SCOPF results
   */
  solve() {
    console.log('Starting TS-SCOPF (Transient Stability Security-Constrained OPF) optimization...');
    
    const results = {
      converged: false,
      iterations: 0,
      baseOPF: null,
      secureSolution: null,
      stableSolution: null,
      cost: 0,
      contingencies: [],
      stabilityResults: [],
      summary: {
        totalContingencies: this.contingencies.length,
        criticalViolations: 0,
        marginalViolations: 0,
        unstableCases: 0,
        secure: false,
        stable: false
      }
    };

    // 1. Solve base case OPF
    console.log('1. Solving base case OPF...');
    results.baseOPF = this.opfSolver.solve();
    results.cost = results.baseOPF.cost;
    results.iterations = results.baseOPF.iterations;

    if (!results.baseOPF.converged) {
      console.log('Base case OPF did not converge');
      return results;
    }

    // 2. Evaluate stability for base case
    console.log('2. Evaluating transient stability for base case...');
    const baseStability = this.evaluateStability(results.baseOPF);
    results.stabilityResults.push({
      type: 'base_case',
      stability: baseStability,
      secure: baseStability.overallStable
    });

    // 3. Evaluate N-1 contingencies with stability
    console.log('3. Evaluating N-1 contingencies with transient stability...');
    const contingencyResults = this.evaluateContingenciesWithStability(results.baseOPF);
    results.contingencies = contingencyResults;

    // 4. Check if base case is secure and stable
    const baseSecure = this.checkBaseCaseSecurity(results.baseOPF);
    const baseStable = baseStability.overallStable;

    if (baseSecure && baseStable) {
      console.log('Base case is secure and stable - TS-SCOPF complete');
      results.converged = true;
      results.secureSolution = results.baseOPF;
      results.stableSolution = results.baseOPF;
      results.summary.secure = true;
      results.summary.stable = true;
      return results;
    }

    // 5. Apply stability constraints and re-optimize
    console.log('4. Applying stability constraints and re-optimizing...');
    const constrainedOPF = this.solveWithStabilityConstraints(contingencyResults);

    results.secureSolution = constrainedOPF;
    results.converged = constrainedOPF.converged;
    results.cost = constrainedOPF.cost;
    results.iterations += constrainedOPF.iterations;

    console.log(`TS-SCOPF ${results.converged ? 'converged' : 'did not converge'} in ${results.iterations} total iterations`);
    console.log(`Final cost: $${results.cost.toFixed(2)}`);

    return results;
  }

  /**
   * Evaluate transient stability for OPF solution
   * @param {Object} opfResult - OPF solution
   * @returns {Object} Stability evaluation results
   */
  evaluateStability(opfResult) {
    // Update system with OPF solution
    const updatedSystem = this.updateSystemWithOPF(this.model, opfResult);

    // Create fault scenarios for stability testing
    const faultScenarios = this.generateStabilityFaults(updatedSystem);

    // Simulate each fault scenario
    const stabilityResults = [];
    let unstableCases = 0;

    faultScenarios.forEach((fault, i) => {
      console.log(`  Evaluating stability for fault ${i + 1}/${faultScenarios.length}: ${fault.description}`);
      
      const result = this.dynamicSimulator.simulateWithFault(fault);
      stabilityResults.push(result);

      if (!result.stable) {
        unstableCases++;
      }
    });

    // Overall stability assessment
    const overallStability = this.assessOverallStability(stabilityResults);

    return {
      faultScenarios,
      stabilityResults,
      unstableCases,
      totalCases: faultScenarios.length,
      overallStable: overallStability,
      stabilityIndex: this.calculateStabilityIndex(stabilityResults)
    };
  }

  /**
   * Evaluate N-1 contingencies with stability analysis
   * @param {Object} baseOPF - Base case OPF solution
   * @returns {Array} Contingency results with stability
   */
  evaluateContingenciesWithStability(baseOPF) {
    const results = [];

    this.contingencies.forEach((contingency, i) => {
      console.log(`  Evaluating contingency ${i + 1}/${this.contingencies.length}: ${contingency.description}`);
      
      // Apply contingency to system
      const contingencySystem = applyContingency(this.model, contingency);

      // Solve OPF for contingency
      const contingencyOPF = this.solveContingencyOPF(contingencySystem, baseOPF);

      // Evaluate stability for contingency
      const stability = this.evaluateStability(contingencyOPF);

      results.push({
        contingency,
        opfResult: contingencyOPF,
        stabilityResult: stability,
        secure: contingencyOPF.converged && stability.overallStable,
        cost: contingencyOPF.cost,
        costIncrease: contingencyOPF.cost - baseOPF.cost
      });
    });

    return results;
  }

  /**
   * Solve OPF for contingency case
   * @param {Object} system - Contingency system model
   * @param {Object} baseOPF - Base case OPF solution
   * @returns {Object} Contingency OPF result
   */
  solveContingencyOPF(system, baseOPF) {
    // Create OPF solver for contingency
    const contingencySolver = new NewtonOPFSolver(system, {
      tolerance: this.options.tolerance,
      maxIterations: this.options.maxIterations,
      alpha: this.options.alpha * 0.8, // Smaller steps for contingency
      powerFlowMethod: this.options.powerFlowMethod,
      penalty: this.options.penalty
    });

    return contingencySolver.solve();
  }

  /**
   * Update system with OPF solution
   * @param {Object} system - Original system
   * @param {Object} opfResult - OPF solution
   * @returns {Object} Updated system
   */
  updateSystemWithOPF(system, opfResult) {
    const updated = JSON.parse(JSON.stringify(system));

    // Update generation from OPF solution
    opfResult.generation.forEach((gen, i) => {
      const bus = updated.buses.find(b => b.id === gen.bus);
      if (bus) {
        bus.P = gen.P;
        bus.Q = gen.Q || 0;
      }
    });

    return updated;
  }

  /**
   * Generate fault scenarios for stability testing
   * @param {Object} system - System model
   * @returns {Array} Fault scenarios
   */
  generateStabilityFaults(system) {
    const faults = [];

    // Generate faults at critical buses
    system.buses.forEach((bus, i) => {
      if (bus.type === 'PQ' || bus.type === 'PV') {
        faults.push({
          type: 'three_phase',
          bus: bus.id,
          start: 0.1,
          clear: 0.2,
          R: 0.001,
          X: 0.01,
          description: `3-phase fault at Bus ${bus.id}`
        });
      }
    });

    return faults;
  }

  /**
   * Assess overall stability from multiple scenarios
   * @param {Array} stabilityResults - Stability results
   * @returns {boolean} Overall stability
   */
  assessOverallStability(stabilityResults) {
    const stableCases = stabilityResults.filter(r => r.stable).length;
    const totalCases = stabilityResults.length;

    // Consider stable if at least 80% of cases are stable
    return (stableCases / totalCases) >= 0.8;
  }

  /**
   * Calculate stability index
   * @param {Array} stabilityResults - Stability results
   * @returns {number} Stability index (0-1)
   */
  calculateStabilityIndex(stabilityResults) {
    if (stabilityResults.length === 0) return 0;

    const stableCases = stabilityResults.filter(r => r.stable).length;
    const totalCases = stabilityResults.length;

    return stableCases / totalCases;
  }

  /**
   * Check base case security
   * @param {Object} opfResult - OPF result
   * @returns {boolean} True if secure
   */
  checkBaseCaseSecurity(opfResult) {
    // Check basic constraints
    const hasVoltageViolations = opfResult.violations && 
      opfResult.violations.some(v => v.type.includes('voltage'));
    const hasFlowViolations = opfResult.violations && 
      opfResult.violations.some(v => v.type.includes('overload'));

    return !hasVoltageViolations && !hasFlowViolations;
  }

  /**
   * Solve OPF with stability constraints
   * @param {Array} contingencyResults - Contingency results
   * @returns {Object} Constrained OPF solution
   */
  solveWithStabilityConstraints(contingencyResults) {
    // Apply stability penalties to system
    const constrainedSystem = this.applyStabilityConstraints(contingencyResults);

    // Create OPF solver with constraints
    const constrainedSolver = new NewtonOPFSolver(constrainedSystem, {
      tolerance: this.options.tolerance,
      maxIterations: this.options.maxIterations,
      alpha: this.options.alpha * 0.5, // Very small steps for stability
      powerFlowMethod: this.options.powerFlowMethod,
      penalty: this.options.stabilityPenalty // Higher penalty for stability
    });

    return constrainedSolver.solve();
  }

  /**
   * Apply stability constraints to system
   * @param {Array} contingencyResults - Contingency results
   * @returns {Object} System with stability constraints
   */
  applyStabilityConstraints(contingencyResults) {
    const constrained = JSON.parse(JSON.stringify(this.model));

    // Find unstable contingencies
    const unstableContingencies = contingencyResults.filter(r => 
      !r.stabilityResult.overallStable);

    // Apply generation adjustments for unstable cases
    unstableContingencies.forEach(result => {
      if (result.contingency.type === 'generator_outage') {
        // Increase reserve requirements
        constrained.buses.forEach(bus => {
          if (bus.type === 'PV') {
            bus.Pmax *= 0.9; // Reduce maximum generation
          }
        });
      } else if (result.contingency.type === 'line_outage') {
        // Reduce loading on affected area
        const affectedGenerators = this.findAffectedGenerators(result.contingency);
        affectedGenerators.forEach(genId => {
          const gen = constrained.buses.find(b => b.id === genId);
          if (gen && gen.type === 'PV') {
            gen.P *= 0.95; // Reduce generation by 5%
          }
        });
      }
    });

    return constrained;
  }

  /**
   * Find generators affected by contingency
   * @param {Object} contingency - Contingency specification
   * @returns {Array} Affected generator IDs
   */
  findAffectedGenerators(contingency) {
    const affected = [];

    if (contingency.type === 'line_outage') {
      // Find generators connected to affected buses
      this.model.buses.forEach(bus => {
        if (bus.type === 'PV' && 
            (bus.id === contingency.from || bus.id === contingency.to)) {
          affected.push(bus.id);
        }
      });
    }

    return affected;
  }

  /**
   * Get TS-SCOPF summary
   * @returns {Object} Summary statistics
   */
  getSummary() {
    return {
      totalContingencies: this.contingencies.length,
      lineContingencies: this.contingencies.filter(c => c.type === 'line_outage').length,
      generatorContingencies: this.contingencies.filter(c => c.type === 'generator_outage').length,
      simulationTime: this.options.simulationTime,
      timeStep: this.options.timeStep,
      stabilityCriteria: this.options.stabilityCriteria,
      options: this.options
    };
  }
}

module.exports = TSSCOPFSolver;
