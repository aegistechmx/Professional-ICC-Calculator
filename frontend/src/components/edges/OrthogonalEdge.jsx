/**
 * components/edges/OrthogonalEdge.jsx - Edge Ortogonal tipo Manhattan
 * Renderiza cables con rutas rectas horizontales/verticales
 */

import React, { useMemo } from 'react';
import { BaseEdge, EdgeLabelRenderer } from 'reactflow';
import PropTypes from 'prop-types';
import './OrthogonalEdge.css';

export default function OrthogonalEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
  animated = false
}) {
  // Usar puntos precalculados por el router Manhattan
  const pathPoints = useMemo(() => {
    if (data?.points && data.points.length >= 2) {
      return data.points;
    }

    // Fallback: línea recta simplificada
    return [{ x: sourceX, y: sourceY }, { x: targetX, y: targetY }];
  }, [data?.points, sourceX, sourceY, targetX, targetY]);

  // Construir path SVG
  const path = useMemo(() => {
    if (pathPoints.length < 2) return '';

    return pathPoints
      .map((point, index) => {
        const command = index === 0 ? 'M' : 'L';
        return `${command} ${point.x} ${point.y}`;
      })
      .join(' ');
  }, [pathPoints]);

  // Calcular centro para label
  const centerX = useMemo(() => {
    const midIndex = Math.floor(pathPoints.length / 2);
    return pathPoints[midIndex]?.x || (sourceX + targetX) / 2;
  }, [pathPoints, sourceX, targetX]);

  const centerY = useMemo(() => {
    const midIndex = Math.floor(pathPoints.length / 2);
    return pathPoints[midIndex]?.y || (sourceY + targetY) / 2;
  }, [pathPoints, sourceY, targetY]);

  // Determinar clase de animación
  const getAnimationClass = () => {
    if (data?.fault) return 'edge-fault';
    if (data?.tripped) return 'edge-tripped';
    if (data?.overload) return 'edge-overload';
    if (animated || data?.animated) return 'edge-animated';
    return '';
  };

  // Información del cable
  const cableInfo = useMemo(() => {
    const length = data?.length ? `${data.length}m` : '';
    const impedance = data?.impedance ? `${data.impedance}Ω` : '';
    const current = data?.current ? `${data.current}A` : '';

    return { length, impedance, current };
  }, [data]);

  return (
    <>
      {/* Edge base */}
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: data?.fault ? '#dc2626' : data?.tripped ? '#f59e0b' : '#6b7280',
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: data?.tripped ? '5,5' : 'none'
        }}
        className={`orthogonal-edge ${getAnimationClass()}`}
        markerEnd={data?.fault ? 'url(#arrow-fault)' : 'url(#arrow)'}
      />

      {/* Marcadores SVG */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#6b7280" />
          </marker>
          <marker
            id="arrow-fault"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626" />
          </marker>
        </defs>
      </svg>

      {/* Label del cable */}
      {(cableInfo.length || cableInfo.impedance || cableInfo.current || selected) && (
        <EdgeLabelRenderer>
          <div
            className="edge-label"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${centerX}px, ${centerY}px)`,
              fontSize: 10,
              fontWeight: 500,
              pointerEvents: 'all',
              background: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              border: selected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              zIndex: 1000
            }}
          >
            {cableInfo.length && (
              <span className="label-length">{cableInfo.length}</span>
            )}
            {cableInfo.impedance && (
              <span className="label-impedance">{cableInfo.impedance}</span>
            )}
            {cableInfo.current && (
              <span className="label-current">{cableInfo.current}</span>
            )}
            {data?.fault && (
              <span className="label-fault">⚡ FALLA</span>
            )}
            {data?.tripped && (
              <span className="label-tripped">⏹ DISPARADO</span>
            )}
          </div>
        </EdgeLabelRenderer>
      )}

      {/* Indicadores de flujo (puntos animados) */}
      {(animated || data?.animated) && !data?.fault && (
        <EdgeLabelRenderer>
          <div
            className="flow-indicators"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none'
            }}
          >
            {pathPoints.slice(0, -1).map((point, index) => (
              <div
                key={index}
                className="flow-particle"
                style={{
                  position: 'absolute',
                  left: point.x - 3,
                  top: point.y - 3,
                  width: 6,
                  height: 6,
                  background: '#3b82f6',
                  borderRadius: '50%',
                  animation: `flowMove 1s ease-in-out ${index * 0.2}s infinite`
                }}
              />
            ))}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

OrthogonalEdge.propTypes = {
  id: PropTypes.string.isRequired,
  sourceX: PropTypes.number.isRequired,
  sourceY: PropTypes.number.isRequired,
  targetX: PropTypes.number.isRequired,
  targetY: PropTypes.number.isRequired,
  data: PropTypes.object,
  selected: PropTypes.bool,
  animated: PropTypes.bool
};
