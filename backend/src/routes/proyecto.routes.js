const router = require('express').Router();
const ctrl = require('../controllers/proyecto.controller');
const auth = require('../middleware/auth.middleware');
const { apiLimiter } = require('../middleware/rateLimiter.middleware');

// Apply rate limiting to project endpoints
router.use(apiLimiter);

// Require authentication for all project routes
router.post('/', auth, ctrl.create);
router.get('/', auth, ctrl.getAll);

module.exports = router;
