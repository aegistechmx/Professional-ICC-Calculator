/**
 * workerManager.js - Worker thread manager for parallel simulations
 * 
 * Responsibility: Orchestrate parallel power flow simulations using worker threads
 * NO Express, NO axios, NO UI logic
 */

const { Worker } = require('worker_threads');
const path = require('path');

/**
 * Run single simulation in worker thread
 * @param {Object} model - System model
 * @param {Object} options - Solver options
 * @returns {Promise} Simulation result
 */
function runInWorker(model, options = {}) {
  return new Promise((resolve, reject) => {
    const workerPath = path.join(__dirname, 'powerflow.worker.js');
    
    const worker = new Worker(workerPath, {
      workerData: { model, options }
    });

    worker.on('message', (result) => {
      if (result.success) {
        resolve(result.result);
      } else {
        reject(new Error(result.error));
      }
      worker.terminate();
    });

    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

/**
 * Run batch simulations in parallel
 * @param {Array} scenarios - Array of scenario models
 * @param {Object} options - Solver options
 * @param {number} maxConcurrency - Maximum parallel workers
 * @returns {Promise} Array of simulation results
 */
async function runParallelBatch(scenarios, options = {}, maxConcurrency = 4) {
  const results = [];
  const executing = [];

  for (const scenario of scenarios) {
    const promise = runInWorker(scenario.model, options)
      .then(result => ({
        scenario: scenario.name,
        factor: scenario.factor,
        ...result
      }))
      .catch(error => ({
        scenario: scenario.name,
        factor: scenario.factor,
        converged: false,
        error: error.message
      }));

    results.push(promise);

    if (results.length >= maxConcurrency) {
      await Promise.race(results);
    }

    // Clean up completed promises
    const settled = await Promise.allSettled(results);
    const stillRunning = settled.filter(s => s.status === 'pending');
    
    if (stillRunning.length < maxConcurrency) {
      // Remove completed from results array
      const completedIndices = settled
        .map((s, i) => s.status === 'fulfilled' || s.status === 'rejected' ? i : -1)
        .filter(i => i >= 0);
      
      completedIndices.sort((a, b) => b - a).forEach(i => {
        results.splice(i, 1);
      });
    }
  }

  return Promise.all(results);
}

/**
 * Run parallel contingency analysis
 * @param {Object} model - Base system model
 * @param {Object} options - Analysis options
 * @param {number} maxConcurrency - Maximum parallel workers
 * @returns {Promise} Contingency results
 */
async function runParallelContingency(model, options = {}, maxConcurrency = 4) {
  const { runN1Contingency } = require('@/core')/powerflow/contingency');
  
  // For now, run sequentially (contingency analysis is complex)
  // Future: parallelize individual contingency cases
  return runN1Contingency(model, options);
}

module.exports = {
  runInWorker,
  runParallelBatch,
  runParallelContingency
};
