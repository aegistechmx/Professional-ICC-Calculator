/**
 * components/AutoCoordinationPanel.jsx - Panel de Auto-Coordinación de Breakers
 * Componente que implementa coordinación automática con análisis y ajustes
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useGraphStore } from '../store/graphStore.js';
import { useTCCCurves } from './SimulationEngine.jsx';
import {
  calculateCoordinationMargin,
  curvesOverlap,
  interpolateTripTime
} from '../utils/simulationEngine.js';

export const AutoCoordinationPanel = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [coordinationResults, setCoordinationResults] = useState(null);
  const [selectedBreaker, setSelectedBreaker] = useState(null);
  const [autoMode, setAutoMode] = useState(false);

  const {
    nodes,
    edges,
    results,
    generateTCCCurves,
    autoCoordinateBreakers
  } = useGraphStore();

  const { curves } = useTCCCurves();

  // === BREAKERS DISPONIBLES ===
  const breakerNodes = useMemo(() =>
    nodes.filter(node => node.type === 'breaker')
      .map(breaker => ({
        ...breaker,
        current: results?.nodos?.find(n => n.id === breaker.id)?.I || 0,
        pickup: breaker.data?.pickup || 100,
        instantaneous: breaker.data?.instantaneous || 800,
        curveType: breaker.data?.curve || 'IEC'
      }))
      .sort((a, b) => {
        // Ordenar de downstream a upstream (basado en corriente)
        return b.current - a.current;
      }),
    [nodes, results]
  );

  // === ANÁLISIS DE COORDINACIÓN ===
  const analyzeCoordination = useCallback(() => {
    setIsAnalyzing(true);

    setTimeout(() => {
      const results = {
        issues: [],
        recommendations: [],
        coordinationMatrix: [],
        overallScore: 0,
        breakerAnalysis: []
      };

      // Analizar cada par de breakers adyacentes
      for (let i = 0; i < breakerNodes.length - 1; i++) {
        const downstream = breakerNodes[i];
        const upstream = breakerNodes[i + 1];

        const downCurve = curves[downstream.id];
        const upCurve = curves[upstream.id];

        if (!downCurve || !upCurve) continue;

        // Calcular margen de coordinación
        const margin = calculateCoordinationMargin(upCurve.curve, downCurve.curve);

        // Verificar cruces
        const hasOverlap = curvesOverlap(upCurve.curve, downCurve.curve);

        // Análisis detallado
        const analysis = {
          downstream: downstream.id,
          upstream: upstream.id,
          margin: margin * 100, // Convertir a porcentaje
          hasOverlap,
          status: margin > 0.2 ? 'good' : margin > 0.1 ? 'warning' : 'critical',
          testPoints: []
        };

        // Puntos de prueba detallados
        const testCurrents = [50, 100, 200, 500, 1000];
        testCurrents.forEach(current => {
          const downTime = interpolateTripTime(downCurve.curve, current);
          const upTime = interpolateTripTime(upCurve.curve, current);

          analysis.testPoints.push({
            current,
            downstreamTime: downTime,
            upstreamTime: upTime,
            ratio: upTime / downTime,
            acceptable: upTime > downTime * 1.2 // 20% margen mínimo
          });
        });

        results.breakerAnalysis.push(analysis);
        results.coordinationMatrix.push(analysis);

        // Generar recomendaciones
        if (hasOverlap) {
          results.issues.push({
            type: 'overlap',
            severity: 'critical',
            upstream: upstream.id,
            downstream: downstream.id,
            description: `Cruce de curvas entre ${upstream.data?.label || upstream.id} y ${downstream.data?.label || downstream.id}`,
            recommendation: `Ajustar pickup de ${upstream.data?.label || upstream.id} o agregar delay`
          });
        } else if (margin < 0.1) {
          results.issues.push({
            type: 'margin',
            severity: 'warning',
            upstream: upstream.id,
            downstream: downstream.id,
            description: `Margen de coordinación bajo (${(margin * 100).toFixed(1)}%)`,
            recommendation: `Considerar ajuste para mejorar coordinación`
          });
        }
      }

      // Calcular score general
      const totalPairs = results.breakerAnalysis.length;
      const goodPairs = results.breakerAnalysis.filter(a => a.status === 'good').length;
      results.overallScore = totalPairs > 0 ? (goodPairs / totalPairs) * 100 : 0;

      // Generar recomendaciones automáticas
      results.recommendations = generateRecommendations(results.breakerAnalysis);

      setCoordinationResults(results);
      setIsAnalyzing(false);
    }, 1000);
  }, [breakerNodes, curves]);

  // === GENERAR RECOMENDACIONES ===
  const generateRecommendations = (analysis) => {
    const recommendations = [];

    analysis.forEach(pair => {
      if (pair.status === 'critical') {
        recommendations.push({
          type: 'adjustment',
          breakerId: pair.upstream,
          action: 'increase_pickup',
          value: 1.2, // 20% aumento
          reason: 'Eliminar cruce de curvas'
        });
      } else if (pair.status === 'warning') {
        recommendations.push({
          type: 'adjustment',
          breakerId: pair.upstream,
          action: 'add_delay',
          value: 0.1, // 100ms delay
          reason: 'Mejorar margen de coordinación'
        });
      }
    });

    return recommendations;
  };

  // === APLICAR COORDINACIÓN AUTOMÁTICA ===
  const applyAutoCoordination = useCallback(() => {
    if (!coordinationResults) return;

    // Ejecutar auto-coordinación del store
    autoCoordinateBreakers();

    // Regenerar curvas TCC
    generateTCCCurves();

    // Re-analizar
    setTimeout(() => {
      analyzeCoordination();
    }, 500);
  }, [coordinationResults, autoCoordinateBreakers, generateTCCCurves, analyzeCoordination]);

  // === APLICAR AJUSTE MANUAL ===
  const applyManualAdjustment = useCallback((breakerId, adjustment) => {
    const breaker = breakerNodes.find(b => b.id === breakerId);
    if (!breaker) return;

    // Aplicar ajuste según tipo
    switch (adjustment.action) {
      case 'increase_pickup':
        breaker.pickup *= adjustment.value;
        break;
      case 'decrease_pickup':
        breaker.pickup *= adjustment.value;
        break;
      case 'add_delay':
        // Implementar delay en curva
        break;
      case 'adjust_instantaneous':
        breaker.instantaneous *= adjustment.value;
        break;
    }

    // Actualizar datos del breaker
    const updatedNodes = nodes.map(node =>
      node.id === breakerId
        ? {
          ...node,
          data: {
            ...node.data,
            pickup: breaker.pickup,
            instantaneous: breaker.instantaneous
          }
        }
        : node
    );

    // Actualizar store
    useGraphStore.getState().setGraph(updatedNodes, edges);

    // Regenerar curvas
    generateTCCCurves();

    // Re-analizar
    setTimeout(() => {
      analyzeCoordination();
    }, 500);
  }, [breakerNodes, nodes, edges, generateTCCCurves, analyzeCoordination]);

  // === INICIALIZACIÓN ===
  useEffect(() => {
    if (Object.keys(curves).length > 0) {
      analyzeCoordination();
    }
  }, [curves, analyzeCoordination]);

  // === MODO AUTOMÁTICO ===
  useEffect(() => {
    if (autoMode && coordinationResults) {
      const hasIssues = coordinationResults.issues.some(issue =>
        issue.severity === 'critical'
      );

      if (hasIssues) {
        applyAutoCoordination();
      }
    }
  }, [autoMode, coordinationResults, applyAutoCoordination]);

  const getStatusColor = (status) => {
    const colors = {
      good: 'text-green-600 bg-green-50',
      warning: 'text-yellow-600 bg-yellow-50',
      critical: 'text-red-600 bg-red-50'
    };
    return colors[status] || 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Auto-Coordinación de Breakers</h3>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoMode}
              onChange={(e) => setAutoMode(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-600">Modo Auto</span>
          </label>
          <button
            onClick={analyzeCoordination}
            disabled={isAnalyzing}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isAnalyzing ? 'Analizando...' : 'Analizar'}
          </button>
        </div>
      </div>

      {/* Score general */}
      {coordinationResults && (
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Score de Coordinación:</span>
            <span className={`text-lg font-bold ${coordinationResults.overallScore > 80 ? 'text-green-600' :
              coordinationResults.overallScore > 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
              {coordinationResults.overallScore.toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      {/* Issues detectados */}
      {coordinationResults?.issues.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Issues Detectados</h4>
          <div className="space-y-2">
            {coordinationResults.issues.map((issue, index) => (
              <div key={index} className={`p-2 rounded border ${issue.severity === 'critical' ? 'bg-red-50 border-red-200' :
                'bg-yellow-50 border-yellow-200'
                }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${issue.severity === 'critical' ? 'text-red-700' : 'text-yellow-700'
                    }`}>
                    {issue.description}
                  </span>
                  <button
                    onClick={() => applyManualAdjustment(issue.upstream, {
                      action: issue.type === 'overlap' ? 'increase_pickup' : 'add_delay',
                      value: issue.type === 'overlap' ? 1.2 : 0.1
                    })}
                    className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Aplicar
                  </button>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {issue.recommendation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matriz de coordinación */}
      {coordinationResults?.coordinationMatrix.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Matriz de Coordinación</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-2 py-1 text-left">Upstream</th>
                  <th className="px-2 py-1 text-left">Downstream</th>
                  <th className="px-2 py-1 text-center">Margen</th>
                  <th className="px-2 py-1 text-center">Estado</th>
                  <th className="px-2 py-1 text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {coordinationResults.coordinationMatrix.map((pair, index) => (
                  <tr key={index} className="border-b">
                    <td className="px-2 py-1">
                      {breakerNodes.find(b => b.id === pair.upstream)?.data?.label || pair.upstream}
                    </td>
                    <td className="px-2 py-1">
                      {breakerNodes.find(b => b.id === pair.downstream)?.data?.label || pair.downstream}
                    </td>
                    <td className="px-2 py-1 text-center">
                      {pair.margin.toFixed(1)}%
                    </td>
                    <td className="px-2 py-1 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(pair.status)}`}>
                        {pair.status}
                      </span>
                    </td>
                    <td className="px-2 py-1 text-center">
                      <button
                        onClick={() => setSelectedBreaker(pair)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        Detalles
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detalles del breaker seleccionado */}
      {selectedBreaker && (
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Detalles: {breakerNodes.find(b => b.id === selectedBreaker.upstream)?.data?.label || selectedBreaker.upstream}
          </h4>
          <div className="space-y-1 text-xs">
            {selectedBreaker.testPoints.map((point, index) => (
              <div key={index} className="flex justify-between">
                <span>I: {point.current}A</span>
                <span>Down: {point.downstreamTime.toFixed(3)}s</span>
                <span>Up: {point.upstreamTime.toFixed(3)}s</span>
                <span className={point.acceptable ? 'text-green-600' : 'text-red-600'}>
                  Ratio: {point.ratio.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recomendaciones */}
      {coordinationResults?.recommendations.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Recomendaciones</h4>
          <div className="space-y-2">
            {coordinationResults.recommendations.map((rec, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                <span className="text-sm text-blue-700">
                  {rec.reason}: {breakerNodes.find(b => b.id === rec.breakerId)?.data?.label || rec.breakerId}
                </span>
                <button
                  onClick={() => applyManualAdjustment(rec.breakerId, rec)}
                  className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Aplicar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoCoordinationPanel;
