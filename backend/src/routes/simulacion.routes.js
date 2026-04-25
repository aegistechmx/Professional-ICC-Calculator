/**
 * simulacion.routes.js - Simulation Routes
 * Rutas para simulación de ICC en el tiempo
 */

const router = require('express').Router();
const ctrl = require('../controllers/simulacion.controller');
const auth = require('../middlewares/auth.middleware');

// Auth optional for development
const optionalAuth = (req, res, next) => {
  if (req.headers.authorization) {
    return auth(req, res, next);
  }
  next();
};

// Simulación ICC vs tiempo
router.post('/icc-tiempo', optionalAuth, ctrl.simularICC);

// Simulación con gráfica
router.post('/icc-tiempo/grafica', optionalAuth, ctrl.simularICCConGrafica);

// Múltiples escenarios
router.post('/escenarios', optionalAuth, ctrl.simularEscenarios);

// Verificar capacidad de breaker
router.post('/verificar-capacidad', optionalAuth, ctrl.verificarCapacidad);

// Live simulation for real-time editor
router.post('/live', optionalAuth, ctrl.liveSimulation);

module.exports = router;
