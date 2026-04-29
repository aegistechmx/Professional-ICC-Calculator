/**
 * start-server.js - Server startup script
 */

const http = require('http')
const app = require('./src/app')

const PORT = process.env.PORT || 3001

// Create HTTP server
const server = http.createServer(app)

// Start server
server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`\n============================================================`)
  // eslint-disable-next-line no-console
  console.log(`ICC Calculator API Server running on port ${PORT}`)
  // eslint-disable-next-line no-console
  console.log(`============================================================`)
  // eslint-disable-next-line no-console
  console.log(`Available endpoints:`)
  // eslint-disable-next-line no-console
  console.log(`  GET  /api/health - Health check`)
  // eslint-disable-next-line no-console
  console.log(`  GET  /api/ - API info`)
  // eslint-disable-next-line no-console
  console.log(`  POST /api/icc/calculate - ICC calculation`)
  // eslint-disable-next-line no-console
  console.log(`  GET  /api/icc/health - ICC service health`)
  // eslint-disable-next-line no-console
  console.log(`  GET  /api/distributed/* - Distributed services`)
  // eslint-disable-next-line no-console
  console.log(`============================================================\n`)
})

// Handle graceful shutdown
process.on('SIGTERM', () => {
  // eslint-disable-next-line no-console
  console.log('SIGTERM received, shutting down gracefully')
  server.close(() => {
    // eslint-disable-next-line no-console
    console.log('Process terminated')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  // eslint-disable-next-line no-console
  console.log('\nSIGINT received, shutting down gracefully')
  server.close(() => {
    // eslint-disable-next-line no-console
    console.log('Process terminated')
    process.exit(0)
  })
})

module.exports = server
