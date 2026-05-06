/**
 * utils/manhattanRouter.js - Router Manhattan para Cables Ortogonales
 * Algoritmo A* sobre grid para rutas limpias tipo diagrama unifilar
 */

/* eslint-disable no-console */
// Configuración del grid
const GRID_CELL = 20; // Tamaño de celda en píxeles
const NODE_PADDING = 40; // Espacio alrededor de nodos (2 celdas)
const MAX_SEARCH_ITERATIONS = 10000; // Límite de seguridad

// Penalizaciones de costo para A*
const COST_OBSTACLE = 1000; // Penalización por atravesar nodo
const COST_CABLE = 50; // Penalización por cruzar cable existente
const COST_CABLE_PROXIMITY = 10; // Penalización por cercanía a cable

// Offset por feeder para separación visual
const FEEDER_OFFSETS = {
  F1: 0,
  F2: 30,
  F3: -30,
  F4: 60,
  F5: -60
};

/**
 * Construir grid para pathfinding
 */
export function buildGrid(canvasWidth, canvasHeight, cellSize = GRID_CELL) {
  const cols = Math.ceil(canvasWidth / cellSize);
  const rows = Math.ceil(canvasHeight / cellSize);

  // 0 = libre, 1 = obstáculo, 2 = cable existente
  const grid = Array.from({ length: rows }, () => Array(cols).fill(0));

  return { grid, cols, rows, cellSize };
}

/**
 * Marcar obstáculos (nodos) en el grid
 */
export function markObstacles(grid, nodes, cellSize = GRID_CELL) {
  const paddingCells = NODE_PADDING / cellSize;

  nodes.forEach(node => {
    const centerX = Math.floor((node.position.x + 75) / cellSize); // 75 = mitad del ancho del nodo
    const centerY = Math.floor((node.position.y + 50) / cellSize); // 50 = mitad del alto del nodo

    // Marcar zona alrededor del nodo como obstáculo
    for (let dx = -paddingCells; dx <= paddingCells; dx++) {
      for (let dy = -paddingCells; dy <= paddingCells; dy++) {
        const col = centerX + dx;
        const row = centerY + dy;

        if (row >= 0 && row < grid.length && col >= 0 && col < grid[0].length) {
          grid[row][col] = 1; // Bloqueado
        }
      }
    }
  });

  return grid;
}

/**
 * Marcar cables existentes con mapa de proximidad (para minimizar cruces)
 * Retorna un mapa de celdas ocupadas por cables
 */
export function markExistingCables(grid, edges, nodes, cellSize = GRID_CELL) {
  const cableMap = new Map(); // Mapa de celdas ocupadas por cables

  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);

    if (!sourceNode || !targetNode) return;

    // Obtener puntos de conexión
    const start = {
      x: Math.floor((sourceNode.position.x + 75) / cellSize),
      y: Math.floor((sourceNode.position.y + 50) / cellSize)
    };
    const end = {
      x: Math.floor((targetNode.position.x + 75) / cellSize),
      y: Math.floor((targetNode.position.y + 50) / cellSize)
    };

    // Marcar celdas en la línea directa (penalización leve)
    const path = getStraightLinePath(start, end);
    path.forEach(point => {
      if (point.y >= 0 && point.y < grid.length &&
        point.x >= 0 && point.x < grid[0].length &&
        grid[point.y][point.x] === 0) {
        grid[point.y][point.x] = 2; // Cable existente (penalizado)
        cableMap.set(`${point.x},${point.y}`, edge.id);
      }
    });
  });

  return { grid, cableMap };
}

/**
 * Obtener línea recta entre dos puntos (Bresenham simplificado)
 */
function getStraightLinePath(start, end) {
  const path = [];
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  const sx = start.x < end.x ? 1 : -1;
  const sy = start.y < end.y ? 1 : -1;
  let err = dx - dy;

  let x = start.x;
  let y = start.y;

  const maxIterations = dx + dy + 10;
  for (let i = 0; i < maxIterations; i++) {
    path.push({ x, y });
    if (x === end.x && y === end.y) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }

  return path;
}

/**
 * Función de costo mejorada para A*
 * Penaliza obstáculos, cables existentes y proximidad a cables
 */
function costFunction(cell, grid, cableMap, options = {}) {
  const { avoidNodes = true, minimizeCrossings = true } = options;
  let cost = 1;

  // Penalización por obstáculos (nodos)
  if (grid[cell.y][cell.x] === 1 && avoidNodes) {
    cost += COST_OBSTACLE;
  }

  // Penalización por cruzar cable existente
  if (grid[cell.y][cell.x] === 2 && minimizeCrossings) {
    cost += COST_CABLE;
  }

  // Penalización por cercanía a cables (celdas adyacentes)
  if (cableMap && minimizeCrossings) {
    const neighbors = [
      { x: cell.x + 1, y: cell.y },
      { x: cell.x - 1, y: cell.y },
      { x: cell.x, y: cell.y + 1 },
      { x: cell.x, y: cell.y - 1 }
    ];

    for (const neighbor of neighbors) {
      if (cableMap.has(`${neighbor.x},${neighbor.y}`)) {
        cost += COST_CABLE_PROXIMITY;
        break; // Solo penalizar una vez
      }
    }
  }

  return cost;
}

/**
 * Algoritmo A* mejorado para pathfinding ortogonal
 */
export function aStar(grid, start, end, cableMap, options = {}) {
  // const { avoidNodes: _avoidNodes = true, minimizeCrossings: _minimizeCrossings = true } = options; // Unused variables removed

  // Validar puntos
  if (!isValidPoint(grid, start) || !isValidPoint(grid, end)) {
    return null;
  }

  const openSet = [];
  const cameFrom = new Map();
  const gScore = new Map();
  const fScore = new Map();

  const startKey = pointKey(start);

  openSet.push(start);
  gScore.set(startKey, 0);
  fScore.set(startKey, manhattanDistance(start, end));

  let iterations = 0;

  while (openSet.length > 0 && iterations < MAX_SEARCH_ITERATIONS) {
    iterations++;

    // Encontrar nodo con menor fScore
    let current = openSet[0];
    let currentIndex = 0;
    let currentF = fScore.get(pointKey(current)) || Infinity;

    for (let i = 1; i < openSet.length; i++) {
      const f = fScore.get(pointKey(openSet[i])) || Infinity;
      if (f < currentF) {
        currentF = f;
        current = openSet[i];
        currentIndex = i;
      }
    }

    // Remover de openSet
    openSet.splice(currentIndex, 1);

    // Llegamos al destino
    if (current.x === end.x && current.y === end.y) {
      return reconstructPath(cameFrom, current);
    }

    // Vecinos ortogonales (solo horizontales/verticales)
    const neighbors = [
      { x: current.x + 1, y: current.y }, // derecha
      { x: current.x - 1, y: current.y }, // izquierda
      { x: current.x, y: current.y + 1 }, // abajo
      { x: current.x, y: current.y - 1 }  // arriba
    ];

    for (const neighbor of neighbors) {
      // Validar vecino
      if (!isValidPoint(grid, neighbor)) continue;

      // Calcular costo con función mejorada
      const moveCost = costFunction(neighbor, grid, cableMap, options);
      const tentativeG = (gScore.get(pointKey(current)) || 0) + moveCost;

      const neighborKey = pointKey(neighbor);
      const currentG = gScore.get(neighborKey) || Infinity;

      if (tentativeG < currentG) {
        cameFrom.set(neighborKey, current);
        gScore.set(neighborKey, tentativeG);
        fScore.set(neighborKey, tentativeG + manhattanDistance(neighbor, end));

        if (!openSet.some(p => p.x === neighbor.x && p.y === neighbor.y)) {
          openSet.push(neighbor);
        }
      }
    }
  }

  // No se encontró ruta, devolver línea recta simplificada
  return getSimplifiedPath(start, end);
}

/**
 * Validar si un punto es válido en el grid
 */
function isValidPoint(grid, point) {
  return point.y >= 0 &&
    point.y < grid.length &&
    point.x >= 0 &&
    point.x < grid[0].length;
}

/**
 * Reconstruir camino desde cameFrom
 */
function reconstructPath(cameFrom, current) {
  const path = [current];
  let currentKey = pointKey(current);

  while (cameFrom.has(currentKey)) {
    current = cameFrom.get(currentKey);
    path.unshift(current);
    currentKey = pointKey(current);
  }

  return path;
}

/**
 * Obtener ruta simplificada (línea recta Manhattan simple)
 */
function getSimplifiedPath(start, end) {
  const path = [start];

  // Ir horizontalmente
  let currentX = start.x;
  while (currentX !== end.x) {
    currentX += currentX < end.x ? 1 : -1;
    path.push({ x: currentX, y: start.y });
  }

  // Ir verticalmente
  let currentY = start.y;
  while (currentY !== end.y) {
    currentY += currentY < end.y ? 1 : -1;
    path.push({ x: end.x, y: currentY });
  }

  return path;
}

/**
 * Distancia Manhattan (heurística A*)
 */
function manhattanDistance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Key única para punto
 */
function pointKey(point) {
  return `${point.x},${point.y}`;
}

/**
 * Convertir path de grid a puntos reales
 */
export function pathToPoints(path, cellSize = GRID_CELL) {
  return path.map(p => ({
    x: p.x * cellSize,
    y: p.y * cellSize
  }));
}

/**
 * Simplificar path (remover puntos intermedios innecesarios)
 */
export function simplifyPath(points) {
  if (points.length <= 2) return points;

  const simplified = [points[0]];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    // Verificar si es un punto de inflexión
    const isHorizontal = prev.y === curr.y && curr.y === next.y;
    const isVertical = prev.x === curr.x && curr.x === next.x;

    if (!isHorizontal && !isVertical) {
      simplified.push(curr);
    }
  }

  simplified.push(points[points.length - 1]);
  return simplified;
}

/**
 * Router principal - Calcular ruta Manhattan entre dos nodos
 * Soporta separación por feeder para evitar cruces
 */
export function calculateManhattanRoute(sourceNode, targetNode, allNodes, existingEdges, canvasSize, options = {}) {
  const { feederId, avoidNodes = true, minimizeCrossings = true } = options;

  // Construir grid
  const { grid, cellSize } = buildGrid(canvasSize.width, canvasSize.height);

  // Marcar obstáculos
  markObstacles(grid, allNodes.filter(n => n.id !== sourceNode.id && n.id !== targetNode.id), cellSize);

  // Marcar cables existentes y obtener mapa
  let cableMap = null;
  if (existingEdges && existingEdges.length > 0 && minimizeCrossings) {
    const result = markExistingCables(grid, existingEdges, allNodes, cellSize);
    cableMap = result.cableMap;
  }

  // Obtener puntos de inicio y fin (conectores de los nodos)
  const start = {
    x: Math.floor((sourceNode.position.x + 75) / cellSize),
    y: Math.floor((sourceNode.position.y + 50) / cellSize)
  };

  const end = {
    x: Math.floor((targetNode.position.x + 75) / cellSize),
    y: Math.floor((targetNode.position.y + 50) / cellSize)
  };

  // Aplicar offset por feeder para separación visual
  const feederOffset = FEEDER_OFFSETS[feederId] || 0;
  const offsetCells = Math.floor(feederOffset / cellSize);

  const adjustedStart = {
    x: start.x,
    y: start.y + offsetCells
  };

  const adjustedEnd = {
    x: end.x,
    y: end.y + offsetCells
  };

  // Ajustar a bordes del nodo para mejor conexión visual
  const borderStart = adjustToNodeBorder(adjustedStart, adjustedEnd, cellSize);
  const borderEnd = adjustToNodeBorder(adjustedEnd, adjustedStart, cellSize);

  // Encontrar ruta con A* mejorado
  const gridPath = aStar(grid, borderStart, borderEnd, cableMap, { avoidNodes, minimizeCrossings });

  if (!gridPath) {
    return null;
  }

  // Convertir a puntos reales y simplificar
  const points = pathToPoints(gridPath, cellSize);
  const simplifiedPoints = simplifyPath(points);

  // Aplicar offset de feeder a puntos finales
  const finalPoints = simplifiedPoints.map(p => ({
    x: p.x,
    y: p.y + feederOffset
  }));

  return finalPoints;
}

/**
 * Ajustar punto al borde del nodo más cercano a la dirección objetivo
 */
function adjustToNodeBorder(point, targetPoint) {
  const dx = targetPoint.x - point.x;
  const dy = targetPoint.y - point.y;

  // Determinar dirección dominante
  if (Math.abs(dx) > Math.abs(dy)) {
    // Movimiento horizontal dominante
    return {
      x: dx > 0 ? point.x + 2 : point.x - 2, // Salir por derecha/izquierda
      y: point.y
    };
  } else {
    // Movimiento vertical dominante
    return {
      x: point.x,
      y: dy > 0 ? point.y + 2 : point.y - 2 // Salir por abajo/arriba
    };
  }
}

/**
 * Optimizar todas las rutas del sistema con separación por feeder
 */
export function optimizeAllRoutes(nodes, edges, canvasSize, options = {}) {
  const { assignFeeders = true } = options;

  // Asignar feeder IDs si no existen
  const edgesWithFeeders = assignFeeders
    ? assignFeederIds(edges)
    : edges;

  const optimizedEdges = edgesWithFeeders.map(edge => {
    const source = nodes.find(n => n.id === edge.source);
    const target = nodes.find(n => n.id === edge.target);

    if (!source || !target) return edge;

    const points = calculateManhattanRoute(
      source,
      target,
      nodes,
      edgesWithFeeders.filter(e => e.id !== edge.id),
      canvasSize,
      {
        feederId: edge.data?.feederId,
        avoidNodes: true,
        minimizeCrossings: true
      }
    );

    if (points) {
      return {
        ...edge,
        data: {
          ...edge.data,
          points,
          routing: 'manhattan',
          feederId: edge.data?.feederId
        }
      };
    }

    return edge;
  });

  return optimizedEdges;
}

/**
 * Asignar feeder IDs a edges basado en topología
 * Distribuye cables en diferentes "carriles" para evitar cruces
 */
function assignFeederIds(edges) {
  if (edges.length === 0) return edges;

  // Contar feeders por nodo fuente
  const sourceFeeders = new Map();
  const feederAssignments = new Map();

  edges.forEach((edge) => {
    const source = edge.source;
    const currentCount = sourceFeeders.get(source) || 0;
    const feederId = `F${(currentCount % 5) + 1}`; // Ciclar entre F1-F5

    sourceFeeders.set(source, currentCount + 1);
    feederAssignments.set(edge.id, feederId);
  });

  return edges.map(edge => ({
    ...edge,
    data: {
      ...edge.data,
      feederId: feederAssignments.get(edge.id) || 'F1'
    }
  }));
}

/**
 * Detectar y resolver cruces de cables
 */
export function detectCrossings(edges) {
  const crossings = [];

  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const edge1 = edges[i];
      const edge2 = edges[j];

      // Verificar si hay puntos de intersección
      if (edge1.data?.points && edge2.data?.points) {
        const intersection = findIntersection(edge1.data.points, edge2.data.points);
        if (intersection) {
          crossings.push({
            edge1: edge1.id,
            edge2: edge2.id,
            point: intersection
          });
        }
      }
    }
  }

  return crossings;
}

/**
 * Encontrar intersección entre dos paths
 */
function findIntersection(points1, points2) {
  // Versión simplificada: buscar puntos comunes
  for (const p1 of points1) {
    for (const p2 of points2) {
      if (Math.abs(p1.x - p2.x) < 5 && Math.abs(p1.y - p2.y) < 5) {
        return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      }
    }
  }
  return null;
}

// Exportar todo
export default {
  buildGrid,
  markObstacles,
  markExistingCables,
  aStar,
  pathToPoints,
  simplifyPath,
  calculateManhattanRoute,
  optimizeAllRoutes,
  detectCrossings
};
