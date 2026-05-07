/**
 * components/FaultAnimationLayer.jsx - Capa de Animación de Fallas en Tiempo Real
 * Componente que visualiza la propagación de fallas con efectos visuales profesionales
 */

import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useGraphStore } from '../store/graphStore.js';
import { getFaultSeverity, getFaultColor, simulateFaultPropagation } from '../utils/simulationEngine.js';

export const FaultAnimationLayer = ({ width = 1200, height = 800 }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const faultEffectsRef = useRef([]);

  const {
    nodes,
    edges,
    results,
    simulation
  } = useGraphStore();

  // === CONFIGURACIÓN DE ANIMACIÓN DE FALLA ===
  const faultConfig = useMemo(() => ({
    maxEffectsPerNode: 5,
    propagationSpeed: 0.02,
    effectDuration: 3000, // 3 segundos
    pulseFrequency: 2, // Hz
    maxRadius: 50,
    glowIntensity: 0.8
  }), []);


  // === INICIALIZAR EFECTOS DE FALLA ===
  const initFaultEffects = useCallback((faultNodeId) => {
    const effects = [];
    const faultNode = nodes.find(n => n.id === faultNodeId);

    if (!faultNode?.position) return effects;

    // Crear efecto central en nodo de falla
    effects.push({
      id: `fault-${faultNodeId}-center`,
      nodeId: faultNodeId,
      x: faultNode.position.x,
      y: faultNode.position.y,
      radius: 0,
      maxRadius: faultConfig.maxRadius,
      opacity: 1,
      color: getFaultColor('critical'),
      startTime: Date.now(),
      type: 'center'
    });

    // Crear efectos de propagación
    const propagation = simulateFaultPropagation(faultNodeId, nodes, edges, results);

    propagation.forEach((prop, index) => {
      const sourceNode = nodes.find(n => n.id === prop.from);
      if (!sourceNode?.position) return;

      effects.push({
        id: `fault-${faultNodeId}-prop-${index}`,
        nodeId: prop.from,
        edgeId: prop.edgeId,
        x: sourceNode.position.x,
        y: sourceNode.position.y,
        radius: 0,
        maxRadius: faultConfig.maxRadius * 0.7,
        opacity: 0.8,
        color: getFaultColor(getFaultSeverity(prop.faultCurrent, 480)),
        startTime: Date.now() + (index * 200), // Retraso cascada
        type: 'propagation',
        targetNode: prop.to,
        current: prop.faultCurrent
      });
    });

    return effects;
  }, [nodes, edges, results, faultConfig]);

  // === DIBUJAR EFECTOS DE FALLA ===
  const drawFaultEffects = useCallback((ctx) => {
    ctx.clearRect(0, 0, width, height);

    const now = Date.now();

    faultEffectsRef.current.forEach(effect => {
      const elapsed = now - effect.startTime;
      const progress = Math.min(1, elapsed / faultConfig.effectDuration);

      if (progress >= 1) return; // Efecto completado

      // Calcular radio actual con animación de pulso
      const pulse = Math.sin(elapsed * faultConfig.pulseFrequency * 0.001) * 0.3 + 0.7;
      const currentRadius = effect.maxRadius * progress * pulse;

      // Dibujar efecto de onda expansiva
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, currentRadius, 0, Math.PI * 2);

      // Gradiente radial para efecto de glow
      const gradient = ctx.createRadialGradient(
        effect.x, effect.y, 0,
        effect.x, effect.y, currentRadius
      );
      gradient.addColorStop(0, effect.color + '40');
      gradient.addColorStop(0.5, effect.color + '20');
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.globalAlpha = effect.opacity * (1 - progress);
      ctx.fill();

      // Dibujar anillo principal
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, currentRadius * 0.8, 0, Math.PI * 2);
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 2 * (1 - progress * 0.5);
      ctx.globalAlpha = effect.opacity * (1 - progress);
      ctx.stroke();

      // Efecto de centro brillante para falla principal
      if (effect.type === 'center') {
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = faultConfig.glowIntensity * (1 - progress * 0.5);
        ctx.fill();
      }
    });

    ctx.globalAlpha = 1;
  }, [width, height, faultConfig]);

  // === ACTUALIZAR EFECTOS ===
  const updateFaultEffects = useCallback(() => {
    const now = Date.now();

    // Limpiar efectos completados
    faultEffectsRef.current = faultEffectsRef.current.filter(
      effect => (now - effect.startTime) < faultConfig.effectDuration
    );

    // Agregar nuevos efectos si hay falla activa
    if (simulation.fault && faultEffectsRef.current.length === 0) {
      faultEffectsRef.current = initFaultEffects(simulation.fault);
    }

    // Limpiar si no hay falla activa
    if (!simulation.fault && faultEffectsRef.current.length > 0) {
      faultEffectsRef.current = [];
    }
  }, [simulation.fault, faultConfig.effectDuration, initFaultEffects]);

  // === BUCLE DE ANIMACIÓN ===
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    updateFaultEffects();
    drawFaultEffects(ctx);

    animationRef.current = requestAnimationFrame(animate);
  }, [updateFaultEffects, drawFaultEffects]);

  // === INICIALIZACIÓN ===
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = width;
    canvas.height = height;

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [width, height]);

  useEffect(() => {
    animate();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 20
      }}
    />
  );
};

// === COMPONENTE DE CONTROL DE FALLAS ===
export const FaultControlPanel = () => {
  const {
    nodes,
    edges,
    simulation,
    triggerFault,
    clearFault,
    tripBreaker
  } = useGraphStore();

  const isUpstreamBreaker = useCallback((breakerId, nodeId) => {
    // Lógica simplificada para determinar si un breaker está upstream
    const visited = new Set();
    const queue = [nodeId];

    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);

      const upstreamEdges = edges.filter(edge => edge.target === current);
      for (const edge of upstreamEdges) {
        if (edge.source === breakerId) return true;
        queue.push(edge.source);
      }
    }

    return false;
  }, [edges]);

  const handleTriggerFault = (nodeId) => {
    triggerFault(nodeId);

    // Simular trips de breakers afectados
    const affectedBreakers = nodes
      .filter(node => node.type === 'breaker')
      .filter(breaker => isUpstreamBreaker(breaker.id, nodeId));

    affectedBreakers.forEach((breaker, index) => {
      const delay = index * 0.1; // Trip secuencial
      tripBreaker(breaker.id, delay);
    });
  };

  const loadNodes = nodes.filter(node => node.type === 'load');
  const breakerNodes = nodes.filter(node => node.type === 'breaker');

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Control de Fallas</h3>

      {/* Estado actual */}
      <div className="mb-4 p-3 bg-gray-50 rounded">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Estado:</span>
          <span className={`text-sm font-medium ${simulation.fault ? 'text-red-600' : 'text-green-600'
            }`}>
            {simulation.fault ? 'Falla Activa' : 'Normal'}
          </span>
        </div>

        {simulation.fault && (
          <div className="mt-2 text-sm text-gray-600">
            Falla en: {nodes.find(n => n.id === simulation.fault)?.data?.label || simulation.fault}
          </div>
        )}
      </div>

      {/* Botones de acción */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trigger de Falla (Nodos de Carga):
          </label>
          <div className="grid grid-cols-2 gap-2">
            {loadNodes.map(node => (
              <button
                key={node.id}
                onClick={() => handleTriggerFault(node.id)}
                disabled={simulation.fault === node.id}
                className={`
                  px-3 py-2 rounded text-sm font-medium transition-colors
                  ${simulation.fault === node.id
                    ? 'bg-red-500 text-white cursor-not-allowed'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }
                `}
              >
                {node.data?.label || node.id}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={clearFault}
          disabled={!simulation.fault}
          className={`
            w-full px-4 py-2 rounded font-medium transition-colors
            ${!simulation.fault
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
            }
          `}
        >
          Limpiar Falla
        </button>
      </div>

      {/* Breakers tripados */}
      {simulation.breakerTrips.length > 0 && (
        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded">
          <h4 className="text-sm font-medium text-orange-800 mb-2">
            Breakers Tripados ({simulation.breakerTrips.length})
          </h4>
          <div className="space-y-1">
            {simulation.breakerTrips.map(breakerId => {
              const breaker = breakerNodes.find(n => n.id === breakerId);
              return (
                <div key={breakerId} className="text-xs text-orange-600">
                  {breaker?.data?.label || breakerId}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Propagación de falla */}
      {simulation.propagation.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
          <h4 className="text-sm font-medium text-red-800 mb-2">
            Propagación de Falla
          </h4>
          <div className="space-y-1">
            {simulation.propagation.slice(0, 5).map((prop, index) => {
              const sourceNode = nodes.find(n => n.id === prop.from);
              const targetNode = nodes.find(n => n.id === prop.to);
              return (
                <div key={index} className="text-xs text-red-600">
                  {sourceNode?.data?.label || prop.from}
                  {' '}
                  <span className="text-red-400">{'>'}</span>
                  {' '}
                  {targetNode?.data?.label || prop.to}
                  {' '}
                  <span className="text-red-500">
                    ({prop.faultCurrent?.toFixed(1)}A)
                  </span>
                </div>
              );
            })}
            {simulation.propagation.length > 5 && (
              <div className="text-xs text-red-500">
                ... y {simulation.propagation.length - 5} más
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// === INDICADOR VISUAL DE FALLA ===
export const FaultIndicator = ({ nodeId }) => {
  const { simulation } = useGraphStore();

  const isFaulted = simulation.fault === nodeId;
  const isAffected = simulation.propagation.some(p => p.to === nodeId);

  if (!isFaulted && !isAffected) return null;

  return (
    <div
      className={`
        absolute top-0 right-0 w-4 h-4 rounded-full animate-pulse
        ${isFaulted ? 'bg-red-500' : 'bg-orange-500'}
      `}
      style={{
        boxShadow: `0 0 10px ${isFaulted ? '#ef4444' : '#f97316'}`
      }}
    />
  );
};

FaultAnimationLayer.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number
};

FaultIndicator.propTypes = {
  nodeId: PropTypes.string
};

export default FaultAnimationLayer;
