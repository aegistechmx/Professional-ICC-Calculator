/**
 * components/edges/FlowEdge.jsx - Edge con animación de flujo eléctrico
 * Muestra corriente fluyendo en tiempo real con colores por carga
 */

import React, { useMemo } from 'react';
import { BaseEdge, EdgeLabelRenderer } from 'reactflow';
import './FlowEdge.css';

export default function FlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected
}) {
  // Calcular color basado en carga vs capacidad
  const getFlowColor = () => {
    const { current, capacity, fault, tripped, overload } = data || {};

    if (fault) return '#dc2626'; // Rojo - falla
    if (tripped) return '#f59e0b'; // Amarillo - disparado
    if (overload) return '#f97316'; // Naranja - sobrecarga

    if (current && capacity) {
      const ratio = current / capacity;
      if (ratio > 1) return '#dc2626'; // Sobrecarga crítica
      if (ratio > 0.8) return '#f97316'; // Sobrecarga
      if (ratio > 0.5) return '#eab308'; // Media carga
      return '#10b981'; // Carga normal
    }

    return '#6b7280'; // Gris - sin datos
  };

  // Calcular velocidad de animación basada en corriente
  const getAnimationDuration = () => {
    const { current } = data || {};
    if (!current) return '2s';
    
    // Mayor corriente = animación más rápida
    const speed = Math.max(0.5, 2 - (current / 100));
    return `${speed}s`;
  };

  // Calcular número de partículas basado en corriente
  const getParticleCount = () => {
    const { current } = data || {};
    if (!current) return 3;
    
    // Mayor corriente = más partículas
    return Math.min(8, Math.ceil(current / 20) + 2);
  };

  // Construir path
  const path = useMemo(() => {
    if (data?.points && data.points.length >= 2) {
      return data.points
        .map((point, index) => {
          const command = index === 0 ? 'M' : 'L';
          return `${command} ${point.x} ${point.y}`;
        })
        .join(' ');
    }
    
    // Fallback: línea recta
    return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  }, [data?.points, sourceX, sourceY, targetX, targetY]);

  // Calcular centro para label
  const centerX = useMemo(() => {
    if (data?.points && data.points.length >= 2) {
      const midIndex = Math.floor(data.points.length / 2);
      return data.points[midIndex]?.x || (sourceX + targetX) / 2;
    }
    return (sourceX + targetX) / 2;
  }, [data?.points, sourceX, targetX]);

  const centerY = useMemo(() => {
    if (data?.points && data.points.length >= 2) {
      const midIndex = Math.floor(data.points.length / 2);
      return data.points[midIndex]?.y || (sourceY + targetY) / 2;
    }
    return (sourceY + targetY) / 2;
  }, [data?.points, sourceY, targetY]);

  const flowColor = getFlowColor();
  const animationDuration = getAnimationDuration();
  const particleCount = getParticleCount();
  const showAnimation = data?.current > 0 || data?.animated;

  return (
    <>
      {/* Edge base */}
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: flowColor,
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: data?.tripped ? '5,5' : 'none'
        }}
        className={`flow-edge ${data?.fault ? 'fault' : ''} ${data?.tripped ? 'tripped' : ''}`}
      />

      {/* Partículas de flujo animadas */}
      {showAnimation && !data?.fault && (
        <g className="flow-particles">
          {Array.from({ length: particleCount }).map((_, index) => (
            <circle
              key={index}
              r="3"
              fill={flowColor}
              className="flow-particle"
              style={{
                animationDelay: `${index * (parseFloat(animationDuration) / particleCount)}s`,
                animationDuration: animationDuration
              }}
            >
              <animateMotion
                dur={animationDuration}
                repeatCount="indefinite"
                begin={`${index * (parseFloat(animationDuration) / particleCount)}s`}
              >
                <mpath href={`#${id}-path`} />
              </animateMotion>
            </circle>
          ))}
        </g>
      )}

      {/* Path invisible para animación */}
      <path
        id={`${id}-path`}
        d={path}
        fill="none"
        stroke="none"
        style={{ display: 'none' }}
      />

      {/* Label con datos de corriente */}
      {(data?.current || data?.capacity || selected) && (
        <EdgeLabelRenderer>
          <div
            className="flow-label"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${centerX}px, ${centerY}px)`,
              background: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              border: selected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              fontSize: '10px',
              fontWeight: '500',
              pointerEvents: 'all',
              zIndex: 1000
            }}
          >
            {data?.current && (
              <span className="current-value" style={{ color: flowColor }}>
                {data.current.toFixed(1)} A
              </span>
            )}
            {data?.capacity && (
              <span className="capacity-value">
                / {data.capacity} A
              </span>
            )}
            {data?.current && data?.capacity && (
              <span className="load-percent">
                ({((data.current / data.capacity) * 100).toFixed(0)}%)
              </span>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
