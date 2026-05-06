/**
 * components/FlowParticles.jsx - Sistema de Partículas para Flujo de Corriente
 * Componente canvas que anima partículas siguiendo los flujos de corriente
 */

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { useFlowAnimation, useParticleAnimation } from './SimulationEngine.jsx';
import { useGraphStore } from '../store/graphStore.js';

// === UTILIDADES ===
const getFlowColor = (status) => {
  const colors = {
    inactive: '#94a3b8',
    low: '#22c55e',
    medium: '#eab308',
    high: '#f97316',
    critical: '#ef4444'
  };
  return colors[status] || '#94a3b8';
};

export const FlowParticles = ({ edgeId, width = 100, height = 20 }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const particlesRef = useRef([]);

  const { flow, isVisible, animationSpeed } = useFlowAnimation(edgeId);
  const { particles } = useParticleAnimation(edgeId);
  const { nodes, edges } = useGraphStore();

  // Get edge positions for particle path
  const edgePath = useMemo(() => {
    const edge = edges.find(e => e.id === edgeId);
    if (!edge) return null;

    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);

    if (!sourceNode?.position || !targetNode?.position) return null;

    return {
      start: sourceNode.position,
      end: targetNode.position
    };
  }, [edgeId, nodes, edges]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = width * 2; // HiDPI support
    canvas.height = height * 2;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(2, 2);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [width, height]);

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isVisible || !edgePath) return;

    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw particles
    particles.forEach(particle => {
      const progress = particle.position;
      const x = edgePath.start.x + (edgePath.end.x - edgePath.start.x) * progress;
      const y = edgePath.start.y + (edgePath.end.y - edgePath.start.y) * progress;

      // Particle glow effect
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, particle.size * 2);
      gradient.addColorStop(0, particle.color);
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.globalAlpha = particle.opacity * 0.8;
      ctx.beginPath();
      ctx.arc(x, y, particle.size * 2, 0, Math.PI * 2);
      ctx.fill();

      // Core particle
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = particle.opacity;
      ctx.beginPath();
      ctx.arc(x, y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalAlpha = 1;

    animationRef.current = requestAnimationFrame(animate);
  }, [particles, isVisible, edgePath, width, height]);

  useEffect(() => {
    if (isVisible) {
      animate();
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate, isVisible]);

  if (!isVisible) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width, height }}
    />
  );
};

// === PARTICLE SYSTEM PARA REACT FLOW ===
export const ReactFlowParticles = ({ edgeId }) => {
  const { flow, isVisible, animationSpeed } = useFlowAnimation(edgeId);
  const { particles } = useParticleAnimation(edgeId);
  const { nodes, edges } = useGraphStore();

  // Calculate particle positions for React Flow
  const particleElements = useMemo(() => {
    if (!isVisible || particles.length === 0) return [];

    const edge = edges.find(e => e.id === edgeId);
    if (!edge) return [];

    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);

    if (!sourceNode?.position || !targetNode?.position) return [];

    return particles.map(particle => {
      const progress = particle.position;
      const x = sourceNode.position.x + (targetNode.position.x - sourceNode.position.x) * progress;
      const y = sourceNode.position.y + (targetNode.position.y - sourceNode.position.y) * progress;

      return {
        id: particle.id,
        x,
        y,
        size: particle.size,
        color: particle.color,
        opacity: particle.opacity,
        style: {
          position: 'absolute',
          width: particle.size * 2,
          height: particle.size * 2,
          backgroundColor: particle.color,
          borderRadius: '50%',
          opacity: particle.opacity,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
          animation: `particleFloat ${2 / animationSpeed}s ease-in-out infinite`
        }
      };
    });
  }, [particles, isVisible, edgeId, nodes, edges, animationSpeed]);

  if (!isVisible) return null;

  return (
    <>
      {particleElements.map(particle => (
        <div
          key={particle.id}
          style={particle.style}
        />
      ))}
    </>
  );
};

// === PARTICLE MARKER PARA EDGE DE REACT FLOW ===
export const FlowParticleMarker = ({ edgeId }) => {
  const { flow, isVisible } = useFlowAnimation(edgeId);
  const { particles } = useParticleAnimation(edgeId);

  if (!isVisible || particles.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        width: 8,
        height: 8,
        backgroundColor: flow ? getFlowColor(flow.status) : '#94a3b8',
        borderRadius: '50%',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        boxShadow: `0 0 10px ${flow ? getFlowColor(flow.status) : '#94a3b8'}`,
        animation: 'pulse 2s infinite',
        pointerEvents: 'none'
      }}
    />
  );
};

// === PANEL DE CONTROL DE PARTÍCULAS ===
export const ParticleControlPanel = () => {
  const {
    showParticles,
    animationSpeed,
    toggleParticles,
    setAnimationSpeed,
    particles
  } = useGraphStore(state => ({
    showParticles: state.ui.showParticles,
    animationSpeed: state.ui.animationSpeed,
    toggleParticles: state.toggleParticles,
    setAnimationSpeed: state.setAnimationSpeed,
    particles: state.simulation.particles
  }));

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Control de Partículas</h3>

      {/* Toggle particles */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-700">Mostrar Partículas</span>
        <button
          onClick={toggleParticles}
          className={`
            px-3 py-1 rounded text-sm font-medium transition-colors
            ${showParticles
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }
          `}
        >
          {showParticles ? 'Activadas' : 'Desactivadas'}
        </button>
      </div>

      {/* Animation speed */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Velocidad de Animación: {animationSpeed.toFixed(1)}x
        </label>
        <input
          type="range"
          min="0.1"
          max="3"
          step="0.1"
          value={animationSpeed}
          onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0.1x</span>
          <span>1.0x</span>
          <span>3.0x</span>
        </div>
      </div>

      {/* Particle statistics */}
      <div className="bg-gray-50 rounded p-3">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Estadísticas</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Partículas activas:</span>
            <span className="font-medium">{particles.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Estado:</span>
            <span className={`font-medium ${showParticles ? 'text-green-600' : 'text-gray-500'}`}>
              {showParticles ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>
      </div>

      {/* Particle color legend */}
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Leyenda de Colores</h4>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-400" />
            <span className="text-xs text-gray-600">Inactivo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-gray-600">Bajo flujo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-xs text-gray-600">Flujo medio</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-xs text-gray-600">Flujo alto</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-gray-600">Flujo crítico</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// === PARTICLE CANVAS OVERLAY ===
export const ParticleCanvasOverlay = () => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  const {
    showParticles,
    nodes,
    edges,
    simulation
  } = useGraphStore();

  // Animation loop for full canvas overlay
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !showParticles) return;

    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all particles
    simulation.particles.forEach(particle => {
      const edge = edges.find(e => e.id === particle.edgeId);
      if (!edge) return;

      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);

      if (!sourceNode?.position || !targetNode?.position) return;

      const progress = particle.position;
      const x = sourceNode.position.x + (targetNode.position.x - sourceNode.position.x) * progress;
      const y = sourceNode.position.y + (targetNode.position.y - sourceNode.position.y) * progress;

      // Draw particle with glow
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, particle.size * 3);
      gradient.addColorStop(0, particle.color);
      gradient.addColorStop(0.5, particle.color + '40');
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, particle.size * 3, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(x, y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    });

    animationRef.current = requestAnimationFrame(animate);
  }, [showParticles, simulation.particles, nodes, edges]);

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (showParticles) {
      animate();
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate, showParticles]);

  if (!showParticles) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-10"
      style={{ width: '100%', height: '100%' }}
    />
  );
};

// Add CSS animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes particleFloat {
      0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
      50% { transform: translate(-50%, -50%) translateY(-2px); }
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
  `;
  document.head.appendChild(style);
}

export default FlowParticles;
