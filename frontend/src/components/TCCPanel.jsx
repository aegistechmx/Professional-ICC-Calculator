/**
 * components/TCCPanel.jsx - Panel de Curvas TCC
 * Muestra curvas tiempo-corriente para coordinación de protecciones
 */

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import './TCCPanel.css';

export default function TCCPanel({ selectedNode, results, onClose }) {
  // Generar curva TCC para un breaker/protección
  const generateBreakerCurve = (protection) => {
    if (!protection) return [];

    const { In, tipo = 'termomagnético' } = protection;
    const curve = [];

    // Puntos típicos de curva TCC (log-log scale)
    const currentPoints = [0.1, 0.5, 1, 2, 5, 10, 20, 50, 100];

    currentPoints.forEach(multiplier => {
      const current = In * multiplier;
      let time;

      if (tipo === 'termomagnético') {
        // Curva típica de breaker termomagnético
        if (multiplier <= 1) {
          time = Infinity; // No opera
        } else if (multiplier <= 1.5) {
          time = 1000; // Zona térmica
        } else if (multiplier <= 5) {
          time = 100; // Transición
        } else {
          time = 0.1; // Zona magnética (instantáneo)
        }
      } else if (tipo === 'fusible') {
        // Curva de fusible
        if (multiplier <= 1) {
          time = Infinity;
        } else if (multiplier <= 2) {
          time = 10000;
        } else if (multiplier <= 5) {
          time = 100;
        } else {
          time = 0.01;
        }
      } else {
        // Curva genérica
        time = Math.max(0.01, 1000 / multiplier);
      }

      curve.push({ current, time });
    });

    return curve;
  };

  // Generar curva de carga (motor)
  const generateLoadCurve = (load) => {
    if (!load) return [];

    const { I_carga, I_arranque = 6 } = load;
    const curve = [];

    // Puntos de curva de carga
    const currentPoints = [0.5, 1, 2, 3, 4, 5, 6, 8, 10];

    currentPoints.forEach(multiplier => {
      const current = I_carga * multiplier;
      let time;

      if (multiplier <= 1) {
        time = Infinity; // Operación normal
      } else if (multiplier <= I_arranque) {
        time = 10; // Arranque permitido
      } else {
        time = 0.1; // Sobrecarga
      }

      curve.push({ current, time });
    });

    return curve;
  };

  // Detectar conflicto de coordinación
  const detectCoordinationConflict = (curve1, curve2) => {
    if (!curve1 || !curve2 || curve1.length === 0 || curve2.length === 0) {
      return false;
    }

    // Verificar si las curvas se cruzan de forma inadecuada
    for (let i = 0; i < curve1.length; i++) {
      for (let j = 0; j < curve2.length; j++) {
        const p1 = curve1[i];
        const p2 = curve2[j];

        // Si están cerca en corriente pero con tiempos muy cercanos
        if (Math.abs(p1.current - p2.current) < p1.current * 0.1) {
          const timeRatio = Math.min(p1.time, p2.time) / Math.max(p1.time, p2.time);
          if (timeRatio > 0.8) {
            return true; // Conflicto: tiempos muy cercanos
          }
        }
      }
    }

    return false;
  };

  // Obtener curvas para el nodo seleccionado
  const curves = useMemo(() => {
    if (!selectedNode || !results) return [];

    const nodeCurves = [];
    const { data, type } = selectedNode;

    if (type === 'breaker' || data?.protection) {
      const breakerCurve = generateBreakerCurve(data.protection || data);
      nodeCurves.push({
        name: data.label || 'Protección',
        data: breakerCurve,
        color: '#3b82f6',
        type: 'protection'
      });
    }

    if (type === 'load' || type === 'motor') {
      const loadCurve = generateLoadCurve(data);
      nodeCurves.push({
        name: data.label || 'Carga',
        data: loadCurve,
        color: '#10b981',
        type: 'load'
      });
    }

    return nodeCurves;
  }, [selectedNode, results]);

  // Detectar conflictos
  const hasConflict = useMemo(() => {
    if (curves.length < 2) return false;
    return detectCoordinationConflict(curves[0].data, curves[1].data);
  }, [curves]);

  // Escalar datos para graficar (log-log)
  const scalePoint = (current, time, width, height) => {
    const logCurrent = Math.log10(Math.max(current, 0.1));
    const logTime = Math.log10(Math.max(time, 0.01));

    // Rangos: corriente 0.1-1000A, tiempo 0.01-10000s
    const minLogCurrent = -1;
    const maxLogCurrent = 3;
    const minLogTime = -2;
    const maxLogTime = 4;

    const x = ((logCurrent - minLogCurrent) / (maxLogCurrent - minLogCurrent)) * width;
    const y = height - ((logTime - minLogTime) / (maxLogTime - minLogTime)) * height;

    return { x, y };
  };

  // Generar path SVG para curva
  const generateCurvePath = (curve, width, height) => {
    if (curve.length === 0) return '';

    const points = curve.map(p => scalePoint(p.current, p.time, width, height));

    return points
      .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
      .join(' ');
  };

  if (!selectedNode) {
    return (
      <div className="tcc-panel empty">
        <p>Selecciona un nodo para ver curvas TCC</p>
      </div>
    );
  }

  return (
    <div className="tcc-panel">
      <div className="tcc-header">
        <h3>Curvas TCC - {selectedNode.data?.label || selectedNode.id}</h3>
        <button onClick={onClose} className="close-btn">×</button>
      </div>

      {hasConflict && (
        <div className="tcc-warning">
          ⚠️ Conflicto de coordinación detectado
        </div>
      )}

      <div className="tcc-chart-container">
        <svg width="100%" height="300" viewBox="0 0 400 300" className="tcc-chart">
          {/* Grid */}
          <g className="chart-grid">
            {/* Líneas verticales (corriente) */}
            {[0.1, 1, 10, 100, 1000].map((current) => {
              const { x } = scalePoint(current, 1, 400, 300);
              return (
                <line
                  key={current}
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={300}
                  stroke="#e5e7eb"
                  strokeWidth="0.5"
                />
              );
            })}

            {/* Líneas horizontales (tiempo) */}
            {[0.01, 0.1, 1, 10, 100, 1000, 10000].map((time) => {
              const { y } = scalePoint(1, time, 400, 300);
              return (
                <line
                  key={time}
                  x1={0}
                  y1={y}
                  x2={400}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="0.5"
                />
              );
            })}
          </g>

          {/* Ejes */}
          <g className="chart-axes">
            <line x1="0" y1="300" x2="400" y2="300" stroke="#374151" strokeWidth="1" />
            <line x1="0" y1="0" x2="0" y2="300" stroke="#374151" strokeWidth="1" />

            {/* Etiquetas de corriente */}
            {[0.1, 1, 10, 100, 1000].map((current) => {
              const { x } = scalePoint(current, 1, 400, 300);
              return (
                <text
                  key={current}
                  x={x}
                  y="315"
                  textAnchor="middle"
                  fontSize="8"
                  fill="#6b7280"
                >
                  {current}A
                </text>
              );
            })}

            {/* Etiquetas de tiempo */}
            {[0.01, 0.1, 1, 10, 100, 1000, 10000].map((time) => {
              const { y } = scalePoint(1, time, 400, 300);
              return (
                <text
                  key={time}
                  x="-5"
                  y={y + 3}
                  textAnchor="end"
                  fontSize="8"
                  fill="#6b7280"
                >
                  {time}s
                </text>
              );
            })}
          </g>

          {/* Curvas */}
          {curves.map((curve, index) => (
            <g key={index}>
              <path
                d={generateCurvePath(curve.data, 400, 300)}
                fill="none"
                stroke={curve.color}
                strokeWidth="2"
                className={hasConflict ? 'conflict' : ''}
              />
              <text
                x="10"
                y={20 + index * 15}
                fill={curve.color}
                fontSize="10"
                fontWeight="600"
              >
                {curve.name}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="tcc-legend">
        <h4>Leyenda</h4>
        {curves.map((curve, index) => (
          <div key={index} className="legend-item">
            <div
              className="legend-color"
              style={{ backgroundColor: curve.color }}
            />
            <span>{curve.name} ({curve.type})</span>
          </div>
        ))}
      </div>

      <div className="tcc-info">
        <h4>Información de Coordinación</h4>
        {selectedNode.data?.protection && (
          <div className="info-item">
            <span>Tipo:</span>
            <span>{selectedNode.data.protection.tipo || 'N/A'}</span>
          </div>
        )}
        {selectedNode.data?.In && (
          <div className="info-item">
            <span>In:</span>
            <span>{selectedNode.data.In} A</span>
          </div>
        )}
        {selectedNode.data?.Icu && (
          <div className="info-item">
            <span>Icu:</span>
            <span>{selectedNode.data.Icu} kA</span>
          </div>
        )}
        {selectedNode.data?.I_carga && (
          <div className="info-item">
            <span>I carga:</span>
            <span>{selectedNode.data.I_carga} A</span>
          </div>
        )}
      </div>
    </div>
  );
}

TCCPanel.propTypes = {
  selectedNode: PropTypes.shape({
    id: PropTypes.string,
    type: PropTypes.string,
    data: PropTypes.shape({
      label: PropTypes.string,
      protection: PropTypes.shape({
        tipo: PropTypes.string,
        In: PropTypes.number,
        Icu: PropTypes.number,
        I_carga: PropTypes.number
      })
    })
  }),
  results: PropTypes.object,
  onClose: PropTypes.func
};
