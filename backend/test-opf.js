/**
 * test-opf.js - Test Optimal Power Flow economic dispatch
 */

const NewtonOPFSolver = require('./src/core/powerflow/opf/solver');

// Test system for OPF
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
      Pmin: 0.2,
      Pmax: 1.5,
      cost: { a: 0.01, b: 10.0, c: 100.0 }
    },
    {
      id: 2,
      type: 'PV',
      voltage: { magnitude: 1.015, angle: 0 },
      P: 0.6,
      Q: 0,
      Pmin: 0.1,
      Pmax: 1.2,
      cost: { a: 0.015, b: 12.0, c: 80.0 }
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

console.log('=== TESTING OPTIMAL POWER FLOW (ECONOMIC DISPATCH) ===\n');

// Test 1: Basic OPF optimization
console.log('1. Newton-OPF Economic Dispatch:');
const opfSolver = new NewtonOPFSolver(testSystem, {
  tolerance: 1e-6,
  maxIterations: 20,
  alpha: 0.5,
  powerFlowMethod: 'FDLF',
  penalty: 1000
});

const opfResult = opfSolver.solve();

console.log(`  Converged: ${opfResult.converged}`);
console.log(`  Iterations: ${opfResult.iterations}`);
console.log(`  Total Cost: $${opfResult.cost.toFixed(2)}`);
console.log(`  Power Balance λ: ${opfResult.lambda.toFixed(4)}`);

console.log('\n2. Optimal Generation Schedule:');
opfResult.generation.forEach((gen, i) => {
  console.log(`  Generator ${gen.id}:`);
  console.log(`    Generation: ${gen.P.toFixed(3)} MW`);
  console.log(`    Cost: $${gen.cost.toFixed(2)}/h`);
  console.log(`    Marginal Cost: $${gen.marginalCost.toFixed(2)}/MWh`);
  console.log(`    Within Limits: ${gen.withinLimits ? '✅' : '❌'}`);
});

console.log('\n3. Constraint Violations:');
if (opfResult.violations.feasible) {
  console.log('  ✅ All constraints satisfied');
} else {
  console.log(`  ❌ ${opfResult.violations.violations.length} violations found`);
  opfResult.violations.violations.forEach(v => {
    console.log(`    ${v.type}: ${v.violation.toFixed(4)}`);
  });
}

console.log('\n4. Economic Analysis:');
const totalLoad = testSystem.buses
  .filter(b => b.type === 'PQ')
  .reduce((sum, b) => sum + Math.abs(b.P), 0);

const totalGen = opfResult.generation
  .reduce((sum, g) => sum + g.P, 0);

console.log(`  Total Load: ${totalLoad.toFixed(3)} MW`);
console.log(`  Total Generation: ${totalGen.toFixed(3)} MW`);
console.log(`  Power Balance: ${(totalGen - totalLoad).toFixed(3)} MW`);

// Calculate marginal costs (LMPs)
console.log('\n5. Locational Marginal Prices (LMPs):');
opfResult.generation.forEach((gen, i) => {
  console.log(`  Bus ${gen.bus}: $${gen.marginalCost.toFixed(2)}/MWh`);
});

console.log('\n✅ Optimal Power Flow Complete!');
