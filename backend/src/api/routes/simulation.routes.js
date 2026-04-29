/**
 * api/routes/simulation.routes.js
 * 
 * Responsibility: HTTP routes for simulation operations
 */

const router = require('express').Router();
const simulationController = require('../controllers/simulation.controller');

/**
 * Simulation routes
 */
router.post('/transient-stability', simulationController.runTransientStability);

module.exports = router;
