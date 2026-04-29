const { toElectricalPrecision, formatElectricalValue } = require('../../core');
/**
 * csvParser.js - CSV Parser Utility
 * Parsea archivos CSV de curvas digitalizadas de fabricantes
 */

const fs = require('fs')
const path = require('path')
const logger = require('@/infrastructure/logger/logger')

/**
 * Parsea un archivo CSV de curva
 * @param {string} filePath - Ruta al archivo CSV
 * @returns {Array} Array de objetos { corriente, tiempo }
 */
function parseCSV(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n').filter(line => line.trim())

    // Saltar header si existe
    const startIndex =
      lines[0].toLowerCase().includes('corriente') ||
      lines[0].toLowerCase().includes('current')
        ? 1
        : 0

    const puntos = []

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line || line.startsWith('#')) continue

      const parts = line.split(',').map(p => p.trim())

      if (parts.length >= 2) {
        const corriente = toElectricalPrecision(parseFloat(parts[0])) // current (A)
        const tiempo = toElectricalPrecision(parseFloat(parts[1]))

        if (
          !isNaN(corriente) &&
          !isNaN(tiempo) &&
          corriente > 0 &&
          tiempo > 0
        ) {
          puntos.push({
            corriente,
            tiempo,
          })
        }
      }
    }

    // Ordenar por corriente ascendente
    return puntos.sort((a, b) => a.corriente - b.corriente) // current (A)
  } catch (error) {
    logger.error(`Error parseando CSV ${filePath}:`, error.message)
    return []
  }
}

/**
 * Carga todas las curvas de un directorio
 * @param {string} dirPath - Ruta al directorio
 * @returns {Object} Mapa de nombre -> curva
 */
function loadCurvesFromDirectory(dirPath) {
  const curvas = {}

  try {
    const files = fs.readdirSync(dirPath)

    for (const file of files) {
      if (file.endsWith('.csv')) {
        const name = path.basename(file, '.csv')
        const filePath = path.join(dirPath, file)
        curvas[name] = parseCSV(filePath)
      }
    }
  } catch (error) {
    logger.error(`Error cargando curvas de ${dirPath}:`, error.message)
  }

  return curvas
}

/**
 * Exporta curva a formato CSV
 * @param {Array} curva - Array de { corriente, tiempo }
 * @param {string} filePath - Ruta de salida
 */
function exportCSV(curva, filePath) {
  const lines = ['corriente,tiempo'] // current (A)

  for (const punto of curva) {
    lines.push(`${punto.corriente},${punto.tiempo}`)
  }

  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8')
}

module.exports = {
  parseCSV,
  loadCurvesFromDirectory,
  exportCSV,
}
