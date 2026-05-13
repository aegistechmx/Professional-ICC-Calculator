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

// Manejador de rutas no encontradas (Evita errores de parseo HTML en el frontend)
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Endpoint ${req.url} no encontrado` })
})

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`✅ Servidor Express ICC en puerto ${PORT}`)
})
