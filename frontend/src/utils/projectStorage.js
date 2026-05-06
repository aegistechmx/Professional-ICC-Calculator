/**
 * utils/projectStorage.js - Utilidades para guardar/cargar proyectos
 * Guardar como archivo JSON local y auto-guardado
 */

/* eslint-disable no-console */
// Clave para auto-guardado en localStorage
const AUTOSAVE_KEY = 'electrical-project-autosave';
const AUTOSAVE_INTERVAL = 30000; // 30 segundos

/**
 * Guardar proyecto como archivo JSON
 * @param {Object} data - Datos del proyecto { config, nodes, edges, results }
 * @param {string} filename - Nombre del archivo (opcional)
 */
export function saveProjectToFile(data, filename = null) {
  const projectName = data.config?.proyecto || 'proyecto-electrico';
  const safeFilename = filename || `${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;

  const projectData = {
    version: '2.0',
    format: 'electrical-system-project',
    savedAt: new Date().toISOString(),
    metadata: {
      name: data.config?.proyecto || 'Sin nombre',
      nodes: data.nodes?.length || 0,
      edges: data.edges?.length || 0,
      calculated: !!data.results
    },
    config: data.config,
    nodes: data.nodes,
    edges: data.edges,
    results: data.results || null
  };

  const blob = new Blob([JSON.stringify(projectData, null, 2)], {
    type: 'application/json'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log('[STORAGE] Proyecto guardado:', safeFilename);
  return { success: true, filename: safeFilename };
}

/**
 * Cargar proyecto desde archivo JSON
 * @param {File} file - Archivo seleccionado
 * @returns {Promise<Object>} - Datos del proyecto
 */
export function loadProjectFromFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No se seleccionó ningún archivo'));
      return;
    }

    if (!file.name.endsWith('.json')) {
      reject(new Error('El archivo debe ser JSON (.json)'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);

        // Validar estructura del archivo
        if (!validateProjectData(data)) {
          reject(new Error('Archivo de proyecto inválido o corrupto'));
          return;
        }

        console.log('[STORAGE] Proyecto cargado:', data.metadata?.name || 'Sin nombre');
        resolve(data);

      } catch (error) {
        reject(new Error(`Error al parsear JSON: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsText(file);
  });
}

/**
 * Validar estructura de datos del proyecto
 */
function validateProjectData(data) {
  // Verificar campos requeridos
  if (!data) return false;
  if (!Array.isArray(data.nodes)) return false;
  if (!Array.isArray(data.edges)) return false;
  if (!data.config || typeof data.config !== 'object') return false;

  // Validar nodos
  for (const node of data.nodes) {
    if (!node.id || !node.type || !node.position) {
      return false;
    }
  }

  // Validar edges
  for (const edge of data.edges) {
    if (!edge.id || !edge.source || !edge.target) {
      return false;
    }
  }

  return true;
}

/**
 * Auto-guardar proyecto en localStorage
 * @param {Object} data - Datos del proyecto
 */
export function autosaveProject(data) {
  try {
    const autosaveData = {
      savedAt: new Date().toISOString(),
      config: data.config,
      nodes: data.nodes,
      edges: data.edges,
      results: data.results
    };

    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(autosaveData));
    console.log('[STORAGE] Auto-guardado:', new Date().toLocaleTimeString());
    return true;
  } catch (error) {
    console.error('[STORAGE] Error en auto-guardado:', error.message);
    return false;
  }
}

/**
 * Cargar auto-guardado desde localStorage
 * @returns {Object|null} - Datos del proyecto o null
 */
export function loadAutosave() {
  try {
    const data = localStorage.getItem(AUTOSAVE_KEY);
    if (!data) return null;

    const parsed = JSON.parse(data);

    if (!validateProjectData(parsed)) {
      console.warn('[STORAGE] Auto-guardado inválido');
      return null;
    }

    console.log('[STORAGE] Auto-guardado cargado:', new Date(parsed.savedAt).toLocaleString());
    return parsed;

  } catch (error) {
    console.error('[STORAGE] Error cargando auto-guardado:', error.message);
    return null;
  }
}

/**
 * Verificar si existe auto-guardado
 */
export function hasAutosave() {
  return !!localStorage.getItem(AUTOSAVE_KEY);
}

/**
 * Limpiar auto-guardado
 */
export function clearAutosave() {
  localStorage.removeItem(AUTOSAVE_KEY);
  console.log('[STORAGE] Auto-guardado limpiado');
}

/**
 * Hook para auto-guardado automático
 */
export function setupAutosave(getData, interval = AUTOSAVE_INTERVAL) {
  const autosaveInterval = setInterval(() => {
    const data = getData();
    if (data && data.nodes?.length > 0) {
      autosaveProject(data);
    }
  }, interval);

  // Guardar también antes de cerrar la página
  const handleBeforeUnload = () => {
    const data = getData();
    if (data && data.nodes?.length > 0) {
      autosaveProject(data);
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);

  // Retornar función de limpieza
  return () => {
    clearInterval(autosaveInterval);
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}

/**
 * Exportar proyecto a diferentes formatos
 */
export function exportProject(data, format = 'json') {
  switch (format) {
    case 'json':
      return saveProjectToFile(data);

    case 'csv':
      return exportToCSV(data);

    case 'pdf':
      // Requiere implementación adicional con librería PDF
      console.warn('[STORAGE] Exportar a PDF requiere implementación adicional');
      return { success: false, error: 'PDF no implementado' };

    default:
      return { success: false, error: 'Formato no soportado' };
  }
}

/**
 * Exportar a CSV (resumen del sistema)
 */
function exportToCSV(data) {
  const projectName = data.config?.proyecto || 'proyecto';

  // Crear CSV de nodos
  const nodesCSV = [
    ['ID', 'Tipo', 'Nombre', 'Voltaje (V)', 'Corriente (A)', 'Longitud (m)'].join(','),
    ...data.nodes.map(n => [
      n.id,
      n.type,
      n.data?.label || '',
      n.data?.voltaje || '',
      n.data?.I_carga || '',
      n.data?.longitud || ''
    ].join(','))
  ].join('\n');

  // Crear CSV de edges
  const edgesCSV = [
    ['ID', 'Origen', 'Destino', 'Impedancia (ohms)', 'Longitud (m)', 'Material'].join(','),
    ...data.edges.map(e => [
      e.id,
      e.source,
      e.target,
      e.data?.impedance || '',
      e.data?.length || '',
      e.data?.material || ''
    ].join(','))
  ].join('\n');

  // Combinar
  const fullCSV = `NODOS\n${nodesCSV}\n\nCONEXIONES\n${edgesCSV}`;

  const blob = new Blob([fullCSV], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectName}_resumen.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { success: true, format: 'csv' };
}

/**
 * Crear proyecto de ejemplo/demo
 */
export function createDemoProject() {
  return {
    version: '2.0',
    format: 'electrical-system-project',
    savedAt: new Date().toISOString(),
    metadata: {
      name: 'Proyecto Demo',
      nodes: 4,
      edges: 3,
      calculated: false
    },
    config: {
      proyecto: 'Sistema Demo Industrial',
      norma: 'NOM-001-SEDE-2012',
      voltajeBase: 480,
      sistema: '3F-4H',
      frecuencia: 60,
      material: 'cobre',
      tempAmbiente: 30,
      capacidadTR: 500
    },
    nodes: [
      {
        id: 'source-1',
        type: 'source',
        position: { x: 100, y: 200 },
        data: {
          label: 'Transformador Principal',
          voltaje: 480
        }
      },
      {
        id: 'breaker-1',
        type: 'breaker',
        position: { x: 250, y: 200 },
        data: {
          label: 'Breaker Principal'
        }
      },
      {
        id: 'bus-1',
        type: 'bus',
        position: { x: 400, y: 200 },
        data: {
          label: 'Barra Principal'
        }
      },
      {
        id: 'load-1',
        type: 'load',
        position: { x: 550, y: 150 },
        data: {
          label: 'Carga Motor 1',
          I_carga: 150,
          longitud: 30
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'source-1',
        target: 'breaker-1',
        data: {
          impedance: 0.01,
          length: 5,
          material: 'cobre'
        }
      },
      {
        id: 'edge-2',
        source: 'breaker-1',
        target: 'bus-1',
        data: {
          impedance: 0.02,
          length: 10,
          material: 'cobre'
        }
      },
      {
        id: 'edge-3',
        source: 'bus-1',
        target: 'load-1',
        data: {
          impedance: 0.05,
          length: 30,
          material: 'cobre'
        }
      }
    ],
    results: null
  };
}
