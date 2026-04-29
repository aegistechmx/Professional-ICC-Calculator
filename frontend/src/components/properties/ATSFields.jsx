import React from 'react'
import PropTypes from 'prop-types'

export default function ATSFields({ node, updateNode }) {
  const handleChange = (field, value) => {
    updateNode(node.id, {
      ...node.data,
      parameters: {
        ...node.data.parameters,
        [field]: value,
      },
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Modo de Operación
        </label>
        <select
          value={node.data?.parameters?.mode || 'normal'}
          onChange={e => handleChange('mode', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="normal">Normal (Transformador)</option>
          <option value="emergency">Emergencia (Generador)</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          {node.data?.parameters?.mode === 'normal'
            ? 'Alimentado desde el transformador principal'
            : 'Alimentado desde el generador de emergencia'}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tiempo de Transferencia (segundos)
        </label>
        <input
          type="number"
          value={node.data?.parameters?.transferTime || 10}
          onChange={e => handleChange('transferTime', Number(e.target.value))}
          min="0"
          max="60"
          step="1"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Tiempo que tarda el ATS en cambiar de fuente
        </p>
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">
          📋 Información ATS
        </h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>
            • <strong>Normal:</strong> Transformador → ATS → Cargas
          </li>
          <li>
            • <strong>Emergencia:</strong> Generador → ATS → Cargas
          </li>
          <li>• Transferencia automática sin interrupción</li>
          <li>• Tiempo típico: 10-30 segundos</li>
        </ul>
      </div>

      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
        <h4 className="text-sm font-semibold text-yellow-900 mb-2">
          ⚠️ Consideraciones
        </h4>
        <ul className="text-xs text-yellow-800 space-y-1">
          <li>• El generador debe tener capacidad suficiente</li>
          <li>• Verificar sincronización de voltajes</li>
          <li>• Mantenimiento periódico recomendado</li>
        </ul>
      </div>
    </div>
  )
}

ATSFields.propTypes = {
  node: PropTypes.shape({
    id: PropTypes.string,
    data: PropTypes.shape({
      parameters: PropTypes.object,
    }),
  }),
  updateNode: PropTypes.func,
}
