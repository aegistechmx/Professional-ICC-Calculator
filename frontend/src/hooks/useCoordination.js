/**
 * hooks/useCoordination.js - Hook para auto-coordinación de protecciones
 * Integra motor de coordinación con el frontend
 */

/* eslint-disable no-console */
import { useState, useCallback } from 'react';

export default function useCoordination() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Ejecutar auto-coordinación
   */
  const autoCoordinate = useCallback(async (breakers, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/coordination/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ breakers, options })
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        return data.data;
      } else {
        throw new Error(data.error || 'Error en coordinación');
      }
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Analizar coordinación sin modificar
   */
  const analyze = useCallback(async (breakers, margin = 0.3) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/coordination/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ breakers, margin })
      });

      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtener sugerencias de ajuste
   */
  const getSuggestions = useCallback(async (breakers) => {
    try {
      const response = await fetch('/api/coordination/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ breakers })
      });

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (err) {
      return null;
    }
  }, []);

  /**
   * Análisis de sensibilidad
   */
  const sensitivityAnalysis = useCallback(async (breakers, margins = [0.2, 0.3, 0.4, 0.5]) => {
    try {
      const response = await fetch('/api/coordination/sensitivity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ breakers, margins })
      });

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (err) {
      return null;
    }
  }, []);

  /**
   * Aplicar cambios al sistema
   */
  const applyChanges = useCallback((breakers) => {
    // Aquí se integraría con el store del sistema
    console.log('[COORDINATION] Aplicando cambios:', breakers);

    // Retornar los breakers actualizados para que el caller los use
    return breakers;
  }, []);

  /**
   * Resetear resultado
   */
  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    result,
    loading,
    error,
    autoCoordinate,
    analyze,
    getSuggestions,
    sensitivityAnalysis,
    applyChanges,
    reset
  };
}
