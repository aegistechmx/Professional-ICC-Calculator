/**
 * dynamicSimulator.js - Dynamic simulator for TS-SCOPF
 *
 * Responsibility: Simulate system dynamics with faults and stability analysis
 * NO Express, NO axios, NO UI logic
 */

const { solveFDLF } = require('../fastDecoupled')
const { updateGeneratorState } = require('./swingEquation')
const { applyFaultAtTime } = require('./faultModel')

/**
 * Dynamic simulator for transient stability analysis
 */
class DynamicSimulator {
  constructor(system, options = {}) {
    this.system = JSON.parse(JSON.stringify(system)) // Deep clone
    this.options = {
      dt: 0.01, // Time step (seconds)
      tEnd: 5.0, // End time (seconds)
      method: 'RK4', // 'RK4' or 'Euler'
      powerFlowMethod: 'FDLF',
      maxAngleDiff: Math.PI, // Maximum angle difference
      maxSpeedDeviation: 0.5, // Maximum speed deviation
      ...options,
    }

    // Initialize generator states
    this.generators = []
    this.initializeGenerators()
  }

  /**
   * Initialize generator models
   */
  initializeGenerators() {
    this.system.buses.forEach((bus, i) => {
      if (bus.type === 'PV' && bus.P > 0) {
        this.generators.push({
          id: i,
          bus: i,
          Pm: bus.P, // Mechanical power
          inertia: bus.H || 5.0, // Inertia constant
          damping: bus.D || 2.0, // Damping coefficient
          xd: bus.xd || 0.3, // Direct axis reactance
          delta: 0, // Initial rotor angle
          omega: 1.0, // Initial angular velocity
          Pe: 0, // Initial electrical power
          Eq: 1.0, // Internal voltage
          referenceAngle: 0, // Reference angle for stability check
        })
      }
    })
  }

  /**
   * Run dynamic simulation with fault
   * @param {Object} fault - Fault specification
   * @returns {Object} Simulation results
   */
  simulateWithFault(fault) {
    const results = {
      time: [],
      angles: [],
      speeds: [],
      powers: [],
      voltages: [],
      stable: true,
      instabilityTime: null,
      maxAngleDiff: 0,
      fault,
    }

    let t = 0
    let currentSystem = JSON.parse(JSON.stringify(this.system)) // current (A)

    // eslint-disable-next-line no-console
    console.log(`Starting dynamic simulation with fault: ${fault.description}`)

    while (t < this.options.tEnd) {
      // Apply fault at specified time
      currentSystem = applyFaultAtTime(currentSystem, fault, t) // current (A)

      // Solve power flow for current system state
      const pfResult = this.solvePowerFlow(currentSystem) // current (A)

      if (!pfResult.converged) {
        results.stable = false
        results.instabilityTime = t
        break
      }

      // Update generator states
      this.updateAllGenerators(pfResult.voltages, this.options.dt)

      // Check stability
      const stabilityCheck = this.checkStability()
      if (!stabilityCheck.stable) {
        results.stable = false
        results.instabilityTime = t
        results.maxAngleDiff = stabilityCheck.maxAngleDiff
        break
      }

      // Store results
      results.time.push(t)
      results.angles.push(this.generators.map(g => g.delta))
      results.speeds.push(this.generators.map(g => g.omega))
      results.powers.push(this.generators.map(g => g.Pe)) // power (W)
      results.voltages.push(pfResult.voltages)

      t += this.options.dt
    }

    // eslint-disable-next-line no-console
    console.log(
      `Dynamic simulation completed: ${results.stable ? 'STABLE' : 'UNSTABLE'}`
    )
    if (!results.stable) {
      // eslint-disable-next-line no-console
      console.log(
        `Instability detected at t=${results.instabilityTime.toFixed(3)}s`
      )
    }

    return results
  }

  /**
   * Solve power flow for current system state
   * @param {Object} system - Current system model
   * @returns {Object} Power flow results
   */
  solvePowerFlow(system) {
    // Update system with current generator angles
    this.generators.forEach((gen, _i) => {
      const bus = system.buses.find(b => b.id === gen.bus)
      if (bus) {
        bus.voltage = { // voltage (V)
          magnitude: 1.0, // Assume constant voltage magnitude
          angle: gen.delta, // Use generator angle as bus angle
        }
      }
    })

    return solveFDLF(system, {
      tolerance: 1e-6,
      maxIterations: 20,
    })
  }

  /**
   * Update all generator states
   * @param {Array} voltages - Voltage results from power flow
   * @param {number} dt - Time step
   */
  updateAllGenerators(voltages, dt) {
    this.generators.forEach((gen, _i) => {
      const V = voltages[gen.bus] // voltage (V)
      if (V) {
        const Vmag = Math.sqrt(V.re * V.re + V.im * V.im)
        const Vang = Math.atan2(V.im, V.re)

        updateGeneratorState(gen, dt, Vmag, Vang)
      }
    })
  }

  /**
   * Check system stability
   * @returns {Object} Stability check results
   */
  checkStability() {
    let maxAngleDiff = 0
    let maxSpeedDeviation = 0
    let stable = true

    this.generators.forEach((gen, _i) => {
      // Check angle difference from reference
      const angleDiff = Math.abs(gen.delta - gen.referenceAngle)
      maxAngleDiff = Math.max(maxAngleDiff, angleDiff)

      // Check speed deviation from synchronous
      const speedDeviation = Math.abs(gen.omega - 1.0)
      maxSpeedDeviation = Math.max(maxSpeedDeviation, speedDeviation)

      // Check individual stability limits
      if (
        angleDiff > this.options.maxAngleDiff ||
        speedDeviation > this.options.maxSpeedDeviation
      ) {
        stable = false
      }
    })

    return {
      stable,
      maxAngleDiff,
      maxSpeedDeviation,
      generators: this.generators.map(g => ({
        id: g.id,
        angle: g.delta,
        speed: g.omega,
        power: g.Pe,
        angleDiff: Math.abs(g.delta - g.referenceAngle),
        speedDeviation: Math.abs(g.omega - 1.0),
        stable:
          Math.abs(g.delta - g.referenceAngle) < this.options.maxAngleDiff &&
          Math.abs(g.omega - 1.0) < this.options.maxSpeedDeviation,
      })),
    }
  }

  /**
   * Run multiple fault scenarios
   * @param {Array} faults - Array of fault specifications
   * @returns {Array} Results for each fault
   */
  simulateMultipleFaults(faults) {
    const results = []

    // eslint-disable-next-line no-console
    console.log(`Simulating ${faults.length} fault scenarios...`)

    faults.forEach((fault, i) => {
      // eslint-disable-next-line no-console
      console.log(`\nFault ${i + 1}/${faults.length}: ${fault.description}`)

      // Reset generators to initial state
      this.resetGenerators()

      // Simulate fault
      const result = this.simulateWithFault(fault)
      results.push(result)

      // Summary
      // eslint-disable-next-line no-console
      console.log(`  Result: ${result.stable ? 'STABLE' : 'UNSTABLE'}`)
      if (!result.stable) {
        // eslint-disable-next-line no-console
        console.log(`  Instability time: ${result.instabilityTime.toFixed(3)}s`)
        // eslint-disable-next-line no-console
        console.log(
          `  Max angle difference: ${((result.maxAngleDiff * 180) / Math.PI).toFixed(1)}°`
        )
      }
    })

    return results
  }

  /**
   * Reset generators to initial state
   */
  resetGenerators() {
    this.generators.forEach(gen => {
      gen.delta = 0
      gen.omega = 1.0
      gen.Pe = 0
      gen.referenceAngle = 0
    })
  }

  /**
   * Get final generator states
   * @returns {Array} Final states
   */
  getFinalStates() {
    return this.generators.map(gen => ({
      id: gen.id,
      bus: gen.bus,
      delta: gen.delta,
      omega: gen.omega,
      Pe: gen.Pe,
      angleDegrees: (gen.delta * 180) / Math.PI,
      speedPercent: gen.omega * 100,
    }))
  }

  /**
   * Calculate stability margins
   * @returns {Object} Stability margins
   */
  calculateStabilityMargins() {
    const margins = {
      angleMargin: Infinity,
      speedMargin: Infinity,
      criticalGenerators: [],
    }

    this.generators.forEach(gen => {
      const angleDiff = Math.abs(gen.delta - gen.referenceAngle)
      const speedDeviation = Math.abs(gen.omega - 1.0)

      const angleMargin = this.options.maxAngleDiff - angleDiff
      const speedMargin = this.options.maxSpeedDeviation - speedDeviation

      margins.angleMargin = Math.min(margins.angleMargin, angleMargin)
      margins.speedMargin = Math.min(margins.speedMargin, speedMargin)

      if (angleMargin < 0.1 || speedMargin < 0.1) {
        margins.criticalGenerators.push({
          id: gen.id,
          angleDiff,
          speedDeviation,
          angleMargin,
          speedMargin,
        })
      }
    })

    return margins
  }
}

module.exports = DynamicSimulator
