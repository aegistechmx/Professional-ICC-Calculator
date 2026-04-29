/**
 * test-worker.js - Test worker thread parallel execution
 */

const { generateLoadScenarios } = require('./src/core/powerflow/batch');
const { runParallelBatch } = require('./src/infrastructure/workers/workerManager');

// Test system for worker testing
const testSystem = {
  baseMVA: 100,
  baseKV: 138,
  buses: [
    {
      id: 0,
      type: 'Slack',
      voltage: { magnitude: 1.0, angle: 0 },
      P: 0,
      Q: 0
    },
    {
      id: 1,
      type: 'PV',
      voltage: { magnitude: 1.02, angle: 0 },
      P: 0.8,
      Q: 0,
      Qmin: -0.3,
      Qmax: 0.5
    },
    {
      id: 2,
      type: 'PQ',
      voltage: { magnitude: 1.0, angle: 0 },
      P: -0.5,
      Q: -0.3
    },
    {
      id: 3,
      type: 'PQ',
      voltage: { magnitude: 1.0, angle: 0 },
      P: -0.4,
      Q: -0.25
    }
  ],
  branches: [
    { id: 0, from: 0, to: 1, R: 0.01, X: 0.03 },
    { id: 1, from: 0, to: 2, R: 0.015, X: 0.045 },
    { id: 2, from: 1, to: 2, R: 0.02, X: 0.06 },
    { id: 3, from: 1, to: 3, R: 0.025, X: 0.075 },
    { id: 4, from: 2, to: 3, R: 0.03, X: 0.09 }
  ]
};

console.log('=== TESTING WORKER THREAD PARALLEL EXECUTION ===\n');

// Generate scenarios
console.log('1. Generating scenarios...');
const scenarios = generateLoadScenarios(testSystem, {
  variationSteps: 3,
  variationPercent: 0.2
});
console.log(`  Generated ${scenarios.length} scenarios`);

// Test parallel execution
console.log('\n2. Running parallel batch with workers...');
runParallelBatch(scenarios, {
  tolerance: 1e-6,
  maxIterations: 30,
  method: 'FDLF'
}, 2)
  .then(results => {
    console.log(`  Completed ${results.length} simulations`);
    
    const converged = results.filter(r => r.converged).length;
    console.log(`  Converged: ${converged}/${results.length}`);
    
    results.forEach(r => {
      console.log(`    ${r.scenario}: ${r.converged ? '✅' : '❌'} (${r.iterations} iter)`);
    });
    
    console.log('\n✅ Worker Thread Parallel Execution Complete!');
  })
  .catch(error => {
    console.error('  Error:', error.message);
    console.log('\n⚠️ Worker threads may not be supported in this environment');
    console.log('   Falling back to sequential execution is available in batch.js');
  });
