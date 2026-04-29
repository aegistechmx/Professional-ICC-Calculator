import React from 'react'
import { useStore } from '../store/useStore'

/**
 * ValidationOverlay - Shows visual warnings for invalid connections
 * and validation errors on the React Flow canvas
 */
export default function ValidationOverlay() {
  const invalidConnections = useStore(s => s.invalidConnections)
  const validationErrors = useStore(s => s.validationErrors)
  const clearInvalidConnections = useStore(s => s.clearInvalidConnections)
  const clearValidationErrors = useStore(s => s.clearValidationErrors)

  // Don't render if no validation issues
  if (invalidConnections.length === 0 && validationErrors.length === 0) {
    return null
  }

  return (
    <div className="absolute top-4 right-4 z-50 max-w-md">
      {/* Invalid Connections Warning */}
      {invalidConnections.length > 0 && (
        <div className="mb-3 bg-red-50 border-l-4 border-red-500 rounded-r-lg shadow-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center">
              <span className="text-2xl mr-2">⚠️</span>
              <div>
                <h4 className="font-semibold text-red-900">
                  Conexiones Inválidas
                </h4>
                <p className="text-sm text-red-700">
                  {invalidConnections.length} intento(s) de conexión inválido
                </p>
              </div>
            </div>
            <button
              onClick={clearInvalidConnections}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              ✕
            </button>
          </div>
          <div className="mt-2 text-xs text-red-600 space-y-1">
            {invalidConnections.slice(-3).map((conn, i) => (
              <div key={i} className="bg-red-100 rounded px-2 py-1">
                {conn.reason}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validation Errors Warning */}
      {validationErrors.length > 0 && (
        <div className="bg-orange-50 border-l-4 border-orange-500 rounded-r-lg shadow-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center">
              <span className="text-2xl mr-2">🔍</span>
              <div>
                <h4 className="font-semibold text-orange-900">
                  Errores de Validación
                </h4>
                <p className="text-sm text-orange-700">
                  {validationErrors.length} error(es) encontrado(s)
                </p>
              </div>
            </div>
            <button
              onClick={clearValidationErrors}
              className="text-orange-600 hover:text-orange-800 text-sm"
            >
              ✕
            </button>
          </div>
          <ul className="mt-2 text-xs text-orange-600 space-y-1 max-h-32 overflow-y-auto">
            {validationErrors.slice(0, 5).map((error, i) => (
              <li key={i} className="bg-orange-100 rounded px-2 py-1">
                • {error}
              </li>
            ))}
            {validationErrors.length > 5 && (
              <li className="text-orange-500 italic">
                ...y {validationErrors.length - 5} más
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
