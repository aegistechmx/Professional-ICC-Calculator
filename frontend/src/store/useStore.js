import { create } from 'zustand';
import axios from 'axios';
import { applySimulationResults } from '../utils/applyResults';
import { applyProtection, applyRelayState, autoTuneRelays } from '../utils/protection';
import { simulateCascade, getSimulationSummary } from '../utils/cascadeSimulation';
import { playTimeline, getTimelineStats } from '../utils/timelinePlayback';
import { extractBranches, calculateBranchImpedance } from '../utils/extractBranches';
import { calculateICCPerNode } from '../utils/calculateNodeICC';
import { calculateFaultCurrentWithMotors } from '../utils/motorContribution';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Load from localStorage helper
const loadFromStorage = (key, defaultValue) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error loading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

// Save to localStorage helper
const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error saving ${key} to localStorage:`, error);
  }
};

// Initial state from localStorage
const initialNodes = loadFromStorage('icc-nodes', []);
const initialEdges = loadFromStorage('icc-edges', []);

// Función para sanitizar números
function safeNumber(x, def = 0) {
  return Number.isFinite(x) ? x : def;
}

// Límites físicos para validación inteligente
const LIMITS = {
  // Voltajes (V)
  tension: [120, 500000], // 120V a 500kV
  primario: [120, 500000],
  secundario: [120, 35000], // Hasta 35kV para secundario típico
  voltaje: [120, 500000],

  // Potencias (kVA, kW, hp)
  kVA: [1, 100000], // 1kVA a 100MVA
  potencia_kW: [0.1, 100000],
  hp: [0.1, 50000], // 0.1hp a 50,000hp

  // Corrientes (A)
  In: [0.1, 100000], // 0.1A a 100kA
  Icu: [1, 200000], // 1A a 200kA

  // Impedancias (%)
  Z: [0.1, 50], // 0.1% a 50%

  // Factores de potencia
  fp: [0.1, 1.0], // 0.1 a 1.0

  // Eficiencias
  eficiencia: [0.1, 1.0], // 10% a 100%

  // Reactancias (%)
  Xd: [0.01, 1.0], // 0.01pu a 1.0pu

  // Cables
  longitud: [0.1, 10000], // 0.1m a 10km
  paralelo: [1, 12], // 1 a 12 conductores en paralelo
  temp: [-40, 100], // -40°C a 100°C
  numConductores: [1, 4] // 1 a 4 conductores por fase
};

// Valores por defecto para componentes
const DEFAULT_PARAMETERS = {
  breaker: {
    In: 100,
    Icu: 25000,
    tipo: 'molded_case'
  },
  transformer: {
    kVA: 500,
    primario: 13200,
    secundario: 480,
    Z: 5.75
  },
  generator: {
    kVA: 100,
    voltaje: 480,
    fp: 0.8,
    Xd: 0.15
  },
  panel: {
    tension: 480,
    fases: 3
  },
  load: {
    potencia_kW: 10,
    potencia_kVAR: 2,
    fp: 0.9,
    voltaje: 480
  },
  motor: {
    hp: 50,
    voltaje: 480,
    eficiencia: 0.92,
    fp: 0.85
  }
};

// Función para validar un valor contra límites
function validateValue(key, value, limits = LIMITS) {
  const [min, max] = limits[key] || [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
  const numValue = safeNumber(value);

  if (numValue < min || numValue > max) {
    return {
      valid: false,
      message: `${key}: ${numValue} fuera de rango [${min}, ${max}]`,
      clamped: Math.max(min, Math.min(max, numValue))
    };
  }

  return { valid: true, value: numValue };
}

// Función para sanitizar el grafo antes de enviar al backend
function sanitizeGraph(graph) {
  const sanitized = { ...graph };
  const validationErrors = [];

  // Sanitizar nodos
  sanitized.nodes = graph.nodes.map(node => {
    const defaults = DEFAULT_PARAMETERS[node.type] || {};
    const params = { ...defaults, ...(node.data?.parameters || {}) };

    // Aplicar validación inteligente a todos los parámetros numéricos
    Object.keys(params).forEach(key => {
      let value = params[key];
      
      // Convert string numbers to actual numbers first
      if (typeof value === 'string' && value !== '') {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) {
          value = parsed;
          params[key] = value; // Update the converted value
        }
      }
      
      if (typeof value === 'number' && !Number.isNaN(value)) {
        const validation = validateValue(key, value);
        if (!validation.valid) {
          validationErrors.push(validation.message);
          params[key] = validation.clamped; // Usar valor clamped
        } else {
          params[key] = validation.value;
        }
      } else if (defaults[key] !== undefined) {
        params[key] = defaults[key];
      }
    });

    return {
      ...node,
      data: {
        ...node.data,
        parameters: params
      }
    };
  });

  // Sanitizar edges (asegurarse de que los datos de cable sean válidos)
  sanitized.edges = graph.edges.map(edge => {
    const edgeData = { ...edge.data };

    // Validar parámetros de cable
    ['longitud', 'paralelo', 'temp', 'numConductores'].forEach(key => {
      let value = edgeData[key];
      
      // Convert string numbers to actual numbers first
      if (typeof value === 'string' && value !== '') {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) {
          value = parsed;
        }
      }
      
      if (value !== undefined && typeof value === 'number' && !Number.isNaN(value)) {
        const validation = validateValue(key, value);
        if (!validation.valid) {
          validationErrors.push(`Cable ${edge.id} - ${validation.message}`);
          edgeData[key] = validation.clamped;
        } else {
          edgeData[key] = validation.value;
        }
      }
    });

    return {
      ...edge,
      data: {
        material: edgeData.material || 'Cu',
        calibre: edgeData.calibre || '350',
        longitud: edgeData.longitud || 10,
        paralelo: edgeData.paralelo || 1,
        temp: edgeData.temp || 30,
        numConductores: edgeData.numConductores || 3,
        ...edgeData
      }
    };
  });

  // Adjuntar errores de validación al resultado
  sanitized.validationErrors = validationErrors;

  return sanitized;
}

export const useStore = create((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  selectedNode: null,
  selectedEdge: null,
  iccResults: null,
  powerFlowResults: null,
  shortCircuitResults: null, // NEW: resultados de cortocircuito
  protections: [], // Protection device configurations
  simulationTimeline: null, // Dynamic simulation timeline
  currentTime: 0, // Current simulation time
  mode: 'edit', // 'edit' or 'simulation'
  systemMode: 'normal', // 'normal' or 'emergency' - NEW: ATS system mode
  validationErrors: [], // NEW: validation error messages
  invalidConnections: [], // NEW: list of invalid connection attempts
  lastValidationTime: null, // Timestamp of last validation
  
  // Playback state (NEW)
  isPlaying: false,
  playbackSpeed: 1.0,
  maxTime: 5.0,
  playbackInterval: null,
  
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setSelectedNode: (node) => set({ selectedNode: node }),
  setSelectedEdge: (edge) => set({ selectedEdge: edge }),
  setMode: (mode) => set({ mode }),
  setSystemMode: (systemMode) => set({ systemMode }), // NEW: setter for system mode
  
  // Validation management (NEW)
  setValidationErrors: (errors) => set({ validationErrors: errors, lastValidationTime: Date.now() }),
  clearValidationErrors: () => set({ validationErrors: [], lastValidationTime: null }),
  addValidationError: (error) => set((state) => ({
    validationErrors: [...state.validationErrors, error],
    lastValidationTime: Date.now()
  })),
  
  // Invalid connection tracking (NEW)
  addInvalidConnection: (sourceId, targetId, reason) => set((state) => ({
    invalidConnections: [
      ...state.invalidConnections,
      { sourceId, targetId, reason, timestamp: Date.now() }
    ].slice(-10) // Keep only last 10
  })),
  clearInvalidConnections: () => set({ invalidConnections: [] }),
  
  // Playback controls (NEW)
  playPlayback: () => {
    const { isPlaying, playbackInterval } = get();
    
    if (isPlaying) return; // Already playing
    
    // Clean up existing interval to prevent memory leaks
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

  // Cleanup function to clear interval on unmount and mode changes
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
    const { nodes, protections } = get();
    
    if (protections.length === 0) {
      // eslint-disable-next-line no-console
      console.warn('No protections configured for coordination');
      return null;
    }
    
    // Run power flow first
    const result = await get().calculatePowerFlow(options);
    
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
  runCascadeSimulation: async (faultBus) => {
    const { nodes, edges, protections } = get();
    
    if (protections.length === 0) {
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
          const result = await get().calculatePowerFlow(opts);
          return result;
        },
        calculateCurrents: (flows) => {
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
  
  addNode: (node) => set((state) => {
    const newNodes = [...state.nodes, node];
    saveToStorage('icc-nodes', newNodes);
    return { nodes: newNodes };
  }),
  
  updateNode: (id, data) => set((state) => {
    const newNodes = state.nodes.map((node) =>
      node.id === id ? { ...node, data: { ...node.data, ...data } } : node
    );
    saveToStorage('icc-nodes', newNodes);
    return { nodes: newNodes };
  }),

  updateEdge: (id, data) => set((state) => {
    const newEdges = state.edges.map((edge) =>
      edge.id === id ? { ...edge, data: { ...edge.data, ...data } } : edge
    );
    saveToStorage('icc-edges', newEdges);
    return { edges: newEdges };
  }),
  
  removeNode: (id) => set((state) => {
    const newNodes = state.nodes.filter((node) => node.id !== id);
    const newEdges = state.edges.filter((edge) => edge.source !== id && edge.target !== id);
    saveToStorage('icc-nodes', newNodes);
    saveToStorage('icc-edges', newEdges);
    return {
      nodes: newNodes,
      edges: newEdges,
      selectedNode: state.selectedNode?.id === id ? null : state.selectedNode,
      selectedEdge: null
    };
  }),
  
  removeEdge: (id) => set((state) => {
    const newEdges = state.edges.filter((edge) => edge.id !== id);
    saveToStorage('icc-edges', newEdges);
    return {
      edges: newEdges,
      selectedEdge: state.selectedEdge?.id === id ? null : state.selectedEdge
    };
  }),
  
  deleteNode: (id) => set((state) => {
    const newNodes = state.nodes.filter((node) => node.id !== id);
    const newEdges = state.edges.filter((edge) => edge.source !== id && edge.target !== id);
    saveToStorage('icc-nodes', newNodes);
    saveToStorage('icc-edges', newEdges);
    return { nodes: newNodes, edges: newEdges };
  }),
  
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
  
  // Build graph payload for backend
  buildGraphPayload: (nodes, edges) => {
    return {
      nodes: nodes.map(n => ({
        id: n.id,
        type: n.type,
        data: n.data
      })),
      edges: edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        data: e.data
      }))
    };
  },

  // Calcular ICC usando el nuevo endpoint /cortocircuito/calculate
  calculateICC: async () => {
    try {
      const { nodes, edges, setNodes, setEdges } = get();

      const graph = get().buildGraphPayload(nodes, edges);

      const response = await fetch(`${API_BASE}/cortocircuito/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(graph)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error en el cálculo');
      }

      // 🔥 actualizar nodos
      const newNodes = nodes.map(n => ({
        ...n,
        data: {
          ...n.data,
          results: data.resultsByNodeId?.[n.id] || null
        }
      }));

      // 🔥 actualizar edges (cables)
      let newEdges = edges.map(e => ({
        ...e,
        data: {
          ...e.data,
          results: data.resultsByEdgeId?.[e.id] || null
        }
      }));

      // 🔥 aplicar auto-correcciones si existen
      if (Array.isArray(data.cambios) && data.cambios.length > 0) {
        newEdges = newEdges.map(e => {
          const cambio = data.cambios.find(c => c.edgeId === e.id);
          if (!cambio) return e;

          return {
            ...e,
            data: {
              ...e.data,
              calibre: cambio.calibre || e.data.calibre,
              paralelo: cambio.paralelo || e.data.paralelo
            }
          };
        });
      }

      setNodes(newNodes);
      setEdges(newEdges);

      // Guardar resultados en el store
      set({ 
        iccResults: data,
        shortCircuitResults: data,
        validationErrors: data.validacion?.errors || []
      });

      return data;
    } catch (error) {
      let errorMessage = 'Error al calcular ICC';
      // fetch API doesn't have error.response like axios
      // Error messages come directly from the error object or JSON parsing
      if (error.message) {
        errorMessage = `❌ ${error.message}`;
      }
      
      throw new Error(errorMessage);
    }
  },

  // Calcular ICC por ramas (branch-based calculation)
  calculateBranches: async () => {
    try {
      const { nodes, edges } = get();
      
      // Extract branches from graph
      const { branches, errors } = extractBranches(nodes, edges);
      
      if (errors.length > 0) {
        throw new Error(errors.join('\n'));
      }
      
      if (branches.length === 0) {
        throw new Error('No se encontraron ramas válidas para calcular');
      }
      
      // Calculate impedance and ICC for each branch
      const branchResults = branches.map(branch => {
        const impedance = calculateBranchImpedance(branch);
        const sourceVoltage = branch.source.data?.parameters?.secundario || 
                             branch.source.data?.parameters?.voltaje || 480;
        
        // Calculate fault current: I = V / Z
        const Z_total = Math.sqrt(impedance.R ** 2 + impedance.X ** 2);
        const I_sc = Z_total > 0 ? (sourceVoltage / (Math.sqrt(3) * Z_total)) : 0;
        
        return {
          ...branch,
          impedance,
          faultCurrent: I_sc,
          sourceVoltage
        };
      });
      
      // Send to backend for detailed calculation
      const response = await axios.post(`${API_BASE}/simulacion/branches`, {
        branches: branchResults
      });
      
      set({ branchResults: response.data });
      return { branches: branchResults, backendResults: response.data };
      
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Error al calcular ramas';
      throw new Error(`❌ ${errorMessage}`);
    }
  },
  
  // Generar PDF reporte
  generatePDF: async () => {
    const model = get().convertToElectricalModel();
    
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
      const errorMessage = error.response?.data?.error || error.message || 'Error al generar PDF';
      throw new Error(`❌ ${errorMessage}`);
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
      const errorMessage = error.response?.data?.error || error.message || 'Error al calcular power flow';
      throw new Error(`❌ ${errorMessage}`);
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
      const errorMessage = error.response?.data?.error || error.message || 'Error al validar sistema';
      throw new Error(`❌ ${errorMessage}`);
    }
  },

  // Calcular cortocircuito usando el grafo del editor
  calculateShortCircuitFromGraph: async () => {
    const { nodes, edges, systemMode } = get();

    // Sanitizar el grafo antes de enviar
    const cleanGraph = sanitizeGraph({ nodes, edges, systemMode });

    try {
      const response = await axios.post(`${API_BASE}/cortocircuito/calculate`, cleanGraph);
      const result = response.data;
      
      // Guardar resultados
      set({ shortCircuitResults: result });
      
      return result;
    } catch (error) {
      let errorMessage = 'Error al calcular cortocircuito';
      if (error.response?.status === 400) {
        errorMessage = '❌ Datos inválidos para el cálculo de cortocircuito. Verifica los parámetros.';
      } else if (error.response?.data?.error) {
        errorMessage = `❌ ${error.response.data.error}`;
      } else if (error.message) {
        errorMessage = `❌ ${error.message}`;
      }
      
      throw new Error(errorMessage);
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
      const errorMessage = error.response?.data?.error || error.message || 'Error al guardar sistema';
      throw new Error(`❌ ${errorMessage}`);
    }
  },

  // ===== PROJECT MANAGEMENT (NEW) =====
  
  // Save project to backend with nodes/edges
  saveProject: async (projectName, projectId = null) => {
    const { nodes, edges } = get();
    
    try {
      let response;
      if (projectId) {
        // Update existing
        response = await axios.put(`${API_BASE}/projects/${projectId}`, {
          nombre: projectName,
          datos: { nodes, edges, savedAt: new Date().toISOString() }
        });
      } else {
        // Create new
        response = await axios.post(`${API_BASE}/projects`, {
          nombre: projectName,
          datos: { nodes, edges, savedAt: new Date().toISOString() }
        });
      }
      
      return { success: true, data: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Error al guardar proyecto';
      throw new Error(`❌ ${errorMessage}`);
    }
  },

  // Quick save to existing project
  quickSaveProject: async (projectId) => {
    const { nodes, edges } = get();
    
    try {
      const response = await axios.post(`${API_BASE}/projects/${projectId}/save`, {
        nodes,
        edges
      });
      return { success: true, data: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Error al guardar';
      throw new Error(`❌ ${errorMessage}`);
    }
  },

  // Load project from backend
  loadProject: async (projectId) => {
    try {
      const response = await axios.get(`${API_BASE}/projects/${projectId}`);
      const project = response.data.data;
      
      if (project.datos?.nodes && project.datos?.edges) {
        set({
          nodes: project.datos.nodes,
          edges: project.datos.edges
        });
        // Also save to localStorage
        saveToStorage('icc-nodes', project.datos.nodes);
        saveToStorage('icc-edges', project.datos.edges);
      }
      
      return { success: true, data: project };
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Error al cargar proyecto';
      throw new Error(`❌ ${errorMessage}`);
    }
  },

  // Get list of projects
  getProjects: async () => {
    try {
      const response = await axios.get(`${API_BASE}/projects`);
      return response.data.data || [];
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Error al obtener proyectos';
      throw new Error(`❌ ${errorMessage}`);
    }
  },

  // Delete project
  deleteProject: async (projectId) => {
    try {
      await axios.delete(`${API_BASE}/projects/${projectId}`);
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Error al eliminar proyecto';
      throw new Error(`❌ ${errorMessage}`);
    }
  },

  // Export project to JSON file
  exportProject: (filename = 'icc-project') => {
    const { nodes, edges } = get();
    const projectData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      nodes,
      edges
    };
    
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
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

  // Import project from JSON file
  importProject: async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const projectData = JSON.parse(event.target.result);
          
          if (!projectData.nodes || !projectData.edges) {
            throw new Error('Archivo inválido: no contiene nodes o edges');
          }
          
          set({
            nodes: projectData.nodes,
            edges: projectData.edges
          });
          
          // Save to localStorage
          saveToStorage('icc-nodes', projectData.nodes);
          saveToStorage('icc-edges', projectData.edges);
          
          resolve({ success: true, data: projectData });
        } catch (error) {
          reject(new Error(`❌ Error al importar: ${error.message}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('❌ Error al leer archivo'));
      };
      
      reader.readAsText(file);
    });
  },

  // ===== NODE-BY-NODE ICC CALCULATION (NEW) =====
  
  // Calculate short circuit current per node based on accumulated impedance
  calculateNodeICC: async () => {
    try {
      const { nodes, edges } = get();
      
      // Calculate ICC per node using accumulated impedance algorithm
      const result = calculateICCPerNode(nodes, edges);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Update nodes with ICC results
      const updatedNodes = nodes.map(node => {
        const nodeResult = result.nodeResults[node.id];
        if (!nodeResult) return node;
        
        return {
          ...node,
          data: {
            ...node.data,
            icc: nodeResult.isc_3f_ka,
            icc_1f: nodeResult.isc_1f_ka,
            results: {
              ...(node.data?.results || {}),
              isc: nodeResult.isc_3f_ka,
              isc_1f: nodeResult.isc_1f_ka,
              accumulated_R: nodeResult.accumulated_R,
              accumulated_X: nodeResult.accumulated_X,
              Z_total: nodeResult.Z_total,
              X_R_ratio: nodeResult.X_R_ratio,
              sourceVoltage: nodeResult.sourceVoltage
            }
          }
        };
      });
      
      set({ 
        nodes: updatedNodes,
        nodeICCResults: result
      });
      
      // Save to localStorage
      saveToStorage('icc-nodes', updatedNodes);
      
      return result;
    } catch (error) {
      const errorMessage = error.message || 'Error al calcular ICC por nodo';
      throw new Error(`❌ ${errorMessage}`);
    }
  },

  // ===== MOTOR CONTRIBUTION TO FAULT CURRENT (NEW) =====
  
  // Calculate fault current including motor contribution
  calculateFaultWithMotors: async () => {
    try {
      const { nodes, edges, iccResults } = get();
      
      // Get utility fault current from existing results or calculate
      let utilityIsc = iccResults?.icc_total_ka || iccResults?.icc || 10;
      
      // Calculate motor contribution
      const result = calculateFaultCurrentWithMotors(nodes, edges, utilityIsc);
      
      set({ motorContributionResults: result });
      
      return result;
    } catch (error) {
      const errorMessage = error.message || 'Error al calcular contribución de motores';
      throw new Error(`❌ ${errorMessage}`);
    }
  }
}));
