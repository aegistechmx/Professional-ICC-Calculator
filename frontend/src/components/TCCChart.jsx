/**
 * components/TCCChart.jsx - Visualización de Curvas TCC
 * Escala log-log con curvas IEC e IEEE reales
 */

import React, { useMemo, useCallback } from 'react';
import './TCCChart.css';

export default function TCCChart({ 
  curves = [], 
  faultCurrent = null,
  selectedNode = null,
  width = 600,
  height = 400,
  title = 'Curvas TCC - Coordinación de Protecciones'
}) {
  // Márgenes para ejes
  const margin = { top: 40, right: 40, bottom: 60, left: 70 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Rangos logarítmicos
  const xRange = useMemo(() => {
    const allI = curves.flatMap(c => c.data.map(p => p.I));
    const minI = Math.min(...allI, faultCurrent || 10);
    const maxI = Math.max(...allI, faultCurrent || 1000);
    return {
      min: Math.floor(Math.log10(minI * 0.8)),
      max: Math.ceil(Math.log10(maxI * 1.2))
    };
  }, [curves, faultCurrent]);

  const yRange = useMemo(() => {
    const allT = curves.flatMap(c => c.data.map(p => p.t));
    const validT = allT.filter(t => t > 0 && t !== Infinity);
    const minT = Math.min(...validT, 0.01);
    const maxT = Math.max(...validT, 100);
    return {
      min: Math.floor(Math.log10(minT * 0.8)),
      max: Math.ceil(Math.log10(maxT * 1.2))
    };
  }, [curves]);

  // Escala log a pixels
  const scaleX = useCallback((I) => {
    const logI = Math.log10(I);
    const ratio = (logI - xRange.min) / (xRange.max - xRange.min);
    return margin.left + ratio * chartWidth;
  }, [xRange, margin.left, chartWidth]);

  const scaleY = useCallback((t) => {
    if (t === Infinity || t > 1000) return margin.top + chartHeight;
    const logT = Math.log10(t);
    const ratio = (logT - yRange.min) / (yRange.max - yRange.min);
    return margin.top + chartHeight - ratio * chartHeight;
  }, [yRange, margin.top, chartHeight]);

  // Generar path SVG para una curva
  const generatePath = useCallback((data) => {
    const validPoints = data.filter(p => p.t > 0 && p.t !== Infinity);
    
    if (validPoints.length < 2) return '';

    return validPoints
      .map((p, i) => {
        const x = scaleX(p.I);
        const y = scaleY(p.t);
        return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
      })
      .join(' ');
  }, [scaleX, scaleY]);

  // Líneas de grid
  const xGridLines = useMemo(() => {
    const lines = [];
    for (let log = xRange.min; log <= xRange.max; log++) {
      for (let i = 1; i <= 9; i++) {
        const value = i * Math.pow(10, log);
        if (value >= Math.pow(10, xRange.min) && value <= Math.pow(10, xRange.max)) {
          lines.push({
            value,
            x: scaleX(value),
            isMain: i === 1
          });
        }
      }
    }
    return lines;
  }, [xRange, scaleX]);

  const yGridLines = useMemo(() => {
    const lines = [];
    for (let log = yRange.min; log <= yRange.max; log++) {
      for (let i = 1; i <= 9; i++) {
        const value = i * Math.pow(10, log);
        if (value >= Math.pow(10, yRange.min) && value <= Math.pow(10, yRange.max)) {
          lines.push({
            value,
            y: scaleY(value),
            isMain: i === 1
          });
        }
      }
    }
    return lines;
  }, [yRange, scaleY]);

  // Coordenadas de línea de falla
  const faultLineX = faultCurrent ? scaleX(faultCurrent) : null;

  return (
    <div className="tcc-chart-container">
      <h3 className="chart-title">{title}</h3>
      
      <svg width={width} height={height} className="tcc-chart">
        {/* Fondo */}
        <rect
          x={margin.left}
          y={margin.top}
          width={chartWidth}
          height={chartHeight}
          fill="#fafafa"
          stroke="#e5e7eb"
        />

        {/* Grid X (vertical) */}
        {xGridLines.map((line, i) => (
          <line
            key={`x-${i}`}
            x1={line.x}
            y1={margin.top}
            x2={line.x}
            y2={margin.top + chartHeight}
            stroke={line.isMain ? "#d1d5db" : "#e5e7eb"}
            strokeWidth={line.isMain ? 1 : 0.5}
            strokeDasharray={line.isMain ? "none" : "2,2"}
          />
        ))}

        {/* Grid Y (horizontal) */}
        {yGridLines.map((line, i) => (
          <line
            key={`y-${i}`}
            x1={margin.left}
            y1={line.y}
            x2={margin.left + chartWidth}
            y2={line.y}
            stroke={line.isMain ? "#d1d5db" : "#e5e7eb"}
            strokeWidth={line.isMain ? 1 : 0.5}
            strokeDasharray={line.isMain ? "none" : "2,2"}
          />
        ))}

        {/* Eje X */}
        <line
          x1={margin.left}
          y1={margin.top + chartHeight}
          x2={margin.left + chartWidth}
          y2={margin.top + chartHeight}
          stroke="#374151"
          strokeWidth={2}
        />

        {/* Eje Y */}
        <line
          x1={margin.left}
          y1={margin.top}
          x2={margin.left}
          y2={margin.top + chartHeight}
          stroke="#374151"
          strokeWidth={2}
        />

        {/* Etiquetas eje X (corriente) */}
        {xGridLines.filter(l => l.isMain).map((line, i) => (
          <text
            key={`x-label-${i}`}
            x={line.x}
            y={margin.top + chartHeight + 20}
            textAnchor="middle"
            fontSize="10"
            fill="#6b7280"
            fontFamily="Monaco, Consolas, monospace"
          >
            {line.value >= 1000 ? `${(line.value / 1000).toFixed(0)}k` : line.value}
          </text>
        ))}

        {/* Etiqueta eje X */}
        <text
          x={margin.left + chartWidth / 2}
          y={height - 10}
          textAnchor="middle"
          fontSize="12"
          fill="#374151"
          fontWeight="600"
        >
          Corriente (A) - Escala Logarítmica
        </text>

        {/* Etiquetas eje Y (tiempo) */}
        {yGridLines.filter(l => l.isMain).map((line, i) => (
          <text
            key={`y-label-${i}`}
            x={margin.left - 10}
            y={line.y + 4}
            textAnchor="end"
            fontSize="10"
            fill="#6b7280"
            fontFamily="Monaco, Consolas, monospace"
          >
            {line.value >= 1 ? `${line.value.toFixed(0)}s` : `${(line.value * 1000).toFixed(0)}ms`}
          </text>
        ))}

        {/* Etiqueta eje Y */}
        <text
          x={15}
          y={margin.top + chartHeight / 2}
          textAnchor="middle"
          fontSize="12"
          fill="#374151"
          fontWeight="600"
          transform={`rotate(-90, 15, ${margin.top + chartHeight / 2})`}
        >
          Tiempo (s) - Escala Logarítmica
        </text>

        {/* Línea de corriente de falla */}
        {faultLineX && (
          <g className="fault-line">
            <line
              x1={faultLineX}
              y1={margin.top}
              x2={faultLineX}
              y2={margin.top + chartHeight}
              stroke="#dc2626"
              strokeWidth={2}
              strokeDasharray="5,5"
            />
            <text
              x={faultLineX + 5}
              y={margin.top + 15}
              fontSize="11"
              fill="#dc2626"
              fontWeight="600"
            >
              Icc = {faultCurrent}A
            </text>
          </g>
        )}

        {/* Curvas TCC */}
        {curves.map((curve, index) => (
          <g key={index} className="tcc-curve">
            {/* Línea de la curva */}
            <path
              d={generatePath(curve.data)}
              fill="none"
              stroke={curve.color || getDefaultColor(index)}
              strokeWidth={curve.id === selectedNode?.id ? 3 : 2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Leyenda de la curva */}
            <g transform={`translate(${margin.left + 10}, ${margin.top + 20 + index * 25})`}>
              <rect
                width="15"
                height="3"
                fill={curve.color || getDefaultColor(index)}
                rx="1"
              />
              <text
                x="20"
                y="8"
                fontSize="11"
                fill="#374151"
                fontWeight={curve.id === selectedNode?.id ? "600" : "400"}
              >
                {curve.name} ({curve.standard || 'IEC'})
              </text>
              {curve.data[0] && (
                <text
                  x="20"
                  y="20"
                  fontSize="9"
                  fill="#6b7280"
                >
                  Pickup: {curve.data[0].I.toFixed(1)}A
                </text>
              )}
            </g>
          </g>
        ))}

        {/* Punto de operación */}
        {selectedNode && faultCurrent && curves.find(c => c.id === selectedNode.id)?.data && (
          <OperatingPoint
            curve={curves.find(c => c.id === selectedNode.id)}
            faultCurrent={faultCurrent}
            scaleX={scaleX}
            scaleY={scaleY}
          />
        )}
      </svg>

      {/* Leyenda */}
      <div className="chart-legend">
        <h4>Curvas TCC</h4>
        {curves.map((curve, index) => (
          <div 
            key={index} 
            className={`legend-item ${curve.id === selectedNode?.id ? 'selected' : ''}`}
          >
            <div 
              className="legend-color" 
              style={{ backgroundColor: curve.color || getDefaultColor(index) }}
            />
            <div className="legend-info">
              <span className="legend-name">{curve.name}</span>
              <span className="legend-type">{curve.curveType} ({curve.standard})</span>
            </div>
          </div>
        ))}
      </div>

      {/* Información de coordinación */}
      {curves.length >= 2 && (
        <CoordinationInfo curves={curves} faultCurrent={faultCurrent} />
      )}
    </div>
  );
}

/**
 * Componente para mostrar punto de operación
 */
function OperatingPoint({ curve, faultCurrent, scaleX, scaleY }) {
  // Encontrar punto de operación
  const op = useMemo(() => {
    const data = curve.data;
    const closest = data.reduce((prev, curr) => 
      Math.abs(curr.I - faultCurrent) < Math.abs(prev.I - faultCurrent) ? curr : prev
    );
    
    // Interpolar
    const next = data.find(p => p.I > closest.I);
    let t = closest.t;
    
    if (next) {
      const logI = Math.log10(faultCurrent);
      const logI1 = Math.log10(closest.I);
      const logI2 = Math.log10(next.I);
      const logT1 = Math.log10(closest.t);
      const logT2 = Math.log10(next.t);
      
      const ratio = (logI - logI1) / (logI2 - logI1);
      t = Math.pow(10, logT1 + ratio * (logT2 - logT1));
    }
    
    return { I: faultCurrent, t };
  }, [curve, faultCurrent]);

  const x = scaleX(op.I);
  const y = scaleY(op.t);

  return (
    <g className="operating-point">
      <circle
        cx={x}
        cy={y}
        r="6"
        fill="#dc2626"
        stroke="white"
        strokeWidth="2"
      />
      <text
        x={x + 10}
        y={y - 10}
        fontSize="10"
        fill="#dc2626"
        fontWeight="600"
      >
        Op: {op.t.toFixed(3)}s
      </text>
    </g>
  );
}

/**
 * Información de coordinación
 */
function CoordinationInfo({ curves, faultCurrent }) {
  const analysis = useMemo(() => {
    if (curves.length < 2) return null;
    
    // Ordenar por pickup (downstream primero)
    const sorted = [...curves].sort((a, b) => {
      const aPickup = a.data[0]?.I || 0;
      const bPickup = b.data[0]?.I || 0;
      return aPickup - bPickup;
    });
    
    const downstream = sorted[0];
    const upstream = sorted[1];
    
    // Verificar coordinación a corriente de falla
    const dPoint = downstream.data.reduce((prev, curr) => 
      Math.abs(curr.I - faultCurrent) < Math.abs(prev.I - faultCurrent) ? curr : prev
    );
    const uPoint = upstream.data.reduce((prev, curr) => 
      Math.abs(curr.I - faultCurrent) < Math.abs(prev.I - faultCurrent) ? curr : prev
    );
    
    const timeDiff = uPoint.t - dPoint.t;
    const isCoordinated = timeDiff > dPoint.t * 0.2; // 20% margen
    
    return {
      downstream: downstream.name,
      upstream: upstream.name,
      timeDownstream: dPoint.t,
      timeUpstream: uPoint.t,
      timeDiff,
      isCoordinated,
      margin: ((timeDiff / dPoint.t) * 100).toFixed(1)
    };
  }, [curves, faultCurrent]);

  if (!analysis) return null;

  return (
    <div className={`coordination-info ${analysis.isCoordinated ? 'success' : 'error'}`}>
      <h5>Análisis de Coordinación</h5>
      <div className="coord-stats">
        <div className="stat">
          <label>Tiempo {analysis.downstream}:</label>
          <value>{analysis.timeDownstream.toFixed(3)}s</value>
        </div>
        <div className="stat">
          <label>Tiempo {analysis.upstream}:</label>
          <value>{analysis.timeUpstream.toFixed(3)}s</value>
        </div>
        <div className="stat">
          <label>Diferencia:</label>
          <value>{analysis.timeDiff.toFixed(3)}s ({analysis.margin}%)</value>
        </div>
      </div>
      <div className="coord-status">
        {analysis.isCoordinated 
          ? '✓ Coordinación Satisfactoria' 
          : '✗ Revisar Coordinación - Margen insuficiente'}
      </div>
    </div>
  );
}

/**
 * Colores por defecto para curvas
 */
function getDefaultColor(index) {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  return colors[index % colors.length];
}
