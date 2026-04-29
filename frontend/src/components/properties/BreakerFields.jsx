import React, { useState } from 'react'
import PropTypes from 'prop-types'

export default function BreakerFields({ node, updateNode }) {
  const [localParams, setLocalParams] = useState(node.data.parameters || {})

  const handleParamChange = (key, value) => {
    let parsedValue = value
    if (typeof value === 'string' && value !== '') {
      parsedValue = parseFloat(value)
    }

    const validations = {
      In: { min: 1, max: 10000 },
      Icu: { min: 1, max: 200000 },
    }

    const validation = validations[key]
    if (validation && parsedValue !== '') {
      if (parsedValue < validation.min || parsedValue > validation.max) {
        return
      }
    }

    if (parsedValue === '' || !Number.isFinite(parsedValue)) {
      const defaults = { In: 100, Icu: 25000 }
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
          Corriente Nominal (A)
        </label>
        <input
          type="number"
          min="0.1"
          max="100000"
          step="0.1"
          placeholder="Ej: 100"
          value={localParams.In ?? ''}
          onChange={e => handleParamChange('In', parseFloat(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Capacidad de Interrupción (A)
        </label>
        <input
          type="number"
          min="1"
          max="200000"
          step="1"
          placeholder="Ej: 25000"
          value={localParams.Icu ?? ''}
          onChange={e => handleParamChange('Icu', parseFloat(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tipo
        </label>
        <select
          value={localParams.tipo || 'molded_case'}
          onChange={e => handleParamChange('tipo', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="molded_case">Molded Case</option>
          <option value="air_circuit">Air Circuit</option>
          <option value="miniature">Miniature</option>
        </select>
      </div>
    </>
  )
}

BreakerFields.propTypes = {
  node: PropTypes.shape({
    id: PropTypes.string,
    data: PropTypes.shape({
      parameters: PropTypes.object,
    }),
  }),
  updateNode: PropTypes.func,
}
