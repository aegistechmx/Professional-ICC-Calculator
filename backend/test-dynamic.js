/**
 * test-dynamic.js - Test transient stability simulation
 */

const DynamicPowerFlowSolver = require('./src/core/powerflow/dynamics/solver/dynamicSolver');

// Test system for dynamic simulation
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
      H: 5.0,  // Inertia constant
      D: 2.0,  // Damping coefficient
      Pm: 0.8,  // Mechanical power
      xd: 0.3   // Direct axis reactance
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

console.log('=== TESTING TRANSIENT STABILITY SIMULATION ===\n');

// Test 1: Basic dynamic simulation
console.log('1. Basic Dynamic Simulation:');
const solver = new DynamicPowerFlowSolver(testSystem, {
  dt: 0.01,
  tEnd: 2.0,
  method: 'FDLF'
});

const dynamicResult = solver.run();

console.log(`  Simulation Time: ${dynamicResult.time.length} steps`);
console.log(`  Stable: ${dynamicResult.stable}`);
console.log(`  Instability Time: ${dynamicResult.instabilityTime || 'N/A'}`);
console.log(`  Final Angles: [${dynamicResult.angles[dynamicResult.angles.length - 1].map(a => a.toFixed(4)).join(', ')}]`);
console.log(`  Final Speeds: [${dynamicResult.speeds[dynamicResult.speeds.length - 1].map(s => s.toFixed(4)).join(', ')}]`);

// Test 2: Fault application and clearing
console.log('\n2. Fault Application and Clearing:');
solver.applyFault({
  type: 'three_phase',
  bus: 1
});

console.log('  Fault applied at t=0.1s');

// Run a few more steps
for (let i = 0; i < 10; i++) {
  const step = solver.calculateDerivatives();
  solver.integrate();
  
  if (i === 5) {
    console.log('  Fault cleared at t=0.6s');
    solver.clearFault({
      type: 'three_phase',
      bus: 1
    });
  }
}

const finalState = solver.getFinalState();
console.log(`  Post-fault stability: ${finalState.stable ? 'STABLE' : 'UNSTABLE'}`);

console.log('\n✅ Transient Stability Simulation Complete!');
