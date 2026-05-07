/**
 * core/powerflow/solvers.js - Power Flow Solvers Collection
 *
 * Responsibility: Export all power flow solving algorithms
 */

const { solveLoadFlowRobust } = require('./newton/solver')
const { solveFDLF } = require('./fastDecoupled')
const NewtonRaphsonSolver = require('./solvers/newtonRaphson')

class PowerFlowSolver {
  constructor(options = {}) {
    this.options = {
      method: 'newton',
      maxIterations: 20,
      tolerance: 1e-6,
      ...options,
    }
  }

  /**
   * Solve power flow using configured method
   * @param {Object} system - Power system model
   * @param {Object} options - Override solver options
   * @returns {Object} Power flow solution
   */
  solve(system, options = {}) {
    const mergedOptions = { ...this.options, ...options }

    switch (mergedOptions.method) {
      case 'newton':
        return this._solveNewtonCompat(system, mergedOptions)
      case 'fdlf':
        return solveFDLF(system, mergedOptions)
      default:
        return this._solveNewtonCompat(system, mergedOptions)
    }
  }

  _solveNewtonCompat(system, mergedOptions) {
    const solver = new NewtonRaphsonSolver({
      tolerance: mergedOptions.tolerance,
      maxIterations: mergedOptions.maxIterations,
    })

    return solver.solve(system, {
      tolerance: mergedOptions.tolerance,
      maxIterations: mergedOptions.maxIterations,
    })
  }

  /**
   * Calculate short circuit current
   * @param {Object} system - Power system model
   * @param {Object} fault - Fault parameters
   * @returns {Object} Short circuit analysis results
   */
  calculateShortCircuit(system, fault) {
    const solver = new NewtonRaphsonSolver({
      tolerance: this.options.tolerance,
      maxIterations: this.options.maxIterations,
    })

    return solver.calculateShortCircuit(system, fault)
  }

  /**
   * Solve optimal power flow
   * @param {Object} system - Power system model
   * @returns {Object} OPF solution
   */
  solveOPF(system) {
    const solver = new NewtonRaphsonSolver({
      tolerance: this.options.tolerance,
      maxIterations: this.options.maxIterations,
    })

    return solver.solveOPF(system, this.options)
  }

  /**
   * Set solver options
   * @param {Object} options - Solver options
   */
  setOptions(options) {
    this.options = { ...this.options, ...options }
  }
}

module.exports = {
  PowerFlowSolver,
  solveNR: solveLoadFlowRobust,
  solveFDLF,

  // Legacy exports for compatibility
  solvePowerFlow: solveLoadFlowRobust,
  solveLoadFlowRobust,
}
