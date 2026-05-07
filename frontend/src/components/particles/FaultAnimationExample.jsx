/**
 * components/particles/FaultAnimationExample.jsx
 * Ejemplo completo de implementación del sistema de partículas
 * Muestra cómo integrar el sistema con React Flow existente
 */

import React, { useState, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';
import ParticleCanvas from './ParticleCanvas.jsx';
import useFaultParticleAnimation from '../../hooks/useFaultParticleAnimation.js';

const FaultAnimationExample = ({ initialNodes = [], initialEdges = [] }) => {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isParticleMode, setIsParticleMode] = useState(true);
  const [animationStats, setAnimationStats] = useState(null);

  const reactFlowWrapper = useRef(null);
  const { particleEngine, startFaultParticleAnimation, stopParticleAnimation, getParticleStats } =
    useFaultParticleAnimation({ nodes, edges }, handleNodeUpdate, handleEdgeUpdate);

  /**
   * Manejar actualización de nodos (para React Flow)
   */
  const handleNodeUpdate = useCallback((nodeId, updates) => {
    setNodes(prevNodes =>
      prevNodes.map(node =>
        node.id === nodeId ? { ...node, ...updates } : node
      )
    );
  }, []);

  /**
   * Manejar actualización de edges (para React Flow)
   */
  const handleEdgeUpdate = useCallback((edgeId, updates) => {
    setEdges(prevEdges =>
      prevEdges.map(edge =>
        edge.id === edgeId ? { ...edge, ...updates } : edge
      )
    );
  }, []);

  /**
   * Simular corriente de cortocircuito
   */
  const simulateFaultCurrent = (node) => {
    const baseCurrent = {
      'motor': 8000,
      'transformer': 12000,
      'bus': 15000,
      'load': 3000,
      'generator': 20000
    };

    return baseCurrent[node.type] || 5000 + Math.random() * 10000;
  };

  /**
   * Manejar clic en nodo para iniciar falla
   */
  const onNodeClick = useCallback((event, node) => {
    triggerFaultAnimation(node);
  }, [triggerFaultAnimation]);

  const triggerFaultAnimation = useCallback((node) => {
    if (node.type === 'breaker') return; // No iniciar falla en breakers

    setSelectedNode(node);

    // Simular corriente de falla basada en tipo de nodo
    const Icc = simulateFaultCurrent(node);

    if (isParticleMode) {
      startFaultParticleAnimation(node.id, Icc);
    } else {
      // Implementación simplificada del sistema original
      const upstreamPath = getUpstreamPath({ nodes, edges }, node.id);

      upstreamPath.forEach((edge, index) => {
        setTimeout(() => {
          handleEdgeUpdate(edge.id, {
            style: {
              stroke: '#ef4444',
              strokeWidth: Math.min(5, Math.log10(Icc) * 0.5),
              animation: 'pulse 0.5s ease-in-out infinite'
            }
          });
        }, index * 100);
      });
    }
  }, [isParticleMode, startFaultParticleAnimation, nodes, edges, handleEdgeUpdate]);


  /**
   * Detener todas las animaciones
   */
  const stopAllAnimations = useCallback(() => {
    stopParticleAnimation();

    // Limpiar animaciones originales
    edges.forEach(edge => {
      handleEdgeUpdate(edge.id, {
        style: {},
        animated: false
      });
    });

    nodes.forEach(node => {
      handleNodeUpdate(node.id, {
        style: {},
        data: { ...node.data, status: null, Icc: null, tripTime: null }
      });
    });
  }, [stopParticleAnimation, edges, nodes, handleEdgeUpdate, handleNodeUpdate]);

  /**
   * Actualizar estadísticas de animación
   */
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (particleEngine) {
        const stats = getParticleStats();
        setAnimationStats(stats);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [particleEngine, getParticleStats]);

  /**
   * Ejemplo de datos de grafo
   */
  const exampleNodes = [
    {
      id: 'source',
      type: 'input',
      data: { label: 'Fuente', rating: 1000 },
      position: { x: 100, y: 200 }
    },
    {
      id: 'breaker1',
      type: 'breaker',
      data: { label: 'Breaker 1', rating: 100, pickup: 80 },
      position: { x: 300, y: 200 }
    },
    {
      id: 'bus1',
      type: 'bus',
      data: { label: 'Bus Bar' },
      position: { x: 500, y: 200 }
    },
    {
      id: 'motor1',
      type: 'motor',
      data: { label: 'Motor 1', power: 500 },
      position: { x: 700, y: 100 }
    },
    {
      id: 'motor2',
      type: 'motor',
      data: { label: 'Motor 2', power: 750 },
      position: { x: 700, y: 300 }
    }
  ];

  const exampleEdges = [
    { id: 'e1', source: 'source', target: 'breaker1' },
    { id: 'e2', source: 'breaker1', target: 'bus1' },
    { id: 'e3', source: 'bus1', target: 'motor1' },
    { id: 'e4', source: 'bus1', target: 'motor2' }
  ];

  const displayNodes = nodes.length > 0 ? nodes : exampleNodes;
  const displayEdges = edges.length > 0 ? edges : exampleEdges;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Canvas de partículas */}
      {isParticleMode && (
        <ParticleCanvas
          graph={{ nodes: displayNodes, edges: displayEdges }}
          onNodeUpdate={handleNodeUpdate}
          onEdgeUpdate={handleEdgeUpdate}
          enabled={isParticleMode}
          options={{
            particleSystem: {
              maxParticles: 500,
              trailLength: 8,
              turbulence: 1.0
            },
            renderer: {
              enableGlow: true,
              enableTrails: true,
              glowIntensity: 15,
              debug: false
            }
          }}
        />
      )}

      {/* React Flow */}
      <div style={{ width: '100%', height: '100%' }} ref={reactFlowWrapper}>
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          onNodeClick={onNodeClick}
          fitView
          attributionPosition="bottom-left"
        >
          <Background color="#aaa" gap={16} />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      {/* Panel de control */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          zIndex: 1000,
          minWidth: '250px'
        }}
      >
        <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>
          Sistema de Animación de Fallas
        </h3>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              checked={isParticleMode}
              onChange={() => setIsParticleMode(true)}
              style={{ marginRight: '8px' }}
            />
            <span>Modo Partículas (Nuevo)</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginTop: '5px' }}>
            <input
              type="radio"
              checked={!isParticleMode}
              onChange={() => setIsParticleMode(false)}
              style={{ marginRight: '8px' }}
            />
            <span>Modo Tradicional</span>
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <button
            onClick={stopAllAnimations}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '5px',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            Detener Animaciones
          </button>
        </div>

        {selectedNode && (
          <div style={{ marginBottom: '15px', fontSize: '14px' }}>
            <strong>Nodo seleccionado:</strong> {selectedNode.data?.label}
            <br />
            <strong>Tipo:</strong> {selectedNode.type}
          </div>
        )}

        {animationStats && isParticleMode && (
          <div style={{ fontSize: '12px', color: '#666' }}>
            <strong>Estadísticas de Partículas:</strong>
            <div>Partículas: {animationStats.totalParticles}</div>
            <div>Fallas activas: {animationStats.activeFaults}</div>
            <div>Estado: {animationStats.isRunning ? 'Activo' : 'Inactivo'}</div>
          </div>
        )}
      </div>

      {/* Instrucciones */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '15px',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          zIndex: 1000,
          maxWidth: '300px'
        }}
      >
        <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Instrucciones</h4>
        <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
          Haz clic en cualquier nodo (excepto breakers) para iniciar una animación de falla.
          Las partículas fluyen desde la falla hacia la fuente, simulando la corriente de cortocircuito.
        </p>
      </div>
    </div>
  );
};

// Función auxiliar para obtener ruta aguas arriba
function getUpstreamPath(graph, startNodeId) {
  const path = [];
  let current = startNodeId;
  const visited = new Set();

  let edge = graph.edges?.find(e => e.target === current);
  while (edge && !visited.has(edge.source) && path.length <= 50) {
    visited.add(edge.source);

    path.push(edge);
    current = edge.source;

    edge = graph.edges?.find(e => e.target === current);
  }

  return path;
}

FaultAnimationExample.propTypes = {
  initialNodes: PropTypes.array,
  initialEdges: PropTypes.array
};

export default FaultAnimationExample;
