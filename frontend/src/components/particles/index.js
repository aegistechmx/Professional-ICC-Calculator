/**
 * components/particles/index.js
 * Export principal del sistema de partículas
 * Punto de entrada unificado para todos los componentes
 */

// Core classes
export { Particle } from './Particle.js';
export { ParticleSystem } from './ParticleSystem.js';
export { ParticleRenderer } from './ParticleRenderer.js';
export { FaultParticleEngine } from './FaultParticleEngine.js';

// Utilities
export { edgeToPath, getUpstreamPath, edgesToParticlePaths, isUpstreamOfBreaker } from './PathUtils.js';

// Effects
export { ProEffects } from './ProEffects.js';
export { BreakerEffects } from './BreakerEffects.js';

// React components
export { default as ParticleCanvas } from './ParticleCanvas.jsx';
export { default as FaultAnimationExample } from './FaultAnimationExample.jsx';

// React hook
export { default as useFaultParticleAnimation } from '../../hooks/useFaultParticleAnimation.js';

// Import for default export
import { Particle } from './Particle.js';
import { ParticleSystem } from './ParticleSystem.js';
import { ParticleRenderer } from './ParticleRenderer.js';
import { FaultParticleEngine } from './FaultParticleEngine.js';
import { edgeToPath, getUpstreamPath, edgesToParticlePaths, isUpstreamOfBreaker } from './PathUtils.js';
import { ProEffects } from './ProEffects.js';
import { BreakerEffects } from './BreakerEffects.js';
import ParticleCanvas from './ParticleCanvas.jsx';
import FaultAnimationExample from './FaultAnimationExample.jsx';
import useFaultParticleAnimation from '../../hooks/useFaultParticleAnimation.js';

// Default export for easy importing
export default {
  // Core
  Particle,
  ParticleSystem,
  ParticleRenderer,
  FaultParticleEngine,

  // Utilities
  edgeToPath,
  getUpstreamPath,
  edgesToParticlePaths,
  isUpstreamOfBreaker,

  // Effects
  ProEffects,
  BreakerEffects,

  // React
  ParticleCanvas,
  FaultAnimationExample,
  useFaultParticleAnimation
};
