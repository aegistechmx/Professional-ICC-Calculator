const router = require('express').Router();
const ctrl = require('../controllers/template.controller');

router.get('/', ctrl.getAll);
router.get('/db', ctrl.createFromDb);
router.get('/:id', ctrl.getById);

module.exports = router;
