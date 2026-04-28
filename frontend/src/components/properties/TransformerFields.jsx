import React, { useState } from 'react';

export default function TransformerFields({ node, updateNode }) {
  const [localParams, setLocalParams] = useState(node.data.parameters || {});

  const handleParamChange = (key, value) => {
    let parsedValue = value;
    if (typeof value === 'string' && value !== '') {
      parsedValue = parseFloat(value);
    }

    const validations = {
      kVA: { min: 1, max: 100000 },
      primario: { min: 120, max: 500000 },
      secundario: { min: 120, max: 35000 },
      Z: { min: 0.1, max: 20 }
    };

    const validation = validations[key];
    if (validation && parsedValue !== '') {
      if (parsedValue < validation.min || parsedValue > validation.max) {
        return;
      }
    }

    if (parsedValue === '' || !Number.isFinite(parsedValue)) {
      const defaults = { kVA: 500, primario: 13200, secundario: 480, Z: 5.75 };
      parsedValue = defaults[key] || 0;
    }

    const newParams = { ...localParams, [key]: parsedValue };
    setLocalParams(newParams);
    updateNode(node.id, { parameters: newParams });
  };

  return (
    <>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Potencia (kVA)</label>
        <input
          type="number"
          min="1"
          max="100000"
          step="0.1"
          placeholder="Ej: 500"
          value={localParams.kVA || ''}
          onChange={(e) => handleParamChange('kVA', parseFloat(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Tensión Primaria (V)</label>
        <input
          type="number"
          min="120"
          max="500000"
          step="1"
          placeholder="Ej: 13200"
          value={localParams.primario || ''}
          onChange={(e) => handleParamChange('primario', parseFloat(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Tensión Secundaria (V)</label>
        <input
          type="number"
          min="120"
          max="35000"
          step="1"
          placeholder="Ej: 480"
          value={localParams.secundario || ''}
          onChange={(e) => handleParamChange('secundario', parseFloat(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Impedancia (%)</label>
        <input
          type="number"
          min="0.1"
          max="50"
          step="0.01"
          placeholder="Ej: 5.75"
          value={localParams.Z || ''}
          onChange={(e) => handleParamChange('Z', parseFloat(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </>
  );
}
