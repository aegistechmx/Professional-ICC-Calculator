/**
 * Página principal de la calculadora ICC
 * Integra el módulo cortocircuito HTML dentro de React
 */

import { useState, useCallback, useRef } from 'react';
import ICCModule from '../components/ICCModule';
import IcoreLogo from '../components/IcoreLogo';

export default function ICCCalculator() {
  const iccModuleRef = useRef(null);
  const [systemModel, setSystemModel] = useState(null);
  const [results, setResults] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [faultDetected, setFaultDetected] = useState(false);
  const [currentFileName, setCurrentFileName] = useState('');
  const [isFileOperation, setIsFileOperation] = useState(false);

  // Función estandarizada de manejo de errores
  const handleError = useCallback((message, error = null) => {
    // Log error for development without console statement
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error(message, error);
    }
    alert(message);
  }, []);

  // Estado para configuración de equipos en React
  const [equipmentConfig, setEquipmentConfig] = useState({
    zonaElectrica: '',
    trafoKva: 500,
    trafoVp: 23000,
    trafoVs: 480,
    trafoZ: 5.75,
    modoCalculo: 'conocido'
  });

  // Datos para listas desplegables
  const zonasElectricas = [
    { value: 'CDMX', label: 'Ciudad de México - Zona Metropolitana (23 kV)', isc: 28, xr: 12 },
    { value: 'MONTERREY', label: 'Monterrey - Nuevo León (23 kV)', isc: 25, xr: 12 },
    { value: 'GUADALAJARA', label: 'Guadalajara - Jalisco (23 kV)', isc: 22, xr: 15 },
    { value: 'PUEBLA', label: 'Puebla - Tlaxcala (23 kV)', isc: 20, xr: 15 },
    { value: 'LEON', label: 'León - Guanajuato (23 kV)', isc: 18, xr: 18 },
    { value: 'TIJUANA', label: 'Tijuana - Baja California (23 kV)', isc: 16, xr: 18 },
    { value: 'VERACRUZ', label: 'Veracruz - Xalapa (23 kV)', isc: 15, xr: 18 },
    { value: 'MERIDA', label: 'Mérida - Yucatán (23 kV)', isc: 14, xr: 20 },
    { value: 'TORREON', label: 'Torreón - La Laguna (23 kV)', isc: 17, xr: 18 },
    { value: 'QUERETARO', label: 'Querétaro - Corregidora (23 kV)', isc: 19, xr: 15 },
    { value: 'TOLUCA', label: 'Toluca - Estado de México (23 kV)', isc: 21, xr: 15 },
    { value: 'CULIACAN', label: 'Culiacán - Sinaloa (23 kV)', isc: 13, xr: 20 },
    { value: 'HERMOSILLO', label: 'Hermosillo - Sonora (23 kV)', isc: 12, xr: 20 },
    { value: 'VILLAHERMOSA', label: 'Villahermosa - Tabasco (23 kV)', isc: 11, xr: 20 },
    { value: 'PVALLARTA', label: 'Puerto Vallarta - Jalisco (13.2 kV)', isc: 16, xr: 18 },
    { value: 'RURAL', label: 'Zona Rural - General (13.2 kV)', isc: 8, xr: 20 }
  ];

  const capacidadesTrafo = [
    15, 30, 45, 75, 112.5, 150, 225, 300, 500, 750, 1000, 1500, 2000, 2500, 3000, 3750, 5000, 7500, 10000, 15000, 20000, 25000, 30000, 37500, 50000, 75000, 100000
  ];

  const tensionesPrimarias = [
    { value: 13200, label: '13,200 V (Zona Rural/Turística)' },
    { value: 23000, label: '23,000 V (Zonas Urbanas)' },
    { value: 13800, label: '13,800 V (Personalizado)' },
    { value: 34500, label: '34,500 V' },
    { value: 66000, label: '66,000 V' },
    { value: 115000, label: '115,000 V' },
    { value: 230000, label: '230,000 V' }
  ];

  const tensionesSecundarias = [
    { value: 480, label: '480 V (3F)' },
    { value: 220, label: '220 V (3F)' },
    { value: 208, label: '208 V (3F)' },
    { value: 127, label: '127 V (1F)' },
    { value: 240, label: '240 V (1F)' },
    { value: 120, label: '120 V (1F)' },
    { value: 277, label: '277 V (3F)' }
  ];

  // Manejar resultados del módulo ICC
  const handleResults = useCallback((data) => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('Resultados recibidos del módulo ICC:', data);
    }
    setResults(data);

    // Detectar si hay falla para activar el logo
    const hasFault = Array.isArray(data) && data.some(punto =>
      punto?.I3F > 0 || punto?.IfTierra > 0
    );
    setFaultDetected(hasFault);
  }, []);

  // Manejar cuando el módulo está listo
  const handleReady = useCallback(() => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('Módulo ICC listo');
    }
    setIsReady(true);
  }, []);

  // Manejar refresco del módulo
  const handleRefresh = useCallback((data) => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('Módulo ICC refrescado:', data);
    }
    setResults(null);
    setFaultDetected(false);
  }, []);

  // Manejar exportación desde el módulo
  const handleExport = useCallback((exportData) => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('Solicitud de exportación:', exportData);
    }

    if (exportData.format === 'json' && exportData.data) {
      try {
        // Crear y descargar archivo JSON
        const jsonString = JSON.stringify(exportData.data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `icc_results_${new Date().getTime()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.error('Error en exportación:', error);
        }
        alert('Error al exportar datos');
      }
    }
  }, []);

  // Enviar comando de cálculo
  const handleCalculate = useCallback(() => {
    iccModuleRef.current?.calculate?.();
  }, []);

  // Resetear sistema
  const handleReset = useCallback(() => {
    iccModuleRef.current?.refresh?.();
    setResults(null);
    setFaultDetected(false);
  }, []);

  // Cargar modelo de ejemplo
  const loadExampleModel = useCallback(() => {
    const model = {
      estado: {
        tension: 220,
        isc: 28,
        xr: 12
      },
      trafo: {
        kva: 500,
        vp: 23000,
        vs: 480,
        z: 5.75
      }
    };
    iccModuleRef.current?.sendCommand?.('LOAD_MODEL', model);
    setSystemModel(model);
  }, []);

  // Funciones de manejo de archivos
  const saveFile = useCallback(async () => {
    if (isFileOperation) return;

    if (!currentFileName) {
      saveFileAs();
      return;
    }

    setIsFileOperation(true);

    try {
      const projectData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        systemModel,
        equipmentConfig,
        results
      };

      const dataStr = JSON.stringify(projectData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });

      const link = document.createElement('a');
      let url = null;

      try {
        url = URL.createObjectURL(dataBlob);
        link.href = url;
        link.download = currentFileName;
        document.body.appendChild(link);
        link.click();
      } catch (error) {
        handleError('Error al guardar el archivo', error);
      } finally {
        // Cleanup siempre se ejecuta
        if (url) {
          URL.revokeObjectURL(url);
        }
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
      }
    } finally {
      setIsFileOperation(false);
    }
  }, [currentFileName, systemModel, equipmentConfig, results, saveFileAs, isFileOperation, handleError]);

  const saveFileAs = useCallback(async () => {
    if (isFileOperation) return;

    setIsFileOperation(true);

    try {
      const projectData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        systemModel,
        equipmentConfig,
        results
      };

      const dataStr = JSON.stringify(projectData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });

      const link = document.createElement('a');
      let url = null;

      try {
        url = URL.createObjectURL(dataBlob);
        link.href = url;

        // Generar nombre de archivo por defecto
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const defaultFileName = `icc-project-${timestamp}.json`;

        link.download = defaultFileName;
        document.body.appendChild(link);
        link.click();

        setCurrentFileName(defaultFileName);
      } catch (error) {
        handleError('Error al guardar el archivo', error);
      } finally {
        // Cleanup siempre se ejecuta
        if (url) {
          URL.revokeObjectURL(url);
        }
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
      }
    } finally {
      setIsFileOperation(false);
    }
  }, [systemModel, equipmentConfig, results, isFileOperation, handleError]);

  const openFile = useCallback(() => {
    if (isFileOperation) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (event) => {
      const file = event.target.files[0];
      if (!file) return;

      setIsFileOperation(true);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const projectData = JSON.parse(e.target.result);

          // Validar que sea un archivo de proyecto ICC válido
          if (!projectData.version || !projectData.systemModel) {
            handleError('El archivo no es un proyecto ICC válido');
            return;
          }

          // Cargar los datos del proyecto
          if (projectData.systemModel) {
            setSystemModel(projectData.systemModel);
            iccModuleRef.current?.sendCommand?.('LOAD_MODEL', projectData.systemModel);
          }

          if (projectData.equipmentConfig) {
            setEquipmentConfig(projectData.equipmentConfig);
          }

          if (projectData.results) {
            setResults(projectData.results);
          }

          setCurrentFileName(file.name);
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.log('Proyecto cargado exitosamente:', file.name);
          }
        } catch (error) {
          handleError('Error al cargar el archivo. Verifique que sea un archivo JSON válido.', error);
        } finally {
          setIsFileOperation(false);
        }
      };

      reader.readAsText(file);
    };

    input.click();
  }, [isFileOperation, handleError]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar izquierdo con botones de archivo */}
      <aside className="w-64 bg-white shadow-lg border-r border-gray-200 fixed left-0 top-0 h-full z-20">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Archivo</h2>

          {/* Botones de archivo en sidebar */}
          <div className="space-y-2">
            <button
              onClick={openFile}
              disabled={isFileOperation}
              className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center justify-center"
              title="Abrir archivo de proyecto"
            >
              {isFileOperation ? 'Abriendo...' : 'Abrir Archivo'}
            </button>
            <button
              onClick={saveFile}
              disabled={isFileOperation}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center justify-center"
              title="Guardar proyecto"
            >
              {isFileOperation ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={saveFileAs}
              disabled={isFileOperation}
              className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center justify-center"
              title="Guardar proyecto como"
            >
              {isFileOperation ? 'Guardando...' : 'Guardar Como'}
            </button>
          </div>

          {/* Separador */}
          <div className="border-t border-gray-200 my-4"></div>

          {/* Botones de operación */}
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Operaciones</h2>
          <div className="space-y-2">
            <button
              onClick={loadExampleModel}
              disabled={!isReady}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              Cargar Ejemplo
            </button>
            <button
              onClick={handleCalculate}
              disabled={!isReady}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              Calcular ICC
            </button>
            <button
              onClick={handleReset}
              disabled={!isReady}
              className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              Reset
            </button>
          </div>

          {/* Archivo actual */}
          {currentFileName && (
            <div className="mt-6 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-600 font-medium truncate">
                {currentFileName}
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 ml-64">
        {/* Header con layout PRO estilo ETAP usando grid - DEBUG */}
        <header className="bg-white shadow-sm border-b relative z-50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="grid grid-cols-3 items-center">
              {/* Izquierda: Logo y título */}
              <div className="flex items-center space-x-4">
                <IcoreLogo active={faultDetected} />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Calculadora ICC Profesional
                  </h1>
                  <p className="text-sm text-gray-600">
                    Integración React + Módulo ICC
                  </p>
                </div>
              </div>

              {/* Centro: Botones principales - siempre centrado */}
              <div className="flex justify-center space-x-2">
                <button
                  onClick={loadExampleModel}
                  disabled={false}
                  className="px-4 py-2 bg-red-500 text-white border border-black rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                >
                  Cargar Ejemplo
                </button>
                <button
                  onClick={handleCalculate}
                  disabled={false}
                  className="px-4 py-2 bg-red-500 text-white border border-black rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                >
                  Calcular ICC
                </button>
                <button
                  onClick={handleReset}
                  disabled={false}
                  className="px-4 py-2 bg-red-500 text-white border border-black rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                >
                  Reset
                </button>
              </div>

              {/* Derecha: Espacio vacío para balance */}
              <div></div>
            </div>
          </div>
        </header>

        {/* Estado del sistema */}
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <span className="text-sm text-gray-600">Estado:</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${isReady ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                  {isReady ? 'Listo' : 'Cargando...'}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Modelo:</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${systemModel ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                  {systemModel ? 'Cargado' : 'Sin modelo'}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Resultados:</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${results ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                  {results ? 'Disponibles' : 'Pendientes'}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Falla:</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${faultDetected ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                  {faultDetected ? 'Detectada' : 'No detectada'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ⚡ Configuración de Equipos en React */}
        <div className="max-w-7xl mx-auto px-4 pb-8">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-blue-600 text-white px-4 py-2">
              <h2 className="text-lg font-semibold">
                ⚡ ICC Calculator - Configurar Equipos
              </h2>
            </div>
            <div className="p-6">
              {/* Modo de Cálculo */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Modo de Cálculo</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEquipmentConfig({ ...equipmentConfig, modoCalculo: 'conocido' })}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${equipmentConfig.modoCalculo === 'conocido'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                  >
                    Isc Conocido
                  </button>
                  <button
                    onClick={() => setEquipmentConfig({ ...equipmentConfig, modoCalculo: 'completo' })}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${equipmentConfig.modoCalculo === 'completo'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                  >
                    Cálculo Completo
                  </button>
                </div>
              </div>

              {/* Configuración Completa */}
              {equipmentConfig.modoCalculo === 'completo' && (
                <div className="space-y-6">
                  {/* Zona Eléctrica */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Zona Eléctrica</label>
                      <select
                        value={equipmentConfig.zonaElectrica}
                        onChange={(e) => setEquipmentConfig({ ...equipmentConfig, zonaElectrica: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Seleccionar zona...</option>
                        {zonasElectricas.map(zona => (
                          <option key={zona.value} value={zona.value}>
                            {zona.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Capacidad Transformador */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Capacidad Transformador (kVA)</label>
                      <select
                        value={equipmentConfig.trafoKva}
                        onChange={(e) => setEquipmentConfig({ ...equipmentConfig, trafoKva: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {capacidadesTrafo.map(kva => (
                          <option key={kva} value={kva}>{kva} kVA</option>
                        ))}
                      </select>
                    </div>

                    {/* % Impedancia */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">% Impedancia</label>
                      <input
                        type="number"
                        value={equipmentConfig.trafoZ}
                        onChange={(e) => setEquipmentConfig({ ...equipmentConfig, trafoZ: Number(e.target.value) })}
                        min="0.1"
                        max="15"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Tensiones */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tensión Primaria */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tensión Primaria (V)</label>
                      <select
                        value={equipmentConfig.trafoVp}
                        onChange={(e) => setEquipmentConfig({ ...equipmentConfig, trafoVp: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {tensionesPrimarias.map(tension => (
                          <option key={tension.value} value={tension.value}>
                            {tension.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Tensión Secundaria */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tensión Secundaria (V)</label>
                      <select
                        value={equipmentConfig.trafoVs}
                        onChange={(e) => setEquipmentConfig({ ...equipmentConfig, trafoVs: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {tensionesSecundarias.map(tension => (
                          <option key={tension.value} value={tension.value}>
                            {tension.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Información de Zona */}
                  {equipmentConfig.zonaElectrica && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-2">Información de Zona Seleccionada</h4>
                      {(() => {
                        const zona = zonasElectricas.find(z => z.value === equipmentConfig.zonaElectrica);
                        return zona ? (
                          <div className="text-sm text-blue-800">
                            <p><strong>Isc en MT:</strong> {zona.isc} kA</p>
                            <p><strong>X/R:</strong> {zona.xr}</p>
                            <p className="text-xs mt-1">Valores típicos de cortocircuito en media tensión. Confirmar con CFE para diseño definitivo.</p>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Modo Conocido */}
              {equipmentConfig.modoCalculo === 'conocido' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Isc Disponible (kA)</label>
                      <input
                        type="number"
                        value={equipmentConfig.iscConocido || 10}
                        onChange={(e) => setEquipmentConfig({ ...equipmentConfig, iscConocido: Number(e.target.value) })}
                        min="0.1"
                        step="0.1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tensión (V)</label>
                      <input
                        type="number"
                        value={equipmentConfig.tension || 220}
                        onChange={(e) => setEquipmentConfig({ ...equipmentConfig, tension: Number(e.target.value) })}
                        min="1"
                        step="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Botones de Acción */}
              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => {
                    // Enviar configuración al módulo ICC
                    iccModuleRef.current?.sendCommand?.('LOAD_CONFIG', equipmentConfig);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Aplicar Configuración
                </button>
                <button
                  onClick={() => {
                    setEquipmentConfig({
                      zonaElectrica: '',
                      trafoKva: 500,
                      trafoVp: 23000,
                      trafoVs: 480,
                      trafoZ: 5.75,
                      modoCalculo: 'conocido'
                    });
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Módulo ICC incrustado */}
        <div className="max-w-7xl mx-auto px-4 pb-8">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gray-800 text-white px-4 py-2">
              <h2 className="text-lg font-semibold">
                Módulo de Cálculo ICC (HTML Incrustado)
              </h2>
            </div>
            <div className="h-[800px]">
              <ICCModule
                ref={iccModuleRef}
                systemModel={systemModel}
                onResults={handleResults}
                onReady={handleReady}
                onRefresh={handleRefresh}
                onExport={handleExport}
              />
            </div>
          </div>
        </div>

        {/* Panel de resultados (si existen) */}
        {results && (
          <div className="max-w-7xl mx-auto px-4 pb-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Resultados del Cálculo</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((punto, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900">{punto.nombre || punto.id}</h3>
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">I3F:</span>
                        <span className="font-medium">{punto.I3F || 0} A</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">I2F:</span>
                        <span className="font-medium">{punto.I2F || 0} A</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">If-tierra:</span>
                        <span className="font-medium">{punto.IfTierra || 0} A</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Validación:</span>
                        <span className={`font-medium ${punto.validacion?.ok ? 'text-green-600' : 'text-red-600'
                          }`}>
                          {punto.validacion?.ok ? 'OK' : 'Error'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
