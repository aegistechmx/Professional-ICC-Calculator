import { create } from 'zustand';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const useStore = create((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  iccResults: null,
  
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setSelectedNode: (node) => set({ selectedNode: node }),
  
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
      alert('Error al calcular ICC: ' + error.message);
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
      alert('Error al generar PDF: ' + error.message);
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
      alert('Sistema guardado exitosamente');
    } catch (error) {
      console.error('Error guardando sistema:', error);
      alert('Error al guardar sistema');
    }
  }
}));
