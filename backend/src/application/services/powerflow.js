/**
 * application/services/powerflow.js - Power flow business logic
 *
 * Responsibility: Business logic for power flow operations
 */

const { solveNR, solveFDLF } = require('@/core/powerflow/solvers') // power (W)

/**
 * Run power flow analysis
 * @param {Object} system - Power system model
 * @param {Object} options - Solver options
 * @returns {Object} Power flow results
 */
async function runPowerFlow(system, options = {}) {
  const { method = 'FDLF', tolerance = 1e-6, maxIterations = 20 } = options

  // eslint-disable-next-line no-console
  console.log('⚡ PowerFlow: Running ' + method + ' analysis...')

  let result
  switch (method) {
    case 'NR':
      result = await solveNR(system, { tolerance, maxIterations })
      break
    case 'FDLF':
      result = await solveFDLF(system, { tolerance, maxIterations })
      break
    default:
      throw new Error('Unknown power flow method: ' + method)
  }

  // eslint-disable-next-line no-console
  console.log(
    '⚡ PowerFlow: ' +
      (result.converged ? 'CONVERGED' : 'NOT CONVERGED') +
      ' in ' +
      result.iterations +
      ' iterations'
  )

  return {
    method,
    converged: result.converged,
    iterations: result.iterations,
    voltages: result.voltages,
    flows: result.flows,
    system,
    options,
    timestamp: new Date().toISOString(),
  }
}

module.exports = { runPowerFlow }
