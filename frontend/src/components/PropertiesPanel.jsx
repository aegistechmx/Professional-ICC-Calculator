import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useStore } from '../store/useStore';

export default function PropertiesPanel() {
  const { selectedNode, updateNode, calculateICC } = useStore();
  const [localParams, setLocalParams] = useState({});
  const [simulating, setSimulating] = useState(false);
  const [simulationResults, setSimulationResults] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (selectedNode) {
      setLocalParams(selectedNode.data.parameters || {});
      setSimulationResults(null);
      setError(null); // Clear error when node changes
    }
  }, [selectedNode]);

  if (!selectedNode) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Propiedades</h3>
        <p className="text-sm text-gray-500">Selecciona un elemento para ver sus propiedades</p>
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

  const handleParamChange = (key, value) => {
    let parsedValue = value;
    if (typeof value === 'string' && value !== '') {
      parsedValue = parseFloat(value);
    }

    // Validation based on parameter type
    const validations = {
      In: { min: 1, max: 10000 },
      Icu: { min: 1, max: 200000 },
      kVA: { min: 1, max: 100000 },
      primario: { min: 120, max: 500000 },
      secundario: { min: 120, max: 35000 },
      Z: { min: 0.1, max: 20 },
      tension: { min: 120, max: 500000 },
      potencia_kW: { min: 0.1, max: 100000 },
      potencia_kVAR: { min: -100000, max: 100000 },
      fp: { min: 0, max: 1 },
      hp: { min: 0.1, max: 10000 },
      eficiencia: { min: 0.1, max: 1 }
    };

    const validation = validations[key];
    if (validation && parsedValue !== '') {
      if (parsedValue < validation.min || parsedValue > validation.max) {
        console.warn(`${key} out of range: ${parsedValue} (valid: ${validation.min}-${validation.max})`);
      }
    }

    const newParams = { ...localParams, [key]: parsedValue };
    setLocalParams(newParams);
    updateNode(selectedNode.id, { parameters: newParams });
  };

  const handleSimulate = async () => {
    setSimulating(true);
    setError(null); // Clear previous error
    try {
      const results = await calculateICC();
      setSimulationResults(results);
    } catch (error) {
      console.error('Simulation error:', error);
      // Use proper error handling instead of alert
      setError('Error al simular: ' + error.message);
    } finally {
      setSimulating(false);
    }
  };

  const renderFields = () => {
    switch (selectedNode.type) {
      case 'breaker':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Corriente Nominal (A)</label>
              <input
                type="number"
                value={localParams.In || ''}
                onChange={(e) => handleParamChange('In', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacidad de Interrupción (A)</label>
              <input
                type="number"
                value={localParams.Icu || ''}
                onChange={(e) => handleParamChange('Icu', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={localParams.tipo || 'molded_case'}
                onChange={(e) => handleParamChange('tipo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="molded_case">Molded Case</option>
                <option value="air_circuit">Air Circuit</option>
                <option value="miniature">Miniature</option>
              </select>
            </div>
          </>
        );

      case 'transformer':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Potencia (kVA)</label>
              <input
                type="number"
                value={localParams.kVA || ''}
                onChange={(e) => handleParamChange('kVA', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tensión Primaria (V)</label>
              <input
                type="number"
                value={localParams.primario || ''}
                onChange={(e) => handleParamChange('primario', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tensión Secundaria (V)</label>
              <input
                type="number"
                value={localParams.secundario || ''}
                onChange={(e) => handleParamChange('secundario', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Impedancia (%)</label>
              <input
                type="number"
                step="0.01"
                value={localParams.Z || ''}
                onChange={(e) => handleParamChange('Z', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        );

      case 'panel':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tensión (V)</label>
              <input
                type="number"
                value={localParams.tension || ''}
                onChange={(e) => handleParamChange('tension', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Fases</label>
              <select
                value={localParams.fases || 3}
                onChange={(e) => handleParamChange('fases', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>Monofásico</option>
                <option value={2}>Bifásico</option>
                <option value={3}>Trifásico</option>
              </select>
            </div>
          </>
        );

      case 'load':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Potencia Activa P (kW)</label>
              <input
                type="number"
                value={localParams.potencia_kW || ''}
                onChange={(e) => handleParamChange('potencia_kW', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Potencia Reactiva Q (kVAR)</label>
              <input
                type="number"
                value={localParams.potencia_kVAR || ''}
                onChange={(e) => handleParamChange('potencia_kVAR', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Factor de Potencia</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={localParams.fp || ''}
                onChange={(e) => handleParamChange('fp', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Voltaje Nominal (V)</label>
              <input
                type="number"
                value={localParams.voltaje || ''}
                onChange={(e) => handleParamChange('voltaje', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        );

      case 'motor':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Potencia (HP)</label>
              <input
                type="number"
                value={localParams.hp || ''}
                onChange={(e) => handleParamChange('hp', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Voltaje (V)</label>
              <input
                type="number"
                value={localParams.voltaje || ''}
                onChange={(e) => handleParamChange('voltaje', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Eficiencia</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={localParams.eficiencia || ''}
                onChange={(e) => handleParamChange('eficiencia', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Factor de Potencia</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={localParams.fp || ''}
                onChange={(e) => handleParamChange('fp', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        );

      default:
        return <p className="text-sm text-gray-500">No hay propiedades disponibles</p>;
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Propiedades</h3>

      <div className="mb-4 pb-4 border-b border-gray-200">
        <p className="text-sm font-medium text-gray-700">Tipo: {selectedNode.type}</p>
        <p className="text-sm text-gray-500">ID: {selectedNode.id}</p>
      </div>

      {renderFields()}

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
            <p>ICC: {simulationResults.icc_total_ka || simulationResults.icc?.toFixed(2)} kA</p>
            {simulationResults.icc_red_ka && <p>Red: {simulationResults.icc_red_ka} kA</p>}
            {simulationResults.icc_motores_ka && <p>Motores: {simulationResults.icc_motores_ka} kA</p>}
            {simulationResults.mva && <p>MVA: {simulationResults.mva.toFixed(2)}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

PropertiesPanel.propTypes = {
  // No props - uses Zustand store
};
