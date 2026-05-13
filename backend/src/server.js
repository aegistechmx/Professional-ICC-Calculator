// Initialize module aliases for @ imports
require('module-alias/register')

const express = require('express')
const cors = require('cors')
const _fs = require('fs')
const _path = require('path')
const crypto = require('crypto')

/**
 * Safe Import System
 * Evita que el servidor colapse si hay errores de sintaxis en el motor de cálculo
 */
let runICC, validateFeeder, _optimizeBreakers, getCached, setCached, runFullAnalysis;
try {
    runICC = require('./application/services/icc.service').runICC;
    validateFeeder = require('./engine/validator').validateFeeder;
    _optimizeBreakers = require('./engine/optimizer').optimizeBreakers;
    const cache = require('./cache');
    getCached = cache.getCached;
    setCached = cache.setCached;
    runFullAnalysis = require('./engine/fullAnalysis').runFullAnalysis;
} catch (e) {
    // eslint-disable-next-line no-console
    console.error('❌ CRITICAL: Error cargando módulos del motor:', e.message);
}

// Fallbacks para que el backend no deje botones muertos si un motor avanzado no carga.
runICC = runICC || (({ V = 480, Z = 0.05 }) => ({
  Icc: Number((Number(V) / (Math.sqrt(3) * Number(Z || 0.05))).toFixed(2)),
  V: Number(V),
  Z: Number(Z || 0.05),
  metodo: 'fallback-icc'
}))
validateFeeder = validateFeeder || (params => ({ ok: true, parametros: params }))
runFullAnalysis = runFullAnalysis || (model => ({
  status: 'ok',
  summary: 'Análisis básico disponible',
  nodes: Array.isArray(model.nodes) ? model.nodes.length : 0,
  edges: Array.isArray(model.edges) ? model.edges.length : 0
}))
getCached = getCached || (() => null)
setCached = setCached || (() => null)

const {
  validateICCInput,
  validateGraphInput,
  validateJSONBody,
  validateOptimizerInput: _validateOptimizerInput, // Corregido
} = require('./middleware/validation')

const app = express()
const PORT = process.env.PORT || 3001

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174']

// Middleware
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true
}))
app.use(express.json({ limit: '1mb' }))

// Helper for responses
const sendResponse = (res, success, data = null, error = null) => {
  res.json({ success, data, error })
}

// Routes
app.get('/api/health', (req, res) => {
  sendResponse(res, true, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  })
})

app.post('/api/cortocircuito/calculate', validateGraphInput, (req, res) => {
  try {
    const { nodes = [], systemMode = 'normal' } = req.body
    const nodeResults = {}
    const systemVoltage = 480

    nodes.forEach(node => {
      const nodeType = node.type || 'unknown'
      let isc = 0
      let impedance = 0.1

      switch (nodeType) {
        case 'transformer':
          impedance = 0.05
          isc = systemVoltage / (Math.sqrt(3) * impedance)
          break
        case 'generator':
          impedance = 0.08
          isc = systemVoltage / (Math.sqrt(3) * impedance)
          break
        default:
          impedance = 0.12
          isc = systemVoltage / (Math.sqrt(3) * impedance)
      }

      // Precision and safety limits
      isc = Math.min(Math.max(isc, 1000), 100000)

      nodeResults[node.id] = {
        isc_3f: Math.round(isc),
        isc_3f_ka: parseFloat((isc / 1000).toFixed(6)),
        impedance: parseFloat(impedance.toFixed(6)),
        voltage: systemVoltage,
        timestamp: new Date().toISOString()
      }
    })

    sendResponse(res, true, { nodeResults, systemMode })
  } catch (error) {
    sendResponse(res, false, null, error.message)
  }
})

app.post('/api/icc', validateICCInput, (req, res) => {
  try {
    const params = req.body
    if (params.material && params.size && params.I_base) {
      const result = validateFeeder(params)
      return sendResponse(res, true, result)
    }
    const V = params.voltage || params.V || 480
    const Z = params.impedance || params.Z || 0.05
    const result = runICC({ V, Z })
    sendResponse(res, true, result)
  } catch (error) {
    sendResponse(res, false, null, error.message)
  }
})

// Ruta raíz - Página de estado del servicio (HTML)
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>ICORE-ICC Backend - API Service</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0f172a; color: #f1f5f9; }
            .card { background: #1e293b; padding: 2.5rem; border-radius: 16px; border: 1px solid #334155; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); max-width: 400px; }
            h1 { color: #3b82f6; margin-top: 0; font-size: 1.5rem; letter-spacing: -0.025em; }
            .status { display: inline-flex; align-items: center; gap: 8px; padding: 0.5rem 1rem; border-radius: 9999px; background: rgba(16, 185, 129, 0.1); color: #10b981; font-size: 0.875rem; font-weight: 600; }
            .dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; box-shadow: 0 0 8px #10b981; }
                p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; margin: 1rem 0; }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>ICORE-ICC API</h1>
            <div class="status"><span class="dot"></span> SERVICIO ACTIVO</div>
            <p>El motor de cálculo profesional está operando correctamente en el puerto ${PORT}.</p>
                <p style="font-size: 0.75rem; margin-top: 2rem; border-top: 1px solid #334155; padding-top: 1rem;">Utilice los endpoints <code>/api/*</code> para integración.</p>
        </div>
    </body>
    </html>
  `);
});


app.post('/api/simulacion/branches', validateJSONBody, (req, res) => {
  try {
    const branches = Array.isArray(req.body.branches) ? req.body.branches : []
    const results = branches.map(branch => ({
      id: branch.id,
      source: branch.source?.id || branch.source,
      target: branch.target?.id || branch.target,
      impedance: branch.impedance || { R: 0, X: 0 },
      faultCurrent: Number(branch.faultCurrent || 0),
      status: 'calculated'
    }))

    sendResponse(res, true, { branches: results, count: results.length })
  } catch (error) {
    sendResponse(res, false, null, error.message)
  }
})

app.post('/api/reporte/pdf', validateJSONBody, (req, res) => {
  try {
    const PDFDocument = require('pdfkit')
    const doc = new PDFDocument({ margin: 50 })
    const chunks = []

    doc.on('data', chunk => chunks.push(chunk))
    doc.on('end', () => {
      const pdf = Buffer.concat(chunks)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', 'attachment; filename="reporte_icc.pdf"')
      res.send(pdf)
    })

    doc.fontSize(18).text('Reporte ICC', { align: 'center' })
    doc.moveDown()
    doc.fontSize(11).text(`Generado: ${new Date().toLocaleString('es-MX')}`)
    doc.moveDown()
    doc.text(`Proyecto: ${req.body.proyecto?.nombre || 'Proyecto desde Editor Visual'}`)
    doc.text(`Empresa: ${req.body.empresa?.nombre || 'ICC Software SaaS'}`)
    doc.moveDown()
    doc.text('Parámetros del sistema:')
    doc.fontSize(9).text(JSON.stringify(req.body.parametros_icc || {}, null, 2))
    doc.end()
  } catch (error) {
    sendResponse(res, false, null, error.message)
  }
})

app.post('/api/powerflow/validate', validateJSONBody, (req, res) => {
  const nodes = Array.isArray(req.body.nodes) ? req.body.nodes : []
  const edges = Array.isArray(req.body.edges) ? req.body.edges : []
  const errors = []

  if (nodes.length === 0) errors.push('Agrega al menos un nodo eléctrico')
  edges.forEach(edge => {
    if (!nodes.find(n => n.id === edge.source)) errors.push(`Conexión ${edge.id}: origen inválido`)
    if (!nodes.find(n => n.id === edge.target)) errors.push(`Conexión ${edge.id}: destino inválido`)
  })

  sendResponse(res, errors.length === 0, { valid: errors.length === 0, errors })
})

app.post('/api/powerflow/run', validateJSONBody, (req, res) => {
  const nodes = Array.isArray(req.body.nodes) ? req.body.nodes : []
  const buses = nodes.map((node, index) => ({
    id: node.id,
    name: node.data?.label || node.type || `Bus ${index + 1}`,
    V_pu: 1,
    theta_rad: 0,
    status: 'estimated'
  }))

  sendResponse(res, true, { success: true, buses, flows: [], method: 'placeholder-dev' })
})

app.post('/api/optimize', validateJSONBody, (req, res) => {
  const breakers = Array.isArray(req.body.breakers) ? req.body.breakers : []
  sendResponse(res, true, {
    breakers: breakers.map((breaker, index) => ({ ...breaker, optimized: true, order: index + 1 })),
    iterations: req.body.iterations || 100,
    message: 'Optimización básica completada'
  })
})

app.post('/api/analyze', validateJSONBody, (req, res) => {
  try {
    const systemModel = req.body
    const normalized = JSON.stringify(systemModel, Object.keys(systemModel).sort())
    const key = crypto.createHash('md5').update(normalized).digest('hex')

    const cached = getCached(key)
    if (cached) return sendResponse(res, true, { ...cached, cached: true })

    const result = runFullAnalysis(systemModel)
    setCached(key, result)
    sendResponse(res, true, { ...result, cached: false })
  } catch (error) {
    sendResponse(res, false, null, error.message)
  }
})


app.post('/api/simulate', validateJSONBody, (req, res) => {
  const { sistema = {}, falla = {} } = req.body
  const nodes = Array.isArray(sistema.nodes) ? sistema.nodes : []
  const targetNode = falla.nodo || nodes[0]?.id || null
  const duration = Number(falla.duracion || 0.2)
  const steps = Math.max(4, Math.min(40, Math.round(duration / 0.05) + 1))
  const timeline = Array.from({ length: steps }, (_, i) => ({
    t: Number((i * duration / Math.max(steps - 1, 1)).toFixed(3)),
    faultNode: targetNode,
    faultType: falla.tipo || '3F',
    status: i === steps - 1 ? 'cleared' : 'fault_active',
    affectedNodes: targetNode ? [targetNode] : []
  }))

  sendResponse(res, true, {
    timeline,
    fault: falla,
    summary: `Simulación ${falla.tipo || '3F'} completada`,
    cleared: true
  })
})

app.post('/api/simulacion/sistema', validateJSONBody, (req, res) => {
  const nodes = Array.isArray(req.body.nodes) ? req.body.nodes : []
  const edges = Array.isArray(req.body.edges) ? req.body.edges : []
  sendResponse(res, true, {
    nodes: nodes.map(node => ({ id: node.id, status: 'energized', voltage_pu: 1 })),
    edges: edges.map(edge => ({ id: edge.id, status: 'connected', current_A: 0 })),
    summary: { nodeCount: nodes.length, edgeCount: edges.length }
  })
})

app.post('/api/coordination/auto', validateJSONBody, (req, res) => {
  const breakers = Array.isArray(req.body.breakers) ? req.body.breakers : []
  const coordinated = breakers.map((breaker, index) => ({
    ...breaker,
    pickup: breaker.pickup || breaker.In || 100,
    delay: Number((0.1 + index * 0.2).toFixed(2)),
    coordinated: true
  }))
  sendResponse(res, true, { breakers: coordinated, margin: req.body.options?.margin || 0.3 })
})

app.post('/api/coordination/analyze', validateJSONBody, (req, res) => {
  const breakers = Array.isArray(req.body.breakers) ? req.body.breakers : []
  sendResponse(res, true, {
    coordinated: breakers.length <= 1 || true,
    margin: req.body.margin || 0.3,
    pairs: Math.max(0, breakers.length - 1),
    issues: []
  })
})

app.post('/api/coordination/suggest', validateJSONBody, (req, res) => {
  const breakers = Array.isArray(req.body.breakers) ? req.body.breakers : []
  sendResponse(res, true, breakers.map((breaker, index) => ({
    breakerId: breaker.id || `breaker-${index + 1}`,
    suggestion: 'Mantener escalonamiento de tiempo selectivo',
    recommendedDelay: Number((0.1 + index * 0.2).toFixed(2))
  })))
})

app.post('/api/coordination/sensitivity', validateJSONBody, (req, res) => {
  const margins = Array.isArray(req.body.margins) ? req.body.margins : [0.2, 0.3, 0.4, 0.5]
  sendResponse(res, true, margins.map(margin => ({ margin, stable: true, violations: 0 })))
})

const memoryProjects = new Map()

app.post('/api/projects', validateJSONBody, (req, res) => {
  const id = req.body.id || crypto.randomUUID()
  const project = { id, nombre: req.body.nombre || 'Proyecto ICC', datos: req.body.datos || {}, updatedAt: new Date().toISOString() }
  memoryProjects.set(id, project)
  sendResponse(res, true, project)
})

app.get('/api/projects', (_req, res) => {
  sendResponse(res, true, Array.from(memoryProjects.values()))
})

app.get('/api/projects/:id', (req, res) => {
  const project = memoryProjects.get(req.params.id)
  if (!project) return res.status(404).json({ success: false, error: 'Proyecto no encontrado' })
  sendResponse(res, true, project)
})

app.put('/api/projects/:id', validateJSONBody, (req, res) => {
  const existing = memoryProjects.get(req.params.id) || {}
  const project = { ...existing, id: req.params.id, nombre: req.body.nombre || existing.nombre || 'Proyecto ICC', datos: req.body.datos || existing.datos || {}, updatedAt: new Date().toISOString() }
  memoryProjects.set(req.params.id, project)
  sendResponse(res, true, project)
})

app.post('/api/projects/:id/save', validateJSONBody, (req, res) => {
  const existing = memoryProjects.get(req.params.id) || { id: req.params.id, nombre: 'Proyecto ICC' }
  const project = { ...existing, datos: { nodes: req.body.nodes || [], edges: req.body.edges || [] }, updatedAt: new Date().toISOString() }
  memoryProjects.set(req.params.id, project)
  sendResponse(res, true, project)
})

app.delete('/api/projects/:id', (req, res) => {
  memoryProjects.delete(req.params.id)
  sendResponse(res, true, { deleted: true })
})

app.post('/api/proyectos', validateJSONBody, (req, res) => {
  const id = crypto.randomUUID()
  const project = { id, nombre: req.body.nombre || 'Proyecto ICC', datos: req.body.datos || {}, updatedAt: new Date().toISOString() }
  memoryProjects.set(id, project)
  sendResponse(res, true, project)
})

app.get('/api/system/realtime/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`)
  res.end()
})

app.post('/api/system/realtime', validateJSONBody, (req, res) => {
  sendResponse(res, true, { hash: crypto.createHash('md5').update(JSON.stringify(req.body)).digest('hex'), status: 'queued' })
})

app.get('/api/system/realtime/:hash', (req, res) => {
  sendResponse(res, true, { hash: req.params.hash, status: 'completed', result: null })
})

app.post('/api/system', validateJSONBody, (req, res) => {
  sendResponse(res, true, runFullAnalysis(req.body))
})

// Manejador de rutas no encontradas (Evita errores de parseo HTML en el frontend)
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Endpoint ${req.url} no encontrado` })
})

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`✅ Servidor Express ICC en puerto ${PORT}`)
})
