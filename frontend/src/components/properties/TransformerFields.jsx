import React, { useState } from 'react'
import PropTypes from 'prop-types'

export default function TransformerFields({ node, updateNode }) {
  const [localParams, setLocalParams] = useState(node.data.parameters || {})

  const handleParamChange = (key, value) => {
    let parsedValue = value
    if (typeof value === 'string' && value !== '') {
      parsedValue = parseFloat(value)
    }

    const validations = {
      kVA: { min: 1, max: 100000 },
      primario: { min: 120, max: 500000 },
      secundario: { min: 120, max: 35000 },
      Z: { min: 0.1, max: 20 },
    }

    const validation = validations[key]
    if (validation && parsedValue !== '') {
      if (parsedValue < validation.min || parsedValue > validation.max) {
        return
      }
    }

    if (parsedValue === '' || !Number.isFinite(parsedValue)) {
      const defaults = { kVA: 500, primario: 13200, secundario: 480, Z: 5.75 }
      parsedValue = defaults[key] || 0
    }

    const newParams = { ...localParams, [key]: parsedValue }
    setLocalParams(newParams)
    updateNode(node.id, { parameters: newParams })

    // 🔄 Propagar tensión secundaria a todos los equipos conectados
    if (key === 'secundario') {
      propagateSecondaryVoltage(parsedValue)
    }
  }

  // Función para propagar la tensión secundaria a equipos conectados
  const propagateSecondaryVoltage = (secondaryVoltage) => {
    // Importar el store para obtener todos los nodos
    const { useStore } = require('../store/useStore')
    const { nodes, edges } = useStore.getState()

    // Encontrar todos los equipos conectados a este transformador
    const connectedEquipment = []

    // Buscar equipos que reciben energía de este transformador
    edges.forEach(edge => {
      if (edge.source === node.id) {
        const targetNode = nodes.find(n => n.id === edge.target)
        if (targetNode && targetNode.type !== 'transformer') {
          connectedEquipment.push(targetNode)
        }
      }
    })

    // Actualizar la tensión de todos los equipos conectados
    connectedEquipment.forEach(equipment => {
      if (equipment.data && equipment.data.parameters) {
        const updatedParams = {
          ...equipment.data.parameters,
          tension: secondaryVoltage // Propagar la tensión secundaria
        }
        updateNode(equipment.id, { parameters: updatedParams })
      }
    })

  }

  return (
    <>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Potencia (kVA)
        </label>
        <select
          value={localParams.kVA || 500}
          onChange={e => handleParamChange('kVA', parseFloat(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccionar capacidad...</option>
          <option value="15">15 kVA</option>
          <option value="30">30 kVA</option>
          <option value="45">45 kVA</option>
          <option value="75">75 kVA</option>
          <option value="112.5">112.5 kVA</option>
          <option value="150">150 kVA</option>
          <option value="225">225 kVA</option>
          <option value="300">300 kVA</option>
          <option value="500">500 kVA</option>
          <option value="750">750 kVA</option>
          <option value="1000">1000 kVA</option>
          <option value="1500">1500 kVA</option>
          <option value="2000">2000 kVA</option>
          <option value="2500">2500 kVA</option>
          <option value="3000">3000 kVA</option>
          <option value="3750">3750 kVA</option>
          <option value="5000">5000 kVA</option>
          <option value="7500">7500 kVA</option>
          <option value="10000">10000 kVA</option>
          <option value="15000">15000 kVA</option>
          <option value="20000">20000 kVA</option>
          <option value="25000">25000 kVA</option>
          <option value="30000">30000 kVA</option>
          <option value="37500">37500 kVA</option>
          <option value="50000">50000 kVA</option>
          <option value="75000">75000 kVA</option>
          <option value="100000">100000 kVA</option>
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tensión Primaria (V)
        </label>
        <select
          value={localParams.primario || 23000}
          onChange={e =>
            handleParamChange('primario', parseFloat(e.target.value))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccionar tensión...</option>
          <option value="13200">13,200 V (Zona Rural/Turística)</option>
          <option value="13800">13,800 V (Personalizado)</option>
          <option value="23000">23,000 V (Zonas Urbanas)</option>
          <option value="34500">34,500 V</option>
          <option value="66000">66,000 V</option>
          <option value="115000">115,000 V</option>
          <option value="230000">230,000 V</option>
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tensión Secundaria (V)
        </label>
        <select
          value={localParams.secundario || 480}
          onChange={e =>
            handleParamChange('secundario', parseFloat(e.target.value))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccionar tensión...</option>
          <option value="480">480 V (3F)</option>
          <option value="220">220 V (3F)</option>
          <option value="208">208 V (3F)</option>
          <option value="127">127 V (1F)</option>
          <option value="240">240 V (1F)</option>
          <option value="120">120 V (1F)</option>
          <option value="277">277 V (3F)</option>
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Impedancia (%)
        </label>
        <input
          type="number"
          min="0.1"
          max="50"
          step="0.01"
          placeholder="Ej: 5.75"
          value={localParams.Z || ''}
          onChange={e => handleParamChange('Z', parseFloat(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </>
  )
}

TransformerFields.propTypes = {
  node: PropTypes.shape({
    id: PropTypes.string,
    data: PropTypes.shape({
      parameters: PropTypes.object,
    }),
  }),
  updateNode: PropTypes.func,
}
