import React from 'react';
import PropTypes from 'prop-types';

/**
 * Error Panel Component
 * Displays color-coded warnings and errors from simulation
 */
export default function ErrorPanel({ errors = [], warnings = [], validationErrors = [] }) {
  if (errors.length === 0 && warnings.length === 0 && validationErrors.length === 0) {
    return null;
  }

  const getErrorColor = (type) => {
    switch (type) {
      case 'critical': return 'bg-red-50 border-red-200 text-red-800';
      case 'error': return 'bg-red-100 border-red-300 text-red-900';
      case 'warning': return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getErrorIcon = (type) => {
    switch (type) {
      case 'critical': return '🔴';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📝';
    }
  };

  const categorizeErrors = (items) => {
    const critical = items.filter(e => e.includes('crítico') || e.includes('peligro') || e.includes('extremo'));
    const error = items.filter(e => !e.includes('crítico') && !e.includes('peligro') && !e.includes('extremo') && (e.includes('error') || e.includes('inválido') || e.includes('falla')));
    const warning = items.filter(e => e.includes('advertencia') || e.includes('recomendación') || e.includes('considerar'));
    const info = items.filter(e => !critical.includes(e) && !error.includes(e) && !warning.includes(e));

    return { critical, error, warning, info };
  };

  const allErrors = [...errors, ...validationErrors];
  const categorized = categorizeErrors(allErrors);

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-h-96 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span>🚨</span>
            <span>Panel de Errores y Advertencias</span>
          </h3>
          <div className="flex gap-2 text-sm">
            {categorized.critical.length > 0 && (
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                {categorized.critical.length} Crítico
              </span>
            )}
            {categorized.error.length > 0 && (
              <span className="px-2 py-1 bg-red-50 text-red-700 rounded-full text-xs font-semibold">
                {categorized.error.length} Error
              </span>
            )}
            {categorized.warning.length > 0 && (
              <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">
                {categorized.warning.length} Advertencia
              </span>
            )}
          </div>
        </div>

        {/* Critical Errors */}
        {categorized.critical.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-red-900 mb-2 flex items-center gap-2">
              <span>🔴</span>
              <span>Errores Críticos</span>
            </h4>
            <div className="space-y-2">
              {categorized.critical.map((error, index) => (
                <div key={`critical-${index}`} className={`p-3 rounded-lg border ${getErrorColor('critical')}`}>
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{getErrorIcon('critical')}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{error}</p>
                      <p className="text-xs mt-1 opacity-75">
                        ⚡ Requiere acción inmediata - Puede afectar la seguridad del sistema
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Regular Errors */}
        {categorized.error.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-2">
              <span>❌</span>
              <span>Errores</span>
            </h4>
            <div className="space-y-2">
              {categorized.error.map((error, index) => (
                <div key={`error-${index}`} className={`p-3 rounded-lg border ${getErrorColor('error')}`}>
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{getErrorIcon('error')}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{error}</p>
                      <p className="text-xs mt-1 opacity-75">
                        🔧 Debe corregirse para cálculos precisos
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {categorized.warning.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
              <span>⚠️</span>
              <span>Advertencias</span>
            </h4>
            <div className="space-y-2">
              {categorized.warning.map((warning, index) => (
                <div key={`warning-${index}`} className={`p-3 rounded-lg border ${getErrorColor('warning')}`}>
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{getErrorIcon('warning')}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{warning}</p>
                      <p className="text-xs mt-1 opacity-75">
                        💡 Considerar para mejor diseño
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Messages */}
        {categorized.info.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <span>ℹ️</span>
              <span>Información</span>
            </h4>
            <div className="space-y-2">
              {categorized.info.map((info, index) => (
                <div key={`info-${index}`} className={`p-3 rounded-lg border ${getErrorColor('info')}`}>
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{getErrorIcon('info')}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{info}</p>
                      <p className="text-xs mt-1 opacity-75">
                        📊 Datos para referencia
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* System Warnings */}
        {warnings.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <span>⚡</span>
              <span>Advertencias del Sistema</span>
            </h4>
            <div className="space-y-2">
              {warnings.map((warning, index) => (
                <div key={`system-warning-${index}`} className={`p-3 rounded-lg border ${getErrorColor('warning')}`}>
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{getErrorIcon('warning')}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{warning}</p>
                      <p className="text-xs mt-1 opacity-75">
                        🔍 Revisión de configuración recomendada
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Total: {allErrors.length + warnings.length} problemas
            </div>
            <div className="flex gap-4 text-xs">
              {categorized.critical.length > 0 && (
                <span className="text-red-600 font-semibold">
                  {categorized.critical.length} críticos
                </span>
              )}
              {categorized.error.length > 0 && (
                <span className="text-red-500 font-semibold">
                  {categorized.error.length} errores
                </span>
              )}
              {categorized.warning.length > 0 && (
                <span className="text-amber-600 font-semibold">
                  {categorized.warning.length} advertencias
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

ErrorPanel.propTypes = {
  errors: PropTypes.array,
  warnings: PropTypes.array,
  validationErrors: PropTypes.array
};
