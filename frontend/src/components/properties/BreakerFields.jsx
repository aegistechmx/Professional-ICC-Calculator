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
        <select
          value={localParams.In ?? 100}
          onChange={e => handleParamChange('In', parseFloat(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccionar corriente...</option>
          <option value="0.5">0.5 A</option>
          <option value="1">1 A</option>
          <option value="2">2 A</option>
          <option value="3">3 A</option>
          <option value="5">5 A</option>
          <option value="6">6 A</option>
          <option value="10">10 A</option>
          <option value="15">15 A</option>
          <option value="20">20 A</option>
          <option value="25">25 A</option>
          <option value="30">30 A</option>
          <option value="35">35 A</option>
          <option value="40">40 A</option>
          <option value="45">45 A</option>
          <option value="50">50 A</option>
          <option value="60">60 A</option>
          <option value="70">70 A</option>
          <option value="80">80 A</option>
          <option value="90">90 A</option>
          <option value="100">100 A</option>
          <option value="125">125 A</option>
          <option value="150">150 A</option>
          <option value="175">175 A</option>
          <option value="200">200 A</option>
          <option value="225">225 A</option>
          <option value="250">250 A</option>
          <option value="300">300 A</option>
          <option value="350">350 A</option>
          <option value="400">400 A</option>
          <option value="500">500 A</option>
          <option value="600">600 A</option>
          <option value="800">800 A</option>
          <option value="1000">1000 A</option>
          <option value="1200">1200 A</option>
          <option value="1600">1600 A</option>
          <option value="2000">2000 A</option>
          <option value="2500">2500 A</option>
          <option value="3000">3000 A</option>
          <option value="4000">4000 A</option>
          <option value="5000">5000 A</option>
          <option value="6300">6300 A</option>
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Capacidad de Interrupción (A)
        </label>
        <select
          value={localParams.Icu ?? 25000}
          onChange={e => handleParamChange('Icu', parseFloat(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccionar capacidad...</option>
          <option value="1500">1.5 kA</option>
          <option value="2500">2.5 kA</option>
          <option value="3000">3 kA</option>
          <option value="5000">5 kA</option>
          <option value="6000">6 kA</option>
          <option value="10000">10 kA</option>
          <option value="15000">15 kA</option>
          <option value="18000">18 kA</option>
          <option value="20000">20 kA</option>
          <option value="25000">25 kA</option>
          <option value="30000">30 kA</option>
          <option value="35000">35 kA</option>
          <option value="40000">40 kA</option>
          <option value="42000">42 kA</option>
          <option value="50000">50 kA</option>
          <option value="60000">60 kA</option>
          <option value="65000">65 kA</option>
          <option value="70000">70 kA</option>
          <option value="75000">75 kA</option>
          <option value="80000">80 kA</option>
          <option value="85000">85 kA</option>
          <option value="100000">100 kA</option>
          <option value="120000">120 kA</option>
          <option value="150000">150 kA</option>
          <option value="200000">200 kA</option>
        </select>
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
