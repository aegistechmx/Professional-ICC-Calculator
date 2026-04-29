/**
 * test-batch.js - Test batch simulation capabilities
 */

const { 
  generateLoadScenarios, 
  runBatchPowerFlow, 
  aggregateResults, 
  findWorstCase,
  generatePVCurve 
} = require('./src/core/powerflow/batch');

// Test system for batch simulation
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

console.log('=== TESTING BATCH SIMULATION CAPABILITIES ===\n');

// Test 1: Generate load scenarios
console.log('1. Generate Load Scenarios:');
const scenarios = generateLoadScenarios(testSystem, {
  variationSteps: 3,
  variationPercent: 0.2
});
console.log(`  Generated ${scenarios.length} scenarios`);
scenarios.forEach(s => {
  console.log(`    ${s.name}: factor ${s.factor.toFixed(2)}`);
});

// Test 2: Batch power flow with FDLF
console.log('\n2. Batch Power Flow (Fast Decoupled):');
const batchResults = runBatchPowerFlow(scenarios, {
  tolerance: 1e-6,
  maxIterations: 30,
  method: 'FDLF'
});

const stats = aggregateResults(batchResults);
console.log(`  Total: ${stats.total}`);
console.log(`  Converged: ${stats.converged}`);
console.log(`  Diverged: ${stats.diverged}`);
console.log(`  Convergence Rate: ${stats.convergenceRate.toFixed(1)}%`);
console.log(`  Avg Iterations: ${stats.avgIterations.toFixed(1)}`);

// Test 3: Find worst case
console.log('\n3. Worst-Case Scenario:');
const worst = findWorstCase(batchResults);
console.log(`  Scenario: ${worst.scenario}`);
console.log(`  Converged: ${worst.converged}`);
console.log(`  Max Mismatch: ${worst.maxMismatch.toExponential(6)}`);

// Test 4: PV curve
console.log('\n4. PV Curve (Bus 2):');
const pvCurve = generatePVCurve(testSystem, 2, {
  startLoad: 0.8,
  endLoad: 1.5,
  steps: 5
});
console.log('  Load Factor | Voltage | Converged');
pvCurve.forEach(point => {
  console.log(`  ${point.loadFactor.toFixed(2)}        | ${point.voltage.toFixed(4)} | ${point.converged}`);
});

console.log('\n✅ Batch Simulation Capabilities Complete!');
