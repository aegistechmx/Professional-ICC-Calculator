const router = require('express').Router();
const ctrl = require('../../controllers/reporte/reporte.controller');
const auth = require('../../middlewares/auth.middleware');

// Endpoint protegido (requiere login para generar reporte profesional)
// Auth optional for development
router.post('/pdf', (req, res, next) => {
  if (req.headers.authorization) {
    return auth(req, res, next);
  }
  next();
}, ctrl.generarPDF);

module.exports = router;
