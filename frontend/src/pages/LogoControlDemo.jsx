/**
 * LogoControlDemo - Demostración de control del logo desde React
 * Muestra cómo activar el modo falla en el logo del módulo HTML
 */

import { useState, useCallback } from 'react';
import ICCModule from '../components/ICCModule';

export default function LogoControlDemo() {
  const [isReady, setIsReady] = useState(false);
  const [active, setActive] = useState(true);
  const [faultMode, setFaultMode] = useState(false);

  const handleReady = useCallback(() => {
    setIsReady(true);
  }, []);

  // Enviar comando al iframe para cambiar estado del logo
  const sendLogoCommand = (command) => {
    const iframe = document.querySelector('iframe[src*="cortocircuito"]');
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'SET_LOGO_STATE',
        data: command
      }, '*');
    }
  };

  const activateFault = () => {
    setFaultMode(true);
    sendLogoCommand({ active: true, fault: true });
    
    // Auto-reset después de 3 segundos
    setTimeout(() => {
      setFaultMode(false);
      sendLogoCommand({ active: true, fault: false });
    }, 3000);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">
        Demo: Control del Logo desde React
      </h1>

      {/* Controles del Logo */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Controles del Logo</h2>
        
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => {
              setActive(!active);
              sendLogoCommand({ active: !active, fault: false });
            }}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              active 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {active ? '🟢 Activo' : '⚪ Inactivo'}
          </button>

          <button
            onClick={activateFault}
            disabled={faultMode}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              faultMode
                ? 'bg-red-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {faultMode ? '⚡ FALLA ACTIVA...' : '⚡ Simular Falla'}
          </button>

          <button
            onClick={() => sendLogoCommand({ active: false, fault: false })}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            😴 Apagar
          </button>
        </div>

        <div className="mt-4 p-4 bg-gray-100 rounded">
          <p className="text-sm font-mono">
            Comando enviado: {JSON.stringify({ active, fault: faultMode })}
          </p>
        </div>
      </div>

      {/* Módulo ICC con Logo */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Módulo ICC</h2>
          <span className={`px-3 py-1 rounded-full text-sm ${
            isReady ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {isReady ? 'Listo' : 'Cargando...'}
          </span>
        </div>
        
        <div className="border-2 border-gray-200 rounded" style={{ height: '500px' }}>
          <ICCModule
            onReady={handleReady}
            systemModel={null}
          />
        </div>
      </div>

      {/* Instrucciones */}
      <div className="mt-6 bg-blue-50 p-6 rounded-lg">
        <h3 className="font-semibold mb-2">Código usado:</h3>
        <pre className="bg-gray-800 text-gray-100 p-4 rounded text-sm">
{`// Desde React, enviar comando al iframe
iframe.contentWindow.postMessage({
  type: 'SET_LOGO_STATE',
  data: { 
    active: true,   // Logo animado
    fault: true     // Modo falla (rojo + vibración)
  }
}, '*');`}
        </pre>
      </div>
    </div>
  );
}
