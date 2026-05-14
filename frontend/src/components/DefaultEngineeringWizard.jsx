import PropTypes from 'prop-types'
import { useMemo, useState } from 'react'

const STEPS = [
  { key: 'system', label: '1. Sistema' },
  { key: 'voltage', label: '2. Voltaje' },
  { key: 'ambient', label: '3. Ambiente' },
  { key: 'source', label: '4. Fuente/Trafo' },
  { key: 'protection', label: '5. Protección' },
  { key: 'validation', label: '6. Validación' },
]

const SYSTEM_OPTIONS = [
  { id: '1F-2H', title: '1F-2H', subtitle: 'Monofásico 2 hilos' },
  { id: '1F-3H', title: '1F-3H', subtitle: 'Monofásico 3 hilos' },
  { id: '3F-3H', title: '3F-3H', subtitle: 'Trifásico sin neutro' },
  { id: '3F-4H', title: '3F-4H', subtitle: 'Trifásico con neutro' },
  { id: '3F-4H+G', title: '3F-4H + Tierra', subtitle: 'Neutro + conductor tierra' },
  { id: 'TN-S', title: '3F-4H + Tierra + Neutro separado', subtitle: 'TN-S / neutro separado' },
]

export default function DefaultEngineeringWizard({
  isOpen,
  onClose,
  onApplyDefaults,
}) {
  const [stepIndex, setStepIndex] = useState(0)
  const step = STEPS[stepIndex]?.key || 'system'

  const [systemType, setSystemType] = useState('3F-4H+G')
  const [primario, setPrimario] = useState(13800)
  const [secundario, setSecundario] = useState(480)
  const [tempAmbiente, setTempAmbiente] = useState(30)
  const [nConductores, setNConductores] = useState(5)

  const canPrev = stepIndex > 0
  const canNext = stepIndex < STEPS.length - 1

  const subtitle = useMemo(() => {
    const base =
      'Configura rápidamente el sistema eléctrico base antes de iniciar el cálculo.'
    const sys = SYSTEM_OPTIONS.find(s => s.id === systemType)
    if (!sys) return base
    return `${base} (${sys.title}: ${sys.subtitle})`
  }, [systemType])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[92vh] overflow-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl text-slate-100">
        <div className="sticky top-0 z-10 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950 border-b border-slate-700 px-6 py-5">
          <div className="text-lg font-extrabold">
            Asistente Inicial de Ingeniería
          </div>
          <div className="text-xs text-slate-300 mt-1">{subtitle}</div>

          <div className="flex flex-wrap gap-2 mt-4">
            {STEPS.map((s, idx) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setStepIndex(idx)}
                className={`text-[11px] px-3 py-1 rounded-full border transition ${
                  idx === stepIndex
                    ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200'
                    : 'border-slate-700 bg-slate-950/30 text-slate-300 hover:border-slate-500'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-6">
          {step === 'system' && (
            <>
              <div className="text-sm font-bold mb-3">Paso 1 — Sistema</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {SYSTEM_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSystemType(opt.id)}
                    className={`text-left rounded-xl border px-4 py-3 transition ${
                      systemType === opt.id
                        ? 'border-emerald-400 bg-emerald-950/20'
                        : 'border-slate-700 bg-slate-950/30 hover:border-cyan-400'
                    }`}
                  >
                    <div className="font-extrabold">{opt.title}</div>
                    <div className="text-xs text-slate-300 mt-1">
                      {opt.subtitle}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'voltage' && (
            <>
              <div className="text-sm font-bold mb-3">Paso 2 — Voltaje</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold tracking-wide text-slate-300 uppercase">
                    Primario (V)
                  </label>
                  <input
                    type="number"
                    value={primario}
                    onChange={e => setPrimario(Number(e.target.value || 0))}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold tracking-wide text-slate-300 uppercase">
                    Secundario (V)
                  </label>
                  <input
                    type="number"
                    value={secundario}
                    onChange={e => setSecundario(Number(e.target.value || 0))}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div className="text-xs text-slate-400 mt-3">
                Esto aplica el voltaje secundario a panel/generador/cargas/motores
                y actualiza el transformador del diagrama.
              </div>
            </>
          )}

          {step === 'ambient' && (
            <>
              <div className="text-sm font-bold mb-3">Paso 3 — Ambiente</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold tracking-wide text-slate-300 uppercase">
                    Temperatura ambiente (°C)
                  </label>
                  <input
                    type="number"
                    value={tempAmbiente}
                    onChange={e => setTempAmbiente(Number(e.target.value || 0))}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold tracking-wide text-slate-300 uppercase">
                    Conductores (3F+N+T = 5)
                  </label>
                  <input
                    type="number"
                    value={nConductores}
                    onChange={e => setNConductores(Number(e.target.value || 0))}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div className="text-xs text-slate-400 mt-3">
                Esto actualiza `temp` y `numConductores` en las conexiones del
                modelo (edges).
              </div>
            </>
          )}

          {step !== 'system' && step !== 'voltage' && step !== 'ambient' && (
            <div className="text-sm text-slate-300">
              Paso en construcción: aquí podemos mapear “Fuente/Trafo”,
              “Protección” y “Validación” a defaults del modelo y reglas del
              backend.
            </div>
          )}
        </div>

        <div className="sticky bottom-0 border-t border-slate-700 bg-slate-900 px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-950/40 hover:bg-slate-950/60 transition text-sm font-bold"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              onClick={() => canPrev && setStepIndex(stepIndex - 1)}
              disabled={!canPrev}
              className={`px-4 py-2 rounded-lg border text-sm font-bold transition ${
                canPrev
                  ? 'border-slate-700 bg-slate-950/40 hover:bg-slate-950/60'
                  : 'border-slate-800 bg-slate-950/20 text-slate-600 cursor-not-allowed'
              }`}
            >
              Atrás
            </button>
            <button
              type="button"
              onClick={() => canNext && setStepIndex(stepIndex + 1)}
              disabled={!canNext}
              className={`px-4 py-2 rounded-lg border text-sm font-bold transition ${
                canNext
                  ? 'border-slate-700 bg-slate-950/40 hover:bg-slate-950/60'
                  : 'border-slate-800 bg-slate-950/20 text-slate-600 cursor-not-allowed'
              }`}
            >
              Siguiente
            </button>
            <button
              type="button"
              onClick={() => {
                onApplyDefaults?.({
                  systemType,
                  primario,
                  secundario,
                  tempAmbiente,
                  nConductores,
                })
                onClose?.()
              }}
              className="px-4 py-2 rounded-lg border border-cyan-300 bg-cyan-700 hover:bg-cyan-600 transition text-sm font-extrabold text-white"
            >
              Aplicar default
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

DefaultEngineeringWizard.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onApplyDefaults: PropTypes.func,
}

