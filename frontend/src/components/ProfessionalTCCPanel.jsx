/**
 * components/ProfessionalTCCPanel.jsx - Panel TCC Profesional Nivel ETAP/SKM
 * Sistema completo de visualización y análisis de curvas TCC con biblioteca real
 */

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useGraphStore } from '../store/graphStore.js';
import { TCCEngine } from '../utils/tccEngine.js';
import { CommonConfigurations } from '../utils/breakerLibrary.js';

export const ProfessionalTCCPanel = ({ width = 800, height = 600 }) => {
  const [breakers, setBreakers] = useState([]);
  const [curves, setCurves] = useState([]);
  const [coordinationResults, setCoordinationResults] = useState(null);
  const [faultSimulation, setFaultSimulation] = useState(null);
  const [selectedConfiguration, setSelectedConfiguration] = useState('IndustrialPanel');
  const [showBands, setShowBands] = useState(true);
  const [faultCurrent, setFaultCurrent] = useState(2000);

  const { nodes } = useGraphStore();

  // === INICIALIZAR BREAKERS ===
  useEffect(() => {
    // Usar configuración predefinida
    const config = CommonConfigurations[selectedConfiguration];
    const breakerNodes = nodes.filter(n => n.type === 'breaker');

    // Mapear nodos de breaker a configuración
    const mappedBreakers = config.map((configBreaker, index) => {
      const breakerNode = breakerNodes[index];
      return {
        ...configBreaker,
        id: breakerNode?.id || configBreaker.id,
        position: breakerNode?.position || { x: 0, y: 0 }
      };
    });

    setBreakers(mappedBreakers);

    // Generar curvas iniciales
    const initialCurves = mappedBreakers.map(breaker => ({
      breaker: breaker.id,
      curve: TCCEngine.generateCurve(breaker),
      band: showBands ? TCCEngine.generateBand(TCCEngine.generateCurve(breaker)) : null
    }));

    setCurves(initialCurves);
  }, [nodes, selectedConfiguration, showBands]);

  // === COORDINACIÓN AUTOMÁTICA ===
  const runCoordination = useCallback(() => {
    if (breakers.length < 2) return;

    const results = TCCEngine.coordinateSystem(breakers, {
      margin: 0.1,
      maxIterations: 20
    });

    setCoordinationResults(results);

    // Regenerar curvas con ajustes
    const updatedCurves = breakers.map(breaker => ({
      breaker: breaker.id,
      curve: TCCEngine.generateCurve(breaker),
      band: showBands ? TCCEngine.generateBand(TCCEngine.generateCurve(breaker)) : null
    }));

    setCurves(updatedCurves);
  }, [breakers, showBands]);

  // === SIMULACIÓN DE FALLA ===
  const simulateFault = useCallback(() => {
    const simulation = TCCEngine.simulateFault(faultCurrent, breakers);
    setFaultSimulation(simulation);
  }, [breakers, faultCurrent]);

  // === RENDER DE CURVAS TCC ===
  const renderTCCChart = () => {
    if (curves.length === 0) return null;

    return (
      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Curvas TCC - Escala Log-Log</h3>

        <div className="relative" style={{ width: '100%', height: '400px' }}>
          <svg width="100%" height="100%" viewBox="0 0 800 400">
            {/* Grid */}
            <defs>
              <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
                <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#e5e7eb" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="800" height="400" fill="url(#grid)" />

            {/* Ejes */}
            <line x1="80" y1="360" x2="720" y2="360" stroke="#374151" strokeWidth="2" />
            <line x1="80" y1="40" x2="80" y2="360" stroke="#374151" strokeWidth="2" />

            {/* Etiquetas de ejes */}
            <text x="400" y="390" textAnchor="middle" fontSize="12" fill="#374151">Corriente (A)</text>
            <text x="30" y="200" textAnchor="middle" fontSize="12" fill="#374151" transform="rotate(-90 30 200)">Tiempo (s)</text>

            {/* Marcas de corriente */}
            {[100, 200, 500, 1000, 2000, 5000, 10000].map((current) => {
              const x = 80 + (Math.log10(current) - 2) * 160; // Escala log
              return (
                <g key={current}>
                  <line x1={x} y1="360" x2={x} y2="365" stroke="#374151" strokeWidth="1" />
                  <text x={x} y="375" textAnchor="middle" fontSize="10" fill="#374151">
                    {current >= 1000 ? `${current / 1000}k` : current}
                  </text>
                </g>
              );
            })}

            {/* Marcas de tiempo */}
            {[0.01, 0.1, 1, 10, 100].map((time) => {
              const y = 360 - (Math.log10(time) + 2) * 80; // Escala log
              return (
                <g key={time}>
                  <line x1="75" y1={y} x2="80" y2={y} stroke="#374151" strokeWidth="1" />
                  <text x="70" y={y + 3} textAnchor="end" fontSize="10" fill="#374151">
                    {time >= 1 ? `${time}s` : `${time * 1000}ms`}
                  </text>
                </g>
              );
            })}

            {/* Curvas TCC */}
            {curves.map((curveData, index) => {
              const breaker = breakers.find(b => b.id === curveData.breaker);
              const color = breaker ? getBreakerColor(breaker.type) : '#6b7280';

              return (
                <g key={curveData.breaker}>
                  {/* Banda de tolerancia */}
                  {curveData.band && showBands && (
                    <g opacity="0.3">
                      {curveData.band.map((point, i) => {
                        const x = 80 + (Math.log10(point.I) - 2) * 160;
                        const yMin = 360 - (Math.log10(point.t_min) + 2) * 80;
                        const yMax = 360 - (Math.log10(point.t_max) + 2) * 80;

                        if (i > 0) {
                          const prevPoint = curveData.band[i - 1];
                          const prevX = 80 + (Math.log10(prevPoint.I) - 2) * 160;
                          const prevYMin = 360 - (Math.log10(prevPoint.t_min) + 2) * 80;
                          const prevYMax = 360 - (Math.log10(prevPoint.t_max) + 2) * 80;

                          return (
                            <g key={`band-${i}`}>
                              <line
                                x1={prevX} y1={prevYMin}
                                x2={x} y2={yMin}
                                stroke={color}
                                strokeWidth="1"
                              />
                              <line
                                x1={prevX} y1={prevYMax}
                                x2={x} y2={yMax}
                                stroke={color}
                                strokeWidth="1"
                              />
                            </g>
                          );
                        }
                        return null;
                      })}
                    </g>
                  )}

                  {/* Curva principal */}
                  <polyline
                    points={curveData.curve.map(point => {
                      const x = 80 + (Math.log10(point.I) - 2) * 160;
                      const y = 360 - (Math.log10(point.t) + 2) * 80;
                      return `${x},${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                  />

                  {/* Leyenda */}
                  <circle cx="720" cy={60 + index * 25} r="4" fill={color} />
                  <text x="730" y={65 + index * 25} fontSize="12" fill="#374151">
                    {curveData.breaker} ({breaker?.type})
                  </text>
                </g>
              );
            })}

            {/* Punto de falla */}
            {faultSimulation && (
              <g>
                <line
                  x1={80 + (Math.log10(faultSimulation.faultCurrent) - 2) * 160}
                  y1="40"
                  x2={80 + (Math.log10(faultSimulation.faultCurrent) - 2) * 160}
                  y2="360"
                  stroke="#ef4444"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                />

                {/* Puntos de disparo */}
                {faultSimulation.evaluation.map((evalResult) => {
                  if (!evalResult.trip) return null;

                  const x = 80 + (Math.log10(faultSimulation.faultCurrent) - 2) * 160;
                  const y = 360 - (Math.log10(evalResult.time) + 2) * 80;

                  return (
                    <g key={evalResult.id}>
                      <circle cx={x} cy={y} r="6" fill={TCCEngine.getZoneColor(evalResult.zone)} />
                      <text x={x + 10} y={y + 3} fontSize="10" fill="#374151">
                        {evalResult.id}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}
          </svg>
        </div>
      </div>
    );
  };

  // === PANEL DE CONTROL ===
  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Panel TCC Profesional</h3>

      {/* Selección de Configuración */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Configuración del Sistema:
        </label>
        <select
          value={selectedConfiguration}
          onChange={(e) => setSelectedConfiguration(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ResidentialPanel">Panel Residencial</option>
          <option value="CommercialPanel">Panel Comercial</option>
          <option value="IndustrialPanel">Panel Industrial</option>
          <option value="LowVoltageSystem">Sistema BT Completo</option>
          <option value="MediumVoltageSystem">Sistema MT</option>
        </select>
      </div>

      {/* Información de Breakers */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Breakers del Sistema</h4>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {breakers.map(breaker => (
            <div key={breaker.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div>
                <span className="text-sm font-medium text-gray-700">{breaker.id}</span>
                <span className="text-xs text-gray-500 ml-2">
                  {breaker.type} - {breaker.ratings.In}A
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {breaker.manufacturer} {breaker.series}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controles de Simulación */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Simulación de Falla</h4>

        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Corriente de Falla:</label>
            <input
              type="number"
              value={faultCurrent}
              onChange={(e) => setFaultCurrent(parseInt(e.target.value))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              min="100"
              max="50000"
              step="100"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={simulateFault}
              className="w-full px-3 py-1 bg-red-500 text-white rounded text-sm font-medium hover:bg-red-600"
            >
              Simular Falla
            </button>
          </div>
        </div>

        {/* Resultados de Simulación */}
        {faultSimulation && (
          <div className="p-3 bg-gray-50 rounded">
            <div className="text-sm font-medium text-gray-700 mb-2">
              Resultados de Falla ({faultSimulation.faultCurrent}A)
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Breaker primario:</span>
                <span className="font-medium text-green-600">
                  {faultSimulation.primary?.id || 'Ninguno'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tiempo de disparo:</span>
                <span className="font-medium">
                  {faultSimulation.primary?.time?.toFixed(3)}s
                </span>
              </div>
              <div className="flex justify-between">
                <span>Selectividad:</span>
                <span className={`font-medium ${faultSimulation.selectivity === 'achieved' ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                  {faultSimulation.selectivity === 'achieved' ? 'Lograda' : 'No aplica'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Coordinación Automática */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-700">Coordinación Automática</h4>
          <button
            onClick={runCoordination}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600"
          >
            Ejecutar
          </button>
        </div>

        {coordinationResults && (
          <div className="p-3 bg-gray-50 rounded">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Estado general:</span>
                <span className={`font-medium ${coordinationResults.overallCoordinated ? 'text-green-600' : 'text-red-600'
                  }`}>
                  {coordinationResults.overallCoordinated ? 'Coordinado' : 'No coordinado'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total iteraciones:</span>
                <span className="font-medium">{coordinationResults.totalIterations}</span>
              </div>
              <div className="flex justify-between">
                <span>Ajustes realizados:</span>
                <span className="font-medium">{coordinationResults.totalAdjustments}</span>
              </div>
            </div>

            {/* Detalles de coordinación */}
            <div className="mt-2 space-y-1">
              {coordinationResults.results.map((result, index) => (
                <div key={index} className="flex justify-between text-xs">
                  <span>{result.upstream} - {result.downstream}:</span>
                  <span className={`font-medium ${result.coordinated ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {result.coordinated ? 'OK' : 'Falla'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Opciones de Visualización */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Mostrar bandas:</span>
        <button
          onClick={() => setShowBands(!showBands)}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${showBands
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
        >
          {showBands ? 'Activas' : 'Inactivas'}
        </button>
      </div>

      {/* Gráfico TCC */}
      {renderTCCChart()}
    </div>
  );
};

// === UTILIDADES ===
const getBreakerColor = (type) => {
  const colors = {
    'MCB': '#22c55e',      // Verde
    'MCCB': '#eab308',     // Amarillo
    'PCB': '#f97316',      // Naranja
    'Electronic': '#3b82f6', // Azul
    'ACB': '#8b5cf6',      // Púrpura
    'VCB': '#ef4444',      // Rojo
    'GFCI': '#06b6d4',     // Cyan
    'MPCB': '#84cc16'      // Verde lima
  };
  return colors[type] || '#6b7280';
};

ProfessionalTCCPanel.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number
};

export default ProfessionalTCCPanel;
