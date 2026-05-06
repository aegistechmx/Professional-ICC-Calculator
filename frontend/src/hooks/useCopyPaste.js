/**
 * hooks/useCopyPaste.js - Hook para atajos de teclado Copiar/Pegar
 * Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+D, Delete - Funcionalidad tipo ETAP
 */

/* eslint-disable no-console */
import { useEffect, useState, useCallback } from 'react';
import { useGraphStore } from '../store/graphStore';
import {
  copySelection,
  pasteSelection,
  duplicateSelection,
  deleteSelection,
  selectConnected,
  resetPasteCount
} from '../utils/graphCopyPaste';

export function useCopyPaste(reactFlowInstance) {
  const {
    nodes,
    edges,
    setGraph,
    addNode,
    addEdge,
    removeNode,
    removeEdge,
    selectedNode,
    selectedEdge
  } = useGraphStore();

  const [clipboard, setClipboard] = useState(null);
  const [mousePosition, setMousePosition] = useState(null);

  // Track mouse position for paste at cursor
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (reactFlowInstance) {
        const position = reactFlowInstance.project({
          x: e.clientX,
          y: e.clientY
        });
        setMousePosition(position);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [reactFlowInstance]);

  // Keyboard shortcuts handler
  const handleKeyDown = useCallback((e) => {
    // Ignorar si estamos en un input o textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    const selectedIds = nodes.filter(n => n.selected).map(n => n.id);
    const hasSelection = selectedIds.length > 0;

    // COPY - Ctrl+C
    if (e.ctrlKey && e.key === 'c' && hasSelection) {
      e.preventDefault();
      const data = copySelection(nodes, edges, selectedIds);
      setClipboard(data);

      // Feedback visual
      showNotification(`Copiados ${data.nodes.length} nodos`);
      console.log('[COPY] Copiados:', data.nodes.length, 'nodos,', data.edges.length, 'conexiones');
    }

    // PASTE - Ctrl+V
    if (e.ctrlKey && e.key === 'v' && clipboard) {
      e.preventDefault();

      const viewport = reactFlowInstance?.getViewport();
      const result = pasteSelection(clipboard, nodes, edges, {
        viewport,
        mousePosition
      });

      setGraph(result.nodes, result.edges);

      // Feedback visual
      showNotification(`Pegados ${result.newIds.length} nodos`);
      console.log('[PASTE] Pegados:', result.newIds.length, 'nodos nuevos');
    }

    // CUT - Ctrl+X
    if (e.ctrlKey && e.key === 'x' && hasSelection) {
      e.preventDefault();
      const result = deleteSelection(nodes, edges, selectedIds);

      // Guardar en clipboard (cortar)
      setClipboard(result.clipboard);
      setGraph(result.nodes, result.edges);

      showNotification(`Cortados ${selectedIds.length} nodos`);
      console.log('[CUT] Cortados:', selectedIds.length, 'nodos');
    }

    // DUPLICATE - Ctrl+D
    if (e.ctrlKey && e.key === 'd' && hasSelection) {
      e.preventDefault();
      const result = duplicateSelection(nodes, edges, selectedIds);
      setGraph(result.nodes, result.edges);

      showNotification(`Duplicados ${result.newIds.length} nodos`);
      console.log('[DUPLICATE] Duplicados:', result.newIds.length, 'nodos');
    }

    // DELETE - Delete o Backspace
    if ((e.key === 'Delete' || e.key === 'Backspace') && hasSelection) {
      e.preventDefault();
      const result = deleteSelection(nodes, edges, selectedIds);
      setGraph(result.nodes, result.edges);

      showNotification(`Eliminados ${result.deletedIds.length} nodos`);
      console.log('[DELETE] Eliminados:', result.deletedIds.length, 'nodos');
    }

    // SELECT ALL - Ctrl+A
    if (e.ctrlKey && e.key === 'a') {
      e.preventDefault();
      const allNodes = nodes.map(n => ({ ...n, selected: true }));
      setGraph(allNodes, edges);
    }

    // SELECT CONNECTED - Ctrl+Shift+A (o doble click en un nodo)
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      if (selectedNode) {
        const connectedIds = selectConnected(nodes, edges, selectedNode.id);
        const newNodes = nodes.map(n => ({
          ...n,
          selected: connectedIds.includes(n.id)
        }));
        setGraph(newNodes, edges);

        showNotification(`Seleccionados ${connectedIds.length} nodos conectados`);
      }
    }

    // ESC - Deseleccionar todo
    if (e.key === 'Escape') {
      const clearedNodes = nodes.map(n => ({ ...n, selected: false }));
      const clearedEdges = edges.map(e => ({ ...e, selected: false }));
      setGraph(clearedNodes, clearedEdges);
    }

    // Ctrl+Z - Undo (placeholder, requiere implementación de history)
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      showNotification('Deshacer (requiere implementación de historial)');
    }

    // Ctrl+Shift+Z - Redo (placeholder)
    if (e.ctrlKey && e.shiftKey && e.key === 'z') {
      e.preventDefault();
      showNotification('Rehacer (requiere implementación de historial)');
    }

    // F5 - Recalcular manualmente
    if (e.key === 'F5') {
      e.preventDefault();
      const { calculateSystem } = useGraphStore.getState();
      calculateSystem();
      showNotification('Recalculando sistema...');
    }

  }, [nodes, edges, clipboard, mousePosition, reactFlowInstance, selectedNode, setGraph]);

  // Attach keyboard listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Context menu handlers (right-click)
  const handleContextMenu = useCallback((e, type, id) => {
    e.preventDefault();

    // Aquí podrías abrir un menú contextual
    console.log('[CONTEXT]', type, id);
  }, []);

  // Clipboard status
  const clipboardStatus = clipboard ? {
    hasData: true,
    nodes: clipboard.nodes?.length || 0,
    edges: clipboard.edges?.length || 0
  } : {
    hasData: false,
    nodes: 0,
    edges: 0
  };

  return {
    clipboard,
    clipboardStatus,
    handleContextMenu,
    canCopy: nodes.some(n => n.selected),
    canPaste: !!clipboard
  };
}

// Helper para notificaciones visuales simples
function showNotification(message) {
  // Crear elemento de notificación
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

  // Agregar animación CSS
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

  // Remover después de 3 segundos
  setTimeout(() => {
    notification.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
