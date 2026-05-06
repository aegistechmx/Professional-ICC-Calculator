/**
 * components/nodes/electrical/SourceSymbol.jsx - Símbolo IEC de Fuente
 * Fuente de alimentación / Generador
 */

import React from 'react';
import { Handle, Position } from 'reactflow';
import './ElectricalSymbols.css';

export default function SourceSymbol({ data, selected }) {
  const { results, status, label, voltaje } = data || {};
  
  // Formatear valores
  const formatValue = (value, unit = '', decimals = 0) => {
    if (value === undefined || value === null) return '-';
    return `${Number(value).toFixed(decimals)}${unit}`;
  };

  // Color según estado
  const getStatusColor = () => {
    if (status === 'calculated') return '#10b981';
    if (status === 'error') return '#ef4444';
    if (status === 'pending') return '#f59e0b';
    return '#3b82f6';
  };

  return (
    <div className={`electrical-node source ${selected ? 'selected' : ''}`}>
      <Handle type="source" position={Position.Right} className="handle-right" />
      <Handle type="target" position={Position.Left} className="handle-left" />
      
      {/* Símbolo IEC - Círculo con ondas (generador) o línea (fuente) */}
      <div className="symbol-container" style={{ borderColor: getStatusColor() }}>
        <svg width="60" height="60" viewBox="0 0 60 60" className="iec-symbol">
          {/* Círculo base */}
          <circle 
            cx="30" cy="30" r="25" 
            fill="none" 
            stroke={getStatusColor()} 
            strokeWidth="2"
          />
          
          {/* Símbolo de ondas (corriente alterna) */}
          <path 
            d="M15 30 Q20 20, 25 30 T35 30 Q40 40, 45 30" 
            fill="none" 
            stroke={getStatusColor()} 
            strokeWidth="2"
            strokeLinecap="round"
          />
          
          {/* Líneas de conexión */}
          <line x1="5" y1="30" x2="15" y2="30" stroke={getStatusColor()} strokeWidth="2" />
          <line x1="45" y1="30" x2="55" y2="30" stroke={getStatusColor()} strokeWidth="2" />
        </svg>
        
        {/* Badge de estado */}
        {status && (
          <div className={`status-badge ${status}`}>
            {status === 'calculated' && '✓'}
            {status === 'error' && '✗'}
            {status === 'pending' && '⋯'}
          </div>
        )}
      </div>
      
      {/* Información del nodo */}
      <div className="node-info">
        <div className="node-label">{label || 'Fuente'}</div>
        <div className="node-values">
          <span className="voltage">{formatValue(voltaje || results?.voltage, 'V')}</span>
          {results?.shortCircuitCurrent && (
            <span className="current">Isc: {formatValue(results.shortCircuitCurrent, 'kA', 2)}</span>
          )}
        </div>
      </div>
      
      {/* Animación de flujo */}
      {status === 'calculated' && (
        <div className="flow-animation">
          <div className="flow-dot" style={{ animationDelay: '0s' }} />
          <div className="flow-dot" style={{ animationDelay: '0.3s' }} />
          <div className="flow-dot" style={{ animationDelay: '0.6s' }} />
        </div>
      )}
    </div>
  );
}
