/**
 * sqd_real.routes.js - Real SQD Curves Routes
 * Rutas para curvas digitizadas reales de fabricante
 */

const router = require('express').Router();
const ctrl = require('../controllers/sqd_real.controller');
const auth = require('../middleware/auth.middleware');
const { apiLimiter } = require('../middleware/rateLimiter.middleware');

// Apply rate limiting to SQD endpoints
router.use(apiLimiter);

// All SQD routes require authentication
router.get('/curvas', auth, ctrl.listarCurvas);
router.get('/curva/:nombre', auth, ctrl.obtenerCurva);
router.post('/tiempo-disparo', auth, ctrl.tiempoDisparo);
router.post('/coordinacion', auth, ctrl.evaluarCoordinacion);
router.post('/cascada', auth, ctrl.analizarCascada);
router.post('/comparar', auth, ctrl.compararCurvas);

module.exports = router;
