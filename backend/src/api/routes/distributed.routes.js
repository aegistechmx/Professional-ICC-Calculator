/**
 * api/routes/distributed.routes.js - Distributed simulation routes
 *
 * Responsibility: HTTP routes for distributed simulation services
 */

const router = require('express').Router()
const distributedController = require('../controllers/distributed.controller')

/**
 * Scheduler management routes
 */
router.post('/scheduler/initialize', distributedController.initializeScheduler)
router.get('/scheduler/stats', distributedController.getSchedulerStats)
router.post('/scheduler/shutdown', distributedController.shutdownScheduler)

/**
 * Job management routes
 */
router.get('/job/:jobId/status', distributedController.getJobStatus)
router.delete('/job/:jobId', distributedController.cancelJob)

/**
 * Distributed analysis routes
 */
router.post('/n1-contingency', distributedController.submitN1Contingency)
router.post('/n2-contingency', distributedController.submitN2Contingency)
router.post('/monte-carlo', distributedController.submitMonteCarlo)
router.post(
  '/transient-stability',
  distributedController.submitTransientStability
)

module.exports = router
