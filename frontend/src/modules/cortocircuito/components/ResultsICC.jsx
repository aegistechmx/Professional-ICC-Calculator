/* eslint-disable react/prop-types */
export default function ResultsICC({ result, loading, error, optimization, onOptimize }) {
  // Validate props
  if (result && typeof result !== 'object') {
    return null;
  }
  if (loading) return <p className="text-gray-600">Calculando...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!result) return null;

  const { ok, ampacity, interrupting, voltageDrop, coordination, invariants } = result;

  // Validar que ampacity exista antes de acceder a sus propiedades
  if (!ampacity) {
    return (
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Resultado de Validación</h2>
        <div className="p-4 bg-yellow-100 text-yellow-800 rounded-lg">
          <p>Datos de ampacidad no disponibles</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Resultado de Validación</h2>

      {/* Status Global */}
      <div className={`p-4 rounded-lg mb-4 ${ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        <h3 className="font-bold text-lg">
          {ok ? '✅ CUMPLE TODAS LAS VERIFICACIONES' : '❌ NO CUMPLE ALGUNA VERIFICACIÓN'}
        </h3>
      </div>

      {/* Ampacidad */}
      <div className="mb-4 p-4 bg-white rounded-lg border">
        <h3 className="font-bold text-lg mb-2">Ampacidad (90°C calculado, 75°C terminal)</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>I_tabla (90°C): <strong>{ampacity.I_tabla} A</strong></div>
          <div>F_temp: <strong>{ampacity.F_temp.toFixed(2)}</strong></div>
          <div>F_group: <strong>{ampacity.F_group.toFixed(2)}</strong></div>
          <div>Paralelos: <strong>{ampacity.parallels}</strong></div>
          <div>I_corr: <strong>{ampacity.I_corr.toFixed(1)} A</strong></div>
          <div>I_terminal (75°C): <strong>{ampacity.I_terminal} A</strong></div>
          <div>I_design: <strong>{ampacity.I_design.toFixed(1)} A</strong></div>
          <div>I_final: <strong>{ampacity.I_final.toFixed(1)} A</strong></div>
        </div>
        <div className={`mt-2 p-2 rounded ${ampacity.check.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {ampacity.check.msg}
        </div>
      </div>

      {/* Interruptiva */}
      <div className="mb-4 p-4 bg-white rounded-lg border">
        <h3 className="font-bold text-lg mb-2">Capacidad Interruptiva</h3>
        <div className={`p-2 rounded ${interrupting.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {interrupting.msg}
        </div>
      </div>

      {/* Caída de Tensión */}
      {voltageDrop && (
        <div className="mb-4 p-4 bg-white rounded-lg border">
          <h3 className="font-bold text-lg mb-2">Caída de Tensión</h3>
          <div className="grid grid-cols-2 gap-2 text-sm mb-2">
            <div>ΔV: <strong>{voltageDrop.deltaV.toFixed(2)} V</strong></div>
            <div>Porcentaje: <strong>{voltageDrop.percent.toFixed(2)}%</strong></div>
          </div>
          <div className={`p-2 rounded ${voltageDrop.check.ok ? 'bg-green-100 text-green-800' : voltageDrop.check.level === 'LÍMITE' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
            {voltageDrop.check.msg}
          </div>
        </div>
      )}

      {/* Coordinación TCC */}
      {coordination && (
        <div className="mb-4 p-4 bg-white rounded-lg border">
          <h3 className="font-bold text-lg mb-2">Coordinación TCC</h3>
          <div className="grid grid-cols-2 gap-2 text-sm mb-2">
            <div>T_upstream: <strong>{coordination.t_up.toFixed(3)} s</strong></div>
            <div>T_downstream: <strong>{coordination.t_down.toFixed(3)} s</strong></div>
            <div>Margen: <strong>{coordination.margin.toFixed(3)} s</strong></div>
          </div>
          <div className={`p-2 rounded mb-3 ${coordination.coordinated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {coordination.msg}
          </div>

          {/* Botón Auto-Coordinación */}
          {!coordination.coordinated && onOptimize && (
            <button
              onClick={onOptimize}
              disabled={loading}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              ⚡ Auto-Coordinación Inteligente
            </button>
          )}
        </div>
      )}

      {/* Resultados de Optimización */}
      {optimization && (
        <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
          <h3 className="font-bold text-lg mb-2 text-purple-800">
            {optimization.success ? '✅ Optimización Exitosa' : '⚠️ Optimización Parcial'}
          </h3>

          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
            <div>Mejora: <strong>{optimization.improvement}%</strong></div>
            <div>Iteraciones: <strong>{optimization.iterations}</strong></div>
            <div>Margen mín: <strong>{optimization.metrics.minMargin}s</strong></div>
            <div>Margen prom: <strong>{optimization.metrics.avgMargin}s</strong></div>
          </div>

          <div className={`p-2 rounded mb-3 ${optimization.metrics.coordinated ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {optimization.metrics.coordinated ? '✅ Ahora coordinado' : '⚠️ Mejorado pero requiere revisión'}
          </div>

          <details>
            <summary className="cursor-pointer text-sm font-medium text-purple-700">
              Ver ajustes optimizados
            </summary>
            <div className="mt-2 space-y-2">
              {optimization.optimized.map((b, i) => (
                <div key={i} className="p-2 bg-white rounded text-sm">
                  <div className="font-medium">{b.model}</div>
                  <div className="grid grid-cols-3 gap-1 text-xs text-gray-600">
                    <div>Pickup: {optimization.original[i].pickup.toFixed(0)}A → {b.pickup.toFixed(0)}A</div>
                    <div>TMS: {optimization.original[i].tms.toFixed(3)} → {b.tms.toFixed(3)}</div>
                    <div>Inst: {optimization.original[i].inst.toFixed(0)}A → {b.inst.toFixed(0)}A</div>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Invariantes */}
      <div className="p-4 bg-white rounded-lg border">
        <h3 className="font-bold text-lg mb-2">Invariantes</h3>
        <div className="text-sm space-y-1">
          <div>Tabla no cero: <strong>{invariants.nonZeroTable ? '✅' : '❌'}</strong></div>
          <div>Terminal definido: <strong>{invariants.terminalDefined ? '✅' : '❌'}</strong></div>
          <div>Sin NaN: <strong>{invariants.noNaN ? '✅' : '❌'}</strong></div>
        </div>
      </div>

      {/* Debug */}
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-gray-600">Ver JSON completo</summary>
        <pre className="text-xs mt-2 overflow-auto">{JSON.stringify(result, null, 2)}</pre>
      </details>
    </div>
  );
}
