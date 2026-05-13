/**
 * backend/src/application/services/fullAnalysis.js
 * Servicio para análisis completo del sistema
 */

const ElectricalCalculationDomain = require('../../domain/services/electricalCalculation.domain')

const domain = new ElectricalCalculationDomain()

/**
 * Ejecuta el pipeline de análisis completo basado en el modelo del sistema
 * @param {Object} systemModel - El modelo del grafo eléctrico
 * @returns {Promise<Object>} Resultados del análisis
 */
exports.runFullAnalysis = async systemModel => {
  try {
    const result = await domain.executePipeline(systemModel, {
      mode: 'engineering',
    })
    return result
  } catch (error) {
    throw new Error(`Full analysis failed: ${error.message}`)
  }
}
