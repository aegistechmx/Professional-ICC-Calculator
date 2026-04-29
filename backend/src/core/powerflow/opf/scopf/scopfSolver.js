/**
 * scopfSolver.js - Security-Constrained Optimal Power Flow solver
 * 
 * Responsibility: Solve OPF with N-1 contingency constraints
 * Architecture: OPF + Contingency Evaluation + Security Constraints
 * NO Express, NO axios, NO UI logic
 */

const NewtonOPFSolver = require('../solver');
const { 
  generateN1Contingencies, 
  applyContingency 
} = require('./contingencyGenerator');
const { 
  evaluateSecurityConstraints 
} = require('./securityConstraints');

/**
 * SCOPF Solver - Security-Constrained Optimal Power Flow
 * Combines economic dispatch with security analysis
 */
class SCOPFSolver {
  constructor(model, options = {}) {
    this.model = JSON.parse(JSON.stringify(model)); // Deep clone
    this.options = {
      tolerance: 1e-6,
      maxIterations: 30,
      alpha: 0.3,
      powerFlowMethod: 'FDLF',
      maxContingencies: 20,
      voltageMin: 0.9,
      voltageMax: 1.1,
      lineLimitFactor: 1.0,
      penalty: 1000,
      parallel: false,
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

    // Generate contingencies
    this.contingencies = generateN1Contingencies(model);
    console.log(`Generated ${this.contingencies.length} N-1 contingencies for SCOPF`);
  }

  /**
   * Solve SCOPF problem
   * @returns {Object} SCOPF results
   */
  solve() {
    console.log('Starting SCOPF (Security-Constrained OPF) optimization...');
    
    const results = {
      converged: false,
      iterations: 0,
      baseOPF: null,
      securityViolations: [],
      secureSolution: null,
      cost: 0,
      contingencies: [],
      summary: {
        totalContingencies: this.contingencies.length,
        criticalViolations: 0,
        marginalViolations: 0,
        secure: false
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

    // 2. Evaluate security constraints
    console.log('2. Evaluating security constraints...');
    const securityEval = evaluateSecurityConstraints(
      this.model,
      results.baseOPF,
      this.contingencies,
      {
        voltageMin: this.options.voltageMin,
        voltageMax: this.options.voltageMax,
        lineLimitFactor: this.options.lineLimitFactor,
        tolerance: this.options.tolerance,
        maxIterations: this.options.maxIterations,
        method: this.options.powerFlowMethod
      }
    );

    results.securityViolations = securityEval.violations;
    results.summary.criticalViolations = securityEval.criticalViolations.length;
    results.summary.marginalViolations = securityEval.marginalViolations.length;
    results.summary.secure = securityEval.secure;

    if (securityEval.secure) {
      console.log('Base case is secure - SCOPF complete');
      results.converged = true;
      results.secureSolution = results.baseOPF;
      return results;
    }

    // 3. Security-constrained optimization
    console.log('3. Applying security constraints...');
    results.contingencies = this.applySecurityConstraints(results.baseOPF, securityEval);

    // 4. Re-solve OPF with constraints
    console.log('4. Re-solving OPF with security constraints...');
    const constrainedOPF = this.solveWithSecurityConstraints(results.contingencies);

    results.secureSolution = constrainedOPF;
    results.converged = constrainedOPF.converged;
    results.cost = constrainedOPF.cost;
    results.iterations += constrainedOPF.iterations;

    console.log(`SCOPF ${results.converged ? 'converged' : 'did not converge'} in ${results.iterations} total iterations`);
    console.log(`Final cost: $${results.cost.toFixed(2)}`);

    return results;
  }

  /**
   * Apply security constraints to OPF solution
   * @param {Object} baseOPF - Base case OPF solution
   * @param {Object} securityEval - Security evaluation results
   * @returns {Array} Security constraints for OPF
   */
  applySecurityConstraints(baseOPF, securityEval) {
    const constraints = [];

    // Add generation adjustments for critical contingencies
    securityEval.criticalViolations.forEach(violation => {
      if (violation.type === 'overload') {
        // Reduce generation in affected area
        constraints.push({
          type: 'generation_limit',
          generator: 0, // Adjust slack generator
          adjustment: -0.1, // Reduce generation
          reason: `Line ${violation.line} overload contingency`
        });
      } else if (violation.type === 'undervoltage') {
        // Increase generation to support voltage
        constraints.push({
          type: 'generation_limit',
          generator: 0,
          adjustment: 0.1,
          reason: `Bus ${violation.bus} undervoltage contingency`
        });
      }
    });

    return constraints;
  }

  /**
   * Solve OPF with additional security constraints
   * @param {Array} securityConstraints - Security constraints
   * @returns {Object} Constrained OPF solution
   */
  solveWithSecurityConstraints(securityConstraints) {
    // Apply constraints to OPF solver
    const constrainedModel = JSON.parse(JSON.stringify(this.model));

    // Apply generation adjustments
    securityConstraints.forEach(constraint => {
      if (constraint.type === 'generation_limit') {
        const gen = constrainedModel.generators.find(g => g.id === constraint.generator);
        if (gen) {
          gen.Pmax = Math.max(gen.Pmin, gen.Pmax + constraint.adjustment);
          gen.Pmin = Math.min(gen.Pmax, gen.Pmin + constraint.adjustment);
        }
      }
    });

    // Create new OPF solver with constraints
    const constrainedOPF = new NewtonOPFSolver(constrainedModel, {
      tolerance: this.options.tolerance,
      maxIterations: this.options.maxIterations,
      alpha: this.options.alpha * 0.5, // Smaller steps for constrained case
      powerFlowMethod: this.options.powerFlowMethod,
      penalty: this.options.penalty * 2 // Higher penalty for security
    });

    return constrainedOPF.solve();
  }

  /**
   * Get SCOPF summary
   * @returns {Object} Summary statistics
   */
  getSummary() {
    return {
      totalContingencies: this.contingencies.length,
      lineContingencies: this.contingencies.filter(c => c.type === 'line_outage').length,
      generatorContingencies: this.contingencies.filter(c => c.type === 'generator_outage').length,
      options: this.options
    };
  }

  /**
   * Evaluate contingency impact
   * @param {Object} contingency - Contingency scenario
   * @returns {Object} Impact assessment
   */
  evaluateContingencyImpact(contingency) {
    const modifiedSystem = applyContingency(this.model, contingency);
    
    // Quick power flow evaluation
    const pfResult = this.opfSolver.solvePowerFlow();

    return {
      contingency,
      converged: pfResult.converged,
      impact: {
        voltageViolations: this.countVoltageViolations(pfResult.voltages),
        overloads: this.countOverloads(modifiedSystem, pfResult),
        severity: this.assessSeverity(pfResult)
      }
    };
  }

  /**
   * Count voltage violations
   * @param {Array} voltages - Voltage results
   * @returns {number} Number of violations
   */
  countVoltageViolations(voltages) {
    let count = 0;
    voltages.forEach(V => {
      const magnitude = Math.sqrt(V.re * V.re + V.im * V.im);
      if (magnitude < this.options.voltageMin || magnitude > this.options.voltageMax) {
        count++;
      }
    });
    return count;
  }

  /**
   * Count overloads
   * @param {Object} system - System model
   * @param {Object} pfResult - Power flow results
   * @returns {number} Number of overloads
   */
  countOverloads(system, pfResult) {
    let count = 0;
    system.branches.forEach(branch => {
      if (branch.limit && pfResult.flows) {
        const flow = pfResult.flows.find(f => f.id === branch.id);
        if (flow && Math.abs(flow.power) > branch.limit * this.options.lineLimitFactor) {
          count++;
        }
      }
    });
    return count;
  }

  /**
   * Assess overall severity
   * @param {Object} pfResult - Power flow results
   * @returns {string} Severity level
   */
  assessSeverity(pfResult) {
    const voltageIssues = this.countVoltageViolations(pfResult.voltages);
    const overloads = this.countOverloads(this.model, pfResult);

    if (voltageIssues > 3 || overloads > 2) {
      return 'critical';
    } else if (voltageIssues > 0 || overloads > 0) {
      return 'marginal';
    }
    return 'secure';
  }
}

module.exports = SCOPFSolver;
