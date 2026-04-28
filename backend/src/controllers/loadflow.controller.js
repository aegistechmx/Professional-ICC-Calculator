/**
 * Load flow controller
 * Handles power flow analysis requests
 */

const { success } = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorHandler');
const { construirYbusDesdeEditor } = require('../core/loadflow/ybus');
const { loadFlowNR, loadFlowDecoupled, convertirNodosABuses } = require('../core/loadflow/newton');
const { Bus } = require('../core/loadflow/bus');

/**
 * POST /api/loadflow
 * Run load flow analysis on the electrical system
 */
exports.runLoadFlow = asyncHandler(async (req, res) => {
  const { nodes, edges, opciones = {} } = req.body;

  const {
    metodo = 'newton', // 'newton' or 'decoupled'
    maxIter = 20,
    tol = 1e-6,
    verbose = false
  } = opciones;

  // Convert ReactFlow nodes to load flow buses
  const buses = convertirNodosABuses(nodes);
  const busInstances = buses.map(b => new Bus(b));

  // Build Ybus matrix
  const { Y, busMap } = construirYbusDesdeEditor(nodes, edges);

  // Run load flow
  const solver = metodo === 'decoupled' ? loadFlowDecoupled : loadFlowNR;
  const resultado = solver({
    buses: busInstances,
    Y,
    maxIter,
    tol,
    verbose
  });

  // Map results back to node IDs
  const resultadosPorNodo = {};
  resultado.buses.forEach((bus, index) => {
    const nodeId = Object.keys(busMap).find(key => busMap[key] === index);
    if (nodeId) {
      resultadosPorNodo[nodeId] = {
        V: bus.V,
        ang: bus.ang,
        P: resultado.P[index],
        Q: resultado.Q[index]
      };
    }
  });

  success(res, {
    converged: resultado.converged,
    iterations: resultado.iterations,
    buses: resultado.buses,
    resultadosPorNodo,
    Ploss: resultado.Ploss,
    Qloss: resultado.Qloss,
    history: resultado.history
  });
});

/**
 * POST /api/loadflow/validate
 * Validate system before running load flow
 */
exports.validateSystem = asyncHandler(async (req, res) => {
  const { nodes, edges } = req.body;

  const errores = [];

  // Check if there's at least one source (transformer)
  const hasSource = nodes.some(n => n.type === 'transformer');
  if (!hasSource) {
    errores.push('No source (transformer) found in the system');
  }

  // Check if all nodes are connected
  const connectedNodeIds = new Set();
  edges.forEach(e => {
    connectedNodeIds.add(e.source);
    connectedNodeIds.add(e.target);
  });

  const isolatedNodes = nodes.filter(n => !connectedNodeIds.has(n.id));
  if (isolatedNodes.length > 0) {
    errores.push(`Isolated nodes found: ${isolatedNodes.map(n => n.id).join(', ')}`);
  }

  // Check for multiple sources (simplified: only one allowed)
  const sources = nodes.filter(n => n.type === 'transformer');
  if (sources.length > 1) {
    errores.push('Multiple sources found. Only one slack bus is supported in this version.');
  }

  const valid = errores.length === 0;

  success(res, {
    valid,
    errores,
    warnings: []
  });
});
