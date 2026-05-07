/**
 * components/RealTimeSimulationLayer.jsx - Capa de Simulación Real Integrada
 * Sistema completo que combina TCC real, arcos eléctricos, ondas de choque y sonido
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { useGraphStore } from '../store/graphStore.js';
import { TCCEvaluationEngine } from '../utils/tccRealEngine.js';
import {
  drawArc,
  Shockwave,
  soundSystem,
  initAudioSystem,
  createArcParticles,
  createExplosionParticles,
  updateParticles,
  drawParticles,
  drawFlickerEffect
} from '../utils/visualEffects.js';

export const RealTimeSimulationLayer = ({ width = 1200, height = 800 }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const tccEngineRef = useRef(null);
  const particlesRef = useRef([]);
  const shockwavesRef = useRef([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const {
    nodes,
    edges,
    results,
    simulation,
    triggerFault,
    clearFault,
    resetAllBreakers
  } = useGraphStore();

  // === INICIALIZACIÓN ===
  useEffect(() => {
    // Inicializar sistema de audio
    initAudioSystem();

    // Inicializar motor TCC
    tccEngineRef.current = new TCCEvaluationEngine();

    // Registrar breakers existentes
    nodes.filter(n => n.type === 'breaker').forEach(breaker => {
      tccEngineRef.current.registerBreaker(breaker.id, {
        pickup: breaker.data?.pickup || 100,
        TMS: breaker.data?.TMS || 1,
        curveType: breaker.data?.curve || 'IEC',
        instantaneous: breaker.data?.instantaneous || 1000
      });
    });

    setIsInitialized(true);
  }, [nodes]);

  // === LOOP PRINCIPAL DE SIMULACIÓN ===
  const simulationLoop = useCallback(() => {
    if (!canvasRef.current || !isInitialized) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const currentTime = performance.now();

    // Limpiar canvas
    ctx.clearRect(0, 0, width, height);

    // Evaluar sistema con TCC real
    const tccResults = tccEngineRef.current.evaluateSystem(edges, currentTime);

    // Actualizar edges con resultados TCC
    const updatedEdges = edges.map(edge => {
      let updatedEdge = { ...edge };
      let current = edge.current || 100;

      // Aplicar ICC si hay falla
      if (edge.isFault) {
        current *= 20; // ICC brutal
        updatedEdge.isFault = true;
        updatedEdge.faultCurrent = current;
      }

      // Buscar resultado TCC para este edge
      const tccResult = tccResults.find(r => r.edgeId === edge.id);

      if (tccResult) {
        updatedEdge.breakerTripped = tccResult.tripped;
        updatedEdge.breakerProgress = tccResult.progress;
        updatedEdge.breakerTimeRemaining = tccResult.timeRemaining;

        // Si el breaker disparó
        if (tccResult.tripped && !edge.open) {
          updatedEdge.open = true;

          // Efectos de disparo
          const breakerNode = nodes.find(n => n.id === tccResult.breakerId);
          if (breakerNode?.position) {
            // Partículas de explosión
            const explosionParticles = createExplosionParticles(
              breakerNode.position.x,
              breakerNode.position.y
            );
            particlesRef.current.push(...explosionParticles);

            // Onda de choque
            shockwavesRef.current.push(new Shockwave(
              breakerNode.position.x,
              breakerNode.position.y
            ));

            // Sonido de disparo
            soundSystem.playTripSound();
          }
        }
      }

      // Determinar si hay arco eléctrico
      updatedEdge.hasArc = updatedEdge.isFault && !updatedEdge.open;

      // Generar partículas de arco
      if (updatedEdge.hasArc && Math.random() < 0.3) {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);

        if (sourceNode?.position && targetNode?.position) {
          const arcParticles = createArcParticles(
            sourceNode.position.x, sourceNode.position.y,
            targetNode.position.x, targetNode.position.y,
            Math.min(1, current / 1000)
          );
          particlesRef.current.push(...arcParticles);

          // Sonido de arco (ocasional)
          if (Math.random() < 0.1) {
            soundSystem.playArcSound(Math.min(1, current / 1000));
          }
        }
      }

      return updatedEdge;
    });

    // === RENDER ===

    // Renderizar edges con efectos térmicos
    updatedEdges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);

      if (!sourceNode?.position || !targetNode?.position) return;

      // Edge base
      ctx.strokeStyle = edge.hasArc ? '#ff6b6b' : '#6b7280';
      ctx.lineWidth = edge.hasArc ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(sourceNode.position.x, sourceNode.position.y);
      ctx.lineTo(targetNode.position.x, targetNode.position.y);
      ctx.stroke();

      // Arco eléctrico
      if (edge.hasArc) {
        drawArc(
          ctx,
          sourceNode.position.x, sourceNode.position.y,
          targetNode.position.x, targetNode.position.y,
          Math.min(1, edge.faultCurrent / 1000),
          currentTime
        );
      }

      // Indicador de breaker
      if (edge.breakerTripped) {
        const midX = (sourceNode.position.x + targetNode.position.x) / 2;
        const midY = (sourceNode.position.y + targetNode.position.y) / 2;

        ctx.fillStyle = '#ff3b30';
        ctx.beginPath();
        ctx.arc(midX, midY, 8, 0, Math.PI * 2);
        ctx.fill();

        // Efecto de pulsación
        drawFlickerEffect(ctx, midX, midY, currentTime, 1);
      }
    });

    // Renderizar ondas de choque
    shockwavesRef.current = shockwavesRef.current.filter(shockwave => {
      shockwave.draw(ctx, currentTime);
      return shockwave.isActive();
    });

    // Actualizar y renderizar partículas
    particlesRef.current = updateParticles(particlesRef.current);
    drawParticles(ctx, particlesRef.current);

    // Onda de choque en nodo de falla
    if (simulation.fault) {
      const faultNode = nodes.find(n => n.id === simulation.fault);
      if (faultNode?.position) {
        drawShockwave(ctx, faultNode.position.x, faultNode.position.y, currentTime);
      }
    }

    // Continuar animación
    animationRef.current = requestAnimationFrame(simulationLoop);
  }, [nodes, edges, results, simulation, width, height, isInitialized]);

  // === INICIAR/DETENER ANIMACIÓN ===
  useEffect(() => {
    if (isInitialized) {
      simulationLoop();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [simulationLoop, isInitialized]);

  // === MANEJO DE FALLAS ===
  useEffect(() => {
    if (simulation.fault && isInitialized) {
      // Sonido de falla
      soundSystem.playFaultSound(1);

      // Crear onda de choque inicial
      const faultNode = nodes.find(n => n.id === simulation.fault);
      if (faultNode?.position) {
        shockwavesRef.current.push(new Shockwave(
          faultNode.position.x,
          faultNode.position.y,
          300,
          1500
        ));
      }
    }
  }, [simulation.fault, nodes, isInitialized]);

  // === CONTROLES ===
  const handleFaultTrigger = useCallback((nodeId) => {
    triggerFault(nodeId);

    // Resetear breakers para nueva simulación
    tccEngineRef.current.resetAll();
  }, [triggerFault]);

  const handleReset = useCallback(() => {
    clearFault();
    resetAllBreakers();
    tccEngineRef.current.resetAll();
    particlesRef.current = [];
    shockwavesRef.current = [];
  }, [clearFault, resetAllBreakers]);

  const loadNodes = nodes.filter(node => node.type === 'load');
  const breakerNodes = nodes.filter(node => node.type === 'breaker');

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
          zIndex: 25
        }}
      />

      {/* Panel de Control Profesional */}
      <div className="absolute top-4 right-4 bg-gray-900 text-white rounded-lg shadow-xl p-4 border border-gray-700 z-30 min-w-80">
        <h3 className="text-lg font-bold mb-4 text-cyan-400">Simulación Real-Time</h3>

        {/* Estado del Sistema */}
        <div className="mb-4 p-3 bg-gray-800 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Estado:</span>
            <span className={`text-sm font-bold ${simulation.fault ? 'text-red-400' : 'text-green-400'
              }`}>
              {simulation.fault ? 'FALLA ACTIVA' : 'NORMAL'}
            </span>
          </div>

          <div className="text-xs text-gray-400">
            Breakers: {breakerNodes.length} |
            Cargas: {loadNodes.length} |
            Partículas: {particlesRef.current.length}
          </div>
        </div>

        {/* Trigger de Falla */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-cyan-300">Trigger de Falla:</label>
          <div className="grid grid-cols-2 gap-2">
            {loadNodes.slice(0, 6).map(node => (
              <button
                key={node.id}
                onClick={() => handleFaultTrigger(node.id)}
                disabled={simulation.fault === node.id}
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${simulation.fault === node.id
                  ? 'bg-red-600 text-white cursor-not-allowed'
                  : 'bg-red-900 text-red-300 hover:bg-red-700 border border-red-700'
                  }`}
              >
                {node.data?.label || node.id}
              </button>
            ))}
          </div>
        </div>

        {/* Acciones de Sistema */}
        <div className="space-y-2">
          <button
            onClick={handleReset}
            className="w-full px-3 py-2 bg-cyan-600 text-white rounded font-medium hover:bg-cyan-500 transition-colors"
          >
            Reset Sistema
          </button>

          <button
            onClick={() => {
              // Test de sonido
              soundSystem.playFaultSound(0.5);
              setTimeout(() => soundSystem.playTripSound(), 200);
            }}
            className="w-full px-3 py-2 bg-gray-700 text-gray-300 rounded font-medium hover:bg-gray-600 transition-colors text-xs"
          >
            Test Sonido
          </button>
        </div>

        {/* Información Técnica */}
        <div className="mt-4 p-3 bg-gray-800 rounded text-xs">
          <h4 className="font-medium text-cyan-300 mb-2">TCC Real Engine</h4>
          <div className="space-y-1 text-gray-400">
            <div>Curvas: IEC, IEEE, ANSI</div>
            <div>Evaluación: 60fps real-time</div>
            <div>Efectos: Arcos + Ondas + Sonido</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Función auxiliar para onda de choque simple
function drawShockwave(ctx, x, y, time) {
  const maxRadius = 200;
  const radius = (time * 0.1) % maxRadius;
  const opacity = 1 - radius / maxRadius;

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255, 0, 0, ${opacity * 0.8})`;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

RealTimeSimulationLayer.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number
};

export default RealTimeSimulationLayer;
