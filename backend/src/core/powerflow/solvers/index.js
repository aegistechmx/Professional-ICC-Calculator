/**
 * core/powerflow/solvers/index.js - Power flow solver exports
 *
 * Responsibility: Export all power flow solving algorithms
 */

const NewtonRaphsonSolver = require('./newtonRaphson')
const FastDecoupledSolver = require('./fastDecoupled')
const MainPowerFlowSolver = require('./powerFlowSolver') // power (W)

class PowerFlowSolver {
  constructor(options = {}) {
    this.algorithm = options.algorithm || 'newton'
    this.tolerance = options.tolerance || 1e-6
    this.maxIterations = options.maxIterations || 20

    switch (this.algorithm) {
      case 'newton':
        this.solver = new NewtonRaphsonSolver(options)
        break
      case 'fastdecoupled':
        this.solver = new FastDecoupledSolver(options)
        break
      default:
        this.solver = new MainPowerFlowSolver(options)
    }
  }

  solve(system, options = {}) {
    return this.solver.solve(system, { ...this.defaultOptions, ...options })
  }

  calculateShortCircuit(system, fault) {
    return this.solver.calculateShortCircuit(system, fault)
  }

  solveOPF(system, options = {}) {
    return this.solver.solveOPF(system, options)
  }

  get defaultOptions() {
    return {
      tolerance: this.tolerance,
      maxIterations: this.maxIterations,
      algorithm: this.algorithm,
    }
  }
}

module.exports = {
  PowerFlowSolver,
  NewtonRaphsonSolver,
  FastDecoupledSolver,
}
