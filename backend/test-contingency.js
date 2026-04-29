/**
 * test-contingency.js - Test N-1 contingency analysis
 */

const { runN1Contingency, getCriticalContingencies, getSecurityIndex } = require('./src/core/powerflow/contingency');

// Test system for contingency analysis
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
      type: 'PV',
      voltage: { magnitude: 1.015, angle: 0 },
      P: 0.6,
      Q: 0,
      Qmin: -0.2,
      Qmax: 0.4
    },
    {
      id: 3,
      type: 'PQ',
      voltage: { magnitude: 1.0, angle: 0 },
      P: -0.5,
      Q: -0.3
    },
    {
      id: 4,
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
    { id: 4, from: 2, to: 3, R: 0.03, X: 0.09 },
    { id: 5, from: 2, to: 4, R: 0.02, X: 0.06 },
    { id: 6, from: 3, to: 4, R: 0.025, X: 0.075 }
  ]
};

console.log('=== TESTING N-1 CONTINGENCY ANALYSIS ===\n');

// Test with Newton-Raphson
console.log('1. N-1 Analysis with Newton-Raphson:');
const nrResults = runN1Contingency(testSystem, {
  tolerance: 1e-6,
  maxIterations: 30,
  method: 'NR',
  voltageThreshold: 0.95
});

console.log(`  Base Case Converged: ${nrResults.baseCase.converged}`);
console.log(`  Base Case Iterations: ${nrResults.baseCase.iterations}`);
console.log(`  Total Contingencies: ${nrResults.summary.total}`);
console.log(`  Critical: ${nrResults.summary.critical}`);
console.log(`  Marginal: ${nrResults.summary.marginal}`);
console.log(`  Secure: ${nrResults.summary.secure}`);
console.log(`  Security Index: ${(getSecurityIndex(nrResults.results) * 100).toFixed(1)}%`);

// Test with Fast Decoupled
console.log('\n2. N-1 Analysis with Fast Decoupled:');
const fdlfResults = runN1Contingency(testSystem, {
  tolerance: 1e-6,
  maxIterations: 30,
  method: 'FDLF',
  voltageThreshold: 0.95
});

console.log(`  Base Case Converged: ${fdlfResults.baseCase.converged}`);
console.log(`  Base Case Iterations: ${fdlfResults.baseCase.iterations}`);
console.log(`  Total Contingencies: ${fdlfResults.summary.total}`);
console.log(`  Critical: ${fdlfResults.summary.critical}`);
console.log(`  Marginal: ${fdlfResults.summary.marginal}`);
console.log(`  Secure: ${fdlfResults.summary.secure}`);
console.log(`  Security Index: ${(getSecurityIndex(fdlfResults.results) * 100).toFixed(1)}%`);

// Show critical contingencies
console.log('\n3. Critical Contingencies (NR):');
const critical = getCriticalContingencies(nrResults.results);
if (critical.length > 0) {
  critical.forEach(c => {
    console.log(`  ${c.contingency} ${c.elementId}: ${c.converged ? 'converged' : 'diverged'}`);
    if (c.violations.voltage.length > 0) {
      console.log(`    Voltage violations: ${c.violations.voltage.length}`);
    }
  });
} else {
  console.log('  No critical contingencies found');
}

console.log('\n✅ N-1 Contingency Analysis Complete!');
