/**
 * components/particles/ParticleCanvas.jsx - Componente React para renderizar canvas de partículas
 * Integra el sistema de partículas con React Flow
 */

import React from 'react';
import PropTypes from 'prop-types';
import useFaultParticleAnimation from '../../hooks/useFaultParticleAnimation.js';

const ParticleCanvas = ({
  graph,
  onNodeUpdate,
  onEdgeUpdate,
  enabled = true,
  options = {},
  style = {}
}) => {
  const {
    canvasRef,
    particleEngine,
    isAnimating,
    startFaultParticleAnimation,
    stopParticleAnimation,
    getParticleStats
  } = useFaultParticleAnimation(graph, onNodeUpdate, onEdgeUpdate);
};

ParticleCanvas.propTypes = {
  graph: PropTypes.object.isRequired,
  onNodeUpdate: PropTypes.func,
  onEdgeUpdate: PropTypes.func,
  enabled: PropTypes.bool,
  options: PropTypes.object,
  style: PropTypes.object
};

export default ParticleCanvas;
