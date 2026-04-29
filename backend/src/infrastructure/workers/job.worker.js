/**
 * infrastructure/workers/job.worker.js - Professional distributed job worker
 * 
 * Responsibility: Execute jobs from distributed queue system
 */

const { parentPort } = require('worker_threads');
const { solveNR } = require('../../../core/powerflow/solvers');
const { solveFDLF } = require('../../../core/powerflow/solvers');
const { solveOPF } = require('../../../core/opf/algorithms');
const { simulateDynamics } = require('../../../core/stability/solvers');
const { generateN1Contingencies } = require('../../../core/powerflow/contingency');
const { evaluateSecurityConstraints } = require('../../../core/powerflow/contingency');

/**
 * Handle different job types
 * @param {Object} job - Job specification
 */
async function handleJob(job) {
  const { type, data, options = {} } = job;
  let result;

  switch (type) {
    case 'loadflow':
      result = data.method === 'NR' 
        ? solveNR(data.system, data.options)
        : solveFDLF(data.system, data.options);
      break;

    case 'opf':
      result = solveOPF(data.system, data.options);
      break;

    case 'stability':
      result = simulateDynamics(data.system, data.events);
      break;

    case 'contingency':
      const contingencies = generateN1Contingencies(data.system);
      const results = [];

      for (const contingency of contingencies) {
        const modified = applyContingency(data.system, contingency);
        const pfResult = solveFDLF(modified, { tolerance: 1e-6, maxIterations: 20 });
        
        const evaluation = evaluateSecurityConstraints(modified, contingency);
        results.push({
          contingency,
          powerFlow: pfResult,
          security: evaluation
        });
      }

      result = {
        type: 'contingency',
        results,
        summary: {
          total: contingencies.length,
          secure: results.filter(r => r.security.secure).length,
          critical: results.filter(r => r.security.severity === 'critical').length
        }
      };
      break;

    case 'monte-carlo':
      result = await runMonteCarlo(data.system, data.scenarios);
      break;

    default:
      throw new Error(`Unknown job type: ${type}`);
  }

  return result;
}

/**
 * Apply contingency to system
 * @param {Object} system - Power system
 * @param {Object} contingency - Contingency definition
 * @returns {Object} Modified system
 */
function applyContingency(system, contingency) {
  const modified = JSON.parse(JSON.stringify(system));

  if (contingency.type === 'line_outage') {
    const branch = modified.branches.find(b => b.id === contingency.line);
    if (branch) {
      branch.R = 9999; // Effectively remove line
      branch.X = 9999;
    }
  } else if (contingency.type === 'generator_outage') {
    const bus = modified.buses.find(b => b.id === contingency.bus);
    if (bus) {
      bus.P = 0; // Remove generation
    }
  }

  return modified;
}

/**
 * Run Monte Carlo analysis
 * @param {Object} system - Power system
 * @param {Array} scenarios - Monte Carlo scenarios
 * @returns {Object} Monte Carlo results
 */
async function runMonteCarlo(system, scenarios) {
  console.log(`🎲 Running Monte Carlo analysis with ${scenarios.length} scenarios...`);

  const results = [];
  
  for (const scenario of scenarios) {
    console.log(`🎲 Processing scenario ${results.length + 1}...`);
    
    // Apply scenario modifications
    const modifiedSystem = applyScenarioModifications(system, scenario);
    
    // Run power flow
    const pfResult = solveFDLF(modifiedSystem, { tolerance: 1e-6, maxIterations: 20 });
    
    if (!pfResult.converged) {
      results.push({
        scenario: scenario.id,
        success: false,
        error: 'Power flow did not converge',
        iterations: pfResult.iterations
      });
      continue;
    }

    // Calculate metrics
    const metrics = calculateScenarioMetrics(modifiedSystem, pfResult);
    
    results.push({
      scenario: scenario.id,
      success: true,
      powerFlow: pfResult,
      metrics,
      iterations: pfResult.iterations
    });
  }

  // Calculate overall statistics
  const overallStats = calculateMonteCarloStats(results);

  console.log(`🎲 Monte Carlo analysis complete: ${overallStats.successful}/${results.length} scenarios`);

  return {
    type: 'monte-carlo',
    scenarios: results,
    statistics: overallStats,
    timestamp: new Date().toISOString()
  };
}

/**
 * Apply scenario modifications to system
 * @param {Object} system - Base system
 * @param {Object} scenario - Scenario modifications
 * @returns {Object} Modified system
 */
function applyScenarioModifications(system, scenario) {
  const modified = JSON.parse(JSON.stringify(system));

  // Apply load variations
  if (scenario.loadVariations) {
    scenario.loadVariations.forEach(variation => {
      modified.buses.forEach((bus, i) => {
        if (variation.busId === i || variation.busId === bus.id) {
          bus.P = (bus.P || 0) * variation.factor;
        }
      });
    });
  }

  // Apply line outages
  if (scenario.lineOutages) {
    scenario.lineOutages.forEach(outage => {
      const branch = modified.branches.find(b => b.id === outage.lineId);
      if (branch) {
        branch.R = outage.removed ? 9999 : branch.R;
        branch.X = outage.removed ? 9999 : branch.X;
      }
    });
  }

  // Apply generator outages
  if (scenario.generatorOutages) {
    scenario.generatorOutages.forEach(outage => {
      const bus = modified.buses.find(b => b.id === outage.busId);
      if (bus && bus.type === 'PV') {
        bus.P = outage.reduced ? bus.P * outage.reductionFactor : 0;
      }
    });
  }

  return modified;
}

/**
 * Calculate scenario metrics
 * @param {Object} system - Modified system
 * @param {Object} pfResult - Power flow result
 * @returns {Object} Scenario metrics
 */
function calculateScenarioMetrics(system, pfResult) {
  const totalLoad = system.buses.reduce((sum, bus) => sum + (bus.P < 0 ? -bus.P : bus.P), 0);
  const totalGeneration = system.buses.reduce((sum, bus) => sum + (bus.P > 0 ? bus.P : 0), 0);

  // Voltage violations
  let voltageViolations = 0;
  system.buses.forEach(bus => {
    const voltage = pfResult.voltages[bus.id];
    if (voltage) {
      const magnitude = Math.sqrt(voltage.re * voltage.re + voltage.im * voltage.im);
      if (magnitude < 0.95 || magnitude > 1.05) {
        voltageViolations++;
      }
    }
  });

  // Line overloads
  let lineOverloads = 0;
  system.branches.forEach(branch => {
    const flow = pfResult.flows[branch.id];
    if (flow && Math.abs(flow) > branch.limit) {
      lineOverloads++;
    }
  });

  const minVoltage = Math.min(...system.buses.map(b => {
    const voltage = pfResult.voltages[b.id];
    return voltage ? Math.sqrt(voltage.re * voltage.re + voltage.im * voltage.im) : Infinity;
  }));
  
  const maxVoltage = Math.max(...system.buses.map(b => {
    const voltage = pfResult.voltages[b.id];
    return voltage ? Math.sqrt(voltage.re * voltage.re + voltage.im * voltage.im) : 0;
  }));

  return {
    totalLoad,
    totalGeneration,
    loadGeneration: totalLoad - totalGeneration,
    voltageViolations,
    lineOverloads,
    minVoltage,
    maxVoltage
  };
}

/**
 * Calculate Monte Carlo statistics
 * @param {Array} results - Scenario results
 * @returns {Object} Monte Carlo statistics
 */
function calculateMonteCarloStats(results) {
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  // Calculate probability distributions
  const loadGenImbalances = results.map(r => r.metrics ? r.metrics.loadGeneration : 0);
  const meanImbalance = loadGenImbalances.reduce((sum, val) => sum + val, 0) / loadGenImbalances.length;  
  const voltageViolations = results.map(r => r.metrics ? r.metrics.voltageViolations : 0);
  const meanVoltageViolations = voltageViolations.reduce((sum, val) => sum + val, 0) / voltageViolations.length;

  return {
    total: results.length,
    successful,
    failed,
    successRate: (successful / results.length) * 100,
    statistics: {
      loadGenerationImbalance: {
        mean: meanImbalance,
        min: Math.min(...loadGenImbalances),
        max: Math.max(...loadGenImbalances),
        std: calculateStandardDeviation(loadGenImbalances, meanImbalance)
      },
      voltageViolations: {
        mean: meanVoltageViolations,
        min: Math.min(...voltageViolations),
        max: Math.max(...voltageViolations),
        std: calculateStandardDeviation(voltageViolations, meanVoltageViolations)
      }
    }
  };
}

/**
 * Calculate standard deviation
 * @param {Array} values - Array of values
 * @param {number} mean - Mean value
 * @returns {number} Standard deviation
 */
function calculateStandardDeviation(values, mean) {
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

// Message handler
parentPort.on('message', async (job) => {
  try {
    const startTime = Date.now();
    const result = await handleJob(job);
    const duration = Date.now() - startTime;

    parentPort.postMessage({
      success: true,
      data: result,
      workerId: job.workerId,
      duration,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    parentPort.postMessage({
      success: false,
      error: error.message,
      workerId: job.workerId,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling
parentPort.on('error', (error) => {
  parentPort.postMessage({
    success: false,
    error: error.message,
    timestamp: new Date().toISOString()
  });
});
