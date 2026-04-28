/**
 * Ybus (Admittance Matrix) construction for load flow
 * Builds the bus admittance matrix from line data
 */

/**
 * Construct Ybus matrix from line data
 * @param {Array} lineas - Array of line objects {from, to, R, X, B=0}
 * @param {number} n - Number of buses
 * @returns {Array} Ybus matrix (n x n) with complex numbers {re, im}
 */
function construirYbus(lineas, n) {
  // Initialize Ybus with zeros
  const Y = Array(n).fill(0).map(() =>
    Array(n).fill(0).map(() => ({ re: 0, im: 0 }))
  );

  // Add line admittances
  lineas.forEach(l => {
    const { from, to, R, X, B = 0 } = l;

    // Convert impedance to admittance
    const Z2 = R * R + X * X;
    const Yline = {
      re: R / Z2,
      im: -X / Z2
    };

    // Add series admittance
    Y[from][to].re += Yline.re;
    Y[from][to].im += Yline.im;
    Y[to][from].re += Yline.re;
    Y[to][from].im += Yline.im;

    // Add to diagonal (self-admittance)
    Y[from][from].re += Yline.re;
    Y[from][from].im += Yline.im;
    Y[to][to].re += Yline.re;
    Y[to][to].im += Yline.im;

    // Add shunt susceptance (line charging)
    if (B !== 0) {
      Y[from][from].im += B / 2;
      Y[to][to].im += B / 2;
    }
  });

  return Y;
}

/**
 * Add shunt admittance to a specific bus
 * @param {Array} Y - Ybus matrix
 * @param {number} bus - Bus index
 * @param {number} G - Conductance
 * @param {number} B - Susceptance
 */
function agregarShunt(Y, bus, G, B) {
  Y[bus][bus].re += G;
  Y[bus][bus].im += B;
}

/**
 * Get admittance between two buses
 * @param {Array} Y - Ybus matrix
 * @param {number} i - Bus i
 * @param {number} j - Bus j
 * @returns {Object} Admittance {re, im}
 */
function obtenerAdmitancia(Y, i, j) {
  return Y[i][j];
}

/**
 * Get self-admittance of a bus
 * @param {Array} Y - Ybus matrix
 * @param {number} i - Bus index
 * @returns {Object} Self-admittance {re, im}
 */
function obtenerAutoAdmitancia(Y, i) {
  return Y[i][i];
}

/**
 * Convert Ybus from ReactFlow nodes/edges
 * @param {Array} nodes - ReactFlow nodes
 * @param {Array} edges - ReactFlow edges
 * @returns {Object} {Y, busMap} Ybus matrix and bus index mapping
 */
function construirYbusDesdeEditor(nodes, edges) {
  // Create bus index mapping
  const busMap = {};
  nodes.forEach((node, index) => {
    busMap[node.id] = index;
  });

  // Convert edges to lines
  const lineas = edges.map(edge => {
    const from = busMap[edge.source];
    const to = busMap[edge.target];

    // Get line parameters from nodes (simplified)
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);

    // Default line parameters (could be enhanced with actual data)
    const R = 0.01; // per unit
    const X = 0.03; // per unit
    const B = 0.0; // line charging

    return { from, to, R, X, B };
  });

  const Y = construirYbus(lineas, nodes.length);

  return { Y, busMap };
}

module.exports = {
  construirYbus,
  agregarShunt,
  obtenerAdmitancia,
  obtenerAutoAdmitancia,
  construirYbusDesdeEditor
};
