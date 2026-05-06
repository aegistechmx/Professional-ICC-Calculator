/**
 * interfaces/controllers/system.controller.js - Complete System Controller
 * Responsibility: Handle full electrical system calculations (ETAP-lite)
 */

const logger = require('../../utils/logger');
const iccService = require('../../services/icc.service');
const { validateSchema, systemCalculationSchema } = require('../../validation/electrical.schemas');

/**
 * Calculate complete electrical system
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function calculateSystem(req, res) {
  const _startTime = process.hrtime.bigint();
  logger.startTimer('system_request');

  try {
    const input = req.validatedBody || req.body;
    const { mode = 'fast' } = req.query;

    logger.info('System calculation request', {
      mode,
      inputKeys: Object.keys(input),
      I_carga: input.I_carga,
      material: input.material
    });

    const result = await iccService.calculateSystem(input, { mode });

    const duration = logger.endTimer('system_request');
    logger.logRequest(req, res, duration);

    res.json({
      success: true,
      data: result,
      metadata: {
        calculationType: 'complete_system',
        mode,
        duration: `${duration.toFixed(2)}ms`,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const duration = logger.endTimer('system_request');
    logger.error('System calculation failed', {
      error: error.message,
      input: req.body
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during system calculation',
      metadata: {
        calculationType: 'complete_system',
        duration: `${duration.toFixed(2)}ms`,
        timestamp: new Date().toISOString()
      }
    });
  }
}

/**
 * Calculate ampacity only
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function calculateAmpacity(req, res) {
  const _startTime = process.hrtime.bigint();
  logger.startTimer('ampacity_request');

  try {
    const input = req.body;

    logger.info('Ampacity calculation request', {
      calibre: input.calibre,
      material: input.material,
      tempAislamiento: input.tempAislamiento
    });

    const result = await iccService.calculateAmpacity(input);

    const duration = logger.endTimer('ampacity_request');
    logger.logRequest(req, res, duration);

    res.json({
      success: true,
      data: result,
      metadata: {
        calculationType: 'ampacity_only',
        duration: `${duration.toFixed(2)}ms`,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const duration = logger.endTimer('ampacity_request');
    logger.error('Ampacity calculation failed', {
      error: error.message,
      input: req.body
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during ampacity calculation',
      metadata: {
        calculationType: 'ampacity_only',
        duration: `${duration.toFixed(2)}ms`,
        timestamp: new Date().toISOString()
      }
    });
  }
}

/**
 * Get system calculation info
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
function getSystemInfo(req, res) {
  res.json({
    success: true,
    data: {
      endpoint: '/api/system',
      method: 'POST',
      description: 'Complete Electrical System calculation (ETAP-lite)',
      standards: ['IEEE 1584', 'IEC 60909', 'NOM-001-SEDE-2012'],
      modes: {
        fast: 'Quick calculation without advanced features',
        full: 'Complete analysis with autocorrection and optimization'
      },
      input: {
        I_carga: 'Load current in amperes (A) - Required',
        material: 'Conductor material (cobre, aluminio) - Required',
        tempAislamiento: 'Insulation temperature (60, 75, 90) - Required',
        tempAmbiente: 'Ambient temperature (°C) - Required',
        nConductores: 'Number of grouped conductors - Required',
        paralelos: 'Number of parallel conductors - Required',
        tempTerminal: 'Terminal temperature (60, 75, 90) - Required',
        voltaje: 'System voltage (V) - Required',
        FP: 'Power factor (0.8-1.0) - Required',
        longitud: 'Conductor length (m) - Required',
        tipoSistema: 'System type (1F, 3F) - Required',
        modo: 'Calculation mode (fast/full) - Optional',
        Z_fuente: 'Source impedance - Optional',
        calibre: 'Specific conductor calibre - Optional'
      },
      output: {
        sistema: 'Normalized system data',
        ampacidad: 'Ampacity calculation with NOM factors',
        conductor: 'Selected conductor specifications',
        caida: 'Voltage drop calculation',
        falla: 'Short circuit calculation',
        proteccion: 'Protection device selection',
        coordinacion: 'Protection coordination results',
        validacion: 'NOM validation results'
      },
      examples: [
        {
          description: 'Basic industrial system',
          input: {
            I_carga: 150,
            material: 'cobre',
            tempAislamiento: 75,
            tempAmbiente: 30,
            nConductores: 3,
            paralelos: 1,
            tempTerminal: 75,
            voltaje: 480,
            FP: 0.9,
            longitud: 100,
            tipoSistema: '3F'
          },
          mode: 'fast'
        }
      ]
    }
  });
}

/**
 * Health check for system service
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function healthCheck(req, res) {
  try {
    const health = await iccService.healthCheck();
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  calculateSystem,
  calculateAmpacity,
  getSystemInfo,
  healthCheck,
  validateInput: validateSchema(systemCalculationSchema)
};
