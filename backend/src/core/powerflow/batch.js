/**
 * batch.js - Batch Simulation Capabilities
 * 
 * Responsibility: Run multiple power flow simulations with different scenarios
 * NO Express, NO axios, NO UI logic
 */

const { solve } = require('./solver');
const { solveFDLF } = require('./fastDecoupled');
const { runN1Contingency } = require('./contingency');

/**
 * Generate load variation scenarios
 * @param {Object} baseModel - Base system model
 * @param {Object} options - Scenario generation options
 * @returns {Array} Array of scenario models
 */
function generateLoadScenarios(baseModel, options = {}) {
  const {
    variationSteps = 5,
    variationPercent = 0.1,
    loadBuses = null // null = all PQ buses
  } = options;

  const scenarios = [];
  const loadBusIndices = loadBuses 
    ? loadBuses 
    : baseModel.buses.filter(b => b.type === 'PQ').map(b => b.id);

  for (let step = 0; step <= variationSteps; step++) {
    const factor = 1 + (step - variationSteps / 2) * variationPercent;
    
    const scenario = JSON.parse(JSON.stringify(baseModel));
    
    loadBusIndices.forEach(busId => {
      const bus = scenario.buses.find(b => b.id === busId);
      if (bus) {
        bus.P *= factor;
        bus.Q *= factor;
      }
    });

    scenarios.push({
      name: `Load variation ${(factor * 100).toFixed(0)}%`,
      factor,
      model: scenario
    });
  }

  return scenarios;
}

/**
 * Run batch power flow simulations
 * @param {Array} scenarios - Array of scenario models
 * @param {Object} options - Solver options
 * @returns {Array} Array of simulation results
 */
function runBatchPowerFlow(scenarios, options = {}) {
  const {
    tolerance = 1e-6,
    maxIterations = 30,
    method = 'NR', // 'NR' or 'FDLF'
    parallel = false
  } = options;

  const results = [];

  if (parallel) {
    // Placeholder for parallel execution with worker threads
    // For now, run sequentially
    scenarios.forEach(scenario => {
      const result = method === 'FDLF'
        ? solveFDLF(scenario.model, { tolerance, maxIterations })
        : solve(scenario.model, { tolerance, maxIterations });

      results.push({
        scenario: scenario.name,
        factor: scenario.factor,
        converged: result.converged,
        iterations: result.iterations,
        maxMismatch: result.maxMismatch,
        voltages: result.voltages,
        solver: result.solver
      });
    });
  } else {
    // Sequential execution
    scenarios.forEach(scenario => {
      const result = method === 'FDLF'
        ? solveFDLF(scenario.model, { tolerance, maxIterations })
        : solve(scenario.model, { tolerance, maxIterations });

      results.push({
        scenario: scenario.name,
        factor: scenario.factor,
        converged: result.converged,
        iterations: result.iterations,
        maxMismatch: result.maxMismatch,
        voltages: result.voltages,
        solver: result.solver
      });
    });
  }

  return results;
}

/**
 * Run batch contingency analysis
 * @param {Array} scenarios - Array of scenario models
 * @param {Object} options - Analysis options
 * @returns {Array} Array of contingency results
 */
function runBatchContingency(scenarios, options = {}) {
  const {
    tolerance = 1e-6,
    maxIterations = 30,
    method = 'NR',
    voltageThreshold = 0.95
  } = options;

  const results = [];

  scenarios.forEach(scenario => {
    const contingencyResult = runN1Contingency(scenario.model, {
      tolerance,
      maxIterations,
      method,
      voltageThreshold
    });

    results.push({
      scenario: scenario.name,
      factor: scenario.factor,
      baseCase: contingencyResult.baseCase,
      summary: contingencyResult.summary,
      criticalContingencies: contingencyResult.contingencies.filter(c => 
        !c.converged || c.violations.critical
      )
    });
  });

  return results;
}

/**
 * Aggregate batch results
 * @param {Array} results - Batch simulation results
 * @returns {Object} Aggregated statistics
 */
function aggregateResults(results) {
  const converged = results.filter(r => r.converged).length;
  const total = results.length;
  const avgIterations = results.reduce((sum, r) => sum + r.iterations, 0) / total;
  const maxMismatch = Math.max(...results.map(r => r.maxMismatch));

  return {
    total,
    converged,
    diverged: total - converged,
    convergenceRate: (converged / total) * 100,
    avgIterations,
    maxMismatch
  };
}

/**
 * Find worst-case scenario
 * @param {Array} results - Batch simulation results
 * @returns {Object} Worst-case scenario
 */
function findWorstCase(results) {
  return results.reduce((worst, current) => {
    if (!current.converged) return current;
    if (!worst.converged) return worst;
    return current.maxMismatch > worst.maxMismatch ? current : worst;
  });
}

/**
 * Generate PV curve (voltage vs load)
 * @param {Object} model - System model
 * @param {number} busId - Bus to monitor
 * @param {Object} options - Curve generation options
 * @returns {Array} PV curve points
 */
function generatePVCurve(model, busId, options = {}) {
  const {
    startLoad = 0.5,
    endLoad = 2.0,
    steps = 20,
    tolerance = 1e-6,
    maxIterations = 30
  } = options;

  const curve = [];

  for (let i = 0; i <= steps; i++) {
    const loadFactor = startLoad + (endLoad - startLoad) * (i / steps);
    
    const scenario = JSON.parse(JSON.stringify(model));
    const bus = scenario.buses.find(b => b.id === busId);
    
    if (bus && bus.type === 'PQ') {
      bus.P *= loadFactor;
      bus.Q *= loadFactor;
    }

    const result = solve(scenario, { tolerance, maxIterations });

    const voltage = result.voltages[busId];
    const magnitude = Math.sqrt(voltage.re * voltage.re + voltage.im * voltage.im);

    curve.push({
      loadFactor,
      voltage: magnitude,
      converged: result.converged,
      iterations: result.iterations
    });
  }

  return curve;
}

module.exports = {
  generateLoadScenarios,
  runBatchPowerFlow,
  runBatchContingency,
  aggregateResults,
  findWorstCase,
  generatePVCurve
};
