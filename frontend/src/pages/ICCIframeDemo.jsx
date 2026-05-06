/**
 * ICCIframeDemo - Página de demostración de la integración iframe
 * Muestra cómo React se comunica con el módulo HTML existente
 */

import { useState, useCallback, useEffect } from 'react';
import ICCModule from '../components/ICCModule';

export default function ICCIframeDemo() {
  const [systemModel, setSystemModel] = useState(null);
  const [results, setResults] = useState(null);
  const [isModuleReady, setIsModuleReady] = useState(false);
  const [logs, setLogs] = useState([]);

  // Agregar log
  const addLog = useCallback((message, type = 'info') => {
    setLogs(prev => [...prev, { 
      message, 
      type, 
      timestamp: new Date().toLocaleTimeString() 
    }].slice(-10));
  }, []);

  // Cargar modelo de ejemplo
  const loadExampleModel = () => {
    const model = {
      buses: [
        { id: 'bus1', name: 'Fuente Principal', voltage: 480 },
        { id: 'bus2', name: 'Tablero Distribución', voltage: 480 },
        { id: 'bus3', name: 'Carga Motor 1', voltage: 480 }
      ],
      branches: [
        { id: 'br1', from: 'bus1', to: 'bus2', size: 300, current: 250 },
        { id: 'br2', from: 'bus2', to: 'bus3', size: 150, current: 100 }
      ],
      breakers: [
        { 
          id: 'cb1', 
          model: 'MGA36500', 
          In: 500,
          pickup: 550,
          tms: 0.5,
          inst: 5000
        },
        { 
          id: 'cb2', 
          model: 'MGA32500', 
          In: 250,
          pickup: 275,
          tms: 0.1,
          inst: 2500
        }
      ]
    };
    
    setSystemModel(model);
    addLog('Modelo de sistema cargado', 'success');
  };

  // Manejar resultados del módulo
  const handleResults = useCallback((data) => {
    setResults(data);
    addLog(`Resultados recibidos: ${JSON.stringify(data).substring(0, 100)}...`, 'success');
  }, [addLog]);

  // Manejar cuando el módulo está listo
  const handleReady = useCallback(() => {
    setIsModuleReady(true);
    addLog('Módulo ICC listo', 'success');
  }, [addLog]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Demo: Integración React ↔ HTML (iframe)
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel izquierdo: Controles */}
        <div className="space-y-6">
          {/* Estado */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Estado</h2>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                isModuleReady ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
              }`} />
              <span className="text-gray-700">
                {isModuleReady ? 'Módulo listo' : 'Esperando módulo...'}
              </span>
            </div>
            {results && (
              <div className="mt-3 p-3 bg-green-50 text-green-800 rounded text-sm">
                ✅ Resultados recibidos del módulo
              </div>
            )}
          </div>

          {/* Controles */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Controles</h2>
            <div className="space-y-3">
              <button
                onClick={loadExampleModel}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                📦 Cargar Modelo de Ejemplo
              </button>
              
              <button
                onClick={() => {
                  setSystemModel(null);
                  setResults(null);
                  addLog('Modelo limpiado', 'info');
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
              >
                🧹 Limpiar
              </button>
            </div>
          </div>

          {/* Logs */}
          <div className="bg-black text-green-400 p-4 rounded-lg shadow font-mono text-sm">
            <h2 className="text-white font-semibold mb-2">Logs de Comunicación</h2>
            <div className="h-48 overflow-y-auto space-y-1">
              {logs.length === 0 ? (
                <span className="text-gray-500">Esperando mensajes...</span>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="text-xs">
                    <span className="text-gray-500">[{log.timestamp}]</span>{' '}
                    <span className={
                      log.type === 'error' ? 'text-red-400' : 
                      log.type === 'success' ? 'text-green-400' : 
                      'text-blue-400'
                    }>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Resultados */}
          {results && (
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">Últimos Resultados</h2>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Panel derecho: Módulo iframe */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Módulo ICC (iframe)</h2>
          <div className="border-2 border-gray-200 rounded" style={{ height: '600px' }}>
            <ICCModule
              systemModel={systemModel}
              onResults={handleResults}
              onReady={handleReady}
            />
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Este es el módulo cortocircuito HTML existente embebido en React
          </p>
        </div>
      </div>

      {/* Instrucciones */}
      <div className="mt-8 bg-blue-50 p-6 rounded-lg">
        <h2 className="text-lg font-semibold mb-4 text-blue-800">
          Cómo funciona la comunicación
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h3 className="font-semibold mb-2">React → HTML (postMessage)</h3>
            <pre className="bg-gray-800 text-gray-100 p-3 rounded">
{`iframe.contentWindow.postMessage({
  type: 'LOAD_MODEL',
  data: systemModel
}, '*');`}
            </pre>
          </div>
          <div>
            <h3 className="font-semibold mb-2">HTML → React (postMessage)</h3>
            <pre className="bg-gray-800 text-gray-100 p-3 rounded">
{`window.parent.postMessage({
  type: 'RESULTS',
  data: results
}, '*');`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
