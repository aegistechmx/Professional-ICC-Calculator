/**
 * powerflow.routes.js - Power flow API routes
 * 
 * Routes:
 * POST /api/powerflow/solve - Solve power flow
 * GET  /api/powerflow/health - Health check
 */

const express = require('express');
const router = express.Router();
const PowerFlowController = require('../../core');

/**
 * POST /api/powerflow/solve
 * Solve power flow using Newton-Raphson method
 */
router.post('/solve', PowerFlowController.solvePowerFlow);

/**
 * GET /api/powerflow/health
 * Health check endpoint
 */
router.get('/health', PowerFlowController.healthCheck);

module.exports = router;
