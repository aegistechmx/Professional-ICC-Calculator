/**
 * api/routes/opf.routes.js
 * 
 * Responsibility: HTTP routes for optimal power flow operations
 */

const router = require('express').Router();
const opfController = require('../controllers/opf.controller');

/**
 * OPF routes
 */
router.post('/run', opfController.run);

module.exports = router;
