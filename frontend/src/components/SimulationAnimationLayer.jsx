/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { logWarn } from '../utils/logger.js'

const NODE_RADIUS = 34
const DEFAULT_FAULT_CURRENT = 4500

function getNodeLabel(node) {
  return node?.data?.label || node?.data?.nombre || node?.id || 'Nodo'
}

function getNodeCenter(node) {
  const x = Number(node?.position?.x || 0)
  const y = Number(node?.position?.y || 0)
  return { x: x + NODE_RADIUS, y: y + NODE_RADIUS }
}

function pickFaultCurrent(source, faultType) {
  const threePhase =
    source?.isc_3f ||
    source?.I_3F ||
    source?.I3F ||
    source?.Icc ||
    source?.isc ||
    source?.iscMax

  const byType = {
    '3F': threePhase,
    LG: source?.isc_1f || source?.I_1F || source?.I1F || source?.I_LG,
    LL: source?.isc_ll || source?.I_LL || source?.ILL,
    LLG: source?.isc_llg || source?.I_LLG || source?.ILLG,
  }

  const selected = byType[faultType] || threePhase
  const selectedNumber = Number(selected)
  if (Number.isFinite(selectedNumber) && selectedNumber > 0) {
    return selectedNumber
  }

  const threePhaseNumber = Number(threePhase)
  if (!Number.isFinite(threePhaseNumber) || threePhaseNumber <= 0) return null
  if (faultType === 'LL') return threePhaseNumber * 0.866
  if (faultType === 'LLG') return threePhaseNumber * 0.9
  if (faultType === 'LG') return threePhaseNumber * 0.65
  return threePhaseNumber
}

function getFaultCurrent(node, shortCircuitResults, faultType = '3F') {
  const direct = pickFaultCurrent(
    {
      ...node?.data?.results,
      icc: node?.data?.icc,
      Icc: node?.data?.Icc,
      isc: node?.data?.isc,
    },
    faultType
  )

  if (direct) return direct

  const result =
    shortCircuitResults?.nodeResults?.[node?.id] ||
    shortCircuitResults?.puntos?.find?.(p => p.id === node?.id) ||
    shortCircuitResults?.data?.nodeResults?.[node?.id]

  const fromResult = pickFaultCurrent(result, faultType)

  return fromResult || DEFAULT_FAULT_CURRENT
}

function buildAdjacency(edges) {
  const downstream = new Map()
  const upstream = new Map()

  edges.forEach(edge => {
    if (!downstream.has(edge.source)) downstream.set(edge.source, [])
    if (!upstream.has(edge.target)) upstream.set(edge.target, [])
    downstream.get(edge.source).push(edge.target)
    upstream.get(edge.target).push(edge.source)
  })

  return { downstream, upstream }
}

function buildPropagation(nodes, edges, faultNodeId, faultCurrent) {
  const { downstream, upstream } = buildAdjacency(edges)
  const nodeById = new Map(nodes.map(node => [node.id, node]))
  const events = []
  const visited = new Set([faultNodeId])
  const queue = [{ id: faultNodeId, t: 0, depth: 0 }]

  while (queue.length) {
    const current = queue.shift()
    const neighbors = [
      ...(upstream.get(current.id) || []).map(id => ({ id, direction: 'upstream' })),
      ...(downstream.get(current.id) || []).map(id => ({ id, direction: 'downstream' })),
    ]

    neighbors.forEach((neighbor, idx) => {
      if (visited.has(neighbor.id)) return
      visited.add(neighbor.id)
      const delay = current.t + 140 + idx * 55
      const nextNode = nodeById.get(neighbor.id)
      events.push({
        id: `${current.id}-${neighbor.id}-${delay}`,
        from: current.id,
        to: neighbor.id,
        direction: neighbor.direction,
        t: delay,
        current: Math.max(250, faultCurrent * Math.pow(0.82, current.depth + 1)),
        severity: nextNode?.type === 'breaker' ? 'protection' : 'fault',
      })
      queue.push({ id: neighbor.id, t: delay, depth: current.depth + 1 })
    })
  }

  return events.slice(0, 40)
}

function firstPositiveNumber(...values) {
  for (const value of values) {
    const number = Number(value)
    if (Number.isFinite(number) && number > 0) return number
  }
  return null
}

function normalizePickup(value, rating, maxMultiplier = 30) {
  const number = firstPositiveNumber(value)
  if (!number || !rating) return null
  return number <= maxMultiplier ? number * rating : number
}

function normalizeCurvePoint(point) {
  if (Array.isArray(point)) {
    return {
      current: firstPositiveNumber(point[0], point.I, point.current),
      time: firstPositiveNumber(point[1], point.t, point.time),
    }
  }

  return {
    current: firstPositiveNumber(point?.I, point?.current, point?.corriente, point?.x),
    time: firstPositiveNumber(point?.t, point?.time, point?.tiempo, point?.y),
  }
}

function interpolateCurveTime(curve, faultCurrent) {
  const points = (Array.isArray(curve) ? curve : [])
    .map(normalizeCurvePoint)
    .filter(point => point.current && point.time)
    .sort((a, b) => a.current - b.current)

  if (!points.length || !faultCurrent) return null
  if (faultCurrent <= points[0].current) return points[0].time

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const next = points[index]
    if (faultCurrent <= next.current) {
      const currentRatio =
        (Math.log(faultCurrent) - Math.log(previous.current)) /
        (Math.log(next.current) - Math.log(previous.current))
      const logTime =
        Math.log(previous.time) +
        currentRatio * (Math.log(next.time) - Math.log(previous.time))
      return Math.exp(logTime)
    }
  }

  return points[points.length - 1].time
}

function getProtectionData(node) {
  return node?.data?.results?.tcc || node?.data?.tcc || node?.data?.parameters?.tcc || {}
}

function estimateTripTimeSeconds(node, faultCurrent) {
  const protection = getProtectionData(node)
  const parameters = node?.data?.parameters || {}
  const directTripTime = firstPositiveNumber(
    protection.tripTime,
    protection.tiempoDisparo,
    node?.data?.results?.tripTime
  )

  if (directTripTime) {
    return { seconds: directTripTime, source: 'html-tcc' }
  }

  const curveTime = interpolateCurveTime(
    protection.curve || protection.curva || protection.points || protection.puntos,
    faultCurrent
  )

  if (curveTime) {
    return { seconds: curveTime, source: 'html-curve' }
  }

  const rating = firstPositiveNumber(
    protection.rating,
    protection.In,
    protection.iNominal,
    parameters.In,
    parameters.iNominal,
    100
  )
  const pickup = normalizePickup(
    protection.pickup || protection.Ir || parameters.pickup || parameters.Ir || 1,
    rating,
    2
  )
  const shortPickup = normalizePickup(
    protection.shortPickup || protection.Isd || parameters.shortPickup || parameters.Isd || 6,
    rating
  )
  const instantaneous = normalizePickup(
    protection.instantaneous || protection.Ii || parameters.instantaneous || parameters.Ii || 10,
    rating
  )
  const longDelay = firstPositiveNumber(protection.longDelay, protection.Tr, parameters.longDelay, 6)
  const shortDelay = firstPositiveNumber(protection.shortDelay, protection.Tsd, parameters.shortDelay, 0.22)

  if (!faultCurrent || faultCurrent < pickup) return { seconds: null, source: 'no-trip' }
  if (instantaneous && faultCurrent >= instantaneous) return { seconds: 0.02, source: 'estimated-inst' }
  if (shortPickup && faultCurrent >= shortPickup) return { seconds: shortDelay, source: 'estimated-st' }

  const multiple = Math.max(1.01, faultCurrent / rating)
  const seconds = Math.max(0.12, Math.min(10, longDelay * Math.pow(6 / multiple, 2)))
  return { seconds, source: 'estimated-lt' }
}

function findTripSequence(nodes, edges, faultNodeId, faultCurrent) {
  const { upstream } = buildAdjacency(edges)
  const nodeById = new Map(nodes.map(node => [node.id, node]))
  const sequence = []
  const fallback = []
  const visited = new Set()
  const queue = [{ id: faultNodeId, depth: 0 }]

  while (queue.length) {
    const current = queue.shift()
    if (visited.has(current.id)) continue
    visited.add(current.id)

    const node = nodeById.get(current.id)
    if (node?.type === 'breaker') {
      const trip = estimateTripTimeSeconds(node, faultCurrent)
      const tripMs = trip.seconds ? trip.seconds * 1000 : null
      fallback.push({ node, t: 280 + fallback.length * 220, depth: current.depth })

      if (Number.isFinite(tripMs)) {
        sequence.push({
          node,
          t: Math.max(60, Math.min(5000, tripMs)),
          depth: current.depth,
          tripSeconds: trip.seconds,
          source: trip.source,
        })
      }
    }

    ;(upstream.get(current.id) || []).forEach(id => {
      queue.push({ id, depth: current.depth + 1 })
    })
  }

  return (sequence.length
    ? sequence.sort((a, b) => a.t - b.t || a.depth - b.depth)
    : fallback
  ).slice(0, 6)
}

function drawLightning(ctx, start, end, color, alpha = 1) {
  const segments = 9
  const points = [start]
  for (let i = 1; i < segments; i++) {
    const t = i / segments
    const x = start.x + (end.x - start.x) * t + (Math.random() - 0.5) * 18
    const y = start.y + (end.y - start.y) * t + (Math.random() - 0.5) * 18
    points.push({ x, y })
  }
  points.push(end)

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.lineWidth = 2.2
  ctx.shadowColor = color
  ctx.shadowBlur = 16
  ctx.beginPath()
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y)
    else ctx.lineTo(point.x, point.y)
  })
  ctx.stroke()
  ctx.restore()
}

function drawNodePulse(ctx, center, elapsed, color, maxRadius = 120) {
  const progress = (elapsed % 1200) / 1200
  const radius = 18 + progress * maxRadius
  const alpha = Math.max(0, 1 - progress)

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  ctx.shadowColor = color
  ctx.shadowBlur = 24
  ctx.beginPath()
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2)
  ctx.stroke()

  const gradient = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius * 0.9)
  gradient.addColorStop(0, `${color}55`)
  gradient.addColorStop(0.55, `${color}22`)
  gradient.addColorStop(1, 'transparent')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(center.x, center.y, radius * 0.9, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawBreakerFlash(ctx, center, elapsed, label) {
  const progress = Math.min(1, elapsed / 550)
  const alpha = Math.max(0, 1 - progress)

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = '#f97316'
  ctx.strokeStyle = '#fff7ed'
  ctx.shadowColor = '#fb923c'
  ctx.shadowBlur = 28
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.roundRect(center.x - 42, center.y - 22, 84, 44, 12)
  ctx.fill()
  ctx.stroke()

  ctx.globalAlpha = Math.min(1, alpha + 0.2)
  ctx.fillStyle = '#111827'
  ctx.font = 'bold 12px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('TRIP', center.x, center.y + 4)
  if (label) {
    ctx.font = '10px system-ui, sans-serif'
    ctx.fillText(String(label).slice(0, 14), center.x, center.y + 18)
  }
  ctx.restore()
}

export default function SimulationAnimationLayer({ panelPlacement = 'floating' }) {
  const nodes = useStore(state => state.nodes)
  const edges = useStore(state => state.edges)
  const shortCircuitResults = useStore(state => state.shortCircuitResults)
  const calculateShortCircuitFromGraph = useStore(state => state.calculateShortCircuitFromGraph)
  const selectedNode = useStore(state => state.selectedNode)
  const [faultNodeId, setFaultNodeId] = useState('')
  const [faultType, setFaultType] = useState('3F')
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [events, setEvents] = useState([])
  const [trips, setTrips] = useState([])
  const [faultCurrent, setFaultCurrent] = useState(DEFAULT_FAULT_CURRENT)
  const [simStart, setSimStart] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [panelOpen, setPanelOpen] = useState(panelPlacement !== 'bottomBar')
  const canvasRef = useRef(null)
  const frameRef = useRef(null)
  const pauseRef = useRef(false)
  const lastUiTickRef = useRef(0)

  const nodeById = useMemo(() => new Map(nodes.map(node => [node.id, node])), [nodes])
  const availableNodes = useMemo(
    () => nodes.filter(node => !['source', 'transformer'].includes(node.type)),
    [nodes]
  )

  useEffect(() => {
    if (!faultNodeId && availableNodes[0]) setFaultNodeId(availableNodes[0].id)
  }, [availableNodes, faultNodeId])

  useEffect(() => {
    if (selectedNode?.id && availableNodes.some(n => n.id === selectedNode.id)) {
      setFaultNodeId(selectedNode.id)
    }
  }, [availableNodes, selectedNode])

  useEffect(() => {
    const target = nodeById.get(faultNodeId)
    if (!running && target) {
      setFaultCurrent(getFaultCurrent(target, shortCircuitResults, faultType))
    }
  }, [faultNodeId, faultType, nodeById, running, shortCircuitResults])

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    const rect = parent?.getBoundingClientRect?.() || { width: window.innerWidth, height: window.innerHeight }
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.max(1, Math.floor(rect.width * dpr))
    canvas.height = Math.max(1, Math.floor(rect.height * dpr))
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }, [])

  useEffect(() => {
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [resizeCanvas])

  const startSimulation = useCallback(async () => {
    const target = nodeById.get(faultNodeId)
    if (!target) return

    let calcResult = null
    try {
      calcResult = await calculateShortCircuitFromGraph?.()
    } catch (error) {
      // La animación puede correr aunque el backend no responda; usa valores estimados.
      logWarn('[SIM] Cálculo previo no disponible, usando valores estimados:', error?.message)
    }

    const current = getFaultCurrent(target, calcResult || shortCircuitResults, faultType)
    const nextEvents = buildPropagation(nodes, edges, faultNodeId, current)
    const nextTrips = findTripSequence(nodes, edges, faultNodeId, current)

    setFaultCurrent(current)
    setEvents(nextEvents)
    setTrips(nextTrips)
    setSimStart(performance.now())
    setElapsedMs(0)
    setRunning(true)
    setPaused(false)
    pauseRef.current = false
  }, [calculateShortCircuitFromGraph, edges, faultNodeId, faultType, nodeById, nodes, shortCircuitResults])

  const stopSimulation = useCallback(() => {
    setRunning(false)
    setPaused(false)
    pauseRef.current = false
    setEvents([])
    setTrips([])
    setElapsedMs(0)
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
  }, [])

  const togglePause = useCallback(() => {
    setPaused(value => {
      pauseRef.current = !value
      return !value
    })
  }, [])

  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      const parentRect = canvas.parentElement?.getBoundingClientRect?.() || {
        width: canvas.width,
        height: canvas.height,
      }

      // Alinear la animación con el diagrama unifilar (ReactFlow) respetando pan/zoom.
      // ReactFlow aplica un transform CSS al viewport; lo replicamos en el canvas.
      const dpr = window.devicePixelRatio || 1
      const viewportEl = document.querySelector('.react-flow__viewport')
      const rawTransform = viewportEl
        ? window.getComputedStyle(viewportEl).transform
        : 'none'

      let translateX = 0
      let translateY = 0
      let zoom = 1
      if (rawTransform && rawTransform !== 'none') {
        // matrix(a, b, c, d, tx, ty) donde a=d=zoom (sin skew)
        const match = rawTransform.match(/matrix\(([^)]+)\)/)
        if (match && match[1]) {
          const parts = match[1]
            .split(',')
            .map(v => parseFloat(String(v).trim()))
            .filter(v => Number.isFinite(v))
          if (parts.length === 6) {
            zoom = parts[0] || 1
            translateX = parts[4] || 0
            translateY = parts[5] || 0
          }
        }
      }

      // Clear in screen space
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, parentRect.width, parentRect.height)
      // Draw in graph space -> screen space
      ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * translateX, dpr * translateY)

      if (!running || pauseRef.current) {
        frameRef.current = requestAnimationFrame(draw)
        return
      }

      const now = performance.now()
      const elapsed = now - simStart
      if (now - lastUiTickRef.current > 80) {
        lastUiTickRef.current = now
        setElapsedMs(elapsed)
      }
      const target = nodeById.get(faultNodeId)
      const targetCenter = getNodeCenter(target)

      // Flow glow sobre todos los conductores.
      edges.forEach((edge, index) => {
        const source = nodeById.get(edge.source)
        const targetEdge = nodeById.get(edge.target)
        if (!source || !targetEdge) return
        const a = getNodeCenter(source)
        const b = getNodeCenter(targetEdge)
        const phase = ((elapsed / 850 + index * 0.19) % 1)
        const px = a.x + (b.x - a.x) * phase
        const py = a.y + (b.y - a.y) * phase

        ctx.save()
        ctx.strokeStyle = 'rgba(59,130,246,0.18)'
        ctx.lineWidth = 6
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()

        ctx.fillStyle = 'rgba(96,165,250,0.92)'
        ctx.shadowColor = '#60a5fa'
        ctx.shadowBlur = 12
        ctx.beginPath()
        ctx.arc(px, py, 3.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      })

      // Falla central.
      if (target) {
        drawNodePulse(ctx, targetCenter, elapsed, '#ef4444', 130)
        const arcEnd = {
          x: targetCenter.x + Math.sin(elapsed / 75) * 38,
          y: targetCenter.y - 42 + Math.cos(elapsed / 90) * 16,
        }
        drawLightning(ctx, targetCenter, arcEnd, '#fef08a', 0.95)
      }

      // Propagación tipo onda por eventos.
      events.forEach(event => {
        const t = elapsed - event.t
        if (t < 0 || t > 1900) return
        const from = nodeById.get(event.from)
        const to = nodeById.get(event.to)
        if (!from || !to) return
        const a = getNodeCenter(from)
        const b = getNodeCenter(to)
        const progress = Math.min(1, t / 700)
        const alpha = Math.max(0, 1 - t / 1900)
        const x = a.x + (b.x - a.x) * progress
        const y = a.y + (b.y - a.y) * progress

        ctx.save()
        ctx.globalAlpha = alpha
        ctx.strokeStyle = event.direction === 'upstream' ? '#fb923c' : '#ef4444'
        ctx.lineWidth = 4
        ctx.shadowColor = ctx.strokeStyle
        ctx.shadowBlur = 14
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(x, y)
        ctx.stroke()

        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(x, y, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      })

      // Trips de breakers.
      trips.forEach(trip => {
        const t = elapsed - trip.t
        if (t < 0 || t > 1400) return
        const tripLabel = trip.tripSeconds
          ? `${getNodeLabel(trip.node)} ${trip.tripSeconds.toFixed(2)}s`
          : getNodeLabel(trip.node)
        drawBreakerFlash(ctx, getNodeCenter(trip.node), t, tripLabel)
      })

      if (elapsed > 5200) {
        setRunning(false)
        setElapsedMs(5200)
      }

      frameRef.current = requestAnimationFrame(draw)
    }

    frameRef.current = requestAnimationFrame(draw)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [edges, events, faultNodeId, nodeById, running, simStart, trips])

  const activeTripCount = running || elapsedMs > 0
    ? trips.filter(trip => elapsedMs >= trip.t).length
    : 0
  const activeEventCount = running || elapsedMs > 0
    ? events.filter(event => elapsedMs >= event.t).length
    : 0

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-20"
        aria-hidden="true"
      />

      <div className={panelPlacement === 'bottomBar'
        // Reservar espacio para el panel lateral derecho de Propiedades (w-80).
        ? 'absolute bottom-4 left-4 right-80 z-30 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-2xl backdrop-blur max-h-[20vh] overflow-auto'
        : 'absolute top-24 right-4 z-30 w-[360px] max-w-[calc(100%-2rem)] rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur'}
      >
        <div className={panelPlacement === 'bottomBar'
          ? 'mb-2 flex items-center justify-between gap-2'
          : 'mb-3 flex items-center justify-between gap-2'}
        >
          <div>
            <h3 className="text-base font-bold text-slate-900">⚡ Simulación animada</h3>
            {panelPlacement !== 'bottomBar' && (
              <p className="text-xs text-slate-500">
                Falla, arco, onda radial y disparo de breaker.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setPanelOpen(value => !value)}
            className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200"
          >
            {panelOpen ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>

        {panelOpen && (
          <div className={panelPlacement === 'bottomBar' ? 'grid grid-cols-1 gap-2 md:grid-cols-3 md:items-start' : 'space-y-3'}>
            {/* Column 1: selectors */}
            <div className={panelPlacement === 'bottomBar' ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-2 gap-2'}>
              <label className="text-[11px] font-semibold text-slate-600">
                Tipo de falla
                <select
                  value={faultType}
                  onChange={e => setFaultType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                >
                  <option value="3F">3F</option>
                  <option value="LG">LG</option>
                  <option value="LL">LL</option>
                  <option value="LLG">LLG</option>
                </select>
              </label>
              <label className="text-[11px] font-semibold text-slate-600">
                Nodo de falla
                <select
                  value={faultNodeId}
                  onChange={e => setFaultNodeId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                >
                  {availableNodes.map(node => (
                    <option key={node.id} value={node.id}>
                      {getNodeLabel(node)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Column 2: stats */}
            <div className={panelPlacement === 'bottomBar' ? 'grid grid-cols-3 gap-2 text-center text-[11px]' : 'grid grid-cols-3 gap-2 text-center text-xs'}>
              <div className="rounded-xl bg-red-50 p-2 text-red-700">
                <div className="font-bold">{Number(faultCurrent).toLocaleString()} A</div>
                <div>I falla</div>
              </div>
              <div className="rounded-xl bg-orange-50 p-2 text-orange-700">
                <div className="font-bold">{activeTripCount}/{trips.length}</div>
                <div>Trips</div>
              </div>
              <div className="rounded-xl bg-blue-50 p-2 text-blue-700">
                <div className="font-bold">{activeEventCount}/{events.length}</div>
                <div>Eventos</div>
              </div>
            </div>

            {/* Column 3: controls + status */}
            <div className={panelPlacement === 'bottomBar' ? 'space-y-2' : 'space-y-3'}>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={startSimulation}
                  disabled={!faultNodeId || availableNodes.length === 0}
                  className={panelPlacement === 'bottomBar'
                    ? 'flex-1 rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300'
                    : 'flex-1 rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300'}
                >
                  ▶ Falla
                </button>
                <button
                  type="button"
                  onClick={togglePause}
                  disabled={!running}
                  className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {paused ? '▶' : '⏸'}
                </button>
                <button
                  type="button"
                  onClick={stopSimulation}
                  className="rounded-xl bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  ■
                </button>
              </div>

              <div className={panelPlacement === 'bottomBar' ? 'rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-600' : 'rounded-xl bg-slate-50 p-3 text-xs text-slate-600'}>
                <div className="font-semibold text-slate-800">Estado</div>
                {running ? (
                  <div>
                    {paused ? 'Pausado' : `Animando ${faultType} en ${getNodeLabel(nodeById.get(faultNodeId))}`}
                  </div>
                ) : (
                  <div>Listo. Selecciona un nodo o dispara.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
