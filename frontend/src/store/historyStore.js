/**
 * store/historyStore.js - Sistema de Historial Undo/Redo tipo AutoCAD
 * Patrón past/present/future con debounce y checkpoints
 */

/* eslint-disable no-console */
import { create } from 'zustand';

// Configuración del historial
const MAX_HISTORY_SIZE = 50; // Máximo de estados guardados
const DEBOUNCE_MS = 300; // Debounce para guardar cambios

// Estado inicial
const initialState = {
  nodes: [],
  edges: [],
  config: null,
  results: null,
  selectedNode: null,
  selectedEdge: null
};

// Helper para crear snapshot inmutable
const createSnapshot = (state) => JSON.stringify({
  nodes: state.nodes,
  edges: state.edges,
  config: state.config,
  results: state.results
});

// Helper para parsear snapshot
const parseSnapshot = (snapshot) => JSON.parse(snapshot);

export const useHistoryStore = create((set, get) => ({
  // Historial
  past: [],
  present: initialState,
  future: [],

  // Estado de debounce
  debounceTimer: null,
  lastAction: null,

  // Checkpoint manual (guardar estado importante)
  checkpoint: () => {
    const { past, present } = get();
    const snapshot = createSnapshot(present);

    set({
      past: [...past, snapshot].slice(-MAX_HISTORY_SIZE),
      future: [] // Limpiar future al hacer checkpoint
    });

    console.log('[HISTORY] Checkpoint guardado');
  },

  // Guardar cambio con debounce (para evitar spam)
  saveChange: (changes, immediate = false) => {
    const { debounceTimer, present } = get();

    // Limpiar timer anterior
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Si es inmediato, guardar ahora
    if (immediate) {
      const snapshot = createSnapshot(present);

      set(state => ({
        past: [...state.past, snapshot].slice(-MAX_HISTORY_SIZE),
        present: { ...present, ...changes },
        future: [],
        debounceTimer: null
      }));

      return;
    }

    // Si no, debounce
    const newTimer = setTimeout(() => {
      const { past, present: currentPresent } = get();
      const snapshot = createSnapshot(currentPresent);

      set({
        past: [...past, snapshot].slice(-MAX_HISTORY_SIZE),
        present: { ...currentPresent, ...changes },
        future: [],
        debounceTimer: null
      });

      console.log('[HISTORY] Cambio guardado (debounce)');
    }, DEBOUNCE_MS);

    set({ debounceTimer: newTimer });
  },

  // Guardar estado completo (para acciones grandes)
  saveState: (newState) => {
    const { past, present } = get();
    const snapshot = createSnapshot(present);

    set({
      past: [...past, snapshot].slice(-MAX_HISTORY_SIZE),
      present: { ...present, ...newState },
      future: []
    });

    console.log('[HISTORY] Estado guardado');
  },

  // UNDO
  undo: () => {
    const { past, present, future, debounceTimer } = get();

    // Limpiar debounce pendiente
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    if (past.length === 0) {
      console.log('[HISTORY] No hay nada para deshacer');
      return false;
    }

    const previousSnapshot = past[past.length - 1];
    const previous = parseSnapshot(previousSnapshot);
    const currentSnapshot = createSnapshot(present);

    set({
      past: past.slice(0, -1),
      present: previous,
      future: [currentSnapshot, ...future].slice(0, MAX_HISTORY_SIZE),
      debounceTimer: null
    });

    console.log('[HISTORY] Undo realizado');
    return true;
  },

  // REDO
  redo: () => {
    const { past, present, future, debounceTimer } = get();

    // Limpiar debounce pendiente
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    if (future.length === 0) {
      console.log('[HISTORY] No hay nada para rehacer');
      return false;
    }

    const nextSnapshot = future[0];
    const next = parseSnapshot(nextSnapshot);
    const currentSnapshot = createSnapshot(present);

    set({
      past: [...past, currentSnapshot].slice(-MAX_HISTORY_SIZE),
      present: next,
      future: future.slice(1),
      debounceTimer: null
    });

    console.log('[HISTORY] Redo realizado');
    return true;
  },

  // Verificar si se puede hacer undo/redo
  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  // Obtener información del historial
  getHistoryInfo: () => {
    const { past, future } = get();
    return {
      undoCount: past.length,
      redoCount: future.length,
      canUndo: past.length > 0,
      canRedo: future.length > 0,
      maxHistory: MAX_HISTORY_SIZE
    };
  },

  // Limpiar historial
  clearHistory: () => {
    const { present } = get();

    set({
      past: [],
      present,
      future: []
    });

    console.log('[HISTORY] Historial limpiado');
  },

  // Resetear todo
  reset: () => {
    set({
      past: [],
      present: initialState,
      future: [],
      debounceTimer: null
    });
  }
}));

// Hook helper para usar con el store principal
export function useHistoryActions() {
  const history = useHistoryStore();

  return {
    undo: history.undo,
    redo: history.redo,
    checkpoint: history.checkpoint,
    canUndo: history.canUndo(),
    canRedo: history.canRedo(),
    historyInfo: history.getHistoryInfo()
  };
}
