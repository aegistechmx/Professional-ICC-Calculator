/**
 * api/controllers/opf.controller.js
 * 
 * Responsibility: HTTP controller for optimal power flow operations
 */

const { runOPF } = require('@/app/opf/runOPF');

/**
 * Run optimal power flow via HTTP API
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.run = async (req, res) => {
  try {
    const result = await runOPF(req.body.system, req.body.options);
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
