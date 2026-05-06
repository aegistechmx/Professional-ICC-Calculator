/**
 * LogoDemo - Página de demostración del logo animado
 * Muestra los diferentes estados del logo
 */

import { useState } from 'react';
import IcoreLogoAnimated from './IcoreLogoAnimated';

export default function LogoDemo() {
  const [active, setActive] = useState(true);
  const [faultDetected, setFaultDetected] = useState(false);
  const [playSound, setPlaySound] = useState(false);
  const [size, setSize] = useState(200);

  const triggerFault = () => {
    setFaultDetected(true);
    // Auto-reset después de 3 segundos
    setTimeout(() => setFaultDetected(false), 3000);
  };

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white">
      <h1 className="text-3xl font-bold mb-8 text-center">
        ICORE ICC Logo Animado
      </h1>

      {/* Logo principal */}
      <div className="flex justify-center mb-12">
        <IcoreLogoAnimated 
          active={active}
          faultDetected={faultDetected}
          size={size}
          playSound={playSound}
        />
      </div>

      {/* Controles */}
      <div className="max-w-md mx-auto space-y-6 bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Controles</h2>
        
        {/* Toggle Activo */}
        <div className="flex items-center justify-between">
          <label className="text-gray-300">Modo Activo</label>
          <button
            onClick={() => setActive(!active)}
            className={`px-4 py-2 rounded ${
              active ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'
            }`}
          >
            {active ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Toggle Sonido */}
        <div className="flex items-center justify-between">
          <label className="text-gray-300">Sonido (Zap)</label>
          <button
            onClick={() => setPlaySound(!playSound)}
            className={`px-4 py-2 rounded ${
              playSound ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'
            }`}
          >
            {playSound ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Tamaño */}
        <div>
          <label className="text-gray-300 block mb-2">
            Tamaño: {size}px
          </label>
          <input
            type="range"
            min="100"
            max="400"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>

        {/* Botón de falla */}
        <button
          onClick={triggerFault}
          disabled={faultDetected}
          className={`w-full py-3 rounded-lg font-bold text-lg ${
            faultDetected 
              ? 'bg-red-600 animate-pulse' 
              : 'bg-red-500 hover:bg-red-600'
          }`}
        >
          {faultDetected ? '⚡ FALLA DETECTADA ⚡' : '⚡ Simular Falla'}
        </button>
      </div>

      {/* Descripción de estados */}
      <div className="max-w-2xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 p-4 rounded text-center">
          <div className="text-4xl mb-2">😴</div>
          <h3 className="font-semibold text-gray-400">Inactivo</h3>
          <p className="text-sm text-gray-500 mt-2">
            Sin animaciones, opacidad reducida
          </p>
        </div>
        
        <div className="bg-gray-800 p-4 rounded text-center">
          <div className="text-4xl mb-2">⚡</div>
          <h3 className="font-semibold text-blue-400">Activo</h3>
          <p className="text-sm text-gray-500 mt-2">
            Anillo girando, rayo pulsando, glow azul
          </p>
        </div>
        
        <div className="bg-gray-800 p-4 rounded text-center">
          <div className="text-4xl mb-2">🔥</div>
          <h3 className="font-semibold text-red-400">Falla</h3>
          <p className="text-sm text-gray-500 mt-2">
            Vibración, chispas, glow rojo, sonido
          </p>
        </div>
      </div>

      {/* Código de uso */}
      <div className="max-w-2xl mx-auto mt-12 bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Uso en tu aplicación:</h3>
        <pre className="bg-gray-900 p-4 rounded text-sm overflow-x-auto">
{`import IcoreLogoAnimated from './components/IcoreLogoAnimated';

// En tu componente:
<IcoreLogoAnimated 
  active={true}           // Modo activo/idle
  faultDetected={false}  // Modo falla (vibración + glow rojo)
  size={200}             // Tamaño en píxeles
  playSound={true}       // Reproducir sonido zap
/>`}
        </pre>
        
        <p className="text-gray-400 mt-4 text-sm">
          Conecta con tu motor ICC:
        </p>
        <pre className="bg-gray-900 p-4 rounded text-sm overflow-x-auto mt-2">
{`const faultDetected = result?.fault?.Isc > 0;
const isRunning = status === 'running';

<IcoreLogoAnimated 
  active={isRunning}
  faultDetected={faultDetected}
/>`}
        </pre>
      </div>
    </div>
  );
}
