import React, { useState, useMemo } from 'react';
import { conductoresCu, formatCalibreLabel } from '../../catalogs/conductores';

export default function CableFields({ edge, updateEdge, cableRes }) {
  const [localEdge, setLocalEdge] = useState(edge.data || {});
  const [calibreFilter, setCalibreFilter] = useState('');

  const Idesign = cableRes?.design?.I_design_A;

  const filteredCatalog = useMemo(() => {
    const q = calibreFilter.trim().toLowerCase();
    if (!q) return conductoresCu;
    return conductoresCu.filter((c) => String(c.calibre).toLowerCase().includes(q));
  }, [calibreFilter]);

  const suggestedSet = useMemo(() => {
    if (Idesign == null || !Number.isFinite(Idesign) || Idesign <= 0) return new Set();
    return new Set(
      conductoresCu.filter((c) => c.ampacidad >= Idesign).map((c) => String(c.calibre))
    );
  }, [Idesign]);

  const handleEdgeChange = (key, value) => {
    let parsedValue = value;
    if (value !== '' && typeof value === 'string' && !Number.isNaN(Number(value))) {
      parsedValue = key === 'paralelo' || key === 'numConductores'
        ? parseInt(value, 10)
        : parseFloat(value);
    }
    if (key === 'calibre') parsedValue = String(value);
    const next = { ...localEdge, [key]: parsedValue };
    setLocalEdge(next);
    updateEdge(edge.id, next);
  };

  const errMsg = cableRes?.error;
  const Icorr = cableRes?.resultados?.I_corr_A;

  return (
    <>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
        <select
          value={localEdge.material || 'cobre'}
          onChange={(e) => handleEdgeChange('material', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="cobre">Cobre</option>
          <option value="aluminio">Aluminio</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Calibre (kcmil)</label>
        <input
          value={calibreFilter}
          onChange={(e) => setCalibreFilter(e.target.value)}
          placeholder="Buscar calibre… (ej: 350, 3/0, 12)"
          className="mb-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <select
          value={localEdge.calibre || '350'}
          onChange={(e) => handleEdgeChange('calibre', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {filteredCatalog.map((c) => {
            const key = String(c.calibre);
            const ok = suggestedSet.has(key);
            return (
              <option key={key} value={key}>
                {ok ? '🟢 ' : '🔴 '}
                {formatCalibreLabel(key)} ({c.ampacidad} A)
              </option>
            );
          })}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Longitud (m)</label>
        <input
          type="number"
          value={localEdge.longitud ?? 10}
          onChange={(e) => handleEdgeChange('longitud', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Paralelo</label>
        <input
          type="number"
          value={localEdge.paralelo ?? 1}
          onChange={(e) => handleEdgeChange('paralelo', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Temperatura (°C)</label>
        <input
          type="number"
          value={localEdge.temp ?? 30}
          onChange={(e) => handleEdgeChange('temp', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1"># Conductores (agrupamiento)</label>
        <input
          type="number"
          value={localEdge.numConductores ?? 3}
          onChange={(e) => handleEdgeChange('numConductores', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {(errMsg || cableRes?.resultados) && (
        <div className={`mt-2 p-3 rounded border ${errMsg ? 'bg-red-50 border-red-200 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
          {errMsg ? (
            <div className="text-sm">{errMsg}</div>
          ) : (
            <div className="text-xs space-y-1">
              <div>I_tabla: {cableRes.tabla?.I_tabla_A?.toFixed?.(0) ?? cableRes.tabla?.I_tabla_A} A</div>
              <div>F_temp: {cableRes.factores?.F_temp?.toFixed?.(2) ?? cableRes.factores?.F_temp}</div>
              <div>F_agrup: {cableRes.factores?.F_agrup?.toFixed?.(2) ?? cableRes.factores?.F_agrup}</div>
              <div>I_corr: {Math.round(cableRes.resultados?.I_corr_A)} A</div>
              {Idesign != null && <div>I_diseño: {Math.round(Idesign)} A</div>}
              {Icorr != null && Idesign != null && (
                <div className={Icorr >= Idesign ? 'text-green-700' : 'text-red-700'}>
                  Ampacidad: {Icorr >= Idesign ? 'OK' : 'FAIL'}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
