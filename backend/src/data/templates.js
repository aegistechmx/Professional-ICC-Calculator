/**
 * Pre-defined electrical system templates
 */

const templates = [
  {
    nombre: 'Subestación Industrial',
    descripcion:
      'Subestación típica con transformador principal y distribución',
    categoria: 'substation',
    nodes: [
      {
        id: 'transformer-1',
        type: 'transformer',
        position: { x: 250, y: 50 },
        data: {
          label: 'Transformador Principal',
          parameters: {
            kVA: 500,
            primario: 13800,
            secundario: 480,
            Z: 5.75,
          },
        },
      },
      {
        id: 'breaker-1',
        type: 'breaker',
        position: { x: 250, y: 200 },
        data: {
          label: 'Breaker Principal',
          parameters: {
            In: 600,
            Icu: 50000,
            tipo: 'air_circuit',
          },
        },
      },
      {
        id: 'panel-1',
        type: 'panel',
        position: { x: 250, y: 350 },
        data: {
          label: 'Tablero Principal',
          parameters: {
            tension: 480,
            fases: 3,
          },
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'transformer-1', target: 'breaker-1' },
      { id: 'e2', source: 'breaker-1', target: 'panel-1' },
    ],
  },
  {
    nombre: 'Tablero de Distribución',
    descripcion: 'Tablero con múltiples cargas',
    categoria: 'panel',
    nodes: [
      {
        id: 'panel-1',
        type: 'panel',
        position: { x: 250, y: 50 },
        data: {
          label: 'Tablero',
          parameters: {
            tension: 480,
            fases: 3,
          },
        },
      },
      {
        id: 'breaker-1',
        type: 'breaker',
        position: { x: 150, y: 200 },
        data: {
          label: 'Breaker 1',
          parameters: {
            In: 100,
            Icu: 25000,
            tipo: 'molded_case',
          },
        },
      },
      {
        id: 'breaker-2',
        type: 'breaker',
        position: { x: 350, y: 200 },
        data: {
          label: 'Breaker 2',
          parameters: {
            In: 100,
            Icu: 25000,
            tipo: 'molded_case',
          },
        },
      },
      {
        id: 'load-1',
        type: 'load',
        position: { x: 150, y: 350 },
        data: {
          label: 'Carga 1',
          parameters: {
            potencia_kW: 50,
            fp: 0.85,
          },
        },
      },
      {
        id: 'load-2',
        type: 'load',
        position: { x: 350, y: 350 },
        data: {
          label: 'Carga 2',
          parameters: {
            potencia_kW: 75,
            fp: 0.9,
          },
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'panel-1', target: 'breaker-1' },
      { id: 'e2', source: 'panel-1', target: 'breaker-2' },
      { id: 'e3', source: 'breaker-1', target: 'load-1' },
      { id: 'e4', source: 'breaker-2', target: 'load-2' },
    ],
  },
  {
    nombre: 'Sistema con Motores',
    descripcion: 'Sistema con múltiples motores industriales',
    categoria: 'industrial',
    nodes: [
      {
        id: 'transformer-1',
        type: 'transformer',
        position: { x: 250, y: 50 },
        data: {
          label: 'Transformador',
          parameters: {
            kVA: 1000,
            primario: 13800,
            secundario: 480,
            Z: 5.75,
          },
        },
      },
      {
        id: 'breaker-1',
        type: 'breaker',
        position: { x: 250, y: 200 },
        data: {
          label: 'Breaker Principal',
          parameters: {
            In: 1200,
            Icu: 65000,
            tipo: 'air_circuit',
          },
        },
      },
      {
        id: 'panel-1',
        type: 'panel',
        position: { x: 250, y: 350 },
        data: {
          label: 'Tablero Motores',
          parameters: {
            tension: 480,
            fases: 3,
          },
        },
      },
      {
        id: 'motor-1',
        type: 'motor',
        position: { x: 150, y: 500 },
        data: {
          label: 'Motor 1',
          parameters: {
            hp: 100,
            voltaje: 480,
            eficiencia: 0.92,
          },
        },
      },
      {
        id: 'motor-2',
        type: 'motor',
        position: { x: 350, y: 500 },
        data: {
          label: 'Motor 2',
          parameters: {
            hp: 150,
            voltaje: 480,
            eficiencia: 0.94,
          },
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'transformer-1', target: 'breaker-1' },
      { id: 'e2', source: 'breaker-1', target: 'panel-1' },
      { id: 'e3', source: 'panel-1', target: 'motor-1' },
      { id: 'e4', source: 'panel-1', target: 'motor-2' },
    ],
  },
]

module.exports = templates
