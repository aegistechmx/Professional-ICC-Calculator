/**
 * sqd_real.routes.js - Real SQD Curves Routes
 * Rutas para curvas digitizadas reales de fabricante
 */

const router = require('express').Router();
const ctrl = require('../controllers/sqd_real.controller');
const auth = require('../middlewares/auth.middleware');

// Auth optional for development
const optionalAuth = (req, res, next) => {
  if (req.headers.authorization) {
    return auth(req, res, next);
  }
  next();
};

// Listar curvas disponibles
router.get('/curvas', optionalAuth, ctrl.listarCurvas);

// Obtener curva específica
router.get('/curva/:nombre', optionalAuth, ctrl.obtenerCurva);

// Calcular tiempo de disparo
router.post('/tiempo-disparo', optionalAuth, ctrl.tiempoDisparo);

// Evaluar coordinación entre dos curvas
router.post('/coordinacion', optionalAuth, ctrl.evaluarCoordinacion);

// Analizar cascada de curvas
router.post('/cascada', optionalAuth, ctrl.analizarCascada);

// Comparar curvas (genera gráfica)
router.post('/comparar', optionalAuth, ctrl.compararCurvas);

module.exports = router;
