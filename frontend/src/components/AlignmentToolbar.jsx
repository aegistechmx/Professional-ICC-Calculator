/**
 * components/AlignmentToolbar.jsx - Toolbar de Alineación tipo AutoCAD
 * Botones para alinear, distribuir y organizar nodos
 */

import React from 'react';
import { useGraphStore } from '../store/graphStore';
import { useHistoryStore } from '../store/historyStore';
import {
  alignLeft,
  alignRight,
  alignCenterH,
  alignTop,
  alignBottom,
  alignCenterV,
  distributeHorizontal,
  distributeVertical,
  distributeGrid,
  getBoundingBox
} from '../utils/alignmentTools';
import './AlignmentToolbar.css';

export default function AlignmentToolbar() {
  const { nodes, edges, setGraph } = useGraphStore();
  const { saveState } = useHistoryStore();

  const selectedCount = nodes.filter(n => n.selected).length;
  const hasSelection = selectedCount > 0;
  const canAlign = selectedCount >= 2;
  const canDistribute = selectedCount >= 3;

  const handleAlign = (alignFn, name) => {
    if (!canAlign) return;

    // Guardar estado antes de alinear
    saveState();

    const newNodes = alignFn(nodes);
    setGraph(newNodes, edges);

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log(`[ALIGN] ${name}: ${selectedCount} nodos`);
    }
  };

  const handleDistribute = (distributeFn, name) => {
    if (!canDistribute) return;

    // Guardar estado antes de distribuir
    saveState();

    const newNodes = distributeFn(nodes);
    setGraph(newNodes, edges);

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log(`[DISTRIBUTE] ${name}: ${selectedCount} nodos`);
    }
  };

  const boundingBox = hasSelection ? getBoundingBox(nodes) : null;

  return (
    <div className="alignment-toolbar">
      <div className="toolbar-section">
        <span className="section-title">Alinear</span>
        <div className="toolbar-buttons">
          <button
            className="toolbar-btn"
            onClick={() => handleAlign(alignLeft, 'izquierda')}
            disabled={!canAlign}
            title="Alinear a la izquierda (Ctrl+Shift+←)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 3h2v18H3V3zm4 4h12v4H7V7zm0 6h8v4H7v-4z" />
            </svg>
            Izquierda
          </button>

          <button
            className="toolbar-btn"
            onClick={() => handleAlign(alignCenterH, 'centro H')}
            disabled={!canAlign}
            title="Alinear al centro horizontal"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 3h4v18h-4V3zM7 7h10v4H7V7zm0 6h10v4H7v-4z" />
            </svg>
            Centro H
          </button>

          <button
            className="toolbar-btn"
            onClick={() => handleAlign(alignRight, 'derecha')}
            disabled={!canAlign}
            title="Alinear a la derecha (Ctrl+Shift+→)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3h2v18h-2V3zm-4 4h-12v4h12V7zm0 6h-8v4h8v-4z" />
            </svg>
            Derecha
          </button>
        </div>

        <div className="toolbar-buttons">
          <button
            className="toolbar-btn"
            onClick={() => handleAlign(alignTop, 'arriba')}
            disabled={!canAlign}
            title="Alinear arriba (Ctrl+Shift+↑)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 3h18v2H3V3zm4 4v12H5V7h2zm6 0v8h-2V7h2zm6 0v4h-2V7h2z" />
            </svg>
            Arriba
          </button>

          <button
            className="toolbar-btn"
            onClick={() => handleAlign(alignCenterV, 'centro V')}
            disabled={!canAlign}
            title="Alinear al centro vertical"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 10h18v4H3v-4zM7 7v10H5V7h2zm6-2v14h-2V5h2zm6 2v10h-2V7h2z" />
            </svg>
            Centro V
          </button>

          <button
            className="toolbar-btn"
            onClick={() => handleAlign(alignBottom, 'abajo')}
            disabled={!canAlign}
            title="Alinear abajo (Ctrl+Shift+↓)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 19h18v2H3v-2zm4-4v-12H5v12h2zm6 0v-8h-2v8h2zm6 0v-4h-2v4h2z" />
            </svg>
            Abajo
          </button>
        </div>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <span className="section-title">Distribuir</span>
        <div className="toolbar-buttons">
          <button
            className="toolbar-btn"
            onClick={() => handleDistribute(distributeHorizontal, 'horizontal')}
            disabled={!canDistribute}
            title="Distribuir horizontalmente"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 12h2v-2H2v2zm4-4h12v4H6V8zm0 6h12v4H6v-4zm14-6h2v4h-2V8zm0 6h2v-2h-2v2z" />
            </svg>
            Horizontal
          </button>

          <button
            className="toolbar-btn"
            onClick={() => handleDistribute(distributeVertical, 'vertical')}
            disabled={!canDistribute}
            title="Distribuir verticalmente"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2v2h-2V2h2zm-4 4v12H6V6h2zm6 0v8h-2V6h2zm6 0v4h-2V6h2z" />
            </svg>
            Vertical
          </button>

          <button
            className="toolbar-btn"
            onClick={() => handleDistribute(distributeGrid, 'grid')}
            disabled={!canDistribute}
            title="Distribuir en grid"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7z" />
            </svg>
            Grid
          </button>
        </div>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <span className="section-title">Info</span>
        <div className="selection-info">
          <span className="info-item">
            {selectedCount} nodos seleccionados
          </span>
          {boundingBox && (
            <span className="info-item">
              {Math.round(boundingBox.width)} × {Math.round(boundingBox.height)} px
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
