/**
 * api/controllers/contingency.controller.js
 * 
 * Responsibility: HTTP controller for contingency operations
 */

const { runSCOPF } = require('@/app/contingency/runSCOPF');

/**
 * Run security-constrained OPF via HTTP API
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.runSCOPF = async (req, res) => {
  try {
    const result = await runSCOPF(req.body.system, req.body.options);
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
