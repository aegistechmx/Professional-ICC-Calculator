/**
 * api/routes/icc.routes.js - ICC calculation routes
 *
 * Responsibility: HTTP routes for ICC (short circuit) calculations
 */

const router = require('express').Router()
const { calculateShortCircuitCurrent } = require('../../shared/utils/electricalUtils')

/**
 * Calculate ICC (short circuit current)
 * POST /api/icc/calculate
 */
router.post('/calculate', (req, res) => {
  try {
    const { voltage, impedance } = req.body

    // Validate inputs
    if (!voltage || typeof voltage !== 'number') {
      return res.status(400).json({
        error: 'Voltage is required and must be a number',
        code: 'INVALID_VOLTAGE'
      })
    }

    if (!impedance || typeof impedance !== 'number') {
      return res.status(400).json({
        error: 'Impedance is required and must be a number',
        code: 'INVALID_IMPEDANCE'
      })
    }

    if (impedance === 0) {
      return res.status(400).json({
        error: 'Impedance cannot be zero',
        code: 'ZERO_IMPEDANCE'
      })
    }

    // Calculate ICC
    const isc = calculateShortCircuitCurrent(voltage, impedance)

    // Return result
    res.json({
      success: true,
      result: {
        voltage,
        impedance,
        isc_3f: isc,           // Three-phase fault current
        isc_1f: isc * 0.577,   // Single line-to-ground fault current (1/sqrt(3))
        isc_3f_ka: isc / 1000, // Three-phase in kA
        isc_1f_ka: (isc * 0.577) / 1000, // Single line-to-ground in kA
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('ICC calculation error:', error)
    res.status(500).json({
      error: 'Internal calculation error',
      code: 'CALCULATION_ERROR',
      message: error.message
    })
  }
})

/**
 * Health check for ICC service
 * GET /api/icc/health
 */
router.get('/health', (req, res) => {
  res.json({
    service: 'ICC Calculator',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

module.exports = router
