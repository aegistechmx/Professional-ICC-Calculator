/**
 * components/GridSnapAndRouting.jsx - Sistema de Snap to Grid y Auto-Routing
 * Componente que proporciona snapping a cuadrícula y enrutamiento automático de conexiones
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useGraphStore } from '../store/graphStore.js';

export const GridSnapAndRouting = ({ gridSize: initialGridSize = 20, enabled = true }) => {
  const {
    nodes,
    edges,
    ui,
    snapToGrid,
    autoRouteEdge,
    toggleGridSnap,
    toggleAutoLayout
  } = useGraphStore();

  const [gridSize, setGridSize] = useState(initialGridSize);

  const [routingStyle, setRoutingStyle] = useState('L'); // 'L', 'S', 'direct'
  const [showGrid, setShowGrid] = useState(true);
  const gridOverlayRef = useRef(null);

  // === SNAP TO GRID ===
  const snapPosition = useCallback((position) => {
    if (!enabled || !ui.gridSnap) return position;

    return snapToGrid(position, gridSize);
  }, [enabled, ui.gridSnap, gridSize, snapToGrid]);

  // === AUTO-ROUTING ===
  const routeConnection = useCallback((sourcePos, targetPos, style = routingStyle) => {
    if (!ui.autoLayout) {
      // Conexión directa si auto-layout está desactivado
      return [sourcePos, targetPos];
    }

    return autoRouteEdge(sourcePos, targetPos, style);
  }, [ui.autoLayout, routingStyle, autoRouteEdge]);

  // === CALCULAR PUNTOS INTERMEDIOS PARA ROUTING ===
  const calculateIntermediatePoints = useCallback((sourcePos, targetPos, style) => {
    switch (style) {
      case 'L':
        // L-shape: horizontal luego vertical
        return [
          sourcePos,
          { x: targetPos.x, y: sourcePos.y },
          targetPos
        ];

      case 'S':
        // S-shape: dos curvas suaves
        const midX = (sourcePos.x + targetPos.x) / 2;
        const midY = (sourcePos.y + targetPos.y) / 2;

        return [
          sourcePos,
          { x: midX, y: sourcePos.y },
          { x: midX, y: targetPos.y },
          targetPos
        ];

      case 'curved':
        // Curva suave con punto de control
        const controlX = (sourcePos.x + targetPos.x) / 2;
        const controlY = Math.min(sourcePos.y, targetPos.y) - 50;

        return [
          sourcePos,
          { x: controlX, y: controlY },
          targetPos
        ];

      case 'direct':
      default:
        // Línea recta
        return [sourcePos, targetPos];
    }
  }, []);

  // === DETECTAR COLISIONES ===
  const detectCollisions = useCallback((path, obstacles = []) => {
    const collisions = [];

    for (let i = 0; i < path.length - 1; i++) {
      const segment = [path[i], path[i + 1]];

      obstacles.forEach(obstacle => {
        if (lineIntersectsRect(segment, obstacle)) {
          collisions.push({
            segment: i,
            obstacle: obstacle,
            point: getIntersectionPoint(segment, obstacle)
          });
        }
      });
    }

    return collisions;
  }, []);

  // === EVITAR COLISIONES ===
  const avoidCollisions = useCallback((path, obstacles) => {
    const collisions = detectCollisions(path, obstacles);

    if (collisions.length === 0) return path;

    // Simple desvío alrededor de obstáculos
    const newPath = [...path];

    collisions.forEach(collision => {
      const { segment, point } = collision;
      const offset = 30; // Desvío de 30px

      // Insertar puntos de desvío
      const deviationPoint = {
        x: point.x + offset,
        y: point.y + offset
      };

      newPath.splice(segment + 1, 0, deviationPoint);
    });

    return newPath;
  }, [detectCollisions]);

  // === UTILIDADES GEOMÉTRICAS ===
  const lineIntersectsRect = useCallback((line, rect) => {
    const [p1, p2] = line;

    // Verificar si la línea intersecta el rectángulo
    return (
      p1.x < rect.x + rect.width &&
      p2.x > rect.x &&
      p1.y < rect.y + rect.height &&
      p2.y > rect.y
    );
  }, []);

  const getIntersectionPoint = useCallback((line, rect) => {
    const [p1, p2] = line;

    // Calcular punto de intersección simple (centro del rectángulo)
    return {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2
    };
  }, []);

  // === OPTIMIZAR PATH ===
  const optimizePath = useCallback((path) => {
    if (path.length <= 2) return path;

    // Remover puntos redundantes
    const optimized = [path[0]];

    for (let i = 1; i < path.length - 1; i++) {
      const prev = optimized[optimized.length - 1];
      const current = path[i];
      const next = path[i + 1];

      // Verificar si el punto actual es colineal
      const area = (next.x - prev.x) * (current.y - prev.y) - (current.x - prev.x) * (next.y - prev.y);

      if (Math.abs(area) > 1) { // No es colineal
        optimized.push(current);
      }
    }

    optimized.push(path[path.length - 1]);
    return optimized;
  }, []);

  // === GRID OVERLAY ===
  const renderGridOverlay = useCallback(() => {
    if (!showGrid || !gridOverlayRef.current) return null;

    const gridLines = [];
    const maxX = Math.max(...nodes.map(n => n.position?.x || 0), 1200);
    const maxY = Math.max(...nodes.map(n => n.position?.y || 0), 800);

    // Líneas verticales
    for (let x = 0; x <= maxX; x += gridSize) {
      gridLines.push(
        <line
          key={`v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={maxY}
          stroke="#e5e7eb"
          strokeWidth="1"
          opacity="0.5"
        />
      );
    }

    // Líneas horizontales
    for (let y = 0; y <= maxY; y += gridSize) {
      gridLines.push(
        <line
          key={`h-${y}`}
          x1={0}
          y1={y}
          x2={maxX}
          y2={y}
          stroke="#e5e7eb"
          strokeWidth="1"
          opacity="0.5"
        />
      );
    }

    return (
      <svg
        ref={gridOverlayRef}
        className="absolute inset-0 pointer-events-none"
        style={{ width: maxX, height: maxY }}
      >
        {gridLines}
      </svg>
    );
  }, [showGrid, gridSize, nodes]);

  // === PANEL DE CONTROL ===
  const ControlPanel = () => (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Grid y Routing</h3>

      {/* Snap to Grid */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Snap to Grid</span>
          <button
            onClick={toggleGridSnap}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${ui.gridSnap
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
            {ui.gridSnap ? 'Activado' : 'Desactivado'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Tamaño:</label>
          <input
            type="range"
            min="10"
            max="50"
            step="5"
            value={gridSize}
            onChange={(e) => setGridSize(parseInt(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm text-gray-600 w-12">{gridSize}px</span>
        </div>
      </div>

      {/* Auto-Routing */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Auto-Routing</span>
          <button
            onClick={toggleAutoLayout}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${ui.autoLayout
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
            {ui.autoLayout ? 'Activado' : 'Desactivado'}
          </button>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="L"
              checked={routingStyle === 'L'}
              onChange={(e) => setRoutingStyle(e.target.value)}
              className="w-3 h-3"
            />
            <span className="text-sm text-gray-600">L-shape</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="S"
              checked={routingStyle === 'S'}
              onChange={(e) => setRoutingStyle(e.target.value)}
              className="w-3 h-3"
            />
            <span className="text-sm text-gray-600">S-shape</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="curved"
              checked={routingStyle === 'curved'}
              onChange={(e) => setRoutingStyle(e.target.value)}
              className="w-3 h-3"
            />
            <span className="text-sm text-gray-600">Curved</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="direct"
              checked={routingStyle === 'direct'}
              onChange={(e) => setRoutingStyle(e.target.value)}
              className="w-3 h-3"
            />
            <span className="text-sm text-gray-600">Direct</span>
          </label>
        </div>
      </div>

      {/* Grid Overlay */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Mostrar Grid</span>
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${showGrid
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
            {showGrid ? 'Visible' : 'Oculto'}
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="bg-gray-50 rounded p-3">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Estadísticas</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Nodos:</span>
            <span className="font-medium">{nodes.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Conexiones:</span>
            <span className="font-medium">{edges.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Grid Size:</span>
            <span className="font-medium">{gridSize}px</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Routing:</span>
            <span className="font-medium capitalize">{routingStyle}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // === HOOK PERSONALIZADO PARA USO EN OTROS COMPONENTES ===
  const useGridRouting = () => ({
    snapPosition,
    routeConnection,
    calculateIntermediatePoints,
    detectCollisions,
    avoidCollisions,
    optimizePath,
    gridSize,
    routingStyle,
    enabled: enabled && ui.gridSnap,
    autoRouting: ui.autoLayout
  });

  return {
    ControlPanel,
    GridOverlay: renderGridOverlay,
    useGridRouting,
    snapPosition,
    routeConnection,
    calculateIntermediatePoints,
    detectCollisions,
    avoidCollisions,
    optimizePath
  };
};

// === HOOK PARA SNAP Y ROUTING ===
export const useGridRouting = (gridSize = 20) => {
  const {
    nodes,
    edges,
    ui,
    snapToGrid,
    autoRouteEdge
  } = useGraphStore();

  const snapPosition = useCallback((position) => {
    if (!ui.gridSnap) return position;
    return snapToGrid(position, gridSize);
  }, [ui.gridSnap, gridSize, snapToGrid]);

  const routeConnection = useCallback((sourcePos, targetPos, style = 'L') => {
    if (!ui.autoLayout) {
      return [sourcePos, targetPos];
    }
    return autoRouteEdge(sourcePos, targetPos, style);
  }, [ui.autoLayout, autoRouteEdge]);

  return {
    snapPosition,
    routeConnection,
    gridSize,
    enabled: ui.gridSnap,
    autoRouting: ui.autoLayout
  };
};

// === COMPONENTE DE GRID OVERLAY ===
export const GridOverlay = ({ gridSize = 20, showGrid = true }) => {
  const { nodes } = useGraphStore();

  const maxX = Math.max(...nodes.map(n => n.position?.x || 0), 1200);
  const maxY = Math.max(...nodes.map(n => n.position?.y || 0), 800);

  if (!showGrid) return null;

  const gridLines = [];

  // Líneas verticales
  for (let x = 0; x <= maxX; x += gridSize) {
    gridLines.push(
      <line
        key={`v-${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={maxY}
        stroke="#e5e7eb"
        strokeWidth="1"
        opacity="0.5"
      />
    );
  }

  // Líneas horizontales
  for (let y = 0; y <= maxY; y += gridSize) {
    gridLines.push(
      <line
        key={`h-${y}`}
        x1={0}
        y1={y}
        x2={maxX}
        y2={y}
        stroke="#e5e7eb"
        strokeWidth="1"
        opacity="0.5"
      />
    );
  }

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ width: maxX, height: maxY }}
    >
      {gridLines}
    </svg>
  );
};

// === COMPONENTE DE EDGE ROUTING ===
export const RoutedEdge = ({ edge, style = 'L' }) => {
  const { nodes } = useGraphStore();
  const { routeConnection } = useGridRouting();

  const sourceNode = nodes.find(n => n.id === edge.source);
  const targetNode = nodes.find(n => n.id === edge.target);

  if (!sourceNode?.position || !targetNode?.position) {
    return null;
  }

  const path = routeConnection(sourceNode.position, targetNode.position, style);

  // Generar path SVG
  const pathData = path.reduce((acc, point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    } else {
      return `${acc} L ${point.x} ${point.y}`;
    }
  }, '');

  return (
    <path
      d={pathData}
      stroke="#6b7280"
      strokeWidth="2"
      fill="none"
    />
  );
};

export default GridSnapAndRouting;
