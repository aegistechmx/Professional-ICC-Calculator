
/**
 * application/opf/runOPF.js
 * 
 * Responsibility: Business logic for optimal power flow operations
 * NO Express, NO axios, NO UI logic
 */

const NewtonOPFSolver = require('@/core/powerflow/opf/solver');

/**
 * Run optimal power flow
 * @param {Object} system - Power system model
 * @param {Object} options - OPF options
 * @returns {Object} OPF results
 */
function runOPF(system, options = {}) {
  const {
    tolerance = 1e-6,
    maxIterations = 30,
    alpha = 0.5,
    powerFlowMethod = 'FDLF'
  } = options;

  const solver = new NewtonOPFSolver(system, {
    tolerance,
    maxIterations,
    alpha,
    powerFlowMethod
  });

  const result = solver.solve();

  return {
    converged: result.converged,
    iterations: result.iterations,
    cost: result.cost,
    generation: result.generation,
    constraints: result.violations,
    system: system,
    options
  };
}

module.exports = {
  runOPF
};
