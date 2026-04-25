const router = require('express').Router();
const ctrl = require('../controllers/proyecto.controller');
const auth = require('../middlewares/auth.middleware');

// Auth optional for development
router.post('/', (req, res, next) => {
  if (req.headers.authorization) {
    return auth(req, res, next);
  }
  next();
}, ctrl.create);

router.get('/', (req, res, next) => {
  if (req.headers.authorization) {
    return auth(req, res, next);
  }
  next();
}, ctrl.getAll);

module.exports = router;
