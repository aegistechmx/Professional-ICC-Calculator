
/**
 * api/routes/powerflow.routes.js
 * 
 * Responsibility: HTTP routes for power flow operations
 */

const router = require('express').Router();
const powerflowController = require('../controllers/powerflow.controller');

/**
 * Power flow routes
 */
router.post('/run', powerflowController.run);

module.exports = router;
