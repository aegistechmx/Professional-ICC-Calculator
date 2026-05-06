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
        <select
          value={localParams.potencia_kW || 10}
          onChange={e =>
            handleParamChange('potencia_kW', parseFloat(e.target.value))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccionar potencia...</option>
          <option value="0.5">0.5 kW</option>
          <option value="1">1 kW</option>
          <option value="2">2 kW</option>
          <option value="3">3 kW</option>
          <option value="5">5 kW</option>
          <option value="7.5">7.5 kW</option>
          <option value="10">10 kW</option>
          <option value="15">15 kW</option>
          <option value="20">20 kW</option>
          <option value="25">25 kW</option>
          <option value="30">30 kW</option>
          <option value="40">40 kW</option>
          <option value="50">50 kW</option>
          <option value="75">75 kW</option>
          <option value="100">100 kW</option>
          <option value="125">125 kW</option>
          <option value="150">150 kW</option>
          <option value="200">200 kW</option>
          <option value="250">250 kW</option>
          <option value="300">300 kW</option>
          <option value="400">400 kW</option>
          <option value="500">500 kW</option>
          <option value="600">600 kW</option>
          <option value="750">750 kW</option>
          <option value="1000">1000 kW</option>
          <option value="1500">1500 kW</option>
          <option value="2000">2000 kW</option>
          <option value="2500">2500 kW</option>
          <option value="3000">3000 kW</option>
          <option value="5000">5000 kW</option>
          <option value="10000">10000 kW</option>
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Potencia Reactiva Q (kVAR)
        </label>
        <select
          value={localParams.potencia_kVAR || 2}
          onChange={e =>
            handleParamChange('potencia_kVAR', parseFloat(e.target.value))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccionar potencia...</option>
          <option value="0">0 kVAR (Unidad)</option>
          <option value="0.5">0.5 kVAR</option>
          <option value="1">1 kVAR</option>
          <option value="2">2 kVAR</option>
          <option value="3">3 kVAR</option>
          <option value="4">4 kVAR</option>
          <option value="5">5 kVAR</option>
          <option value="7.5">7.5 kVAR</option>
          <option value="10">10 kVAR</option>
          <option value="15">15 kVAR</option>
          <option value="20">20 kVAR</option>
          <option value="25">25 kVAR</option>
          <option value="30">30 kVAR</option>
          <option value="40">40 kVAR</option>
          <option value="50">50 kVAR</option>
          <option value="75">75 kVAR</option>
          <option value="100">100 kVAR</option>
          <option value="150">150 kVAR</option>
          <option value="200">200 kVAR</option>
          <option value="300">300 kVAR</option>
          <option value="500">500 kVAR</option>
          <option value="750">750 kVAR</option>
          <option value="1000">1000 kVAR</option>
          <option value="1500">1500 kVAR</option>
          <option value="2000">2000 kVAR</option>
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Factor de Potencia
        </label>
        <select
          value={localParams.fp || 0.9}
          onChange={e => handleParamChange('fp', parseFloat(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccionar FP...</option>
          <option value="1.0">1.00 (Unidad)</option>
          <option value="0.99">0.99</option>
          <option value="0.98">0.98</option>
          <option value="0.97">0.97</option>
          <option value="0.96">0.96</option>
          <option value="0.95">0.95</option>
          <option value="0.94">0.94</option>
          <option value="0.93">0.93</option>
          <option value="0.92">0.92</option>
          <option value="0.91">0.91</option>
          <option value="0.90">0.90</option>
          <option value="0.89">0.89</option>
          <option value="0.88">0.88</option>
          <option value="0.87">0.87</option>
          <option value="0.86">0.86</option>
          <option value="0.85">0.85</option>
          <option value="0.84">0.84</option>
          <option value="0.83">0.83</option>
          <option value="0.82">0.82</option>
          <option value="0.81">0.81</option>
          <option value="0.80">0.80</option>
          <option value="0.75">0.75</option>
          <option value="0.70">0.70</option>
          <option value="0.65">0.65</option>
          <option value="0.60">0.60</option>
          <option value="0.55">0.55</option>
          <option value="0.50">0.50</option>
          <option value="0.45">0.45</option>
          <option value="0.40">0.40</option>
          <option value="0.35">0.35</option>
          <option value="0.30">0.30</option>
          <option value="0.25">0.25</option>
          <option value="0.20">0.20</option>
          <option value="0.15">0.15</option>
          <option value="0.10">0.10</option>
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Voltaje Nominal (V)
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
