/**
 * hooks/useFaultAnimation.js - Hook para animación de fallas
 * Integra motor de animación con React Flow
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export default function useFaultAnimation(graph, onNodeUpdate, onEdgeUpdate) {
  const [activeFault, setActiveFault] = useState(null);
  const [animationState, setAnimationState] = useState('IDLE');
  const [currentStep, setCurrentStep] = useState(0);
  const animationRef = useRef(null);
  const timeoutRef = useRef(null);

  /**
   * Encontrar ruta aguas arriba
   */
  const getUpstreamPath = useCallback((nodeId) => {
    if (!nodeId || !graph?.edges) return [];

    const path = [];
    let current = nodeId;
    const visited = new Set();

    let iterations = 0;
    const maxIterations = 100;

    while (iterations < maxIterations) {
      const edge = graph.edges?.find(e => e.target === current);
      if (!edge || !edge.source) break;

      if (visited.has(edge.source)) break;
      visited.add(edge.source);

      path.push(edge);
      current = edge.source;
      iterations++;

      if (path.length > 50) break;
    }

    return path;
  }, [graph]);

  /**
   * Extraer breakers de ruta
   */
  const extractBreakersFromPath = useCallback((path) => {
    if (!Array.isArray(path) || !graph?.nodes) return [];

    const breakers = [];

    for (const edge of path) {
      if (!edge || !edge.source) continue;

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
  }, [graph]);

  /**
   * Calcular tiempo de disparo
   */
  const calculateTripTime = useCallback((breaker, Icc) => {
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
  }, [interpolateCurve]);

  /**
   * Interpolar curva
   */
  const interpolateCurve = useCallback((curve, I) => {
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
  }, []);

  /**
   * Iniciar animación de falla
   */
  const startFaultAnimation = useCallback((nodeId, Icc) => {
    if (animationState !== 'IDLE') return;

    const path = getUpstreamPath(nodeId);
    const breakers = extractBreakersFromPath(path);

    if (path.length === 0) {
      // No upstream path found - cannot animate
      return;
    }

    setActiveFault({ nodeId, Icc, path, breakers });
    setAnimationState('FAULT_START');
    setCurrentStep(0);

    // Marcar nodo de falla
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

    // Iniciar animación de flujo
    let step = 0;
    const flowInterval = setInterval(() => {
      if (step >= path.length) {
        clearInterval(flowInterval);
        setAnimationState('FLOW_COMPLETE');
        return;
      }

      const edge = path[step];
      onEdgeUpdate?.(edge.id, {
        style: {
          stroke: '#ef4444',
          strokeWidth: Math.min(5, Math.log10(Icc) * 0.5),
          animation: 'pulse 0.5s ease-in-out infinite'
        },
        animated: true,
        data: {
          ...edge.data,
          status: 'FAULT_FLOW',
          intensity: Icc
        }
      });

      setCurrentStep(step + 1);
      step++;
    }, 300);

    animationRef.current = flowInterval;

    // Calcular y programar disparos
    const trips = breakers.map(b => ({
      id: b.id,
      tripTime: calculateTripTime(b, Icc)
    })).sort((a, b) => a.tripTime - b.tripTime);

    trips.forEach(trip => {
      if (trip.tripTime !== Infinity) {
        const tripTimeout = setTimeout(() => {
          onNodeUpdate?.(trip.id, {
            style: {
              background: '#fef3c7',
              border: '3px solid #f59e0b',
              boxShadow: '0 0 15px rgba(245, 158, 11, 0.5)'
            },
            data: {
              ...graph.nodes.find(n => n.id === trip.id)?.data,
              status: 'TRIPPED',
              tripTime: trip.tripTime
            }
          });
        }, trip.tripTime * 1000);

        timeoutRef.current = tripTimeout;
      }
    });

    // Finalizar animación después de último disparo
    const lastTrip = trips.find(t => t.tripTime !== Infinity);
    if (lastTrip) {
      const endTimeout = setTimeout(() => {
        setAnimationState('COMPLETE');
        setActiveFault(null);
      }, lastTrip.tripTime * 1000 + 2000);

      timeoutRef.current = endTimeout;
    }

  }, [animationState, graph, getUpstreamPath, extractBreakersFromPath, calculateTripTime, onNodeUpdate, onEdgeUpdate]);

  /**
   * Detener animación
   */
  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Restaurar estilos
    if (activeFault) {
      activeFault.path.forEach(edge => {
        onEdgeUpdate?.(edge.id, {
          style: {},
          animated: false,
          data: { ...edge.data, status: null, intensity: null }
        });
      });

      activeFault.breakers.forEach(breaker => {
        onNodeUpdate?.(breaker.id, {
          style: {},
          data: { ...graph.nodes.find(n => n.id === breaker.id)?.data, status: null, tripTime: null }
        });
      });

      onNodeUpdate?.(activeFault.nodeId, {
        style: {},
        data: { ...graph.nodes.find(n => n.id === activeFault.nodeId)?.data, status: null, Icc: null }
      });
    }

    setActiveFault(null);
    setAnimationState('IDLE');
    setCurrentStep(0);
  }, [activeFault, graph, onNodeUpdate, onEdgeUpdate]);

  /**
   * Limpiar al desmontar
   */
  const cleanup = useCallback(() => {
    stopAnimation();
  }, [stopAnimation]);

  // Efecto cleanup para prevenir memory leaks
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
    };
  }, []);

  return {
    activeFault,
    animationState,
    currentStep,
    startFaultAnimation,
    stopAnimation,
    cleanup
  };
}
