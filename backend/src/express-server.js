/**
 * express-server.js - Professional Express API Server
 *
 * Responsibility: Run the professional Express API with ICC endpoints
 */

/* eslint-disable no-console */
const app = require('./app')
const PORT = process.env.PORT || 3002

// Start Express server
app.listen(PORT, () => {
  console.log(`\n`)
  console.log(`\x1b[36m%s\x1b[0m`, '='.repeat(50))
  console.log(`\x1b[32m%s\x1b[0m`, '  ICC Calculator Professional API Server')
  console.log(`\x1b[36m%s\x1b[0m`, '='.repeat(50))
  console.log(`\x1b[33m%s\x1b[0m`, `  Port: ${PORT}`)
  console.log(`\x1b[33m%s\x1b[0m`, `  Status: Running`)
  console.log(`\x1b[36m%s\x1b[0m`, '-'.repeat(50))
  console.log(`\x1b[34m%s\x1b[0m`, 'Available Endpoints:')
  console.log(`\x1b[37m%s\x1b[0m`, '  GET  /api/health        - Health check')
  console.log(`\x1b[37m%s\x1b[0m`, '  GET  /api/              - API info')
  console.log(`\x1b[37m%s\x1b[0m`, '  POST /api/icc           - Calculate ICC')
  console.log(`\x1b[37m%s\x1b[0m`, '  GET  /api/icc/info      - ICC endpoint info')
  console.log(`\x1b[37m%s\x1b[0m`, '  GET  /api/distributed/*  - Distributed endpoints')
  console.log(`\x1b[36m%s\x1b[0m`, '-'.repeat(50))
  console.log(`\x1b[32m%s\x1b[0m`, '  Professional IEEE/IEC Standards')
  console.log(`\x1b[32m%s\x1b[0m`, '  Pipeline: Controller -> Service -> Core')
  console.log(`\x1b[36m%s\x1b[0m`, '='.repeat(50))
  console.log(`\n`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\nShutting down Express server...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('\nShutting down Express server...')
  process.exit(0)
})

module.exports = app
