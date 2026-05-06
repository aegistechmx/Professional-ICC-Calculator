import { create } from 'zustand';

/**
 * Store global del sistema eléctrico (single source of truth)
 * Usa Zustand para gestión de estado
 */
export const useSystemStore = create((set, get) => ({
  // Modelo del sistema
  systemModel: {
    buses: [
      { id: 'bus1', name: 'Alimentador Principal', voltage: 480, position: { x: 100, y: 100 } },
      { id: 'bus2', name: 'Tablero de Distribución', voltage: 480, position: { x: 300, y: 100 } },
      { id: 'bus3', name: 'Carga 1', voltage: 480, position: { x: 500, y: 50 } },
      { id: 'bus4', name: 'Carga 2', voltage: 480, position: { x: 500, y: 150 } }
    ],
    branches: [
      { 
        id: 'br1', 
        from: 'bus1', 
        to: 'bus2', 
        material: 'Cu',
        size: 300,
        current: 300,
        nConductors: 3,
        length: 50
      },
      { 
        id: 'br2', 
        from: 'bus2', 
        to: 'bus3', 
        material: 'Cu',
        size: 150,
        current: 150,
        nConductors: 3,
        length: 30
      },
      { 
        id: 'br3', 
        from: 'bus2', 
        to: 'bus4', 
        material: 'Cu',
        size: 150,
        current: 150,
        nConductors: 3,
        length: 30
      }
    ],
    breakers: [
      {
        id: 'cb1',
        model: 'MGA36500',
        In: 500,
        pickup: 550,
        tms: 0.5,
        inst: 5000,
        thermal: {
          points: [
            { I: 1.05, t: 7200 },
            { I: 1.2, t: 1200 },
            { I: 1.5, t: 180 },
            { I: 2.0, t: 60 },
            { I: 4.0, t: 10 },
            { I: 6.0, t: 3 },
            { I: 8.0, t: 1.5 },
            { I: 10.0, t: 0.8 }
          ]
        },
        magnetic: { pickup: 10, clearingTime: 0.02 }
      },
      {
        id: 'cb2',
        model: 'MGA32500',
        In: 250,
        pickup: 275,
        tms: 0.1,
        inst: 2500,
        thermal: {
          points: [
            { I: 1.05, t: 7200 },
            { I: 1.2, t: 1200 },
            { I: 1.5, t: 180 },
            { I: 2.0, t: 60 },
            { I: 4.0, t: 10 },
            { I: 6.0, t: 3 },
            { I: 8.0, t: 1.5 },
            { I: 10.0, t: 0.8 }
          ]
        },
        magnetic: { pickup: 10, clearingTime: 0.02 }
      }
    ],
    loads: [
      { id: 'load1', busId: 'bus3', power: 100, pf: 0.85 },
      { id: 'load2', busId: 'bus4', power: 100, pf: 0.85 }
    ],
    settings: {
      baseMVA: 10,
      ambientC: 30,
      faultBus: null // barra con falla activa
    }
  },

  // Actualizar todo el modelo
  updateSystemModel: (patch) =>
    set((state) => ({
      systemModel: { ...state.systemModel, ...patch }
    })),

  // Actualizar una barra específica
  updateBus: (id, data) =>
    set((state) => ({
      systemModel: {
        ...state.systemModel,
        buses: state.systemModel.buses.map((b) =>
          b.id === id ? { ...b, ...data } : b
        )
      }
    })),

  // Actualizar posición de barra (para drag)
  updateBusPosition: (id, position) =>
    set((state) => ({
      systemModel: {
        ...state.systemModel,
        buses: state.systemModel.buses.map((b) =>
          b.id === id ? { ...b, position } : b
        )
      }
    })),

  // Actualizar una rama
  updateBranch: (id, data) =>
    set((state) => ({
      systemModel: {
        ...state.systemModel,
        branches: state.systemModel.branches.map((br) =>
          br.id === id ? { ...br, ...data } : br
        )
      }
    })),

  // Actualizar un breaker
  updateBreaker: (id, data) =>
    set((state) => ({
      systemModel: {
        ...state.systemModel,
        breakers: state.systemModel.breakers.map((b) =>
          b.id === id ? { ...b, ...data } : b
        )
      }
    })),

  // Establecer punto de falla
  setFaultBus: (busId) =>
    set((state) => ({
      systemModel: {
        ...state.systemModel,
        settings: { ...state.systemModel.settings, faultBus: busId }
      }
    })),

  // Limpiar punto de falla
  clearFault: () =>
    set((state) => ({
      systemModel: {
        ...state.systemModel,
        settings: { ...state.systemModel.settings, faultBus: null }
      }
    })),

  // Agregar barra
  addBus: (bus) =>
    set((state) => ({
      systemModel: {
        ...state.systemModel,
        buses: [...state.systemModel.buses, bus]
      }
    })),

  // Agregar rama
  addBranch: (branch) =>
    set((state) => ({
      systemModel: {
        ...state.systemModel,
        branches: [...state.systemModel.branches, branch]
      }
    })),

  // Eliminar barra
  removeBus: (id) =>
    set((state) => ({
      systemModel: {
        ...state.systemModel,
        buses: state.systemModel.buses.filter((b) => b.id !== id),
        branches: state.systemModel.branches.filter(
          (br) => br.from !== id && br.to !== id
        )
      }
    }))
}));
