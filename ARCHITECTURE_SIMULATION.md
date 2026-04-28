# ICC Calculator - Industrial Simulation Architecture

## Overview

The ICC Calculator has been transformed from a calculator into an industrial-grade power system simulator. This document describes the new unified electrical simulation engine.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    ReactFlow Editor                          │
│                  (Visual Circuit Builder)                    │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              ReactFlowConverter                              │
│         (Editor → ElectricalSystem Mapping)                  │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              ElectricalSystem (Unified Model)                │
│  ┌─────────┬─────────┬─────────┬─────────┬─────────────┐   │
│  │  Buses  │  Lines  │Transf.  │  Loads  │  Motors/Gen │   │
│  └─────────┴─────────┴─────────┴─────────┴─────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                 Solver Engine                                │
│  ┌─────────────┬──────────────┬──────────────────────┐     │
│  │ Load Flow  │ Fault Analysis│ Topology Validator  │     │
│  │ (Newton-   │ (Symmetrical  │ (Graph Analysis)    │     │
│  │  Raphson)  │  Components) │                      │     │
│  └─────────────┴──────────────┴──────────────────────┘     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Protection Engine                               │
│  ┌─────────────┬──────────────┬──────────────────────┐     │
│  │  TCC Curves │ Coordination │  Selectivity Matrix  │     │
│  │ (IEC/ANSI)  │  Analysis    │                      │     │
│  └─────────────┴──────────────┴──────────────────────┘     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Scenario System                                 │
│  (Multi-condition Analysis: Load variations, N-1, Faults)   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Results Engine                                  │
│  ┌─────────────┬──────────────┬──────────────────────┐     │
│  │   UI Data   │   PDF Report │    Database Save     │     │
│  └─────────────┴──────────────┴──────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Module Structure

### Phase 1: Unified Electrical Model
**Location:** `backend/src/core/electrical/`

- `ElectricalSystem.js` - Core system model with Bus, Line, Transformer, Load, Motor, Generator classes
- `ReactFlowConverter.js` - Converts ReactFlow nodes/edges to ElectricalSystem
- `YbusBuilder.js` - Builds admittance matrix (Ybus) for power flow analysis
- `NewtonRaphsonSolver.js` - Load flow solver using Newton-Raphson method

### Phase 2: Fault Analysis & Topology
**Location:** `backend/src/core/electrical/`

- `SymmetricalComponents.js` - Fault analysis using symmetrical components (3F, LG, LL, LLG)
- `TopologyValidator.js` - Validates electrical topology (loops, isolated buses, etc.)

### Phase 3: Protection & Scenarios
**Location:** `backend/src/core/protections/` and `backend/src/core/scenarios/`

- `TCCCurves.js` - Time-Current Characteristic curves (IEC 60255, ANSI C37.112)
- `ProtectionCoordination.js` - Protection coordination analysis and auto-adjustment
- `ScenarioSystem.js` - Multi-scenario simulation system

## Key Features

### 1. Unified Electrical Model
- Object-oriented representation of power system components
- Per-unit system support
- Proper voltage level handling
- Component status tracking

### 2. Load Flow Analysis
- Newton-Raphson iterative solver
- Jacobian matrix calculation
- Convergence tracking
- Voltage and angle results
- Power loss calculation

### 3. Fault Analysis
- Symmetrical components method
- All fault types: 3F, LG, LL, LLG
- Sequence networks (positive, negative, zero)
- Fault current calculation
- X/R ratio analysis
- Peak current with DC offset

### 4. Topology Validation
- Isolated bus detection
- Loop detection
- Direct source-to-load connection warning
- Transformer ratio validation
- Grounding configuration check

### 5. TCC Curves
- IEC 60255 curves: Standard, Very, Extremely, Long Time, Short Time
- ANSI C37.112 curves: Moderately, Very, Extremely Inverse
- Operating time calculation
- Curve generation for visualization
- Trip evaluation

### 6. Protection Coordination
- Time-current coordination analysis
- Cascade coordination (multi-level)
- Selectivity matrix
- Auto-adjustment of TMS settings
- LSIG coordination

### 7. Scenario System
- Multiple operating conditions
- Load variations (max, min, normal)
- Generation states (N-1, N-2)
- Topology changes (line outages)
- Fault scenarios
- Scenario comparison

## Integration with Existing System

### Backend Integration

Create a new controller to expose the simulation engine:

```javascript
// backend/src/controllers/simulation.controller.js
const core = require('../core');
const { convertToElectricalSystem, solveLoadFlow, calculateFault } = core;

exports.runSimulation = asyncHandler(async (req, res) => {
  const { nodes, edges, analysisType } = req.body;
  
  // Convert ReactFlow to ElectricalSystem
  const system = convertToElectricalSystem(nodes, edges);
  
  // Validate topology
  const validation = core.validateTopology(system);
  if (!validation.valid) {
    return res.status(400).json({ error: 'Invalid topology', details: validation.errors });
  }
  
  // Run analysis based on type
  let result;
  switch (analysisType) {
    case 'loadflow':
      result = solveLoadFlow(system);
      break;
    case 'fault':
      result = calculateFault(system, req.body.faultData);
      break;
    default:
      throw new Error('Unknown analysis type');
  }
  
  success(res, result);
});
```

### Frontend Integration

Update the frontend store to use the new simulation engine:

```javascript
// frontend/src/store/useStore.js
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';

export const useStore = create((set) => ({
  runSimulation: async (nodes, edges, analysisType, options) => {
    try {
      const response = await axios.post(`${API_BASE}/simulation/run`, {
        nodes,
        edges,
        analysisType,
        ...options
      });
      return response.data;
    } catch (error) {
      console.error('Simulation error:', error);
      throw error;
    }
  }
}));
```

## Usage Examples

### Load Flow Analysis

```javascript
const core = require('../core');

// Convert ReactFlow editor to electrical system
const system = core.convertToElectricalSystem(nodes, edges, {
  baseMVA: 100,
  baseKV: 13.8
});

// Run load flow
const loadFlow = core.solveLoadFlow(system, {
  maxIterations: 30,
  tolerance: 1e-6
});

console.log('Converged:', loadFlow.converged);
console.log('Iterations:', loadFlow.iterations);
console.log('P loss:', loadFlow.P_loss);
console.log('Voltages:', loadFlow.voltages);
```

### Fault Analysis

```javascript
// Calculate 3-phase fault at bus
const faultResult = core.calculateFault(system, {
  faultBusId: 'BUS_2',
  faultType: '3F',
  faultImpedance: { Zf: 0, Zg: 0 }
});

console.log('Fault current:', faultResult.faultCurrent.magnitude_kA, 'kA');
console.log('Peak current:', faultResult.faultCurrent.peak_kA, 'kA');
console.log('X/R ratio:', faultResult.XRRatio);
```

### Protection Coordination

```javascript
const { ProtectionDevice, analyzeCoordination } = core;

// Create protection devices
const upstream = new ProtectionDevice({
  id: 'brk1',
  name: 'Main Breaker',
  pickup: 400,
  tms: 0.3,
  curveType: 'standard',
  level: 2
});

const downstream = new ProtectionDevice({
  id: 'brk2',
  name: 'Feeder Breaker',
  pickup: 100,
  tms: 0.1,
  curveType: 'standard',
  level: 1
});

// Analyze coordination
const coordination = analyzeCoordination(upstream, downstream, {
  faultCurrents: [1000, 5000, 10000],
  coordinationMargin: 0.2
});

console.log('Coordinated:', coordination.coordinated);
console.log('Min margin:', (coordination.minMargin * 100).toFixed(1) + '%');
```

### Scenario Analysis

```javascript
const { ScenarioManager } = core;

const manager = new ScenarioManager();
manager.setBaseSystem(system);

// Create standard scenarios
manager.createStandardScenarios();

// Run all scenarios
const results = manager.runAllScenarios();

// Compare scenarios
const comparison = manager.compareScenarios();

// Find worst case
const worstCase = manager.findWorstCase('P_loss');
```

## Next Steps (Phase 4)

The following features are pending implementation:

1. **Dynamic Motor Models** - Differential equations for motor dynamics (dω/dt)
2. **Advanced Visualization** - Real-time voltage coloring, animated flow
3. **Professional PDF Reports** - Engineering-grade reports with tables and plots

## Performance Considerations

- Ybus matrix: O(n²) complexity where n = number of buses
- Newton-Raphson: O(k·n³) where k = iterations
- For large systems (>1000 buses), consider sparse matrix solvers
- Scenario analysis can be parallelized for faster execution

## References

- IEC 60909: Short-circuit currents in three-phase a.c. systems
- IEC 60255: Electrical relays
- IEEE C37.112: Inverse-time characteristics
- Grainger & Stevenson: Power System Analysis
- Glover, Sarma, Overbye: Power System Analysis and Design
