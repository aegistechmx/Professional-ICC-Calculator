/**
 * System validation utilities for electrical editor
 */

/**
 * Electrical connection rules - defines valid connections between component types
 */
const CONNECTION_RULES = {
  transformer: ['breaker', 'panel'],
  breaker: ['panel', 'load', 'motor'],
  panel: ['breaker', 'load', 'motor'],
  load: [],
  motor: []
};

/**
 * Validate if a connection between two node types is electrically valid
 * @param {string} sourceType - Type of source node
 * @param {string} targetType - Type of target node
 * @returns {boolean} True if connection is valid
 */
export function validateConnection(sourceType, targetType) {
  const validTargets = CONNECTION_RULES[sourceType] || [];
  return validTargets.includes(targetType);
}

/**
 * Check if all nodes are connected (no isolated nodes)
 * @param {Array} nodes - Array of node objects
 * @param {Array} edges - Array of edge objects
 * @returns {Object} Validation result with isValid and errors
 */
export function validateConnectivity(nodes, edges) {
  if (nodes.length === 0) {
    return { isValid: true, errors: [] };
  }

  const nodeIds = new Set(nodes.map(n => n.id));
  const connectedNodeIds = new Set();

  // Add all nodes that have at least one connection
  edges.forEach(edge => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });

  // Find isolated nodes
  const isolatedNodes = nodes.filter(n => !connectedNodeIds.has(n.id));

  if (isolatedNodes.length > 0) {
    return {
      isValid: false,
      errors: [
        `Nodos aislados encontrados: ${isolatedNodes.map(n => n.data.label).join(', ')}`
      ]
    };
  }

  return { isValid: true, errors: [] };
}

/**
 * Check for invalid loops (circular connections that don't make sense electrically)
 * @param {Array} nodes - Array of node objects
 * @param {Array} edges - Array of edge objects
 * @returns {Object} Validation result with isValid and errors
 */
export function validateLoops(nodes, edges) {
  if (nodes.length === 0 || edges.length === 0) {
    return { isValid: true, errors: [] };
  }

  // Build adjacency list
  const adjacency = {};
  nodes.forEach(node => {
    adjacency[node.id] = [];
  });

  edges.forEach(edge => {
    if (adjacency[edge.source]) {
      adjacency[edge.source].push(edge.target);
    }
  });

  // Detect cycles using DFS
  const visited = new Set();
  const recursionStack = new Set();
  const cycles = [];

  function detectCycle(nodeId, path = []) {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adjacency[nodeId] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        const cyclePath = [...path, nodeId];
        if (detectCycle(neighbor, cyclePath)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle
        const cycleStart = path.indexOf(neighbor);
        const cycle = [...path.slice(cycleStart), nodeId, neighbor];
        cycles.push(cycle);
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      detectCycle(node.id);
    }
  });

  if (cycles.length > 0) {
    return {
      isValid: false,
      errors: [
        `Ciclos detectados en el sistema. Los sistemas eléctricos no deben tener ciclos cerrados.`
      ]
    };
  }

  return { isValid: true, errors: [] };
}

/**
 * Validate proper hierarchy (transformer should be source, loads should be sinks)
 * @param {Array} nodes - Array of node objects
 * @param {Array} edges - Array of edge objects
 * @returns {Object} Validation result with isValid and errors
 */
export function validateHierarchy(nodes, edges) {
  if (nodes.length === 0) {
    return { isValid: true, errors: [] };
  }

  const errors = [];

  // Count connections per node
  const inDegree = {};
  const outDegree = {};

  nodes.forEach(node => {
    inDegree[node.id] = 0;
    outDegree[node.id] = 0;
  });

  edges.forEach(edge => {
    outDegree[edge.source] = (outDegree[edge.source] || 0) + 1;
    inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
  });

  // Check transformers (should have outDegree > 0, ideally inDegree = 0)
  const transformers = nodes.filter(n => n.type === 'transformer');
  transformers.forEach(t => {
    if (outDegree[t.id] === 0) {
      errors.push(`Transformador "${t.data.label}" no tiene conexiones de salida.`);
    }
  });

  // Check loads (should have inDegree > 0, outDegree = 0)
  const loads = nodes.filter(n => n.type === 'load' || n.type === 'motor');
  loads.forEach(l => {
    if (inDegree[l.id] === 0) {
      errors.push(`Carga "${l.data.label}" no está conectada a ninguna fuente.`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Run all validations
 * @param {Array} nodes - Array of node objects
 * @param {Array} edges - Array of edge objects
 * @returns {Object} Complete validation result
 */
export function validateSystem(nodes, edges) {
  const connectivity = validateConnectivity(nodes, edges);
  const loops = validateLoops(nodes, edges);
  const hierarchy = validateHierarchy(nodes, edges);

  const allErrors = [
    ...connectivity.errors,
    ...loops.errors,
    ...hierarchy.errors
  ];

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    details: {
      connectivity: connectivity.isValid,
      loops: loops.isValid,
      hierarchy: hierarchy.isValid
    }
  };
}
