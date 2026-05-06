/**
 * Frontend-Backend Integration Example
 * Cómo conectar el frontend (localhost:5173) con el backend (localhost:3001)
 * usando el modelo de grafos para sistemas eléctricos
 */

import { useState, useRef, useEffect } from 'react';

// ========================================
// FRONTEND SIDE (localhost:5173)
// ========================================

/**
 * Servicio de API para comunicarse con el backend
 */
class ElectricalSystemAPI {
  constructor() {
    this.baseURL = 'http://localhost:3001';
    this.currentController = null; // para cancelar requests anteriores
  }

  /**
   * Calcular sistema eléctrico basado en grafos
   */
  async calculateSystem(graph, options = {}) {
    // Cancelar request anterior si existe
    if (this.currentController) {
      this.currentController.abort();
      console.log('⏹️ Request anterior cancelado');
    }

    const queryParams = new URLSearchParams();

    if (options.mode) queryParams.append('mode', options.mode);
    if (options.saveStudy) queryParams.append('saveStudy', 'true');
    if (options.async) queryParams.append('async', 'true');

    const url = `${this.baseURL}/api/system${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

    try {
      console.log('[FRONTEND] Sending graph to backend:', {
        nodes: graph.nodes.length,
        edges: graph.edges.length,
        url
      });

      // 1. NORMALIZAR (FUERA del fetch)
      const normalizedGraph = {
        nodes: graph.nodes.map(n => {
          const base = n.data ? n.data : n;   // soporta ambos formatos
          return {
            id: n.id,
            type: n.type,
            // Smart defaults
            voltaje: base.voltaje || 480,
            I_carga: base.I_carga || 0,
            longitud: base.longitud || 10,
            ...base
          };
        }),

        edges: graph.edges.map(e => ({
          ...e,
          source: e.source || e.from,
          target: e.target || e.to,
          impedancia: e.impedance || e.impedancia
        })),

        configuracion: graph.configuracion
      };

      // Validación dura (evita cálculos basura)
      const errors = [];
      normalizedGraph.nodes.forEach(n => {
        if (n.type === 'source' && !n.voltaje) {
          errors.push(`Fuente ${n.id} sin voltaje`);
        }
        if (n.type === 'load' && !n.I_carga) {
          errors.push(`Carga ${n.id} sin I_carga`);
        }
      });

      if (errors.length) {
        console.error('❌ Validación fallida:', errors);
        throw new Error(errors.join(' | '));
      }

      console.log('🚀 NORMALIZED GRAPH:', normalizedGraph);

      // Test rápida: verificar valores reales
      normalizedGraph.nodes.forEach(n => {
        console.log('Nodo:', n.id, 'V:', n.voltaje, 'I:', n.I_carga);
      });
      normalizedGraph.edges.forEach(e => {
        console.log('Edge:', e.source, '→', e.target, 'Z:', e.impedancia);
      });

      // 2. FETCH con timeout (AbortController)
      const controller = new AbortController();
      this.currentController = controller; // guardar para cancelación futura
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(normalizedGraph),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Calculation failed');
      }

      const data = await response.json();
      console.log('[FRONTEND] Received results from backend:', data.success);

      return data;

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('⏹️ Request cancelado por nuevo cálculo');
        return null;
      }
      console.error('[FRONTEND] API Error:', error.message);
      throw error;
    } finally {
      this.currentController = null;
    }
  }

  /**
   * Obtener información del endpoint
   */
  async getSystemInfo() {
    const response = await fetch(`${this.baseURL}/api/system`);
    return await response.json();
  }
}

// ========================================
// EJEMPLO DE USO EN REACT
// ========================================

/**
 * Hook personalizado para cálculo de sistemas eléctricos
 */
function useElectricalSystem() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const apiRef = useRef(new ElectricalSystemAPI()); // cache API instance

  /**
   * Calcular sistema eléctrico
   */
  const calculateSystem = async (graph, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiRef.current.calculateSystem(graph, options);
      if (data === null) {
        // Request fue cancelado, no actualizar estado
        return null;
      }
      setResults(data);
      return data;
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('⏹️ Request cancelado');
        return null;
      }
      setError({
        message: err.message,
        type: 'calculation',
        timestamp: Date.now()
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { calculateSystem, loading, results, error };
}

/**
 * Componente React para diseño de sistemas eléctricos
 */
function ElectricalSystemDesigner() {
  const [graph, setGraph] = useState({
    nodes: [
      { id: 'N1', type: 'source', voltaje: 480 },
      { id: 'N2', type: 'load', I_carga: 150, longitud: 30 }
    ],
    edges: [
      { from: 'N1', to: 'N2', impedance: 0.05 }
    ],
    configuracion: {
      norma: 'NOM',
      material: 'cobre',
      tempAislamiento: 75
    }
  });

  const { calculateSystem, loading, results, error } = useElectricalSystem();
  const lastHashRef = useRef(null); // para evitar recálculos innecesarios

  // Auto-cálculo en tiempo real con hash
  useEffect(() => {
    const timeout = setTimeout(() => {
      const hash = JSON.stringify(graph);

      if (hash === lastHashRef.current) {
        console.log('⏭️ Sin cambios, no recalcula');
        return;
      }

      lastHashRef.current = hash;

      if (graph.nodes.length > 0 && graph.edges.length > 0) {
        calculateSystem(graph, { mode: 'engineering' });
      }
    }, 500); // 500ms de debounce

    return () => clearTimeout(timeout);
  }, [graph]);

  /**
   * Agregar nodo al grafo
   */
  const addNode = (type, data) => {
    const newNode = {
      id: `N${Date.now()}`,
      type,
      ...data
    };

    setGraph(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));
  };

  /**
   * Agregar edge al grafo
   */
  const addEdge = (from, to, impedance) => {
    const newEdge = { from, to, impedance };

    setGraph(prev => ({
      ...prev,
      edges: [...prev.edges, newEdge]
    }));
  };

  /**
   * Actualizar configuración
   */
  const updateConfig = (config) => {
    setGraph(prev => ({
      ...prev,
      configuracion: { ...prev.configuracion, ...config }
    }));
  };

  return (
    <div className="electrical-system-designer">
      <div className="controls">
        <h2>Controles del Sistema</h2>

        {/* Agregar nodos */}
        <div className="node-controls">
          <button onClick={() => addNode('source', { voltaje: 480 })}>
            Agregar Fuente (480V)
          </button>
          <button onClick={() => addNode('load', { I_carga: 100, longitud: 50 })}>
            Agregar Carga (100A)
          </button>
        </div>

        {/* Configuración */}
        <div className="config-controls">
          <label>
            Material:
            <select
              value={graph.configuracion.material}
              onChange={(e) => updateConfig({ material: e.target.value })}
            >
              <option value="cobre">Cobre</option>
              <option value="aluminio">Aluminio</option>
            </select>
          </label>

          <label>
            Norma:
            <select
              value={graph.configuracion.norma}
              onChange={(e) => updateConfig({ norma: e.target.value })}
            >
              <option value="NOM">NOM</option>
              <option value="IEEE">IEEE</option>
              <option value="IEC">IEC</option>
            </select>
          </label>
        </div>
      </div>

      {/* Área del diagrama */}
      <div className="diagram-area">
        <h2>Diagrama del Sistema</h2>
        <ElectricalDiagram
          graph={graph}
          onAddEdge={addEdge}
          onUpdateNode={(nodeId, data) => {
            setGraph(prev => ({
              ...prev,
              nodes: prev.nodes.map(node =>
                node.id === nodeId ? { ...node, ...data } : node
              )
            }));
          }}
        />
      </div>

      {/* Resultados */}
      <div className="results">
        <h2>Resultados del Cálculo</h2>

        {loading && <div className="loading">Calculando...</div>}

        {error && (
          <div className="error">
            ⚠️ {error.message || error}
          </div>
        )}

        {results && (
          <div className="results-content">
            <h3>Resultados Principales</h3>
            <div className="result-item">
              <label>Ampacidad Final:</label>
              <span>{results.data?.results?.ampacidad?.I_final || 'N/A'} A</span>
            </div>
            <div className="result-item">
              <label>Conductor:</label>
              <span>{results.data?.results?.conductor?.calibre || 'N/A'}</span>
            </div>
            <div className="result-item">
              <label>Corto Circuito:</label>
              <span>{results.data?.results?.shortCircuit?.Icc || 'N/A'} A</span>
            </div>
            <div className="result-item">
              <label>Caída de Tensión:</label>
              <span>{results.data?.results?.caida?.porcentaje || 'N/A'}%</span>
            </div>
            <div className="result-item">
              <label>Validación NOM:</label>
              <span className={results.data?.results?.validation?.ok ? 'valid' : 'invalid'}>
                {results.data?.results?.validation?.ok ? 'OK' : 'ERROR'}
              </span>
            </div>

            <h3>Análisis por Nodos</h3>
            {results.data?.graphAnalysis?.nodes?.map(node => (
              <div key={node.id} className="node-result">
                <h4>Nodo {node.id} ({node.type})</h4>
                <div className="node-data">
                  {Object.entries(node.calculatedData).map(([key, value]) => (
                    <div key={key} className="data-item">
                      <label>{key}:</label>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ========================================
// EJEMPLO DE GRAFO COMPLETO
// ========================================

/**
 * Ejemplo de un sistema eléctrico completo
 */
const completeSystemExample = {
  nodes: [
    {
      id: 'SOURCE',
      type: 'source',
      voltaje: 480,
      name: 'Fuente Principal'
    },
    {
      id: 'BREAKER1',
      type: 'breaker',
      name: 'Breaker Principal'
    },
    {
      id: 'BUS1',
      type: 'bus',
      name: 'Barra Principal'
    },
    {
      id: 'LOAD1',
      type: 'load',
      I_carga: 150,
      longitud: 25,
      name: 'Carga 1 - Motor'
    },
    {
      id: 'LOAD2',
      type: 'load',
      I_carga: 75,
      longitud: 15,
      name: 'Carga 2 - Alumbrado'
    },
    {
      id: 'LOAD3',
      type: 'load',
      I_carga: 100,
      longitud: 35,
      name: 'Carga 3 - HVAC'
    }
  ],
  edges: [
    {
      from: 'SOURCE',
      to: 'BREAKER1',
      impedance: 0.01,
      length: 5
    },
    {
      from: 'BREAKER1',
      to: 'BUS1',
      impedance: 0.02,
      length: 10
    },
    {
      from: 'BUS1',
      to: 'LOAD1',
      impedance: 0.05,
      length: 25
    },
    {
      from: 'BUS1',
      to: 'LOAD2',
      impedance: 0.08,
      length: 15
    },
    {
      from: 'BUS1',
      to: 'LOAD3',
      impedance: 0.06,
      length: 35
    }
  ],
  configuracion: {
    norma: 'NOM',
    material: 'cobre',
    tempAislamiento: 75,
    tempAmbiente: 30,
    nConductores: 3,
    paralelos: 1,
    tempTerminal: 75
  }
};

// ========================================
// FUNCIÓN DE USO RÁPIDO
// ========================================

/**
 * Función para probar la integración rápidamente
 */
async function testIntegration() {
  const api = new ElectricalSystemAPI();

  try {
    console.log('=== TESTING FRONTEND-BACKEND INTEGRATION ===');

    // 1. Obtener información del endpoint
    console.log('1. Getting system info...');
    const info = await api.getSystemInfo();
    console.log('System info:', info.data.description);

    // 2. Enviar sistema simple
    console.log('\\n2. Testing simple system...');
    const simpleResult = await api.calculateSystem({
      nodes: [
        { id: 'N1', type: 'source', voltaje: 480 },
        { id: 'N2', type: 'load', I_carga: 150, longitud: 30 }
      ],
      edges: [
        { from: 'N1', to: 'N2', impedance: 0.05 }
      ],
      configuracion: { norma: 'NOM' }
    }, { mode: 'engineering' });

    console.log('Simple system result:', simpleResult.success);
    console.log('Ampacidad:', simpleResult.data?.results?.ampacidad?.I_final);

    // 3. Enviar sistema completo
    console.log('\\n3. Testing complete system...');
    const completeResult = await api.calculateSystem(completeSystemExample, {
      mode: 'engineering',
      saveStudy: true
    });

    console.log('Complete system result:', completeResult.success);
    console.log('Study ID:', completeResult.data?.studyId);

    console.log('\\n=== INTEGRATION TEST COMPLETED SUCCESSFULLY ===');

  } catch (error) {
    console.error('Integration test failed:', error.message);
  }
}

// Exportar para uso
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ElectricalSystemAPI,
    completeSystemExample,
    testIntegration
  };
}

// Nota: Este código es para el frontend. 
// Para usarlo en React, copia los componentes y hooks correspondientes.
