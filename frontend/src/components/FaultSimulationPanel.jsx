/**
 * components/FaultSimulationPanel.jsx - Panel de Simulación de Fallas
 * Controla y visualiza simulaciones dinámicas de fallas
 */

import React, { useState, useEffect, useCallback } from 'react';
import './FaultSimulationPanel.css';

export default function FaultSimulationPanel({ 
  nodes, 
  edges, 
  onSimulationStart,
  onSimulationEnd,
  onApplyState
}) {
  const [configuracion, setConfiguracion] = useState({
    tipo: '3F',
    nodo: null,
    tiempoInicio: 0,
    duracion: 0.2
  });
  
  const [simulando, setSimulando] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [resultado, setResultado] = useState(null);
  const [estadoActual, setEstadoActual] = useState(null);
  const [indiceFrame, setIndiceFrame] = useState(0);

  // Nodos disponibles para falla
  const nodosDisponibles = nodes?.filter(n => 
    n.type === 'load' || n.type === 'motor' || n.type === 'breaker'
  ) || [];

  /**
   * Iniciar simulación
   */
  const iniciarSimulacion = useCallback(async () => {
    if (!configuracion.nodo) {
      alert('Selecciona un nodo para la falla');
      return;
    }

    setSimulando(true);
    setPausado(false);
    setProgreso(0);
    setIndiceFrame(0);

    try {
      const sistema = { nodes, edges };
      const falla = {
        tipo: configuracion.tipo,
        nodo: configuracion.nodo,
        tiempoInicio: configuracion.tiempoInicio,
        duracion: configuracion.duracion
      };

      onSimulationStart?.({ nodo: configuracion.nodo, tipo: configuracion.tipo });

      // Llamar al backend
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sistema, falla })
      });

      const data = await response.json();

      if (data.success) {
        setResultado(data.data);
        iniciarAnimacion(data.data.timeline);
      } else {
        throw new Error(data.error);
      }

    } catch (error) {
      console.error('[SIMULATION] Error:', error);
      alert('Error en simulación: ' + error.message);
      setSimulando(false);
    }
  }, [configuracion, nodes, edges, onSimulationStart]);

  /**
   * Animar simulación
   */
  const iniciarAnimacion = useCallback((timeline) => {
    let frame = 0;
    const totalFrames = timeline.length;
    const interval = 50; // ms entre frames

    const animar = () => {
      if (frame >= totalFrames || (!simulando && !pausado)) {
        setSimulando(false);
        onSimulationEnd?.(resultado);
        return;
      }

      if (!pausado) {
        const estado = timeline[frame];
        setEstadoActual(estado);
        setIndiceFrame(frame);
        setProgreso((frame / totalFrames) * 100);
        
        // Aplicar estado al grafo
        onApplyState?.(estado);
        
        frame++;
      }

      setTimeout(animar, interval);
    };

    animar();
  }, [simulando, pausado, resultado, onApplyState, onSimulationEnd]);

  /**
   * Pausar/reanudar
   */
  const togglePausa = () => {
    setPausado(!pausado);
  };

  /**
   * Detener simulación
   */
  const detenerSimulacion = () => {
    setSimulando(false);
    setPausado(false);
    setProgreso(0);
    setEstadoActual(null);
    setResultado(null);
    onSimulationEnd?.(null);
  };

  /**
   * Exportar resultados
   */
  const exportarResultados = () => {
    if (!resultado) return;

    const dataStr = JSON.stringify(resultado, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulacion_falla_${configuracion.nodo}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fault-simulation-panel">
      <div className="panel-header">
        <h3>⚡ Simulación de Fallas</h3>
        {simulando && (
          <button 
            className="btn-close"
            onClick={detenerSimulacion}
          >
            ✕
          </button>
        )}
      </div>

      {/* Configuración */}
      <div className="config-section">
        <h4>Configuración</h4>
        
        <div className="form-group">
          <label>Tipo de Falla</label>
          <select
            value={configuracion.tipo}
            onChange={(e) => setConfiguracion({...configuracion, tipo: e.target.value})}
            disabled={simulando}
          >
            <option value="3F">Trifásica (3F)</option>
            <option value="2F">Bifásica (2F)</option>
            <option value="1F">Monofásica (1F)</option>
            <option value="FT">Fase-Tierra (FT)</option>
          </select>
        </div>

        <div className="form-group">
          <label>Nodo de Falla</label>
          <select
            value={configuracion.nodo || ''}
            onChange={(e) => setConfiguracion({...configuracion, nodo: e.target.value})}
            disabled={simulando || nodosDisponibles.length === 0}
          >
            <option value="">Seleccionar nodo...</option>
            {nodosDisponibles.map(nodo => (
              <option key={nodo.id} value={nodo.id}>
                {nodo.data?.label || nodo.id} ({nodo.type})
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Duración (s)</label>
            <input
              type="number"
              min="0.1"
              max="1"
              step="0.1"
              value={configuracion.duracion}
              onChange={(e) => setConfiguracion({...configuracion, duracion: parseFloat(e.target.value)})}
              disabled={simulando}
            />
          </div>
        </div>

        {/* Controles */}
        <div className="simulation-controls">
          {!simulando ? (
            <button
              className="btn-simulate"
              onClick={iniciarSimulacion}
              disabled={!configuracion.nodo}
            >
              ▶ Iniciar Simulación
            </button>
          ) : (
            <div className="playback-controls">
              <button
                className="btn-control"
                onClick={togglePausa}
              >
                {pausado ? '▶' : '⏸'}
              </button>
              <button
                className="btn-control stop"
                onClick={detenerSimulacion}
              >
                ⏹
              </button>
            </div>
          )}
        </div>

        {/* Barra de progreso */}
        {simulando && (
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${progreso}%` }}
            />
            <span className="progress-text">{progreso.toFixed(0)}%</span>
          </div>
        )}
      </div>

      {/* Estado en tiempo real */}
      {estadoActual && (
        <div className="status-section">
          <h4>Estado t = {estadoActual.t.toFixed(2)}s</h4>
          
          <div className="status-grid">
            {estadoActual.estado.map(node => (
              <div 
                key={node.id}
                className={`status-item ${node.activo ? 'active' : 'inactive'} ${node.protegido ? 'protected' : ''}`}
              >
                <span className="node-id">{node.id}</span>
                <span className="current">{node.corriente.toFixed(1)}A</span>
                <span className="voltage">{node.voltaje.toFixed(0)}V</span>
                {node.protegido && <span className="badge">DISPARADO</span>}
              </div>
            ))}
          </div>

          {/* Disparos recientes */}
          {estadoActual.disparos.length > 0 && (
            <div className="trips-section">
              <h5>Disparos</h5>
              {estadoActual.disparos.map((disparo, i) => (
                <div key={i} className="trip-item">
                  <span>{disparo.proteccionId}</span>
                  <span>{disparo.tipoDisparo}</span>
                  <span>{disparo.tiempoDisparo.toFixed(3)}s</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Resultados */}
      {resultado && !simulando && (
        <div className="results-section">
          <h4>Resumen de Simulación</h4>
          
          <div className="summary-stats">
            <div className="stat">
              <label>Tipo de Falla</label>
              <value>{resultado.resumen.tipoFalla}</value>
            </div>
            <div className="stat">
              <label>Nodo Afectado</label>
              <value>{resultado.resumen.nodoFalla}</value>
            </div>
            <div className="stat">
              <label>Primera Operación</label>
              <value>{resultado.resumen.tiempoPrimeraOperacion?.toFixed(3) || '-'}s</value>
            </div>
            <div className="stat">
              <label>Nodos Afectados</label>
              <value>{resultado.resumen.nodosAfectados}</value>
            </div>
            <div className="stat">
              <label>Protecciones Operadas</label>
              <value>{resultado.resumen.proteccionesOperadas}</value>
            </div>
            <div className={`stat ${resultado.resumen.coordenacionExitosa ? 'success' : 'error'}`}>
              <label>Coordinación</label>
              <value>{resultado.resumen.coordenacionExitosa ? '✓ Exitosa' : '✗ Fallida'}</value>
            </div>
          </div>

          <button className="btn-export" onClick={exportarResultados}>
            📥 Exportar Resultados
          </button>
        </div>
      )}
    </div>
  );
}
