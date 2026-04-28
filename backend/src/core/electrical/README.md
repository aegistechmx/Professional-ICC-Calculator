# Industrial Simulation Engine - Implementation Guide

## Overview

This directory contains the industrial-grade power system simulation engine that transforms the ICC Calculator from a calculator to an ETAP-level simulator.

## Architecture

```
ReactFlow Editor
    ↓
buildElectricalGraph()      [YbusBuilderV2.js]
    ↓
buildYbus()                 [YbusBuilderV2.js]
    ↓
solveNR()                   [NewtonRaphsonSolverV2.js]
    ↓
buildSequenceZbus()         [FaultAnalysisV2.js]
    ↓
analyzeFault()              [FaultAnalysisV2.js]
```

## Core Components

### 1. Complex.js
Lightweight complex number class for electrical calculations.
- Arithmetic: add, sub, mul, div
- Complex operations: conj, abs, arg, exp, log, sqrt, pow
- Static factories: fromPolar, zero, one, i

### 2. YbusBuilderV2.js
Builds admittance matrix from ReactFlow nodes/edges.
- `buildElectricalGraph(nodes, edges)` - Converts ReactFlow to electrical graph
- `buildYbus(buses, branches)` - Builds Ybus matrix with Complex numbers
- `buildSequenceYbus(buses, branches)` - Builds sequence networks (Y0, Y1, Y2)
- Handles transformer tap ratios properly

### 3. NewtonRaphsonSolverV2.js
Complete Newton-Raphson load flow solver with full Jacobian.
- `solveNR(buses, YbusResult, options)` - Main solver
- Full Jacobian matrix: H = dP/dθ, N = dP/dV, J = dQ/dθ, L = dQ/dV
- Supports SLACK, PV, PQ bus types
- Convergence tracking with history

### 4. FaultAnalysisV2.js
IEC fault analysis using symmetrical components.
- `buildZbus(Y)` - Inverts Ybus to get Zbus (Thevenin impedances)
- `fault3P()` - Three-phase fault
- `faultLG()` - Line-to-ground fault
- `faultLL()` - Line-to-line fault
- `faultLLG()` - Double line-to-ground fault
- `faultScan()` - Analyze faults at all buses

### 5. SimulationEngine.js
Main integration layer.
- `runSimulation(data, options)` - Complete workflow
- `runLoadFlow(data, options)` - Load flow only
- `runFaultAnalysis(data, options)` - Fault analysis only
- `runCompleteAnalysis(data, options)` - Both analyses

## Usage Example

```javascript
const { runCompleteAnalysis } = require('./core/electrical/SimulationEngine');

const data = {
  nodes: [...], // ReactFlow nodes
  edges: [...]  // ReactFlow edges
};

const results = runCompleteAnalysis(data, {
  faultType: '3P',
  faultBusId: 'bus_2',
  solverOptions: {
    maxIter: 20,
    tol: 1e-6,
    verbose: true
  }
});

if (results.success) {
  console.log('Load flow converged:', results.loadFlow.converged);
  console.log('Fault current:', results.fault.If_pu);
  console.log('Bus voltages:', results.buses);
}
```

## Bus Types

- **SLACK**: Reference bus (voltage source)
- **PV**: Voltage-controlled bus (generator)
- **PQ**: Load bus (constant P, Q)

## Fault Types

- **3P**: Three-phase (balanced) - Positive sequence only
- **LG**: Line-to-ground - All three sequences in series
- **LL**: Line-to-line - Positive and negative in parallel
- **LLG**: Double line-to-ground - All three sequences

## Per Unit System

All calculations use per unit (pu) system:
- Base MVA: 100 (default)
- Base KV: System voltage
- V_pu = V_actual / V_base
- I_pu = I_actual / I_base
- Z_pu = Z_actual / Z_base

## Key Differences from Previous Implementation

1. **Complex Numbers**: Proper Complex class instead of object-based
2. **Jacobian Matrix**: Complete implementation with all partial derivatives
3. **Tap Handling**: Correct transformer tap ratio handling in Ybus
4. **Sequence Networks**: Proper zero, positive, negative sequence
5. **IEC Standards**: Industrial-grade fault analysis per IEC 60909
6. **Math Integration**: Uses mathjs for matrix operations

## Integration with Backend

Create a new controller:

```javascript
// backend/src/controllers/simulation.controller.js
const { runCompleteAnalysis } = require('../core/electrical/SimulationEngine');

exports.runSimulation = asyncHandler(async (req, res) => {
  const { nodes, edges, analysisType, faultType, faultBusId } = req.body;
  
  const results = runCompleteAnalysis(
    { nodes, edges },
    { analysisType, faultType, faultBusId }
  );
  
  if (results.success) {
    success(res, results);
  } else {
    badRequest(res, results.error, results.details);
  }
});
```

## Performance Notes

- Ybus construction: O(n²) where n = number of buses
- Newton-Raphson: O(k·n³) where k = iterations
- Zbus inversion: O(n³) using mathjs
- For large systems (>1000 buses), consider sparse matrix solvers

## Dependencies

- mathjs: Matrix operations (inverse, solve)
- No other external dependencies for core electrical calculations

## References

- IEC 60909: Short-circuit currents in three-phase a.c. systems
- Grainger & Stevenson: Power System Analysis
- Glover, Sarma, Overbye: Power System Analysis and Design
