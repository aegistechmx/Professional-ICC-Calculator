const { solvePowerFlow } = require('../../core');

module.exports = async function runPowerFlow(systemDTO) {
  const system = systemDTO; // aquí puedes mapear después
  const result = solvePowerFlow(system);

  return {
    success: result.converged,
    iterations: result.iterations,
    buses: result.voltages,
    meta: {
      mismatch: result.maxMismatch
    }
  };
};