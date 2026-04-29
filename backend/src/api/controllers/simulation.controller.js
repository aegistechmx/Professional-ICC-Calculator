/**
 * api/controllers/simulation.controller.js - High-level simulation controller
 * 
 * Responsibility: HTTP controller for complex simulation workflows
 */

const { runSimulation } = require('@/app/simulation/runSimulation');

/**
 * Run complex simulation workflow via HTTP API
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.run = async (req, res) => {
  try {
    const result = await runSimulation(req.body);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Run multiple simulations in parallel
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.runParallel = async (req, res) => {
  try {
    const { inputs, options = {} } = req.body;
    
    // Import parallel simulation function
    const { runParallelSimulations } = require('@/app/simulation/runSimulation');
    
    const results = await runParallelSimulations(inputs, options);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get available simulation workflows
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.getWorkflows = async (req, res) => {
  try {
    const { getAvailableWorkflows } = require('@/app/simulation/runSimulation');
    const workflows = getAvailableWorkflows();
    
    res.json({
      success: true,
      data: workflows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
