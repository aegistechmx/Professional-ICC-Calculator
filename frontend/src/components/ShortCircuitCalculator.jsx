import React, { useState } from 'react'
import { useShortCircuit } from '../hooks/useShortCircuit'

const ShortCircuitCalculator = () => {
  const [formError, setFormError] = useState(null)
  const [params, setParams] = useState({
    V_ll: '220',
    mode: 'conocido',
    isc_known_kA: '10',
    isc_source_kA: '25',
    xr_source: '15',
    trafo_kva: '500',
    trafo_z: '5.75',
    trafo_vp: '13200',
    trafo_vs: '480',
    grounding_type: 'yg_solido',
    r_tierra: '0',
  })

  const { calculateShortCircuit, loading, error, data } = useShortCircuit()

  const toFiniteNumber = value => {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }

  const handleCalculate = async () => {
    try {
      setFormError(null)

      const payload = {
        V_ll: toFiniteNumber(params.V_ll),
        mode: params.mode,
        xr_source: toFiniteNumber(params.xr_source),
        grounding_type: params.grounding_type,
        r_tierra: toFiniteNumber(params.r_tierra),
      }

      if (payload.V_ll == null || payload.V_ll <= 0)
        throw new Error('Voltage must be a number > 0')
      if (payload.xr_source == null || payload.xr_source <= 0)
        throw new Error('X/R Source must be a number > 0')
      if (payload.r_tierra == null || payload.r_tierra < 0)
        throw new Error('Ground resistance must be a number ≥ 0')

      if (params.mode === 'conocido') {
        payload.isc_known_kA = toFiniteNumber(params.isc_known_kA)
        if (payload.isc_known_kA == null || payload.isc_known_kA <= 0)
          throw new Error('Isc Known must be a number > 0 (kA)')
      } else {
        payload.isc_source_kA = toFiniteNumber(params.isc_source_kA)
        payload.trafo_kva = toFiniteNumber(params.trafo_kva)
        payload.trafo_z = toFiniteNumber(params.trafo_z)
        payload.trafo_vp = toFiniteNumber(params.trafo_vp)
        payload.trafo_vs = toFiniteNumber(params.trafo_vs)

        if (payload.isc_source_kA == null || payload.isc_source_kA <= 0)
          throw new Error('Isc Source must be a number > 0 (kA)')
        if (payload.trafo_kva == null || payload.trafo_kva <= 0)
          throw new Error('Trafo kVA must be a number > 0')
        if (payload.trafo_z == null || payload.trafo_z <= 0)
          throw new Error('Trafo Z% must be a number > 0')
        if (payload.trafo_vp == null || payload.trafo_vp <= 0)
          throw new Error('Trafo V Primary must be a number > 0')
        if (payload.trafo_vs == null || payload.trafo_vs <= 0)
          throw new Error('Trafo V Secondary must be a number > 0')
      }

      await calculateShortCircuit(payload)
    } catch (err) {
      setFormError(err.message || 'Invalid input')
    }
  }

  const handleChange = e => {
    setFormError(null)
    setParams({
      ...params,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">
        Short Circuit Calculator (API)
      </h2>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Voltage (V)</label>
          <input
            type="number"
            name="V_ll"
            value={params.V_ll}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Mode</label>
          <select
            name="mode"
            value={params.mode}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          >
            <option value="conocido">Known Isc</option>
            <option value="completo">Complete</option>
          </select>
        </div>

        {params.mode === 'conocido' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">
                Isc Known (kA)
              </label>
              <input
                type="number"
                name="isc_known_kA"
                value={params.isc_known_kA}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                X/R Source
              </label>
              <input
                type="number"
                name="xr_source"
                value={params.xr_source}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
          </>
        )}

        {params.mode === 'completo' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">
                Isc Source (kA)
              </label>
              <input
                type="number"
                name="isc_source_kA"
                value={params.isc_source_kA}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Trafo kVA
              </label>
              <input
                type="number"
                name="trafo_kva"
                value={params.trafo_kva}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Trafo Z%</label>
              <input
                type="number"
                name="trafo_z"
                value={params.trafo_z}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Trafo V Primary
              </label>
              <input
                type="number"
                name="trafo_vp"
                value={params.trafo_vp}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Trafo V Secondary
              </label>
              <input
                type="number"
                name="trafo_vs"
                value={params.trafo_vs}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">
            Grounding Type
          </label>
          <select
            name="grounding_type"
            value={params.grounding_type}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          >
            <option value="yg_solido">Yg Solid Grounded</option>
            <option value="yg_resistencia">Yg Resistance Grounded</option>
            <option value="delta">Delta</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleCalculate}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {loading ? 'Calculating...' : 'Calculate'}
      </button>

      {formError && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
          Error: {formError}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      {data && (
        <div className="mt-6 p-4 bg-gray-50 rounded">
          <h3 className="text-lg font-semibold mb-3">Results</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <strong>I_3F:</strong> {data.I_3F_kA.toFixed(4)} kA
            </div>
            <div>
              <strong>I_LG:</strong> {data.I_LG_kA.toFixed(4)} kA
            </div>
            <div>
              <strong>I_LL:</strong> {data.I_LL_kA.toFixed(4)} kA
            </div>
            <div>
              <strong>I_LLG:</strong> {data.I_LLG_kA.toFixed(4)} kA
            </div>
            <div>
              <strong>I_3F Peak:</strong> {data.I_3F_peak_kA.toFixed(4)} kA
            </div>
            <div>
              <strong>X/R:</strong> {data.XR.toFixed(2)}
            </div>
          </div>

          {data.warnings && data.warnings.length > 0 && (
            <div className="mt-3 p-2 bg-yellow-100 text-yellow-800 rounded">
              <strong>Warnings:</strong>
              <ul className="list-disc list-inside">
                {data.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ShortCircuitCalculator
