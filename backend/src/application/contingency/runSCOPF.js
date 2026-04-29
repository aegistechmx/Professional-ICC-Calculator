/**
 * application/contingency/runSCOPF.js
 * 
 * Responsibility: Business logic for security-constrained OPF operations
 * NO Express, NO axios, NO UI logic
 */

const TSSCOPFSolver = require('@/core/powerflow/opf/scopf/tsScopfSolver');

/**
 * Run security-constrained OPF
 * @param {Object} system - Power system model
 * @param {Object} options - SCOPF options
 * @returns {Object} SCOPF results
 */
function runSCOPF(system, options = {}) {
  const {
    tolerance = 1e-6,
    maxIterations = 20,
    alpha = 0.3,
    powerFlowMethod = 'FDLF',
    maxContingencies = 10,
    voltageMin = 0.95,
    voltageMax = 1.05,
    lineLimitFactor = 1.0,
    penalty = 1000,
    stabilityPenalty = 5000,
    simulationTime = 5.0,
    timeStep = 0.01,
    stabilityCriteria = ['angle', 'speed']
  } = options;

  const solver = new TSSCOPFSolver(system, {
    tolerance,
    maxIterations,
    alpha,
    powerFlowMethod,
    maxContingencies,
    voltageMin,
    voltageMax,
    lineLimitFactor,
    penalty,
    stabilityPenalty,
    simulationTime,
    timeStep,
    stabilityCriteria
  });

  const result = solver.solve();

  return {
    converged: result.converged,
    iterations: result.iterations,
    baseOPF: result.baseOPF,
    secureSolution: result.secureSolution,
    stableSolution: result.stableSolution,
    cost: result.cost,
    contingencies: result.contingencies,
    stabilityResults: result.stabilityResults,
    summary: result.summary,
    system,
    options
  };
}

module.exports = { runSCOPF };
