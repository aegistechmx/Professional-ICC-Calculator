/**
 * components/nodes/SourceNode.jsx - Nodo de Fuente con Resultados
 * Componente React Flow para fuente de alimentación con visualización de resultados
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Handle, Position } from 'reactflow';
import './SourceNode.css';

export default function SourceNode({ data, selected }) {
  const { results, status } = data || {};

  // Determinar clase de estado
  const getStatusClass = () => {
    if (status === 'calculated') return 'calculated';
    if (status === 'error') return 'error';
    if (status === 'pending') return 'pending';
    return 'default';
  };

  // Formatear valores
  const formatValue = (value, unit = '', decimals = 2) => {
    if (value === undefined || value === null) return '-';
    return `${Number(value).toFixed(decimals)}${unit}`;
  };

  return (
    <div className={`source-node ${getStatusClass()} ${selected ? 'selected' : ''}`}>
      {/* Handles de conexión */}
      <Handle
        type="source"
        position={Position.Right}
        className="source-handle"
      />

      {/* Contenido del nodo */}
      <div className="node-content">
        {/* Header del nodo */}
        <div className="node-header">
          <div className="node-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div className="node-title">
            <div className="node-label">{data?.label || 'Fuente'}</div>
            <div className="node-type">FUENTE</div>
          </div>
        </div>

        {/* Parámetros principales */}
        <div className="node-parameters">
          <div className="parameter">
            <span className="param-label">V:</span>
            <span className="param-value">
              {formatValue(data?.voltaje || results?.voltage, 'V')}
            </span>
          </div>

          {results?.availablePower && (
            <div className="parameter">
              <span className="param-label">P:</span>
              <span className="param-value">
                {formatValue(results.availablePower, 'kW')}
              </span>
            </div>
          )}
        </div>

        {/* Resultados del cálculo */}
        {results && (
          <div className="node-results">
            <div className="results-header">
              <span className="results-title">Resultados</span>
              <span className={`status-indicator ${status}`}>
                {status === 'calculated' && 'OK'}
                {status === 'error' && 'ERROR'}
                {status === 'pending' && '...'}
              </span>
            </div>

            <div className="results-grid">
              {results.shortCircuitCurrent && (
                <div className="result-item">
                  <span className="result-label">Isc:</span>
                  <span className="result-value">
                    {formatValue(results.shortCircuitCurrent, 'kA')}
                  </span>
                </div>
              )}

              {results.impedance && (
                <div className="result-item">
                  <span className="result-label">Z:</span>
                  <span className="result-value">
                    {formatValue(results.impedance, 'ohms', 3)}
                  </span>
                </div>
              )}

              {results.powerFactor && (
                <div className="result-item">
                  <span className="result-label">FP:</span>
                  <span className="result-value">
                    {formatValue(results.powerFactor, '', 2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Indicador de estado */}
        {status && (
          <div className="status-bar">
            <div className={`status-dot ${status}`}></div>
            <span className="status-text">
              {status === 'calculated' && 'Calculado'}
              {status === 'error' && 'Error'}
              {status === 'pending' && 'Pendiente'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

SourceNode.propTypes = {
  data: PropTypes.object,
  selected: PropTypes.bool
};
