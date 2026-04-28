/**
 * SimulationEngine - Complete integration of ReactFlow to electrical simulation
 * 
 * Integration Architecture:
 * ReactFlow → PerUnitSystem → buildElectricalGraph() → buildYbus() → solveNR() → faultAnalysis()
 * 
 * This is the main entry point for the industrial simulation engine
 */

const { buildElectricalGraph, buildYbus, buildSequenceYbus } = require('./YbusBuilderV2');
const { solveNR } = require('./NewtonRaphsonSolverV2');
const { buildSequenceZbus, analyzeFault, faultScan } = require('./FaultAnalysisV2');
const { validateTopology } = require('./TopologyValidator');
const { reactFlowToPU, buildPU, autoDetectBases } = require('./PerUnitSystem');

/**
 * Complete simulation workflow with per-unit system
 * @param {Object} data - ReactFlow data { nodes, edges }
 * @param {Object} options - Simulation options
 * @returns {Object} Complete simulation results
 */
function runSimulation(data, options = {}) {
  const {
    nodes,
    edges
  } = data;
  
  const {
    analysisType = 'loadflow', // 'loadflow', 'fault', 'both'
    faultType = '3P',
    faultBusId = null,
    faultOptions = {},
    solverOptions = {},
    usePerUnit = true // Enable per-unit conversion
  } = options;
  
  // Step 1: Convert to per-unit system (if enabled)
  let system;
  if (usePerUnit) {
    system = reactFlowToPU({ nodes, edges });
  } else {
    // Direct conversion without per-unit
    const graph = buildElectricalGraph(nodes, edges);
    system = {
      base: null,
      buses: graph.buses,
      lines: graph.branches.filter(b => !b.isTransformer),
      trafos: graph.branches.filter(b => b.isTransformer),
      loads: [],
      motors: [],
      generators: []
    };
  }
  
  // Step 2: Validate topology
  const topologyValidation = validateTopologyFromGraph(system.buses, system.lines, system.trafos);
  if (!topologyValidation.valid) {
    return {
      success: false,
      error: 'Invalid topology',
      details: topologyValidation
    };
  }
  
  // Step 3: Build Ybus matrix
  const YbusResult = buildYbus(system.buses, system.lines);
  
  // Step 4: Run load flow
  const loadFlowResult = solveNR(system.buses, YbusResult, solverOptions);
  
  if (!loadFlowResult.converged) {
    return {
      success: false,
      error: 'Load flow did not converge',
      loadFlow: loadFlowResult
    };
  }
  
  // Step 5: Fault analysis (if requested)
  let faultResult = null;
  if (analysisType === 'fault' || analysisType === 'both') {
    // Build sequence Ybus for fault analysis
    const sequenceYbus = buildSequenceYbus(system.buses, system.lines);
    const Zbus = buildSequenceZbus(sequenceYbus);
    
    if (faultBusId) {
      // Single fault analysis
      const busIndex = system.buses.findIndex(b => b.id === faultBusId);
      if (busIndex === -1) {
        return {
          success: false,
          error: `Bus ${faultBusId} not found`
        };
      }
      faultResult = analyzeFault(faultType, busIndex, Zbus, faultOptions);
    } else {
      // Fault scan (all buses)
      faultResult = faultScan(Zbus, faultType, faultOptions);
    }
  }
  
  // Convert results back to actual units if per-unit was used
  let finalBuses;
  if (usePerUnit && system.base) {
    finalBuses = system.buses.map((bus, i) => {
      const Vbase = system.base.getVbase(bus.id);
      const Sbase = system.base.getSbase();
      
      return {
        ...bus,
        V_final_pu: loadFlowResult.V[i],
        theta_final: loadFlowResult.theta[i],
        V_final_kV: loadFlowResult.V[i] * Vbase,
        P_final_MW: loadFlowResult.P[i] * Sbase * 1000,
        Q_final_MVAR: loadFlowResult.Q[i] * Sbase * 1000,
        P_final_pu: loadFlowResult.P[i],
        Q_final_pu: loadFlowResult.Q[i]
      };
    });
  } else {
    finalBuses = system.buses.map((bus, i) => ({
      ...bus,
      V_final_pu: loadFlowResult.V[i],
      theta_final: loadFlowResult.theta[i],
      P_final_pu: loadFlowResult.P[i],
      Q_final_pu: loadFlowResult.Q[i]
    }));
  }
  
  // Return complete results
  return {
    success: true,
    base: system.base,
    topology: topologyValidation,
    loadFlow: {
      ...loadFlowResult,
      buses: finalBuses
    },
    fault: faultResult,
    buses: finalBuses
  };
}

/**
 * Validate topology from graph
 */
function validateTopologyFromGraph(buses, lines, trafos) {
  // Build adjacency list
  const adjacency = {};
  buses.forEach(bus => {
    adjacency[bus.id] = [];
  });
  
  lines.forEach(l => {
    if (adjacency[l.from]) adjacency[l.from].push(l.to);
    if (adjacency[l.to]) adjacency[l.to].push(l.from);
  });
  
  trafos.forEach(t => {
    if (adjacency[t.from]) adjacency[t.from].push(t.to);
    if (adjacency[t.to]) adjacency[t.to].push(t.from);
  });
  
  const errors = [];
  const warnings = [];
  
  // Check for slack bus
  const slackBuses = buses.filter(b => b.type === 'SLACK');
  if (slackBuses.length === 0) {
    errors.push('No slack bus found in the system');
  }
  
  // Check for isolated buses
  const connectedBusIds = new Set();
  lines.forEach(l => {
    connectedBusIds.add(l.from);
    connectedBusIds.add(l.to);
  });
  trafos.forEach(t => {
    connectedBusIds.add(t.from);
    connectedBusIds.add(t.to);
  });
  
  const isolatedBuses = buses.filter(b => !connectedBusIds.has(b.id));
  if (isolatedBuses.length > 0) {
    errors.push(`Isolated buses: ${isolatedBuses.map(b => b.id).join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalBuses: buses.length,
      totalBranches: lines.length + trafos.length,
      slackBuses: slackBuses.length,
      isolatedBuses: isolatedBuses.length
    }
  };
}

/**
 * Quick load flow only (no fault analysis)
 */
function runLoadFlow(data, options = {}) {
  return runSimulation(data, {
    ...options,
    analysisType: 'loadflow'
  });
}

/**
 * Fault analysis only (assumes pre-computed load flow)
 */
function runFaultAnalysis(data, options = {}) {
  return runSimulation(data, {
    ...options,
    analysisType: 'fault'
  });
}

/**
 * Complete analysis (load flow + fault)
 */
function runCompleteAnalysis(data, options = {}) {
  return runSimulation(data, {
    ...options,
    analysisType: 'both'
  });
}

module.exports = {
  runSimulation,
  runLoadFlow,
  runFaultAnalysis,
  runCompleteAnalysis,
  validateTopologyFromGraph,
  reactFlowToPU
};
