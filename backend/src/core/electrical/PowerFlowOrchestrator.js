/**
 * PowerFlowOrchestrator - Unified power flow pipeline
 * 
 * Complete integration: ReactFlow → Per-Unit → Ybus → Newton-Raphson → Results
 * 
 * Pipeline:
 * ReactFlow (nodes, edges)
 *   ↓
 * buildGraph()
 *   ↓
 * assignBaseKV() (automatic voltage base per bus)
 *   ↓
 * buildPU() (convert everything to per-unit)
 *   ↓
 * buildYbus() (admittance matrix)
 *   ↓
 * solveNR() (Newton-Raphson with Jacobian)
 *   ↓
 * results (V, θ, flows in both pu and actual units)
 */

const { buildElectricalGraph } = require('./YbusBuilderV2');
const { Base, pu, buildPU } = require('./PerUnitSystem');
const { buildYbus } = require('./YbusBuilderV2');
const { solveNR, buildJacobianBlocks } = require('./NewtonRaphsonSolverV2');

/**
 * Assign voltage base (kV) to each bus
 * Automatic detection from transformers and node parameters
 * 
 * @param {Object} graph - Electrical graph with buses, lines, trafos
 * @returns {Object} Vbase_kV - Map of busId -> kV
 */
function assignBaseKV(graph) {
  const Vbase_kV = {};
  
  // 1) Initialize from node parameters
  graph.buses.forEach(bus => {
    Vbase_kV[bus.id] = bus.baseKV || 13.8; // Default 13.8 kV
  });
  
  // 2) Adjust with transformers
  if (graph.trafos) {
    graph.trafos.forEach(t => {
      const kVpri = t.primaryKV || 13.8;
      const kVsec = t.secondaryKV || 0.48;
      
      Vbase_kV[t.fromBus] = kVpri;
      Vbase_kV[t.toBus] = kVsec;
    });
  }
  
  return Vbase_kV;
}

/**
 * Build reduced Jacobian matrix based on bus types
 * 
 * J = | H   N |
 *     | M   L |
 * 
 * Only includes active variables:
 * - SLACK: θ fixed, V fixed (no variables)
 * - PV: θ variable, V fixed
 * - PQ: θ variable, V variable
 * 
 * @param {Array} H - dP/dθ block
 * @param {Array} N - dP/dV block
 * @param {Array} M - dQ/dθ block
 * @param {Array} L - dQ/dV block
 * @param {Array} buses - Array of bus objects
 * @returns {Array} Reduced Jacobian matrix
 */
function buildReducedJacobian(H, N, M, L, buses) {
  const angleIdx = [];
  const voltIdx = [];
  
  buses.forEach((b, i) => {
    if (b.type !== 'SLACK') angleIdx.push(i);
    if (b.type === 'PQ') voltIdx.push(i);
  });
  
  const J = [];
  
  // H block (rows: angle variables, cols: angle variables)
  for (const i of angleIdx) {
    const row = [];
    for (const j of angleIdx) row.push(H[i][j]);
    for (const j of voltIdx) row.push(N[i][j]);
    J.push(row);
  }
  
  // M block (rows: voltage variables, cols: angle variables)
  for (const i of voltIdx) {
    const row = [];
    for (const j of angleIdx) row.push(M[i][j]);
    for (const j of voltIdx) row.push(L[i][j]);
    J.push(row);
  }
  
  return J;
}

/**
 * Complete power flow solver - unified pipeline
 * 
 * @param {Object} data - ReactFlow data { nodes, edges }
 * @param {Object} options - Solver options
 * @returns {Object} Complete power flow results
 */
async function solvePowerFlow(data, options = {}) {
  const {
    nodes,
    edges
  } = data;
  
  const {
    Sbase_MVA = 100,
    maxIter = 20,
    tol = 1e-6,
    verbose = false,
    returnActualUnits = true
  } = options;
  
  // 1) Build electrical graph from ReactFlow
  const graph = buildElectricalGraph(nodes, edges);
  
  // 2) Assign voltage bases (kV) per bus
  const Vbase_kV = assignBaseKV(graph);
  
  // 3) Build per-unit system
  const base = new Base({ Sbase_MVA, Vbase_kV });
  const puSystem = buildPU(graph, base);
  
  // 4) Combine lines and transformers for Ybus
  const branches = [
    ...puSystem.lines.map(l => ({
      from: l.from,
      to: l.to,
      R: l.R,
      X: l.X,
      B: l.B || 0,
      tap: 1
    })),
    ...puSystem.trafos.map(t => ({
      from: t.fromBus,
      to: t.toBus,
      R: t.R,
      X: t.X,
      B: 0,
      tap: t.tap || 1
    }))
  ];
  
  // 5) Build Ybus matrix
  const YbusResult = buildYbus(puSystem.buses, branches);
  
  // 6) Solve Newton-Raphson
  const loadFlowResult = solveNR(puSystem.buses, YbusResult, {
    maxIter,
    tol,
    verbose
  });
  
  if (!loadFlowResult.converged) {
    return {
      success: false,
      converged: false,
      iterations: loadFlowResult.iterations,
      maxError: loadFlowResult.maxError,
      error: 'Load flow did not converge'
    };
  }
  
  // 7) Prepare results
  const results = {
    success: true,
    converged: loadFlowResult.converged,
    iterations: loadFlowResult.iterations,
    maxError: loadFlowResult.maxError,
    base: {
      Sbase_MVA,
      Vbase_kV
    },
    buses: puSystem.buses.map((bus, i) => {
      const Vbase = Vbase_kV[bus.id];
      const Sbase = Sbase_MVA;
      
      const result = {
        id: bus.id,
        type: bus.type,
        V_pu: loadFlowResult.V[i],
        theta_rad: loadFlowResult.theta[i],
        theta_deg: loadFlowResult.theta[i] * (180 / Math.PI),
        P_pu: loadFlowResult.P[i],
        Q_pu: loadFlowResult.Q[i],
        Vbase_kV: Vbase
      };
      
      // Add actual units if requested
      if (returnActualUnits) {
        result.V_kV = loadFlowResult.V[i] * Vbase;
        result.P_MW = loadFlowResult.P[i] * Sbase;
        result.Q_MVAR = loadFlowResult.Q[i] * Sbase;
      }
      
      return result;
    }),
    system: {
      P_loss_pu: loadFlowResult.P_loss,
      Q_loss_pu: loadFlowResult.Q_loss,
      P_loss_MW: loadFlowResult.P_loss * Sbase_MVA,
      Q_loss_MVAR: loadFlowResult.Q_loss * Sbase_MVA
    },
    history: loadFlowResult.history
  };
  
  return results;
}

/**
 * Quick power flow solver (simplified interface)
 */
async function solvePowerFlowQuick(nodes, edges, options = {}) {
  return solvePowerFlow({ nodes, edges }, options);
}

module.exports = {
  solvePowerFlow,
  solvePowerFlowQuick,
  assignBaseKV,
  buildReducedJacobian
};
