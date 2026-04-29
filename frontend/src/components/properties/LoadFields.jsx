import React, { useState } from 'react'
import PropTypes from 'prop-types'

export default function LoadFields({ node, updateNode }) {
  const [localParams, setLocalParams] = useState(node.data.parameters || {})

  const handleParamChange = (key, value) => {
    let parsedValue = value
    if (typeof value === 'string' && value !== '') {
      parsedValue = parseFloat(value)
    }

    const validations = {
      potencia_kW: { min: 0.1, max: 100000 },
      potencia_kVAR: { min: -100000, max: 100000 },
      fp: { min: 0, max: 1 },
      voltaje: { min: 120, max: 500000 },
    }

    const validation = validations[key]
    if (validation && parsedValue !== '') {
      if (parsedValue < validation.min || parsedValue > validation.max) {
        return
      }
    }

    if (parsedValue === '' || !Number.isFinite(parsedValue)) {
      const defaults = {
        potencia_kW: 10,
        potencia_kVAR: 2,
        fp: 0.9,
        voltaje: 480,
      }
      parsedValue = defaults[key] || 0
    }

    const newParams = { ...localParams, [key]: parsedValue }
    setLocalParams(newParams)
    updateNode(node.id, { parameters: newParams })
  }

  return (
    <>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Potencia Activa P (kW)
        </label>
        <input
          type="number"
          min="0.1"
          max="100000"
          step="0.1"
          placeholder="Ej: 10"
          value={localParams.potencia_kW || ''}
          onChange={e =>
            handleParamChange('potencia_kW', parseFloat(e.target.value))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Potencia Reactiva Q (kVAR)
        </label>
        <input
          type="number"
          min="0"
          max="100000"
          step="0.1"
          placeholder="Ej: 2"
          value={localParams.potencia_kVAR || ''}
          onChange={e =>
            handleParamChange('potencia_kVAR', parseFloat(e.target.value))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Factor de Potencia
        </label>
        <input
          type="number"
          step="0.01"
          min="0.1"
          max="1.0"
          placeholder="Ej: 0.9"
          value={localParams.fp || ''}
          onChange={e => handleParamChange('fp', parseFloat(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Voltaje Nominal (V)
        </label>
        <input
          type="number"
          min="120"
          max="500000"
          step="1"
          placeholder="Ej: 480"
          value={localParams.voltaje || ''}
          onChange={e =>
            handleParamChange('voltaje', parseFloat(e.target.value))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </>
  )
}

LoadFields.propTypes = {
  node: PropTypes.shape({
    id: PropTypes.string,
    data: PropTypes.shape({
      parameters: PropTypes.object,
    }),
  }),
  updateNode: PropTypes.func,
}
