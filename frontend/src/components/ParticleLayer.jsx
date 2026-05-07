/**
 * components/ParticleLayer.jsx - Capa de Partículas con Glow Dinámico
 * Componente principal que integra el motor de partículas con glow ICC-based
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useParticleEngine } from '../hooks/useParticleEngine.js';
import { useGraphStore } from '../store/graphStore.js';

export const ParticleLayer = ({ width = 1200, height = 800 }) => {
  const { graph, results, ui } = useGraphStore();

  const getEdgePath = (edge) => {
    const sourceNode = graph.nodes.find(n => n.id === edge.source);
    const targetNode = graph.nodes.find(n => n.id === edge.target);

    if (!sourceNode?.position || !targetNode?.position) {
      return [{ x: 0, y: 0 }, { x: 100, y: 100 }];
    }

    // Si hay puntos de control (routing), usarlos
    if (edge.points && edge.points.length > 0) {
      return [
        sourceNode.position,
        ...edge.points,
        targetNode.position
      ];
    }

    // Línea recta por defecto
    return [
      sourceNode.position,
      targetNode.position
    ];
  };

  const canvasRef = useParticleEngine({
    graph: graph,
    results: results,
    getEdgePath: getEdgePath,
    options: {
      maxParticlesPerEdge: 20,
      speedFactor: 0.002,
      baseSize: 2,
      minCurrentForParticles: 10,
      enableGlow: true,
      enableDirection: true,
      zoomScale: 1,
      panOffset: { x: 0, y: 0 }
    }
  });

  if (!ui.showParticles || !graph?.edges?.length) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 10
      }}
    />
  );
};

ParticleLayer.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number
};

export default ParticleLayer;
