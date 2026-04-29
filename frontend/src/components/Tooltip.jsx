import React, { useState } from 'react'

/* eslint-disable react/prop-types */

/**
 * Tooltip component for helpful hints and explanations
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} props.text
 * @param {'top'|'bottom'|'left'|'right'} props.position
 */
export function Tooltip({ children, text, position = 'top' }) {
  const [isVisible, setIsVisible] = useState(false)

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className={`absolute z-50 ${positionClasses[position]}`}>
          <div className="bg-gray-900 text-white text-sm rounded-lg px-3 py-2 max-w-xs shadow-lg">
            {text}
            <div
              className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
                position === 'top'
                  ? 'top-full left-1/2 -translate-x-1/2 -mt-1'
                  : position === 'bottom'
                    ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1'
                    : position === 'left'
                      ? 'left-full top-1/2 -translate-y-1/2 -ml-1'
                      : 'right-full top-1/2 -translate-y-1/2 -mr-1'
              }`}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Error message component with severity levels
 */
export function ErrorMessage({ message, type = 'error', onClose }) {
  const styles = {
    error: 'bg-red-50 border-red-400 text-red-800',
    warning: 'bg-yellow-50 border-yellow-400 text-yellow-800',
    info: 'bg-blue-50 border-blue-400 text-blue-800',
    success: 'bg-green-50 border-green-400 text-green-800',
  }

  const icons = {
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    success: '✅',
  }

  return (
    <div className={`rounded-lg border-l-4 p-4 ${styles[type]}`}>
      <div className="flex items-start">
        <span className="text-lg mr-2">{icons[type]}</span>
        <div className="flex-1">
          <p className="font-medium">{message}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-4 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Validation panel showing all errors and warnings
 */
export function ValidationPanel({ validationResult, onClose }) {
  if (!validationResult || validationResult.isValid) return null

  return (
    <div className="fixed top-4 right-4 w-96 max-h-[80vh] overflow-y-auto bg-white rounded-lg shadow-xl border border-gray-200 z-50">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-bold text-lg text-red-600">
          ⚠️ Problemas Detectados
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      <div className="p-4 space-y-3">
        {validationResult.errors?.map((error, idx) => (
          <ErrorMessage key={`error-${idx}`} message={error} type="error" />
        ))}
        {validationResult.warnings?.map((warning, idx) => (
          <ErrorMessage
            key={`warning-${idx}`}
            message={warning}
            type="warning"
          />
        ))}
      </div>

      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-600">
          {validationResult.errors?.length || 0} errores,{' '}
          {validationResult.warnings?.length || 0} advertencias
        </p>
      </div>
    </div>
  )
}

/**
 * Helpful hints for node parameters
 */
export const PARAMETER_TOOLTIPS = {
  transformer: {
    kVA: 'Capacidad del transformador en kVA. Ej: 500 kVA para edificio mediano',
    primario: 'Voltaje del lado primario (alta tensión). Ej: 13800V = 13.8 kV',
    secundario:
      'Voltaje del lado secundario (baja tensión). Ej: 480V trifásico',
    Z: 'Impedancia porcentual. Ej: 5.75% es típico para transformadores de distribución',
  },
  generator: {
    kVA: 'Capacidad del generador en kVA. Ej: 100 kVA para respaldo',
    voltaje: 'Voltaje de salida del generador. Ej: 480V',
    fp: 'Factor de potencia. Ej: 0.8 es estándar para generadores',
    Xd: 'Reactancia transitoria. Ej: 0.15 pu (15%) es típico',
  },
  breaker: {
    In: 'Corriente nominal del breaker en Amperios',
    Icu: 'Capacidad interruptiva máxima. Debe ser > corriente de cortocircuito',
    poles: 'Número de polos: 1, 2 o 3',
    tipo: 'Tipo: termomagnético, electrónico, fusible',
  },
  cable: {
    calibre: 'Calibre AWG o kcmil. Mayor número = menor diámetro',
    material: 'Cobre (mejor conductividad) o Aluminio (más económico)',
    paralelo: 'Número de conductores en paralelo para aumentar capacidad',
    longitud: 'Longitud en metros. Afecta caída de tensión',
  },
}

export default Tooltip
