import { create } from 'zustand';
import axios from 'axios';
import { applySimulationResults } from '../utils/applyResults';
import { applyProtection, applyRelayState, autoTuneRelays } from '../utils/protection';
import { simulateCascade, getSimulationSummary } from '../utils/cascadeSimulation';
import { playTimeline, getTimelineStats } from '../utils/timelinePlayback';
import { createFaultScenario } from '../utils/faultScenario';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';

export const useStore = create((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  iccResults: null,
  powerFlowResults: null,
  protections: [], // Protection device configurations
  simulationTimeline: null, // Dynamic simulation timeline
  currentTime: 0, // Current simulation time
  mode: 'edit', // 'edit' or 'simulation'
  
  // Playback state (NEW)
  isPlaying: false,
  playbackSpeed: 1.0,
  maxTime: 5.0,
  playbackInterval: null,
  
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setSelectedNode: (node) => set({ selectedNode: node }),
  setMode: (mode) => set({ mode }),
  
  // Playback controls (NEW)
  playPlayback: () => {
    const { isPlaying, playbackSpeed, maxTime, playbackInterval } = get();
    
    if (isPlaying) return; // Already playing
    
    if (playbackInterval) {
      clearInterval(playbackInterval);
    }
    
    const interval = setInterval(() => {
      const { currentTime, maxTime } = get();
      
      if (currentTime >= maxTime) {
        clearInterval(interval);
        set({ isPlaying: false, playbackInterval: null });
        return;
      }
      
      set((state) => ({
        currentTime: Math.min(state.currentTime + 0.01 * state.playbackSpeed, state.maxTime)
      }));
    }, 10); // 10ms update rate
    
    set({ isPlaying: true, playbackInterval: interval });
  },
  
  pausePlayback: () => {
    const { playbackInterval } = get();
    
    if (playbackInterval) {
      clearInterval(playbackInterval);
    }
    
    set({ isPlaying: false, playbackInterval: null });
  },
  
  stepPlayback: (stepSize = 0.01) => {
    const { currentTime, maxTime } = get();
    
    set({
      currentTime: Math.min(currentTime + stepSize, maxTime),
      isPlaying: false
    });
  },
  
  rewindPlayback: () => {
    const { playbackInterval } = get();
    
    if (playbackInterval) {
      clearInterval(playbackInterval);
    }
    
    set({ 
      currentTime: 0,
      isPlaying: false,
      playbackInterval: null
    });
  },

  // Cleanup function to clear interval on unmount
  cleanupPlayback: () => {
    const { playbackInterval } = get();
    
    if (playbackInterval) {
      clearInterval(playbackInterval);
      set({ playbackInterval: null, isPlaying: false });
    }
  },
  
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  
  setCurrentTime: (time) => set({ currentTime: time }),
  
  // Protection management
  setProtections: (protections) => set({ protections }),
  addProtection: (protection) => set((state) => ({
    protections: [...state.protections, protection]
  })),
  updateProtection: (id, data) => set((state) => ({
    protections: state.protections.map(p =>
      p.id === id ? { ...p, ...data } : p
    )
  })),
  removeProtection: (id) => set((state) => ({
    protections: state.protections.filter(p => p.id !== id)
  })),
  
  // Run protection coordination
  runProtectionCoordination: async (options = {}) => {
    const { nodes, edges, protections } = get();
    
    if (protections.length === 0) {
      // eslint-disable-next-line no-console
      console.warn('No protections configured for coordination');
      return null;
    }
    
    // Run power flow first
    const result = await calculatePowerFlow(options);
    
    if (!result.success || !result.buses) {
      return result;
    }
    
    // Get flows from store (calculated during power flow)
    const { powerFlowResults } = get();
    if (!powerFlowResults || !powerFlowResults.flows) {
      // eslint-disable-next-line no-console
      console.warn('No flow results available');
      return result;
    }
    
    const flows = powerFlowResults.flows;
    
    // Auto-tune relays for coordination
    const tunedRelays = autoTuneRelays(protections, flows, 10, 0.3);
    
    // Apply relay state to nodes
    const newNodes = applyRelayState(nodes, tunedRelays, flows);
    
    set({
      nodes: newNodes,
      protections: tunedRelays
    });
    
    return {
      ...result,
      coordination: {
        tuned: true,
        relays: tunedRelays,
        iterations: 10,
        margin: 0.3
      }
    };
  },
  
  // Run dynamic cascade simulation
  runCascadeSimulation: async (faultBus, options = {}) => {
    const { nodes, edges, protections } = get();
    
    if (protections.length === 0) {
      console.warn('No protections configured for simulation');
      return null;
    }
    
    const initialState = { nodes, edges };
    
    // Run cascade simulation
    const simulationResult = await simulateCascade(
      initialState,
      protections,
      faultBus,
      {
        maxTime: 2.0,
        timeStep: 0.01,
        solvePowerFlow: async (nodes, edges, opts) => {
          const result = await calculatePowerFlow(opts);
          return result;
        },
        calculateCurrents: (flows, V, base, index) => {
          // This will be handled by the power flow result
          return flows;
        }
      }
    );
    
    const summary = getSimulationSummary(simulationResult);
    
    set({
      simulationTimeline: simulationResult.timeline,
      currentTime: 0
    });
    
    return {
      ...simulationResult,
      summary
    };
  },
  
  // Play simulation timeline
  playSimulationTimeline: async (options = {}) => {
    const { simulationTimeline } = get();
    
    if (!simulationTimeline || simulationTimeline.length === 0) {
      console.warn('No simulation timeline available');
      return null;
    }
    
    await playTimeline(simulationTimeline, set, options);
    
    return {
      played: true,
      steps: simulationTimeline.length
    };
  },
  
  // Get timeline statistics
  getTimelineStats: () => {
    const { simulationTimeline } = get();
    return getTimelineStats(simulationTimeline);
  },
  
  // Reset simulation state
  resetSimulation: () => {
    set({
      simulationTimeline: null,
      currentTime: 0
    });
  },
  
  addNode: (node) => set((state) => ({
    nodes: [...state.nodes, node]
  })),
  
  updateNode: (id, data) => set((state) => ({
    nodes: state.nodes.map((node) =>
      node.id === id ? { ...node, data: { ...node.data, ...data } } : node
    )
  })),
  
  deleteNode: (id) => set((state) => ({
    nodes: state.nodes.filter((node) => node.id !== id),
    edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id)
  })),
  
  // Convertir el sistema visual a modelo eléctrico para backend
  convertToElectricalModel: () => {
    const { nodes, edges } = get();
    
    // Ensure nodes and edges are arrays
    const nodesArray = Array.isArray(nodes) ? nodes : [];
    const edgesArray = Array.isArray(edges) ? edges : [];
    
    // Convertir nodos a elementos eléctricos
    const elementos = nodesArray.map((node) => ({
      id: node.id,
      tipo: node.type,
      nombre: node.data.label || node.type,
      // Parámetros específicos según tipo
      ...(node.data.parameters || {})
    }));
    
    // Convertir conexiones
    const conexiones = edgesArray.map((edge) => ({
      id: edge.id,
      origen: edge.source,
      destino: edge.target
    }));
    
    return {
      elementos,
      conexiones,
      sistema: {
        tension: 480,
        tipo: 'trifasico'
      }
    };
  },
  
  // Calcular ICC usando backend
  calculateICC: async () => {
    const model = get().convertToElectricalModel();
    
    try {
      const response = await axios.post(`${API_BASE}/calculo/icc-motores`, {
        voltaje: model.sistema.tension,
        resistencia: 0.02,
        reactancia: 0.05,
        tipo: model.sistema.tipo,
        motores: model.elementos.filter(e => e.tipo === 'motor').map(m => ({
          potencia_kw: m.hp ? m.hp * 0.746 : m.potencia_kw || 10,
          voltaje: m.voltaje || model.sistema.tension,
          nombre: m.nombre
        }))
      });
      set({ iccResults: response.data });
      return response.data;
    } catch (error) {
      console.error('Error calculando ICC:', error);
      throw new Error(error.response?.data?.error || 'Error al calcular ICC');
    }
  },
  
  // Generar PDF reporte
  generatePDF: async () => {
    const model = get().convertToElectricalModel();
    const { iccResults } = get();
    
    try {
      const response = await axios.post(
        `${API_BASE}/reporte/pdf`,
        {
          parametros_icc: model.sistema,
          proyecto: { nombre: 'Proyecto desde Editor Visual' },
          empresa: { nombre: 'ICC Software SaaS' },
          motores: { lista: model.elementos.filter(e => e.tipo === 'motor') },
          dispositivos: model.elementos.filter(e => e.tipo === 'breaker')
        },
        { responseType: 'blob' }
      );
      
      // Descargar PDF
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'reporte_icc.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error generando PDF:', error);
      throw new Error(error.response?.data?.error || 'Error al generar PDF');
    }
  },
  
  // Calcular flujo de potencia (Power Flow) usando el nuevo pipeline
  calculatePowerFlow: async (options = {}) => {
    const { nodes, edges } = get();
    
    try {
      const response = await axios.post(`${API_BASE}/powerflow/run`, {
        nodes,
        edges,
        options: {
          Sbase_MVA: options.Sbase_MVA || 100,
          maxIter: options.maxIter || 20,
          tol: options.tol || 1e-6,
          returnActualUnits: true
        }
      });
      
      const result = response.data;
      
      // Apply visual results to nodes and edges
      if (result.success && result.buses) {
        const visualResults = applySimulationResults({ nodes, edges }, {
          V: result.buses.map(b => b.V_pu),
          theta: result.buses.map(b => b.theta_rad),
          buses: result.buses,
          base: result.base,
          Y: result.Y, // Will be provided by backend in future
          showCurrent: true,
          animateFlow: true
        });
        
        // Apply protection status if configured
        const { protections } = get();
        let finalNodes = visualResults.nodes;
        if (protections.length > 0 && visualResults.flows) {
          finalNodes = applyProtection(visualResults.nodes, protections, visualResults.flows);
        }
        
        set({ 
          nodes: finalNodes,
          edges: visualResults.edges,
          powerFlowResults: result
        });
      } else {
        set({ powerFlowResults: result });
      }
      
      return result;
    } catch (error) {
      console.error('Error calculando power flow:', error);
      throw new Error(error.response?.data?.error || 'Error al calcular power flow');
    }
  },
  
  // Validar sistema antes de ejecutar power flow
  validateSystem: async () => {
    const { nodes, edges } = get();
    
    try {
      const response = await axios.post(`${API_BASE}/powerflow/validate`, {
        nodes,
        edges
      });
      return response.data;
    } catch (error) {
      console.error('Error validando sistema:', error);
      throw new Error(error.response?.data?.error || 'Error al validar sistema');
    }
  },
  
  // Guardar sistema
  saveSystem: async (nombre) => {
    const model = get().convertToElectricalModel();
    
    try {
      await axios.post(`${API_BASE}/proyectos`, {
        nombre,
        datos: model
      });
      return { success: true };
    } catch (error) {
      console.error('Error guardando sistema:', error);
      throw new Error(error.response?.data?.error || 'Error al guardar sistema');
    }
  }
}));
