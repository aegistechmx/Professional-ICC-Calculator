/**
 * components/nodes/electrical/PanelSymbol.jsx - Símbolo IEC de Tablero/Barra
 * Tablero de distribución / Barra colectora
 */

import React from 'react';
import { Handle, Position } from 'reactflow';
import './ElectricalSymbols.css';

export default function PanelSymbol({ data, selected }) {
  const { results, status, label, tension, fases = 3 } = data || {};
  
  const formatValue = (value, unit = '', decimals = 0) => {
    if (value === undefined || value === null) return '-';
    return `${Number(value).toFixed(decimals)}${unit}`;
  };

  const getStatusColor = () => {
    if (status === 'calculated') return '#10b981';
    if (status === 'error') return '#ef4444';
    if (status === 'pending') return '#f59e0b';
    return '#f59e0b';
  };

  return (
    <div className={`electrical-node panel ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} className="handle-left" />
      <Handle type="source" position={Position.Right} className="handle-right" />
      
      <div className="symbol-container" style={{ borderColor: getStatusColor() }}>
        <svg width="60" height="60" viewBox="0 0 60 60" className="iec-symbol">
          {/* Rectángulo del tablero */}
          <rect 
            x="10" y="15" width="40" height="30" 
            fill="none" 
            stroke={getStatusColor()} 
            strokeWidth="2"
            rx="2"
          />
          
          {/* Barras internas */}
          {fases >= 1 && (
            <line x1="15" y1="22" x2="45" y2="22" stroke={getStatusColor()} strokeWidth="1.5" />
          )}
          {fases >= 2 && (
            <line x1="15" y1="30" x2="45" y2="30" stroke={getStatusColor()} strokeWidth="1.5" />
          )}
          {fases >= 3 && (
            <line x1="15" y1="38" x2="45" y2="38" stroke={getStatusColor()} strokeWidth="1.5" />
          )}
          
          {/* Líneas de conexión */}
          <line x1="5" y1="30" x2="10" y2="30" stroke={getStatusColor()} strokeWidth="2" />
          <line x1="50" y1="30" x2="55" y2="30" stroke={getStatusColor()} strokeWidth="2" />
          
          {/* Indicador de fases */}
          <text 
            x="30" y="55" 
            textAnchor="middle" 
            fill={getStatusColor()} 
            fontSize="8"
            fontFamily="Arial, sans-serif"
          >
            {fases}F
          </text>
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
        <div className="node-label">{label || 'Panel'}</div>
        <div className="node-values">
          <span className="voltage">{formatValue(tension, 'V')}</span>
          <span className="phases">{fases}F</span>
        </div>
      </div>
    </div>
  );
}
