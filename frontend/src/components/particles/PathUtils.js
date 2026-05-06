/**
 * components/particles/PathUtils.js
 * Utilidades para convertir edges del grafo a caminos de partículas
 */

/**
 * Convertir edge del grafo a camino de puntos para partículas
 * @param {Object} edge - Edge del grafo {source, target, id}
 * @param {Array} nodes - Array de nodos del sistema
 * @param {Object} options - Opciones de conversión
 * @returns {Array} Array de puntos [{x, y}]
 */
export function edgeToPath(edge, nodes, options = {}) {
  const from = nodes.find(n => n.id === edge.source);
  const to = nodes.find(n => n.id === edge.target);

  if (!from || !to) {
    console.warn(`Nodes not found for edge ${edge.id}: ${edge.source} -> ${edge.target}`);
    return [];
  }

  const fromPos = from.position || { x: 0, y: 0 };
  const toPos = to.position || { x: 0, y: 0 };

  // Camino simple línea recta
  const path = [
    { x: fromPos.x, y: fromPos.y },
    { x: toPos.x, y: toPos.y }
  ];

  // Si se requieren curvas Bezier, generar puntos intermedios
  if (options.curved && options.curvePoints > 2) {
    return generateCurvedPath(fromPos, toPos, options.curvePoints);
  }

  // Si se requieren puntos intermedios para movimiento más suave
  if (options.intermediatePoints && options.intermediatePoints > 2) {
    return generateIntermediatePoints(fromPos, toPos, options.intermediatePoints);
  }

  return path;
}

/**
 * Generar camino curvado con Bezier
 * @param {Object} from - Punto inicial {x, y}
 * @param {Object} to - Punto final {x, y}
 * @param {number} points - Número de puntos a generar
 * @returns {Array} Array de puntos curvados
 */
function generateCurvedPath(from, to, points = 10) {
  const path = [];

  // Calcular punto de control para curva Bezier cuadrática
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;

  // Offset perpendicular para crear curva
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) return [from, to];

  // Normalizar y aplicar offset perpendicular
  const perpX = -dy / length;
  const perpY = dx / length;
  const curveOffset = length * 0.2; // 20% de la longitud

  const controlX = midX + perpX * curveOffset;
  const controlY = midY + perpY * curveOffset;

  // Generar puntos a lo largo de la curva Bezier
  for (let i = 0; i <= points; i++) {
    const t = i / points;
    const point = quadraticBezier(from, { x: controlX, y: controlY }, to, t);
    path.push(point);
  }

  return path;
}

/**
 * Interpolación de curva Bezier cuadrática
 * @param {Object} p0 - Punto inicial
 * @param {Object} p1 - Punto de control
 * @param {Object} p2 - Punto final
 * @param {number} t - Parámetro (0-1)
 * @returns {Object} Punto interpolado
 */
function quadraticBezier(p0, p1, p2, t) {
  const x = Math.pow(1 - t, 2) * p0.x +
    2 * (1 - t) * t * p1.x +
    Math.pow(t, 2) * p2.x;

  const y = Math.pow(1 - t, 2) * p0.y +
    2 * (1 - t) * t * p1.y +
    Math.pow(t, 2) * p2.y;

  return { x, y };
}

/**
 * Generar puntos intermedios en línea recta
 * @param {Object} from - Punto inicial
 * @param {Object} to - Punto final
 * @param {number} points - Número de puntos totales
 * @returns {Array} Array de puntos
 */
function generateIntermediatePoints(from, to, points = 5) {
  const path = [];

  for (let i = 0; i <= points; i++) {
    const t = i / points;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    path.push({ x, y });
  }

  return path;
}

/**
 * Obtener ruta aguas arriba desde un nodo
 * @param {Object} graph - Grafo completo {nodes, edges}
 * @param {string} startNodeId - ID del nodo inicial
 * @returns {Array} Array de edges hacia la fuente
 */
export function getUpstreamPath(graph, startNodeId) {
  const path = [];
  let current = startNodeId;
  const visited = new Set();
  visited.add(startNodeId); // Mark start node as visited to detect cycles back to start

  let shouldContinue = true;
  while (shouldContinue) {
    // Encontrar edge que termina en el nodo actual
    const edge = graph.edges?.find(e => e.target === current);

    if (!edge) {
      shouldContinue = false;
      break;
    }

    // Evitar ciclos - detener si encontramos el nodo inicial
    if (visited.has(edge.source)) {
      shouldContinue = false;
      break;
    }
    visited.add(edge.source);

    path.push(edge);
    current = edge.source;

    // Detener en nodos específicos (breakers o source)
    if (current.includes('breaker') || current.includes('source')) {
      shouldContinue = false;
      break;
    }

    // Límite de seguridad
    if (path.length > 50) {
      shouldContinue = false;
      break;
    }
  }

  return path;
}

/**
 * Convertir ruta de edges a caminos de partículas
 * @param {Array} edges - Array de edges
 * @param {Array} nodes - Array de nodos
 * @param {Object} options - Opciones de conversión
 * @returns {Array} Array de caminos [{path, edgeId}]
 */
export function edgesToParticlePaths(edges, nodes, options = {}) {
  return edges.map(edge => ({
    edgeId: edge.id,
    path: edgeToPath(edge, nodes, options),
    source: edge.source,
    target: edge.target
  })).filter(p => p.path.length > 0);
}

/**
 * Verificar si un punto está aguas arriba de un breaker
 * @param {Object} particle - Partícula con posición
 * @param {string} breakerId - ID del breaker
 * @param {Object} graph - Grafo del sistema
 * @returns {boolean} True si está aguas arriba
 */
export function isUpstreamOfBreaker(particle, breakerId, graph) {
  const breakerNode = graph.nodes.find(n => n.id === breakerId);
  if (!breakerNode) return false;

  const particlePos = particle.getPosition();
  const breakerPos = breakerNode.position || { x: 0, y: 0 };

  // Lógica simple: si la partícula está más cerca de la fuente
  // que el breaker, está aguas arriba
  const distanceToParticle = Math.sqrt(
    Math.pow(particlePos.x, 2) + Math.pow(particlePos.y, 2)
  );
  const distanceToBreaker = Math.sqrt(
    Math.pow(breakerPos.x, 2) + Math.pow(breakerPos.y, 2)
  );

  return distanceToParticle < distanceToBreaker;
}

/**
 * Calcular distancia entre dos puntos
 * @param {Object} p1 - Punto 1 {x, y}
 * @param {Object} p2 - Punto 2 {x, y}
 * @returns {number} Distancia euclidiana
 */
export function distance(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Normalizar un vector
 * @param {Object} vector - Vector {x, y}
 * @returns {Object} Vector normalizado
 */
export function normalizeVector(vector) {
  const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  if (length === 0) return { x: 0, y: 0 };

  return {
    x: vector.x / length,
    y: vector.y / length
  };
}
