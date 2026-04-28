const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { authLimiter } = require('../middleware/rateLimiter.middleware');

// Apply rate limiting to auth endpoints
router.post('/register', authLimiter, ctrl.register);
router.post('/login', authLimiter, ctrl.login);

module.exports = router;
