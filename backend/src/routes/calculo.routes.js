const router = require('express').Router();
const ctrl = require('../controllers/calculo.controller');
const auth = require('../middleware/auth.middleware');
const { apiLimiter } = require('../middleware/rateLimiter.middleware');

// Apply rate limiting to calculation endpoints
router.use(apiLimiter);

// All calculation routes require authentication
router.post('/icc/simple', auth, ctrl.iccSimple);
router.post('/icc', auth, ctrl.icc);
router.post('/falla-minima', auth, ctrl.fallaMinima);
router.post('/retorno-tierra', auth, ctrl.retornoTierra);
router.post('/icc-motores', auth, ctrl.iccConMotores);

module.exports = router;
