/**
 * interfaces/controllers/icc.pure.controller.js - Pure ICC Controller
 * Responsibility: Handle short circuit current calculations only
 */

const logger = require('../../utils/logger');
const iccService = require('../../services/icc.service');
const { validateSchema, iccCalculationSchema } = require('../../validation/electrical.schemas');

/**
 * Calculate ICC (short circuit current) only
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function calculateICC(req, res) {
  const _startTime = process.hrtime.bigint();
  logger.startTimer('icc_request');

  try {
    const input = req.validatedBody || req.body;

    logger.info('ICC calculation request', {
      voltage: input.V,
      impedance: input.Z,
      hasSystem: !!input.system
    });

    const result = await iccService.calculateICC(input);

    const duration = logger.endTimer('icc_request');
    logger.logRequest(req, res, duration);

    res.json({
      success: true,
      data: result,
      metadata: {
        calculationType: 'icc_only',
        duration: `${duration.toFixed(2)}ms`,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const duration = logger.endTimer('icc_request');
    logger.error('ICC calculation failed', {
      error: error.message,
      input: req.body
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during ICC calculation',
      metadata: {
        calculationType: 'icc_only',
        duration: `${duration.toFixed(2)}ms`,
        timestamp: new Date().toISOString()
      }
    });
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
      description: 'Short Circuit Current calculation (pure ICC)',
      standards: ['IEEE 1584', 'IEC 60909'],
      input: {
        V: 'Voltage in volts (V) - Required',
        Z: 'Impedance in ohms (Z) - Required',
        system: 'Optional power system model for advanced calculations'
      },
      output: {
        Icc: 'Short circuit current in amperes',
        method: 'Calculation method used',
        precision: 'IEEE standard precision',
        formula: 'Applied formula: Isc = V / (sqrt(3) * Z)'
      },
      examples: [
        {
          description: 'Basic calculation',
          input: { V: 480, Z: 0.1 },
          expected: { Icc: 2771.28 }
        }
      ]
    }
  });
}

module.exports = {
  calculateICC,
  getICCInfo,
  validateInput: validateSchema(iccCalculationSchema)
};
