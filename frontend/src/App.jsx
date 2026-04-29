import React from 'react'
import Editor from './components/Editor'
import Sidebar from './components/Sidebar'
import { useStore } from './store/useStore'

function App() {
  // Use individual selectors to prevent re-renders from unrelated store changes
  const calculateICC = useStore(state => state.calculateICC)
  const generatePDF = useStore(state => state.generatePDF)
  const mode = useStore(state => state.mode)
  const setMode = useStore(state => state.setMode)
  const systemMode = useStore(state => state.systemMode)
  const setSystemMode = useStore(state => state.setSystemMode)
  const calculateShortCircuitFromGraph = useStore(
    state => state.calculateShortCircuitFromGraph
  )
  const isPlaying = useStore(state => state.isPlaying)
  const currentTime = useStore(state => state.currentTime)
  const maxTime = useStore(state => state.maxTime)
  const playbackSpeed = useStore(state => state.playbackSpeed)
  const playPlayback = useStore(state => state.playPlayback)
  const pausePlayback = useStore(state => state.pausePlayback)
  const stepPlayback = useStore(state => state.stepPlayback)
  const rewindPlayback = useStore(state => state.rewindPlayback)
  const setPlaybackSpeed = useStore(state => state.setPlaybackSpeed)
  const setCurrentTime = useStore(state => state.setCurrentTime)

  return (
    <div className="flex h-screen w-screen">
      {/* Sidebar con componentes arrastrables */}
      <Sidebar />

      {/* Canvas del editor */}
      <div className="flex-1 relative">
        <Editor />

        {/* Barra de herramientas superior */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center bg-white p-3 rounded-lg shadow-lg z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-800">
              ⚡ ICC Calculator
            </h1>

            {/* Mode toggle */}
            <div className="flex bg-gray-200 rounded-lg p-1">
              <button
                onClick={() => setMode('edit')}
                className={`px-4 py-2 rounded-md transition ${
                  mode === 'edit'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-300'
                }`}
              >
                Modo Edición
              </button>
              <button
                onClick={() => setMode('simulation')}
                className={`px-4 py-2 rounded-md transition ${
                  mode === 'simulation'
                    ? 'bg-green-600 text-white'
                    : 'text-gray-700 hover:bg-gray-300'
                }`}
              >
                Modo Simulación
              </button>
            </div>

            {/* System Mode toggle - NEW: ATS modes */}
            <div className="flex bg-gray-200 rounded-lg p-1">
              <button
                onClick={() => setSystemMode('normal')}
                className={`px-4 py-2 rounded-md transition ${
                  systemMode === 'normal'
                    ? 'bg-green-600 text-white'
                    : 'text-gray-700 hover:bg-gray-300'
                }`}
                title="Modo Normal: Red eléctrica activa"
              >
                🟢 Normal
              </button>
              <button
                onClick={() => setSystemMode('emergency')}
                className={`px-4 py-2 rounded-md transition ${
                  systemMode === 'emergency'
                    ? 'bg-red-600 text-white'
                    : 'text-gray-700 hover:bg-gray-300'
                }`}
                title="Modo Emergencia: Generador activo"
              >
                🔴 Emergencia
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                // Esta función se implementará en el componente Editor
                // Por ahora, mostrar mensaje
                alert(
                  'Selecciona elementos y presiona DELETE para eliminar, o usa el botón en el panel de propiedades.'
                )
              }}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
              title="Eliminar elementos seleccionados (o presiona DELETE)"
            >
              🗑️ Eliminar
            </button>
            {mode === 'edit' && (
              <>
                <button
                  onClick={calculateICC}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  Calcular ICC
                </button>
                <button
                  onClick={calculateShortCircuitFromGraph}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition"
                >
                  Cortocircuito
                </button>
                <button
                  onClick={generatePDF}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                >
                  Generar PDF
                </button>
              </>
            )}
            {mode === 'simulation' && (
              <button
                onClick={() => setMode('edit')}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
              >
                Volver a Edición
              </button>
            )}
          </div>
        </div>

        {/* Simulation mode overlay */}
        {mode === 'simulation' && (
          <div className="absolute bottom-4 left-4 right-4 bg-white p-4 rounded-lg shadow-lg z-10">
            <div className="flex flex-col gap-4">
              {/* Playback controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Playback buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={rewindPlayback}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                      title="Rewind to start"
                    >
                      ⏪
                    </button>
                    <button
                      onClick={isPlaying ? pausePlayback : playPlayback}
                      className={`px-4 py-2 ${isPlaying ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'} text-white rounded transition`}
                      title={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? '⏸' : '▶'}
                    </button>
                    <button
                      onClick={() => stepPlayback(0.01)}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                      title="Step forward"
                    >
                      ⏭
                    </button>
                  </div>

                  {/* Timeline slider */}
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm text-gray-500">0.0s</span>
                    <input
                      type="range"
                      min="0"
                      max={maxTime}
                      step="0.01"
                      value={currentTime}
                      onChange={e => setCurrentTime(parseFloat(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-500">
                      {maxTime.toFixed(1)}s
                    </span>
                  </div>

                  {/* Speed control */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Speed:</span>
                    <select
                      value={playbackSpeed}
                      onChange={e =>
                        setPlaybackSpeed(parseFloat(e.target.value))
                      }
                      className="px-2 py-1 border rounded text-sm"
                    >
                      <option value={0.25}>0.25x</option>
                      <option value={0.5}>0.5x</option>
                      <option value={1.0}>1x</option>
                      <option value={2.0}>2x</option>
                      <option value={4.0}>4x</option>
                    </select>
                  </div>

                  {/* Current time display */}
                  <div className="text-lg font-mono text-gray-700 min-w-[80px] text-center">
                    {currentTime.toFixed(2)}s
                  </div>
                </div>
              </div>

              {/* Status indicators */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}
                    ></div>
                    <span className="text-gray-600">
                      {isPlaying ? 'Reproduciendo' : 'Pausado'}
                    </span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      Voltaje (color)
                    </span>
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                      Corriente (tooltip)
                    </span>
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded">
                      Protección (iconos)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
App.propTypes = {
  // No props - uses Zustand store
}

export default App
