/**
 * api/routes/simulation.service.routes.js - Advanced simulation service routes
 * 
 * Responsibility: HTTP routes for high-level simulation services
 */

const router = require('express').Router();
const simulationController = require('../controllers/simulation.service.controller');

/**
 * Service management routes
 */
router.post('/initialize', simulationController.initialize);
router.get('/stats', simulationController.getStats);
router.post('/shutdown', simulationController.shutdown);

/**
 * Advanced analysis routes
 */
router.post('/n1-contingency', simulationController.runN1Contingency);
router.post('/n2-contingency', simulationController.runN2Contingency);
router.post('/full-security-analysis', simulationController.runFullSecurityAnalysis);

/**
 * Batch analysis routes
 */
router.post('/batch-loadflow', simulationController.runBatchLoadFlow);

module.exports = router;
