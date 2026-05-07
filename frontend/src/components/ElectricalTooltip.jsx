/**
 * components/ElectricalTooltip.jsx - Tooltip con datos eléctricos
 * Muestra Isc, Icu, carga y otros datos relevantes
 */

import React from 'react';
import PropTypes from 'prop-types';
import './ElectricalTooltip.css';

export default function ElectricalTooltip({ node, visible }) {
  if (!visible || !node) return null;

  const { data, type } = node;
  const { results, label, status } = data || {};

  // Formatear valores
  const format = (value, unit = '', decimals = 2) => {
    if (value === undefined || value === null) return '-';
    return `${Number(value).toFixed(decimals)} ${unit}`;
  };

  // Datos específicos por tipo
  const getTypeSpecificData = () => {
    switch (type) {
      case 'source':
        return [
          { label: 'Voltaje', value: format(data?.voltaje || results?.voltage, 'V', 0), color: 'blue' },
          { label: 'Isc', value: format(results?.shortCircuitCurrent, 'kA'), color: 'red' },
          { label: 'Potencia', value: format(results?.availablePower, 'kW'), color: 'green' }
        ];

      case 'transformer':
        return [
          { label: 'kVA', value: format(data?.kva, 'kVA', 1), color: 'purple' },
          { label: 'Primario', value: format(data?.primario, 'V', 0), color: 'blue' },
          { label: 'Secundario', value: format(data?.secundario, 'V', 0), color: 'blue' },
          { label: 'Impedancia', value: format(data?.Z, '%'), color: 'orange' }
        ];

      case 'breaker':
        return [
          { label: 'In', value: format(data?.In, 'A', 0), color: 'green' },
          { label: 'Icu', value: format(data?.Icu, 'kA', 1), color: 'red' },
          { label: 'Tipo', value: data?.tipo || 'Termomagnético', color: 'gray' }
        ];

      case 'load':
      case 'motor':
        return [
          { label: 'I carga', value: format(data?.I_carga, 'A', 1), color: 'green' },
          { label: 'Longitud', value: format(data?.longitud, 'm', 0), color: 'gray' },
          { label: 'Caída', value: format(results?.voltageDrop, '%'), color: 'orange' }
        ];

      case 'panel':
        return [
          { label: 'Voltaje', value: format(data?.tension, 'V', 0), color: 'blue' },
          { label: 'Fases', value: data?.fases || 3, color: 'yellow' },
          { label: 'Carga total', value: format(results?.totalLoad, 'A'), color: 'green' }
        ];

      default:
        return [];
    }
  };

  const specificData = getTypeSpecificData();

  // Color del estado
  const getStatusColor = () => {
    switch (status) {
      case 'calculated': return '#10b981';
      case 'error': return '#ef4444';
      case 'tripped': return '#dc2626';
      case 'overload': return '#f59e0b';
      case 'pending': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  return (
    <div className="electrical-tooltip-container">
      <div className="tooltip-header" style={{ borderLeftColor: getStatusColor() }}>
        <span className="tooltip-type">{type?.toUpperCase()}</span>
        <span className="tooltip-label">{label || type}</span>
      </div>

      <div className="tooltip-body">
        {specificData.length > 0 && (
          <div className="tooltip-section">
            <h5>Parámetros</h5>
            <div className="tooltip-data-grid">
              {specificData.map((item, index) => (
                <div key={index} className="data-item">
                  <span className="data-label">{item.label}:</span>
                  <span className={`data-value color-${item.color}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {results && (
          <div className="tooltip-section results">
            <h5>Resultados de Cálculo</h5>
            <div className="tooltip-data-grid">
              {results.ampacidad?.I_final && (
                <div className="data-item">
                  <span className="data-label">Ampacidad:</span>
                  <span className="data-value color-green">
                    {format(results.ampacidad.I_final, 'A')}
                  </span>
                </div>
              )}
              {results.conductor?.calibre && (
                <div className="data-item">
                  <span className="data-label">Conductor:</span>
                  <span className="data-value color-blue">
                    {results.conductor.calibre}
                  </span>
                </div>
              )}
              {results.proteccion?.tipo && (
                <div className="data-item">
                  <span className="data-label">Protección:</span>
                  <span className="data-value color-purple">
                    {results.proteccion.tipo}
                  </span>
                </div>
              )}
              {results.caida?.porcentaje !== undefined && (
                <div className="data-item">
                  <span className="data-label">Caída tensión:</span>
                  <span className={`data-value ${results.caida.porcentaje > 3 ? 'color-red' : 'color-green'}`}>
                    {format(results.caida.porcentaje, '%')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {status && (
          <div className={`tooltip-status ${status}`}>
            Estado: {status === 'calculated' && 'Calculado ✓'}
            {status === 'error' && 'Error ✗'}
            {status === 'tripped' && 'Disparado ⚡'}
            {status === 'overload' && 'Sobrecarga ⚠'}
            {status === 'pending' && 'Pendiente ⋯'}
          </div>
        )}
      </div>
    </div>
  );
}

ElectricalTooltip.propTypes = {
  node: PropTypes.object,
  visible: PropTypes.bool
};
