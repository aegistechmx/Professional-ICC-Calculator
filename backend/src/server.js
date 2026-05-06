const http = require('http')
const fs = require('fs')
const path = require('path')

// Import professional ICC service
const { runICC } = require('./application/icc.service')
// Import new validation engine
const { validateFeeder } = require('./engine/validator')
// Import optimizer
const { optimizeBreakers } = require('./engine/optimizer')
// Import cache and full analysis
const { getCached, setCached } = require('./cache')
const { runFullAnalysis } = require('./engine/fullAnalysis')
const {
  validateICCInput,
  _validateFeederInput,
  validateGraphInput,
  validateOptimizerInput,
  validateJSONBody
} = require('./middleware/validation')
const crypto = require('crypto')

// Allowed origins from environment or defaults
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174']

// Standardized ICC API Server
const server = http.createServer((req, res) => {
  // Enable CORS for specific origins only
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  // Standard response helper
  const sendResponse = (success, data = null, error = null) => {
    const response = { success }
    if (success && data) {
      response.data = data
    }
    if (!success && error) {
      response.error = error
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(response))
  }

  // HEALTH CHECK ENDPOINT: GET /api/health
  if (req.method === 'GET' && req.url === '/api/health') {
    sendResponse(true, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      service: 'ICC Professional API'
    })

    // ROOT ENDPOINT: GET / - Serve HTML UI
  } else if (req.method === 'GET' && req.url === '/') {
    try {
      const htmlPath = path.join(__dirname, 'server-ui.html')
      const htmlContent = fs.readFileSync(htmlPath, 'utf8')

      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      })
      res.end(htmlContent)
    } catch (error) {
      // Fallback to JSON if HTML file not found
      sendResponse(true, {
        name: 'ICC Calculator Professional API',
        version: '1.0.0',
        description: 'Professional Power System Calculation API with IEEE 1584 Standards',
        endpoints: {
          health: 'GET /api/health',
          calculate: 'POST /api/icc',
          info: 'GET /api/',
          root: 'GET /',
          legacy: 'GET /icc'
        },
        standards: ['IEEE 1584', 'IEC 60909'],
        precision: '6 decimal places internal, 2 decimal places output',
        message: 'Welcome to ICC Professional API - Use POST /api/icc for calculations'
      })
    }

    // API INFO ENDPOINT: GET /api/
  } else if (req.method === 'GET' && req.url === '/api/') {
    sendResponse(true, {
      name: 'ICC Calculator Professional API',
      version: '1.0.0',
      description: 'Professional Power System Calculation API with IEEE 1584 Standards',
      endpoints: {
        health: 'GET /api/health',
        calculate: 'POST /api/icc',
        cortocircuito: 'POST /api/cortocircuito/calculate',
        analyze: 'POST /api/analyze',
        optimize: 'POST /api/optimize',
        info: 'GET /api/',
        root: 'GET /',
        legacy: 'GET /icc'
      },
      standards: ['IEEE 1584', 'IEC 60909'],
      precision: '6 decimal places internal, 2 decimal places output'
    })

    // CORTOCIRCUITO ENDPOINT: POST /api/cortocircuito/calculate
  } else if (req.method === 'POST' && req.url === '/api/cortocircuito/calculate') {
    let body = ''

    req.on('data', chunk => {
      body += chunk.toString()
    })

    req.on('end', () => {
      try {
        // Basic sanitization - limit body size and remove dangerous patterns
        if (body.length > 1000000) { // 1MB limit
          return sendResponse(false, null, 'Request body too large')
        }

        // Remove potential prototype pollution patterns
        const sanitizedBody = body.replace(/\b__proto__\b/g, '')
          .replace(/\bconstructor\b/g, '')
          .replace(/\bprototype\b/g, '')

        const data = JSON.parse(sanitizedBody)

        // Apply input validation
        const mockReq = { body: data }
        const mockRes = {
          status: () => ({ json: (response) => response })
        }
        let validationResult = { error: null }
        const next = (error) => { validationResult = error || { error: null } }

        validateGraphInput(mockReq, mockRes, next)
        if (validationResult.error) {
          return sendResponse(false, null, validationResult.error)
        }
        const nodes = data.nodes || []
        const edges = data.edges || []
        const systemMode = data.systemMode || 'normal'


        // Calculate ICC per node using proper electrical formulas
        const nodeResults = {}
        const systemVoltage = 220 // V (typical industrial voltage)

        nodes.forEach(node => {
          const nodeType = node.type || 'unknown'
          let isc = 0
          let impedance = 0.1 // Default impedance

          // Find edges connected to this node
          const connectedEdges = edges.filter(e => e.source === node.id || e.target === node.id)

          // Calculate impedance based on node type and connections
          switch (nodeType) {
            case 'transformer':
              // Transformer impedance: typically 5-6% of rating
              impedance = 0.05 // 5% impedance
              isc = systemVoltage / (Math.sqrt(3) * impedance)
              break
            case 'generator':
              // Generator subtransient reactance: typically 15-25%
              impedance = 0.08 // 8% subtransient reactance
              isc = systemVoltage / (Math.sqrt(3) * impedance)
              break
            case 'breaker':
              // Breaker inherits ICC from upstream source
              const sourceEdge = edges.find(e => e.target === node.id)
              if (sourceEdge) {
                const sourceNode = nodes.find(n => n.id === sourceEdge.source)
                const sourceResult = nodeResults[sourceNode?.id]
                if (sourceResult) {
                  isc = sourceResult.isc_3f * 0.95 // 5% voltage drop through breaker
                } else {
                  impedance = 0.06
                  isc = systemVoltage / (Math.sqrt(3) * impedance)
                }
              } else {
                impedance = 0.06
                isc = systemVoltage / (Math.sqrt(3) * impedance)
              }
              break
            case 'panel':
              // Panel impedance: includes conductors and protective devices
              impedance = 0.12 // Higher impedance due to distribution
              isc = systemVoltage / (Math.sqrt(3) * impedance)
              break
            case 'generator_ats':
              // Automatic Transfer Switch: depends on system mode
              if (systemMode === 'emergency') {
                impedance = 0.08
                isc = systemVoltage / (Math.sqrt(3) * impedance)
              } else {
                isc = 0 // No contribution in normal mode
              }
              break
            default:
              impedance = 0.15
              isc = systemVoltage / (Math.sqrt(3) * impedance)
          }

          // Apply safety factor and convert to reasonable range
          isc = Math.min(Math.max(isc, 1000), 10000) // Limit between 1kA-10kA

          nodeResults[node.id] = {
            isc_3f: Math.round(isc),
            isc_1f: Math.round(isc * 0.577), // 1/√3 for single line-to-ground
            isc_3f_ka: Math.round(isc / 10) / 1000, // 2 decimal places in kA
            isc_1f_ka: Math.round((isc * 0.577) / 10) / 1000,
            nodeType,
            connectedEdges: connectedEdges.length,
            impedance: Math.round(impedance * 1000) / 1000, // 3 decimal places
            voltage: systemVoltage,
            timestamp: new Date().toISOString()
          }
        })

        const result = {
          success: true,
          data: {
            nodeResults,
            summary: {
              totalNodes: nodes.length,
              totalEdges: edges.length,
              systemMode,
              maxIcc: Math.max(...Object.values(nodeResults).map(r => r.isc_3f_ka || 0)),
              minIcc: Math.min(...Object.values(nodeResults).filter(r => r.isc_3f_ka > 0).map(r => r.isc_3f_ka || Infinity))
            }
          }
        }

        sendResponse(true, result.data)

      } catch (error) {
        sendResponse(false, null, 'Error en cálculo de cortocircuito: ' + error.message)
      }
    })

    // MAIN ENDPOINT: POST /api/icc
  } else if (req.method === 'POST' && req.url === '/api/icc') {
    let body = ''

    req.on('data', chunk => {
      body += chunk.toString()
    })

    req.on('end', () => {
      try {
        const params = JSON.parse(body)

        // Apply input validation
        const mockReq = { body: params }
        const mockRes = {
          status: () => ({ json: (response) => response })
        }
        let validationResult = { error: null }
        const next = (error) => { validationResult = error || { error: null } }

        validateICCInput(mockReq, mockRes, next)
        if (validationResult.error) {
          return sendResponse(false, null, validationResult.error)
        }

        // Check if it's a feeder validation request (new engine)
        if (params.material && params.size && params.I_base) {
          try {
            const result = validateFeeder(params)
            sendResponse(true, result)
          } catch (error) {
            sendResponse(false, null, error.message)
          }
        } else {
          // Legacy ICC calculation (voltage/impedance)
          const V = params.voltage || params.V || 220 // voltage (V)
          const Z = params.impedance || params.Z || 0.05 // impedance (Ω)

          if (Z <= 0) {
            return sendResponse(false, null, 'La impedancia debe ser mayor a cero')
          }

          const result = runICC({ V, Z })
          sendResponse(true, result)
        }

      } catch (error) {
        sendResponse(false, null, 'Error en formato de datos')
      }
    })

    // OPTIMIZER ENDPOINT: POST /api/optimize
  } else if (req.method === 'POST' && req.url === '/api/optimize') {
    let body = ''

    req.on('data', chunk => {
      body += chunk.toString()
    })

    req.on('end', () => {
      try {
        const params = JSON.parse(body)

        // Apply input validation
        const mockReq = { body: params }
        const mockRes = {
          status: () => ({ json: (response) => response })
        }
        let validationResult = { error: null }
        const next = (error) => { validationResult = error || { error: null } }

        validateOptimizerInput(mockReq, mockRes, next)
        if (validationResult.error) {
          return sendResponse(false, null, validationResult.error)
        }
        const { breakers, faults, iterations = 100 } = params

        if (!breakers || !faults) {
          return sendResponse(false, null, 'Se requieren breakers y faults')
        }

        const result = optimizeBreakers({
          breakers,
          faults,
          iterations,
          temperature: 1.0
        })

        sendResponse(true, result)

      } catch (error) {
        sendResponse(false, null, error.message)
      }
    })

    // FULL ANALYSIS ENDPOINT: POST /api/analyze (with cache)
  } else if (req.method === 'POST' && req.url === '/api/analyze') {
    let body = ''

    req.on('data', chunk => {
      body += chunk.toString()
    })

    req.on('end', () => {
      try {
        // Basic sanitization - limit body size and remove dangerous patterns
        if (body.length > 1000000) { // 1MB limit
          return sendResponse(false, null, 'Request body too large')
        }

        // Remove potential prototype pollution patterns
        const sanitizedBody = body.replace(/\b__proto__\b/g, '')
          .replace(/\bconstructor\b/g, '')
          .replace(/\bprototype\b/g, '')

        const systemModel = JSON.parse(sanitizedBody)

        // Apply input validation
        const mockReq = { body: systemModel, method: 'POST' }
        const mockRes = {
          status: () => ({ json: (response) => response })
        }
        let validationResult = { error: null }
        const next = (error) => { validationResult = error || { error: null } }

        validateJSONBody(mockReq, mockRes, next)
        if (validationResult.error) {
          return sendResponse(false, null, validationResult.error)
        }

        // Generate cache key from system model hash (normalized for stable key)
        const normalized = JSON.stringify(systemModel, Object.keys(systemModel).sort())
        const key = crypto
          .createHash('md5')
          .update(normalized)
          .digest('hex')

        // Check cache
        const cached = getCached(key)
        if (cached) {
          return sendResponse(true, { ...cached, cached: true })
        }

        // Run full analysis
        const result = runFullAnalysis(systemModel)

        // Store in cache
        setCached(key, result)

        sendResponse(true, { ...result, cached: false })

      } catch (error) {
        sendResponse(false, null, error.message)
      }
    })

    // TEMPORARY ALIASES (legacy support)
  } else if (req.url === '/icc' || req.url === '/cortocircuito/calculate' || req.url === '/api/cortocircuito/calculate') {
    try {
      const V = 220
      const Z = 0.05

      // Use professional ICC service for legacy endpoints too
      const result = runICC({ V, Z })
      result.method = 'legacy_professional'

      // Validate result before sending
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid result from ICC calculation')
      }

      // Ensure result is serializable
      try {
        const _jsonString = JSON.stringify(result)
      } catch (serializeError) {
        // Send fallback result
        const fallbackResult = {
          method: 'legacy_fallback',
          Icc: Math.round((V / (Math.sqrt(3) * Z)) * 100) / 100,
          voltage: V,
          impedance: Z,
          precision: 'IEEE_1584',
          formula: 'Isc = V / (sqrt(3) * Z)',
          error: 'Serialization error, using fallback'
        }
        sendResponse(true, fallbackResult)
        return
      }

      // Send the validated result
      sendResponse(true, result)

    } catch (error) {
      sendResponse(false, null, `ICC calculation error: ${error.message}`)
    }

    // DEFAULT: Not found
  } else {
    sendResponse(false, null, 'Endpoint no encontrado. Use POST /api/icc')
  }
})

server.listen(3001, () => {
  // eslint-disable-next-line no-console
  console.log('✅ Servidor ICC en puerto 3001')
})
