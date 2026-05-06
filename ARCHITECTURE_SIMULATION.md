# ICC Calculator - Industrial Simulation Architecture

## Overview

The ICC Calculator is an industrial-grade power system simulator with a ReactFlow-based visual editor frontend and Express backend for electrical calculations.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    ReactFlow Editor                          │
│                  (Visual Circuit Builder)                    │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Frontend Store (useStore.js)                    │
│  - Sanitize graph data (validate limits)                     │
│  - Build API payloads                                        │
│  - Apply simulation results to visual elements              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend API Controllers                         │
│  ┌─────────────┬──────────────┬──────────────────────┐     │
│  │ /powerflow  │ /cortocircuito│ /motor-integration   │     │
│  │ /validate   │ /proyectos    │ /simulacion/branches│     │
│  └─────────────┴──────────────┴──────────────────────┘     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Core Engine                                     │
│  ┌─────────────┬──────────────┬──────────────────────┐     │
│  │ Power Flow │ Short Circuit │ System Validation     │     │
│  │ (Newton-   │ Analysis      │ (SystemValidator.js)  │     │
│  │  Raphson)  │               │                       │     │
│  └─────────────┴──────────────┴──────────────────────┘     │
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

### Core Power Flow Engine
**Location:** `backend/src/core/`

- `index.js` - Centralized exports for powerflow, OPF, stability, shortcircuit
- `powerflow/solvers/newtonRaphson.js` - Newton-Raphson solver implementation
- `powerflow/solvers/fastDecoupled.js` - Fast Decoupled Load Flow
- `powerflow/jacobian.js` - Jacobian matrix calculations
- `validation/SystemValidator.js` - Electrical system validation

### API Layer
**Location:** `backend/src/api/`

- `controllers/` - Request handlers (distributed, motor, proteccion, powerflow)
- `routes/` - API route definitions
- `middlewares/errorHandler.js` - Error handling middleware

### Frontend
**Location:** `frontend/src/`

- `store/useStore.js` - Zustand store with simulation methods
- `components/Editor.jsx` - ReactFlow visual editor
- `utils/` - Calculation utilities and result application

## Key Features

### 1. Visual Circuit Editor
- ReactFlow-based drag-and-drop interface
- Components: transformers, generators, motors, breakers, panels, loads
- Real-time validation and sanitization

### 2. Power Flow Analysis
- Newton-Raphson iterative solver
- Jacobian matrix calculation
- Convergence tracking with configurable tolerance
- Per-unit system support

### 3. Short Circuit Analysis
- Branch-based impedance accumulation
- Fault current calculation per node
- Motor contribution modeling

### 4. System Validation
- Isolated bus detection
- Loop detection
- Voltage base consistency checking
- Transformer configuration validation

### 5. Protection Coordination
- Time-current coordination analysis
- Auto-tuning of relay settings
- Cascade simulation

### 6. Data Persistence
- LocalStorage for session recovery
- Backend project save/load
- JSON import/export

## Integration with Existing System

### Backend Integration

The backend exposes separate endpoints for different analysis types:

```javascript
// backend/src/core/index.js - Actual exports
module.exports = {
  powerflow: {
    solveNR,      // Newton-Raphson solver
    solveFDLF     // Fast Decoupled Load Flow
  },
  opf: {
    solveOPF      // Optimal Power Flow
  },
  stability: {
    simulateDynamics
  },
  shortcircuit: {
    analyzeShortCircuit
  }
};
```

**Available API Endpoints:**
- `POST /powerflow/run` - Execute power flow analysis
- `POST /powerflow/validate` - Validate system topology
- `POST /cortocircuito/calculate` - Calculate short circuit currents
- `POST /simulacion/branches` - Branch-based calculations
- `GET/POST/PUT/DELETE /projects` - Project management

### Frontend Integration

The frontend store provides simulation methods:

```javascript
// frontend/src/store/useStore.js
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';

export const useStore = create((set, get) => ({
  // Calculate power flow
  calculatePowerFlow: async (options = {}) => {
    const { nodes, edges } = get();
    const response = await axios.post(`${API_BASE}/powerflow/run`, {
      nodes,
      edges,
      options: {
        Sbase_MVA: options.Sbase_MVA || 100,
        maxIter: options.maxIter || 20,
        tol: options.tol || 1e-6,
        returnActualUnits: true,
      },
    });
    return response.data;
  },

  // Calculate short circuit
  calculateShortCircuitFromGraph: async () => {
    const { nodes, edges, systemMode } = get();
    const cleanGraph = sanitizeGraph({ nodes, edges, systemMode });
    const response = await axios.post(
      `${API_BASE}/cortocircuito/calculate`,
      cleanGraph
    );
    return response.data;
  }
}));
```

## Usage Examples

### Power Flow Analysis

```javascript
const { powerflow } = require('../core');
const SystemValidator = require('../validation/SystemValidator');

// Build system from ReactFlow data
const system = {
  baseMVA: 100,
  baseKV: 13.8,
  buses: [
    { id: 1, type: 'slack', V: 1.0, theta: 0 },
    { id: 2, type: 'pq', P: 0.5, Q: 0.2 },
  ],
  branches: [
    { from: 1, to: 2, R: 0.01, X: 0.05 },
  ],
};

// Validate first
const validation = SystemValidator.validateSystem({
  buses: system.buses,
  lines: system.branches,
  trafos: [],
  loads: [],
  generators: [],
});

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  return;
}

// Run Newton-Raphson
const result = powerflow.solveNR(system, {
  maxIterations: 20,
  tolerance: 1e-6,
});

console.log('Converged:', result.converged);
console.log('Iterations:', result.iterations);
console.log('Voltages:', result.voltages);
```

### Short Circuit Analysis

```javascript
// Using the cortocircuito endpoint
const response = await axios.post(
  `${API_BASE}/cortocircuito/calculate`,
  {
    nodes: graphNodes,
    edges: graphEdges,
    systemMode: 'normal'
  }
);

const result = response.data;
console.log('Results by node:', result.resultsByNodeId);
console.log('Validation:', result.validacion);
```

### Protection Coordination

```javascript
// From useStore.js - frontend coordination
const { protections } = get();

// Auto-tune relays for coordination
const tunedRelays = autoTuneRelays(protections, flows, 10, 0.3);

// Apply relay state to nodes
const newNodes = applyRelayState(nodes, tunedRelays, flows);

console.log('Tuned relays:', tunedRelays);
```

### System Validation

```javascript
const SystemValidator = require('../validation/SystemValidator');

const system = {
  buses: [...],
  lines: [...],
  trafos: [...],
  loads: [...],
  generators: [...]
};

const validation = SystemValidator.validateSystem(system);

console.log('Valid:', validation.valid);
console.log('Errors:', validation.errors);
console.log('Warnings:', validation.warnings);
console.log('Summary:', validation.summary);
```

## Known Limitations & TODOs

1. **Jacobian Calculation** - Currently uses simplified placeholder implementation in `newtonRaphson.js`. Full partial derivative calculation needed for production use.

2. **Newton-Raphson Convergence** - May report fake convergence in some edge cases. See solver implementation for details.

3. **Dynamic Motor Models** - Planned: Differential equations for motor dynamics (dω/dt)

4. **Advanced Visualization** - Planned: Real-time voltage coloring, animated flow

5. **Professional PDF Reports** - Implemented via `/reporte/pdf` endpoint

## Development Guidelines

- Run linting: `npm run lint` in backend/ and frontend/ directories
- Tests: `npm test` in both directories
- Electrical validation: `node scripts/validate-electrical-inputs.js`

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
