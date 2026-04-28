const express = require('express');
const router = express.Router();
const { calculateShortCircuit } = require('../services/shortCircuitCalculator');
const { simulateSystem } = require('../services/electricalEngine');

/**
 * POST /cortocircuito/calculate
 * NEW: Calculate ICC from React Flow graph
 * Body: { nodes: [], edges: [] }
 */
router.post('/calculate', async (req, res) => {
    try {
        const graph = req.body;
        
        // Check if this is a React Flow graph or legacy calculation
        if (graph && graph.nodes && graph.edges) {
            // NEW: React Flow graph calculation
            const result = simulateSystem(graph);
            res.json(result);
        } else {
            // Legacy: Single feeder calculation
            if (!req.body || typeof req.body !== 'object') {
                return res.status(400).json({ success: false, error: 'Invalid body: expected JSON object' });
            }
            const result = calculateShortCircuit(req.body);
            res.json({
                success: true,
                data: result
            });
        }
    } catch (error) {
        console.error('Error en /cortocircuito/calculate:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/cortocircuito/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        service: 'cortocircuito-api',
        status: 'operational'
    });
});

module.exports = router;
