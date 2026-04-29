/**
 * interfaces/routes/index.js - API routes aggregation
 *
 * Responsibility: Combine all API routes into a single router
 */

const express = require('express')
const router = express.Router()

// Import individual route modules
const distributedRoutes = require('../../api/routes/distributed.routes')
const iccRoutes = require('../../api/routes/icc.routes')

// Health check route
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
  })
})

// API info route
router.get('/', (req, res) => {
  res.json({
    name: 'ICC Calculator API',
    version: '1.0.0',
    description: 'Professional Power System Calculation API',
    endpoints: {
      health: '/health',
      distributed: '/api/distributed',
      icc: '/api/icc',
      iccInfo: '/api/icc/info',
      powerflow: '/api/powerflow (coming soon)',
      shortcircuit: '/api/shortcircuit (coming soon)',
      opf: '/api/opf (coming soon)',
    },
  })
})

// Mount route modules
router.use('/api/distributed', distributedRoutes)
router.use('/api/icc', iccRoutes)

// 404 handler for unknown routes
router.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: ['/health', '/', '/api/distributed/*', '/api/icc', '/api/icc/info'],
  })
})

module.exports = router
