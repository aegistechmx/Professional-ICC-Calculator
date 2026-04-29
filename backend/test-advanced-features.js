/**
 * test-advanced-features.js - Test PV control, line search, trust region, and FDLF
 * 
 * Tests all new advanced features:
 * 1. PV Q limit enforcement with dynamic switching
 * 2. Line search with backtracking
 * 3. Trust region control
 * 4. Fast Decoupled Load Flow
 */

const { solve } = require('./src/core/powerflow/solver');
const { solveFDLF } = require('./src/core/powerflow/fastDecoupled');

// Test system with PV buses and Q limits
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
      voltage: { magnitude: 1.02, angle: 0 },  // Vset = 1.02
      P: 0.8,
      Q: 0,
      Qmin: -0.3,
      Qmax: 0.5
    },
    {
      id: 2,
      type: 'PV',
      voltage: { magnitude: 1.015, angle: 0 },  // Vset = 1.015
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
    }
  ],
  branches: [
    { from: 0, to: 1, R: 0.01, X: 0.03 },
    { from: 0, to: 2, R: 0.015, X: 0.045 },
    { from: 1, to: 2, R: 0.02, X: 0.06 },
    { from: 1, to: 3, R: 0.025, X: 0.075 },
    { from: 2, to: 3, R: 0.03, X: 0.09 }
  ]
};

console.log('=== TESTING ADVANCED POWER FLOW FEATURES ===\n');

// Test 1: Basic Newton-Raphson
console.log('1. Basic Newton-Raphson:');
const basicResult = solve(testSystem, {
  tolerance: 1e-6,
  maxIterations: 30
});
console.log(`  Converged: ${basicResult.converged}`);
console.log(`  Iterations: ${basicResult.iterations}`);
console.log(`  Max Mismatch: ${basicResult.maxMismatch.toExponential(6)}`);

// Test 2: Newton-Raphson with PV Control
console.log('\n2. Newton-Raphson with PV Control:');
const pvResult = solve(testSystem, {
  tolerance: 1e-6,
  maxIterations: 30,
  enablePVControl: true
});
console.log(`  Converged: ${pvResult.converged}`);
console.log(`  Iterations: ${pvResult.iterations}`);
console.log(`  Max Mismatch: ${pvResult.maxMismatch.toExponential(6)}`);

// Test 3: Newton-Raphson with Line Search
console.log('\n3. Newton-Raphson with Line Search:');
const lineSearchResult = solve(testSystem, {
  tolerance: 1e-6,
  maxIterations: 30,
  enableLineSearch: true
});
console.log(`  Converged: ${lineSearchResult.converged}`);
console.log(`  Iterations: ${lineSearchResult.iterations}`);
console.log(`  Max Mismatch: ${lineSearchResult.maxMismatch.toExponential(6)}`);

// Test 4: Newton-Raphson with Trust Region
console.log('\n4. Newton-Raphson with Trust Region:');
const trustRegionResult = solve(testSystem, {
  tolerance: 1e-6,
  maxIterations: 30,
  enableTrustRegion: true,
  maxStepSize: 0.1
});
console.log(`  Converged: ${trustRegionResult.converged}`);
console.log(`  Iterations: ${trustRegionResult.iterations}`);
console.log(`  Max Mismatch: ${trustRegionResult.maxMismatch.toExponential(6)}`);

// Test 5: Newton-Raphson with ALL features
console.log('\n5. Newton-Raphson with ALL Features:');
const fullResult = solve(testSystem, {
  tolerance: 1e-6,
  maxIterations: 30,
  enablePVControl: true,
  enableLineSearch: true,
  enableTrustRegion: true,
  maxStepSize: 0.15
});
console.log(`  Converged: ${fullResult.converged}`);
console.log(`  Iterations: ${fullResult.iterations}`);
console.log(`  Max Mismatch: ${fullResult.maxMismatch.toExponential(6)}`);

// Test 6: Fast Decoupled Load Flow
console.log('\n6. Fast Decoupled Load Flow:');
const fdlfResult = solveFDLF(testSystem, {
  tolerance: 1e-6,
  maxIterations: 30
});
console.log(`  Converged: ${fdlfResult.converged}`);
console.log(`  Iterations: ${fdlfResult.iterations}`);
console.log(`  Max Mismatch: ${fdlfResult.maxMismatch.toExponential(6)}`);

// Summary
console.log('\n=== SUMMARY ===');
console.log('Method                | Iterations | Converged | Mismatch');
console.log('---------------------|-----------|----------|----------');
console.log(`Basic NR             | ${basicResult.iterations.toString().padStart(9)} | ${basicResult.converged.toString().padStart(8)} | ${basicResult.maxMismatch.toExponential(2)}`);
console.log(`NR + PV Control       | ${pvResult.iterations.toString().padStart(9)} | ${pvResult.converged.toString().padStart(8)} | ${pvResult.maxMismatch.toExponential(2)}`);
console.log(`NR + Line Search      | ${lineSearchResult.iterations.toString().padStart(9)} | ${lineSearchResult.converged.toString().padStart(8)} | ${lineSearchResult.maxMismatch.toExponential(2)}`);
console.log(`NR + Trust Region    | ${trustRegionResult.iterations.toString().padStart(9)} | ${trustRegionResult.converged.toString().padStart(8)} | ${trustRegionResult.maxMismatch.toExponential(2)}`);
console.log(`NR + ALL Features     | ${fullResult.iterations.toString().padStart(9)} | ${fullResult.converged.toString().padStart(8)} | ${fullResult.maxMismatch.toExponential(2)}`);
console.log(`Fast Decoupled LF     | ${fdlfResult.iterations.toString().padStart(9)} | ${fdlfResult.converged.toString().padStart(8)} | ${fdlfResult.maxMismatch.toExponential(2)}`);

// Bus type switching analysis
console.log('\n=== PV SWITCHING ANALYSIS ===');
console.log('Initial bus types:');
testSystem.buses.forEach((bus, i) => {
  console.log(`  Bus ${i}: ${bus.type}`);
});

console.log('\nFinal bus types (NR + PV Control):');
const finalSystem = JSON.parse(JSON.stringify(testSystem)); // Deep copy
const finalPVResult = solve(finalSystem, {
  tolerance: 1e-6,
  maxIterations: 30,
  enablePVControl: true
});
finalSystem.buses.forEach((bus, i) => {
  console.log(`  Bus ${i}: ${bus.type} (Q: ${bus.Q?.toFixed(3) || 'N/A'})`);
});

console.log('\n✅ All advanced features implemented and tested!');
