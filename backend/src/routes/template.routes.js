const router = require('express').Router();
const ctrl = require('../controllers/template.controller');
const { apiLimiter } = require('../middleware/rateLimiter.middleware');

// Apply rate limiting to template endpoints
router.use(apiLimiter);

// Template routes - public but rate limited
router.get('/', ctrl.getAll);
router.get('/db', ctrl.createFromDb);
router.get('/:id', ctrl.getById);

module.exports = router;
