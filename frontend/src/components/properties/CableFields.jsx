import React, { useState, useMemo } from 'react'
import PropTypes from 'prop-types'
import { conductoresCu, formatCalibreLabel } from '../../catalogs/conductores'

export default function CableFields({ edge, updateEdge, cableRes }) {
  const [localEdge, setLocalEdge] = useState(edge.data || {})
  const [calibreFilter, setCalibreFilter] = useState('')

  const Idesign = cableRes?.design?.I_design_A

  const filteredCatalog = useMemo(() => {
    const q = calibreFilter.trim().toLowerCase()
    if (!q) return conductoresCu
    return conductoresCu.filter(c =>
      String(c.calibre).toLowerCase().includes(q)
    )
  }, [calibreFilter])

  const suggestedSet = useMemo(() => {
    if (Idesign == null || !Number.isFinite(Idesign) || Idesign <= 0)
      return new Set()
    return new Set(
      conductoresCu
        .filter(c => c.ampacidad >= Idesign)
        .map(c => String(c.calibre))
    )
  }, [Idesign])

  const handleEdgeChange = (key, value) => {
    let parsedValue = value
    if (
      value !== '' &&
      typeof value === 'string' &&
      !Number.isNaN(Number(value))
    ) {
      parsedValue =
        key === 'paralelo' || key === 'numConductores'
          ? parseInt(value, 10)
          : parseFloat(value)
    }
    if (key === 'calibre') parsedValue = String(value)
    const next = { ...localEdge, [key]: parsedValue }
    setLocalEdge(next)
    updateEdge(edge.id, next)
  }

  const errMsg = cableRes?.error
  const Icorr = cableRes?.resultados?.I_corr_A

  return (
    <>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Material
        </label>
        <select
          value={localEdge.material || 'cobre'}
          onChange={e => handleEdgeChange('material', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="cobre">Cobre</option>
          <option value="aluminio">Aluminio</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Calibre (kcmil)
        </label>
        <input
          value={calibreFilter}
          onChange={e => setCalibreFilter(e.target.value)}
          placeholder="Buscar calibre… (ej: 350, 3/0, 12)"
          className="mb-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <select
          value={localEdge.calibre || '350'}
          onChange={e => handleEdgeChange('calibre', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {filteredCatalog.map(c => {
            const key = String(c.calibre)
            const ok = suggestedSet.has(key)
            return (
              <option key={key} value={key}>
                {ok ? '🟢 ' : '🔴 '}
                {formatCalibreLabel(key)} ({c.ampacidad} A)
              </option>
            )
          })}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Longitud (m)
        </label>
        <select
          value={localEdge.longitud ?? 10}
          onChange={e => handleEdgeChange('longitud', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccionar longitud...</option>
          <option value="1">1 m</option>
          <option value="2">2 m</option>
          <option value="3">3 m</option>
          <option value="5">5 m</option>
          <option value="10">10 m</option>
          <option value="15">15 m</option>
          <option value="20">20 m</option>
          <option value="25">25 m</option>
          <option value="30">30 m</option>
          <option value="40">40 m</option>
          <option value="50">50 m</option>
          <option value="75">75 m</option>
          <option value="100">100 m</option>
          <option value="125">125 m</option>
          <option value="150">150 m</option>
          <option value="200">200 m</option>
          <option value="250">250 m</option>
          <option value="300">300 m</option>
          <option value="400">400 m</option>
          <option value="500">500 m</option>
          <option value="750">750 m</option>
          <option value="1000">1000 m</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Paralelo
        </label>
        <select
          value={localEdge.paralelo ?? 1}
          onChange={e => handleEdgeChange('paralelo', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccionar paralelo...</option>
          <option value="1">1 (Simple)</option>
          <option value="2">2 (Doble)</option>
          <option value="3">3 (Triple)</option>
          <option value="4">4 (Cuádruple)</option>
          <option value="5">5 (Quíntuple)</option>
          <option value="6">6 (Sextuple)</option>
          <option value="8">8 (Óctuple)</option>
          <option value="10">10 (Décuple)</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Temperatura (°C)
        </label>
        <select
          value={localEdge.temp ?? 30}
          onChange={e => handleEdgeChange('temp', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccionar temperatura...</option>
          <option value="10">10°C (Muy Frío)</option>
          <option value="15">15°C (Frío)</option>
          <option value="20">20°C (Frío Moderado)</option>
          <option value="25">25°C (Normal)</option>
          <option value="30">30°C (Ambiente)</option>
          <option value="35">35°C (Cálido)</option>
          <option value="40">40°C (Caliente)</option>
          <option value="45">45°C (Muy Caliente)</option>
          <option value="50">50°C (Extremo)</option>
          <option value="55">55°C (Muy Extremo)</option>
          <option value="60">60°C (Crítico)</option>
          <option value="70">70°C (Muy Crítico)</option>
          <option value="75">75°C (Peligroso)</option>
          <option value="80">80°C (Muy Peligroso)</option>
          <option value="90">90°C (Crítico Máximo)</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          # Conductores (agrupamiento)
        </label>
        <select
          value={localEdge.numConductores ?? 3}
          onChange={e => handleEdgeChange('numConductores', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccionar conductores...</option>
          <option value="1">1 (Monofásico)</option>
          <option value="2">2 (Bifásico)</option>
          <option value="3">3 (Trifásico)</option>
          <option value="4">4 (3F + Neutro)</option>
          <option value="5">5 (3F + N + T)</option>
          <option value="6">6 (3F + 2N + T)</option>
          <option value="7">7 (3F + 3N + T)</option>
          <option value="8">8 (3F + 4N + T)</option>
          <option value="9">9 (3F + 5N + T)</option>
          <option value="10">10 (3F + 6N + T)</option>
          <option value="12">12 (3F + 8N + T)</option>
          <option value="15">15 (3F + 11N + T)</option>
          <option value="20">20 (3F + 16N + T)</option>
          <option value="25">25 (3F + 21N + T)</option>
          <option value="30">30 (3F + 26N + T)</option>
        </select>
      </div>

      {(errMsg || cableRes?.resultados) && (
        <div
          className={`mt-2 p-3 rounded border ${errMsg ? 'bg-red-50 border-red-200 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
        >
          {errMsg ? (
            <div className="text-sm">{errMsg}</div>
          ) : (
            <div className="text-xs space-y-1">
              <div>
                I_tabla:{' '}
                {cableRes.tabla?.I_tabla_A?.toFixed?.(0) ??
                  cableRes.tabla?.I_tabla_A}{' '}
                A
              </div>
              <div>
                F_temp:{' '}
                {cableRes.factores?.F_temp?.toFixed?.(2) ??
                  cableRes.factores?.F_temp}
              </div>
              <div>
                F_agrup:{' '}
                {cableRes.factores?.F_agrup?.toFixed?.(2) ??
                  cableRes.factores?.F_agrup}
              </div>
              <div>I_corr: {Math.round(cableRes.resultados?.I_corr_A)} A</div>
              {Idesign != null && <div>I_diseño: {Math.round(Idesign)} A</div>}
              {Icorr != null && Idesign != null && (
                <div
                  className={
                    Icorr >= Idesign ? 'text-green-700' : 'text-red-700'
                  }
                >
                  Ampacidad: {Icorr >= Idesign ? 'OK' : 'FAIL'}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}

CableFields.propTypes = {
  edge: PropTypes.shape({
    id: PropTypes.string,
    data: PropTypes.object,
  }),
  updateEdge: PropTypes.func,
  cableRes: PropTypes.object,
}
