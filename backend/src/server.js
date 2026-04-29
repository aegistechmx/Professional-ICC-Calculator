const http = require('http')

// Import professional ICC service
const { runICC } = require('./application/icc.service')

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

  // MAIN ENDPOINT: POST /api/icc
  if (req.method === 'POST' && req.url === '/api/icc') {
    let body = ''

    req.on('data', chunk => {
      body += chunk.toString()
    })

    req.on('end', () => {
      try {
        const params = JSON.parse(body)
        const V = params.V || 220
        const Z = params.Z || 0.05

        if (Z <= 0) {
          return sendResponse(false, null, 'La impedancia debe ser mayor a cero')
        }

        // Use professional ICC service
        const result = runICC({ V, Z })

        sendResponse(true, result)

      } catch (error) {
        sendResponse(false, null, 'Error en formato de datos')
      }
    })

    // TEMPORARY ALIASES (legacy support)
  } else if (req.url === '/icc' || req.url === '/cortocircuito/calculate' || req.url === '/api/cortocircuito/calculate') {
    const V = 220
    const Z = 0.05

    // Use professional ICC service for legacy endpoints too
    const result = runICC({ V, Z })
    result.method = 'legacy_professional'

    sendResponse(true, result)

    // DEFAULT: Not found
  } else {
    sendResponse(false, null, 'Endpoint no encontrado. Use POST /api/icc')
  }
})

server.listen(3001, () => {
  // eslint-disable-next-line no-console
  console.log('✅ Servidor ICC en puerto 3001')
})
