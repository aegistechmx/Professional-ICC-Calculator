/**
 * Load flow routes
 * Routes for power flow analysis
 */

const router = require('express').Router();
const ctrl = require('../controllers/loadflow.controller');
const auth = require('../middlewares/auth.middleware');

// Auth optional for development
const optionalAuth = (req, res, next) => {
  if (req.headers.authorization) {
    return auth(req, res, next);
  }
  next();
};

// Run load flow analysis
router.post('/', optionalAuth, ctrl.runLoadFlow);

// Validate system before load flow
router.post('/validate', optionalAuth, ctrl.validateSystem);

module.exports = router;
