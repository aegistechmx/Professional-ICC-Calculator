import React, { useState } from 'react'
import PropTypes from 'prop-types'

export default function GeneratorATSFields({ node, updateNode }) {
  const [localParams, setLocalParams] = useState(node.data.parameters || {})

  const handleParamChange = (key, value) => {
    let parsedValue = value
    if (typeof value === 'string' && value !== '') {
      parsedValue = parseFloat(value)
    }

    const validations = {
      transferTime: { min: 0, max: 300 },
      startDelay: { min: 0, max: 60 },
      coolDownTime: { min: 0, max: 300 },
      fuelCapacity: { min: 1, max: 10000 },
      fuelConsumption: { min: 0.1, max: 100 },
      autoStart: { min: 0, max: 1 },
      weeklyTest: { min: 0, max: 1 },
      loadType: { min: 1, max: 3 },
    }

    const validation = validations[key]
    if (validation && parsedValue !== '') {
      if (parsedValue < validation.min || parsedValue > validation.max) {
        return
      }
    }

    if (parsedValue === '' || !Number.isFinite(parsedValue)) {
      const defaults = {
        transferTime: 30,
        startDelay: 10,
        coolDownTime: 300,
        fuelCapacity: 500,
        fuelConsumption: 15,
        autoStart: 1,
        weeklyTest: 1,
        loadType: 1,
      }
      parsedValue = defaults[key] || 0
    }

    const newParams = { ...localParams, [key]: parsedValue }
    setLocalParams(newParams)
    updateNode(node.id, { parameters: newParams })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Modo de Operación
        </label>
        <select
          value={localParams.mode || 'auto'}
          onChange={e => handleParamChange('mode', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="auto">Automático</option>
          <option value="manual">Manual</option>
          <option value="test">Prueba</option>
          <option value="maintenance">Mantenimiento</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          {localParams.mode === 'auto'
            ? 'Transferencia automática cuando falle la red principal'
            : localParams.mode === 'manual'
            ? 'Operación manual mediante interruptores'
            : localParams.mode === 'test'
            ? 'Modo de prueba sin transferencia real'
            : 'Modo mantenimiento - sin transferencia'}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tiempo de Transferencia (segundos)
        </label>
        <select
          value={localParams.transferTime || 30}
          onChange={e => handleParamChange('transferTime', Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccionar tiempo...</option>
          <option value="5">5 segundos (Rápido)</option>
          <option value="10">10 segundos</option>
          <option value="15">15 segundos</option>
          <option value="20">20 segundos</option>
          <option value="30">30 segundos (Estándar)</option>
          <option value="45">45 segundos</option>
          <option value="60">60 segundos</option>
          <option value="90">90 segundos</option>
          <option value="120">120 segundos (Lento)</option>
          <option value="180">180 segundos</option>
          <option value="300">300 segundos (Muy Lento)</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Tiempo máximo para transferir carga al generador
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Retardo de Arranque (segundos)
        </label>
        <select
          value={localParams.startDelay || 10}
          onChange={e => handleParamChange('startDelay', Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccionar retardo...</option>
          <option value="0">0 segundos (Instantáneo)</option>
          <option value="5">5 segundos</option>
          <option value="10">10 segundos (Típico)</option>
          <option value="15">15 segundos</option>
          <option value="20">20 segundos</option>
          <option value="30">30 segundos</option>
          <option value="45">45 segundos</option>
          <option value="60">60 segundos</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Tiempo de espera antes de arrancar el generador
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tiempo de Enfriamiento (segundos)
        </label>
        <select
          value={localParams.coolDownTime || 300}
          onChange={e => handleParamChange('coolDownTime', Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccionar tiempo...</option>
          <option value="60">1 minuto</option>
          <option value="120">2 minutos</option>
          <option value="180">3 minutos</option>
          <option value="300">5 minutos (Estándar)</option>
          <option value="600">10 minutos</option>
          <option value="900">15 minutos</option>
          <option value="1200">20 minutos</option>
          <option value="1800">30 minutos</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Tiempo de enfriamiento del generador antes de apagar
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Capacidad de Combustible (litros)
        </label>
        <select
          value={localParams.fuelCapacity || 500}
          onChange={e => handleParamChange('fuelCapacity', Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccionar capacidad...</option>
          <option value="50">50 litros</option>
          <option value="100">100 litros</option>
          <option value="200">200 litros</option>
          <option value="300">300 litros</option>
          <option value="500">500 litros (Estándar)</option>
          <option value="750">750 litros</option>
          <option value="1000">1000 litros</option>
          <option value="1500">1500 litros</option>
          <option value="2000">2000 litros</option>
          <option value="3000">3000 litros</option>
          <option value="5000">5000 litros</option>
          <option value="10000">10000 litros</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Capacidad total del tanque de combustible
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Consumo de Combustible (L/hora)
        </label>
        <select
          value={localParams.fuelConsumption || 15}
          onChange={e => handleParamChange('fuelConsumption', Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccionar consumo...</option>
          <option value="1">1 L/hora</option>
          <option value="2">2 L/hora</option>
          <option value="5">5 L/hora</option>
          <option value="10">10 L/hora</option>
          <option value="15">15 L/hora (Típico)</option>
          <option value="20">20 L/hora</option>
          <option value="25">25 L/hora</option>
          <option value="30">30 L/hora</option>
          <option value="40">40 L/hora</option>
          <option value="50">50 L/hora</option>
          <option value="75">75 L/hora</option>
          <option value="100">100 L/hora</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Consumo de combustible al 75% de carga
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tipo de Carga
        </label>
        <select
          value={localParams.loadType || 1}
          onChange={e => handleParamChange('loadType', Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccionar tipo...</option>
          <option value="1">Carga Total (100%)</option>
          <option value="2">Carga Parcial (50-75%)</option>
          <option value="3">Carga Esencial (25-50%)</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Porcentaje de carga que soporta el generador
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Arranque Automático
          </label>
          <select
            value={localParams.autoStart || 1}
            onChange={e => handleParamChange('autoStart', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1">Habilitado</option>
            <option value="0">Deshabilitado</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prueba Semanal
          </label>
          <select
            value={localParams.weeklyTest || 1}
            onChange={e => handleParamChange('weeklyTest', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1">Habilitada</option>
            <option value="0">Deshabilitada</option>
          </select>
        </div>
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">
          {localParams.mode === 'test' ? '  Modo de Prueba ATS' : '  Información ATS Generador'}
        </h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>
            <strong>Normal:</strong> Red Principal ATS Cargas
          </li>
          <li>
            <strong>Emergencia:</strong> Generador ATS Cargas
          </li>
          <li>
            <strong>Transferencia:</strong> Sin interrupción de energía
          </li>
          <li>
            <strong>Autonomía:</strong> {Math.round((localParams.fuelCapacity || 500) / (localParams.fuelConsumption || 15))} horas
          </li>
        </ul>
      </div>

      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
        <h4 className="text-sm font-semibold text-yellow-900 mb-2">
          {localParams.mode === 'maintenance' ? '  Mantenimiento Activo' : '  Consideraciones Generador'}
        </h4>
        <ul className="text-xs text-yellow-800 space-y-1">
          <li>El generador debe tener capacidad para la carga total</li>
          <li>Verificar sincronización de voltajes y frecuencias</li>
          <li>Mantenimiento mensual recomendado</li>
          <li>Prueba semanal de funcionamiento</li>
          <li>Nivel de combustible mínimo: 20%</li>
        </ul>
      </div>
    </div>
  )
}

GeneratorATSFields.propTypes = {
  node: PropTypes.shape({
    id: PropTypes.string,
    data: PropTypes.shape({
      parameters: PropTypes.object,
    }),
  }),
  updateNode: PropTypes.func,
}
