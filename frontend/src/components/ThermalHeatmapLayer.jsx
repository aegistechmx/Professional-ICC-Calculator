/**
 * components/ThermalHeatmapLayer.jsx - Capa de Heatmap Térmico en Tiempo Real
 * Sistema de visualización térmica con física realista y efectos profesionales
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { useGraphStore } from '../store/graphStore.js';
import {
  drawThermalEdge,
  drawTemperatureIndicator,
  updateThermalLayer,
  analyzeThermalSystem,
  checkThermalAlerts
} from '../utils/thermalEngine.js';

export const ThermalHeatmapLayer = ({ width = 1200, height = 800 }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [thermalAnalysis, setThermalAnalysis] = useState(null);
  const [showIndicators, setShowIndicators] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const [alerts, setAlerts] = useState([]);

  const {
    nodes,
    edges,
    results
  } = useGraphStore();

  // === LOOP DE ANIMACIÓN TÉRMICA ===
  const thermalAnimationLoop = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const currentTime = performance.now();

    // Limpiar canvas
    ctx.clearRect(0, 0, width, height);

    // Actualizar capa térmica
    const updatedEdges = updateThermalLayer(edges, results);

    // Renderizar edges térmicos
    updatedEdges.forEach(edge => {
      if (!edge.thermal) return;

      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);

      if (!sourceNode?.position || !targetNode?.position) return;

      const edgeWithPositions = {
        ...edge,
        x1: sourceNode.position.x,
        y1: sourceNode.position.y,
        x2: targetNode.position.x,
        y2: targetNode.position.y
      };

      drawThermalEdge(ctx, edgeWithPositions, edge.thermal, currentTime);

      // Indicadores de temperatura
      if (showIndicators && edge.thermal.loading > 0.5) {
        const midX = (sourceNode.position.x + targetNode.position.x) / 2;
        const midY = (sourceNode.position.y + targetNode.position.y) / 2;

        drawTemperatureIndicator(ctx, midX, midY, edge.thermal, 15);
      }
    });

    // Análisis térmico del sistema
    const analysis = analyzeThermalSystem(updatedEdges);
    setThermalAnalysis(analysis);

    // Verificar alertas
    const systemAlerts = [];
    updatedEdges.forEach(edge => {
      if (edge.thermal) {
        const edgeAlerts = checkThermalAlerts(edge.thermal);
        systemAlerts.push(...edgeAlerts.map(alert => ({
          ...alert,
          edgeId: edge.id,
          edgeLabel: edge.data?.label || edge.id
        })));
      }
    });
    setAlerts(systemAlerts);

    // Continuar animación
    animationRef.current = requestAnimationFrame(thermalAnimationLoop);
  }, [nodes, edges, results, width, height, showIndicators]);

  // === INICIALIZACIÓN ===
  useEffect(() => {
    if (canvasRef.current) {
      thermalAnimationLoop();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [thermalAnimationLoop]);

  // === PANEL DE CONTROL TÉRMICO ===
  const ThermalControlPanel = () => (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Heatmap Térmico</h3>

      {/* Score de salud térmica */}
      {thermalAnalysis && (
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Salud Térmica:</span>
            <span className={`text-lg font-bold ${thermalAnalysis.thermalHealthScore > 80 ? 'text-green-600' :
              thermalAnalysis.thermalHealthScore > 60 ? 'text-yellow-600' :
                thermalAnalysis.thermalHealthScore > 40 ? 'text-orange-600' : 'text-red-600'
              }`}>
              {thermalAnalysis.thermalHealthScore.toFixed(1)}%
            </span>
          </div>

          {/* Barra de progreso */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${thermalAnalysis.thermalHealthScore > 80 ? 'bg-green-500' :
                thermalAnalysis.thermalHealthScore > 60 ? 'bg-yellow-500' :
                  thermalAnalysis.thermalHealthScore > 40 ? 'bg-orange-500' : 'bg-red-500'
                }`}
              style={{ width: `${thermalAnalysis.thermalHealthScore}%` }}
            />
          </div>
        </div>
      )}

      {/* Estadísticas térmicas */}
      {thermalAnalysis && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Estado del Sistema</h4>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center p-2 bg-green-50 rounded">
              <div className="text-green-600 font-bold">{thermalAnalysis.safeEdges}</div>
              <div className="text-gray-500">Seguro</div>
            </div>
            <div className="text-center p-2 bg-yellow-50 rounded">
              <div className="text-yellow-600 font-bold">{thermalAnalysis.normalEdges + thermalAnalysis.cautionEdges}</div>
              <div className="text-gray-500">Normal</div>
            </div>
            <div className="text-center p-2 bg-red-50 rounded">
              <div className="text-red-600 font-bold">{thermalAnalysis.warningEdges + thermalAnalysis.dangerEdges + thermalAnalysis.criticalEdges}</div>
              <div className="text-gray-500">Peligro</div>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Carga promedio:</span>
              <span className="font-medium">{(thermalAnalysis.averageLoading * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Temp máxima:</span>
              <span className="font-medium">{thermalAnalysis.maxTemperature.toFixed(1)}°C</span>
            </div>
          </div>
        </div>
      )}

      {/* Alertas térmicas */}
      {showAlerts && alerts.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Alertas Térmicas</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {alerts.slice(0, 5).map((alert, index) => (
              <div key={index} className={`p-2 rounded border ${alert.type === 'critical' ? 'bg-red-50 border-red-200' :
                'bg-yellow-50 border-yellow-200'
                }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${alert.type === 'critical' ? 'text-red-700' : 'text-yellow-700'
                    }`}>
                    {alert.edgeLabel}
                  </span>
                  <span className="text-xs text-gray-500">
                    {alert.threshold}°/{(alert.threshold * 1.2).toFixed(0)}%
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {alert.message}
                </div>
              </div>
            ))}
            {alerts.length > 5 && (
              <div className="text-xs text-gray-500 text-center">
                ... y {alerts.length - 5} más
              </div>
            )}
          </div>
        </div>
      )}

      {/* Controles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Indicadores:</span>
          <button
            onClick={() => setShowIndicators(!showIndicators)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${showIndicators
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
            {showIndicators ? 'Visibles' : 'Ocultos'}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Alertas:</span>
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${showAlerts
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
            {showAlerts ? 'Activas' : 'Inactivas'}
          </button>
        </div>
      </div>

      {/* Leyenda de colores */}
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Leyenda Térmica</h4>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#00c853' }} />
            <span className="text-xs text-gray-600">
              Seguro (&lt;50% carga)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ffd600' }} />
            <span className="text-xs text-gray-600">
              Normal (50-80% carga)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ff6d00' }} />
            <span className="text-xs text-gray-600">
              Precaución (80-100% carga)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ff3d00' }} />
            <span className="text-xs text-gray-600">
              Peligro (100-120% carga)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#d50000' }} />
            <span className="text-xs text-gray-600">
              Crítico (&gt;120% carga)
            </span>
          </div>
        </div>
      </div>

      {/* Información técnica */}
      <div className="mt-4 p-3 bg-gray-50 rounded text-xs">
        <h4 className="font-medium text-gray-700 mb-2">Modelo Térmico</h4>
        <div className="space-y-1 text-gray-600">
          <div>Ecuación: T = Tamb + (Tmax - Tamb) × (I/Imax)²</div>
          <div>Tamb = 30°C, Tmax = 90°C (XLPE)</div>
          <div>Inercia térmica: 10% suavizado</div>
          <div>Frecuencia: 60fps real-time</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          zIndex: 20
        }}
      />

      {/* Panel flotante */}
      <div className="absolute top-4 left-4">
        <ThermalControlPanel />
      </div>
    </div>
  );
};

ThermalHeatmapLayer.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number
};

export default ThermalHeatmapLayer;
