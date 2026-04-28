const router = require('express').Router();
const ctrl = require('../../controllers/reporte/reporte.controller');
const auth = require('../../middleware/auth.middleware');
const { apiLimiter } = require('../../middleware/rateLimiter.middleware');

// Apply rate limiting to reporte endpoints
router.use(apiLimiter);

// PDF generation requires authentication
router.post('/pdf', auth, ctrl.generarPDF);

module.exports = router;
