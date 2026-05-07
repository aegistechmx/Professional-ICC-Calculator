/**
 * application/services/opf.js - OPF business logic
 *
 * Responsibility: Business logic for optimal power flow operations
 */

const { solveOPF } = require('@/core/opf/algorithms')
const { runPowerFlow } = require('./powerflow') // power (W)
const { defaultLogger } = require('@/debug/logger')

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
    powerFlowMethod = 'FDLF', // power (W)
  } = options
  const logger = defaultLogger.child('OPF')

  try {
    logger.info('Running OPF optimization', {
      tolerance,
      maxIterations,
      alpha,
      powerFlowMethod,
    })

    // Get base power flow solution
    const pfResult = await runPowerFlow(system, { method: powerFlowMethod }) // power (W)

    if (!pfResult.converged) {
      throw new Error('Base power flow did not converge')
    }

    // Run OPF optimization
    const result = await solveOPF(system, {
      tolerance,
      maxIterations,
      alpha,
      baseSolution: pfResult,
    })

    logger.info('OPF finished', {
      converged: result.converged,
      iterations: result.iterations,
      totalCost: Number(result.cost),
    })

    return {
      converged: result.converged,
      iterations: result.iterations,
      totalCost: Number(result.cost),
      generatorDispatch: result.generation,
      violations: result.violations,
      lmp: result.lmp,
      basePowerFlow: pfResult,
      system,
      options,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    logger.error('OPF failed', { error: error.message })
    throw error
  }
}

module.exports = { runOPF }
