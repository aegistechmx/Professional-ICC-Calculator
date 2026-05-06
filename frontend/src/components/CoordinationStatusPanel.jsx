/**
 * components/CoordinationStatusPanel.jsx - Panel de Estado de Coordinación
 * Muestra estado visual de coordinación con colores ETAP-style
 */

import React, { useState } from 'react';
import './CoordinationStatusPanel.css';

export default function CoordinationStatusPanel({ 
  coordinationResult,
  onApplyChanges,
  onReset,
  isLoading = false
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPair, setSelectedPair] = useState(null);

  if (!coordinationResult) {
    return (
      <div className="coordination-panel empty">
        <div className="panel-icon">⚡</div>
        <h3>Auto-Coordinación</h3>
        <p>Ejecuta auto-coordinación para analizar y ajustar protecciones</p>
        <div className="coord-info">
          <div className="info-item">
            <span className="label">Margen típico:</span>
            <span className="value">0.3s</span>
          </div>
          <div className="info-item">
            <span className="label">Iteraciones máx:</span>
            <span className="value">20</span>
          </div>
        </div>
      </div>
    );
  }

  const { 
    status, 
    breakers, 
    originalBreakers, 
    iterations, 
    history, 
    finalStatus,
    message 
  } = coordinationResult;

  const isCoordinated = status === 'COORDINATED';
  const quality = finalStatus?.quality || 0;

  // Comparar valores originales vs coordinados
  const changes = breakers.map((b, i) => {
    const orig = originalBreakers[i];
    const changes = [];
    
    if (b.TMS !== orig.TMS) {
      changes.push({
        param: 'TMS',
        old: orig.TMS,
        new: b.TMS,
        percent: ((b.TMS / orig.TMS - 1) * 100).toFixed(1)
      });
    }
    if (b.pickup !== orig.pickup) {
      changes.push({
        param: 'Pickup',
        old: orig.pickup,
        new: b.pickup,
        percent: ((b.pickup / orig.pickup - 1) * 100).toFixed(1)
      });
    }
    if (b.instantaneous !== orig.instantaneous) {
      changes.push({
        param: 'Instantáneo',
        old: orig.instantaneous,
        new: b.instantaneous,
        percent: ((b.instantaneous / orig.instantaneous - 1) * 100).toFixed(1)
      });
    }
    
    return { breaker: b, changes };
  }).filter(c => c.changes.length > 0);

  return (
    <div className={`coordination-panel ${isCoordinated ? 'success' : 'partial'}`}>
      {/* Header */}
      <div className="panel-header">
        <div className="status-indicator">
          <div className={`status-dot ${isCoordinated ? 'green' : 'yellow'}`} />
          <span className="status-text">{status}</span>
        </div>
        <div className="quality-score">
          <span className="score-label">Calidad</span>
          <span className={`score-value ${quality >= 80 ? 'good' : quality >= 50 ? 'medium' : 'bad'}`}>
            {quality}%
          </span>
        </div>
      </div>

      {/* Mensaje */}
      <div className="panel-message">
        <p>{message}</p>
        <span className="iterations">{iterations} iteraciones</span>
      </div>

      {/* Pares de coordinación */}
      <div className="pairs-section">
        <h4>Pares de Protección</h4>
        {finalStatus?.pairs?.map((pair, index) => (
          <div 
            key={index}
            className={`pair-card ${pair.status.toLowerCase()} ${selectedPair === index ? 'selected' : ''}`}
            onClick={() => setSelectedPair(selectedPair === index ? null : index)}
          >
            <div className="pair-header">
              <span className="pair-name">{pair.pair}</span>
              <span className={`pair-badge ${pair.status.toLowerCase()}`}>
                {pair.status === 'OK' ? '✓' : '✗'}
              </span>
            </div>
            {selectedPair === index && pair.status === 'CONFLICT' && (
              <div className="pair-details">
                <span className="conflict-count">{pair.crossings} conflictos</span>
                {pair.worstPoint && (
                  <div className="worst-point">
                    <span>Peor punto:</span>
                    <span>I={pair.worstPoint.I.toFixed(1)}A</span>
                    <span>Δt={(pair.worstPoint.tUp - pair.worstPoint.tDown).toFixed(3)}s</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Cambios aplicados */}
      {changes.length > 0 && (
        <div className="changes-section">
          <h4>Ajustes Realizados</h4>
          {changes.map((item, index) => (
            <div key={index} className="change-item">
              <span className="breaker-name">{item.breaker.id || `Breaker ${index + 1}`}</span>
              <div className="change-list">
                {item.changes.map((change, i) => (
                  <div key={i} className="change-detail">
                    <span className="param">{change.param}</span>
                    <span className="arrow">→</span>
                    <span className="values">
                      {change.old} → {change.new}
                      <span className="percent">(+{change.percent}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Historial de iteraciones */}
      {history && history.length > 0 && (
        <div className="history-section">
          <button 
            className="toggle-btn"
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? '▼' : '▶'} Historial ({history.length} ajustes)
          </button>
          {showHistory && (
            <div className="history-list">
              {history.map((h, i) => (
                <div key={i} className="history-item">
                  <span className="iteration">#{h.iteration}</span>
                  <span className="pair">{h.pair}</span>
                  <span className={`adjustment ${h.adjustment.toLowerCase().replace('_', '-')}`}>
                    {h.adjustment.replace('_', ' ')}
                  </span>
                  <span className="value">
                    {h.values.old} → {h.values.new}
                    (+{h.values.percent}%)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sugerencias */}
      {!isCoordinated && (
        <div className="suggestions-section">
          <button 
            className="toggle-btn warning"
            onClick={() => setShowSuggestions(!showSuggestions)}
          >
            {showSuggestions ? '▼' : '▶'} Sugerencias de Ajuste Manual
          </button>
          {showSuggestions && (
            <div className="suggestions-list">
              <p className="suggestion-intro">
                Los siguientes ajustes no se pudieron aplicar automáticamente:
              </p>
              {finalStatus?.pairs
                ?.filter(p => p.status === 'CONFLICT')
                .map((pair, i) => (
                  <div key={i} className="suggestion-item">
                    <span className="suggestion-pair">{pair.pair}</span>
                    <ul className="suggestion-tips">
                      <li>Considerar aumentar TMS de protección upstream</li>
                      <li>Verificar si es necesario cambiar tipo de curva</li>
                      <li>Revisar si el pickup puede aumentarse</li>
                    </ul>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Acciones */}
      <div className="panel-actions">
        <button 
          className="btn-apply"
          onClick={() => onApplyChanges?.(breakers)}
          disabled={isLoading || changes.length === 0}
        >
          {isLoading ? 'Aplicando...' : 'Aplicar Cambios'}
        </button>
        <button 
          className="btn-reset"
          onClick={onReset}
          disabled={isLoading}
        >
          Revertir
        </button>
      </div>
    </div>
  );
}
