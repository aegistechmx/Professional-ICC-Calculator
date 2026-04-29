import React from 'react'
import PropTypes from 'prop-types'
import { getICCLevel } from '../utils/iccColoring'

/**
 * Technical Tooltip Component
 * Displays detailed electrical parameters with proper formatting
 */
export default function TechnicalTooltip({ data, type = 'node' }) {
  if (!data) return null

  const renderNodeTooltip = () => {
    const { results, parameters } = data

    return (
      <div className="p-3 bg-white rounded-lg shadow-lg border border-gray-200 min-w-64">
        <h4 className="text-sm font-semibold text-gray-900 mb-2 border-b border-gray-200 pb-1">
          📊 Parámetros Técnicos
        </h4>

        {/* ICC Information */}
        {results?.isc && (
          <div className="mb-3">
            <h5 className="text-xs font-medium text-gray-700 mb-1">
              Corriente de Falla (ICC)
            </h5>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">ICC (A):</span>
                <span className="font-mono font-semibold text-blue-600">
                  {results.isc.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">ICC (kA):</span>
                <span
                  className="font-mono font-semibold px-1 rounded"
                  style={{
                    backgroundColor: getICCLevel(results.isc / 1000).bgColor,
                    color: getICCLevel(results.isc / 1000).textColor,
                  }}
                >
                  {(results.isc / 1000).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Nivel:</span>
                <span
                  className="px-1 rounded text-xs"
                  style={{
                    backgroundColor: getICCLevel(results.isc / 1000).bgColor,
                    color: getICCLevel(results.isc / 1000).textColor,
                  }}
                >
                  {getICCLevel(results.isc / 1000).description}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Impedance Information */}
        {results?.impedance && (
          <div className="mb-3">
            <h5 className="text-xs font-medium text-gray-700 mb-1">
              Impedancia Total
            </h5>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Z (Ω):</span>
                <span className="font-mono font-semibold text-purple-600">
                  {results.impedance.Z?.toFixed(4) || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">R (Ω):</span>
                <span className="font-mono font-semibold text-orange-600">
                  {results.impedance.R?.toFixed(4) || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">X (Ω):</span>
                <span className="font-mono font-semibold text-green-600">
                  {results.impedance.X?.toFixed(4) || 'N/A'}
                </span>
              </div>
              {results.impedance.Z && results.impedance.R && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">X/R:</span>
                  <span className="font-mono font-semibold text-indigo-600">
                    {(results.impedance.X / results.impedance.R).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Voltage Drop Information */}
        {results?.voltageDrop !== undefined && (
          <div className="mb-3">
            <h5 className="text-xs font-medium text-gray-700 mb-1">
              Caída de Tensión
            </h5>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Caída (V):</span>
                <span className="font-mono font-semibold text-yellow-600">
                  {results.voltageDrop?.toFixed(2) || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Caída (%):</span>
                <span className="font-mono font-semibold text-red-600">
                  {results.voltageDrop_pct?.toFixed(2) || 'N/A'}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Design Current */}
        {results?.I_diseño && (
          <div className="mb-3">
            <h5 className="text-xs font-medium text-gray-700 mb-1">
              Corriente de Diseño
            </h5>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">I Diseño (A):</span>
              <span className="font-mono font-semibold text-teal-600">
                {(results.I_diseño * 1000).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Status Information */}
        {results?.estado && (
          <div className="mb-3">
            <h5 className="text-xs font-medium text-gray-700 mb-1">
              Estado de Validación
            </h5>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Resultado:</span>
              <span
                className={`px-2 py-1 text-xs font-semibold rounded ${
                  results.estado === 'OK'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {results.estado}
              </span>
            </div>
          </div>
        )}

        {/* Node-specific parameters */}
        {parameters && (
          <div className="border-t border-gray-200 pt-2">
            <h5 className="text-xs font-medium text-gray-700 mb-1">
              Parámetros del Componente
            </h5>
            <div className="space-y-1">
              {Object.entries(parameters).map(([key, value]) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-gray-600 capitalize">{key}:</span>
                  <span className="font-mono text-gray-800">
                    {typeof value === 'number' ? value.toFixed(2) : value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderEdgeTooltip = () => {
    const { results, material, calibre, longitud, paralelo } = data

    return (
      <div className="p-3 bg-white rounded-lg shadow-lg border border-gray-200 min-w-64">
        <h4 className="text-sm font-semibold text-gray-900 mb-2 border-b border-gray-200 pb-1">
          📊 Parámetros del Cable
        </h4>

        {/* Cable Information */}
        <div className="mb-3">
          <h5 className="text-xs font-medium text-gray-700 mb-1">
            Características del Cable
          </h5>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Material:</span>
              <span className="font-mono font-semibold text-gray-800 capitalize">
                {material || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Calibre:</span>
              <span className="font-mono font-semibold text-blue-600">
                {calibre || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Longitud:</span>
              <span className="font-mono font-semibold text-green-600">
                {longitud || 'N/A'} m
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Paralelos:</span>
              <span className="font-mono font-semibold text-purple-600">
                {paralelo || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Results Information */}
        {results && (
          <div className="mb-3">
            <h5 className="text-xs font-medium text-gray-700 mb-1">
              Resultados del Cálculo
            </h5>
            <div className="space-y-1">
              {results.impedance && (
                <>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Z Cable (Ω):</span>
                    <span className="font-mono font-semibold text-orange-600">
                      {results.impedance.Z?.toFixed(4) || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">R Cable (Ω):</span>
                    <span className="font-mono font-semibold text-red-600">
                      {results.impedance.R?.toFixed(4) || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">X Cable (Ω):</span>
                    <span className="font-mono font-semibold text-green-600">
                      {results.impedance.X?.toFixed(4) || 'N/A'}
                    </span>
                  </div>
                </>
              )}
              {results.I_corr && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">I Corriente (A):</span>
                  <span className="font-mono font-semibold text-blue-600">
                    {results.I_corr?.toFixed(2) || 'N/A'}
                  </span>
                </div>
              )}
              {results.caida !== undefined && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Caída Tensión (%):</span>
                  <span className="font-mono font-semibold text-yellow-600">
                    {results.caida?.toFixed(2) || 'N/A'}%
                  </span>
                </div>
              )}
              {results.estado && (
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-600">Estado:</span>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded ${
                      results.estado === 'OK'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {results.estado}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return type === 'edge' ? renderEdgeTooltip() : renderNodeTooltip()
}

TechnicalTooltip.propTypes = {
  data: PropTypes.object,
  type: PropTypes.oneOf(['node', 'edge']),
}
