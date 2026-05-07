/**
 * components/SnapGuides.jsx - Guías de Alineación Visuales
 * Líneas guía que aparecen al arrastrar nodos (tipo AutoCAD)
 */

import React from 'react';
import PropTypes from 'prop-types';
import './SnapGuides.css';

export default function SnapGuides({ guides, visible }) {
  if (!visible || !guides) return null;

  const { vertical = [], horizontal = [] } = guides;

  return (
    <div className="snap-guides">
      {/* Líneas verticales */}
      {vertical.map((guide, index) => (
        <div
          key={`v-${index}`}
          className="snap-guide vertical"
          style={{
            left: `${guide.x}px`,
            top: 0,
            height: '100%'
          }}
        >
          <span className="guide-label">{guide.type}</span>
        </div>
      ))}

      {/* Líneas horizontales */}
      {horizontal.map((guide, index) => (
        <div
          key={`h-${index}`}
          className="snap-guide horizontal"
          style={{
            top: `${guide.y}px`,
            left: 0,
            width: '100%'
          }}
        >
          <span className="guide-label">{guide.type}</span>
        </div>
      ))}
    </div>
  );
}

SnapGuides.propTypes = {
  guides: PropTypes.shape({
    vertical: PropTypes.array,
    horizontal: PropTypes.array
  }),
  visible: PropTypes.bool
};
