const router = require('express').Router();
const reportController = require('../controllers/report.controller');
const authenticateToken = require('../middlewares/auth.middleware');

/**
 * Generar reporte PDF de cálculos
 * POST /api/report/pdf
 */
router.post('/pdf', authenticateToken, reportController.generateCalculationReport);

module.exports = router;