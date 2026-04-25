/**
 * Newton-Raphson load flow solver
 * Implements the full Newton-Raphson iteration for power flow analysis
 */

const { calcularPQ, calcularMismatch, calcularPerdidas } = require('./pq');
const { construirJacobiano } = require('./jacobiano');
const { resolverSistema } = require('../../utils/solver');

/**
 * Newton-Raphson load flow solver
 * @param {Object} params - Solver parameters
 * @param {Array} params.buses - Array of Bus objects
 * @param {Array} params.Y - Ybus matrix
 * @param {number} [params.maxIter=20] - Maximum iterations
 * @param {number} [params.tol=1e-6] - Convergence tolerance
 * @param {boolean} [params.verbose=false] - Print iteration info
 * @returns {Object} Solution results
 */
function loadFlowNR({ buses, Y, maxIter = 20, tol = 1e-6, verbose = false }) {
  let iter = 0;
  let converged = false;
  const history = [];

  while (iter < maxIter) {
    // Calculate P and Q at current voltages
    const { P, Q } = calcularPQ(buses, Y);

    // Calculate power mismatch
    const { mismatchP, mismatchQ, mismatch } = calcularMismatch(buses, P, Q);

    // Calculate error (max absolute mismatch)
    const error = Math.max(...mismatch.map(Math.abs));

    if (verbose) {
      console.log(`Iteration ${iter + 1}: Error = ${error.toExponential(4)}`);
    }

    // Check convergence
    if (error < tol) {
      converged = true;
      break;
    }

    // Build Jacobian matrix
    const J = construirJacobiano(buses, Y);

    // Solve J * dx = mismatch
    const dx = resolverSistema(J, mismatch);

    // Update bus voltages and angles
    let k = 0;
    for (let i = 0; i < buses.length; i++) {
      const bus = buses[i];

      if (bus.tipo === 'pq') {
        // Update both angle and voltage
        bus.ang += dx[k++];
        bus.V += dx[k++];
      } else if (bus.tipo === 'pv') {
        // Update only angle (voltage is fixed)
        bus.ang += dx[k++];
      }
      // Slack bus: no updates
    }

    // Store iteration history
    history.push({
      iteration: iter + 1,
      error,
      maxMismatch: error
    });

    iter++;
  }

  // Calculate final results
  const { P, Q } = calcularPQ(buses, Y);
  const { Ploss, Qloss } = calcularPerdidas(buses, P, Q);

  return {
    converged,
    iterations: iter,
    buses: buses.map(b => b.toJSON()),
    P,
    Q,
    Ploss,
    Qloss,
    history
  };
}

/**
 * Fast decoupled load flow (simplified, faster)
 * Uses decoupled P-θ and Q-V iterations
 * @param {Object} params - Solver parameters
 * @returns {Object} Solution results
 */
function loadFlowDecoupled({ buses, Y, maxIter = 30, tol = 1e-5, verbose = false }) {
  let iter = 0;
  let converged = false;

  while (iter < maxIter) {
    const { P, Q } = calcularPQ(buses, Y);
    const { mismatchP, mismatchQ } = calcularMismatch(buses, P, Q);

    const errorP = Math.max(...mismatchP.map(Math.abs));
    const errorQ = Math.max(...mismatchQ.map(Math.abs));
    const error = Math.max(errorP, errorQ);

    if (verbose) {
      console.log(`Iteration ${iter + 1}: ErrorP = ${errorP.toExponential(4)}, ErrorQ = ${errorQ.toExponential(4)}`);
    }

    if (error < tol) {
      converged = true;
      break;
    }

    // Update angles (P-θ)
    for (let i = 0; i < buses.length; i++) {
      if (buses[i].tipo !== 'slack') {
        buses[i].ang += 0.1 * mismatchP[i]; // Simplified update
      }
    }

    // Update voltages (Q-V)
    for (let i = 0; i < buses.length; i++) {
      if (buses[i].tipo === 'pq') {
        buses[i].V += 0.1 * mismatchQ[i]; // Simplified update
      }
    }

    iter++;
  }

  const { P, Q } = calcularPQ(buses, Y);
  const { Ploss, Qloss } = calcularPerdidas(buses, P, Q);

  return {
    converged,
    iterations: iter,
    buses: buses.map(b => b.toJSON()),
    P,
    Q,
    Ploss,
    Qloss
  };
}

/**
 * Convert ReactFlow nodes to load flow buses
 * @param {Array} nodes - ReactFlow nodes
 * @returns {Array} Array of Bus objects
 */
function convertirNodosABuses(nodes) {
  return nodes.map((node, index) => {
    const params = node.data.parameters || {};

    // Determine bus type based on node type
    let tipo = 'pq';
    if (node.type === 'transformer') {
      tipo = 'slack'; // Transformer acts as source
    } else if (node.type === 'motor') {
      tipo = 'pv'; // Motor can generate reactive power
    }

    // Calculate power injection
    const Pg = node.type === 'transformer' ? 10 : 0; // Source generation
    const Pd = node.type === 'load' ? (params.potencia_kW || 50) / 1000 : 0; // Load demand
    const Qd = node.type === 'load' ? Pd * 0.5 : 0; // Reactive demand

    return {
      id: node.id,
      tipo,
      V: 1.0,
      ang: 0.0,
      Pg,
      Pd,
      Qg: 0,
      Qd,
      Vmin: 0.95,
      Vmax: 1.05
    };
  });
}

module.exports = {
  loadFlowNR,
  loadFlowDecoupled,
  convertirNodosABuses
};
