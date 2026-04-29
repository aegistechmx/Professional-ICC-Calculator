
/**
 * application/powerflow/runPowerFlow.js
 * 
 * Responsibility: Business logic for power flow operations
 * NO Express, NO axios, NO UI logic
 */

const { solve } = require('@/core/powerflow/solver');
const { solveFDLF } = require('@/core/powerflow/fastDecoupled');

/**
 * Run power flow with specified method
 * @param {Object} system - Power system model
 * @param {Object} options - Solver options
 * @returns {Object} Power flow results
 */
function runPowerFlow(system, options = {}) {
  const {
    method = 'FDLF',
    tolerance = 1e-6,
    maxIterations = 20
  } = options;

  let result;
  
  switch (method) {
    case 'NR':
      result = solve(system, { tolerance, maxIterations });
      break;
    case 'FDLF':
      result = solveFDLF(system, { tolerance, maxIterations });
      break;
    default:
      throw new Error(`Unknown method: ${method}`);
  }

  return {
    method,
    converged: result.converged,
    iterations: result.iterations,
    voltages: result.voltages,
    flows: result.flows,
    system: system,
    options
  };
}

module.exports = {
  runPowerFlow
};
