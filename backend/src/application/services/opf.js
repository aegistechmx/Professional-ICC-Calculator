/**
 * application/services/opf.js - OPF business logic
 * 
 * Responsibility: Business logic for optimal power flow operations
 */

const { solveOPF } = require('@/core/opf/algorithms');
const { runPowerFlow } = require('./powerflow');

/**
 * Run optimal power flow analysis
 * @param {Object} system - Power system model
 * @param {Object} options - OPF options
 * @returns {Object} OPF results
 */
async function runOPF(system, options = {}) {
  const {
    tolerance = 1e-6,
    maxIterations = 30,
    alpha = 0.5,
    powerFlowMethod = 'FDLF'
  } = options;

  console.log('⚡ OPF: Running economic dispatch optimization...');

  // Get base power flow solution
  const pfResult = await runPowerFlow(system, { method: powerFlowMethod });
  
  if (!pfResult.converged) {
    throw new Error('Base power flow did not converge');
  }

  // Run OPF optimization
  const result = await solveOPF(system, {
    tolerance,
    maxIterations,
    alpha,
    baseSolution: pfResult
  });

  console.log('⚡ OPF: ' + (result.converged ? 'CONVERGED' : 'NOT CONVERGED') + ' in ' + result.iterations + ' iterations');
  console.log('⚡ OPF: Final cost: $' + result.cost.toFixed(2));

  return {
    converged: result.converged,
    iterations: result.iterations,
    cost: result.cost,
    generation: result.generation,
    constraints: result.violations,
    lmp: result.lmp,
    basePowerFlow: pfResult,
    system,
    options,
    timestamp: new Date().toISOString()
  };
}

module.exports = { runOPF };