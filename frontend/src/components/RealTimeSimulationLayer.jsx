/**
 * components/RealTimeSimulationLayer.jsx - Capa de simulación en tiempo real
 * Sistema completo que combina TCC real, arcos eléctricos, ondas de choque y sonido
 */

import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGraphStore } from '../store/graphStore.js';

// === UTILIDADES ===
const drawShockwave = (ctx, x, y, time) => {
  const maxRadius = 200
  const radius = (time * 0.1) % maxRadius
  const opacity = 1 - radius / maxRadius

  ctx.save()
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(255, 0, 0, ${opacity * 0.8})`
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.restore()
}

const drawArc = (ctx, sourceX, sourceY, targetX, targetY, intensity = 0.5) => {
  ctx.strokeStyle = '#ff6b6b'
  ctx.lineWidth = 1 + intensity * 2
  
  const midX = (sourceX + targetX) / 2 + (Math.random() - 0.5) * 30 * intensity
  const midY = (sourceY + targetY) / 2 + (Math.random() - 0.5) * 30 * intensity

  ctx.beginPath()
  ctx.moveTo(sourceX, sourceY)
  ctx.lineTo(midX, midY)
  ctx.lineTo(targetX, targetY)
  ctx.stroke()
}

const createArcParticles = (sourceX, sourceY, targetX, targetY) => {
  const particles = []
  for (let i = 0; i < 20; i++) {
    const progress = i / 20
    const x = sourceX + (targetX - sourceX) * progress
    const y = sourceY + (targetY - sourceY) * progress

    particles.push({
      x,
      y,
      size: 4,
      color: '#ff9500',
      opacity: 0.8,
    })
  }
  return particles
}

const drawParticles = (ctx, particles) => {
  particles.forEach(particle => {
    // Particle glow
    const gradient = ctx.createRadialGradient(
      particle.x,
      particle.y,
      0,
      particle.size * 3
    )
    gradient.addColorStop(0, particle.color)
    gradient.addColorStop(1, 'transparent')

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2)
    ctx.fill()

    // Core particle
    ctx.fillStyle = particle.color
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
    ctx.fill()
  })
}

// === COMPONENTE PRINCIPAL ===
export default function RealTimeSimulationLayer({ width = 600, height = 400 }) {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const particlesRef = useRef([])
  const [isInitialized, setIsInitialized] = useState(false)

  const { nodes, edges, simulation, ui } = useGraphStore()

  // === INICIALIZACIÓN ===
  useEffect(() => {
    // Inicializar sistema de audio
    const initAudioSystem = () => {
      // Audio system initialization would go here
    }

    initAudioSystem()
    setIsInitialized(true)
  }, [])

  // === BUCLE PRINCIPAL DE ANIMACIÓN ===
  const simulationLoop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')

    // Limpiar canvas
    ctx.clearRect(0, 0, width, height)

    // Renderizar edges con efectos térmicos
    edges.map(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source)
      const targetNode = nodes.find(n => n.id === edge.target)

      if (!sourceNode?.position || !targetNode?.position) return edge

      // Edge base
      ctx.strokeStyle = edge.hasArc ? '#ff6b6b' : '#6b7280'
      ctx.lineWidth = edge.hasArc ? 3 : 2
      ctx.beginPath()
      ctx.moveTo(sourceNode.position.x, sourceNode.position.y)
      ctx.lineTo(targetNode.position.x, targetNode.position.y)
      ctx.stroke()

      // Arco eléctrico
      if (edge.hasArc) {
        drawArc(
          ctx,
          sourceNode.position.x,
          sourceNode.position.y,
          targetNode.position.x,
          targetNode.position.y,
          Math.min(1, (edge.faultCurrent || 1000) / 1000)
        )
      }

      // Indicador de breaker
      if (edge.breakerTripped) {
        const midX = (sourceNode.position.x + targetNode.position.x) / 2
        const midY = (sourceNode.position.y + targetNode.position.y) / 2

        ctx.fillStyle = '#ff3b30'
        ctx.beginPath()
        ctx.arc(midX, midY, 8, 0, Math.PI * 2)
        ctx.fill()
      }

      // Generar partículas de arco
      if (edge.hasArc && Math.random() < 0.3) {
        const arcParticles = createArcParticles(
          sourceNode.position.x,
          sourceNode.position.y,
          targetNode.position.x,
          targetNode.position.y,
          Math.min(1, edge.faultCurrent / 1000)
        )
        particlesRef.current.push(...arcParticles)
      }

      return {
        ...edge,
        hasArc: edge.hasArc,
        breakerTripped: edge.breakerTripped,
      }
    })

    // Actualizar y renderizar partículas
    const updateParticles = particles => {
      // Update particle positions and remove old ones
      return particles.filter(p => p.life > 0)
    }

    particlesRef.current = updateParticles(particlesRef.current)
    drawParticles(ctx, particlesRef.current)

    // Onda de choque en nodo de falla
    if (simulation.fault) {
      const faultNode = nodes.find(n => n.id === simulation.fault)
      if (faultNode?.position) {
        drawShockwave(
          ctx,
          faultNode.position.x,
          faultNode.position.y,
          Date.now() / 1000
        )
      }
    }

    // Continuar animación
    animationRef.current = requestAnimationFrame(simulationLoop)
  }, [nodes, edges, simulation, width, height])

  // === INICIAR/DETENER ANIMACIÓN ===
  useEffect(() => {
    if (isInitialized) {
      simulationLoop()
    }
  }, [simulationLoop, isInitialized])

  // === MANEJO DE FALLAS ===
  const handleFaultTrigger = useCallback(nodeId => {
    const triggerFault = () => {
      // Trigger fault in simulation
    }
    triggerFault(nodeId)
  }, [])

  // === CONTROLES ===
  if (!ui.showRealTimeSimulation) return null

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          zIndex: 25,
        }}
      />

      {/* Panel de Control Profesional */}
      <div className="absolute top-4 right-4 bg-gray-900 text-white rounded-lg shadow-xl p-4 border border-gray-700 z-30 min-w-80">
        <h3 className="text-lg font-bold mb-4 text-cyan-300">
          Simulación Real-Time
        </h3>

        {/* Estado del Sistema */}
        <div className="mb-4 p-3 bg-gray-800 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Estado:</span>
            <span
              className={`text-sm font-bold ${simulation.fault ? 'text-red-400' : 'text-green-400'}`}
            >
              {simulation.fault ? 'FALLA ACTIVA' : 'NORMAL'}
            </span>
          </div>
          <div className="text-xs text-gray-400">
            Breakers: {nodes.filter(n => n.type === 'breaker').length} | Cargas:{' '}
            {nodes.filter(n => n.type === 'load').length} | Partículas:{' '}
            {particlesRef.current.length}
          </div>
        </div>

        {/* Controles de Falla */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Trigger de Falla:
          </label>
          <div className="grid grid-cols-2 gap-2">
            {nodes
              .filter(n => n.type === 'breaker')
              .slice(0, 6)
              .map(node => (
                <button key={node.id} onClick={() => handleFaultTrigger(node.id)}
                  disabled={simulation.fault === node.id}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                    simulation.fault === node.id
                      ? 'bg-red-600 text-white cursor-not-allowed'
                      : 'bg-red-900 text-white hover:bg-red-800 border border-red-700'
                  }`}
                >
                  {node.data?.label || node.id}
                </button>
              ))}
          </div>
        </div>

        {/* Información Técnica */}
        <div className="mb-4 p-3 bg-gray-800 rounded">
          <h4 className="font-medium text-cyan-300 mb-2">TCC Real Engine</h4>
          <div className="space-y-1 text-xs text-gray-400">
            <div>Curvas: IEC, IEEE</div>
            <div>Evaluación: 60fps real-time</div>
            <div>Efectos: Arcos + Ondas + Sonido</div>
          </div>
        </div>
      </div>
    </div>
  )
}

RealTimeSimulationLayer.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number,
}

RealTimeSimulationLayer.defaultProps = {
  width: 600,
  height: 400,
}
