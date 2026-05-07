/**
 * components/CoordinationPanel.jsx - Panel de Coordinación de Protecciones
 * Sistema de visualización y control de coordinación tipo ETAP/SKM
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useGraphStore } from '../store/graphStore.js';
import {
  ProtectionSystem,
  analyzeCoordinationQuality,
  updateVisuals
} from '../utils/coordinationEngine.js';
import { soundSystem } from '../utils/visualEffects.js';

export const CoordinationPanel = () => {
  const [protectionSystem, setProtectionSystem] = useState(null);
  const [coordinationResults, setCoordinationResults] = useState(null);
  const [showDetails, setShowDetails] = useState(true);
  const [selectedBreaker, setSelectedBreaker] = useState(null);

  const {
    nodes,
    edges,
    results,
    simulation,
    triggerFault,
    clearFault
  } = useGraphStore();

  // === INICIALIZACIÓN DEL SISTEMA DE PROTECCIÓN ===
  useEffect(() => {
    const system = new ProtectionSystem();

    // Registrar breakers existentes
    nodes.filter(n => n.type === 'breaker').forEach(breaker => {
      system.registerBreaker(breaker.id, {
        pickup: breaker.data?.pickup || 1000,
        TMS: breaker.data?.TMS || 0.5,
        curve: breaker.data?.curve || 'IEC',
        instPickup: breaker.data?.instPickup || 8000,
        instDelay: breaker.data?.instDelay || 0.02,
        delayUpstream: breaker.data?.delayUpstream || 0.3
      });
    });

    setProtectionSystem(system);
  }, [nodes]);

  // === EJECUTAR COORDINACIÓN CUANDO HAY FALLA ===
  useEffect(() => {
    if (simulation.fault && protectionSystem) {
      // Preparar grafo para coordinación
      const graph = {
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
            breaker: protectionSystem.getBreakerState(edge.data?.breaker ||
              nodes.find(n => n.type === 'breaker' &&
                (n.id === edge.source || n.id === edge.target))?.id),
            current: results?.flujos?.find(f =>
              (f.from === edge.source && f.to === edge.target) ||
              (f.source === edge.source && f.target === edge.target)
            )?.I || 0,
            x1: sourceNode?.position?.x || 0,
            y1: sourceNode?.position?.y || 0,
            x2: targetNode?.position?.x || 100,
            y2: targetNode?.position?.y || 100
          };
        })
      };

      // Ejecutar sistema de protección
      const results = protectionSystem.runProtectionSystem(graph, {
        node: simulation.fault
      });

      // Actualizar visuals
      updateVisuals(graph, results);

      // Sonido de disparo
      if (results.primary) {
        soundSystem.playTripSound();
      }

      setCoordinationResults(results);
    } else {
      // Resetear cuando no hay falla
      if (protectionSystem) {
        protectionSystem.reset();
        setCoordinationResults(null);
      }
    }
  }, [simulation.fault, nodes, edges, results, protectionSystem]);

  // === CONTROL DE FALLA ===
  const handleFaultTrigger = useCallback((nodeId) => {
    triggerFault(nodeId);
  }, [triggerFault]);

  const loadNodes = nodes.filter(node => node.type === 'load');

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Coordinación de Protecciones</h3>

      {/* Estado del Sistema */}
      <div className="mb-4 p-3 bg-gray-50 rounded">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Estado:</span>
          <span className={`text-sm font-bold ${coordinationResults ? 'text-red-600' : 'text-green-600'
            }`}>
            {coordinationResults ? 'Coordinación Activa' : 'Normal'}
          </span>
        </div>

        {coordinationResults && (
          <div className="text-xs text-gray-600">
            Breakers: {coordinationResults.summary.totalBreakers} |
            Disparados: {coordinationResults.summary.tripped} |
            Bloqueados: {coordinationResults.summary.blocked}
          </div>
        )}
      </div>

      {/* Resultados de Coordinación */}
      {coordinationResults && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Resultados de Coordinación</h4>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {coordinationResults.results.map((result) => (
              <div
                key={result.breaker.id}
                className={`p-2 rounded border ${result.breaker.tripped ? 'bg-red-50 border-red-200' :
                  result.breaker.blocked ? 'bg-orange-50 border-orange-200' :
                    result.breaker.instBlocked ? 'bg-yellow-50 border-yellow-200' :
                      'bg-green-50 border-green-200'
                  }`}
                onClick={() => setSelectedBreaker(result)}
                style={{ cursor: 'pointer' }}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${result.breaker.tripped ? 'text-red-700' :
                    result.breaker.blocked ? 'text-orange-700' :
                      result.breaker.instBlocked ? 'text-yellow-700' :
                        'text-green-700'
                    }`}>
                    {result.breaker.id}
                  </span>
                  <span className="text-xs text-gray-500">
                    {result.tripTime.toFixed(3)}s
                  </span>
                </div>

                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>Icc: {result.Icc.toFixed(0)}A</span>
                  <span>Nivel: {result.path}</span>
                </div>

                {showDetails && (
                  <div className="text-xs text-gray-500 mt-1">
                    <div>Curva: {result.breaker.curve}</div>
                    <div>Pickup: {result.breaker.pickup}A</div>
                    <div>TMS: {result.breaker.TMS}</div>
                    {result.breaker.blocked && (
                      <div className="text-orange-600">
                        Bloqueado: {result.breaker.blockReason}
                      </div>
                    )}
                    {result.breaker.instBlocked && (
                      <div className="text-yellow-600">
                        Bloqueo instantáneo: {result.breaker.instBlockReason}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calidad de Coordinación */}
      {coordinationResults && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Calidad de Coordinación</h4>

          {(() => {
            const quality = analyzeCoordinationQuality(coordinationResults);

            return (
              <div className="p-3 bg-gray-50 rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Score:</span>
                  <span className={`text-lg font-bold ${quality.grade === 'A' ? 'text-green-600' :
                    quality.grade === 'B' ? 'text-blue-600' :
                      quality.grade === 'C' ? 'text-yellow-600' :
                        quality.grade === 'D' ? 'text-orange-600' : 'text-red-600'
                    }`}>
                    {quality.score}/100 ({quality.grade})
                  </span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${quality.grade === 'A' ? 'bg-green-500' :
                      quality.grade === 'B' ? 'bg-blue-500' :
                        quality.grade === 'C' ? 'bg-yellow-500' :
                          quality.grade === 'D' ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                    style={{ width: `${quality.score}%` }}
                  />
                </div>

                <div className="text-xs text-gray-600">
                  <div>Issues: {quality.issues}</div>
                  <div>Selectividad: {quality.selectivity}</div>
                  <div>Bloqueados: {(quality.blockedRatio * 100).toFixed(1)}%</div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Issues de Coordinación */}
      {coordinationResults?.issues && coordinationResults.issues.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Issues de Coordinación</h4>

          <div className="space-y-2">
            {coordinationResults.issues.map((issue, index) => (
              <div
                key={index}
                className={`p-2 rounded border ${issue.severity === 'critical' ? 'bg-red-50 border-red-200' :
                  'bg-yellow-50 border-yellow-200'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${issue.severity === 'critical' ? 'text-red-700' : 'text-yellow-700'
                    }`}>
                    {issue.type === 'coordination_violation' ? 'Violación de Coordinación' : issue.type}
                  </span>
                  <span className="text-xs text-gray-500">
                    {issue.severity === 'critical' ? 'Crítico' : 'Advertencia'}
                  </span>
                </div>

                <div className="text-xs text-gray-600 mt-1">
                  <div>Upstream: {issue.upstream}</div>
                  <div>Downstream: {issue.downstream}</div>
                  <div>Margen: {issue.margin.toFixed(3)}s (min: {issue.minMargin}s)</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controles */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Trigger de Falla:</label>
          <div className="grid grid-cols-2 gap-2">
            {loadNodes.slice(0, 6).map(node => (
              <button
                key={node.id}
                onClick={() => handleFaultTrigger(node.id)}
                disabled={simulation.fault === node.id}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${simulation.fault === node.id
                  ? 'bg-red-500 text-white cursor-not-allowed'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
              >
                {node.data?.label || node.id}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={clearFault}
            disabled={!simulation.fault}
            className={`flex-1 px-3 py-2 rounded font-medium transition-colors ${!simulation.fault
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
          >
            Limpiar Falla
          </button>

          <button
            onClick={() => {
              if (protectionSystem) {
                protectionSystem.reset();
                setCoordinationResults(null);
              }
            }}
            className="flex-1 px-3 py-2 bg-gray-500 text-white rounded font-medium hover:bg-gray-600"
          >
            Reset Coordinación
          </button>
        </div>
      </div>

      {/* Detalles del Breaker Seleccionado */}
      {selectedBreaker && showDetails && (
        <div className="mt-4 p-3 bg-gray-50 rounded">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Detalles: {selectedBreaker.breaker.id}
          </h4>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray-500">Corriente:</span>
              <span className="ml-2 font-medium">
                {selectedBreaker.Icc.toFixed(1)}A
              </span>
            </div>
            <div>
              <span className="text-gray-500">Tiempo:</span>
              <span className="ml-2 font-medium">
                {selectedBreaker.tripTime.toFixed(3)}s
              </span>
            </div>
            <div>
              <span className="text-gray-500">Pickup:</span>
              <span className="ml-2 font-medium">
                {selectedBreaker.breaker.pickup}A
              </span>
            </div>
            <div>
              <span className="text-gray-500">TMS:</span>
              <span className="ml-2 font-medium">
                {selectedBreaker.breaker.TMS}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Curva:</span>
              <span className="ml-2 font-medium">
                {selectedBreaker.breaker.curve}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Estado:</span>
              <span className={`ml-2 font-medium ${selectedBreaker.breaker.tripped ? 'text-red-600' :
                selectedBreaker.breaker.blocked ? 'text-orange-600' :
                  selectedBreaker.breaker.instBlocked ? 'text-yellow-600' :
                    'text-green-600'
                }`}>
                {selectedBreaker.breaker.tripped ? 'Disparado' :
                  selectedBreaker.breaker.blocked ? 'Bloqueado' :
                    selectedBreaker.breaker.instBlocked ? 'Bloq. Instantáneo' :
                      'Normal'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Detalles */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Mostrar Detalles:</span>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${showDetails
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
        >
          {showDetails ? 'Activos' : 'Inactivos'}
        </button>
      </div>
    </div>
  );
};

export default CoordinationPanel;
