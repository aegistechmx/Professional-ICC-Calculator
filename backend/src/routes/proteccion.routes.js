const router = require('express').Router();
const ctrl = require('../controllers/proteccion.controller');
const auth = require('../middleware/auth.middleware');
const { apiLimiter } = require('../middleware/rateLimiter.middleware');

// Apply rate limiting to protection endpoints
router.use(apiLimiter);

// All protection routes require authentication
router.post('/tcc/analizar', auth, ctrl.analizarTCC);
router.post('/tcc/generar', auth, ctrl.generarCurva);
router.post('/disparo/evaluar', auth, ctrl.evaluarDisparo);
router.post('/coordinacion/analizar', auth, ctrl.analizarCoordinacion);
router.post('/coordinacion/cascada', auth, ctrl.analizarCoordinacionCascada);
router.post('/constantes/curva', auth, ctrl.getConstantesCurva);
router.post('/sqd/seleccionar', auth, ctrl.seleccionarSQD);
router.post('/sqd/curva', auth, ctrl.generarCurvaSQD);
router.post('/sqd/disparo', auth, ctrl.evaluarDisparoSQD);
router.post('/sqd/coordinacion', auth, ctrl.coordinarProteccionesSQD);
router.post('/sqd/cascada', auth, ctrl.seleccionarCoordinacionCascada);
router.get('/sqd/breakers', auth, ctrl.getBreakersSQD);

module.exports = router;
