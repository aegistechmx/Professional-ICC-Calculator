/**
 * api/routes/simulation.routes.js - Advanced simulation routes
 * 
 * Responsibility: HTTP routes for complex simulation workflows
 */

const router = require('express').Router();
const simulationController = require('../controllers/simulation.controller');

/**
 * Basic simulation routes
 */
router.post('/transient-stability', simulationController.runTransientStability);

/**
 * Advanced simulation workflow routes
 */
router.post('/run', simulationController.run);
router.post('/run-parallel', simulationController.runParallel);
router.get('/workflows', simulationController.getWorkflows);

module.exports = router;
