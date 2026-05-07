/**
 * application/services/powerflow.js - Power flow business logic
 *
 * Responsibility: Business logic for power flow operations
 */

const { solveNR, solveFDLF } = require('@/core/powerflow/solvers') // power (W)
const { defaultLogger } = require('@/debug/logger')

/**
 * Run power flow analysis
 * @param {Object} system - Power system model
 * @param {Object} options - Solver options
 * @returns {Object} Power flow results
 */
async function runPowerFlow(system, options = {}) {
  const { method = 'FDLF', tolerance = 1e-6, maxIterations = 20 } = options
  const logger = defaultLogger.child('PowerFlow')

  try {
    logger.info('Running power flow analysis', {
      method,
      tolerance,
      maxIterations,
    })

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

    logger.info('Power flow finished', {
      converged: result.converged,
      iterations: result.iterations,
    })

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
  } catch (error) {
    logger.error('Power flow failed', { error: error.message })
    throw error
  }
}

module.exports = { runPowerFlow }
