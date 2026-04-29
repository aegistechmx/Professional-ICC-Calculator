/**
 * api/controllers/simulation.controller.js
 * 
 * Responsibility: HTTP controller for simulation operations
 */

const { runTransientStability } = require('@/app/simulation/runTransientStability');

/**
 * Run transient stability simulation via HTTP API
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.runTransientStability = async (req, res) => {
  try {
    const result = await runTransientStability(req.body.system, req.body.options);
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
