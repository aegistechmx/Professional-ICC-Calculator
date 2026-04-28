/* eslint-disable no-console */
import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import CableFields from './properties/CableFields';
import BreakerFields from './properties/BreakerFields';
import TransformerFields from './properties/TransformerFields';
import LoadFields from './properties/LoadFields';
import OtherNodeFields from './properties/OtherNodeFields';
import ATSFields from './properties/ATSFields';
import { getICCLevel, getICCColor, getICCBackgroundColor, getICCTextColor } from '../utils/iccColoring';

export default function PropertiesPanel() {
  // Use individual selectors to prevent re-renders from unrelated store changes
  const selectedNode = useStore((state) => state.selectedNode);
  const selectedEdge = useStore((state) => state.selectedEdge);
  const updateNode = useStore((state) => state.updateNode);
  const updateEdge = useStore((state) => state.updateEdge);
  const calculateICC = useStore((state) => state.calculateICC);
  const shortCircuitResults = useStore((state) => state.shortCircuitResults);
  const removeNode = useStore((state) => state.removeNode);
  const removeEdge = useStore((state) => state.removeEdge);
  const validationErrors = useStore((state) => state.validationErrors);
  const [simulating, setSimulating] = useState(false);
  const [simulationResults, setSimulationResults] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setSimulationResults(null);
    setError(null);
  }, [selectedNode, selectedEdge]);

  const cableRes = selectedEdge?.data?.results?.cable;

  const localEdge = useMemo(() => {
    if (selectedEdge) {
      return {
        ...selectedEdge,
        material: selectedEdge.data?.material,
        calibre: selectedEdge.data?.calibre,
      };
    }
    return null;
  }, [selectedEdge]);

  if (!selectedNode && !selectedEdge) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Propiedades</h3>
        <p className="text-sm text-gray-500">Selecciona un elemento o un cable para ver sus propiedades</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Propiedades</h3>
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setError(null)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Cerrar error
          </button>
          <button
            onClick={() => {
              setError(null);
              // Continue to show properties panel
            }}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Continuar
          </button>
        </div>
      </div>
    );
  }

  const handleSimulate = async () => {
    setSimulating(true);
    setError(null); // Clear previous error
    try {
      const results = await calculateICC();
      setSimulationResults(results);
    } catch (error) {
      console.error('Simulation error:', error);
      // Use proper error handling instead of alert
      setError(error.message || 'Error al simular: ' + error.message);
    } finally {
      setSimulating(false);
    }
  };

  const renderEdgeFields = () => {
    const isCable = localEdge?.type === 'cable' || localEdge.material || localEdge.calibre;
    if (!isCable) {
      return <p className="text-sm text-gray-500">No hay propiedades disponibles para esta conexión</p>;
    }

    return (
      <CableFields
        edge={selectedEdge}
        updateEdge={updateEdge}
        cableRes={cableRes}
      />
    );
  };

  const renderNodeFields = () => {
    switch (selectedNode.type) {
      case 'breaker':
        return <BreakerFields node={selectedNode} updateNode={updateNode} />;
      case 'transformer':
        return <TransformerFields node={selectedNode} updateNode={updateNode} />;
      case 'load':
        return <LoadFields node={selectedNode} updateNode={updateNode} />;
      case 'ats':
        return <ATSFields node={selectedNode} updateNode={updateNode} />;
      case 'panel':
      case 'motor':
      case 'generator':
        return <OtherNodeFields node={selectedNode} updateNode={updateNode} />;
      default:
        return <p className="text-sm text-gray-500">No hay propiedades disponibles</p>;
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Propiedades</h3>

      {validationErrors && validationErrors.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <h4 className="text-sm font-semibold text-red-900 mb-2">⚠️ Errores de Validación</h4>
          <ul className="text-xs text-red-800 space-y-1">
            {validationErrors.slice(0, 5).map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
            {validationErrors.length > 5 && (
              <li className="text-red-600">...y {validationErrors.length - 5} más</li>
            )}
          </ul>
        </div>
      )}

      <div className="mb-4 pb-4 border-b border-gray-200">
        {selectedNode ? (
          <>
            <p className="text-sm font-medium text-gray-700">Tipo: {selectedNode.type}</p>
            <p className="text-sm text-gray-500">ID: {selectedNode.id}</p>
            {/* Show ICC results for nodes */}
            {selectedNode.data?.results && (
              <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">📊 Resultados de Simulación</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">ICC (kA):</span>
                    <span 
                      className="font-mono font-semibold px-2 py-1 rounded"
                      style={{
                        backgroundColor: selectedNode.data.results.isc ? getICCBackgroundColor(selectedNode.data.results.isc / 1000) : '#f3f4f6',
                        color: selectedNode.data.results.isc ? getICCTextColor(selectedNode.data.results.isc / 1000) : '#1f2937',
                        border: `1px solid ${selectedNode.data.results.isc ? getICCColor(selectedNode.data.results.isc / 1000) : '#6b7280'}`
                      }}
                    >
                      {selectedNode.data.results.isc?.toFixed(2) || 'N/A'}
                    </span>
                  </div>
                  {selectedNode.data.results.I_diseño && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">I Diseño (kA):</span>
                      <span className="font-mono font-semibold text-green-600">
                        {selectedNode.data.results.I_diseño?.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {selectedNode.data.results.estado && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Estado:</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        selectedNode.data.results.estado === 'OK' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedNode.data.results.estado}
                      </span>
                    </div>
                  )}
                  {/* ICC Level Indicator */}
                  {selectedNode.data.results.isc && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Nivel ICC:</span>
                        <span 
                          className="px-2 py-1 text-xs font-semibold rounded-full"
                          style={{
                            backgroundColor: selectedNode.data.results.isc ? getICCBackgroundColor(selectedNode.data.results.isc / 1000) : '#f3f4f6',
                            color: selectedNode.data.results.isc ? getICCTextColor(selectedNode.data.results.isc / 1000) : '#1f2937'
                          }}
                        >
                          {getICCLevel(selectedNode.data.results.isc / 1000).description}
                        </span>
                      </div>
                      <div className="mt-1 text-xs" style={{ color: getICCTextColor(selectedNode.data.results.isc / 1000) }}>
                        {getICCLevel(selectedNode.data.results.isc / 1000).range}
                      </div>
                      {getICCLevel(selectedNode.data.results.isc / 1000).warning && (
                        <div className="mt-1 text-xs text-amber-600">
                          ⚠️ {getICCLevel(selectedNode.data.results.isc / 1000).warning}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-700">Tipo: cable</p>
            <p className="text-sm text-gray-500">ID: {selectedEdge.id}</p>
            <p className="text-xs text-gray-400">De: {selectedEdge.source} → {selectedEdge.target}</p>
            {/* Show cable results */}
            {selectedEdge.data?.results && (
              <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">📊 Resultados de Cable</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cable:</span>
                    <span className="font-mono font-semibold text-blue-600">
                      {selectedEdge.data.results.cable || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">I Corriente (A):</span>
                    <span className="font-mono font-semibold text-orange-600">
                      {selectedEdge.data.results.I_corr?.toFixed(1) || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Caída Tensión (%):</span>
                    <span className="font-mono font-semibold text-yellow-600">
                      {selectedEdge.data.results.caida?.toFixed(1) || 'N/A'}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Estado:</span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      selectedEdge.data.results.estado === 'OK' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedEdge.data.results.estado}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selectedNode ? renderNodeFields() : renderEdgeFields()}

      {(selectedNode || selectedEdge) && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              if (selectedNode && confirm(`¿Eliminar ${selectedNode.type}?`)) {
                removeNode(selectedNode.id);
              } else if (selectedEdge && confirm('¿Eliminar conexión?')) {
                removeEdge(selectedEdge.id);
              }
            }}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition"
          >
            🗑️ Eliminar Elemento
          </button>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={handleSimulate}
          disabled={simulating}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {simulating ? 'Simulando...' : 'Simular ICC'}
        </button>
      </div>

      {simulationResults && (
        <div className="mt-4 p-4 bg-gray-50 rounded-md">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Resultados de Simulación</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <p>
              ICC:{' '}
              {simulationResults.icc_total_ka
                ? simulationResults.icc_total_ka
                : simulationResults.icc
                  ? simulationResults.icc.toFixed(2)
                  : simulationResults.resultsByNodeId
                    ? 'OK (ver nodos/edges)'
                    : '—'}{' '}
              kA
            </p>
            {simulationResults.icc_red_ka && <p>Red: {simulationResults.icc_red_ka} kA</p>}
            {simulationResults.icc_motores_ka && <p>Motores: {simulationResults.icc_motores_ka} kA</p>}
            {simulationResults.mva && <p>MVA: {simulationResults.mva.toFixed(2)}</p>}
          </div>
        </div>
      )}

      {shortCircuitResults && shortCircuitResults.success && (
        <div className="mt-4 p-4 bg-orange-50 rounded-md border border-orange-200">
          <h4 className="text-sm font-semibold text-orange-900 mb-2">Resultados de Cortocircuito</h4>
          <div className="text-xs text-orange-800 space-y-1">
            {shortCircuitResults.data && (
              <>
                {shortCircuitResults.data.I_3F_kA && <p>Icc 3F: {shortCircuitResults.data.I_3F_kA.toFixed(2)} kA</p>}
                {shortCircuitResults.data.I_1F_kA && <p>Icc 1F: {shortCircuitResults.data.I_1F_kA.toFixed(2)} kA</p>}
                {shortCircuitResults.data.I_2F_kA && <p>Icc 2F: {shortCircuitResults.data.I_2F_kA.toFixed(2)} kA</p>}
                {shortCircuitResults.data.V_min && <p>Voltaje mínimo: {shortCircuitResults.data.V_min.toFixed(1)}%</p>}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

PropertiesPanel.propTypes = {
  // No props - uses Zustand store
};
