/**
 * interfaces/routes/icc.routes.js - ICC API Routes
 *
 * Responsibility: Define ICC calculation endpoints
 */

const express = require('express')
const router = express.Router()
const { calculateICC, getICCInfo } = require('../controllers/icc.controller')

// POST /api/icc - Calculate short circuit current
router.post('/', calculateICC)

// GET /api/icc/info - Get ICC endpoint information
router.get('/info', getICCInfo)

module.exports = router
