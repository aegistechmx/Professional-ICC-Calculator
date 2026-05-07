/**
 * hooks/useFaultParticleAnimation.js
 * Hook para animación de fallas con sistema de partículas
 * Integra el motor de partículas con React Flow y el sistema existente
 */

/* eslint-disable no-console */
import { useState, useCallback, useRef, useEffect } from 'react';
import { FaultParticleEngine } from '../components/particles/FaultParticleEngine.js';
import { BreakerEffects } from '../components/particles/BreakerEffects.js';

export default function useFaultParticleAnimation(graph, onNodeUpdate, onEdgeUpdate) {
  const [particleEngine, setParticleEngine] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeFaults, setActiveFaults] = useState(new Map());
  const [trippedBreakers, setTrippedBreakers] = useState(new Set());

  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const breakerEffectsRef = useRef(null);

  /**
   * Inicializar motor de partículas
   */
  const initializeEngine = useCallback(() => {
    if (!canvasRef.current || engineRef.current) return;

    const engine = new FaultParticleEngine(canvasRef.current, {
      particleSystem: {
        maxParticles: 500,
        trailLength: 6,
        turbulence: 0.5
      },
      renderer: {
        enableGlow: true,
        enableTrails: true,
        glowIntensity: 12,
        debug: false
      },
      targetFPS: 60,
      onFaultStart: (faultId, nodeId, Icc) => {
        setActiveFaults(prev => new Map(prev).set(faultId, { nodeId, Icc, startTime: Date.now() }));
        setIsAnimating(true);
      },
      onBreakerTrip: (breakerId) => {
        setTrippedBreakers(prev => new Set(prev).add(breakerId));
      },
      onFaultEnd: (faultId) => {
        setActiveFaults(prev => {
          const newMap = new Map(prev);
          newMap.delete(faultId);
          return newMap;
        });

        if (activeFaults.size <= 1) {
          setIsAnimating(false);
        }
      }
    });

    engineRef.current = engine;
    breakerEffectsRef.current = new BreakerEffects(engine.particleSystem);
    setParticleEngine(engine);
  }, [activeFaults.size]);

  /**
   * Iniciar animación de falla con partículas
   */
  const startFaultParticleAnimation = useCallback((nodeId, Icc) => {
    if (!engineRef.current || !graph) {
      console.warn('Particle engine not initialized or graph not available');
      return;
    }

    // Marcar nodo de falla en React Flow
    onNodeUpdate?.(nodeId, {
      style: {
        background: '#fee2e2',
        border: '3px solid #ef4444',
        boxShadow: '0 0 20px rgba(239, 68, 68, 0.5)'
      },
      data: {
        ...graph.nodes.find(n => n.id === nodeId)?.data,
        status: 'FAULT',
        Icc
      }
    });

    // Emitir partículas de falla
    const faultId = engineRef.current.emitFaultParticles(graph, nodeId, Icc, {
      curved: true,
      lifespan: 4000
    });

    // Calcular y programar disparos de breakers (similar al sistema original)
    const upstreamPath = getUpstreamPath(graph, nodeId);
    const breakers = extractBreakersFromPath(graph, upstreamPath);

    breakers.forEach(breaker => {
      const tripTime = calculateTripTime(breaker, Icc);

      if (tripTime !== Infinity) {
        setTimeout(() => {
          handleBreakerTrip(breaker.id, breaker, graph);
        }, tripTime * 1000);
      }
    });

    return faultId;
  }, [graph, onNodeUpdate, handleBreakerTrip]);

  /**
   * Manejar disparo de breaker
   */
  const handleBreakerTrip = useCallback((breakerId, breakerData, graph) => {
    if (!engineRef.current) return;

    // Actualizar breaker en React Flow
    onNodeUpdate?.(breakerId, {
      style: {
        background: '#fef3c7',
        border: '3px solid #f59e0b',
        boxShadow: '0 0 15px rgba(245, 158, 11, 0.5)'
      },
      data: {
        ...graph.nodes.find(n => n.id === breakerId)?.data,
        status: 'TRIPPED',
        tripTime: breakerData.tripTime
      }
    });

    // Manejar en motor de partículas
    engineRef.current.handleBreakerTrip(breakerId, graph);
    breakerEffectsRef.current?.handleBreakerTrip(breakerId, breakerData, graph);
  }, [onNodeUpdate]);

  /**
   * Detener animación de partículas
   */
  const stopParticleAnimation = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stop();
      engineRef.current.clearAll();
    }

    // Limpiar estados
    setActiveFaults(new Map());
    setTrippedBreakers(new Set());
    setIsAnimating(false);

    // Restaurar estilos en React Flow
    if (graph) {
      graph.nodes?.forEach(node => {
        onNodeUpdate?.(node.id, {
          style: {},
          data: { ...node.data, status: null, Icc: null, tripTime: null }
        });
      });

      graph.edges?.forEach(edge => {
        onEdgeUpdate?.(edge.id, {
          style: {},
          animated: false,
          data: { ...edge.data, status: null, intensity: null }
        });
      });
    }
  }, [graph, onNodeUpdate, onEdgeUpdate]);

  /**
   * Actualizar opciones del motor
   */
  const updateParticleOptions = useCallback((options) => {
    if (engineRef.current) {
      engineRef.current.updateOptions(options);
    }
  }, []);

  /**
   * Exportar frame actual
   */
  const exportFrame = useCallback((format = 'png', quality = 0.9) => {
    return engineRef.current?.exportFrame(format, quality);
  }, []);

  /**
   * Obtener estadísticas del sistema
   */
  const getParticleStats = useCallback(() => {
    return engineRef.current?.getStats() || {
      totalParticles: 0,
      activeFaults: 0,
      trippedBreakers: 0,
      isRunning: false
    };
  }, []);

  // Efecto de inicialización
  useEffect(() => {
    if (canvasRef.current) {
      initializeEngine();
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [initializeEngine]);

  // Efecto de limpieza
  useEffect(() => {
    return () => {
      stopParticleAnimation();
    };
  }, [stopParticleAnimation]);

  // Manejar redimensionamiento del canvas
  useEffect(() => {
    const handleResize = () => {
      if (engineRef.current?.renderer) {
        engineRef.current.renderer.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    // Refs para el canvas
    canvasRef,

    // Estado
    particleEngine,
    isAnimating,
    activeFaults,
    trippedBreakers,

    // Acciones
    startFaultParticleAnimation,
    stopParticleAnimation,
    handleBreakerTrip,
    updateParticleOptions,
    exportFrame,
    getParticleStats,

    // Métodos de compatibilidad con el sistema original
    startFaultAnimation: startFaultParticleAnimation,
    stopAnimation: stopParticleAnimation
  };
}

/**
 * Funciones auxiliares (extraídas del sistema original)
 */
function getUpstreamPath(graph, startNodeId) {
  const path = [];
  let current = startNodeId;
  const visited = new Set();
  let shouldContinue = true;

  while (shouldContinue) {
    const edge = graph.edges?.find(e => e.target === current);
    if (!edge) {
      shouldContinue = false;
      break;
    }

    if (visited.has(edge.source)) {
      shouldContinue = false;
      break;
    }
    visited.add(edge.source);

    path.push(edge);
    current = edge.source;

    if (path.length > 50) {
      shouldContinue = false;
      break;
    }
  }

  return path;
}

function extractBreakersFromPath(graph, path) {
  const breakers = [];

  for (const edge of path) {
    const node = graph.nodes?.find(n => n.id === edge.source);
    if (node && node.type === 'breaker') {
      breakers.push({
        id: node.id,
        rating: node.data?.rating || 100,
        pickup: node.data?.pickup,
        instantaneous: node.data?.instantaneous,
        curve: node.data?.curve
      });
    }
  }

  return breakers;
}

function calculateTripTime(breaker, Icc) {
  if (breaker.instantaneous && Icc >= breaker.instantaneous.min) {
    return breaker.instantaneous.t || 0.02;
  }

  if (breaker.curve) {
    const t = interpolateCurve(breaker.curve, Icc);
    return t !== null ? t : Infinity;
  }

  const pickup = breaker.pickup || breaker.rating;
  if (Icc <= pickup) return Infinity;

  return 10 / Math.pow(Icc / pickup - 1, 2);
}

function interpolateCurve(curve, I) {
  for (let i = 0; i < curve.length - 1; i++) {
    const p1 = curve[i];
    const p2 = curve[i + 1];

    if (I >= p1.I && I <= p2.I) {
      const logI = Math.log10(I);
      const logI1 = Math.log10(p1.I);
      const logI2 = Math.log10(p2.I);
      const logT1 = Math.log10(p1.t);
      const logT2 = Math.log10(p2.t);

      const logT = logT1 + ((logI - logI1) * (logT2 - logT1)) / (logI2 - logI1);
      return Math.pow(10, logT);
    }
  }
  return null;
}
