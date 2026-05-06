import { useEffect, useRef, useState } from 'react';

/**
 * Hook para análisis ICC en vivo
 * Debounce + cancelación + cache por hash
 * @param {Object} systemModel - Modelo del sistema a analizar
 * @param {Object} options - Opciones de configuración
 * @param {number} options.delay - Delay de debounce en ms (default 250)
 * @returns {Object} { result, status, error }
 */
export function useLiveAnalysis(systemModel, { delay = 250 } = {}) {
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | running | error
  const [error, setError] = useState(null);

  const abortRef = useRef(null);
  const timerRef = useRef(null);
  const lastHashRef = useRef('');

  // hash simple para evitar recomputes idénticos
  const hash = JSON.stringify(systemModel);

  useEffect(() => {
    // Evitar recálculo si el hash no cambió
    if (hash === lastHashRef.current) return;

    // Debounce
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        setStatus('running');
        setError(null);

        // Cancela request previo
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(systemModel),
          signal: controller.signal
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Analyze failed');
        }

        const data = await res.json();

        lastHashRef.current = hash;
        setResult(data.data);
        setStatus('idle');
      } catch (e) {
        if (e.name === 'AbortError') return; // normal, request cancelado
        // eslint-disable-next-line no-console
        console.error('Live analysis error:', e);
        setError(e.message);
        setStatus('error');
      }
    }, delay);

    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, systemModel, delay]);

  return { result, status, error };
}
