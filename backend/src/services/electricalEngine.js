/**
 * Electrical Calculation Engine (Motor)
 * Based on IEEE Std 399, IEC 60909, and NOM-001-SEDE
 * 
 * This is the core calculation engine that handles:
 * - Short circuit analysis (Isc)
 * - Conductor ampacity
 * - Voltage drop
 * - NOM-001 validations
 */

const { calculateShortCircuit } = require('./shortCircuitCalculator');

// Complete conductor catalog (AWG + kcmil) based on NEC Table 310.16
// R and X are in ohms per 1000 ft (typical NEC tables)
const CONDUCTORES = {
  cobre: {
    pvc: {
      '14': { R: 3.07, X: 0.058, I_ampacidad: 20 },
      '12': { R: 1.93, X: 0.054, I_ampacidad: 25 },
      '10': { R: 1.21, X: 0.051, I_ampacidad: 35 },
      '8': { R: 0.765, X: 0.047, I_ampacidad: 50 },
      '6': { R: 0.484, X: 0.043, I_ampacidad: 65 },
      '4': { R: 0.308, X: 0.040, I_ampacidad: 85 },
      '3': { R: 0.244, X: 0.038, I_ampacidad: 100 },
      '2': { R: 0.194, X: 0.036, I_ampacidad: 115 },
      '1': { R: 0.154, X: 0.034, I_ampacidad: 130 },
      '1/0': { R: 0.123, X: 0.032, I_ampacidad: 150 },
      '2/0': { R: 0.098, X: 0.030, I_ampacidad: 175 },
      '3/0': { R: 0.078, X: 0.028, I_ampacidad: 200 },
      '4/0': { R: 0.062, X: 0.026, I_ampacidad: 230 },
      '250': { R: 0.053, X: 0.025, I_ampacidad: 255 },
      '300': { R: 0.044, X: 0.024, I_ampacidad: 285 },
      '350': { R: 0.038, X: 0.023, I_ampacidad: 310 },
      '400': { R: 0.033, X: 0.022, I_ampacidad: 335 },
      '500': { R: 0.027, X: 0.020, I_ampacidad: 380 },
      '600': { R: 0.022, X: 0.019, I_ampacidad: 420 },
      '700': { R: 0.019, X: 0.018, I_ampacidad: 460 },
      '750': { R: 0.018, X: 0.017, I_ampacidad: 475 },
      '800': { R: 0.017, X: 0.017, I_ampacidad: 490 },
      '900': { R: 0.015, X: 0.016, I_ampacidad: 520 },
      '1000': { R: 0.014, X: 0.015, I_ampacidad: 545 },
      '1250': { R: 0.011, X: 0.014, I_ampacidad: 590 },
      '1500': { R: 0.009, X: 0.013, I_ampacidad: 625 },
      '1750': { R: 0.008, X: 0.012, I_ampacidad: 650 },
      '2000': { R: 0.007, X: 0.011, I_ampacidad: 665 }
    },
    acero: {
      '14': { R: 3.07, X: 0.095, I_ampacidad: 15 },
      '12': { R: 1.93, X: 0.089, I_ampacidad: 20 },
      '10': { R: 1.21, X: 0.084, I_ampacidad: 30 },
      '8': { R: 0.765, X: 0.077, I_ampacidad: 40 },
      '6': { R: 0.484, X: 0.071, I_ampacidad: 55 },
      '4': { R: 0.308, X: 0.066, I_ampacidad: 70 },
      '3': { R: 0.244, X: 0.063, I_ampacidad: 85 },
      '2': { R: 0.194, X: 0.060, I_ampacidad: 95 },
      '1': { R: 0.154, X: 0.056, I_ampacidad: 110 },
      '1/0': { R: 0.123, X: 0.053, I_ampacidad: 125 },
      '2/0': { R: 0.098, X: 0.050, I_ampacidad: 150 },
      '3/0': { R: 0.078, X: 0.047, I_ampacidad: 175 },
      '4/0': { R: 0.062, X: 0.044, I_ampacidad: 200 },
      '250': { R: 0.053, X: 0.042, I_ampacidad: 215 },
      '300': { R: 0.044, X: 0.040, I_ampacidad: 240 },
      '350': { R: 0.038, X: 0.038, I_ampacidad: 260 },
      '400': { R: 0.033, X: 0.036, I_ampacidad: 280 },
      '500': { R: 0.027, X: 0.033, I_ampacidad: 320 },
      '600': { R: 0.022, X: 0.031, I_ampacidad: 355 },
      '700': { R: 0.019, X: 0.029, I_ampacidad: 385 },
      '750': { R: 0.018, X: 0.028, I_ampacidad: 400 },
      '800': { R: 0.017, X: 0.027, I_ampacidad: 410 },
      '900': { R: 0.015, X: 0.026, I_ampacidad: 435 },
      '1000': { R: 0.014, X: 0.025, I_ampacidad: 455 },
      '1250': { R: 0.011, X: 0.023, I_ampacidad: 495 },
      '1500': { R: 0.009, X: 0.021, I_ampacidad: 525 },
      '1750': { R: 0.008, X: 0.020, I_ampacidad: 545 },
      '2000': { R: 0.007, X: 0.019, I_ampacidad: 560 }
    }
  },
  aluminio: {
    pvc: {
      '14': { R: 4.87, X: 0.058, I_ampacidad: 15 },
      '12': { R: 3.07, X: 0.054, I_ampacidad: 20 },
      '10': { R: 1.93, X: 0.051, I_ampacidad: 30 },
      '8': { R: 1.22, X: 0.047, I_ampacidad: 40 },
      '6': { R: 0.769, X: 0.043, I_ampacidad: 50 },
      '4': { R: 0.489, X: 0.040, I_ampacidad: 65 },
      '3': { R: 0.388, X: 0.038, I_ampacidad: 75 },
      '2': { R: 0.308, X: 0.036, I_ampacidad: 90 },
      '1': { R: 0.244, X: 0.034, I_ampacidad: 100 },
      '1/0': { R: 0.194, X: 0.032, I_ampacidad: 115 },
      '2/0': { R: 0.154, X: 0.030, I_ampacidad: 135 },
      '3/0': { R: 0.123, X: 0.028, I_ampacidad: 155 },
      '4/0': { R: 0.098, X: 0.026, I_ampacidad: 180 },
      '250': { R: 0.084, X: 0.025, I_ampacidad: 205 },
      '300': { R: 0.070, X: 0.024, I_ampacidad: 230 },
      '350': { R: 0.060, X: 0.023, I_ampacidad: 250 },
      '400': { R: 0.053, X: 0.022, I_ampacidad: 270 },
      '500': { R: 0.043, X: 0.020, I_ampacidad: 310 },
      '600': { R: 0.036, X: 0.019, I_ampacidad: 340 },
      '700': { R: 0.031, X: 0.018, I_ampacidad: 375 },
      '750': { R: 0.029, X: 0.017, I_ampacidad: 385 },
      '800': { R: 0.027, X: 0.017, I_ampacidad: 400 },
      '900': { R: 0.024, X: 0.016, I_ampacidad: 425 },
      '1000': { R: 0.022, X: 0.015, I_ampacidad: 445 },
      '1250': { R: 0.018, X: 0.014, I_ampacidad: 485 },
      '1500': { R: 0.015, X: 0.013, I_ampacidad: 515 },
      '1750': { R: 0.013, X: 0.012, I_ampacidad: 535 },
      '2000': { R: 0.011, X: 0.011, I_ampacidad: 550 }
    }
  }
};

// Export conductor catalog for frontend use
module.exports.CONDUCTORES = CONDUCTORES;

/**
 * Calculate conductor impedance
 * R and X are in ohms per 1000 ft (typical NEC tables)
 */
function calculateConductorImpedance(edge) {
  if (!edge || !edge.data) {
    throw new Error('Invalid edge: edge and edge.data are required');
  }
  
  const data = edge.data;
  
  // Normalize material names (handle language variations and case)
  const materialRaw = data.material || 'cobre';
  const materialMap = {
    'cu': 'cobre',
    'copper': 'cobre',
    'al': 'aluminio',
    'aluminum': 'aluminio'
  };
  const material = materialMap[materialRaw.toLowerCase()] || materialRaw.toLowerCase();
  
  // Normalize canalizacion names (handle case variations)
  const canalizacionRaw = data.canalizacion || 'pvc';
  const canalizacion = canalizacionRaw.toLowerCase();
  
  // Ensure calibre is always a string (contract: calibre is string type)
  const calibre = String(data.calibre || '4/0');
  const longitud = Number(data.longitud) || 10;
  const paralelo = Number(data.paralelo) || 1;

  // Validate input parameters
  if (longitud <= 0) {
    throw new Error('Conductor length must be greater than 0');
  }
  if (paralelo <= 0) {
    throw new Error('Number of parallel conductors must be greater than 0');
  }

  // Validate calibre exists in catalog
  if (!CONDUCTORES[material]) {
    throw new Error(`Invalid material: ${material}`);
  }
  if (!CONDUCTORES[material][canalizacion]) {
    throw new Error(`Invalid canalizacion: ${canalizacion}`);
  }
  if (!CONDUCTORES[material][canalizacion][calibre]) {
    throw new Error(`Invalid calibre: ${calibre} (not found in ${material}-${canalizacion} catalog)`);
  }

  const conductorData = CONDUCTORES[material][canalizacion][calibre];
  
  if (!conductorData) {
    throw new Error(`Invalid conductor configuration: ${material}-${canalizacion}-${calibre}`);
  }

  const n = Math.max(1, paralelo);
  const L_ft = longitud * 3.28084; // Convert meters to feet
  const L = L_ft / 1000; // Convert to per 1000 ft units

  const R = (conductorData.R * L) / n;
  const X = (conductorData.X * L) / n;
  const Z = Math.sqrt(R * R + X * X);
  const I_ampacidad = conductorData.I_ampacidad * n;

  return { R, X, Z, I_ampacidad };
}

/**
 * Calculate voltage drop with power factor
 * V_drop = √3 * I * (R*cosφ + X*sinφ) * L for 3-phase
 * V_drop = 2 * I * (R*cosφ + X*sinφ) * L for 1-phase
 */
function calculateVoltageDrop(I, R, X, V_ll, phases = 3, fp = 0.85) {
  const cos_phi = fp;
  const sin_phi = Math.sqrt(1 - cos_phi * cos_phi);
  
  const effective_impedance = R * cos_phi + X * sin_phi;
  
  if (phases === 3) {
    // 3-phase: V_drop = sqrt(3) * I * (R*cosφ + X*sinφ)
    return Math.sqrt(3) * I * effective_impedance;
  } else {
    // 1-phase: V_drop = 2 * I * (R*cosφ + X*sinφ)
    return 2 * I * effective_impedance;
  }
}

/**
 * Validate against NOM-001
 */
function validateNOM001(node, edge) {
  const warnings = [];
  const errors = [];
  const nodeResults = node.data?.results || {};

  // Validate breaker capacity (Isc vs Icu)
  if (node.type === 'breaker' && node.data?.parameters) {
    const Icu = node.data.parameters.Icu || 0;
    const Isc = nodeResults.isc || 0;
    const In = node.data.parameters.In || 0;
    
    // Minimum fault current validation (typically 0.5-0.8 of 3-phase fault)
    const Isc_min = Isc * 0.5; // Conservative estimate for LG fault
    const I_trip = In * 10; // Typical instantaneous trip at 10x In
    
    if (Isc > Icu) {
      errors.push(`Breaker insuficiente: Isc ${Isc.toFixed(0)}A > Icu ${Icu}A`);
      nodeResults.breakerStatus = 'FAIL';
    } else if (Isc > Icu * 0.8) {
      warnings.push(`Breaker marginal: Isc ${Isc.toFixed(0)}A cercano a Icu ${Icu}A`);
      nodeResults.breakerStatus = 'WARNING';
    } else if (Isc_min < I_trip) {
      warnings.push(`Falla mínima baja: Isc_min ${Isc_min.toFixed(0)}A < I_trip ${I_trip}A`);
      nodeResults.breakerStatus = 'WARNING';
    } else {
      nodeResults.breakerStatus = 'PASS';
    }
    
    // Store minimum fault current for display
    nodeResults.isc_min = Isc_min;
    nodeResults.isc_min_kA = Isc_min / 1000;
  }

  // Validate conductor ampacity
  if (edge && edge.data) {
    if (!edge.data.results) edge.data.results = {};
    const conductorZ = calculateConductorImpedance(edge);
    const I_carga = node.data?.parameters?.potencia_kW ? 
      (node.data.parameters.potencia_kW * 1000) / (Math.sqrt(3) * (node.data.parameters.voltaje || 480) * (node.data.parameters.fp || 0.85)) : 0;

    if (I_carga > conductorZ.I_ampacidad) {
      errors.push(`Conductor sobrecargado: ${I_carga.toFixed(0)}A > ${conductorZ.I_ampacidad}A`);
      edge.data.results.ampacityStatus = 'FAIL';
    } else if (I_carga > conductorZ.I_ampacidad * 0.8) {
      warnings.push(`Conductor marginal: ${I_carga.toFixed(0)}A cercano a ampacidad ${conductorZ.I_ampacidad}A`);
      edge.data.results.ampacityStatus = 'WARNING';
    } else {
      edge.data.results.ampacityStatus = 'PASS';
    }
  }

  // Validate voltage drop (NOM-001: max 5%)
  const voltageDrop_pct = nodeResults.voltageDrop_pct || 0;
  if (voltageDrop_pct > 5) {
    errors.push(`Caída de tensión excesiva: ${voltageDrop_pct.toFixed(2)}% > 5%`);
    nodeResults.voltageDropStatus = 'FAIL';
  } else if (voltageDrop_pct > 3) {
    warnings.push(`Caída de tensión alta: ${voltageDrop_pct.toFixed(2)}%`);
    nodeResults.voltageDropStatus = 'WARNING';
  } else {
    nodeResults.voltageDropStatus = 'PASS';
  }

  return { warnings, errors };
}

/**
 * Detect cycles in the network using DFS
 */
function hasCycle(nodes, edges) {
  // Validate inputs
  if (!nodes || !Array.isArray(nodes)) {
    nodes = [];
  }
  if (!edges || !Array.isArray(edges)) {
    edges = [];
  }

  const graph = new Map();
  const visited = new Set();
  const recursionStack = new Set();

  // Build adjacency list
  if (nodes && Array.isArray(nodes)) {
    nodes.forEach(node => {
      graph.set(node.id, []);
    });
  }
  
  if (edges && Array.isArray(edges)) {
    edges.forEach(edge => {
      if (graph.has(edge.source)) {
        graph.get(edge.source).push(edge.target);
      }
    });
  }

  function dfs(nodeId) {
    if (recursionStack.has(nodeId)) {
      return true; // Cycle detected
    }
    
    if (visited.has(nodeId)) {
      return false; // Already processed
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = graph.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (dfs(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  // Check each node
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Validate network topology
 */
function validateNetwork({ nodes, edges }) {
  const errors = [];
  const warnings = [];

  // Validate inputs
  if (!nodes || !Array.isArray(nodes)) {
    nodes = [];
  }
  if (!edges || !Array.isArray(edges)) {
    edges = [];
  }

  // Check for cycles
  if (hasCycle(nodes, edges)) {
    errors.push('La red contiene ciclos/loops que invalidan los cálculos');
  }

  // Check for multiple sources
  const sources = nodes.filter(n => n.type === 'transformer' || n.type === 'generator');
  if (sources.length === 0) {
    errors.push('No se encontró nodo fuente (transformer o generator)');
  } else if (sources.length > 1) {
    warnings.push('Múltiples nodos fuente detectados - se usará el primero');
  }

  // Check for disconnected nodes
  const connectedNodes = new Set();
  edges.forEach(edge => {
    connectedNodes.add(edge.source);
    connectedNodes.add(edge.target);
  });
  
  const disconnectedNodes = nodes.filter(n => !connectedNodes.has(n.id));
  if (disconnectedNodes.length > 0) {
    warnings.push(`Nodos desconectados: ${disconnectedNodes.map(n => n.id).join(', ')}`);
  }

  // Check for parallel paths
  const nodeConnections = new Map();
  edges.forEach(edge => {
    if (!nodeConnections.has(edge.target)) {
      nodeConnections.set(edge.target, []);
    }
    nodeConnections.get(edge.target).push(edge.source);
  });

  const parallelNodes = [];
  nodeConnections.forEach((sources, target) => {
    if (sources.length > 1) {
      parallelNodes.push(target);
    }
  });

  if (parallelNodes.length > 0) {
    warnings.push(`Nodos con caminos paralelos (no soportados en cálculo radial): ${parallelNodes.join(', ')}`);
  }
}


/**
 * Build graph from edges for branch detection
 */
function buildGraph(edges) {
  if (!edges || !Array.isArray(edges)) {
    edges = [];
  }

  const graph = {};
  edges.forEach(e => {
    if (!graph[e.source]) graph[e.source] = [];
    graph[e.source].push(e.target);
  });
  return graph;
}

/**
 * Get branches from a node using DFS (with loop detection)
 */
function getBranchesFromNode(startNodeId, graph, visited = new Set()) {
  const branches = [];

  function dfs(current, path) {
    if (visited.has(current)) {
      return; // Skip if already visited (prevent loops)
    }
    
    visited.add(current);
    const newPath = [...path, current];

    if (!graph[current] || graph[current].length === 0) {
      // Leaf node → end of branch
      branches.push(newPath);
      return;
    }

    if (graph[current] && Array.isArray(graph[current])) {
      graph[current].forEach(next => {
        dfs(next, newPath, new Set(visited));
      });
    }
  }

  dfs(startNodeId, []);
  return branches;
}

/**
 * Get all panels from nodes
 */
function getPanels(nodes) {
  if (!nodes || !Array.isArray(nodes)) {
    return [];
  }
  return nodes.filter(n => n.type === 'panel');
}

/**
 * Validate branch follows electrical rules
 */
function isValidBranch(path, nodesMap) {
  for (let i = 0; i < path.length - 1; i++) {
    const current = nodesMap[path[i]];
    const next = nodesMap[path[i + 1]];

    // Panel to panel is valid (subpanels, MCC to derived panel)
    // Only block truly invalid connections like load → transformer
    if (current.type === 'load' && next.type === 'transformer') {
      return false;
    }
    if (current.type === 'load' && next.type === 'generator') {
      return false;
    }
  }
  return true;
}

/**
 * Get all branches from all panels
 */
function getAllBranches(nodes, edges) {
  if (!nodes || !Array.isArray(nodes)) {
    nodes = [];
  }
  if (!edges || !Array.isArray(edges)) {
    edges = [];
  }

  const graph = buildGraph(edges);
  const panels = getPanels(nodes);
  const nodesMap = {};
  nodes.forEach(n => nodesMap[n.id] = n);

  const result = {};

  if (panels && Array.isArray(panels)) {
    panels.forEach(panel => {
      const branches = getBranchesFromNode(panel.id, graph);
      // Filter valid branches
      result[panel.id] = branches.filter(branch => isValidBranch(branch, nodesMap));
    });
  }

  return result;
}

/**
 * Get direct branches (immediate connections) from a panel
 */
function getDirectBranches(panelId, edges) {
  return edges
    .filter(e => e.source === panelId)
    .map(e => e.target);
}

/**
 * Build network representation from React Flow data with ATS support
 */
function buildNetwork({ nodes, edges }) {
  // Validate inputs
  if (!nodes || !Array.isArray(nodes)) {
    nodes = [];
  }
  if (!edges || !Array.isArray(edges)) {
    edges = [];
  }

  // Validate topology first
  const validation = validateNetwork({ nodes, edges });
  if (validation.errors.length > 0) {
    throw new Error(`Error de topología: ${validation.errors.join(', ')}`);
  }

  const network = {
    nodes: {},
    edges: [],
    sourceNode: null,
    warnings: validation.warnings,
    atsNodes: [], // Track ATS nodes for mode switching
    systemMode: 'normal' // Default system mode
  };

  // Find ATS nodes and determine system mode
  const atsNodes = nodes.filter(n => n.type === 'ats');
  network.atsNodes = atsNodes;
  
  if (atsNodes.length > 0) {
    // Use the mode from the first ATS node
    network.systemMode = atsNodes[0].data?.parameters?.mode || 'normal';
    network.warnings.push(`Sistema en modo: ${network.systemMode.toUpperCase()}`);
  }

  // Find source node based on system mode
  let sourceNode;
  if (network.systemMode === 'normal') {
    // Use transformer as source
    sourceNode = nodes.find(n => n.type === 'transformer');
  } else {
    // Use generator as source
    sourceNode = nodes.find(n => n.type === 'generator');
  }
  
  if (!sourceNode) {
    const sourceType = network.systemMode === 'normal' ? 'transformer' : 'generator';
    throw new Error(`No se encontró nodo fuente (${sourceType}) para modo ${network.systemMode}`);
  }
  network.sourceNode = sourceNode.id;

  // Build node map
  nodes.forEach(node => {
    network.nodes[node.id] = {
      id: node.id,
      type: node.type,
      data: node.data,
      impedance: { R: 0, X: 0, Z: 0 },
      isc: 0,
      voltageDrop: 0,
      upstreamSources: [] // Track upstream sources for parallel paths
    };
  });

  // Build edge list (filter based on ATS mode)
  if (!edges || !Array.isArray(edges)) {
    edges = [];
  }
  
  edges.forEach(edge => {
    // Check if this edge should be active based on ATS mode
    let isActive = true;
    
    if (atsNodes.length > 0) {
      // Check if edge connects to ATS
      const atsNode = atsNodes.find(ats => 
        edge.source === ats.id || edge.target === ats.id
      );
      
      if (atsNode) {
        const sourceType = nodes.find(n => n.id === edge.source)?.type;
        const targetType = nodes.find(n => n.id === edge.target)?.type;
        
        if (network.systemMode === 'normal') {
          // In normal mode: only transformer connections are active
          isActive = (sourceType === 'transformer' || targetType === 'transformer');
        } else {
          // In emergency mode: only generator connections are active
          isActive = (sourceType === 'generator' || targetType === 'generator');
        }
      }
    }
    
    if (isActive) {
      network.edges.push({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        data: edge.data,
        voltageDrop: 0
      });
    }
  });

  return network;
}

/**
 * Main simulation function
 * Takes React Flow nodes and edges, performs electrical calculations
 */
function simulateSystem({ nodes, edges }) {
  const network = buildNetwork({ nodes, edges });
  const results = {
    nodes: [],
    edges: [],
    warnings: [],
    errors: [],
    summary: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      maxIsc: 0,
      maxVoltageDrop: 0
    }
  };

  // Find source node (transformer or generator)
  const sourceNode = nodes.find(n => n.type === 'transformer' || n.type === 'generator');
  
  if (!sourceNode) {
    results.errors.push('No se encontró nodo fuente (transformador o generador)');
    return results;
  }

  // Process network
  results.warnings.push(...network.warnings);
  
  // Use the source node determined by buildNetwork (based on ATS mode)
  const sourceParams = network.nodes[network.sourceNode]?.data?.parameters || {};
  const sourceType = network.nodes[network.sourceNode]?.type;
  
  let V_ll, kVA, Z_pct, Xd;
  
  if (sourceType === 'transformer') {
    V_ll = sourceParams.secundario || 480;
    kVA = sourceParams.kVA || 500;
    Z_pct = sourceParams.Z || 5.75;
  } else if (sourceType === 'generator') {
    V_ll = sourceParams.voltaje || 480;
    kVA = sourceParams.kVA || 100;
    Xd = sourceParams.Xd || 0.15;
  } else {
    results.errors.push('Tipo de fuente no soportado');
    return results;
  }
  
  // Calculate source short circuit current
  let I_sc_source;
  if (sourceType === 'transformer') {
    const I_fl = (kVA * 1000) / (Math.sqrt(3) * V_ll);
    I_sc_source = I_fl / (Z_pct / 100);
  } else {
    // Generator: I_sc = I_fl / Xd
    const I_fl = (kVA * 1000) / (Math.sqrt(3) * V_ll);
    I_sc_source = I_fl / Xd;
  }
  
  const scResult = calculateShortCircuit({
    V_ll: V_ll,
    mode: 'conocido',
    isc_known: I_sc_source, // Use calculated source Isc
    xr_source: sourceType === 'transformer' ? 5 : 8, // X/R varies by source type
    trafo_kva: kVA,
    trafo_z: Z_pct,
    trafo_vp: sourceParams.primario || 13800,
    trafo_vs: V_ll
  });

  network.nodes[sourceNode.id].isc = scResult.I_3F_A;
  results.summary.maxIsc = scResult.I_3F_A;

  // Set transformer impedance as initial impedance
  const Z_trafo = (Z_pct / 100) * (V_ll * V_ll) / (kVA * 1000);
  const xr_trafo = kVA <= 500 ? 5 : kVA <= 1500 ? 7 : 10;
  const R_trafo = Z_trafo / Math.sqrt(1 + xr_trafo * xr_trafo);
  const X_trafo = R_trafo * xr_trafo;
  
  network.nodes[sourceNode.id].impedance = { R: R_trafo, X: X_trafo, Z: Z_trafo };

  // Validate source node (transformer/generator)
  if (sourceNode.type === 'transformer' || sourceNode.type === 'generator') {
    if (!sourceNode.data) sourceNode.data = {};
    if (!sourceNode.data.results) sourceNode.data.results = {};
    sourceNode.data.results.breakerStatus = 'PASS'; // Source always passes
  }

  // Propagate calculations through network
  network.edges.forEach(edge => {
    const source = network.nodes[edge.source];
    const target = network.nodes[edge.target];
    const conductorZ = calculateConductorImpedance(edge);

    // Calculate Isc at target (simplified - should use proper network analysis)
    const R_total = source.impedance.R + conductorZ.R;
    const X_total = source.impedance.X + conductorZ.X;
    
    // Prevent division by zero
    if (R_total === 0 && X_total === 0) {
      throw new Error('Total impedance cannot be zero');
    }
    
    const Z_total = Math.sqrt(R_total * R_total + X_total * X_total);
    
    const V_phase = V_ll / Math.sqrt(3);
    const I_sc_target = V_phase / Z_total;
    
    target.impedance.R = source.impedance.R + conductorZ.R;
    target.impedance.X = source.impedance.X + conductorZ.X;
    target.impedance.Z = Z_total;
    target.isc = I_sc_target;

    // Calculate voltage drop
    const I_carga = target.data?.parameters?.potencia_kW ? 
      (target.data.parameters.potencia_kW * 1000) / (Math.sqrt(3) * (target.data.parameters.voltaje || 480) * (target.data.parameters.fp || 0.85)) : 0;
    const fp = target.data?.parameters?.fp || 0.85;
    
    const vDrop = calculateVoltageDrop(I_carga, conductorZ.R, conductorZ.X, sourceParams.secundario || 480, 3, fp);
    edge.voltageDrop = vDrop;
    target.voltageDrop = source.voltageDrop + vDrop;

    // Update max voltage drop
    if (vDrop > results.summary.maxVoltageDrop) {
      results.summary.maxVoltageDrop = vDrop;
    }

    // Initialize target.data.results if not exists
    if (!target.data) target.data = {};
    if (!target.data.results) target.data.results = {};
    target.data.results.isc = I_sc_target;
    target.data.results.voltageDrop = target.voltageDrop;
    target.data.results.voltageDrop_pct = (target.voltageDrop / (sourceParams.secundario || 480)) * 100;

    // Validate NOM-001
    const validation = validateNOM001(target, edge);
    results.warnings.push(...validation.warnings);
    results.errors.push(...validation.errors);
  });

  // Format results for frontend
  results.nodes = Object.values(network.nodes).map(node => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: {
      ...node.data,
      results: {
        isc: node.isc,
        isc_kA: node.isc / 1000,
        isc_min: node.data?.results?.isc_min,
        isc_min_kA: node.data?.results?.isc_min_kA,
        impedance: node.impedance,
        voltageDrop: node.voltageDrop,
        voltageDrop_pct: (node.voltageDrop / (sourceParams.secundario || 480)) * 100,
        breakerStatus: node.data?.results?.breakerStatus,
        voltageDropStatus: node.data?.results?.voltageDropStatus
      }
    }
  }));

  // Add branch detection results
  results.branches = getAllBranches(nodes, edges);
  results.panels = getPanels(nodes);
  results.systemMode = network.systemMode || 'normal';
  results.atsNodes = network.atsNodes || [];

  results.edges = network.edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    data: {
      ...edge.data,
      results: {
        impedance: edge.impedance,
        voltageDrop: edge.voltageDrop,
        voltageDrop_pct: (edge.voltageDrop / (sourceParams.secundario || 480)) * 100,
        ampacity: edge.impedance.I_ampacidad,
        ampacityStatus: edge.data?.results?.ampacityStatus
      }
    }
  }));

  // Map results for frontend compatibility
  const resultsByNodeId = {};
  const resultsByEdgeId = {};
  
  // Map node results
  results.nodes.forEach(node => {
    resultsByNodeId[node.id] = {
      icc: node.data.results.isc_kA,
      I_diseño: node.data.results.isc_kA * 0.8, // 80% of ICC for design
      breaker: node.data.results.breakerStatus || 'PASS',
      estado: node.data.results.breakerStatus === 'PASS' ? 'OK' : 'FAIL'
    };
  });
  
  // Map edge results  
  results.edges.forEach(edge => {
    resultsByEdgeId[edge.id] = {
      cable: `${edge.data.calibre || '350'} AWG ${edge.data.material || 'CU'}`,
      I_corr: edge.data.results.ampacity || 0,
      caida: edge.data.results.voltageDrop_pct || 0,
      estado: edge.data.results.ampacityStatus === 'PASS' ? 'OK' : 'FAIL'
    };
  });
  
  // Auto-corrections
  const cambios = [];
  results.edges.forEach(edge => {
    if (edge.data.results.ampacityStatus === 'FAIL') {
      // Suggest larger cable
      const currentCalibre = edge.data.calibre || '350';
      const suggestedCalibre = suggestLargerCable(currentCalibre);
      
      if (suggestedCalibre !== currentCalibre) {
        cambios.push({
          edgeId: edge.id,
          calibre: suggestedCalibre,
          paralelo: edge.data.paralelo || 1,
          reason: 'Ampacidad insuficiente'
        });
      }
    }
  });
  
  // Validation summary
  const validacion = {
    errors: results.errors,
    warnings: results.warnings,
    summary: {
      totalNodes: results.summary.totalNodes,
      totalEdges: results.summary.totalEdges,
      maxIsc: results.summary.maxIsc / 1000,
      maxVoltageDrop: results.summary.maxVoltageDrop
    }
  };

  return {
    resultsByNodeId,
    resultsByEdgeId,
    cambios,
    validacion,
    summary: results.summary
  };
}

// Helper function to suggest larger cable
function suggestLargerCable(currentCalibre) {
  const cableSizes = ['12', '10', '8', '6', '4', '2', '1/0', '2/0', '3/0', '4/0', '350'];
  const currentIndex = cableSizes.indexOf(currentCalibre);
  
  if (currentIndex === -1 || currentIndex === cableSizes.length - 1) {
    return currentCalibre;
  }
  
  return cableSizes[currentIndex + 1];
}

module.exports = {
  simulateSystem,
  calculateConductorImpedance,
  calculateVoltageDrop,
  validateNOM001,
  buildNetwork,
  buildGraph,
  getBranchesFromNode,
  getPanels,
  getAllBranches,
  getDirectBranches,
  isValidBranch,
  CONDUCTORES
};
