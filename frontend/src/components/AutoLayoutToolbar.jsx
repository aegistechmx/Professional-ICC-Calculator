/**
 * components/AutoLayoutToolbar.jsx - Toolbar de Auto-Layout
 * Botones para organizar automáticamente el sistema eléctrico
 */

import React, { useState } from 'react';
import { useGraphStore } from '../store/graphStore';
import { useHistoryStore } from '../store/historyStore';
import { AutoLayoutEngine, LAYOUT_STRATEGIES, detectTopology } from '../utils/autoLayoutEngine';
import './AutoLayoutToolbar.css';

const LAYOUT_OPTIONS = [
  {
    id: LAYOUT_STRATEGIES.HIERARCHICAL,
    label: 'Jerárquico',
    icon: '🌳',
    description: 'Fuente → Transformador → Tablero → Cargas',
    recommended: true
  },
  {
    id: LAYOUT_STRATEGIES.RADIAL,
    label: 'Radial',
    icon: '☀️',
    description: 'Fuente en centro, cargas distribuidas',
    recommended: false
  },
  {
    id: LAYOUT_STRATEGIES.ELECTRICAL_TYPE,
    label: 'Por Tipo',
    icon: '⚡',
    description: 'Organizado por tipo de componente',
    recommended: false
  },
  {
    id: LAYOUT_STRATEGIES.GRID,
    label: 'Grid',
    icon: '⬜',
    description: 'Organización en cuadrícula regular',
    recommended: false
  },
  {
    id: LAYOUT_STRATEGIES.TREE,
    label: 'Árbol',
    icon: '🌲',
    description: 'Layout de árbol puro',
    recommended: false
  }
];

export default function AutoLayoutToolbar() {
  const { nodes, edges, setGraph } = useGraphStore();
  const { saveState } = useHistoryStore();
  const [isOpen, setIsOpen] = useState(false);
  const [applying, setApplying] = useState(false);

  // Detectar topología y sugerir estrategia
  const suggestedStrategy = nodes.length > 0 ? detectTopology(nodes, edges) : null;

  const applyLayout = async (strategy) => {
    if (nodes.length === 0) {
      showNotification('No hay nodos para organizar');
      return;
    }

    setApplying(true);

    try {
      // Guardar estado antes del layout
      saveState();

      // Crear motor y ejecutar layout
      const engine = new AutoLayoutEngine({
        spacingX: 250,
        spacingY: 180,
        startX: 100,
        startY: 100
      });

      const newNodes = engine.layout(nodes, edges, strategy);

      // Aplicar nuevas posiciones
      setGraph(newNodes, edges);

      showNotification(`✅ Layout ${strategy} aplicado`);

    } catch (error) {
      showNotification('❌ Error al aplicar layout');
    } finally {
      setApplying(false);
      setIsOpen(false);
    }
  };

  const applySmartLayout = () => {
    const engine = new AutoLayoutEngine();
    const suggested = engine.suggestStrategy(nodes, edges);
    applyLayout(suggested);
  };

  const nodeCount = nodes.length;
  const edgeCount = edges.length;

  return (
    <div className="auto-layout-toolbar">
      {/* Botón principal */}
      <button
        className="layout-main-btn"
        onClick={() => setIsOpen(!isOpen)}
        disabled={nodeCount === 0 || applying}
        title="Organizar automáticamente"
      >
        {applying ? (
          <span className="spinner">⟳</span>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
        )}
        <span>Auto Layout</span>
        <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {/* Menú desplegable */}
      {isOpen && (
        <div className="layout-menu">
          <div className="layout-menu-header">
            <h4>Organizar Sistema</h4>
            <span className="stats">{nodeCount} nodos, {edgeCount} conexiones</span>
          </div>

          {suggestedStrategy && (
            <div className="topology-info">
              <span className="topology-badge">
                Topología detectada: <strong>{suggestedStrategy}</strong>
              </span>
            </div>
          )}

          <div className="layout-options">
            {/* Opción inteligente */}
            <button
              className="layout-option smart"
              onClick={applySmartLayout}
              disabled={applying}
            >
              <span className="option-icon">🧠</span>
              <div className="option-info">
                <span className="option-label">Inteligente</span>
                <span className="option-desc">Detecta y aplica el mejor layout</span>
              </div>
              <span className="smart-badge">RECOMENDADO</span>
            </button>

            <div className="divider" />

            {/* Opciones específicas */}
            {LAYOUT_OPTIONS.map(option => (
              <button
                key={option.id}
                className={`layout-option ${option.recommended ? 'recommended' : ''}`}
                onClick={() => applyLayout(option.id)}
                disabled={applying}
              >
                <span className="option-icon">{option.icon}</span>
                <div className="option-info">
                  <span className="option-label">{option.label}</span>
                  <span className="option-desc">{option.description}</span>
                </div>
                {option.recommended && (
                  <span className="rec-badge">⭐</span>
                )}
              </button>
            ))}
          </div>

          <div className="layout-footer">
            <button
              className="cancel-btn"
              onClick={() => setIsOpen(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Overlay para cerrar */}
      {isOpen && (
        <div className="layout-overlay" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}

// Helper para notificaciones
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'layout-notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #1f2937;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    z-index: 9999;
    animation: slideIn 0.3s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
