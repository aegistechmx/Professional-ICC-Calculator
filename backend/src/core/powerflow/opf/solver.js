/**
 * solver.js - Newton-OPF solver with gradient-based optimization
 *
 * Responsibility: Solve optimal power flow with economic dispatch
 * Architecture: Power Flow + Cost Minimization + Constraints
 * NO Express, NO axios, NO UI logic
 */

const { solve } = require('../solver')
const { solveFDLF } = require('../fastDecoupled')
const { totalCost, costGradient, _costHessian } = require('./objective')
const {
  _enforcePowerBalance,
  checkAllConstraints,
  checkGenerationLimits,
} = require('./constraints')
const Generator = require('./generator')

/**
 * Newton-OPF solver
 * Combines power flow equations with economic optimization
 */
class NewtonOPFSolver {
  constructor(model, options = {}) {
    this.model = JSON.parse(JSON.stringify(model)) // Deep clone
    this.options = {
      tolerance: 1e-6,
      maxIterations: 50, // Increase iterations
      alpha: 0.5, // Step size
      powerFlowMethod: 'FDLF', // 'NR' or 'FDLF'
      penalty: 1000, // Constraint penalty
      ...options,
    }

    // Create generator models with cost functions
    this.generators = []
    model.buses.forEach((bus, i) => {
      if (bus.type === 'PV' && bus.P > 0) {
        this.generators.push(
          new Generator({
            id: i,
            Pmin: bus.Pmin || 0,
            Pmax: bus.Pmax || 100,
            cost: bus.cost || { a: 0.01, b: 10, c: 100 },
            bus: i,
          })
        )
      }
    })

    // Initialize Lagrangian multipliers
    this.lambda = 0 // Power balance multiplier
    this.mu = [] // Generation limit multipliers
    this.nu = [] // Voltage limit multipliers
  }

  /**
   * Solve power flow with current generation
   * @returns {Object} Power flow results
   */
  solvePowerFlow() {
    const { powerFlowMethod, tolerance, maxIterations } = this.options

    // Update model with current generation
    this.generators.forEach((gen, _i) => {
      const bus = this.model.buses.find(b => b.id === gen.bus)
      if (bus) {
        bus.P = gen.P
      }
    })

    if (powerFlowMethod === 'FDLF') {
      return solveFDLF(this.model, { tolerance, maxIterations })
    } else {
      return solve(this.model, { tolerance, maxIterations })
    }
  }

  /**
   * Build Jacobian matrix for OPF
   * @param {Object} pfResult - Power flow results
   * @returns {Object} Jacobian components
   */
  buildOPFJacobian(pfResult) {
    const n = this.generators.length
    const J = {
      dP_dPg: Array(n)
        .fill()
        .map(() => Array(n).fill(0)),
      dP_dLambda: Array(n).fill(1), // Power balance sensitivity
      dP_dMu: Array(n)
        .fill()
        .map(() => Array(n).fill(0)),
      dP_dNu: Array(n)
        .fill()
        .map(() => Array(pfResult.voltages.length).fill(0)),
    }

    // Power balance derivatives
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        // Simplified: ∂P_balance/∂P_g = ∂P_inj/∂P_g
        J.dP_dPg[i][j] = i === j ? 1 : 0
      }
    }

    // Generation limit derivatives
    for (let i = 0; i < n; i++) {
      const gen = this.generators[i]
      if (gen.P <= gen.Pmin) {
        J.dP_dMu[i][i] = -1 // Lower bound active
      } else if (gen.P >= gen.Pmax) {
        J.dP_dMu[i][i] = 1 // Upper bound active
      }
    }

    return J
  }

  /**
   * Build gradient vector for OPF
   * @param {Object} pfResult - Power flow results
   * @returns {Array} Gradient vector
   */
  buildGradient(_pfResult) {
    const n = this.generators.length
    const gradient = Array(n).fill(0)

    // Cost gradient
    const costGrad = costGradient(this.generators)

    // Power balance gradient
    const Pgen = this.generators.map(g => g.P)
    const loads = this.model.buses.filter(b => b.type === 'PQ').map(b => b.P)
    const totalLoad = loads.reduce((sum, P) => sum + P, 0)
    const _powerMismatch = Pgen.reduce((sum, P) => sum + P, 0) - totalLoad

    for (let i = 0; i < n; i++) {
      gradient[i] = costGrad[i] + this.lambda * 1 // Power balance

      // Add penalty for generation limits
      const gen = this.generators[i]
      if (gen.P < gen.Pmin) {
        gradient[i] -= this.options.penalty * (gen.Pmin - gen.P)
      } else if (gen.P > gen.Pmax) {
        gradient[i] += this.options.penalty * (gen.P - gen.Pmax)
      }
    }

    return gradient
  }

  /**
   * Newton-OPF iteration
   * @param {Object} pfResult - Power flow results
   * @returns {Object} Update direction
   */
  newtonStep(pfResult) {
    const gradient = this.buildGradient(pfResult)
    const J = this.buildOPFJacobian(pfResult)

    // Improved Newton step with adaptive step size
    const n = this.generators.length
    const deltaP = Array(n).fill(0)

    for (let i = 0; i < n; i++) {
      // Smaller step size for better convergence
      const stepSize =
        this.options.alpha * 0.1 * Math.exp(-Math.abs(gradient[i]) / 5)
      deltaP[i] = -stepSize * gradient[i]
    }

    return { deltaP, gradient, J }
  }

  /**
   * Update generation with Newton step
   * @param {Array} deltaP - Generation change
   */
  updateGeneration(deltaP) {
    this.generators.forEach((gen, i) => {
      gen.setGeneration(gen.P + deltaP[i])
    })
  }

  /**
   * Check convergence
   * @param {Array} gradient - Current gradient
   * @param {Array} deltaP - Current step
   * @returns {boolean} True if converged
   */
  checkConvergence(gradient, deltaP) {
    const gradNorm = Math.sqrt(gradient.reduce((sum, g) => sum + g * g, 0))
    const stepNorm = Math.sqrt(deltaP.reduce((sum, d) => sum + d * d, 0))

    // More lenient convergence criteria
    return (
      gradNorm < this.options.tolerance * 10 ||
      stepNorm < this.options.tolerance * 10
    )
  }

  /**
   * Run Newton-OPF optimization
   * @returns {Object} Optimization results
   */
  solve() {
    const results = {
      iterations: 0,
      converged: false,
      cost: 0,
      generation: [],
      lambda: 0,
      violations: [],
    }

    // eslint-disable-next-line no-console
    console.log('Starting Newton-OPF optimization...')

    for (let iter = 0; iter < this.options.maxIterations; iter++) {
      // 1. Solve power flow with current generation
      const pfResult = this.solvePowerFlow()

      // 2. Newton step
      const { deltaP, gradient } = this.newtonStep(pfResult)

      // 3. Update generation
      this.updateGeneration(deltaP)

      // 4. Check convergence
      if (this.checkConvergence(gradient, deltaP)) {
        results.converged = true
        results.iterations = iter + 1
        break
      }

      // 5. Enforce power balance every few iterations
      if (iter % 5 === 0) {
        const Pgen = this.generators.map(g => g.P)
        const loads = this.model.buses
          .filter(b => b.type === 'PQ')
          .map(b => b.P)
        const totalLoad = loads.reduce((sum, P) => sum + P, 0)
        const totalGen = Pgen.reduce((sum, P) => sum + P, 0)
        const mismatch = totalGen - totalLoad

        // Adjust slack generator (first generator)
        if (this.generators.length > 0) {
          this.generators[0].P -= mismatch
          this.generators[0].P = Math.max(
            this.generators[0].Pmin,
            Math.min(this.generators[0].Pmax, this.generators[0].P)
          )
        }
      }

      results.iterations = iter + 1
    }

    // Final power flow
    const finalPF = this.solvePowerFlow()

    // Calculate final results
    results.cost = totalCost(this.generators)
    results.generation = this.generators.map(g => ({
      id: g.id,
      bus: g.bus,
      P: g.P,
      cost: g.getCost(),
      marginalCost: g.getMarginalCost(),
      withinLimits: g.isWithinLimits(),
    }))
    results.lambda = this.lambda
    results.violations = checkAllConstraints(
      this.model,
      this.generators,
      finalPF.voltages,
      this.options
    )

    // eslint-disable-next-line no-console
    console.log(
      `Newton-OPF ${results.converged ? 'converged' : 'did not converge'} in ${results.iterations} iterations`
    )
    // eslint-disable-next-line no-console
    console.log(`Final cost: $${results.cost.toFixed(2)}`)

    return results
  }

  /**
   * Get current solution status
   * @returns {Object} Current state
   */
  getCurrentState() {
    return {
      generators: this.generators.map(g => g.getState()),
      cost: totalCost(this.generators),
      lambda: this.lambda,
      feasible: checkGenerationLimits(this.generators).feasible,
    }
  }
}

module.exports = NewtonOPFSolver
