/**
 * components/FaultPropagationLayer.jsx - Capa de Propagación de Fallas en Tiempo Real
 * Componente que visualiza ondas de falla viajando por el sistema eléctrico
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { useGraphStore } from '../store/graphStore.js';
import { 
  createFaultSimulationLoop, 
  FaultWave, 
  spawnFaultParticles,
  spawnExplosionParticles 
} from '../utils/faultPropagation.js';

export const FaultPropagationLayer = ({ width = 1200, height = 800 }) => {
  const canvasRef = useRef(null);
  const simulationRef = useRef(null);
  
  const { 
    nodes, 
    edges, 
    results, 
    simulation,
    triggerFault,
    clearFault,
    tripBreaker
  } = useGraphStore();

  // === INICIALIZAR SIMULACIÓN ===
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = width;
    canvas.height = height;

    // Preparar datos del grafo para el motor de propagación
    const graphData = {
      nodes: nodes.map(node => ({
        ...node,
        x: node.position?.x || 0,
        y: node.position?.y || 0
      })),
      edges: edges.map(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        
        return {
          ...edge,
          x1: sourceNode?.position?.x || 0,
          y1: sourceNode?.position?.y || 0,
          x2: targetNode?.position?.x || 100,
          y2: targetNode?.position?.y || 100,
          current: results?.flujos?.find(f => 
            (f.from === edge.source && f.to === edge.target) ||
            (f.source === edge.source && f.target === edge.target)
          )?.I || 0,
          breakerId: edge.data?.breaker || nodes.find(n => 
            n.type === 'breaker' && 
            (n.id === edge.source || n.id === edge.target)
          )?.id,
          breakerTrip: nodes.find(n => 
            n.type === 'breaker' && 
            (n.id === edge.source || n.id === edge.target)
          )?.data?.pickup || 1000
        };
      })
    };

    // Crear loop de simulación
    simulationRef.current = createFaultSimulationLoop(
      canvas, 
      graphData, 
      results, 
      simulation
    );

    // Iniciar loop
    simulationRef.current.start();

    return () => {
      if (simulationRef.current) {
        // Cleanup
      }
    };
  }, [nodes, edges, results, width, height]);

  // === CONTROL DE FALLAS ===
  useEffect(() => {
    if (simulation.fault && simulationRef.current) {
      // Trigger nueva falla
      simulationRef.current.triggerFault(simulation.fault, {
        speed: 0.003,
        maxPropagation: 8,
        intensity: 1.2
      });
    } else if (!simulation.fault && simulationRef.current) {
      // Limpiar falla
      simulationRef.current.clearFault();
    }
  }, [simulation.fault]);

  // === MANEJO DE BREAKER TRIPS ===
  useEffect(() => {
    simulation.breakerTrips.forEach(breakerId => {
      const breaker = nodes.find(n => n.id === breakerId);
      if (breaker?.position && simulationRef.current) {
        // Efecto de explosión en posición del breaker
        spawnExplosionParticles([], breaker.position, {
          count: 15,
          color: '#ff3b30'
        });
      }
    });
  }, [simulation.breakerTrips]);

  // === MANEJO DE FALLA MANUAL ===
  const handleFaultTrigger = useCallback((nodeId) => {
    triggerFault(nodeId);
    
    // Simular trips de breakers afectados
    const affectedBreakers = nodes
      .filter(node => node.type === 'breaker')
      .filter(breaker => isUpstreamBreaker(breaker.id, nodeId));

    affectedBreakers.forEach((breaker, index) => {
      const delay = index * 0.1; // Trip secuencial
      tripBreaker(breaker.id, delay);
    });
  }, [nodes, triggerFault, tripBreaker]);

  const isUpstreamBreaker = (breakerId, nodeId) => {
    // Lógica simplificada para determinar si un breaker está upstream
    const visited = new Set();
    const queue = [nodeId];

    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);

      const upstreamEdges = edges.filter(edge => edge.target === current);
      for (const edge of upstreamEdges) {
        if (edge.source === breakerId) return true;
        queue.push(edge.source);
      }
    }

    return false;
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          zIndex: 15
        }}
      />
      
      {/* Panel de control de fallas */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md p-4 border border-gray-200 z-20">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Control de Fallas</h3>
        
        <div className="space-y-3">
          {/* Estado actual */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Estado:</span>
            <span className={`text-sm font-medium ${
              simulation.fault ? 'text-red-600' : 'text-green-600'
            }`}>
              {simulation.fault ? 'Falla Activa' : 'Normal'}
            </span>
          </div>
          
          {/* Nodos de carga para trigger */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trigger de Falla:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {nodes
                .filter(node => node.type === 'load')
                .slice(0, 6)
                .map(node => (
                  <button
                    key={node.id}
                    onClick={() => handleFaultTrigger(node.id)}
                    disabled={simulation.fault === node.id}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      simulation.fault === node.id 
                        ? 'bg-red-500 text-white cursor-not-allowed' 
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    {node.data?.label || node.id}
                  </button>
                ))}
            </div>
          </div>
          
          {/* Acciones */}
          <div className="space-y-2">
            <button
              onClick={clearFault}
              disabled={!simulation.fault}
              className={`w-full px-3 py-2 rounded font-medium transition-colors ${
                !simulation.fault 
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              Limpiar Falla
            </button>
            
            <button
              onClick={() => {
                if (simulationRef.current) {
                  simulationRef.current.clearFault();
                }
                // Reset todos los breakers
                nodes.filter(n => n.type === 'breaker').forEach(breaker => {
                  // Reset breaker en store
                });
              }}
              className="w-full px-3 py-2 bg-gray-500 text-white rounded font-medium hover:bg-gray-600"
            >
              Reset Sistema
            </button>
          </div>
          
          {/* Estadísticas */}
          <div className="bg-gray-50 rounded p-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Estadísticas</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Nodos totales:</span>
                <span className="font-medium">{nodes.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Breakers:</span>
                <span className="font-medium">{nodes.filter(n => n.type === 'breaker').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Conexiones:</span>
                <span className="font-medium">{edges.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Breakers tripados:</span>
                <span className="font-medium">{simulation.breakerTrips.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaultPropagationLayer;
