/**
 * components/nodes/electrical/BreakerSymbol.jsx - Símbolo IEC de Interruptor
 * Interruptor automático / Breaker
 */

import React from 'react';
import { Handle, Position } from 'reactflow';
import './ElectricalSymbols.css';

export default function BreakerSymbol({ data, selected }) {
  const { results, status, label, In, Icu } = data || {};
  
  const formatValue = (value, unit = '', decimals = 0) => {
    if (value === undefined || value === null) return '-';
    return `${Number(value).toFixed(decimals)}${unit}`;
  };

  const getStatusColor = () => {
    if (status === 'tripped') return '#dc2626';
    if (status === 'calculated') return '#10b981';
    if (status === 'error') return '#ef4444';
    if (status === 'pending') return '#f59e0b';
    return '#ef4444';
  };

  const isTripped = status === 'tripped';

  return (
    <div className={`electrical-node breaker ${selected ? 'selected' : ''} ${isTripped ? 'tripped' : ''}`}>
      <Handle type="target" position={Position.Left} className="handle-left" />
      <Handle type="source" position={Position.Right} className="handle-right" />
      
      <div className="symbol-container" style={{ borderColor: getStatusColor() }}>
        <svg width="60" height="60" viewBox="0 0 60 60" className="iec-symbol">
          {/* Caja del breaker */}
          <rect 
            x="15" y="15" width="30" height="30" 
            fill="none" 
            stroke={getStatusColor()} 
            strokeWidth="2"
            rx="2"
          />
          
          {/* Símbolo de contacto - línea diagonal */}
          <line 
            x1="20" y1="35" 
            x2="40" y2="25" 
            stroke={getStatusColor()} 
            strokeWidth="2"
            strokeLinecap="round"
            style={{
              transform: isTripped ? 'rotate(30deg)' : 'none',
              transformOrigin: '30px 30px'
            }}
          />
          
          {/* Líneas de conexión */}
          <line x1="5" y1="30" x2="15" y2="30" stroke={getStatusColor()} strokeWidth="2" />
          <line x1="45" y1="30" x2="55" y2="30" stroke={getStatusColor()} strokeWidth="2" />
          
          {/* Indicador de disparo */}
          {isTripped && (
            <circle cx="30" cy="30" r="3" fill="#dc2626" />
          )}
        </svg>
        
        {status && (
          <div className={`status-badge ${status}`}>
            {isTripped && '⚡'}
            {status === 'calculated' && '✓'}
            {status === 'error' && '✗'}
            {status === 'pending' && '⋯'}
          </div>
        )}
      </div>
      
      <div className="node-info">
        <div className="node-label">{label || 'Breaker'}</div>
        <div className="node-values">
          <span className="current">{formatValue(In, 'A')}</span>
          {Icu && (
            <span className="icu">Icu: {formatValue(Icu, 'kA', 1)}</span>
          )}
        </div>
      </div>
      
      {/* Indicador de disparo */}
      {isTripped && (
        <div className="trip-indicator">
          DISPARADO
        </div>
      )}
    </div>
  );
}
