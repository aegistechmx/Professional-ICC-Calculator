/**
 * components/SimulationEngine.jsx - Motor de Simulación Frontend
 * Componente principal que orquesta todas las simulaciones en tiempo real
 */

import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useGraphStore } from '../store/graphStore.js';
import { createAnimationLoop } from '../utils/simulationEngine.js';

// === UTILIDADES ===
const getFlowColor = (status) => {
  const colors = {
    inactive: '#94a3b8',
    low: '#22c55e',
    medium: '#eab308',
    high: '#f97316',
    critical: '#ef4444'
  };
  return colors[status] || '#94a3b8';
};

export const SimulationEngine = ({ children }) => {
  const {
    // Estado
    nodes,
    edges,
    results,
    simulation,
    ui,

    // Acciones de simulación
    calculateFlows,
    calculateNodeStatus,
    updateParticles,
    generateTCCCurves,
    autoCoordinateBreakers,

    // Acciones de UI
    setAnimationSpeed,
    toggleFlows,
    toggleParticles,
    toggleTCC
  } = useGraphStore();

  const animationRef = useRef(null);
  const lastUpdateRef = useRef(Date.now());
  const particleSystemRef = useRef(null);

  // === INICIALIZACIÓN DEL SISTEMA DE PARTÍCULAS ===
  useEffect(() => {
    if (ui.showParticles && !particleSystemRef.current) {
      // Inicializar sistema de partículas aquí
      particleSystemRef.current = {
        particles: [],
        lastSpawn: Date.now()
      };
    }
  }, [ui.showParticles]);

  // === BUCLE PRINCIPAL DE ANIMACIÓN ===
  const animationLoop = useCallback((deltaTime) => {
    const now = Date.now();
    const adjustedDelta = deltaTime * ui.animationSpeed;

    // Actualizar flujos si hay resultados
    if (results && ui.showFlows) {
      // Solo actualizar flujos cada 100ms para no sobrecargar
      if (now - lastUpdateRef.current > 100) {
        calculateFlows();
        calculateNodeStatus();
        lastUpdateRef.current = now;
      }
    }

    // Actualizar partículas si están habilitadas
    if (ui.showParticles && particleSystemRef.current && simulation.flows.length > 0) {
      updateParticleSystem(adjustedDelta);
    }

    // Actualizar TCC si está visible
    if (ui.showTCC && results) {
      // Solo actualizar TCC cada 500ms
      if (now - lastUpdateRef.current > 500) {
        generateTCCCurves();
      }
    }

    // Auto-coordinación si hay breakers
    if (simulation.breakerTrips.length > 0) {
      autoCoordinateBreakers();
    }
  }, [
    results,
    simulation,
    ui,
    calculateFlows,
    calculateNodeStatus,
    updateParticleSystem,
    generateTCCCurves,
    autoCoordinateBreakers
  ]);

  // === SISTEMA DE PARTÍCULAS ===
  const updateParticleSystem = useCallback((deltaTime) => {
    if (!particleSystemRef.current) return;

    const { particles, lastSpawn } = particleSystemRef.current;
    const now = Date.now();

    // Generar nuevas partículas basadas en flujos
    if (now - lastSpawn > 50) { // Spawn cada 50ms
      const newParticles = [];

      simulation.flows.forEach(flow => {
        if (flow.current > 10) { // Solo generar partículas para flujos significativos
          const particleCount = Math.max(1, Math.floor(flow.current / 50));

          for (let i = 0; i < particleCount; i++) {
            newParticles.push({
              id: `${flow.id}-${now}-${i}`,
              edgeId: flow.id,
              position: 0,
              speed: Math.min(2, flow.current / 100),
              size: Math.max(2, Math.min(6, flow.current / 100)),
              color: getFlowColor(flow.status),
              opacity: Math.min(1, flow.current / 200),
              createdAt: now
            });
          }
        }
      });

      particleSystemRef.current.particles = [...particles, ...newParticles];
      particleSystemRef.current.lastSpawn = now;
    }

    // Actualizar posiciones de partículas existentes
    const updatedParticles = particles
      .map(particle => ({
        ...particle,
        position: particle.position + (particle.speed * deltaTime) / 1000
      }))
      .filter(particle => particle.position < 1); // Remover partículas completadas

    particleSystemRef.current.particles = updatedParticles;
    updateParticles(updatedParticles);
  }, [simulation.flows, updateParticles]);

  // === CONTROL DE ANIMACIÓN ===
  useEffect(() => {
    if (!animationRef.current) {
      animationRef.current = createAnimationLoop(animationLoop, 60);
    }

    animationRef.current.start();

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [animationLoop]);

  // === RECÁLCULO AUTOMÁTICO ===
  useEffect(() => {
    if (results) {
      // Recalcular todo cuando cambian los resultados del backend
      calculateFlows();
      calculateNodeStatus();
      generateTCCCurves();
    }
  }, [results, calculateFlows, calculateNodeStatus, generateTCCCurves]);

  // === MANEJO DE FALLAS ===
  const handleFaultTrigger = useCallback((nodeId) => {
    // Simular trip de breakers afectados
    const affectedBreakers = nodes
      .filter(node => node.type === 'breaker')
      .filter(breaker => {
        // Lógica simplificada: breakers upstream del nodo en falla
        return isUpstreamBreaker(breaker.id, nodeId, edges);
      });

    affectedBreakers.forEach((breaker, index) => {
      const delay = index * 0.1; // Trip secuencial
      useGraphStore.getState().tripBreaker(breaker.id, delay);
    });
  }, [nodes, edges]);

  const isUpstreamBreaker = (breakerId, nodeId, edges) => {
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
  };

  // === RENDER ===
  return (
    <SimulationEngineContext.Provider value={{
      // Estado de simulación
      simulation,
      flows: simulation.flows,
      nodeStatus: simulation.status,
      particles: simulation.particles,
      tccCurves: simulation.tccCurves,

      // Controles
      animationSpeed: ui.animationSpeed,
      showFlows: ui.showFlows,
      showParticles: ui.showParticles,
      showTCC: ui.showTCC,

      // Acciones
      setAnimationSpeed,
      toggleFlows,
      toggleParticles,
      toggleTCC,
      triggerFault: handleFaultTrigger,

      // Sistema de partículas
      particleSystem: particleSystemRef.current
    }}>
      {children}
    </SimulationEngineContext.Provider>
  );
};

// === CONTEXT ===
const SimulationEngineContext = React.createContext(null);

export const useSimulationEngine = () => {
  const context = React.useContext(SimulationEngineContext);
  if (!context) {
    throw new Error('useSimulationEngine debe usarse dentro de SimulationEngine');
  }
  return context;
};

// === HOOKS ESPECIALIZADOS ===

export const useFlowAnimation = (edgeId) => {
  const { flows, showFlows, animationSpeed } = useSimulationEngine();

  const flow = useMemo(() =>
    flows.find(f => f.id === edgeId),
    [flows, edgeId]
  );

  return {
    flow,
    isVisible: showFlows && flow?.current > 0,
    animationSpeed,
    color: flow ? getFlowColor(flow.status) : '#94a3b8',
    width: flow ? Math.max(1, Math.min(10, Math.sqrt(flow.current / 10))) : 1
  };
};

export const useNodeStatus = (nodeId) => {
  const { nodeStatus } = useSimulationEngine();

  return useMemo(() => ({
    status: nodeStatus[nodeId] || 'gray',
    color: getNodeStatusColor(nodeStatus[nodeId] || 'gray'),
    isFault: nodeStatus[nodeId] === 'red',
    isWarning: nodeStatus[nodeId] === 'yellow',
    isNormal: nodeStatus[nodeId] === 'green'
  }), [nodeStatus, nodeId]);
};

export const useParticleAnimation = (edgeId) => {
  const { particles, showParticles, animationSpeed } = useSimulationEngine();

  const edgeParticles = useMemo(() =>
    particles.filter(p => p.edgeId === edgeId),
    [particles, edgeId]
  );

  return {
    particles: edgeParticles,
    isVisible: showParticles && edgeParticles.length > 0,
    animationSpeed,
    count: edgeParticles.length
  };
};

export const useTCCCurves = () => {
  const { tccCurves, showTCC } = useSimulationEngine();

  return {
    curves: tccCurves,
    isVisible: showTCC,
    hasCurves: Object.keys(tccCurves).length > 0
  };
};

// === UTILIDADES ===
const getNodeStatusColor = (status) => {
  const colors = {
    gray: '#94a3b8',
    green: '#22c55e',
    yellow: '#eab308',
    orange: '#f97316',
    red: '#ef4444'
  };
  return colors[status] || '#94a3b8';
};

SimulationEngine.propTypes = {
  children: PropTypes.node
};

export default SimulationEngine;
