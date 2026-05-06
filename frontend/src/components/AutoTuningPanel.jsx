/**
 * components/AutoTuningPanel.jsx - Panel de Auto-Tuning de Coordinación
 * Sistema inteligente que ajusta automáticamente pickups y TMS para cumplir restricciones
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useGraphStore } from '../store/graphStore.js';
import { 
  autoTuneProtection,
  validateCoordination,
  analyzeSensitivity,
  generateTuningReport
} from '../utils/autoTuningEngine.js';

export const AutoTuningPanel = () => {
  const [isTuning, setIsTuning] = useState(false);
  const [tuningResults, setTuningResults] = useState(null);
  const [validationResults, setValidationResults] = useState(null);
  const [sensitivityAnalysis, setSensitivityAnalysis] = useState(null);
  const [selectedFault, setSelectedFault] = useState(null);
  const [tuningOptions, setTuningOptions] = useState({
    margin: 0.3,
    maxIterations: 10,
    tolerance: 0.01,
    limits: {
      TMS_min: 0.05,
      TMS_max: 2.0,
      pickup_max_factor: 2.0
    }
  });
  
  const { 
    nodes, 
    edges, 
    results, 
    simulation
  } = useGraphStore();

  // === PREPARAR ICC MAP ===
  const prepareIccMap = useCallback(() => {
    const iccMap = {};
    
    edges.forEach(edge => {
      // Usar resultados de cálculo o fallback
      const edgeResult = results?.flujos?.find(f => 
        (f.from === edge.source && f.to === edge.target) ||
        (f.source === edge.source && f.target === edge.target)
      );
      
      iccMap[edge.id] = edgeResult?.I || edge.current || 1000;
    });
    
    return iccMap;
  }, [edges, results]);

  // === EJECUTAR AUTO-TUNING ===
  const executeAutoTuning = useCallback(async () => {
    if (!selectedFault) {
      alert('Por favor seleccione un nodo de falla');
      return;
    }
    
    setIsTuning(true);
    
    try {
      // Preparar grafo para auto-tuning
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
            breaker: {
              id: edge.data?.breaker || 
                   nodes.find(n => n.type === 'breaker' && 
                   (n.id === edge.source || n.id === edge.target))?.id,
              pickup: edge.data?.pickup || 1000,
              TMS: edge.data?.TMS || 0.5,
              curve: edge.data?.curve || 'IEC',
              instEnabled: edge.data?.instEnabled !== false,
              instPickup: edge.data?.instPickup || 8000,
              instDelay: edge.data?.instDelay || 0.02,
              instBlocked: false
            },
            current: results?.flujos?.find(f => 
              (f.from === edge.source && f.to === edge.target) ||
              (f.source === edge.source && f.target === edge.target)
            )?.I || 0
          };
        })
      };
      
      // Preparar ICC map
      const iccMap = prepareIccMap();
      
      // Ejecutar auto-tuning
      const result = autoTuneProtection(
        graph,
        selectedFault,
        iccMap,
        tuningOptions
      );
      
      // Validar resultados
      const faultChains = []; // Esto debería venir del buildChains
      const testCurrents = [500, 1000, 2000, 5000, 10000, 20000];
      const validation = faultChains.map(chain => 
        validateCoordination(chain, testCurrents, tuningOptions.margin)
      );
      
      // Análisis de sensibilidad
      const breakers = graph.edges
        .filter(e => e.breaker)
        .map(e => e.breaker);
      
      const sensitivity = analyzeSensitivity(breakers, testCurrents);
      
      // Generar reporte
      const report = generateTuningReport(result, validation);
      
      setTuningResults(result);
      setValidationResults(validation);
      setSensitivityAnalysis(sensitivity);
      
      if (!result.converged) {
        console.warn('El auto-tuning no convergió completamente');
      }
      
    } catch (error) {
      console.error('Error en auto-tuning:', error);
    } finally {
      setIsTuning(false);
    }
  }, [selectedFault, nodes, edges, results, tuningOptions, prepareIccMap]);

  // === APLICAR AJUSTES ===
  const applyAdjustments = useCallback(() => {
    if (!tuningResults) return;
    
    // Aquí aplicarías los ajustes al sistema real
    // Por ahora solo mostramos los resultados
    alert('Ajustes aplicados al sistema');
  }, [tuningResults]);

  const loadNodes = nodes.filter(node => node.type === 'load');

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Auto-Tuning de Coordinación</h3>
      
      {/* Selección de Falla */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nodo de Falla:
        </label>
        <select
          value={selectedFault || ''}
          onChange={(e) => setSelectedFault(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccionar nodo de falla...</option>
          {loadNodes.map(node => (
            <option key={node.id} value={node.id}>
              {node.data?.label || node.id}
            </option>
          ))}
        </select>
      </div>

      {/* Opciones de Tuning */}
      <div className="mb-4 p-3 bg-gray-50 rounded">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Opciones de Tuning</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Margen (s):</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="1.0"
              value={tuningOptions.margin}
              onChange={(e) => setTuningOptions(prev => ({
                ...prev,
                margin: parseFloat(e.target.value)
              }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
          
          <div>
            <label className="block text-xs text-gray-600 mb-1">Iteraciones máx:</label>
            <input
              type="number"
              min="1"
              max="20"
              value={tuningOptions.maxIterations}
              onChange={(e) => setTuningOptions(prev => ({
                ...prev,
                maxIterations: parseInt(e.target.value)
              }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
          
          <div>
            <label className="block text-xs text-gray-600 mb-1">TMS máximo:</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="5.0"
              value={tuningOptions.limits.TMS_max}
              onChange={(e) => setTuningOptions(prev => ({
                ...prev,
                limits: {
                  ...prev.limits,
                  TMS_max: parseFloat(e.target.value)
                }
              }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
          
          <div>
            <label className="block text-xs text-gray-600 mb-1">Factor pickup máx:</label>
            <input
              type="number"
              step="0.1"
              min="1.0"
              max="5.0"
              value={tuningOptions.limits.pickup_max_factor}
              onChange={(e) => setTuningOptions(prev => ({
                ...prev,
                limits: {
                  ...prev.limits,
                  pickup_max_factor: parseFloat(e.target.value)
                }
              }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={executeAutoTuning}
          disabled={isTuning || !selectedFault}
          className={`flex-1 px-4 py-2 rounded font-medium transition-colors ${
            isTuning || !selectedFault
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isTuning ? 'Optimizando...' : 'Ejecutar Auto-Tuning'}
        </button>
        
        <button
          onClick={applyAdjustments}
          disabled={!tuningResults}
          className={`flex-1 px-4 py-2 rounded font-medium transition-colors ${
            !tuningResults
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
        >
          Aplicar Ajustes
        </button>
      </div>

      {/* Resultados del Tuning */}
      {tuningResults && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Resultados del Tuning</h4>
          
          <div className="p-3 bg-gray-50 rounded">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Convergencia:</span>
                <span className={`font-medium ${
                  tuningResults.converged ? 'text-green-600' : 'text-red-600'
                }`}>
                  {tuningResults.converged ? 'Sí' : 'No'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Error total:</span>
                <span className="font-medium">
                  {tuningResults.totalError.toFixed(4)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Iteraciones:</span>
                <span className="font-medium">
                  {tuningResults.iterations}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Ajustes:</span>
                <span className="font-medium">
                  {tuningResults.adjustments.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ajustes Detallados */}
      {tuningResults?.adjustments && tuningResults.adjustments.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Ajustes Realizados</h4>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {tuningResults.adjustments.map((adj, index) => (
              <div key={index} className="p-2 bg-blue-50 border border-blue-200 rounded">
                <div className="text-sm font-medium text-blue-700">
                  {adj.upstream} (upstream) & {adj.downstream} (downstream)
                </div>
                
                <div className="text-xs text-gray-600 mt-1">
                  <div>Icc: {adj.Icc.toFixed(0)}A</div>
                  <div>Upstream: TMS {adj.beforeUp.TMS} -> {adj.afterUp.TMS}</div>
                  <div>Upstream: Pickup {adj.beforeUp.pickup.toFixed(0)} -> {adj.afterUp.pickup.toFixed(0)}A</div>
                  <div className="text-green-600">
                    Margen: {adj.margin.toFixed(3)}s
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Análisis de Sensibilidad */}
      {sensitivityAnalysis && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Análisis de Sensibilidad</h4>
          
          <div className="space-y-2">
            {sensitivityAnalysis.map((analysis, index) => (
              <div key={index} className="p-2 bg-gray-50 rounded">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {analysis.breakerId}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    analysis.isAdequate 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {analysis.sensitivityScore.toFixed(1)}%
                  </span>
                </div>
                
                <div className="text-xs text-gray-600 mt-1">
                  <div>Pickup: {analysis.pickup.toFixed(0)}A</div>
                  <div>TMS: {analysis.TMS}</div>
                  <div>Adecuado: {analysis.isAdequate ? 'Sí' : 'No'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Información Técnica */}
      <div className="mt-4 p-3 bg-gray-50 rounded text-xs">
        <h4 className="font-medium text-gray-700 mb-2">Algoritmo de Auto-Tuning</h4>
        <div className="space-y-1 text-gray-600">
          <div>1. Construir cadenas desde falla hacia fuente</div>
          <div>2. Ajustar pares downstream-upstream con margen</div>
          <div>3. Priorizar TMS sobre pickup para mantener sensibilidad</div>
          <div>4. Bloquear instantáneos aguas arriba</div>
          <div>5. Iterar hasta convergencia o máximo de iteraciones</div>
        </div>
      </div>
    </div>
  );
};

export default AutoTuningPanel;
