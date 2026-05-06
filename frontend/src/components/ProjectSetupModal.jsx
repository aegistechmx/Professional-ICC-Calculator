/**
 * components/ProjectSetupModal.jsx - Modal de Configuración Inicial
 * Configuración global del proyecto tipo ETAP con defaults México
 */

import React, { useState } from 'react';
import './ProjectSetupModal.css';

// Defaults para México
const defaultsMX = {
  frecuencia: 60,
  sistema: '3F-4H',
  voltajeBase: 480,
  material: 'cobre',
  tempAmbiente: 30,
  norma: 'NOM-001-SEDE-2012'
};

// Niveles de voltaje típicos México
const nivelesTípicosMX = [
  { value: 220, label: '220V (Monofásico)' },
  { value: 127, label: '127V (Monofásico)' },
  { value: 480, label: '480V (3F)' },
  { value: 240, label: '240V (3F)' },
  { value: 4160, label: '4.16kV (MT)' },
  { value: 13800, label: '13.8kV (AT)' },
  { value: 23000, label: '23kV (AT)' },
  { value: 34500, label: '34.5kV (AT)' }
];

// Transformadores estándar CFE
const transformadoresCFE = [
  { value: 15, label: '15 kVA' },
  { value: 30, label: '30 kVA' },
  { value: 45, label: '45 kVA' },
  { value: 75, label: '75 kVA' },
  { value: 112.5, label: '112.5 kVA' },
  { value: 150, label: '150 kVA' },
  { value: 225, label: '225 kVA' },
  { value: 300, label: '300 kVA' },
  { value: 500, label: '500 kVA' },
  { value: 750, label: '750 kVA' },
  { value: 1000, label: '1000 kVA' },
  { value: 1500, label: '1500 kVA' },
  { value: 2000, label: '2000 kVA' },
  { value: 2500, label: '2500 kVA' }
];

export default function ProjectSetupModal({ onStart, onClose }) {
  const [config, setConfig] = useState({
    proyecto: 'Nuevo Proyecto Eléctrico',
    norma: defaultsMX.norma,
    voltajeBase: defaultsMX.voltajeBase,
    sistema: defaultsMX.sistema,
    frecuencia: defaultsMX.frecuencia,
    material: defaultsMX.material,
    tempAmbiente: defaultsMX.tempAmbiente,
    capacidadTR: 500,
    tempAislamiento: 75,
    tempTerminal: 75,
    nConductores: 3,
    paralelos: 1
  });

  const [errors, setErrors] = useState({});

  const handleChange = (key, value) => {
    setConfig({ ...config, [key]: value });
    
    // Limpiar error del campo
    if (errors[key]) {
      setErrors({ ...errors, [key]: null });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!config.proyecto.trim()) {
      newErrors.proyecto = 'El nombre del proyecto es requerido';
    }

    if (!config.voltajeBase || config.voltajeBase <= 0) {
      newErrors.voltajeBase = 'El voltaje base es inválido';
    }

    if (!config.capacidadTR || config.capacidadTR <= 0) {
      newErrors.capacidadTR = 'La capacidad del transformador es inválida';
    }

    if (config.tempAmbiente < -40 || config.tempAmbiente > 60) {
      newErrors.tempAmbiente = 'Temperatura ambiente fuera de rango (-40°C a 60°C)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStart = () => {
    if (validateForm()) {
      onStart(config);
    }
  };

  const handleQuickSetup = (preset) => {
    switch (preset) {
      case 'residencial':
        setConfig({
          ...config,
          proyecto: 'Sistema Residencial',
          voltajeBase: 240,
          sistema: '1F-3H',
          capacidadTR: 15,
          material: 'cobre'
        });
        break;
      case 'comercial':
        setConfig({
          ...config,
          proyecto: 'Sistema Comercial',
          voltajeBase: 480,
          sistema: '3F-4H',
          capacidadTR: 500,
          material: 'cobre'
        });
        break;
      case 'industrial':
        setConfig({
          ...config,
          proyecto: 'Sistema Industrial',
          voltajeBase: 480,
          sistema: '3F-4H',
          capacidadTR: 1500,
          material: 'cobre'
        });
        break;
      case 'mt':
        setConfig({
          ...config,
          proyecto: 'Sistema Media Tensión',
          voltajeBase: 4160,
          sistema: '3F-4H',
          capacidadTR: 5000,
          material: 'aluminio'
        });
        break;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content project-setup-modal">
        <div className="modal-header">
          <h2> 
            <span className="icon">  
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </span>
            Configuración Inicial del Proyecto
          </h2>
          <button className="close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* Quick Setup Presets */}
          <div className="quick-setup-section">
            <h3>Configuración Rápida</h3>
            <div className="preset-buttons">
              <button className="preset-btn" onClick={() => handleQuickSetup('residencial')}>
                <span className="preset-icon">  
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                  </svg>
                </span>
                Residencial
              </button>
              <button className="preset-btn" onClick={() => handleQuickSetup('comercial')}>
                <span className="preset-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                  </svg>
                </span>
                Comercial
              </button>
              <button className="preset-btn" onClick={() => handleQuickSetup('industrial')}>
                <span className="preset-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l-5.5 9h11L12 2zm0 3.84L13.93 9h-3.87L12 5.84zM17.5 13c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zM3 21.5h8v-8H3v8zm2-6h4v4H5v-4z"/>
                  </svg>
                </span>
                Industrial
              </button>
              <button className="preset-btn" onClick={() => handleQuickSetup('mt')}>
                <span className="preset-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.5 21.5V4.5L19 12l-11.5 7.5z"/>
                  </svg>
                </span>
                Media Tensión
              </button>
            </div>
          </div>

          {/* Project Information */}
          <div className="form-section">
            <h3>Información del Proyecto</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Nombre del Proyecto</label>
                <input
                  type="text"
                  value={config.proyecto}
                  onChange={(e) => handleChange('proyecto', e.target.value)}
                  placeholder="Ej: Sistema Eléctrico Oficinas"
                  className={errors.proyecto ? 'error' : ''}
                />
                {errors.proyecto && <span className="error-message">{errors.proyecto}</span>}
              </div>

              <div className="form-group">
                <label>Norma Aplicable</label>
                <select 
                  value={config.norma}
                  onChange={(e) => handleChange('norma', e.target.value)}
                >
                  <option value="NOM-001-SEDE-2012">NOM-001-SEDE-2012 (México)</option>
                  <option value="NFPA-70">NFPA 70 (NEC)</option>
                  <option value="IEC-60364">IEC 60364</option>
                  <option value="IEEE-1584">IEEE 1584</option>
                </select>
              </div>
            </div>
          </div>

          {/* System Configuration */}
          <div className="form-section">
            <h3>Configuración del Sistema</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Voltaje Base</label>
                <select 
                  value={config.voltajeBase}
                  onChange={(e) => handleChange('voltajeBase', +e.target.value)}
                  className={errors.voltajeBase ? 'error' : ''}
                >
                  {nivelesTípicosMX.map(nivel => (
                    <option key={nivel.value} value={nivel.value}>
                      {nivel.label}
                    </option>
                  ))}
                </select>
                {errors.voltajeBase && <span className="error-message">{errors.voltajeBase}</span>}
              </div>

              <div className="form-group">
                <label>Tipo de Sistema</label>
                <select 
                  value={config.sistema}
                  onChange={(e) => handleChange('sistema', e.target.value)}
                >
                  <option value="3F-4H">Trifásico 4 Hilos</option>
                  <option value="3F-3H">Trifásico 3 Hilos</option>
                  <option value="1F-3H">Monofásico 3 Hilos</option>
                  <option value="1F-2H">Monofásico 2 Hilos</option>
                </select>
              </div>

              <div className="form-group">
                <label>Frecuencia (Hz)</label>
                <select 
                  value={config.frecuencia}
                  onChange={(e) => handleChange('frecuencia', +e.target.value)}
                >
                  <option value={60}>60 Hz (México)</option>
                  <option value={50}>50 Hz (Europa)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Capacidad Transformador (kVA)</label>
                <select 
                  value={config.capacidadTR}
                  onChange={(e) => handleChange('capacidadTR', +e.target.value)}
                  className={errors.capacidadTR ? 'error' : ''}
                >
                  {transformadoresCFE.map(tr => (
                    <option key={tr.value} value={tr.value}>
                      {tr.label}
                    </option>
                  ))}
                </select>
                {errors.capacidadTR && <span className="error-message">{errors.capacidadTR}</span>}
              </div>
            </div>
          </div>

          {/* Material Configuration */}
          <div className="form-section">
            <h3>Configuración de Materiales</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Material Conductor</label>
                <select 
                  value={config.material}
                  onChange={(e) => handleChange('material', e.target.value)}
                >
                  <option value="cobre">Cobre (Cu)</option>
                  <option value="aluminio">Aluminio (Al)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Temperatura Ambiente (°C)</label>
                <input
                  type="number"
                  value={config.tempAmbiente}
                  onChange={(e) => handleChange('tempAmbiente', +e.target.value)}
                  min="-40"
                  max="60"
                  className={errors.tempAmbiente ? 'error' : ''}
                />
                {errors.tempAmbiente && <span className="error-message">{errors.tempAmbiente}</span>}
              </div>

              <div className="form-group">
                <label>Temperatura Aislamiento (°C)</label>
                <select 
                  value={config.tempAislamiento}
                  onChange={(e) => handleChange('tempAislamiento', +e.target.value)}
                >
                  <option value={60}>60°C</option>
                  <option value={75}>75°C</option>
                  <option value={90}>90°C</option>
                </select>
              </div>

              <div className="form-group">
                <label>Temperatura Terminal (°C)</label>
                <select 
                  value={config.tempTerminal}
                  onChange={(e) => handleChange('tempTerminal', +e.target.value)}
                >
                  <option value={60}>60°C</option>
                  <option value={75}>75°C</option>
                  <option value={90}>90°C</option>
                </select>
              </div>
            </div>
          </div>

          {/* Advanced Configuration */}
          <details className="advanced-section">
            <summary>Configuración Avanzada</summary>
            <div className="form-grid">
              <div className="form-group">
                <label>Número de Conductores</label>
                <input
                  type="number"
                  value={config.nConductores}
                  onChange={(e) => handleChange('nConductores', +e.target.value)}
                  min="1"
                  max="100"
                />
              </div>

              <div className="form-group">
                <label>Conductores en Paralelo</label>
                <input
                  type="number"
                  value={config.paralelos}
                  onChange={(e) => handleChange('paralelos', +e.target.value)}
                  min="1"
                  max="10"
                />
              </div>
            </div>
          </details>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleStart}>
            <span className="btn-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </span>
            Crear Proyecto
          </button>
        </div>
      </div>
    </div>
  );
}
