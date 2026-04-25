/**
 * coordinacion.routes.js - Coordination Routes
 * Rutas para análisis de coordinación de tableros
 */

const router = require('express').Router();
const ctrl = require('../controllers/coordinacion.controller');
const auth = require('../middlewares/auth.middleware');

// Endpoint principal: análisis completo con auto-ajuste
router.post('/coordinacion-tablero', (req, res, next) => {
  // Make auth optional for development
  if (req.headers.authorization) {
    return auth(req, res, next);
  }
  next();
}, ctrl.analizarTablero);

// Evaluación simple sin ajuste
router.post('/coordinacion-evaluar', (req, res, next) => {
  if (req.headers.authorization) {
    return auth(req, res, next);
  }
  next();
}, ctrl.evaluarSolo);

// Aplicar auto-ajuste manualmente
router.post('/coordinacion-ajustar', (req, res, next) => {
  if (req.headers.authorization) {
    return auth(req, res, next);
  }
  next();
}, ctrl.aplicarAjuste);

module.exports = router;
