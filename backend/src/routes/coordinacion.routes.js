/**
 * coordinacion.routes.js - Coordination Routes
 * Rutas para análisis de coordinación de tableros
 */

const router = require('express').Router();
const ctrl = require('../controllers/coordinacion.controller');
const auth = require('../middleware/auth.middleware');
const { apiLimiter } = require('../middleware/rateLimiter.middleware');

// Apply rate limiting to coordination endpoints
router.use(apiLimiter);

// All coordination routes require authentication
router.post('/coordinacion-tablero', auth, ctrl.analizarTablero);
router.post('/coordinacion-evaluar', auth, ctrl.evaluarSolo);
router.post('/coordinacion-ajustar', auth, ctrl.aplicarAjuste);

module.exports = router;
