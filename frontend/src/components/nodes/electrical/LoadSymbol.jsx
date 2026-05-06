/**
 * components/nodes/electrical/LoadSymbol.jsx - Símbolo IEC de Carga
 * Carga eléctrica / Motor
 */

import React from 'react';
import { Handle, Position } from 'reactflow';
import './ElectricalSymbols.css';

export default function LoadSymbol({ data, selected }) {
  const { results, status, label, I_carga, longitud, tipo = 'motor' } = data || {};
  
  const formatValue = (value, unit = '', decimals = 0) => {
    if (value === undefined || value === null) return '-';
    return `${Number(value).toFixed(decimals)}${unit}`;
  };

  const getStatusColor = () => {
    if (status === 'overload') return '#dc2626';
    if (status === 'calculated') return '#10b981';
    if (status === 'error') return '#ef4444';
    if (status === 'pending') return '#f59e0b';
    return '#3b82f6';
  };

  const isMotor = tipo === 'motor';
  const isOverload = status === 'overload';

  return (
    <div className={`electrical-node load ${selected ? 'selected' : ''} ${isOverload ? 'overload' : ''}`}>
      <Handle type="target" position={Position.Left} className="handle-left" />
      
      <div className="symbol-container" style={{ borderColor: getStatusColor() }}>
        <svg width="60" height="60" viewBox="0 0 60 60" className="iec-symbol">
          {/* Círculo base */}
          <circle 
            cx="30" cy="30" r="20" 
            fill="none" 
            stroke={getStatusColor()} 
            strokeWidth="2"
          />
          
          {isMotor ? (
            // Símbolo de motor: M
            <text 
              x="30" y="36" 
              textAnchor="middle" 
              fill={getStatusColor()} 
              fontSize="16"
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
            >
              M
            </text>
          ) : (
            // Símbolo de carga genérica: flecha hacia abajo
            <>
              <line x1="30" y1="22" x2="30" y2="35" stroke={getStatusColor()} strokeWidth="2" />
              <polygon 
                points="25,35 30,42 35,35" 
                fill={getStatusColor()} 
              />
            </>
          )}
          
          {/* Línea de conexión */}
          <line x1="5" y1="30" x2="15" y2="30" stroke={getStatusColor()} strokeWidth="2" />
          
          {/* Indicador de sobrecarga */}
          {isOverload && (
            <circle cx="48" cy="12" r="4" fill="#dc2626" />
          )}
        </svg>
        
        {status && (
          <div className={`status-badge ${status}`}>
            {isOverload && '⚠'}
            {status === 'calculated' && '✓'}
            {status === 'error' && '✗'}
            {status === 'pending' && '⋯'}
          </div>
        )}
      </div>
      
      <div className="node-info">
        <div className="node-label">{label || (isMotor ? 'Motor' : 'Carga')}</div>
        <div className="node-values">
          <span className="current">{formatValue(I_carga, 'A')}</span>
          {longitud && (
            <span className="length">{formatValue(longitud, 'm')}</span>
          )}
        </div>
      </div>
      
      {/* Indicador de sobrecarga */}
      {isOverload && (
        <div className="overload-indicator">
          SOBRECARGA
        </div>
      )}
    </div>
  );
}
