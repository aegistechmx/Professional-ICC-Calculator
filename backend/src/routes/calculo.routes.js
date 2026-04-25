const router = require('express').Router();
const ctrl = require('../controllers/calculo.controller');

router.post('/icc/simple', ctrl.iccSimple);
router.post('/icc', ctrl.icc);
router.post('/falla-minima', ctrl.fallaMinima);
router.post('/retorno-tierra', ctrl.retornoTierra);
router.post('/icc-motores', ctrl.iccConMotores);

module.exports = router;
