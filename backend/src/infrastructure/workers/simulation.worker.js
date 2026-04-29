/**
 * infrastructure/workers/simulation.worker.js - Professional simulation worker
 * 
 * Responsibility: High-performance simulation execution
 */

const { parentPort } = require('worker_threads');
const { PowerFlowSolver } = require('../../core/powerflow/solvers');
const SimulationLogger = require('../../debug/simulation');

/**
 * Handle different simulation types
 * @param {Object} data - Simulation data
 */
async function handleSimulation(data) {
  let result;

  switch (data.type) {
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

    default:
      throw new Error(`Unknown simulation type: ${data.type}`);
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

// Message handler
parentPort.on('message', async (data) => {
  try {
    const startTime = Date.now();
    const result = await handleSimulation(data);
    const duration = Date.now() - startTime;

    parentPort.postMessage({
      success: true,
      data: result,
      workerId: data.workerId,
      duration,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    parentPort.postMessage({
      success: false,
      error: error.message,
      workerId: data.workerId,
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
