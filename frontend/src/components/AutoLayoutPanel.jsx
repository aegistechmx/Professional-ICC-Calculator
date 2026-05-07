/**
 * components/AutoLayoutPanel.jsx - Panel de Auto-Layout Eléctrico Jerárquico
 * Componente que implementa layout automático basado en topología eléctrica
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useGraphStore } from '../store/graphStore.js';

export const AutoLayoutPanel = () => {
  const [layoutStyle, setLayoutStyle] = useState('hierarchical'); // 'hierarchical', 'radial', 'grid'
  const [spacing, setSpacing] = useState({ x: 200, y: 150 });
  const [isLayouting, setIsLayouting] = useState(false);
  const [layoutStats, setLayoutStats] = useState(null);

  const {
    nodes,
    edges,
    setGraph,
    ui,
    toggleAutoLayout
  } = useGraphStore();

  // === NIVELES ELÉCTRICOS ===
  const electricalLevels = useMemo(() => ({
    source: 0,      // Fuente principal
    transformer: 1, // Transformadores
    bus: 2,         // Buses de distribución
    breaker: 3,     // Breakers de protección
    load: 4,        // Cargas finales
    equipment: 5    // Equipos específicos
  }), []);

  // === ANALISIS DE TOPOLOGÍA ===
  const analyzeTopology = useCallback(() => {
    const topology = {
      levels: {},
      connections: {},
      sources: [],
      loads: [],
      transformers: [],
      breakers: [],
      buses: []
    };

    // Agrupar nodos por nivel eléctrico
    nodes.forEach(node => {
      const level = electricalLevels[node.type] || 999;
      if (!topology.levels[level]) {
        topology.levels[level] = [];
      }
      topology.levels[level].push(node);

      // Clasificar por tipo
      switch (node.type) {
        case 'source':
          topology.sources.push(node);
          break;
        case 'transformer':
          topology.transformers.push(node);
          break;
        case 'bus':
          topology.buses.push(node);
          break;
        case 'breaker':
          topology.breakers.push(node);
          break;
        case 'load':
          topology.loads.push(node);
          break;
      }
    });

    // Analizar conexiones por nivel
    edges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);

      if (sourceNode && targetNode) {
        const sourceLevel = electricalLevels[sourceNode.type] || 999;
        const targetLevel = electricalLevels[targetNode.type] || 999;

        const connectionKey = `${sourceLevel}-${targetLevel}`;
        if (!topology.connections[connectionKey]) {
          topology.connections[connectionKey] = [];
        }
        topology.connections[connectionKey].push(edge);
      }
    });

    return topology;
  }, [nodes, edges, electricalLevels]);

  // === LAYOUT JERÁRQUICO ===
  const applyHierarchicalLayout = useCallback(() => {
    setIsLayouting(true);

    const topology = analyzeTopology();
    const positionedNodes = [];
    const levelKeys = Object.keys(topology.levels)
      .map(key => parseInt(key))
      .sort((a, b) => a - b);

    levelKeys.forEach((level, levelIndex) => {
      const nodesInLevel = topology.levels[level];
      const y = levelIndex * spacing.y + 100;

      nodesInLevel.forEach((node, nodeIndex) => {
        const x = (nodeIndex - nodesInLevel.length / 2) * spacing.x + 400;

        positionedNodes.push({
          ...node,
          position: { x, y }
        });
      });
    });

    // Actualizar grafo
    setGraph(positionedNodes, edges);

    // Generar estadísticas
    setLayoutStats({
      style: 'hierarchical',
      levels: levelKeys.length,
      nodesPerLevel: levelKeys.map(key => topology.levels[key].length),
      totalNodes: positionedNodes.length,
      width: Math.max(...positionedNodes.map(n => n.position.x)) + 100,
      height: Math.max(...positionedNodes.map(n => n.position.y)) + 100
    });

    setTimeout(() => setIsLayouting(false), 500);
  }, [analyzeTopology, spacing, setGraph, edges]);

  // === LAYOUT RADIAL ===
  const applyRadialLayout = useCallback(() => {
    setIsLayouting(true);

    const topology = analyzeTopology();
    const positionedNodes = [];
    const centerX = 400;
    const centerY = 300;

    // Colocar fuente en el centro
    if (topology.sources.length > 0) {
      topology.sources.forEach((source) => {
        positionedNodes.push({
          ...source,
          position: { x: centerX, y: centerY }
        });
      });
    }

    // Colocar otros niveles en círculos concéntricos
    const levelKeys = Object.keys(topology.levels)
      .map(key => parseInt(key))
      .filter(key => key !== 0) // Excluir fuente
      .sort((a, b) => a - b);

    levelKeys.forEach((level, levelIndex) => {
      const nodesInLevel = topology.levels[level];
      const radius = (levelIndex + 1) * spacing.y;

      nodesInLevel.forEach((node, nodeIndex) => {
        const angle = (nodeIndex / nodesInLevel.length) * 2 * Math.PI;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        positionedNodes.push({
          ...node,
          position: { x, y }
        });
      });
    });

    setGraph(positionedNodes, edges);

    setLayoutStats({
      style: 'radial',
      levels: levelKeys.length,
      nodesPerLevel: levelKeys.map(key => topology.levels[key].length),
      totalNodes: positionedNodes.length,
      centerX,
      centerY,
      maxRadius: (levelKeys.length) * spacing.y
    });

    setTimeout(() => setIsLayouting(false), 500);
  }, [analyzeTopology, spacing, setGraph, edges]);

  // === LAYOUT GRID ===
  const applyGridLayout = useCallback(() => {
    setIsLayouting(true);

    const topology = analyzeTopology();
    const positionedNodes = [];

    // Calcular dimensiones del grid
    const maxNodesPerLevel = Math.max(...Object.values(topology.levels).map(level => level.length));
    const cols = Math.max(3, maxNodesPerLevel);
    const rows = Object.keys(topology.levels).length;

    Object.entries(topology.levels).forEach(([, nodesInLevel], levelIndex) => {

      nodesInLevel.forEach((node, nodeIndex) => {
        const col = nodeIndex % cols;
        const row = levelIndex;

        const x = col * spacing.x + 100;
        const y = row * spacing.y + 100;

        positionedNodes.push({
          ...node,
          position: { x, y }
        });
      });
    });

    setGraph(positionedNodes, edges);

    setLayoutStats({
      style: 'grid',
      levels: rows,
      nodesPerLevel: Object.values(topology.levels).map(level => level.length),
      totalNodes: positionedNodes.length,
      cols,
      rows,
      gridWidth: cols * spacing.x,
      gridHeight: rows * spacing.y
    });

    setTimeout(() => setIsLayouting(false), 500);
  }, [analyzeTopology, spacing, setGraph, edges]);

  // === LAYOUT BASADO EN FLUJO ===
  const applyFlowBasedLayout = useCallback(() => {
    setIsLayouting(true);

    // BFS para determinar niveles basados en distancia desde fuentes
    const levels = {};
    const visited = new Set();
    const queue = [];

    // Iniciar con fuentes
    const sources = nodes.filter(n => n.type === 'source');
    sources.forEach(source => {
      levels[source.id] = 0;
      queue.push(source);
      visited.add(source.id);
    });

    // BFS
    while (queue.length > 0) {
      const current = queue.shift();
      const currentLevel = levels[current.id];

      // Encontrar nodos conectados downstream
      const downstreamEdges = edges.filter(e => e.source === current.id);

      downstreamEdges.forEach(edge => {
        const targetNode = nodes.find(n => n.id === edge.target);

        if (targetNode && !visited.has(targetNode.id)) {
          levels[targetNode.id] = currentLevel + 1;
          queue.push(targetNode);
          visited.add(targetNode.id);
        }
      });
    }

    // Agrupar nodos por nivel calculado
    const nodesByLevel = {};
    Object.entries(levels).forEach(([nodeId, level]) => {
      if (!nodesByLevel[level]) {
        nodesByLevel[level] = [];
      }
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        nodesByLevel[level].push(node);
      }
    });

    // Posicionar nodos
    const positionedNodes = [];
    const levelKeys = Object.keys(nodesByLevel)
      .map(key => parseInt(key))
      .sort((a, b) => a - b);

    levelKeys.forEach((level, levelIndex) => {
      const nodesInLevel = nodesByLevel[level];
      const y = levelIndex * spacing.y + 100;

      nodesInLevel.forEach((node, nodeIndex) => {
        const x = (nodeIndex - nodesInLevel.length / 2) * spacing.x + 400;

        positionedNodes.push({
          ...node,
          position: { x, y }
        });
      });
    });

    setGraph(positionedNodes, edges);

    setLayoutStats({
      style: 'flow-based',
      levels: levelKeys.length,
      nodesPerLevel: levelKeys.map(key => nodesByLevel[key].length),
      totalNodes: positionedNodes.length,
      maxDepth: Math.max(...levelKeys)
    });

    setTimeout(() => setIsLayouting(false), 500);
  }, [nodes, edges, spacing, setGraph]);

  // === APLICAR LAYOUT ===
  const applyLayout = useCallback(() => {
    switch (layoutStyle) {
      case 'hierarchical':
        applyHierarchicalLayout();
        break;
      case 'radial':
        applyRadialLayout();
        break;
      case 'grid':
        applyGridLayout();
        break;
      case 'flow-based':
        applyFlowBasedLayout();
        break;
      default:
        applyHierarchicalLayout();
    }
  }, [layoutStyle, applyHierarchicalLayout, applyRadialLayout, applyGridLayout, applyFlowBasedLayout]);

  // === OPTIMIZAR ESPACIAMIENTO ===
  const optimizeSpacing = useCallback(() => {
    const topology = analyzeTopology();

    // Calcular espaciado óptimo basado en número de nodos
    const maxNodesPerLevel = Math.max(...Object.values(topology.levels).map(level => level.length));
    const optimalX = Math.max(150, 800 / maxNodesPerLevel);
    const optimalY = Math.max(100, 400 / Object.keys(topology.levels).length);

    setSpacing({ x: optimalX, y: optimalY });
  }, [analyzeTopology]);

  // === PANEL DE CONTROL ===
  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Auto-Layout Eléctrico</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleAutoLayout}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${ui.autoLayout
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
            {ui.autoLayout ? 'Activado' : 'Desactivado'}
          </button>
          <button
            onClick={applyLayout}
            disabled={isLayouting}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {isLayouting ? 'Aplicando...' : 'Aplicar Layout'}
          </button>
        </div>
      </div>

      {/* Estilo de Layout */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Estilo de Layout:</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'hierarchical', label: 'Jerárquico', icon: ' hierarchy' },
            { value: 'radial', label: 'Radial', icon: ' circle' },
            { value: 'grid', label: 'Grid', icon: ' grid' },
            { value: 'flow-based', label: 'Basado en Flujo', icon: ' flow' }
          ].map(style => (
            <button
              key={style.value}
              onClick={() => setLayoutStyle(style.value)}
              className={`p-2 rounded border text-sm font-medium transition-colors ${layoutStyle === style.value
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      {/* Espaciado */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Espaciado:</label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500">Horizontal: {spacing.x}px</label>
            <input
              type="range"
              min="100"
              max="400"
              step="10"
              value={spacing.x}
              onChange={(e) => setSpacing(prev => ({ ...prev, x: parseInt(e.target.value) }))}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Vertical: {spacing.y}px</label>
            <input
              type="range"
              min="50"
              max="300"
              step="10"
              value={spacing.y}
              onChange={(e) => setSpacing(prev => ({ ...prev, y: parseInt(e.target.value) }))}
              className="w-full"
            />
          </div>
        </div>
        <button
          onClick={optimizeSpacing}
          className="mt-2 text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
        >
          Optimizar Espaciado
        </button>
      </div>

      {/* Estadísticas del Layout */}
      {layoutStats && (
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Estadísticas del Layout</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Estilo:</span>
              <span className="ml-2 font-medium capitalize">{layoutStats.style}</span>
            </div>
            <div>
              <span className="text-gray-500">Nodos:</span>
              <span className="ml-2 font-medium">{layoutStats.totalNodes}</span>
            </div>
            <div>
              <span className="text-gray-500">Niveles:</span>
              <span className="ml-2 font-medium">{layoutStats.levels}</span>
            </div>
            <div>
              <span className="text-gray-500">Dimensiones:</span>
              <span className="ml-2 font-medium">
                {layoutStats.width ? `${layoutStats.width}x${layoutStats.height}` : 'N/A'}
              </span>
            </div>
          </div>

          {/* Nodos por nivel */}
          <div className="mt-3">
            <span className="text-xs text-gray-500">Nodos por nivel:</span>
            <div className="flex gap-2 mt-1">
              {layoutStats.nodesPerLevel.map((count, index) => (
                <span key={index} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                  N{index}: {count}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Topología actual */}
      <div className="mb-4 p-3 bg-gray-50 rounded">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Topología Actual</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Fuentes:</span>
            <span className="ml-2 font-medium">{nodes.filter(n => n.type === 'source').length}</span>
          </div>
          <div>
            <span className="text-gray-500">Transformadores:</span>
            <span className="ml-2 font-medium">{nodes.filter(n => n.type === 'transformer').length}</span>
          </div>
          <div>
            <span className="text-gray-500">Buses:</span>
            <span className="ml-2 font-medium">{nodes.filter(n => n.type === 'bus').length}</span>
          </div>
          <div>
            <span className="text-gray-500">Breakers:</span>
            <span className="ml-2 font-medium">{nodes.filter(n => n.type === 'breaker').length}</span>
          </div>
          <div>
            <span className="text-gray-500">Cargas:</span>
            <span className="ml-2 font-medium">{nodes.filter(n => n.type === 'load').length}</span>
          </div>
          <div>
            <span className="text-gray-500">Conexiones:</span>
            <span className="ml-2 font-medium">{edges.length}</span>
          </div>
        </div>
      </div>

      {/* Presets de Layout */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Presets Rápidos:</h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setLayoutStyle('hierarchical');
              setSpacing({ x: 200, y: 150 });
            }}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
          >
            Sistema Típico
          </button>
          <button
            onClick={() => {
              setLayoutStyle('radial');
              setSpacing({ x: 150, y: 120 });
            }}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
          >
            Subestación
          </button>
          <button
            onClick={() => {
              setLayoutStyle('grid');
              setSpacing({ x: 180, y: 100 });
            }}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
          >
            Panel Industrial
          </button>
          <button
            onClick={() => {
              setLayoutStyle('flow-based');
              setSpacing({ x: 250, y: 200 });
            }}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
          >
            Complejo
          </button>
        </div>
      </div>
    </div>
  );
};


export default AutoLayoutPanel;
