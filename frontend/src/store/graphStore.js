/**
 * store/graphStore.js - Estado Global para Sistema Eléctrico por Grafos
 * Zustand store optimizado para el flujo de backend /api/system
 */

/* eslint-disable no-console */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  getFlowStatus,
  simulateFaultPropagation,
  generateTCCTimeCurrentCurve,
  getTCCStatus,
  curvesOverlap
} from '../utils/simulationEngine.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Helper para guardar en localStorage
const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
};

// Helper para cargar desde localStorage
const loadFromStorage = (key, defaultValue) => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    const parsed = JSON.parse(item);
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

// Estado inicial
const initialNodes = loadFromStorage('graph-nodes', []);
const initialEdges = loadFromStorage('graph-edges', []);

export const useGraphStore = create(
  persist(
    (set, get) => ({
      // Configuración del proyecto
      config: null,

      // Estructura del grafo
      nodes: initialNodes,
      edges: initialEdges,

      // Resultados del cálculo
      results: null,
      loading: false,
      error: null,

      // Estado del cálculo en tiempo real
      calculating: false,
      lastCalculationTime: null,

      // === SIMULATION ENGINE STATE ===
      simulation: {
        // Estado actual de simulación
        fault: null,           // ID del nodo en falla
        flows: [],            // Flujos de corriente activos
        status: {},           // Status semáforo por nodo: { nodeId: 'green'|'yellow'|'red'|'gray' }
        particles: [],        // Partículas activas para animación
        breakerTrips: [],     // Breakers que han tripeado (legacy)
        breakers: {},         // Estado detallado de breakers: { breakerId: { status, tripTime, position } }
        propagation: [],      // Propagación de falla
        tccCurves: {},        // Curvas TCC dinámicas
        coordination: {},     // Estado de coordinación
        lastUpdate: null      // Timestamp de última actualización
      },

      // Estado de UI interactiva
      ui: {
        selectedNode: null,
        selectedEdge: null,
        hoveredNode: null,
        showFlows: true,
        showParticles: true,
        showTCC: false,
        animationSpeed: 1.0,
        gridSnap: true,
        autoLayout: false
      },

      // Configuración del proyecto
      setConfig: (config) => set({ config }),

      // Manejo del grafo
      setGraph: (nodes, edges) => {
        set({ nodes, edges });
        saveToStorage('graph-nodes', nodes);
        saveToStorage('graph-edges', edges);
      },

      addNode: (node) => {
        const { nodes } = get();
        const newNodes = [...nodes, node];
        set({ nodes: newNodes });
        saveToStorage('graph-nodes', newNodes);
      },

      updateNode: (nodeId, data) => {
        const { nodes } = get();
        const newNodes = nodes.map(node =>
          node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
        );
        set({ nodes: newNodes });
        saveToStorage('graph-nodes', newNodes);
      },

      removeNode: (nodeId) => {
        const { nodes, edges } = get();
        const newNodes = nodes.filter(node => node.id !== nodeId);
        const newEdges = edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId);

        set({ nodes: newNodes, edges: newEdges });
        saveToStorage('graph-nodes', newNodes);
        saveToStorage('graph-edges', newEdges);
      },

      addEdge: (edge) => {
        const { edges } = get();
        const newEdges = [...edges, edge];
        set({ edges: newEdges });
        saveToStorage('graph-edges', newEdges);
      },

      updateEdge: (edgeId, data) => {
        const { edges } = get();
        const newEdges = edges.map(edge =>
          edge.id === edgeId ? { ...edge, data: { ...edge.data, ...data } } : edge
        );
        set({ edges: newEdges });
        saveToStorage('graph-edges', newEdges);
      },

      removeEdge: (edgeId) => {
        const { edges } = get();
        const newEdges = edges.filter(edge => edge.id !== edgeId);
        set({ edges: newEdges });
        saveToStorage('graph-edges', newEdges);
      },

      // Construir payload para backend
      buildGraphPayload: () => {
        const { nodes, edges, config } = get();

        return {
          nodes: nodes.map(node => ({
            id: node.id,
            type: node.type,
            voltaje: node.data?.voltaje,
            I_carga: node.data?.I_carga,
            longitud: node.data?.longitud,
            name: node.data?.label || node.id
          })),
          edges: edges.map(edge => ({
            from: edge.source,
            to: edge.target,
            impedance: edge.data?.impedance || 0.05,
            length: edge.data?.length || 10
          })),
          configuracion: {
            norma: config?.norma || 'NOM-001-SEDE-2012',
            material: config?.material || 'cobre',
            tempAislamiento: config?.tempAislamiento || 75,
            tempAmbiente: config?.tempAmbiente || 30,
            nConductores: config?.nConductores || 3,
            paralelos: config?.paralelos || 1,
            tempTerminal: config?.tempTerminal || 75,
            voltajeBase: config?.voltajeBase || 480,
            sistema: config?.sistema || '3F-4H',
            frecuencia: config?.frecuencia || 60
          }
        };
      },

      // Calcular sistema completo
      calculateSystem: async (options = {}) => {
        const { config, nodes, edges } = get();

        if (!config) {
          throw new Error('Configuración del proyecto no definida');
        }

        if (nodes.length === 0) {
          throw new Error('No hay nodos en el sistema');
        }

        if (edges.length === 0) {
          throw new Error('No hay conexiones en el sistema');
        }

        set({ loading: true, calculating: true, error: null });

        try {
          const payload = get().buildGraphPayload();

          console.log('[STORE] Enviando grafo al backend:', {
            nodes: payload.nodes.length,
            edges: payload.edges.length,
            mode: options.mode || 'engineering'
          });

          const response = await fetch(`${API_BASE}/api/system`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            throw new Error(data.error || 'Error en el cálculo del sistema');
          }

          set({
            results: data,
            loading: false,
            calculating: false,
            lastCalculationTime: new Date().toISOString(),
            error: null
          });

          console.log('[STORE] Cálculo completado exitosamente');
          return data;

        } catch (error) {
          const errorMessage = error.message || 'Error al calcular sistema';

          set({
            loading: false,
            calculating: false,
            error: errorMessage
          });

          console.error('[STORE] Error en cálculo:', errorMessage);
          throw new Error(errorMessage);
        }
      },

      // Cálculo en tiempo real (con debounce)
      calculateSystemRealtime: async () => {
        const { config, nodes, edges } = get();

        if (!config || nodes.length === 0 || edges.length === 0) {
          return;
        }

        try {
          const payload = get().buildGraphPayload();

          const response = await fetch(`${API_BASE}/api/system/realtime`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-ID': 'default'
            },
            body: JSON.stringify(payload)
          });

          const data = await response.json();

          if (data.success) {
            console.log('[STORE] Cálculo en tiempo real iniciado');
          }

        } catch (error) {
          console.warn('[STORE] Error en cálculo en tiempo real:', error.message);
        }
      },

      // Obtener resultado de cálculo en tiempo real
      getRealtimeResult: async (graphHash) => {
        try {
          const response = await fetch(`${API_BASE}/api/system/realtime/${graphHash}`);
          const data = await response.json();

          if (data.success && data.data.status === 'completed') {
            set({ results: data });
          }

          return data;

        } catch (error) {
          console.warn('[STORE] Error obteniendo resultado en tiempo real:', error.message);
          return null;
        }
      },

      // Limpiar resultados
      clearResults: () => set({
        results: null,
        error: null,
        lastCalculationTime: null
      }),

      // Resetear todo el store
      reset: () => {
        set({
          config: null,
          nodes: [],
          edges: [],
          results: null,
          loading: false,
          error: null,
          calculating: false,
          lastCalculationTime: null
        });

        // Limpiar localStorage
        localStorage.removeItem('graph-nodes');
        localStorage.removeItem('graph-edges');
      },

      // Exportar proyecto
      exportProject: (filename = 'electrical-system') => {
        const { config, nodes, edges, results } = get();

        const projectData = {
          version: '2.0',
          exportedAt: new Date().toISOString(),
          config,
          nodes,
          edges,
          results,
          metadata: {
            name: config?.proyecto || 'Sistema Eléctrico',
            nodes: nodes.length,
            edges: edges.length,
            calculated: !!results
          }
        };

        const blob = new Blob([JSON.stringify(projectData, null, 2)], {
          type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        return { success: true };
      },

      // Importar proyecto
      importProject: async (file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();

          reader.onload = (event) => {
            try {
              const projectData = JSON.parse(event.target.result);

              if (!projectData.nodes || !projectData.edges) {
                throw new Error('Archivo inválido: no contiene nodos o conexiones');
              }

              set({
                config: projectData.config || null,
                nodes: projectData.nodes || [],
                edges: projectData.edges || [],
                results: projectData.results || null
              });

              // Guardar en localStorage
              saveToStorage('graph-nodes', projectData.nodes || []);
              saveToStorage('graph-edges', projectData.edges || []);

              resolve({ success: true, data: projectData });

            } catch (error) {
              reject(new Error(`Error al importar: ${error.message}`));
            }
          };

          reader.onerror = () => {
            reject(new Error('Error al leer archivo'));
          };

          reader.readAsText(file);
        });
      },

      // Obtener estadísticas del sistema
      getSystemStats: () => {
        const { config, nodes, edges, results } = get();

        return {
          project: {
            name: config?.proyecto || 'Sin nombre',
            norma: config?.norma || 'NOM-001-SEDE-2012',
            voltaje: config?.voltajeBase || 480
          },
          topology: {
            totalNodes: nodes.length,
            totalEdges: edges.length,
            sources: nodes.filter(n => n.type === 'source').length,
            loads: nodes.filter(n => n.type === 'load').length,
            transformers: nodes.filter(n => n.type === 'transformer').length
          },
          calculation: {
            calculated: !!results,
            lastCalculation: results?.metadata?.timestamp || null,
            mode: results?.metadata?.mode || 'none'
          }
        };
      },

      // === SIMULATION ENGINE ACTIONS ===

      // Actualizar estado de simulación
      updateSimulation: (simulationData) => set((state) => ({
        simulation: {
          ...state.simulation,
          ...simulationData,
          lastUpdate: new Date().toISOString()
        }
      })),

      // Calcular flujos de corriente (frontend simulation)
      calculateFlows: () => {
        const { edges, results } = get();

        if (!results || !results.flujos) {
          return [];
        }

        const flows = edges.map(edge => {
          const edgeResult = results.flujos.find(f =>
            f.from === edge.source && f.to === edge.target
          );

          return {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            current: edgeResult?.I || 0,
            voltage: edgeResult?.V || 0,
            power: edgeResult?.P || 0,
            direction: edgeResult?.I >= 0 ? 'forward' : 'reverse',
            percentage: edgeResult?.I ? Math.abs(edgeResult.I) / 100 : 0,
            status: getFlowStatus(edgeResult?.I || 0)
          };
        });

        set(state => ({
          simulation: {
            ...state.simulation,
            flows,
            lastUpdate: new Date().toISOString()
          }
        }));

        return flows;
      },

      // Calcular status semáforo de nodos
      calculateNodeStatus: () => {
        const { nodes, results, simulation } = get();
        const status = {};

        nodes.forEach(node => {
          const nodeResult = results?.nodos?.find(n => n.id === node.id);
          const current = nodeResult?.I || 0;
          const voltage = nodeResult?.V || 0;

          // Status basado en carga y condiciones
          if (simulation.fault === node.id) {
            status[node.id] = 'red'; // Nodo en falla
          } else if (simulation.breakerTrips.includes(node.id)) {
            status[node.id] = 'orange'; // Breaker tripeado
          } else if (current > (node.data?.Imax || 100)) {
            status[node.id] = 'red'; // Sobrecarga
          } else if (current > (node.data?.I_nominal || 50)) {
            status[node.id] = 'yellow'; // Carga elevada
          } else if (voltage < (node.data?.V_nominal * 0.9 || 432)) {
            status[node.id] = 'yellow'; // Baja tensión
          } else if (current > 0) {
            status[node.id] = 'green'; // Normal con carga
          } else {
            status[node.id] = 'gray'; // Sin carga
          }
        });

        set(state => ({
          simulation: {
            ...state.simulation,
            status,
            lastUpdate: new Date().toISOString()
          }
        }));

        return status;
      },

      // Simular falla en tiempo real
      triggerFault: (nodeId) => {
        const { nodes, edges, results } = get();

        // Propagar falla upstream
        const propagation = simulateFaultPropagation(nodeId, nodes, edges, results);

        set(state => ({
          simulation: {
            ...state.simulation,
            fault: nodeId,
            propagation,
            lastUpdate: new Date().toISOString()
          }
        }));

        return propagation;
      },

      // Limpiar falla
      clearFault: () => set(state => ({
        simulation: {
          ...state.simulation,
          fault: null,
          propagation: [],
          breakerTrips: [],
          lastUpdate: new Date().toISOString()
        }
      })),

      // Trip de breaker (nuevo sistema con estado detallado)
      tripBreaker: (breakerId, delay = 0) => {
        setTimeout(() => {
          set(state => ({
            simulation: {
              ...state.simulation,
              breakerTrips: [...state.simulation.breakerTrips, breakerId], // Legacy
              breakers: {
                ...state.simulation.breakers,
                [breakerId]: {
                  status: 'tripped',
                  tripTime: performance.now(),
                  position: state.nodes.find(n => n.id === breakerId)?.position || { x: 0, y: 0 }
                }
              },
              lastUpdate: new Date().toISOString()
            }
          }));
        }, delay * 1000);
      },

      // Reset breaker (manual o automático)
      resetBreaker: (breakerId) => {
        set(state => ({
          simulation: {
            ...state.simulation,
            breakerTrips: state.simulation.breakerTrips.filter(id => id !== breakerId),
            breakers: {
              ...state.simulation.breakers,
              [breakerId]: {
                status: 'closed',
                tripTime: null,
                position: state.nodes.find(n => n.id === breakerId)?.position || { x: 0, y: 0 }
              }
            },
            lastUpdate: new Date().toISOString()
          }
        }));
      },

      // Reset todos los breakers
      resetAllBreakers: () => {
        const { nodes } = get();
        const breakerNodes = nodes.filter(n => n.type === 'breaker');
        const resetBreakers = {};

        breakerNodes.forEach(breaker => {
          resetBreakers[breaker.id] = {
            status: 'closed',
            tripTime: null,
            position: breaker.position || { x: 0, y: 0 }
          };
        });

        set(state => ({
          simulation: {
            ...state.simulation,
            breakerTrips: [],
            breakers: resetBreakers,
            lastUpdate: new Date().toISOString()
          }
        }));
      },

      // Obtener estado de breaker
      getBreakerStatus: (breakerId) => {
        return get().simulation.breakers[breakerId]?.status || 'closed';
      },

      // Verificar si edge está bloqueado por breaker
      isEdgeBlocked: (edgeId) => {
        const { edges, nodes, simulation } = get();
        const edge = edges.find(e => e.id === edgeId);
        if (!edge) return false;

        // Buscar breaker en este edge
        const breakerNodes = nodes.filter(n => n.type === 'breaker');
        const edgeBreaker = breakerNodes.find(breaker =>
          (breaker.id === edge.source || breaker.id === edge.target) ||
          edge.data?.breaker === breaker.id
        );

        if (!edgeBreaker) return false;

        const breakerStatus = simulation.breakers[edgeBreaker.id]?.status;
        return breakerStatus === 'tripped';
      },

      // Actualizar partículas para animación
      updateParticles: (particles) => set(state => ({
        simulation: {
          ...state.simulation,
          particles,
          lastUpdate: new Date().toISOString()
        }
      })),

      // Generar curvas TCC dinámicas
      generateTCCCurves: () => {
        const { nodes, results } = get();
        const tccCurves = {};

        const breakerNodes = nodes.filter(n => n.type === 'breaker');

        breakerNodes.forEach(breaker => {
          const nodeResult = results?.nodos?.find(n => n.id === breaker.id);
          const pickup = breaker.data?.pickup || 100;
          const inst = breaker.data?.instantaneous || 800;

          tccCurves[breaker.id] = {
            type: breaker.data?.curve || 'IEC',
            pickup,
            inst,
            current: nodeResult?.I || 0,
            curve: generateTCCTimeCurrentCurve(pickup, inst, breaker.data?.curve || 'IEC'),
            status: getTCCStatus(nodeResult?.I || 0, pickup, inst)
          };
        });

        set(state => ({
          simulation: {
            ...state.simulation,
            tccCurves,
            lastUpdate: new Date().toISOString()
          }
        }));

        return tccCurves;
      },

      // Auto-coordinación de breakers
      autoCoordinateBreakers: () => {
        const { simulation, nodes } = get();
        const coordination = { ...simulation.coordination };
        const breakerNodes = nodes.filter(n => n.type === 'breaker');

        // Iterar hasta que no haya cruces
        let hasChanges = true;
        let iterations = 0;
        const maxIterations = 10;

        while (hasChanges && iterations < maxIterations) {
          hasChanges = false;
          iterations++;

          for (let i = 0; i < breakerNodes.length - 1; i++) {
            const downstream = breakerNodes[i];
            const upstream = breakerNodes[i + 1];

            const downCurve = simulation.tccCurves[downstream.id];
            const upCurve = simulation.tccCurves[upstream.id];

            if (downCurve && upCurve && curvesOverlap(downCurve.curve, upCurve.curve)) {
              // Ajustar upstream para evitar cruce
              coordination[upstream.id] = {
                ...coordination[upstream.id],
                delay: (coordination[upstream.id]?.delay || 0) + 0.1,
                adjusted: true
              };
              hasChanges = true;
            }
          }
        }

        set(state => ({
          simulation: {
            ...state.simulation,
            coordination,
            lastUpdate: new Date().toISOString()
          }
        }));

        return coordination;
      },

      // === UI ACTIONS ===

      // Selección de elementos
      setSelectedNode: (nodeId) => set(state => ({
        ui: { ...state.ui, selectedNode: nodeId, selectedEdge: null }
      })),

      setSelectedEdge: (edgeId) => set(state => ({
        ui: { ...state.ui, selectedEdge: edgeId, selectedNode: null }
      })),

      setHoveredNode: (nodeId) => set(state => ({
        ui: { ...state.ui, hoveredNode: nodeId }
      })),

      // Toggle visualizaciones
      toggleFlows: () => set(state => ({
        ui: { ...state.ui, showFlows: !state.ui.showFlows }
      })),

      toggleParticles: () => set(state => ({
        ui: { ...state.ui, showParticles: !state.ui.showParticles }
      })),

      toggleTCC: () => set(state => ({
        ui: { ...state.ui, showTCC: !state.ui.showTCC }
      })),

      setAnimationSpeed: (speed) => set(state => ({
        ui: { ...state.ui, animationSpeed: Math.max(0.1, Math.min(3, speed)) }
      })),

      toggleGridSnap: () => set(state => ({
        ui: { ...state.ui, gridSnap: !state.ui.gridSnap }
      })),

      toggleAutoLayout: () => set(state => ({
        ui: { ...state.ui, autoLayout: !state.ui.autoLayout }
      })),

      // Snap to grid
      snapToGrid: (position, gridSize = 20) => ({
        x: Math.round(position.x / gridSize) * gridSize,
        y: Math.round(position.y / gridSize) * gridSize
      }),

      // Auto-routing básico
      autoRouteEdge: (sourcePos, targetPos) => {
        // Simple L-shaped routing
        return [
          sourcePos,
          { x: targetPos.x, y: sourcePos.y },
          targetPos
        ];
      }
    }),
    {
      name: 'graph-store',
      partialize: (state) => ({
        config: state.config,
        // nodes y edges se guardan manualmente para mejor control
      })
    }
  )
);
