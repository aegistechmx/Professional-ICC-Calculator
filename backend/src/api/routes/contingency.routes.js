/**
 * api/routes/contingency.routes.js
 * 
 * Responsibility: HTTP routes for contingency operations
 */

const router = require('express').Router();
const contingencyController = require('../controllers/contingency.controller');

/**
 * Contingency routes
 */
router.post('/scopf', contingencyController.runSCOPF);

module.exports = router;
