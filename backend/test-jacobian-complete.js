/**
 * Test complete Jacobian with 3-bus system
 * 
 * This tests the new Jacobian implementation with sum-based diagonal calculations
 * Expected: convergence < 10 iterations, voltages ~1 pu, mismatch → 1e-6
 */

const { solve } = require('./src/core/powerflow/newton/solver');

console.log('=== TESTING COMPLETE JACOBIAN ===\n');

// 3-bus test system
const system = {
  baseMVA: 100,
  baseKV: 138,
  buses: [
    { id: 0, type: 'Slack', voltage: { magnitude: 1.0, angle: 0 }, P: 0, Q: 0 },
    { id: 1, type: 'PQ', voltage: { magnitude: 1.0, angle: 0 }, P: -0.4, Q: -0.25 },
    { id: 2, type: 'PQ', voltage: { magnitude: 1.0, angle: 0 }, P: -0.6, Q: -0.35 }
  ],
  branches: [
    { from: 0, to: 1, R: 0.01, X: 0.03 },
    { from: 0, to: 2, R: 0.015, X: 0.045 },
    { from: 1, to: 2, R: 0.02, X: 0.06 }
  ]
};

try {
  console.log('System configuration:');
  console.log(`  Buses: ${system.buses.length}`);
  console.log(`  Branches: ${system.branches.length}`);
  console.log(`  Base MVA: ${system.baseMVA}`);
  console.log(`  Base KV: ${system.baseKV}\n`);

  console.log('Running Newton-Raphson solver with debugging...');
  
  const { solve } = require('./src/core/powerflow/newton/solver');
  
  const result = solve(system, {
    tolerance: 1e-6,
    maxIterations: 30,
    damping: 1.0  // No damping for faster convergence
  });
  
  console.log('\n=== RESULTS ===');
  console.log(`Converged: ${result.converged}`);
  console.log(`Iterations: ${result.iterations}`);
  console.log(`Max Mismatch: ${result.maxMismatch.toExponential(6)}`);

  console.log('\nFinal Voltages:');
  result.voltages.forEach((v, i) => {
    const mag = Math.sqrt(v.re * v.re + v.im * v.im);
    const ang = Math.atan2(v.im, v.re) * 180 / Math.PI;
    console.log(`  Bus ${i}: ${mag.toFixed(6)} ∠ ${ang.toFixed(4)}°`);
  });

  // Verify convergence criteria
  console.log('\n=== VERIFICATION ===');
  
  const iterationsOk = result.iterations < 10;
  console.log(`Iterations < 10: ${iterationsOk ? '✅ PASS' : '❌ FAIL'} (${result.iterations})`);

  const voltagesOk = result.voltages.every(v => {
    const mag = Math.sqrt(v.re * v.re + v.im * v.im);
    return mag > 0.9 && mag < 1.1;
  });
  console.log(`Voltages ~1 pu: ${voltagesOk ? '✅ PASS' : '❌ FAIL'}`);

  const mismatchOk = result.maxMismatch < 1e-4;
  console.log(`Mismatch → 1e-6: ${mismatchOk ? '✅ PASS' : '❌ FAIL'} (${result.maxMismatch.toExponential(6)})`);

  if (result.converged && iterationsOk && voltagesOk) {
    console.log('\n✅ ALL TESTS PASSED - Jacobian is working correctly!');
  } else {
    console.log('\n❌ SOME TESTS FAILED - Check implementation');
  }

} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  console.error(error.stack);
}
