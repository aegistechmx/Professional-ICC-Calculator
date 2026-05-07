/**
 * components/particles/ParticleCanvas.jsx - Componente React para renderizar canvas de partículas
 * Integra el sistema de partículas con React Flow
 */

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
  useFaultParticleAnimation({
    graph,
    onNodeUpdate,
    onEdgeUpdate,
    enabled,
    options,
    style
  });
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
