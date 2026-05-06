import React, { useState, useCallback, useEffect } from 'react'
import Editor from './components/Editor'
import Sidebar from './components/Sidebar'
import CortocircuitoPage from './modules/cortocircuito/CortocircuitoPage'
import ICCModule from './components/ICCModule'
import { useStore } from './store/useStore'

function App() {
  const [currentView, setCurrentView] = useState('editor')
  const [syncFilename, setSyncFilename] = useState('Sin sincronizar')
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
  const setShortCircuitResults = useStore(state => state.setShortCircuitResults)
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

  // File operations
  const nodes = useStore(state => state.nodes)
  const edges = useStore(state => state.edges)
  const setNodes = useStore(state => state.setNodes)
  const setEdges = useStore(state => state.setEdges)

  // Sincronización bidireccional con módulo cortocircuito (solo manual)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'icc-sync-nodes' && e.newValue) {
        try {
          const newNodes = JSON.parse(e.newValue)
          setNodes(newNodes)
        } catch (error) {
          // Silently ignore parse errors
        }
      } else if (e.key === 'icc-sync-edges' && e.newValue) {
        try {
          const newEdges = JSON.parse(e.newValue)
          setEdges(newEdges)
        } catch (error) {
          // Silently ignore parse errors
        }
      } else if (e.key === 'icc-sync-filename' && e.newValue) {
        setSyncFilename(e.newValue)
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [setNodes, setEdges, setSyncFilename])

  // Save project to JSON file
  const handleSaveProject = () => {
    const projectData = {
      nodes,
      edges,
      timestamp: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(projectData, null, 2)], {
      type: 'application/json'
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `icc-project-${Date.now()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Load project from JSON file
  const loadProjectFromFile = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'

    input.onchange = (event) => {
      const file = event.target.files[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const projectData = JSON.parse(e.target.result)

          if (projectData.nodes && projectData.edges) {
            setNodes(projectData.nodes)
            setEdges(projectData.edges)
          } else {
            alert('Formato de archivo inválido. El archivo debe contener nodes y edges.')
          }
        } catch (error) {
          alert('Error al leer el archivo. Verifique que sea un JSON válido.')
        }
      }

      reader.readAsText(file)
    }

    input.click()
  }, [setNodes, setEdges])

  // Handle cortocircuito calculation with feedback - using backend endpoint
  const handleCortocircuito = async () => {
    try {
      await calculateShortCircuitFromGraph()
      alert('Cálculo de cortocircuito completado. ICC actualizado en nodos.')
    } catch (error) {
      alert('Error en cálculo: ' + (error.message || 'Error desconocido'))
    }
  }

  // Handle ICC results from HTML module (legacy - kept for compatibility)
  const handleICCResults = (results) => {
    const updatedNodes = nodes.map(node => {
      const nodeResult = results?.puntos?.find(p => p.id === node.id) ||
        results?.[node.id] ||
        results?.nodeResults?.[node.id]

      if (!nodeResult) return node

      return {
        ...node,
        data: {
          ...node.data,
          results: {
            ...(node.data?.results || {}),
            isc: nodeResult.isc_3f || nodeResult.I_3F || nodeResult.Icc || nodeResult.isc,
            isc_1f: nodeResult.isc_1f || nodeResult.I_1F,
            Icc: nodeResult.Icc || nodeResult.isc_3f_ka,
            timestamp: new Date().toISOString(),
          },
        },
      }
    })

    setNodes(updatedNodes)
    setShortCircuitResults(results)
  }

  // Manual sync function
  const handleManualSync = () => {
    try {
      const filename = `Proyecto ICC ${new Date().toLocaleTimeString()}`

      // Forzar guardado inmediato en localStorage
      localStorage.setItem('icc-sync-nodes', JSON.stringify(nodes))
      localStorage.setItem('icc-sync-edges', JSON.stringify(edges))
      localStorage.setItem('icc-sync-filename', filename)
      localStorage.setItem('icc-sync-timestamp', new Date().toISOString())

      // Actualizar estado local
      setSyncFilename(filename)

      // Disparar evento storage manualmente para notificar al módulo
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'icc-sync-nodes',
        newValue: JSON.stringify(nodes),
        oldValue: null
      }))

      window.dispatchEvent(new StorageEvent('storage', {
        key: 'icc-sync-filename',
        newValue: filename,
        oldValue: null
      }))

    } catch (error) {
      alert('Error en sincronización: ' + error.message)
    }
  }

  return (
    <div className="flex h-screen w-screen">
      {/* Sidebar con componentes arrastrables */}
      <Sidebar />

      {/* Canvas del editor */}
      <div className="flex-1 relative">
        <Editor />

        {/* Barra de herramientas superior */}
        <div className="absolute top-4 left-4 right-80 flex items-center bg-white p-3 rounded-lg shadow-lg z-10">
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-xl font-bold text-gray-800">
              ⚡ ICC Calculator
            </h1>

            {/* Mode toggle */}
            <div className="flex bg-gray-200 rounded-lg p-1">
              <button
                onClick={() => setMode('edit')}
                className={`px-4 py-2 rounded-md transition ${mode === 'edit'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-300'
                  }`}
              >
                Modo Edición
              </button>
              <button
                onClick={() => setMode('simulation')}
                className={`px-4 py-2 rounded-md transition ${mode === 'simulation'
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
                className={`px-4 py-2 rounded-md transition ${systemMode === 'normal'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-700 hover:bg-gray-300'
                  }`}
                title="Modo Normal: Red eléctrica activa"
              >
                🟢 Normal
              </button>
              <button
                onClick={() => setSystemMode('emergency')}
                className={`px-4 py-2 rounded-md transition ${systemMode === 'emergency'
                  ? 'bg-red-600 text-white'
                  : 'text-gray-700 hover:bg-gray-300'
                  }`}
                title="Modo Emergencia: Generador activo"
              >
                🔴 Emergencia
              </button>
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
              <button
                onClick={loadProjectFromFile}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                title="Cargar proyecto desde archivo JSON"
              >
                📁 Abrir
              </button>
              <button
                onClick={handleSaveProject}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                title="Guardar proyecto como archivo JSON"
              >
                💾 Guardar
              </button>
              <button
                onClick={handleManualSync}
                className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition flex items-center gap-2"
                title={`Sincronizar con módulo cortocircuito - ${syncFilename}`}
              >
                🔄 <span className="hidden sm:inline truncate max-w-[150px]">{syncFilename}</span>
              </button>
              {mode === 'edit' && (
                <>
                  <button
                    onClick={() => setCurrentView('cortocircuito')}
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
                  >
                    Módulo Cortocircuito (React)
                  </button>
                  <button
                    onClick={() => setCurrentView('icc-iframe')}
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
                  >
                    Módulo ICC (iframe)
                  </button>
                  <button
                    onClick={calculateICC}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                  >
                    Calcular ICC
                  </button>
                  <button
                    onClick={handleCortocircuito}
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

      {currentView === 'cortocircuito' && (
        <div className="fixed inset-0 bg-white z-50">
          <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-800">⚡ Módulo de Cortocircuito</h1>
            <button
              onClick={() => setCurrentView('editor')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
            >
              ← Volver al Editor
            </button>
          </div>
          <CortocircuitoPage />
        </div>
      )}

      {currentView === 'icc-iframe' && (
        <div className="fixed inset-0 bg-gray-100 z-50 flex flex-col">
          <div className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-800">⚡ Módulo ICC (HTML)</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCortocircuito}
                className="px-4 py-2 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition"
              >
                Calcular ICC
              </button>
              <button
                onClick={() => setCurrentView('editor')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
              >
                ← Volver al Editor
              </button>
            </div>
          </div>
          <div className="flex-1 p-4">
            <ICCModule
              onResults={handleICCResults}
              className="h-full"
            />
          </div>
        </div>
      )}
    </div>
  )
}
App.propTypes = {
  // No props - uses Zustand store
}

export default App
