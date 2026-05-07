/**
 * components/TCCLiveChart.jsx - Gráfico TCC en Tiempo Real
 * Componente que visualiza curvas Time-Current dinámicamente con coordinación
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useGraphStore } from '../store/graphStore.js';
import { useTCCCurves } from './SimulationEngine.jsx';
import {
  generateTCCTimeCurrentCurve,
  interpolateTripTime,
  getTCCColor,
  getTCCStatus,
  curvesOverlap
} from '../utils/simulationEngine.js';

export const TCCLiveChart = ({ width = 800, height = 600, showGrid = true }) => {
  const canvasRef = useRef(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [selectedBreaker, setSelectedBreaker] = useState(null);

  const { nodes, results, generateTCCCurves } = useGraphStore();
  const { curves, isVisible } = useTCCCurves();

  // === CONFIGURACIÓN DEL GRÁFICO ===
  const chartConfig = useMemo(() => ({
    padding: { top: 40, right: 80, bottom: 60, left: 80 },
    gridColor: '#e5e7eb',
    axisColor: '#374151',
    backgroundColor: '#ffffff',
    logScale: true, // Escala logarítmica para corriente
    timeScale: 'log' // Escala log para tiempo
  }), []);

  // === BREAKERS DISPONIBLES ===
  const breakerNodes = useMemo(() =>
    nodes.filter(node => node.type === 'breaker'),
    [nodes]
  );

  // === GENERAR CURVAS TCC ===
  const chartCurves = useMemo(() => {
    if (!isVisible || breakerNodes.length === 0) return [];

    return breakerNodes.map(breaker => {
      const nodeResult = results?.nodos?.find(n => n.id === breaker.id);
      const pickup = breaker.data?.pickup || 100;
      const instantaneous = breaker.data?.instantaneous || 800;
      const curveType = breaker.data?.curve || 'IEC';

      return {
        id: breaker.id,
        name: breaker.data?.label || breaker.id,
        type: curveType,
        pickup,
        instantaneous,
        current: nodeResult?.I || 0,
        curve: generateTCCTimeCurrentCurve(pickup, instantaneous, curveType),
        color: getTCCColor(getTCCStatus(nodeResult?.I || 0, pickup, instantaneous)),
        status: getTCCStatus(nodeResult?.I || 0, pickup, instantaneous),
        visible: true,
        lineWidth: selectedBreaker === breaker.id ? 3 : 2
      };
    });
  }, [breakerNodes, results, isVisible, selectedBreaker]);

  // === COORDENADAS DEL GRÁFICO ===
  const getChartCoordinates = useCallback((current, time) => {
    const { padding } = chartConfig;
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Escala logarítmica para corriente (1A - 100kA)
    const minCurrent = 1;
    const maxCurrent = 100000;
    const currentLog = (Math.log10(current) - Math.log10(minCurrent)) /
      (Math.log10(maxCurrent) - Math.log10(minCurrent));
    const x = padding.left + currentLog * chartWidth;

    // Escala logarítmica para tiempo (0.01s - 10000s)
    const minTime = 0.01;
    const maxTime = 10000;
    const timeLog = (Math.log10(time) - Math.log10(minTime)) /
      (Math.log10(maxTime) - Math.log10(minTime));
    const y = height - padding.bottom - timeLog * chartHeight;

    return { x, y };
  }, [chartConfig, width, height]);

  // === COORDENADAS INVERSAS ===

  // === DIBUJAR GRILLA ===
  const drawGrid = useCallback((ctx) => {
    if (!showGrid) return;

    ctx.strokeStyle = chartConfig.gridColor;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 2]);

    // Líneas verticales (corriente)
    const currentValues = [1, 10, 100, 1000, 10000, 100000];
    currentValues.forEach(current => {
      const { x } = getChartCoordinates(current, 1);
      ctx.beginPath();
      ctx.moveTo(x, chartConfig.padding.top);
      ctx.lineTo(x, height - chartConfig.padding.bottom);
      ctx.stroke();
    });

    // Líneas horizontales (tiempo)
    const timeValues = [0.01, 0.1, 1, 10, 100, 1000, 10000];
    timeValues.forEach(time => {
      const { y } = getChartCoordinates(1, time);
      ctx.beginPath();
      ctx.moveTo(chartConfig.padding.left, y);
      ctx.lineTo(width - chartConfig.padding.right, y);
      ctx.stroke();
    });

    ctx.setLineDash([]);
  }, [showGrid, chartConfig, getChartCoordinates, width, height]);

  // === DIBUJAR EJES ===
  const drawAxes = useCallback((ctx) => {
    ctx.strokeStyle = chartConfig.axisColor;
    ctx.lineWidth = 2;
    ctx.font = '12px sans-serif';
    ctx.fillStyle = chartConfig.axisColor;

    // Eje X (Corriente)
    ctx.beginPath();
    ctx.moveTo(chartConfig.padding.left, height - chartConfig.padding.bottom);
    ctx.lineTo(width - chartConfig.padding.right, height - chartConfig.padding.bottom);
    ctx.stroke();

    // Etiquetas de corriente
    const currentValues = [1, 10, 100, 1000, 10000, 100000];
    currentValues.forEach(current => {
      const { x } = getChartCoordinates(current, 1);
      ctx.fillText(formatCurrent(current), x - 10, height - chartConfig.padding.bottom + 20);
    });

    // Eje Y (Tiempo)
    ctx.beginPath();
    ctx.moveTo(chartConfig.padding.left, chartConfig.padding.top);
    ctx.lineTo(chartConfig.padding.left, height - chartConfig.padding.bottom);
    ctx.stroke();

    // Etiquetas de tiempo
    const timeValues = [0.01, 0.1, 1, 10, 100, 1000, 10000];
    timeValues.forEach(time => {
      const { y } = getChartCoordinates(1, time);
      ctx.fillText(formatTime(time), chartConfig.padding.left - 35, y + 5);
    });

    // Títulos
    ctx.font = '14px sans-serif';
    ctx.fillText('Corriente (A)', width / 2 - 30, height - 10);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Tiempo (s)', -30, 0);
    ctx.restore();
  }, [chartConfig, getChartCoordinates, width, height]);

  // === DIBUJAR CURVAS TCC ===
  const drawCurves = useCallback((ctx) => {
    chartCurves.forEach(curve => {
      if (!curve.visible) return;

      ctx.strokeStyle = curve.color;
      ctx.lineWidth = curve.lineWidth;
      ctx.beginPath();

      // Generar puntos para la curva
      const points = [];
      for (let i = 0; i <= 100; i++) {
        const current = Math.pow(10, i * 0.04 - 2); // 0.01A a 10000A
        const time = interpolateTripTime(curve.curve, current);

        if (time > 0) {
          const { x, y } = getChartCoordinates(current, time);
          points.push({ x, y, current, time });
        }
      }

      // Dibujar curva suave
      points.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });

      ctx.stroke();

      // Dibujar punto de operación actual
      if (curve.current > 0) {
        const tripTime = interpolateTripTime(curve.curve, curve.current);
        const { x, y } = getChartCoordinates(curve.current, tripTime);

        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = curve.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }, [chartCurves, getChartCoordinates]);

  // === DIBUJAR COORDINACIÓN ===
  const drawCoordination = useCallback((ctx) => {
    // Verificar cruces entre curvas
    for (let i = 0; i < chartCurves.length - 1; i++) {
      for (let j = i + 1; j < chartCurves.length; j++) {
        const curve1 = chartCurves[i];
        const curve2 = chartCurves[j];

        if (!curve1.visible || !curve2.visible) continue;

        if (curvesOverlap(curve1.curve, curve2.curve)) {
          // Marcar área de cruce
          ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);

          // Encontrar punto de cruce aproximado
          const testCurrents = [50, 100, 200, 500, 1000];
          testCurrents.forEach(current => {
            const time1 = interpolateTripTime(curve1.curve, current);
            const time2 = interpolateTripTime(curve2.curve, current);

            if (time2 < time1 * 0.9) { // 10% tolerancia
              const { x, y } = getChartCoordinates(current, time2);
              ctx.beginPath();
              ctx.arc(x, y, 15, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            }
          });

          ctx.setLineDash([]);
        }
      }
    }
  }, [chartCurves, getChartCoordinates]);

  // === DIBUJAR TOOLTIP ===
  const drawTooltip = useCallback((ctx) => {
    if (!hoveredPoint) return;

    const { x, y, current, time, curve } = hoveredPoint;

    // Fondo del tooltip
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(x + 10, y - 40, 150, 60);

    // Texto del tooltip
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.fillText(`${curve.name}`, x + 15, y - 25);
    ctx.fillText(`I: ${formatCurrent(current)}`, x + 15, y - 10);
    ctx.fillText(`t: ${formatTime(time)}`, x + 15, y + 5);
  }, [hoveredPoint]);

  // === FUNCIÓN DE DIBUJO PRINCIPAL ===
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Limpiar canvas
    ctx.fillStyle = chartConfig.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Dibujar componentes
    drawGrid(ctx);
    drawAxes(ctx);
    drawCoordination(ctx);
    drawCurves(ctx);
    drawTooltip(ctx);
  }, [chartConfig, drawGrid, drawAxes, drawCoordination, drawCurves, drawTooltip, width, height]);

  // === MANEJO DE MOUSE ===
  const handleMouseMove = useCallback((event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Encontrar punto más cercano en alguna curva
    let closestPoint = null;
    let minDistance = Infinity;

    chartCurves.forEach(curve => {
      if (!curve.visible) return;

      for (let i = 0; i <= 100; i++) {
        const current = Math.pow(10, i * 0.04 - 2);
        const time = interpolateTripTime(curve.curve, current);

        if (time > 0) {
          const point = getChartCoordinates(current, time);
          const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));

          if (distance < minDistance && distance < 20) {
            minDistance = distance;
            closestPoint = { ...point, current, time, curve };
          }
        }
      }
    });

    setHoveredPoint(closestPoint);
  }, [chartCurves, getChartCoordinates]);

  // === INICIALIZACIÓN ===
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = width;
    canvas.height = height;

    // Generar curvas TCC si no existen
    if (Object.keys(curves).length === 0) {
      generateTCCCurves();
    }
  }, [width, height, curves, generateTCCCurves]);

  useEffect(() => {
    draw();
  }, [draw]);

  // === UTILIDADES ===
  const formatCurrent = (current) => {
    if (current >= 1000) return `${(current / 1000).toFixed(1)}k`;
    if (current >= 1) return current.toFixed(0);
    return current.toFixed(2);
  };

  const formatTime = (time) => {
    if (time >= 60) return `${(time / 60).toFixed(1)}m`;
    if (time >= 1) return `${time.toFixed(1)}s`;
    return `${(time * 1000).toFixed(0)}ms`;
  };

  if (!isVisible) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Curvas TCC en Tiempo Real</h3>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}
          className="border border-gray-300 rounded"
        />
      </div>

      {/* Leyenda de breakers */}
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Breakers</h4>
        <div className="space-y-2">
          {chartCurves.map(curve => (
            <div key={curve.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedBreaker(selectedBreaker === curve.id ? null : curve.id)}
                  className={`
                    w-4 h-4 rounded
                    ${selectedBreaker === curve.id ? 'ring-2 ring-offset-2' : ''}
                  `}
                  style={{
                    backgroundColor: curve.color,
                    ringColor: selectedBreaker === curve.id ? curve.color : 'transparent'
                  }}
                />
                <span className="text-sm text-gray-700">{curve.name}</span>
                <span className="text-xs text-gray-500">({curve.type})</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  I: {formatCurrent(curve.current)}
                </span>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={curve.visible}
                    onChange={(e) => {
                      curve.visible = e.target.checked;
                      draw();
                    }}
                    className="w-3 h-3"
                  />
                  <span className="text-xs text-gray-500">Visible</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

TCCLiveChart.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number,
  showGrid: PropTypes.bool
};

export default TCCLiveChart;
