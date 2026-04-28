/**
 * Automatic layout algorithm for electrical systems
 * Arranges nodes in a hierarchical, unifilar-style layout
 */

/**
 * Calculate automatic layout for nodes and edges
 * @param {Array} nodes - Array of node objects
 * @param {Array} edges - Array of edge objects
 * @returns {Object} New nodes with updated positions
 */
export function calculateAutoLayout(nodes, edges) {
  if (nodes.length === 0) {
    return nodes;
  }

  // Build adjacency list and calculate levels
  const adjacency = {};
  const inDegree = {};
  const levels = {};

  nodes.forEach(node => {
    adjacency[node.id] = [];
    inDegree[node.id] = 0;
    levels[node.id] = 0;
  });

  edges.forEach(edge => {
    if (adjacency[edge.source]) {
      adjacency[edge.source].push(edge.target);
    }
    inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
  });

  // Calculate levels using BFS
  const queue = nodes.filter(n => inDegree[n.id] === 0);
  const visited = new Set();

  while (queue.length > 0) {
    const node = queue.shift();
    visited.add(node.id);

    const neighbors = adjacency[node.id] || [];
    neighbors.forEach(neighborId => {
      if (!visited.has(neighborId)) {
        levels[neighborId] = Math.max(levels[neighborId], levels[node.id] + 1);
        inDegree[neighborId]--;
        if (inDegree[neighborId] === 0) {
          queue.push(nodes.find(n => n.id === neighborId));
        }
      }
    });
  }

  // Group nodes by level
  const nodesByLevel = {};
  nodes.forEach(node => {
    const level = levels[node.id] || 0;
    if (!nodesByLevel[level]) {
      nodesByLevel[level] = [];
    }
    nodesByLevel[level].push(node);
  });

  // Calculate positions
  const LEVEL_HEIGHT = 150;
  const NODE_WIDTH = 120;
  const NODE_GAP = 40;
  const START_X = 100;
  const START_Y = 50;

  const newNodes = nodes.map(node => {
    const level = levels[node.id] || 0;
    const levelNodes = nodesByLevel[level];
    const indexInLevel = levelNodes.findIndex(n => n.id === node.id);

    const x = START_X + indexInLevel * (NODE_WIDTH + NODE_GAP);
    const y = START_Y + level * LEVEL_HEIGHT;

    return {
      ...node,
      position: { x, y }
    };
  });

  return newNodes;
}

/**
 * Apply auto layout to existing nodes
 * @param {Function} setNodes - Function to update nodes
 * @param {Array} nodes - Current nodes
 * @param {Array} edges - Current edges
 */
export function applyAutoLayout(setNodes, nodes, edges) {
  const newNodes = calculateAutoLayout(nodes, edges);
  setNodes(newNodes);
}
