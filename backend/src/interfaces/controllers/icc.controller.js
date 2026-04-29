/**
 * interfaces/controllers/icc.controller.js - Professional ICC Controller
 *
 * Responsibility: Handle ICC calculation requests with professional pipeline
 */

const { runICC } = require('../../application/icc.service')

/**
 * Calculate ICC using professional pipeline
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function calculateICC(req, res) {
  try {
    const input = req.body

    // Validate input
    if (!input || typeof input.V !== 'number' || typeof input.Z !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Invalid input. V (voltage) and Z (impedance) are required numbers.'
      })
    }

    if (input.Z <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Impedance must be greater than zero.'
      })
    }

    // Run professional ICC calculation
    const result = runICC(input)

    res.json({
      success: true,
      data: result
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during ICC calculation'
    })
  }
}

/**
 * Get ICC calculation info
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
function getICCInfo(req, res) {
  res.json({
    success: true,
    data: {
      endpoint: '/api/icc',
      method: 'POST',
      description: 'Professional Short Circuit Current calculation',
      standards: ['IEEE 1584', 'IEC 60909'],
      input: {
        V: 'Voltage in volts (V)',
        Z: 'Impedance in ohms (Z)',
        system: 'Optional power system model'
      },
      output: {
        Icc: 'Short circuit current in amperes',
        method: 'Calculation method used',
        precision: 'IEEE standard precision',
        formula: 'Applied formula'
      }
    }
  })
}

module.exports = {
  calculateICC,
  getICCInfo
}
