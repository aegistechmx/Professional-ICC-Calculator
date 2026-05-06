/**
 * utils/graphCopyPaste.js - Utilidades para Copiar/Pegar tipo ETAP
 * Funcionalidad profesional de copiar/pegar con offset automático
 */

import { v4 as uuid } from 'uuid';

// Contador para el offset de pegado
let pasteCount = 0;
let lastPasteTime = 0;
const PASTE_RESET_TIME = 3000; // Resetear contador después de 3 segundos

/**
 * Copiar selección de nodos y edges
 * @param {Array} nodes - Todos los nodos del grafo
 * @param {Array} edges - Todos los edges del grafo
 * @param {Array} selectedIds - IDs de nodos seleccionados
 * @returns {Object} - { nodes, edges } copiados
 */
export function copySelection(nodes, edges, selectedIds) {
  if (!selectedIds || selectedIds.length === 0) {
    return null;
  }

  // Filtrar nodos seleccionados
  const selectedNodes = nodes.filter(n => selectedIds.includes(n.id));
  
  // Filtrar edges que conectan nodos seleccionados entre sí
  const selectedEdges = edges.filter(
    e => selectedIds.includes(e.source) && selectedIds.includes(e.target)
  );

  // Calcular centro del grupo para pegado inteligente
  const center = calculateCenter(selectedNodes);

  return {
    nodes: selectedNodes.map(n => ({
      ...n,
      // Guardar posición relativa al centro
      relativePosition: {
        x: n.position.x - center.x,
        y: n.position.y - center.y
      }
    })),
    edges: selectedEdges,
    center,
    copiedAt: Date.now()
  };
}

/**
 * Pegar selección copiada
 * @param {Object} clipboard - Datos del clipboard
 * @param {Array} nodes - Nodos actuales
 * @param {Array} edges - Edges actuales
 * @param {Object} options - Opciones de pegado
 * @returns {Object} - { nodes, edges, newIds } actualizados
 */
export function pasteSelection(clipboard, nodes, edges, options = {}) {
  if (!clipboard || !clipboard.nodes || clipboard.nodes.length === 0) {
    return { nodes, edges, newIds: [] };
  }

  const {
    viewport = null,
    mousePosition = null,
    offset = null
  } = options;

  // Manejar contador de pegado con reset automático
  const now = Date.now();
  if (now - lastPasteTime > PASTE_RESET_TIME) {
    pasteCount = 0;
  }
  pasteCount += 1;
  lastPasteTime = now;

  // Calcular posición de pegado
  let pastePosition;
  
  if (mousePosition) {
    // Pegar en posición del mouse (centrado)
    pastePosition = {
      x: mousePosition.x - clipboard.center.x,
      y: mousePosition.y - clipboard.center.y
    };
  } else if (offset) {
    // Usar offset proporcionado
    pastePosition = offset;
  } else {
    // Offset automático incremental (tipo ETAP)
    const autoOffset = 40 * pasteCount;
    pastePosition = {
      x: autoOffset,
      y: autoOffset
    };
  }

  // Generar mapeo de IDs
  const idMap = {};
  const newIds = [];

  // Crear nuevos nodos
  const newNodes = clipboard.nodes.map(n => {
    const newId = uuid();
    idMap[n.id] = newId;
    newIds.push(newId);

    // Calcular nueva posición
    let newPosition;
    if (n.relativePosition) {
      // Usar posición relativa al centro
      newPosition = {
        x: clipboard.center.x + n.relativePosition.x + pastePosition.x,
        y: clipboard.center.y + n.relativePosition.y + pastePosition.y
      };
    } else {
      // Fallback: offset simple
      newPosition = {
        x: n.position.x + pastePosition.x,
        y: n.position.y + pastePosition.y
      };
    }

    // Clamp a viewport si está disponible
    if (viewport) {
      newPosition = clampToViewport(newPosition, viewport);
    }

    return {
      ...n,
      id: newId,
      position: newPosition,
      selected: true, // Seleccionar nodos pegados
      data: {
        ...n.data,
        // Limpiar resultados anteriores
        results: undefined,
        status: 'pending'
      }
    };
  });

  // Crear nuevos edges
  const newEdges = clipboard.edges.map(e => ({
    ...e,
    id: uuid(),
    source: idMap[e.source],
    target: idMap[e.target],
    selected: true
  }));

  // Deseleccionar nodos existentes
  const existingNodes = nodes.map(n => ({
    ...n,
    selected: false
  }));

  const existingEdges = edges.map(e => ({
    ...e,
    selected: false
  }));

  return {
    nodes: [...existingNodes, ...newNodes],
    edges: [...existingEdges, ...newEdges],
    newIds,
    pasteCount
  };
}

/**
 * Calcular centro de un grupo de nodos
 */
function calculateCenter(nodes) {
  if (nodes.length === 0) {
    return { x: 0, y: 0 };
  }

  const minX = Math.min(...nodes.map(n => n.position.x));
  const maxX = Math.max(...nodes.map(n => n.position.x));
  const minY = Math.min(...nodes.map(n => n.position.y));
  const maxY = Math.max(...nodes.map(n => n.position.y));

  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2
  };
}

/**
 * Forzar posición dentro del viewport
 */
export function clampToViewport(position, viewport) {
  const padding = 50; // Padding desde los bordes
  
  return {
    x: Math.max(
      padding,
      Math.min(position.x, viewport.width - padding)
    ),
    y: Math.max(
      padding,
      Math.min(position.y, viewport.height - padding)
    )
  };
}

/**
 * Duplicar nodos seleccionados (Ctrl+D)
 */
export function duplicateSelection(nodes, edges, selectedIds) {
  const clipboard = copySelection(nodes, edges, selectedIds);
  if (!clipboard) {
    return { nodes, edges, newIds: [] };
  }

  // Pegar con offset fijo (duplicado típico)
  return pasteSelection(clipboard, nodes, edges, {
    offset: { x: 20, y: 20 }
  });
}

/**
 * Eliminar selección (Ctrl+X o Delete)
 */
export function deleteSelection(nodes, edges, selectedIds) {
  // Guardar copia antes de eliminar (para "cortar")
  const clipboard = copySelection(nodes, edges, selectedIds);

  // Filtrar nodos no seleccionados
  const newNodes = nodes.filter(n => !selectedIds.includes(n.id));
  
  // Filtrar edges conectados a nodos eliminados
  const newEdges = edges.filter(
    e => !selectedIds.includes(e.source) && !selectedIds.includes(e.target)
  );

  return {
    nodes: newNodes,
    edges: newEdges,
    clipboard, // Devolver clipboard para "cortar"
    deletedIds: selectedIds
  };
}

/**
 * Seleccionar todos los nodos conectados (flood fill)
 */
export function selectConnected(nodes, edges, startId) {
  const selected = new Set([startId]);
  const queue = [startId];

  while (queue.length > 0) {
    const currentId = queue.shift();

    // Encontrar nodos conectados
    edges.forEach(edge => {
      if (edge.source === currentId && !selected.has(edge.target)) {
        selected.add(edge.target);
        queue.push(edge.target);
      }
      if (edge.target === currentId && !selected.has(edge.source)) {
        selected.add(edge.source);
        queue.push(edge.source);
      }
    });
  }

  return Array.from(selected);
}

/**
 * Resetear contador de pegado
 */
export function resetPasteCount() {
  pasteCount = 0;
  lastPasteTime = 0;
}

/**
 * Obtener estado del clipboard
 */
export function getClipboardStatus(clipboard) {
  if (!clipboard) {
    return { hasData: false, nodeCount: 0, edgeCount: 0 };
  }

  return {
    hasData: true,
    nodeCount: clipboard.nodes?.length || 0,
    edgeCount: clipboard.edges?.length || 0,
    copiedAt: clipboard.copiedAt,
    age: Date.now() - (clipboard.copiedAt || 0)
  };
}
