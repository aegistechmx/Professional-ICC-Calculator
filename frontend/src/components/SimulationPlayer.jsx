import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { useSimStore } from '../store/simStore'

/**
 * Simulation timeline player
 * Controls playback of time-based simulation (0-200ms)
 */
export default function SimulationPlayer({ simulationData }) {
  const {
    isPlaying,
    playbackSpeed,
    setTiempo,
    setPlaying,
    setPlaybackSpeed,
    setSimulationData,
  } = useSimStore()
  const [localTime, setLocalTime] = useState(0)

  useEffect(() => {
    if (simulationData) {
      setSimulationData(simulationData)
    }
  }, [simulationData, setSimulationData])

  useEffect(() => {
    if (!isPlaying) return

    let t = localTime
    const interval = setInterval(() => {
      t += 0.001 * playbackSpeed

      if (t >= 0.2) {
        t = 0.2
        setPlaying(false)
      }

      setLocalTime(t)
      setTiempo(t)
    }, 20)

    return () => clearInterval(interval)
  }, [isPlaying, playbackSpeed, setPlaying, setTiempo, localTime])

  const handlePlayPause = () => {
    setPlaying(!isPlaying)
  }

  const handleReset = () => {
    setLocalTime(0)
    setTiempo(0)
    setPlaying(false)
  }

  const handleSliderChange = e => {
    const value = parseFloat(e.target.value)
    setLocalTime(value)
    setTiempo(value)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-4 mb-3">
        <button
          onClick={handlePlayPause}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition"
        >
          {isPlaying ? '⏸ Pausa' : '▶ Reproducir'}
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition"
        >
          ↺ Reiniciar
        </button>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Velocidad:</label>
          <select
            value={playbackSpeed}
            onChange={e => setPlaybackSpeed(parseFloat(e.target.value))}
            className="px-2 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={5}>5x</option>
          </select>
        </div>
      </div>

      <div className="mb-2">
        <input
          type="range"
          min="0"
          max="0.2"
          step="0.001"
          value={localTime}
          onChange={handleSliderChange}
          className="w-full"
        />
      </div>

      <div className="text-sm text-gray-600 font-mono">
        t = {localTime.toFixed(3)} s
      </div>
    </div>
  )
}

SimulationPlayer.propTypes = {
  simulationData: PropTypes.object,
}
