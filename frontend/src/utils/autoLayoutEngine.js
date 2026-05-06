/**
 * utils/autoLayoutEngine.js - Motor de Auto-Layout Eléctrico Profesional
 * Layouts: Jerárquico, Radial, por Tipo Eléctrico
 */

/* eslint-disable no-console */
// Estrategias de layout
export const LAYOUT_STRATEGIES = {
  HIERARCHICAL: 'hierarchical', // Fuente → Transformador → Tablero → Cargas
  RADIAL: 'radial',             // Fuente en centro, cargas alrededor
  ELECTRICAL_TYPE: 'electrical_type', // Por tipo de componente
  GRID: 'grid',                 // Grid regular
  FORCE_DIRECTED: 'force',       // Fuerzas (futuro)
  TREE: 'tree'                  // Árbol puro
};

// Configuración por defecto
const DEFAULT_CONFIG = {
  spacingX: 250,      // Espaciado horizontal
  spacingY: 180,      // Espaciado vertical
  startX: 100,        // Posición inicial X
  startY: 100,        // Posición inicial Y
  nodeWidth: 150,
  nodeHeight: 100,
  padding: 50         // Padding del canvas
};

/**
 * Motor principal de layout
 */
export class AutoLayoutEngine {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Ejecutar layout según estrategia
   */
  layout(nodes, edges, strategy = LAYOUT_STRATEGIES.HIERARCHICAL) {
    console.log(`[LAYOUT] Ejecutando estrategia: ${strategy}`);

    switch (strategy) {
      case LAYOUT_STRATEGIES.HIERARCHICAL:
        return this.hierarchicalLayout(nodes, edges);
      case LAYOUT_STRATEGIES.RADIAL:
        return this.radialLayout(nodes, edges);
      case LAYOUT_STRATEGIES.ELECTRICAL_TYPE:
        return this.electricalTypeLayout(nodes, edges);
      case LAYOUT_STRATEGIES.GRID:
        return this.gridLayout(nodes, edges);
      case LAYOUT_STRATEGIES.TREE:
        return this.treeLayout(nodes, edges);
      default:
        return this.hierarchicalLayout(nodes, edges);
    }
  }

  /**
   * Layout Jerárquico (tipo árbol eléctrico)
   * Fuente → Transformador → Tablero → Cargas
   */
  hierarchicalLayout(nodes, edges) {
    const { spacingX, spacingY, startX, startY } = this.config;

    // Construir grafo dirigido
    const graph = this.buildGraph(nodes, edges);

    // Encontrar raíz (fuente)
    const root = this.findRoot(nodes, edges);
    if (!root) {
      console.warn('[LAYOUT] No se encontró raíz, usando layout por tipo');
      return this.electricalTypeLayout(nodes, edges);
    }

    // Calcular niveles jerárquicos
    const levels = this.calculateLevels(graph, root.id);

    // Organizar nodos por nivel
    const nodesByLevel = this.groupByLevel(nodes, levels);

    // Calcular posiciones
    const positions = {};

    Object.keys(nodesByLevel).forEach(level => {
      const levelNodes = nodesByLevel[level];
      const levelIndex = parseInt(level);
      const y = startY + levelIndex * spacingY;

      // Centrar nodos en el nivel
      const totalWidth = (levelNodes.length - 1) * spacingX;
      const startXLevel = startX + Math.max(0, (800 - totalWidth) / 4);

      levelNodes.forEach((node, index) => {
        positions[node.id] = {
          x: startXLevel + index * spacingX,
          y: y,
          level: levelIndex
        };
      });
    });

    return this.applyPositions(nodes, positions);
  }

  /**
   * Layout por Tipo Eléctrico
   * Organiza según flujo eléctrico típico
   */
  electricalTypeLayout(nodes, edges) {
    const { spacingX, spacingY, startX, startY } = this.config;

    // Definir niveles por tipo
    const typeLevels = {
      'source': 0,        // Fuentes arriba
      'transformer': 1,   // Transformadores
      'bus': 2,           // Barras
      'breaker': 3,       // Interruptores
      'panel': 3,         // Tableros
      'load': 4,          // Cargas abajo
      'motor': 4,
      'capacitor': 4
    };

    // Agrupar por nivel
    const nodesByLevel = {};

    nodes.forEach(node => {
      const level = typeLevels[node.type] ?? 3;
      if (!nodesByLevel[level]) nodesByLevel[level] = [];
      nodesByLevel[level].push(node);
    });

    // Calcular posiciones
    const positions = {};

    Object.keys(nodesByLevel).sort((a, b) => a - b).forEach(level => {
      const levelNodes = nodesByLevel[level];
      const levelIndex = parseInt(level);
      const y = startY + levelIndex * spacingY;

      // Distribuir horizontalmente
      const totalWidth = (levelNodes.length - 1) * spacingX;
      const centerX = startX + 400; // Centro aproximado

      levelNodes.forEach((node, index) => {
        const offset = levelNodes.length > 1
          ? (index - (levelNodes.length - 1) / 2) * spacingX
          : 0;

        positions[node.id] = {
          x: centerX + offset,
          y: y,
          level: levelIndex,
          type: 'electrical'
        };
      });
    });

    return this.applyPositions(nodes, positions);
  }

  /**
   * Layout Radial (subestación tipo)
   * Fuente en centro, cargas distribuidas en círculo
   */
  radialLayout(nodes, edges) {
    const { startX, startY, spacingX } = this.config;
    const centerX = startX + 400;
    const centerY = startY + 300;

    // Separar fuentes y cargas
    const sources = nodes.filter(n => n.type === 'source');
    const loads = nodes.filter(n => n.type === 'load' || n.type === 'motor');
    const others = nodes.filter(n => !['source', 'load', 'motor'].includes(n.type));

    const positions = {};

    // Fuentes en el centro
    sources.forEach((node, index) => {
      positions[node.id] = {
        x: centerX + (index - sources.length / 2) * 100,
        y: centerY,
        type: 'radial-center'
      };
    });

    // Cargas en círculo alrededor
    const radius = Math.max(250, spacingX * 1.5);
    const angleStep = (2 * Math.PI) / Math.max(loads.length, 3);

    loads.forEach((node, index) => {
      const angle = index * angleStep - Math.PI / 2; // Empezar arriba
      positions[node.id] = {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        type: 'radial-load'
      };
    });

    // Otros nodos en niveles intermedios
    const midRadius = radius * 0.6;
    others.forEach((node, index) => {
      const angle = index * ((2 * Math.PI) / Math.max(others.length, 1)) - Math.PI / 2;
      positions[node.id] = {
        x: centerX + Math.cos(angle) * midRadius,
        y: centerY + Math.sin(angle) * midRadius,
        type: 'radial-mid'
      };
    });

    return this.applyPositions(nodes, positions);
  }

  /**
   * Layout en Grid
   */
  gridLayout(nodes, edges, columns = 4) {
    const { spacingX, spacingY, startX, startY } = this.config;

    const positions = {};

    nodes.forEach((node, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);

      positions[node.id] = {
        x: startX + col * spacingX,
        y: startY + row * spacingY,
        type: 'grid'
      };
    });

    return this.applyPositions(nodes, positions);
  }

  /**
   * Layout de Árbol puro
   */
  treeLayout(nodes, edges) {
    const { spacingX, spacingY, startX, startY } = this.config;

    const graph = this.buildGraph(nodes, edges);
    const root = this.findRoot(nodes, edges);

    if (!root) {
      return this.gridLayout(nodes, edges);
    }

    const positions = {};
    let currentY = startY;

    // DFS para layout en árbol
    const layoutNode = (nodeId, depth, x) => {
      const node = graph[nodeId];
      if (!node) return;

      positions[nodeId] = {
        x: x,
        y: startY + depth * spacingY,
        depth: depth
      };

      const children = node.children || [];
      if (children.length > 0) {
        const width = (children.length - 1) * spacingX;
        const startChildX = x - width / 2;

        children.forEach((child, index) => {
          layoutNode(child.id, depth + 1, startChildX + index * spacingX);
        });
      }
    };

    layoutNode(root.id, 0, startX + 400);

    return this.applyPositions(nodes, positions);
  }

  /**
   * Construir grafo dirigido
   */
  buildGraph(nodes, edges) {
    const graph = {};

    // Inicializar nodos
    nodes.forEach(node => {
      graph[node.id] = {
        ...node,
        children: [],
        parents: []
      };
    });

    // Agregar conexiones
    edges.forEach(edge => {
      if (graph[edge.source] && graph[edge.target]) {
        graph[edge.source].children.push(graph[edge.target]);
        graph[edge.target].parents.push(graph[edge.source]);
      }
    });

    return graph;
  }

  /**
   * Encontrar nodo raíz (fuente)
   */
  findRoot(nodes, edges) {
    const targets = new Set(edges.map(e => e.target));
    const sources = nodes.filter(n => !targets.has(n.id));

    // Priorizar fuentes eléctricas
    const electricalSources = sources.filter(n =>
      ['source', 'generator', 'utility'].includes(n.type)
    );

    return electricalSources[0] || sources[0] || nodes[0];
  }

  /**
   * Calcular niveles jerárquicos (BFS)
   */
  calculateLevels(graph, rootId) {
    const levels = { [rootId]: 0 };
    const queue = [rootId];
    const visited = new Set([rootId]);

    while (queue.length > 0) {
      const currentId = queue.shift();
      const current = graph[currentId];

      if (current && current.children) {
        current.children.forEach(child => {
          if (!visited.has(child.id)) {
            visited.add(child.id);
            levels[child.id] = levels[currentId] + 1;
            queue.push(child.id);
          }
        });
      }
    }

    return levels;
  }

  /**
   * Agrupar nodos por nivel
   */
  groupByLevel(nodes, levels) {
    const groups = {};

    nodes.forEach(node => {
      const level = levels[node.id] ?? 0;
      if (!groups[level]) groups[level] = [];
      groups[level].push(node);
    });

    return groups;
  }

  /**
   * Aplicar posiciones calculadas
   */
  applyPositions(nodes, positions) {
    return nodes.map(node => {
      const pos = positions[node.id];
      if (!pos) return node;

      return {
        ...node,
        position: {
          x: Math.round(pos.x),
          y: Math.round(pos.y)
        },
        // Metadata del layout
        layoutData: {
          level: pos.level,
          type: pos.type,
          depth: pos.depth
        }
      };
    });
  }

  /**
   * Sugerir mejor estrategia según topología
   */
  suggestStrategy(nodes, edges) {
    const types = nodes.map(n => n.type);
    const hasSource = types.includes('source');
    const hasTransformer = types.includes('transformer');
    const hasLoads = types.some(t => ['load', 'motor'].includes(t));

    const edgeCount = edges.length;
    const nodeCount = nodes.length;

    // Detectar topología radial
    const sources = nodes.filter(n => n.type === 'source').length;
    const isRadial = sources === 1 && edgeCount < nodeCount * 1.5;

    if (isRadial && hasLoads > 3) {
      return LAYOUT_STRATEGIES.RADIAL;
    }

    if (hasSource && (hasTransformer || hasLoads)) {
      return LAYOUT_STRATEGIES.HIERARCHICAL;
    }

    if (nodeCount > 20) {
      return LAYOUT_STRATEGIES.GRID;
    }

    return LAYOUT_STRATEGIES.ELECTRICAL_TYPE;
  }
}

/**
 * Función helper para uso simple
 */
export function autoLayout(nodes, edges, strategy, config) {
  const engine = new AutoLayoutEngine(config);
  return engine.layout(nodes, edges, strategy);
}

/**
 * Detectar topología del sistema
 */
export function detectTopology(nodes, edges) {
  const graph = new AutoLayoutEngine().buildGraph(nodes, edges);
  const root = new AutoLayoutEngine().findRoot(nodes, edges);

  if (!root) return 'unknown';

  const levels = new AutoLayoutEngine().calculateLevels(graph, root.id);
  const maxLevel = Math.max(...Object.values(levels));

  // Analizar conectividad
  const nodeCount = nodes.length;
  const edgeCount = edges.length;

  if (edgeCount === nodeCount - 1) {
    return 'tree';
  }

  if (edgeCount < nodeCount) {
    return 'disconnected';
  }

  if (maxLevel > 3) {
    return 'deep-hierarchy';
  }

  return 'hierarchy';
}
