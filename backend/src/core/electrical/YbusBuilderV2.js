/**
 * YbusBuilderV2 - Improved Ybus matrix builder with Complex numbers
 * Following industrial standards with proper tap handling
 */

const { Complex, j } = require('./Complex');

/**
 * Build electrical graph from ReactFlow nodes and edges
 * @param {Array} nodes - ReactFlow nodes
 * @param {Array} edges - ReactFlow edges
 * @returns {Object} { buses: Bus[], branches: Branch[] }
 */
function buildElectricalGraph(nodes, edges) {
  const buses = [];
  const branches = [];
  
  // Convert nodes to buses
  nodes.forEach(node => {
    const params = node.data.parameters || {};
    
    const bus = {
      id: node.id,
      type: determineBusType(node.type),
      V: 1.0, // Initial voltage magnitude (pu)
      theta: 0, // Initial voltage angle (rad)
      P: 0, // Active power injection (pu)
      Q: 0, // Reactive power injection (pu)
      baseKV: params.voltaje || 13.8
    };
    
    // Set load/generation based on node type
    if (node.type === 'load') {
      const kW = params.potencia_kW || 50;
      const fp = params.fp || 0.85;
      const baseMVA = 100;
      bus.P = -(kW / 1000) / baseMVA; // Load is negative injection
      bus.Q = -(kW / 1000) / baseMVA * Math.tan(Math.acos(fp));
      bus.type = 'PQ';
    }
    
    if (node.type === 'transformer') {
      bus.type = 'SLACK'; // Source bus
      bus.V = 1.0;
      bus.theta = 0;
    }
    
    buses.push(bus);
  });
  
  // Convert edges to branches
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) return;
    
    const branch = {
      from: edge.source,
      to: edge.target,
      R: 0.01, // Default resistance (pu)
      X: 0.1, // Default reactance (pu)
      B: 0, // Line charging (pu)
      tap: 1 // Default tap ratio
    };
    
    // Check if this is a transformer connection
    if (sourceNode.type === 'transformer' || targetNode.type === 'transformer') {
      const transformerNode = sourceNode.type === 'transformer' ? sourceNode : targetNode;
      const params = transformerNode.data.parameters || {};
      
      branch.R = (params.Z || 5.75) / 100; // Convert % to pu
      branch.X = 0.0565; // Typical transformer reactance
      branch.tap = (params.primario || 13800) / (params.secundario || 480) / (13.8 / 0.48);
    }
    
    branches.push(branch);
  });
  
  return { buses, branches };
}

/**
 * Determine bus type from node type
 */
function determineBusType(nodeType) {
  switch (nodeType) {
  case 'transformer':
    return 'SLACK';
  case 'breaker':
  case 'panel':
    return 'PV';
  case 'load':
  case 'motor':
    return 'PQ';
  default:
    return 'PQ';
  }
}

/**
 * Build Ybus matrix from buses and branches using Complex numbers
 * @param {Array} buses - Array of Bus objects
 * @param {Array} branches - Array of Branch objects
 * @returns {Object} { Y: Complex[][], index: Map<string, number> }
 */
function buildYbus(buses, branches) {
  const n = buses.length;
  const index = new Map();
  
  // Create bus index map
  buses.forEach((bus, i) => {
    index.set(bus.id, i);
  });
  
  // Initialize Ybus matrix with complex zeros
  const Y = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => new Complex(0, 0))
  );
  
  // Add branch admittances
  for (const br of branches) {
    const i = index.get(br.from);
    const k = index.get(br.to);
    
    if (i === undefined || k === undefined) continue;
    
    // Series impedance
    const z = new Complex(br.R, br.X);
    const y = new Complex(1, 0).div(z); // 1/Z
    
    // Line charging (shunt susceptance)
    const bsh = new Complex(0, br.B || 0);
    
    // Tap ratio (for transformers)
    const tap = br.tap || 1;
    
    // Off-diagonal elements (mutual admittance)
    const yik = y.div(new Complex(tap, 0));
    Y[i][k] = Y[i][k].sub(yik);
    Y[k][i] = Y[k][i].sub(yik);
    
    // Diagonal elements (self-admittance)
    Y[i][i] = Y[i][i].add(y.div(new Complex(tap * tap, 0))).add(bsh);
    Y[k][k] = Y[k][k].add(y).add(bsh);
  }
  
  return { Y, index };
}

/**
 * Build sequence admittance matrices for symmetrical components
 * @param {Array} buses - Array of Bus objects
 * @param {Array} branches - Array of Branch objects
 * @returns {Object} { Y0, Y1, Y2 } - Zero, positive, negative sequence
 */
function buildSequenceYbus(buses, branches) {
  // Positive sequence (same as Ybus for balanced systems)
  const Y1 = buildYbus(buses, branches);
  
  // Zero sequence (different due to transformer grounding)
  const Y0 = buildZeroSequenceYbus(buses, branches);
  
  // Negative sequence (same as positive for static components)
  const Y2 = { ...Y1 };
  
  return { Y0, Y1, Y2 };
}

/**
 * Build zero sequence admittance matrix
 * Zero sequence depends on transformer connections and grounding
 */
function buildZeroSequenceYbus(buses, branches) {
  const n = buses.length;
  const index = new Map();
  
  buses.forEach((bus, i) => {
    index.set(bus.id, i);
  });
  
  const Y0 = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => new Complex(0, 0))
  );
  
  // Zero sequence impedances (typically 3x positive for lines)
  for (const br of branches) {
    const i = index.get(br.from);
    const k = index.get(br.to);
    
    if (i === undefined || k === undefined) continue;
    
    // Zero sequence impedance
    const z0 = new Complex(br.R * 3, br.X * 3);
    const y0 = new Complex(1, 0).div(z0);
    
    // Check if zero sequence can flow (depends on grounding)
    const hasGrounding = true; // Simplified - should check transformer grounding
    
    if (hasGrounding) {
      const tap = br.tap || 1;
      const yik = y0.div(new Complex(tap, 0));
      
      Y0[i][k] = Y0[i][k].sub(yik);
      Y0[k][i] = Y0[k][i].sub(yik);
      
      Y0[i][i] = Y0[i][i].add(y0.div(new Complex(tap * tap, 0)));
      Y0[k][k] = Y0[k][k].add(y0);
    }
  }
  
  return { Y: Y0, index };
}

/**
 * Convert Ybus to G and B matrices (real and imaginary parts)
 * @param {Complex[][]} Y - Complex Ybus matrix
 * @returns {Object} { G: number[][], B: number[][] }
 */
function separateYbus(Y) {
  const n = Y.length;
  const G = Array.from({ length: n }, () => Array(n).fill(0));
  const B = Array.from({ length: n }, () => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      G[i][j] = Y[i][j].re;
      B[i][j] = Y[i][j].im;
    }
  }
  
  return { G, B };
}

/**
 * Calculate power flow from voltages and Ybus
 * @param {number[]} V - Voltage magnitudes (pu)
 * @param {number[]} theta - Voltage angles (rad)
 * @param {Complex[][]} Y - Ybus matrix
 * @returns {Object} { P: number[], Q: number[] }
 */
function calculatePowerFlow(V, theta, Y) {
  const n = V.length;
  const P = Array(n).fill(0);
  const Q = Array(n).fill(0);
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const G = Y[i][j].re;
      const B = Y[i][j].im;
      const angle = theta[i] - theta[j];
      
      P[i] += V[i] * V[j] * (G * Math.cos(angle) + B * Math.sin(angle));
      Q[i] += V[i] * V[j] * (G * Math.sin(angle) - B * Math.cos(angle));
    }
  }
  
  return { P, Q };
}

module.exports = {
  buildElectricalGraph,
  buildYbus,
  buildSequenceYbus,
  buildZeroSequenceYbus,
  separateYbus,
  calculatePowerFlow
};
