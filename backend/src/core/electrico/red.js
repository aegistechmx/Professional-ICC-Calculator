/**
 * Network graph construction from ReactFlow nodes and edges
 * Converts visual representation to electrical network model
 */

const {
  Fuente,
  Transformador,
  Linea,
  Breaker,
  Motor,
  Panel,
  Carga
} = require('./elementos');

/**
 * Build electrical network from nodes and edges
 * @param {Array} nodes - ReactFlow nodes
 * @param {Array} edges - ReactFlow edges
 * @returns {Object} Network graph with element instances
 */
function construirRed(nodes, edges) {
  const mapa = {};

  // Create element instances for each node
  nodes.forEach(n => {
    const elemento = crearElemento(n);
    mapa[n.id] = {
      id: n.id,
      tipo: n.type,
      elemento,
      conexiones: [],
      data: n.data
    };
  });

  // Build connections from edges
  edges.forEach(e => {
    if (mapa[e.source]) {
      mapa[e.source].conexiones.push(e.target);
    }
  });

  return mapa;
}

/**
 * Create electrical element instance from ReactFlow node
 * @param {Object} node - ReactFlow node
 * @returns {Elemento} Electrical element instance
 */
function crearElemento(node) {
  const { type, data } = node;
  const params = data.parameters || {};

  switch (type) {
    case 'transformer':
      return new Transformador(node.id, type, {
        V: params.secundario || 480,
        S: params.kVA * 1000, // Convert kVA to VA
        uk: params.Z || 5.75,
        XR: 8 // Default X/R ratio
      });

    case 'breaker':
      return new Breaker(node.id, type, {
        In: params.In || 100,
        Icu: params.Icu || 25000
      });

    case 'motor':
      return new Motor(node.id, type, {
        hp: params.hp || 75,
        V: params.voltaje || 480,
        eficiencia: params.eficiencia || 0.92,
        fp: 0.85 // Default power factor
      });

    case 'panel':
      return new Panel(node.id, type, {
        tension: params.tension || 480,
        fases: params.fases || 3
      });

    case 'load':
      return new Carga(node.id, type, {
        potencia_kW: params.potencia_kW || 50,
        fp: params.fp || 0.85
      });

    default:
      // Treat unknown types as panels (negligible impedance)
      return new Panel(node.id, type, {});
  }
}

/**
 * Find path from source to a specific node
 * @param {Object} red - Network graph
 * @param {string} nodoId - Target node ID
 * @returns {Array} Array of node IDs from source to target
 */
function encontrarCamino(red, nodoId) {
  const camino = [];
  let actual = nodoId;
  const visitados = new Set();

  // Simple backward traversal (radial system)
  while (actual && !visitados.has(actual)) {
    visitados.add(actual);
    camino.unshift(actual);

    // Find incoming connection
    let encontrado = false;
    for (const [id, nodo] of Object.entries(red)) {
      if (nodo.conexiones.includes(actual)) {
        actual = id;
        encontrado = true;
        break;
      }
    }

    if (!encontrado) break;
  }

  return camino;
}

/**
 * Get all sources in the network
 * @param {Object} red - Network graph
 * @returns {Array} Array of source node IDs
 */
function obtenerFuentes(red) {
  return Object.values(red)
    .filter(n => n.tipo === 'transformer')
    .map(n => n.id);
}

module.exports = {
  construirRed,
  crearElemento,
  encontrarCamino,
  obtenerFuentes
};
