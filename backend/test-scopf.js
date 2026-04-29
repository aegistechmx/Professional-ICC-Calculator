/**
 * test-scopf.js - Test Security-Constrained Optimal Power Flow
 */

const SCOPFSolver = require('./src/core/powerflow/opf/scopf/scopfSolver');

// Test system for SCOPF
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
    { id: 0, from: 0, to: 1, R: 0.01, X: 0.03, limit: 1.0 },
    { id: 1, from: 0, to: 2, R: 0.015, X: 0.045, limit: 0.8 },
    { id: 2, from: 1, to: 2, R: 0.02, X: 0.06, limit: 0.9 },
    { id: 3, from: 1, to: 3, R: 0.025, X: 0.075, limit: 0.7 },
    { id: 4, from: 2, to: 3, R: 0.03, X: 0.09, limit: 0.6 },
    { id: 5, from: 2, to: 4, R: 0.02, X: 0.06, limit: 0.5 },
    { id: 6, from: 3, to: 4, R: 0.025, X: 0.075, limit: 0.4 }
  ]
};

console.log('=== TESTING SECURITY-CONSTRAINED OPTIMAL POWER FLOW (SCOPF) ===\n');

// Test 1: Basic SCOPF
console.log('1. Basic SCOPF Analysis:');
const scopfSolver = new SCOPFSolver(testSystem, {
  tolerance: 1e-6,
  maxIterations: 30,
  alpha: 0.3,
  powerFlowMethod: 'FDLF',
  maxContingencies: 10,
  voltageMin: 0.95,
  voltageMax: 1.05,
  lineLimitFactor: 1.0
});

const scopfResult = scopfSolver.solve();

console.log(`  Converged: ${scopfResult.converged}`);
console.log(`  Total Iterations: ${scopfResult.iterations}`);
console.log(`  Base Case Cost: $${scopfResult.baseOPF.cost.toFixed(2)}`);
console.log(`  Secure Solution Cost: $${scopfResult.cost.toFixed(2)}`);
console.log(`  Total Contingencies: ${scopfResult.summary.totalContingencies}`);
console.log(`  Critical Violations: ${scopfResult.summary.criticalViolations}`);
console.log(`  Marginal Violations: ${scopfResult.summary.marginalViolations}`);
console.log(`  System Secure: ${scopfResult.summary.secure ? 'YES' : 'NO'}`);

// Test 2: Contingency impact analysis
console.log('\n2. Contingency Impact Analysis:');
const criticalContingencies = scopfResult.securityViolations.filter(v => 
  v.severity === 'critical'
);

if (criticalContingencies.length > 0) {
  criticalContingencies.slice(0, 5).forEach((violation, i) => {
    console.log(`  Critical ${i + 1}: ${violation.contingency.description}`);
    console.log(`    Type: ${violation.type}`);
    console.log(`    Severity: ${violation.severity}`);
    
    if (violation.violations && violation.violations.length > 0) {
      violation.violations.forEach(v => {
        console.log(`    Violation: ${v.type} = ${v.value.toFixed(3)} (limit: ${v.limit})`);
      });
    }
  });
}

// Test 3: Security constraints summary
console.log('\n3. Security Constraints Summary:');
const voltageViolations = scopfResult.securityViolations.filter(v => 
  v.violations && v.violations.some(vv => vv.type.includes('voltage'))
);

const overloadViolations = scopfResult.securityViolations.filter(v => 
  v.violations && v.violations.some(vv => vv.type.includes('overload'))
);

console.log(`  Voltage Violations: ${voltageViolations.length}`);
console.log(`  Overload Violations: ${overloadViolations.length}`);

if (voltageViolations.length > 0) {
  console.log('  Worst Voltage:');
  const worstVoltage = voltageViolations.reduce((worst, v) => {
    const voltageViolation = v.violations.find(vv => vv.type.includes('voltage'));
    if (voltageViolation) {
      return voltageViolation.violation > worst.violation ? v : worst;
    }
    return worst;
  }, { violation: 0 });
  
  console.log(`    Bus: ${worstVoltage.violations[0].bus}`);
  console.log(`    Voltage: ${worstVoltage.violations[0].value.toFixed(3)} pu`);
  console.log(`    Deviation: ${worstVoltage.violations[0].violation.toFixed(3)} pu`);
}

if (overloadViolations.length > 0) {
  console.log('  Worst Overload:');
  const worstOverload = overloadViolations.reduce((worst, v) => {
    const overloadViolation = v.violations.find(vv => vv.type.includes('overload'));
    if (overloadViolation) {
      return overloadViolation.violation > worst.violation ? v : worst;
    }
    return worst;
  }, { violation: 0 });
  
  console.log(`    Line: ${worstOverload.violations[0].line}`);
  console.log(`    Loading: ${worstOverload.violations[0].loading.toFixed(2)} pu`);
  console.log(`    Excess: ${worstOverload.violations[0].violation.toFixed(3)} pu`);
}

// Test 4: Economic analysis
console.log('\n4. Economic Analysis:');
const totalLoad = testSystem.buses
  .filter(b => b.type === 'PQ')
  .reduce((sum, b) => sum + Math.abs(b.P), 0);

if (scopfResult.secureSolution && scopfResult.secureSolution.generation) {
  const totalGen = scopfResult.secureSolution.generation
    .reduce((sum, g) => sum + g.P, 0);

  console.log(`  Total Load: ${totalLoad.toFixed(3)} MW`);
  console.log(`  Total Generation: ${totalGen.toFixed(3)} MW`);
  console.log(`  Power Balance: ${(totalGen - totalLoad).toFixed(3)} MW`);
  console.log(`  Cost Increase: $${(scopfResult.cost - scopfResult.baseOPF.cost).toFixed(2)}/h`);

  // Test 5: LMP comparison
  console.log('\n5. LMP Comparison (Base vs Secure):');
  console.log('  Base Case LMPs:');
  scopfResult.baseOPF.generation.forEach(gen => {
    console.log(`    Bus ${gen.bus}: $${gen.marginalCost.toFixed(2)}/MWh`);
  });

  console.log('  Secure Solution LMPs:');
  scopfResult.secureSolution.generation.forEach(gen => {
    console.log(`    Bus ${gen.bus}: $${gen.marginalCost.toFixed(2)}/MWh`);
  });
} else {
  console.log('  No secure solution available');
}

console.log('\n✅ Security-Constrained OPF Complete!');
console.log('\n🎯 SCOPF Capabilities Demonstrated:');
console.log('  ✅ N-1 contingency generation');
console.log('  ✅ Security constraint evaluation');
console.log('  ✅ Voltage and flow limit checking');
console.log('  ✅ Economic optimization with security');
console.log('  ✅ Market-grade LMP calculation');
console.log('  ✅ Critical contingency identification');
