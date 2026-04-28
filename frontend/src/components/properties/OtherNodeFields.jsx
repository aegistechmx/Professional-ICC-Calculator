import React, { useState } from 'react';

export default function OtherNodeFields({ node, updateNode }) {
  const [localParams, setLocalParams] = useState(node.data.parameters || {});

  const handleParamChange = (key, value) => {
    let parsedValue = value;
    if (typeof value === 'string' && value !== '') {
      parsedValue = parseFloat(value);
    }

    const validations = {
      tension: { min: 120, max: 500000 },
      fases: { min: 1, max: 3 },
      hp: { min: 0.1, max: 10000 },
      eficiencia: { min: 0.1, max: 1 },
      kVA: { min: 1, max: 100000 },
      voltaje: { min: 120, max: 500000 },
      fp: { min: 0.1, max: 1 },
      Xd: { min: 0.01, max: 1.0 }
    };

    const validation = validations[key];
    if (validation && parsedValue !== '') {
      if (parsedValue < validation.min || parsedValue > validation.max) {
        return;
      }
    }

    if (parsedValue === '' || !Number.isFinite(parsedValue)) {
      const defaults = {
        panel: { tension: 480, fases: 3 },
        motor: { hp: 50, voltaje: 480, eficiencia: 0.92, fp: 0.85 },
        generator: { kVA: 100, voltaje: 480, fp: 0.8, Xd: 0.15 }
      };
      const componentDefaults = defaults[node.type] || {};
      parsedValue = componentDefaults[key] || 0;
    }

    const newParams = { ...localParams, [key]: parsedValue };
    setLocalParams(newParams);
    updateNode(node.id, { parameters: newParams });
  };

  switch (node.type) {
    case 'panel':
      return (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tensión (V)</label>
            <input
              type="number"
              min="120"
              max="500000"
              step="1"
              placeholder="Ej: 480"
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

    case 'motor':
      return (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Potencia (HP)</label>
            <input
              type="number"
              min="0.1"
              max="50000"
              step="0.1"
              placeholder="Ej: 50"
              value={localParams.hp || ''}
              onChange={(e) => handleParamChange('hp', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Voltaje (V)</label>
            <input
              type="number"
              min="120"
              max="500000"
              step="1"
              placeholder="Ej: 480"
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
              min="0.1"
              max="1.0"
              placeholder="Ej: 0.92"
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
              min="0.1"
              max="1.0"
              placeholder="Ej: 0.85"
              value={localParams.fp || ''}
              onChange={(e) => handleParamChange('fp', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </>
      );

    case 'generator':
      return (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Potencia (kVA)</label>
            <input
              type="number"
              min="1"
              max="100000"
              step="0.1"
              placeholder="Ej: 100"
              value={localParams.kVA || ''}
              onChange={(e) => handleParamChange('kVA', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Voltaje (V)</label>
            <input
              type="number"
              min="120"
              max="500000"
              step="1"
              placeholder="Ej: 480"
              value={localParams.voltaje || ''}
              onChange={(e) => handleParamChange('voltaje', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Factor de Potencia</label>
            <input
              type="number"
              step="0.01"
              min="0.1"
              max="1.0"
              placeholder="Ej: 0.8"
              value={localParams.fp || ''}
              onChange={(e) => handleParamChange('fp', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Reactancia Subtransitoria (pu)</label>
            <input
              type="number"
              step="0.001"
              min="0.01"
              max="1.0"
              placeholder="Ej: 0.15"
              value={localParams.Xd || ''}
              onChange={(e) => handleParamChange('Xd', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </>
      );

    default:
      return <p className="text-sm text-gray-500">No hay propiedades disponibles</p>;
  }
}
