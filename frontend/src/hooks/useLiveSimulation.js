import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

/**
 * Live simulation hook
 * Automatically runs simulation when nodes or edges change
 * Updates nodes with ICC values in real-time
 * @param {number} delay - Debounce delay in milliseconds (default: 300)
 */
export default function useLiveSimulation(delay = 300) {
  const { nodes, edges, setNodes } = useStore();
  const timeoutRef = useRef(null);
  const isSimulatingRef = useRef(false);

  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout with debounce
    timeoutRef.current = setTimeout(async () => {
      if (isSimulatingRef.current) return;

      isSimulatingRef.current = true;
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
        
        const res = await fetch(`${API_BASE}/simulacion/live`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ nodes, edges })
        });

        if (!res.ok) {
          throw new Error('Simulation failed');
        }

        const data = await res.json();

        // Update nodes with ICC values and trip status
        const updated = nodes.map(n => ({
          ...n,
          data: {
            ...n.data,
            icc: data.icc?.[n.id] || null,
            trip: data.trip?.[n.id] || false
          }
        }));

        setNodes(updated);
        console.log('Live simulation completed');
      } catch (error) {
        console.error('Live simulation error:', error);
      } finally {
        isSimulatingRef.current = false;
      }
    }, delay);

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [nodes, edges, setNodes, delay]);
}
