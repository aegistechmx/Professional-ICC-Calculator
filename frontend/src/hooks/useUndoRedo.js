/**
 * hooks/useUndoRedo.js - Hook para Undo/Redo con atajos de teclado
 * Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z - Funcionalidad profesional
 */

/* eslint-disable no-console */
import { useEffect, useCallback } from 'react';
import { useHistoryStore } from '../store/historyStore';
import { useGraphStore } from '../store/graphStore';

export function useUndoRedo() {
  const { undo, redo, canUndo, canRedo, getHistoryInfo } = useHistoryStore();
  const { nodes, edges, setGraph } = useGraphStore();
  const history = useHistoryStore();

  // Ejecutar undo y sincronizar con el store principal
  const performUndo = useCallback(() => {
    if (!canUndo()) {
      console.log('[UNDO] No hay nada para deshacer');
      return false;
    }

    const success = undo();
    if (success) {
      // Sincronizar estado con el store principal
      const { present } = history;
      setGraph(present.nodes, present.edges);

      showNotification('↩️ Deshacer');
      console.log('[UNDO] Realizado');
    }
    return success;
  }, [undo, canUndo, history, setGraph]);

  // Ejecutar redo y sincronizar con el store principal
  const performRedo = useCallback(() => {
    if (!canRedo()) {
      console.log('[REDO] No hay nada para rehacer');
      return false;
    }

    const success = redo();
    if (success) {
      // Sincronizar estado con el store principal
      const { present } = history;
      setGraph(present.nodes, present.edges);

      showNotification('↪️ Rehacer');
      console.log('[REDO] Realizado');
    }
    return success;
  }, [redo, canRedo, history, setGraph]);

  // Guardar checkpoint (para acciones importantes)
  const checkpoint = useCallback(() => {
    const { checkpoint: saveCheckpoint } = useHistoryStore.getState();
    saveCheckpoint();
  }, []);

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignorar si estamos en un input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }

      // Ctrl+Z: Undo
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        performUndo();
      }

      // Ctrl+Y: Redo (alternativo)
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        performRedo();
      }

      // Ctrl+Shift+Z: Redo (estándar)
      if (e.ctrlKey && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        performRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [performUndo, performRedo]);

  // Guardar estado inicial al montar
  useEffect(() => {
    const { saveState } = useHistoryStore.getState();
    if (nodes.length > 0 || edges.length > 0) {
      saveState({ nodes, edges });
    }
  }, [nodes, edges]); // Solo al montar

  // Guardar cambios cuando termina un drag
  const onNodeDragStop = useCallback(() => {
    const { saveState } = useHistoryStore.getState();
    const { nodes: currentNodes, edges } = useGraphStore.getState();
    saveState({ nodes: currentNodes, edges });
    console.log('[UNDO] Checkpoint guardado después de drag');
  }, []);

  // Información del historial
  const historyInfo = getHistoryInfo();

  return {
    undo: performUndo,
    redo: performRedo,
    checkpoint,
    canUndo: historyInfo.canUndo,
    canRedo: historyInfo.canRedo,
    undoCount: historyInfo.undoCount,
    redoCount: historyInfo.redoCount,
    onNodeDragStop,
    historyInfo
  };
}

// Hook para integrar undo/redo con acciones del grafo
export function useHistoryAwareActions() {
  const { undo, redo, checkpoint } = useUndoRedo();
  const { setGraph, nodes, edges } = useGraphStore();
  const { saveState } = useHistoryStore();

  // Envolver setGraph para guardar en historial
  const setGraphWithHistory = useCallback((newNodes, newEdges, options = {}) => {
    const { skipHistory = false } = options;

    if (!skipHistory) {
      // Guardar estado actual antes del cambio
      saveState({ nodes, edges });
    }

    // Aplicar cambio
    setGraph(newNodes, newEdges);

    console.log('[HISTORY] Cambio guardado:', {
      nodes: newNodes.length,
      edges: newEdges.length
    });
  }, [setGraph, saveState, nodes, edges]);

  // Acciones con historial integrado
  const addNode = useCallback((node) => {
    saveState({ nodes, edges });

    const newNodes = [...nodes, node];
    setGraph(newNodes, edges);
  }, [nodes, edges, setGraph, saveState]);

  const removeNode = useCallback((nodeId) => {
    saveState({ nodes, edges });

    const newNodes = nodes.filter(n => n.id !== nodeId);
    const newEdges = edges.filter(e => e.source !== nodeId && e.target !== nodeId);
    setGraph(newNodes, newEdges);
  }, [nodes, edges, setGraph, saveState]);

  const addEdge = useCallback((edge) => {
    saveState({ nodes, edges });

    const newEdges = [...edges, edge];
    setGraph(nodes, newEdges);
  }, [nodes, edges, setGraph, saveState]);

  const removeEdge = useCallback((edgeId) => {
    saveState({ nodes, edges });

    const newEdges = edges.filter(e => e.id !== edgeId);
    setGraph(nodes, newEdges);
  }, [nodes, edges, setGraph, saveState]);

  const updateNode = useCallback((nodeId, data) => {
    // No guardar en historial para cambios pequeños (optimización)
    const newNodes = nodes.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
    );
    setGraph(newNodes, edges);
  }, [nodes, edges, setGraph]);

  const updateNodePosition = useCallback((nodeId, position) => {
    // No guardar en historial durante drag (solo al terminar)
    const newNodes = nodes.map(n =>
      n.id === nodeId ? { ...n, position } : n
    );
    setGraph(newNodes, edges);
  }, [nodes, edges, setGraph]);

  return {
    setGraphWithHistory,
    addNode,
    removeNode,
    addEdge,
    removeEdge,
    updateNode,
    updateNodePosition,
    undo,
    redo,
    checkpoint
  };
}

// Helper para notificaciones
function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #1f2937;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    z-index: 9999;
    animation: slideIn 0.3s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  notification.textContent = message;

  // Animación
  if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

// Hook para sincronizar stores
export function useHistorySync() {
  const { setGraph } = useGraphStore();

  useEffect(() => {
    // Sincronizar estado del historial con el store principal
    const unsubscribe = useHistoryStore.subscribe((state) => {
      if (state.present) {
        setGraph(state.present.nodes, state.present.edges);
      }
    });

    return () => unsubscribe();
  }, [setGraph]);
}
