/**
 * simulacion.routes.js - Simulation Routes
 * Rutas para simulación de ICC en el tiempo
 */

const router = require('express').Router();
const ctrl = require('../controllers/simulacion.controller');
const auth = require('../middleware/auth.middleware');
const { apiLimiter } = require('../middleware/rateLimiter.middleware');

// Apply rate limiting to simulation endpoints
router.use(apiLimiter);

// All simulation routes require authentication
router.post('/icc-tiempo', auth, ctrl.simularICC);

// Simulación con gráfica
router.post('/icc-tiempo/grafica', auth, ctrl.simularICCConGrafica);

// Múltiples escenarios
router.post('/escenarios', auth, ctrl.simularEscenarios);

// Verificar capacidad de breaker
router.post('/verificar-capacidad', auth, ctrl.verificarCapacidad);

// Live simulation for real-time editor
router.post('/live', auth, ctrl.liveSimulation);

module.exports = router;
