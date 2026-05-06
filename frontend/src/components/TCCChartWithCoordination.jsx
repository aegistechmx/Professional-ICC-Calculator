/**
 * components/TCCChartWithCoordination.jsx
 * TCC Chart con visualización de coordinación y marcadores de conflicto
 */

import React, { useMemo } from 'react';
import TCCChart from './TCCChart';
import './TCCChartWithCoordination.css';

export default function TCCChartWithCoordination({
  curves = [],
  coordinationResult = null,
  faultCurrent = null,
  selectedNode = null,
  width = 600,
  height = 400,
  showCrossings = true
}) {
  // Extraer cruces del resultado de coordinación
  const crossings = useMemo(() => {
    if (!coordinationResult || !coordinationResult.finalStatus) return [];
    
    // Si hay pares con conflictos, extraer los cruces
    const conflicts = [];
    coordinationResult.finalStatus.pairs?.forEach((pair, index) => {
      if (pair.status === 'CONFLICT' && pair.worstPoint) {
        conflicts.push({
          pairIndex: index,
          pair: pair.pair,
          I: pair.worstPoint.I,
          tDown: pair.worstPoint.tDown,
          tUp: pair.worstPoint.tUp,
          deficit: pair.worstPoint.deficit
        });
      }
    });
    
    return conflicts;
  }, [coordinationResult]);

  // Determinar color de fondo basado en coordinación
  const coordinationStatus = useMemo(() => {
    if (!coordinationResult) return null;
    
    const isCoordinated = coordinationResult.status === 'COORDINATED';
    const quality = coordinationResult.finalStatus?.quality || 0;
    
    return {
      isCoordinated,
      quality,
      color: isCoordinated ? '#10b981' : quality > 50 ? '#f59e0b' : '#ef4444',
      label: isCoordinated ? 'COordinado' : quality > 50 ? 'Parcial' : 'Conflictos'
    };
  }, [coordinationResult]);

  return (
    <div className="tcc-with-coordination">
      {/* Header con estado de coordinación */}
      {coordinationStatus && (
        <div 
          className={`coordination-banner ${coordinationStatus.isCoordinated ? 'success' : 'warning'}`}
          style={{ '--coord-color': coordinationStatus.color }}
        >
          <div className="banner-content">
            <span className="status-icon">
              {coordinationStatus.isCoordinated ? '✓' : '⚠'}
            </span>
            <div className="status-info">
              <span className="status-label">
                Coordinación: {coordinationStatus.label}
              </span>
              <span className="quality-badge">
                Calidad: {coordinationStatus.quality}%
              </span>
            </div>
          </div>
          {crossings.length > 0 && (
            <span className="conflict-count">
              {crossings.length} {crossings.length === 1 ? 'conflicto' : 'conflictos'}
            </span>
          )}
        </div>
      )}

      {/* Chart con SVG overlay para marcadores */}
      <div className="chart-container">
        <TCCChart
          curves={curves}
          faultCurrent={faultCurrent}
          selectedNode={selectedNode}
          width={width}
          height={height}
          title={coordinationStatus 
            ? `Curvas TCC - ${coordinationStatus.isCoordinated ? 'Coordinación Satisfactoria' : 'Revisar Coordinación'}`
            : 'Curvas TCC - Coordinación de Protecciones'
          }
        />

        {/* Overlay SVG para marcadores de conflicto */}
        {showCrossings && crossings.length > 0 && (
          <svg 
            className="crossings-overlay"
            width={width} 
            height={height}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
          >
            {crossings.map((crossing, index) => (
              <CrossingMarker
                key={index}
                crossing={crossing}
                index={index}
              />
            ))}
          </svg>
        )}
      </div>

      {/* Lista de conflictos detallados */}
      {crossings.length > 0 && (
        <div className="crossings-list">
          <h4>⚠ Zonas de Conflicto Detectadas</h4>
          {crossings.map((crossing, index) => (
            <div key={index} className="crossing-item">
              <div className="crossing-header">
                <span className="crossing-pair">{crossing.pair}</span>
                <span className="crossing-severity">
                  Déficit: {crossing.deficit.toFixed(3)}s
                </span>
              </div>
              <div className="crossing-details">
                <span>I = {crossing.I.toFixed(1)}A</span>
                <span>t↓ = {crossing.tDown.toFixed(3)}s</span>
                <span>t↑ = {crossing.tUp.toFixed(3)}s</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recomendaciones cuando está coordinado */}
      {coordinationStatus?.isCoordinated && (
        <div className="success-message">
          <span className="success-icon">🎉</span>
          <p>
            Las protecciones están correctamente coordinadas. 
            El sistema operará selectivamente ante fallas.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Marcador de cruce en el chart
 */
function CrossingMarker({ crossing, index }) {
  // Calcular posición aproximada (necesitaría las funciones scaleX/scaleY del TCCChart)
  // Por ahora, mostramos un marcador indicativo
  
  return (
    <g className="crossing-marker">
      {/* Círculo pulsante */}
      <circle
        cx={100 + index * 50}
        cy={100 + index * 30}
        r="8"
        fill="#ef4444"
        opacity="0.8"
      >
        <animate
          attributeName="r"
          values="8;12;8"
          dur="1.5s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.8;0.4;0.8"
          dur="1.5s"
          repeatCount="indefinite"
        />
      </circle>
      
      {/* X */}
      <text
        x={100 + index * 50}
        y={105 + index * 30}
        textAnchor="middle"
        fill="white"
        fontSize="10"
        fontWeight="bold"
      >
        ✕
      </text>
      
      {/* Tooltip con info */}
      <g transform={`translate(${120 + index * 50}, ${90 + index * 30})`}>
        <rect
          width="120"
          height="40"
          fill="white"
          stroke="#ef4444"
          strokeWidth="1"
          rx="4"
          opacity="0.95"
        />
        <text x="5" y="15" fontSize="9" fill="#374151" fontWeight="600">
          Conflicto {index + 1}
        </text>
        <text x="5" y="28" fontSize="8" fill="#6b7280">
          I={crossing.I.toFixed(0)}A | Δt={crossing.deficit.toFixed(3)}s
        </text>
      </g>
    </g>
  );
}
