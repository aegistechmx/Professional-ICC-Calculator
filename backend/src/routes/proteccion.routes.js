const router = require('express').Router();
const ctrl = require('../controllers/proteccion.controller');

router.post('/tcc/analizar', ctrl.analizarTCC);
router.post('/tcc/generar', ctrl.generarCurva);
router.post('/disparo/evaluar', ctrl.evaluarDisparo);
router.post('/coordinacion/analizar', ctrl.analizarCoordinacion);
router.post('/coordinacion/cascada', ctrl.analizarCoordinacionCascada);
router.post('/constantes/curva', ctrl.getConstantesCurva);
router.post('/sqd/seleccionar', ctrl.seleccionarSQD);
router.post('/sqd/curva', ctrl.generarCurvaSQD);
router.post('/sqd/disparo', ctrl.evaluarDisparoSQD);
router.post('/sqd/coordinacion', ctrl.coordinarProteccionesSQD);
router.post('/sqd/cascada', ctrl.seleccionarCoordinacionCascada);
router.get('/sqd/breakers', ctrl.getBreakersSQD);

module.exports = router;
