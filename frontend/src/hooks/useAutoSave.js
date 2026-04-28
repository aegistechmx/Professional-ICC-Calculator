/* eslint-disable no-console */
import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

/**
 * Auto-save hook for projects
 * Automatically saves project to backend when nodes or edges change
 * @param {number} projectId - Project ID to save
 * @param {number} delay - Debounce delay in milliseconds (default: 2000)
 */
export function useAutoSave(projectId, delay = 2000) {
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);
  const saveSystem = useStore((state) => state.saveSystem);
  const timeoutRef = useRef(null);
  const isSavingRef = useRef(false);

  useEffect(() => {
    if (!projectId) return;

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(async () => {
      if (isSavingRef.current) return;

      isSavingRef.current = true;
      try {
        await saveSystem(`Project-${projectId}`);
        // Auto-save completed
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        isSavingRef.current = false;
      }
    }, delay);

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [nodes, edges, projectId, saveSystem, delay]);
}
