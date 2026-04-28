/**
 * Power Flow Routes
 * 
 * API endpoints for the unified power flow pipeline
 */

const express = require('express');
const router = express.Router();
const { apiLimiter } = require('../middleware/rateLimiter.middleware');
const auth = require('../middleware/auth.middleware');
const {
  runPowerFlow,
  runPowerFlowQuick,
  validateSystem
} = require('../controllers/powerflow.controller');

// Apply rate limiting to all power flow endpoints
router.use(apiLimiter);

// Apply authentication to all power flow endpoints
router.use(auth);

/**
 * POST /api/powerflow/run
 * Run complete power flow analysis
 */
router.post('/run', runPowerFlow);

/**
 * POST /api/powerflow/quick
 * Quick power flow (simplified interface)
 */
router.post('/quick', runPowerFlowQuick);

/**
 * POST /api/powerflow/validate
 * Validate electrical system before running power flow
 */
router.post('/validate', validateSystem);

module.exports = router;
