/**
 * plugins/stability/index.js - Transient Stability Plugin
 *
 * Responsibility: Dynamic simulation and stability analysis
 */

const DynamicSimulator = require('@/core/powerflow/stability/dynamicSimulator') // power (W)

module.exports = {
  name: 'stability',
  version: '1.0.0',
  description: 'Transient stability analysis plugin',
  dependencies: ['powerflow'],

  async init(context) {
    context.stability = {
      simulator: DynamicSimulator,
      methods: {
        rk4: 'Runge-Kutta 4th order',
        euler: 'Forward Euler',
      },
      capabilities: {
        'fault-simulation': true,
        'swing-equation': true,
        'stability-criteria': true,
        'time-domain': true,
      },
    }
  },

  async run(payload, context) {
    const { system, events = [], options = {} } = payload
    const { method = 'RK4', dt = 0.01, tEnd = 5.0 } = options

    // eslint-disable-next-line no-console
    console.log(`⚡ Stability: Running ${method} simulation...`)

    const simulator = new context.stability.simulator(system, {
      dt,
      tEnd,
      method,
      powerFlowMethod: 'FDLF',
      maxAngleDiff: Math.PI,
      maxSpeedDeviation: 0.5,
    })

    const result = await simulator.simulateWithFault(events[0] || null)

    return {
      method,
      stable: result.stable,
      iterations: result.time ? result.time.length : 0,
      finalStates: simulator.getFinalStates(),
      stabilityMargins: simulator.calculateStabilityMargins(),
      system,
      options,
      timestamp: new Date().toISOString(),
    }
  },

  async shutdown(_context) {
    // eslint-disable-next-line no-console
    console.log('🔌 Stability plugin shutdown')
  },
}
