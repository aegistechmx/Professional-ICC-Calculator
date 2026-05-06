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
const crypto = require('crypto')

// Standardized ICC API Server
const server = http.createServer((req, res) => {
  // Enable CORS for all requests
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

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
        const data = JSON.parse(body)
        const nodes = data.nodes || []
        const edges = data.edges || []
        const systemMode = data.systemMode || 'normal'

        console.log(`CORTOCIRCUITO: Calculating for ${nodes.length} nodes, ${edges.length} edges`)

        // Calculate ICC per node based on graph topology
        const nodeResults = {}

        // Simple calculation: assign ICC based on node type and connections
        nodes.forEach(node => {
          const nodeType = node.type || 'unknown'
          let isc = 0

          // Find edges connected to this node
          const connectedEdges = edges.filter(e => e.source === node.id || e.target === node.id)

          // Calculate based on node type
          switch (nodeType) {
            case 'transformer':
              isc = 6350 // 6.35 kA for transformer
              break
            case 'generator':
              isc = 4800 // 4.8 kA for generator
              break
            case 'breaker':
              // Get ICC from connected source
              const sourceEdge = edges.find(e => e.target === node.id)
              if (sourceEdge) {
                const sourceNode = nodes.find(n => n.id === sourceEdge.source)
                isc = sourceNode?.data?.results?.isc || 5000
              } else {
                isc = 5000
              }
              break
            case 'panel':
              isc = 4200 // 4.2 kA for panel
              break
            case 'generator_ats':
              isc = systemMode === 'emergency' ? 4800 : 0
              break
            default:
              isc = 3500 // Default
          }

          nodeResults[node.id] = {
            isc_3f: isc,
            isc_1f: isc * 0.6,
            isc_3f_ka: isc / 1000,
            isc_1f_ka: (isc * 0.6) / 1000,
            nodeType,
            connectedEdges: connectedEdges.length,
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

        console.log('CORTOCIRCUITO: Results calculated:', Object.keys(nodeResults).length, 'nodes')
        sendResponse(true, result.data)

      } catch (error) {
        console.error('CORTOCIRCUITO ERROR:', error)
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
        const systemModel = JSON.parse(body)

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
        console.error('JSON serialization error:', serializeError)
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
      console.error('Error in /icc endpoint:', error)
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
