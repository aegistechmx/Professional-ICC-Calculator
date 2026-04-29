/**
 * dynamicSolver.js - Dynamic power flow solver with generator dynamics
 *
 * Responsibility: Integrate power flow with generator swing equations
 * Architecture: Power Flow + Generator Dynamics → Time-domain simulation
 * NO Express, NO axios, NO UI logic
 */

const { solve } = require('../../solver')
const { solveFDLF } = require('../../fastDecoupled')
const Generator = require('../models/generator')
const { rk4Adaptive } = require('../integrators/rk4')

/**
 * Dynamic power flow solver
 * Integrates power flow with generator dynamics over time
 */
class DynamicPowerFlowSolver {
  constructor(model, options = {}) {
    this.model = JSON.parse(JSON.stringify(model)) // Deep clone
    this.options = {
      tolerance: 1e-6,
      maxIterations: 30,
      method: 'NR', // 'NR' or 'FDLF'
      dt: 0.01, // Time step (seconds)
      tEnd: 5.0, // End time (seconds)
      adaptiveDt: true,
      ...options,
    }

    // Create generator models
    this.generators = []
    this.generatorStates = [] // Initialize state array
    model.buses.forEach((bus, i) => {
      if (bus.type === 'PV' && bus.P > 0) {
        this.generators.push(
          new Generator({
            H: bus.H || 5.0, // Default inertia
            D: bus.D || 2.0, // Default damping
            Pm: bus.P,
            xd: bus.xd || 0.3, // Default reactance
          })
        )
        this.generatorStates.push(0) // δ
        this.generatorStates.push(1) // ω
      }
    })
  }

  /**
   * Update network voltages from generator angles
   * @param {Array} generators - Generator models
   * @param {Object} model - System model
   */
  updateNetworkFromGenerators(generators, model) {
    generators.forEach((gen, i) => {
      const bus = model.buses.find(b => b.id === i)
      if (bus) {
        // Update voltage magnitude and angle from generator state
        const state = gen.getState()
        bus.voltage = {
          magnitude: bus.voltage?.magnitude || 1.0, // Keep V magnitude
          angle: (state.delta * 180) / Math.PI, // Convert to degrees
        }
      }
    })
  }

  /**
   * Calculate power flow for current generator states
   * @param {Object} model - System model
   * @returns {Object} Power flow results
   */
  solvePowerFlow(model) {
    const { method, tolerance, maxIterations } = this.options

    if (method === 'FDLF') {
      return solveFDLF(model, { tolerance, maxIterations })
    } else {
      return solve(model, { tolerance, maxIterations })
    }
  }

  /**
   * Calculate derivatives for all generators
   * @param {Array} state - Current state vector
   * @param {Object} model - System model
   * @returns {Array} Derivatives vector
   */
  calculateDerivatives(state, model) {
    const derivatives = []

    // Update model with current generator states
    this.generators.forEach((gen, i) => {
      // Check if state array has values for this generator
      const generatorIndex = i
      if (this.generatorStates.length > generatorIndex * 2 + 1) {
        const genState = {
          delta: this.generatorStates[generatorIndex * 2], // δ for generator i
          omega: this.generatorStates[generatorIndex * 2 + 1], // ω for generator i
        }

        // Get terminal voltage from power flow
        const pf = this.solvePowerFlow(model)
        const bus = model.buses.find(b => b.id === i)

        if (bus && pf.voltages[i]) {
          const V = pf.voltages[i]
          const Vmag = Math.sqrt(V.re * V.re + V.im * V.im)
          const Vang = Math.atan2(V.im, V.re)

          // Calculate derivatives using swing equation
          const genDerivs = gen.derivatives(Vmag, Vang, 1.0) // Eq = 1.0 pu
          derivatives.push(genDerivs.dDelta)
          derivatives.push(genDerivs.dOmega)
        } else {
          derivatives.push(0)
          derivatives.push(0)
        }
      } else {
        derivatives.push(0)
        derivatives.push(0)
      }
    })

    return derivatives
  }

  /**
   * Check system stability
   * @param {Array} generators - Generator models
   * @returns {boolean} True if any generator is unstable
   */
  checkStability(generators) {
    return generators.some(gen => gen.isUnstable())
  }

  /**
   * Run dynamic simulation
   * @returns {Object} Simulation results
   */
  run() {
    const results = {
      time: [],
      angles: [],
      speeds: [],
      powerFlows: [],
      stable: true,
      instabilityTime: null,
    }

    // Initial state: [δ₁, ω₁, δ₂, ω₂, ...]
    let state = []
    this.generators.forEach(() => {
      state.push(0) // δ
      state.push(1) // ω
    })

    let time = 0
    const { dt, tEnd, adaptiveDt } = this.options

    while (time < tEnd && results.stable) {
      // Update network with current generator states
      this.updateNetworkFromGenerators(this.generators, this.model)

      // Calculate derivatives
      const derivatives = this.calculateDerivatives(state, this.model)

      // Integrate using RK4
      let newState
      if (adaptiveDt) {
        const step = rk4Adaptive(
          state,
          s => derivatives,
          dt,
          this.options.tolerance
        )
        newState = step.state
      } else {
        newState = rk4Step(state, s => derivatives, dt)
      }

      // Update generator states
      this.generators.forEach((gen, i) => {
        gen.delta = newState[i * 2]
        gen.omega = newState[i * 2 + 1]
      })

      // Check stability
      if (this.checkStability(this.generators)) {
        results.stable = false
        results.instabilityTime = time
        break
      }

      // Store results
      results.time.push(time)
      results.angles.push(this.generators.map(g => g.delta))
      results.speeds.push(this.generators.map(g => g.omega))

      // Store power flow at this time step
      const pf = this.solvePowerFlow(this.model)
      results.powerFlows.push(pf.voltages)

      state = newState
      time += dt
    }

    return results
  }

  /**
   * Get final simulation state
   * @returns {Object} Final state
   */
  getFinalState() {
    return {
      angles: this.generators.map(g => g.delta),
      speeds: this.generators.map(g => g.omega),
      stable: this.checkStability(this.generators),
    }
  }

  /**
   * Apply disturbance (fault)
   * @param {Object} fault - Fault specification
   */
  applyFault(fault) {
    if (fault.type === 'three_phase') {
      const bus = this.model.buses.find(b => b.id === fault.bus)
      if (bus) {
        bus.voltage.magnitude = 0 // Three-phase fault
      }
    }
  }

  /**
   * Clear fault
   * @param {Object} fault - Fault specification
   */
  clearFault(fault) {
    if (fault.type === 'three_phase') {
      const bus = this.model.buses.find(b => b.id === fault.bus)
      if (bus) {
        bus.voltage.magnitude = 1.0 // Restore normal voltage
      }
    }
  }
}

// Helper function for RK4 step (not adaptive)
function rk4Step(state, derivatives, dt) {
  const k1 = derivatives(state)
  const state2 = state.map((s, i) => s + (k1[i] * dt) / 2)
  const k2 = derivatives(state2)
  const state3 = state.map((s, i) => s + (k2[i] * dt) / 2)
  const k3 = derivatives(state3)
  const state4 = state.map((s, i) => s + k3[i] * dt)
  const k4 = derivatives(state4)

  return state.map(
    (s, i) => s + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])
  )
}

module.exports = DynamicPowerFlowSolver
