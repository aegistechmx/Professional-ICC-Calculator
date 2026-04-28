/**
 * Load flow routes
 * Routes for power flow analysis
 */

const router = require('express').Router();
const ctrl = require('../controllers/loadflow.controller');
const auth = require('../middleware/auth.middleware');
const { apiLimiter } = require('../middleware/rateLimiter.middleware');

// Apply rate limiting to loadflow endpoints
router.use(apiLimiter);

// All loadflow routes require authentication
router.post('/', auth, ctrl.runLoadFlow);
router.post('/validate', auth, ctrl.validateSystem);

module.exports = router;
