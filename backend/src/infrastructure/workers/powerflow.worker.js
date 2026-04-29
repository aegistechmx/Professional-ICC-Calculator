/**
 * powerflow.worker.js - Worker thread for parallel power flow simulations
 * 
 * Responsibility: Run power flow calculations in separate thread
 * NO Express, NO axios, NO UI logic
 */

const { parentPort, workerData } = require('worker_threads');
const { PowerFlowSolver } = require('../../core/powerflow/solvers');

/**
 * Handle worker message
 */
parentPort.on('message', (data) => {
  try {
    const { model, options } = data;
    
    let result;
    if (options.method === 'FDLF') {
      result = solveFDLF(model, {
        tolerance: options.tolerance || 1e-6,
        maxIterations: options.maxIterations || 30
      });
    } else {
      result = solve(model, {
        tolerance: options.tolerance || 1e-6,
        maxIterations: options.maxIterations || 30
      });
    }

    parentPort.postMessage({
      success: true,
      result
    });
  } catch (error) {
    parentPort.postMessage({
      success: false,
      error: error.message
    });
  }
});
