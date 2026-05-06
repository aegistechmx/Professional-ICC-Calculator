import React, { useState } from 'react'
import PropTypes from 'prop-types'

export default function OtherNodeFields({ node, updateNode }) {
  const [localParams, setLocalParams] = useState(node.data.parameters || {})

  const handleParamChange = (key, value) => {
    let parsedValue = value
    if (typeof value === 'string' && value !== '') {
      parsedValue = parseFloat(value)
    }

    const validations = {
      tension: { min: 120, max: 500000 },
      fases: { min: 1, max: 3 },
      hp: { min: 0.1, max: 10000 },
      eficiencia: { min: 0.1, max: 1 },
      kVA: { min: 1, max: 100000 },
      voltaje: { min: 120, max: 500000 },
      fp: { min: 0.1, max: 1 },
      Xd: { min: 0.01, max: 1.0 },
    }

    const validation = validations[key]
    if (validation && parsedValue !== '') {
      if (parsedValue < validation.min || parsedValue > validation.max) {
        return
      }
    }

    if (parsedValue === '' || !Number.isFinite(parsedValue)) {
      const defaults = {
        panel: { tension: 480, fases: 3 },
        motor: { hp: 50, voltaje: 480, eficiencia: 0.92, fp: 0.85 },
        generator: { kVA: 100, voltaje: 480, fp: 0.8, Xd: 0.15 },
      }
      const componentDefaults = defaults[node.type] || {}
      parsedValue = componentDefaults[key] || 0
    }

    const newParams = { ...localParams, [key]: parsedValue }
    setLocalParams(newParams)
    updateNode(node.id, { parameters: newParams })
  }

  switch (node.type) {
    case 'panel':
      return (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tensión (V)
            </label>
            <select
              value={localParams.tension || 480}
              onChange={e =>
                handleParamChange('tension', parseFloat(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar tensión...</option>
              <option value="120">120 V (1F)</option>
              <option value="127">127 V (1F)</option>
              <option value="208">208 V (3F)</option>
              <option value="220">220 V (3F)</option>
              <option value="240">240 V (1F)</option>
              <option value="277">277 V (3F)</option>
              <option value="480">480 V (3F)</option>
              <option value="600">600 V (3F)</option>
              <option value="2400">2400 V (3F)</option>
              <option value="4160">4160 V (3F)</option>
              <option value="13200">13200 V (3F)</option>
              <option value="13800">13800 V (3F)</option>
              <option value="23000">23000 V (3F)</option>
              <option value="34500">34500 V (3F)</option>
              <option value="66000">66000 V (3F)</option>
              <option value="115000">115000 V (3F)</option>
              <option value="230000">230000 V (3F)</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fases
            </label>
            <select
              value={localParams.fases || 3}
              onChange={e =>
                handleParamChange('fases', parseInt(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>Monofásico</option>
              <option value={2}>Bifásico</option>
              <option value={3}>Trifásico</option>
            </select>
          </div>
        </>
      )

    case 'motor':
      return (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Potencia (HP)
            </label>
            <select
              value={localParams.hp || 50}
              onChange={e =>
                handleParamChange('hp', parseFloat(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar potencia...</option>
              <option value="0.5">0.5 HP</option>
              <option value="1">1 HP</option>
              <option value="2">2 HP</option>
              <option value="3">3 HP</option>
              <option value="5">5 HP</option>
              <option value="7.5">7.5 HP</option>
              <option value="10">10 HP</option>
              <option value="15">15 HP</option>
              <option value="20">20 HP</option>
              <option value="25">25 HP</option>
              <option value="30">30 HP</option>
              <option value="40">40 HP</option>
              <option value="50">50 HP</option>
              <option value="75">75 HP</option>
              <option value="100">100 HP</option>
              <option value="125">125 HP</option>
              <option value="150">150 HP</option>
              <option value="200">200 HP</option>
              <option value="250">250 HP</option>
              <option value="300">300 HP</option>
              <option value="400">400 HP</option>
              <option value="500">500 HP</option>
              <option value="600">600 HP</option>
              <option value="750">750 HP</option>
              <option value="1000">1000 HP</option>
              <option value="1500">1500 HP</option>
              <option value="2000">2000 HP</option>
              <option value="2500">2500 HP</option>
              <option value="3000">3000 HP</option>
              <option value="4000">4000 HP</option>
              <option value="5000">5000 HP</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Voltaje (V)
            </label>
            <select
              value={localParams.voltaje || 480}
              onChange={e =>
                handleParamChange('voltaje', parseFloat(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar voltaje...</option>
              <option value="120">120 V (1F)</option>
              <option value="127">127 V (1F)</option>
              <option value="208">208 V (3F)</option>
              <option value="220">220 V (3F)</option>
              <option value="240">240 V (1F)</option>
              <option value="277">277 V (3F)</option>
              <option value="480">480 V (3F)</option>
              <option value="600">600 V (3F)</option>
              <option value="2400">2400 V (3F)</option>
              <option value="4160">4160 V (3F)</option>
              <option value="13200">13200 V (3F)</option>
              <option value="13800">13800 V (3F)</option>
              <option value="23000">23000 V (3F)</option>
              <option value="34500">34500 V (3F)</option>
              <option value="66000">66000 V (3F)</option>
              <option value="115000">115000 V (3F)</option>
              <option value="230000">230000 V (3F)</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Eficiencia
            </label>
            <select
              value={localParams.eficiencia || 0.92}
              onChange={e =>
                handleParamChange('eficiencia', parseFloat(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar eficiencia...</option>
              <option value="0.70">70%</option>
              <option value="0.75">75%</option>
              <option value="0.80">80%</option>
              <option value="0.82">82%</option>
              <option value="0.84">84%</option>
              <option value="0.85">85%</option>
              <option value="0.86">86%</option>
              <option value="0.87">87%</option>
              <option value="0.88">88%</option>
              <option value="0.89">89%</option>
              <option value="0.90">90%</option>
              <option value="0.91">91%</option>
              <option value="0.92">92% (Estándar)</option>
              <option value="0.93">93%</option>
              <option value="0.94">94%</option>
              <option value="0.95">95% (Premium)</option>
              <option value="0.96">96%</option>
              <option value="0.97">97%</option>
              <option value="0.98">98%</option>
              <option value="0.99">99%</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Factor de Potencia
            </label>
            <select
              value={localParams.fp || 0.85}
              onChange={e =>
                handleParamChange('fp', parseFloat(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar FP...</option>
              <option value="0.70">0.70</option>
              <option value="0.75">0.75</option>
              <option value="0.80">0.80</option>
              <option value="0.82">0.82</option>
              <option value="0.83">0.83</option>
              <option value="0.84">0.84</option>
              <option value="0.85">0.85 (Típico)</option>
              <option value="0.86">0.86</option>
              <option value="0.87">0.87</option>
              <option value="0.88">0.88</option>
              <option value="0.89">0.89</option>
              <option value="0.90">0.90</option>
              <option value="0.91">0.91</option>
              <option value="0.92">0.92</option>
              <option value="0.93">0.93</option>
              <option value="0.94">0.94</option>
              <option value="0.95">0.95</option>
              <option value="0.96">0.96</option>
              <option value="0.97">0.97</option>
              <option value="0.98">0.98</option>
              <option value="0.99">0.99</option>
              <option value="1.00">1.00 (Unidad)</option>
            </select>
          </div>
        </>
      )

    case 'generator':
      return (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Potencia (kVA)
            </label>
            <select
              value={localParams.kVA || 100}
              onChange={e =>
                handleParamChange('kVA', parseFloat(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar potencia...</option>
              <option value="10">10 kVA</option>
              <option value="15">15 kVA</option>
              <option value="20">20 kVA</option>
              <option value="25">25 kVA</option>
              <option value="30">30 kVA</option>
              <option value="40">40 kVA</option>
              <option value="50">50 kVA</option>
              <option value="75">75 kVA</option>
              <option value="100">100 kVA</option>
              <option value="125">125 kVA</option>
              <option value="150">150 kVA</option>
              <option value="200">200 kVA</option>
              <option value="250">250 kVA</option>
              <option value="300">300 kVA</option>
              <option value="400">400 kVA</option>
              <option value="500">500 kVA</option>
              <option value="600">600 kVA</option>
              <option value="750">750 kVA</option>
              <option value="1000">1000 kVA</option>
              <option value="1250">1250 kVA</option>
              <option value="1500">1500 kVA</option>
              <option value="2000">2000 kVA</option>
              <option value="2500">2500 kVA</option>
              <option value="3000">3000 kVA</option>
              <option value="4000">4000 kVA</option>
              <option value="5000">5000 kVA</option>
              <option value="7500">7500 kVA</option>
              <option value="10000">10000 kVA</option>
              <option value="15000">15000 kVA</option>
              <option value="20000">20000 kVA</option>
              <option value="25000">25000 kVA</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Voltaje (V)
            </label>
            <select
              value={localParams.voltaje || 480}
              onChange={e =>
                handleParamChange('voltaje', parseFloat(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar voltaje...</option>
              <option value="120">120 V (1F)</option>
              <option value="127">127 V (1F)</option>
              <option value="208">208 V (3F)</option>
              <option value="220">220 V (3F)</option>
              <option value="240">240 V (1F)</option>
              <option value="277">277 V (3F)</option>
              <option value="480">480 V (3F)</option>
              <option value="600">600 V (3F)</option>
              <option value="2400">2400 V (3F)</option>
              <option value="4160">4160 V (3F)</option>
              <option value="13200">13200 V (3F)</option>
              <option value="13800">13800 V (3F)</option>
              <option value="23000">23000 V (3F)</option>
              <option value="34500">34500 V (3F)</option>
              <option value="66000">66000 V (3F)</option>
              <option value="115000">115000 V (3F)</option>
              <option value="230000">230000 V (3F)</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Factor de Potencia
            </label>
            <select
              value={localParams.fp || 0.8}
              onChange={e =>
                handleParamChange('fp', parseFloat(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar FP...</option>
              <option value="0.70">0.70</option>
              <option value="0.75">0.75</option>
              <option value="0.80">0.80 (Típico)</option>
              <option value="0.82">0.82</option>
              <option value="0.83">0.83</option>
              <option value="0.84">0.84</option>
              <option value="0.85">0.85</option>
              <option value="0.86">0.86</option>
              <option value="0.87">0.87</option>
              <option value="0.88">0.88</option>
              <option value="0.90">0.90</option>
              <option value="0.92">0.92</option>
              <option value="0.94">0.94</option>
              <option value="0.95">0.95</option>
              <option value="0.96">0.96</option>
              <option value="0.98">0.98</option>
              <option value="1.00">1.00 (Unidad)</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reactancia Subtransitoria (pu)
            </label>
            <select
              value={localParams.Xd || 0.15}
              onChange={e =>
                handleParamChange('Xd', parseFloat(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar reactancia...</option>
              <option value="0.05">0.05 (Muy Baja)</option>
              <option value="0.08">0.08</option>
              <option value="0.10">0.10</option>
              <option value="0.12">0.12</option>
              <option value="0.15">0.15 (Típico)</option>
              <option value="0.18">0.18</option>
              <option value="0.20">0.20</option>
              <option value="0.22">0.22</option>
              <option value="0.25">0.25</option>
              <option value="0.28">0.28</option>
              <option value="0.30">0.30</option>
              <option value="0.35">0.35</option>
              <option value="0.40">0.40</option>
              <option value="0.45">0.45</option>
              <option value="0.50">0.50</option>
              <option value="0.60">0.60</option>
              <option value="0.70">0.70</option>
              <option value="0.80">0.80</option>
              <option value="0.90">0.90</option>
              <option value="1.00">1.00 (Muy Alta)</option>
            </select>
          </div>
        </>
      )

    default:
      return (
        <p className="text-sm text-gray-500">No hay propiedades disponibles</p>
      )
  }
}

OtherNodeFields.propTypes = {
  node: PropTypes.shape({
    id: PropTypes.string,
    type: PropTypes.string,
    data: PropTypes.shape({
      parameters: PropTypes.object,
    }),
  }),
  updateNode: PropTypes.func,
}
