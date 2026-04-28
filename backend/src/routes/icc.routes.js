const express = require('express');
const { apiLimiter } = require('../middleware/rateLimiter.middleware');
const { calculateIccFromGraph } = require('../services/iccFromGraph');

const router = express.Router();

router.use(apiLimiter);

/**
 * POST /icc/run
 * Body: { nodes: ReactFlowNode[], edges: ReactFlowEdge[] }
 */
router.post('/run', (req, res) => {
  try {
    const { nodes, edges } = req.body || {};
    const result = calculateIccFromGraph({ nodes, edges });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;

