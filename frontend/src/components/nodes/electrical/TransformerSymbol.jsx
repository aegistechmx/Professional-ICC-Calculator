/* eslint-disable react/prop-types */
/**
 * components/nodes/electrical/TransformerSymbol.jsx - Símbolo IEC de Transformador
 * Transformador con doble bobina
 */

import React from 'react';
import { Handle, Position } from 'reactflow';
import './ElectricalSymbols.css';

export default function TransformerSymbol({ data, selected }) {
  const { status, label, kva, primario, secundario } = data || {};

  const formatValue = (value, unit = '', decimals = 0) => {
    if (value === undefined || value === null) return '-';
    return `${Number(value).toFixed(decimals)}${unit}`;
  };

  const getStatusColor = () => {
    if (status === 'calculated') return '#10b981';
    if (status === 'error') return '#ef4444';
    if (status === 'pending') return '#f59e0b';
    return '#8b5cf6';
  };

  return (
    <div className={`electrical-node transformer ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} className="handle-left" />
      <Handle type="source" position={Position.Right} className="handle-right" />

      <div className="symbol-container" style={{ borderColor: getStatusColor() }}>
        <svg width="60" height="70" viewBox="0 0 60 70" className="iec-symbol">
          {/* Primera bobina (primario) - arco hacia derecha */}
          <path
            d="M15 15 Q25 20, 15 25 Q25 30, 15 35"
            fill="none"
            stroke={getStatusColor()}
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Segunda bobina (secundario) - arco hacia izquierda */}
          <path
            d="M45 15 Q35 20, 45 25 Q35 30, 45 35"
            fill="none"
            stroke={getStatusColor()}
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Líneas de conexión */}
          <line x1="5" y1="25" x2="15" y2="25" stroke={getStatusColor()} strokeWidth="2" />
          <line x1="45" y1="25" x2="55" y2="25" stroke={getStatusColor()} strokeWidth="2" />

          {/* Indicador de núcleo */}
          <line x1="28" y1="20" x2="32" y2="30" stroke={getStatusColor()} strokeWidth="1" strokeDasharray="2,2" />
        </svg>

        {status && (
          <div className={`status-badge ${status}`}>
            {status === 'calculated' && '✓'}
            {status === 'error' && '✗'}
            {status === 'pending' && '⋯'}
          </div>
        )}
      </div>

      <div className="node-info">
        <div className="node-label">{label || 'TR'}</div>
        <div className="node-values">
          <span className="power">{formatValue(kva, 'kVA')}</span>
          <span className="ratio">
            {formatValue(primario, 'V')}/{formatValue(secundario, 'V')}
          </span>
        </div>
      </div>
    </div>
  );
}
