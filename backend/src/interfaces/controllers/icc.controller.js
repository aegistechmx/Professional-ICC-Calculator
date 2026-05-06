/**
 * interfaces/controllers/icc.controller.js - Professional ICC Controller
 *
 * Responsibility: Handle ICC calculation requests with professional pipeline
 */

// Global dependency handling for Node.js
const conductoresData = require('../../../../icc-core/cortocircuito/js/core/data/conductores.nom');
global.CONDUCTORES_NOM = conductoresData.CONDUCTORES_NOM;
global.factorTemperatura = conductoresData.factorTemperatura;
global.factorAgrupamiento = conductoresData.factorAgrupamiento;
global.MotorAmpacidadNOM = require('../../../../icc-core/cortocircuito/js/core/MotorAmpacidadNOM');
const MotorElectrico = require('../../../../icc-core/cortocircuito/js/core/MotorElectrico');

/**
 * Calculate ICC using professional pipeline
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function calculateICC(req, res) {
  try {
    const input = req.body

    // Validate input for MotorElectrico
    if (!input || typeof input.I_carga !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Invalid input. I_carga (load current) is required as number.'
      })
    }

    if (input.I_carga <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Load current must be greater than zero.'
      })
    }

    // Run MotorElectrico complete system
    const resultado = MotorElectrico.ejecutarMotorElectrico(input);

    res.json({
      success: true,
      data: resultado
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
      description: 'Professional ICC Calculator - Complete Electrical System',
      standards: ['IEEE 1584', 'IEC 60909', 'NOM-001-SEDE-2012'],
      input: {
        I_carga: 'Load current in amperes (A)',
        material: 'Conductor material (cobre, aluminio)',
        tempAislamiento: 'Insulation temperature (60, 75, 90)',
        tempAmbiente: 'Ambient temperature (°C)',
        nConductores: 'Number of grouped conductors',
        paralelos: 'Number of parallel conductors',
        tempTerminal: 'Terminal temperature (60, 75, 90)',
        voltaje: 'System voltage (V)',
        FP: 'Power factor (0.8-1.0)',
        longitud: 'Conductor length (m)',
        tipoSistema: 'System type (1F, 3F)'
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
      }
    }
  })
}

module.exports = {
  calculateICC,
  getICCInfo
}
