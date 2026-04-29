/**
 * application/simulation/runTransientStability.js
 * 
 * Responsibility: Business logic for transient stability operations
 * NO Express, NO axios, NO UI logic
 */

const DynamicSimulator = require('@/core/powerflow/stability/dynamicSimulator');

/**
 * Run transient stability simulation
 * @param {Object} system - Power system model
 * @param {Object} options - Simulation options
 * @returns {Object} Simulation results
 */
function runTransientStability(system, options = {}) {
  const {
    dt = 0.01,
    tEnd = 5.0,
    method = 'RK4',
    powerFlowMethod = 'FDLF',
    maxAngleDiff = Math.PI,
    maxSpeedDeviation = 0.5
  } = options;

  const simulator = new DynamicSimulator(system, {
    dt,
    tEnd,
    method,
    powerFlowMethod,
    maxAngleDiff,
    maxSpeedDeviation
  });

  const result = simulator.simulateWithFault(options.fault);

  return {
    converged: result.stable,
    iterations: result.time ? result.time.length : 0,
    finalStates: simulator.getFinalStates(),
    stabilityMargins: simulator.calculateStabilityMargins(),
    system,
    options
  };
}

module.exports = { runTransientStability };
