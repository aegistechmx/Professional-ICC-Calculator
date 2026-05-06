/**
 * hooks/useSmartSnap.js - Snap Inteligente en Vivo tipo AutoCAD
 * Detecta alineación con otros nodos y muestra guías visuales
 */

/* eslint-disable no-console */
import { useCallback, useState, useRef } from 'react';

// Configuración de snap
const DEFAULT_SNAP_TOL = 10; // pixels
const GRID_SIZE = 20; // grid base
const SNAP_MODES = {
  GRID: 'grid',
  NODES: 'nodes',
  SMART: 'smart', // combinación
  NONE: 'none'
};

export function useSmartSnap(nodes, options = {}) {
  const {
    snapTol = DEFAULT_SNAP_TOL,
    gridSize = GRID_SIZE,
    mode = SNAP_MODES.SMART,
    nodeWidth = 150,
    nodeHeight = 100,
    enableAngles = false // para futuro: snap a ángulos
  } = options;

  const [guides, setGuides] = useState({ vertical: [], horizontal: [] });
  const [isSnapping, setIsSnapping] = useState(false);
  const snapCache = useRef(new Map());

  /**
   * Calcular posición con snap inteligente
   */
  const getSnapPosition = useCallback((draggedNode, currentPosition) => {
    if (mode === SNAP_MODES.NONE) {
      return { position: currentPosition, guides: { vertical: [], horizontal: [] }, snapped: false };
    }

    let { x, y } = currentPosition;
    const newGuides = { vertical: [], horizontal: [] };
    let snapped = { x: false, y: false };

    // 1. Snap a grid (si está activado)
    if (mode === SNAP_MODES.GRID || mode === SNAP_MODES.SMART) {
      const gridX = Math.round(x / gridSize) * gridSize;
      const gridY = Math.round(y / gridSize) * gridSize;

      if (Math.abs(x - gridX) < snapTol) {
        x = gridX;
        snapped.x = true;
        newGuides.vertical.push({ x: gridX, type: 'grid', strength: 'weak' });
      }

      if (Math.abs(y - gridY) < snapTol) {
        y = gridY;
        snapped.y = true;
        newGuides.horizontal.push({ y: gridY, type: 'grid', strength: 'weak' });
      }
    }

    // 2. Snap a otros nodos (más fuerte que grid)
    if (mode === SNAP_MODES.NODES || mode === SNAP_MODES.SMART) {
      const otherNodes = nodes.filter(n => n.id !== draggedNode.id);

      for (const other of otherNodes) {
        const ox = other.position.x;
        const oy = other.position.y;
        const ocx = ox + nodeWidth / 2;  // centro X
        const ocy = oy + nodeHeight / 2; // centro Y
        const oright = ox + nodeWidth;   // derecha
        const obottom = oy + nodeHeight; // abajo

        const ncx = x + nodeWidth / 2;   // centro X del nodo arrastrado
        const ncy = y + nodeHeight / 2;  // centro Y del nodo arrastrado
        const nright = x + nodeWidth;    // derecha
        const nbottom = y + nodeHeight;  // abajo

        // Snap BORDES VERTICALES (izquierda-izquierda, derecha-derecha)
        if (!snapped.x) {
          // Izquierda con izquierda
          if (Math.abs(x - ox) < snapTol) {
            x = ox;
            snapped.x = true;
            newGuides.vertical.push({ x: ox, type: 'left', nodeId: other.id, strength: 'strong' });
          }
          // Derecha con derecha
          else if (Math.abs(nright - oright) < snapTol) {
            x = oright - nodeWidth;
            snapped.x = true;
            newGuides.vertical.push({ x: oright, type: 'right', nodeId: other.id, strength: 'strong' });
          }
          // Izquierda con derecha (adyacente)
          else if (Math.abs(x - oright) < snapTol) {
            x = oright;
            snapped.x = true;
            newGuides.vertical.push({ x: oright, type: 'adjacent', nodeId: other.id, strength: 'medium' });
          }
          // Derecha con izquierda (adyacente)
          else if (Math.abs(nright - ox) < snapTol) {
            x = ox - nodeWidth;
            snapped.x = true;
            newGuides.vertical.push({ x: ox, type: 'adjacent', nodeId: other.id, strength: 'medium' });
          }
        }

        // Snap CENTROS VERTICAL (prioridad alta)
        if (!snapped.x && Math.abs(ncx - ocx) < snapTol) {
          x = ocx - nodeWidth / 2;
          snapped.x = true;
          newGuides.vertical.push({ x: ocx, type: 'center', nodeId: other.id, strength: 'strong' });
        }

        // Snap BORDES HORIZONTALES (arriba-arriba, abajo-abajo)
        if (!snapped.y) {
          // Arriba con arriba
          if (Math.abs(y - oy) < snapTol) {
            y = oy;
            snapped.y = true;
            newGuides.horizontal.push({ y: oy, type: 'top', nodeId: other.id, strength: 'strong' });
          }
          // Abajo con abajo
          else if (Math.abs(nbottom - obottom) < snapTol) {
            y = obottom - nodeHeight;
            snapped.y = true;
            newGuides.horizontal.push({ y: obottom, type: 'bottom', nodeId: other.id, strength: 'strong' });
          }
          // Arriba con abajo (adyacente)
          else if (Math.abs(y - obottom) < snapTol) {
            y = obottom;
            snapped.y = true;
            newGuides.horizontal.push({ y: obottom, type: 'adjacent', nodeId: other.id, strength: 'medium' });
          }
          // Abajo con arriba (adyacente)
          else if (Math.abs(nbottom - oy) < snapTol) {
            y = oy - nodeHeight;
            snapped.y = true;
            newGuides.horizontal.push({ y: oy, type: 'adjacent', nodeId: other.id, strength: 'medium' });
          }
        }

        // Snap CENTROS HORIZONTAL (prioridad alta)
        if (!snapped.y && Math.abs(ncy - ocy) < snapTol) {
          y = ocy - nodeHeight / 2;
          snapped.y = true;
          newGuides.horizontal.push({ y: ocy, type: 'center', nodeId: other.id, strength: 'strong' });
        }
      }
    }

    // 3. Distancia consistente (spacing igual entre nodos)
    if (mode === SNAP_MODES.SMART) {
      const spacing = detectConsistentSpacing(nodes, draggedNode, snapTol);

      if (spacing && !snapped.x) {
        // Intentar mantener spacing horizontal consistente
        const consistentX = findConsistentPositionX(nodes, draggedNode, x, spacing);
        if (consistentX !== null && Math.abs(x - consistentX) < snapTol * 2) {
          x = consistentX;
          snapped.x = true;
          newGuides.vertical.push({ x: consistentX, type: 'spacing', strength: 'medium' });
        }
      }

      if (spacing && !snapped.y) {
        // Intentar mantener spacing vertical consistente
        const consistentY = findConsistentPositionY(nodes, draggedNode, y, spacing);
        if (consistentY !== null && Math.abs(y - consistentY) < snapTol * 2) {
          y = consistentY;
          snapped.y = true;
          newGuides.horizontal.push({ y: consistentY, type: 'spacing', strength: 'medium' });
        }
      }
    }

    const result = {
      position: { x, y },
      guides: newGuides,
      snapped: snapped.x || snapped.y
    };

    // Actualizar guías visuales
    setGuides(newGuides);
    setIsSnapping(result.snapped);

    return result;
  }, [nodes, snapTol, gridSize, mode, nodeWidth, nodeHeight]);

  /**
   * Limpiar guías
   */
  const clearGuides = useCallback(() => {
    setGuides({ vertical: [], horizontal: [] });
    setIsSnapping(false);
  }, []);

  /**
   * Detectar spacing consistente entre nodos
   */
  function detectConsistentSpacing(nodes, excludeNode, tolerance) {
    const otherNodes = nodes.filter(n => n.id !== excludeNode.id);
    if (otherNodes.length < 2) return null;

    const spacings = [];

    // Calcular spacings horizontales
    for (let i = 0; i < otherNodes.length; i++) {
      for (let j = i + 1; j < otherNodes.length; j++) {
        const spacing = Math.abs(otherNodes[i].position.x - otherNodes[j].position.x);
        if (spacing > tolerance) {
          spacings.push(spacing);
        }
      }
    }

    // Calcular spacings verticales
    for (let i = 0; i < otherNodes.length; i++) {
      for (let j = i + 1; j < otherNodes.length; j++) {
        const spacing = Math.abs(otherNodes[i].position.y - otherNodes[j].position.y);
        if (spacing > tolerance) {
          spacings.push(spacing);
        }
      }
    }

    if (spacings.length === 0) return null;

    // Encontrar el spacing más común (moda aproximada)
    const grouped = {};
    spacings.forEach(s => {
      const rounded = Math.round(s / 10) * 10; // Agrupar por decenas
      grouped[rounded] = (grouped[rounded] || 0) + 1;
    });

    const mostCommon = Object.entries(grouped)
      .sort((a, b) => b[1] - a[1])[0];

    return mostCommon ? parseInt(mostCommon[0]) : null;
  }

  /**
   * Encontrar posición X consistente con spacing
   */
  function findConsistentPositionX(nodes, draggedNode, currentX, spacing) {
    const otherNodes = nodes.filter(n => n.id !== draggedNode.id);

    for (const other of otherNodes) {
      const candidate1 = other.position.x + spacing;
      const candidate2 = other.position.x - spacing;

      if (Math.abs(currentX - candidate1) < spacing * 0.3) return candidate1;
      if (Math.abs(currentX - candidate2) < spacing * 0.3) return candidate2;
    }

    return null;
  }

  /**
   * Encontrar posición Y consistente con spacing
   */
  function findConsistentPositionY(nodes, draggedNode, currentY, spacing) {
    const otherNodes = nodes.filter(n => n.id !== draggedNode.id);

    for (const other of otherNodes) {
      const candidate1 = other.position.y + spacing;
      const candidate2 = other.position.y - spacing;

      if (Math.abs(currentY - candidate1) < spacing * 0.3) return candidate1;
      if (Math.abs(currentY - candidate2) < spacing * 0.3) return candidate2;
    }

    return null;
  }

  /**
   * Configurar modo de snap
   */
  const setSnapMode = useCallback((newMode) => {
    // Implementar si se necesita cambio dinámico de modo
  }, []);

  return {
    getSnapPosition,
    clearGuides,
    guides,
    isSnapping,
    setSnapMode,
    snapModes: SNAP_MODES
  };
}

/**
 * Hook para integrar snap con ReactFlow
 */
export function useSmartSnapWithReactFlow(reactFlowInstance, nodes, options) {
  const smartSnap = useSmartSnap(nodes, options);
  const lastNodeRef = useRef(null);

  const onNodeDrag = useCallback((event, node) => {
    if (!reactFlowInstance) return;

    // Obtener posición actual en coordenadas del canvas
    const position = reactFlowInstance.project({
      x: event.clientX,
      y: event.clientY
    });

    // Calcular snap
    const result = smartSnap.getSnapPosition(node, position);

    // Aplicar snap al nodo
    if (result.snapped) {
      node.position = result.position;
      lastNodeRef.current = node;
    }
  }, [reactFlowInstance, smartSnap]);

  const onNodeDragStop = useCallback(() => {
    smartSnap.clearGuides();
    lastNodeRef.current = null;
  }, [smartSnap]);

  const onNodeDragStart = useCallback(() => {
    smartSnap.clearGuides();
  }, [smartSnap]);

  return {
    ...smartSnap,
    onNodeDrag,
    onNodeDragStop,
    onNodeDragStart,
    eventHandlers: {
      onNodeDrag,
      onNodeDragStop,
      onNodeDragStart
    }
  };
}
