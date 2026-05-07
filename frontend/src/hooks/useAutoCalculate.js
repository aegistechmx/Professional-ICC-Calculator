/**
 * hooks/useAutoCalculate.js - Hook para Auto-Cálculo en Tiempo Real
 * Conexión automática con backend con debounce y soporte SSE
 */

/* eslint-disable no-console */
import { useEffect, useRef, useCallback } from 'react';
import { useGraphStore } from '../store/graphStore';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const DEBOUNCE_MS = 500; // 500ms debounce
const MIN_NODES = 2; // Mínimo de nodos para calcular
const MIN_EDGES = 1; // Mínimo de edges para calcular

export function useAutoCalculate(options = {}) {
  const {
    debounceMs = DEBOUNCE_MS,
    enabled = true,
    mode = 'engineering',
    realtime = true
  } = options;

  const {
    config,
    nodes,
    edges,
    results,
    loading,
    calculating,
    calculateSystem,
    calculateSystemRealtime,
    clearResults
  } = useGraphStore();

  const timeoutRef = useRef(null);
  const eventSourceRef = useRef(null);
  const lastCalculationRef = useRef(null);

  // Función principal de cálculo con debounce
  const triggerCalculation = useCallback(async () => {
    // Validar que tengamos datos suficientes
    if (!config || nodes.length < MIN_NODES || edges.length < MIN_EDGES) {
      return;
    }

    // Evitar cálculos duplicados
    const currentGraph = JSON.stringify({ nodes, edges, config });
    if (lastCalculationRef.current === currentGraph) {
      return;
    }

    try {
      if (realtime && enabled) {
        // Modo tiempo real
        await calculateSystemRealtime();
      } else {
        // Modo normal
        await calculateSystem({ mode });
      }

      lastCalculationRef.current = currentGraph;

    } catch (error) {
      console.error('[AUTO_CALC] Error en cálculo automático:', error.message);
    }
  }, [config, nodes, edges, calculateSystem, calculateSystemRealtime, enabled, realtime, mode]);

  // Debounce effect
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Limpiar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Configurar nuevo timeout
    timeoutRef.current = setTimeout(() => {
      triggerCalculation();
    }, debounceMs);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [nodes, edges, config, triggerCalculation, debounceMs, enabled]);

  // Server-Sent Events para actualizaciones en tiempo real
  useEffect(() => {
    if (!realtime || !enabled) {
      return;
    }

    // Crear conexión SSE
    const eventSource = new EventSource(`${API_BASE}/api/system/realtime/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('[AUTO_CALC] Conexión SSE establecida');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'result') {
          console.log('[AUTO_CALC] Resultado recibido via SSE');
          // El resultado se actualiza automáticamente en el store
        } else if (data.type === 'connected') {
          console.log('[AUTO_CALC] SSE conectado');
        }
      } catch (error) {
        console.error('[AUTO_CALC] Error procesando mensaje SSE:', error.message);
      }
    };

    eventSource.onerror = (error) => {
      console.error('[AUTO_CALC] Error en conexión SSE:', error);
      eventSource.close();
    };

    // Cleanup
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [realtime, enabled]);

  // Forzar cálculo manual
  const forceCalculation = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    await triggerCalculation();
  }, [triggerCalculation]);

  // Limpiar cálculo anterior
  const clearPreviousCalculation = useCallback(() => {
    clearResults();
    lastCalculationRef.current = null;
  }, [clearResults]);

  // Obtener estado del cálculo
  const getCalculationStatus = useCallback(() => {
    return {
      canCalculate: config && nodes.length >= MIN_NODES && edges.length >= MIN_EDGES,
      isCalculating: calculating || loading,
      hasResults: !!results,
      lastCalculation: results?.metadata?.timestamp || null,
      mode: results?.metadata?.mode || mode,
      realtime: realtime && enabled
    };
  }, [config, nodes, edges, calculating, loading, results, mode, realtime, enabled]);

  // Obtener estadísticas del sistema
  const getSystemStats = useCallback(() => {
    return {
      nodes: nodes.length,
      edges: edges.length,
      sources: nodes.filter(n => n.type === 'source').length,
      loads: nodes.filter(n => n.type === 'load').length,
      transformers: nodes.filter(n => n.type === 'transformer').length,
      breakers: nodes.filter(n => n.type === 'breaker').length,
      buses: nodes.filter(n => n.type === 'bus').length,
      configured: !!config,
      calculated: !!results,
      loading: loading || calculating
    };
  }, [nodes, edges, config, results, loading, calculating]);

  // Validar sistema
  const validateSystem = useCallback(() => {
    const errors = [];
    const warnings = [];

    if (!config) {
      errors.push('Configuración del proyecto no definida');
    }

    if (nodes.length === 0) {
      errors.push('No hay nodos en el sistema');
    } else {
      const sources = nodes.filter(n => n.type === 'source');
      const loads = nodes.filter(n => n.type === 'load');

      if (sources.length === 0) {
        errors.push('No hay fuentes de alimentación');
      }

      if (loads.length === 0) {
        warnings.push('No hay cargas definidas');
      }
    }

    if (edges.length === 0) {
      errors.push('No hay conexiones en el sistema');
    }

    // Validar voltajes
    if (config?.voltajeBase) {
      const voltage = config.voltajeBase;
      if (voltage < 120 || voltage > 35000) {
        warnings.push(`Voltaje base (${voltage}V) fuera de rango típico (120-35000V)`);
      }
    }

    // Validar temperatura
    if (config?.tempAmbiente) {
      const temp = config.tempAmbiente;
      if (temp < -40 || temp > 60) {
        warnings.push(`Temperatura ambiente (${temp}°C) fuera de rango normal (-40 a 60°C)`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      canCalculate: errors.length === 0 && nodes.length >= MIN_NODES && edges.length >= MIN_EDGES
    };
  }, [config, nodes, edges]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    // Estado
    enabled,
    calculating,
    loading,
    results,

    // Acciones
    forceCalculation,
    clearPreviousCalculation,

    // Información
    getCalculationStatus,
    getSystemStats,
    validateSystem,

    // Configuración
    debounceMs,
    mode,
    realtime
  };
}

// Hook simplificado para cálculo manual
export function useManualCalculate() {
  const { calculateSystem, config, nodes, edges, loading, results } = useGraphStore();

  const calculate = useCallback(async (options = {}) => {
    if (!config) {
      throw new Error('Configuración del proyecto no definida');
    }

    if (nodes.length === 0) {
      throw new Error('No hay nodos en el sistema');
    }

    if (edges.length === 0) {
      throw new Error('No hay conexiones en el sistema');
    }

    return await calculateSystem(options);
  }, [calculateSystem, config, nodes, edges]);

  return {
    calculate,
    loading,
    results,
    canCalculate: config && nodes.length > 0 && edges.length > 0
  };
}

// Hook para monitoreo de cálculos en tiempo real
export function useCalculationMonitor() {
  const { results, loading, error, lastCalculationTime } = useGraphStore();

  const getMetrics = useCallback(() => {
    return {
      lastCalculation: lastCalculationTime,
      loading,
      hasResults: !!results,
      hasError: !!error,
      calculationTime: results?.metadata?.timestamp ?
        new Date() - new Date(results.metadata.timestamp) : null,
      mode: results?.metadata?.mode,
      cached: results?.cached || false
    };
  }, [results, loading, error, lastCalculationTime]);

  return {
    metrics: getMetrics(),
    isHealthy: !!results && !loading && !error,
    lastResult: results,
    isLoading: loading,
    hasError: !!error
  };
}
