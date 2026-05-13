/**
 * Catálogos de Ampacidad NOM-001-SEDE-2012 / NEC 310
 * Estructura completa: material + temperatura + calibres reales
 * Basada en tablas oficiales (60/75/90°C, Cu/Al)
 */

const AMPACITY = {
  Cu: {
    60: {
      14: 20,
      12: 25,
      10: 30,
      8: 40,
      6: 55,
      4: 70,
      3: 85,
      2: 95,
      1: 110,
      '1/0': 125,
      '2/0': 145,
      '3/0': 165,
      '4/0': 195,
      250: 215,
      300: 240,
      350: 260,
      400: 280,
      500: 320,
    },
    75: {
      14: 20,
      12: 25,
      10: 35,
      8: 50,
      6: 65,
      4: 85,
      3: 100,
      2: 115,
      1: 130,
      '1/0': 150,
      '2/0': 175,
      '3/0': 200,
      '4/0': 230,
      250: 255,
      300: 285,
      350: 310,
      400: 335,
      500: 380,
    },
    90: {
      14: 25,
      12: 30,
      10: 40,
      8: 55,
      6: 75,
      4: 95,
      3: 115,
      2: 130,
      1: 150,
      '1/0': 170,
      '2/0': 195,
      '3/0': 225,
      '4/0': 260,
      250: 290,
      300: 320,
      350: 350,
      400: 380,
      500: 430,
    },
  },
  Al: {
    60: {
      12: 20,
      10: 25,
      8: 30,
      6: 40,
      4: 55,
      3: 65,
      2: 75,
      1: 85,
      '1/0': 100,
      '2/0': 115,
      '3/0': 130,
      '4/0': 155,
      250: 170,
      300: 190,
      350: 210,
      400: 225,
      500: 260,
    },
    75: {
      12: 20,
      10: 30,
      8: 40,
      6: 50,
      4: 65,
      3: 75,
      2: 90,
      1: 100,
      '1/0': 120,
      '2/0': 135,
      '3/0': 155,
      '4/0': 180,
      250: 205,
      300: 230,
      350: 250,
      400: 270,
      500: 310,
    },
    90: {
      12: 25,
      10: 35,
      8: 45,
      6: 60,
      4: 75,
      3: 85,
      2: 100,
      1: 115,
      '1/0': 135,
      '2/0': 150,
      '3/0': 175,
      '4/0': 205,
      250: 230,
      300: 255,
      350: 280,
      400: 305,
      500: 350,
    },
  },
}

/**
 * Factor de corrección de temperatura para 90°C (NOM-001-SEDE-2012)
 * @param {number} ambientC - Temperatura ambiente en °C
 * @returns {number} Factor de corrección
 */
const TEMP_CORRECTION_90C = {
  21: 1.08,
  26: 1.04,
  30: 1.0,
  35: 0.96,
  40: 0.91,
  45: 0.87,
  50: 0.82,
}

/**
 * Factor de corrección de temperatura para 60°C (NOM-001-SEDE-2012)
 * @param {number} ambientC - Temperatura ambiente en °C
 * @returns {number} Factor de corrección
 */
const TEMP_CORRECTION_60C = {
  21: 1.08,
  26: 1.0,
  31: 0.91,
  36: 0.82,
  41: 0.71,
  46: 0.58,
  51: 0.41,
}

/**
 * Factor de corrección de temperatura para 75°C (NOM-001-SEDE-2012)
 * @param {number} ambientC - Temperatura ambiente en °C
 * @returns {number} Factor de corrección
 */
const TEMP_CORRECTION_75C = {
  21: 1.05,
  26: 1.0,
  31: 0.94,
  36: 0.88,
  41: 0.82,
  46: 0.75,
  51: 0.67,
}

/**
 * Factor de corrección de temperatura (interpolador genérico)
 * @param {number} ambientC - Temperatura ambiente en °C
 * @param {Object} table - Tabla de corrección a usar
 * @returns {number} Factor de corrección
 */
const getTempFactor = (ambientC, table) => {
  const temps = Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b)

  if (ambientC <= temps[0]) return table[temps[0]]
  if (ambientC >= temps[temps.length - 1]) return table[temps[temps.length - 1]]

  // Interpolación lineal
  for (let i = 0; i < temps.length - 1; i++) {
    if (ambientC >= temps[i] && ambientC <= temps[i + 1]) {
      const t1 = temps[i]
      const t2 = temps[i + 1]
      const f1 = table[t1]
      const f2 = table[t2]
      return f1 + (f2 - f1) * ((ambientC - t1) / (t2 - t1))
    }
  }

  return table[temps[temps.length - 1]] // fallback
}

/**
 * Factor de corrección de temperatura (interpolado para 90°C)
 */
const TEMP_FACTOR_90C = ambientC => getTempFactor(ambientC, TEMP_CORRECTION_90C)

/**
 * Factor de corrección de temperatura (interpolado para 60°C)
 */
const TEMP_FACTOR_60C = ambientC => getTempFactor(ambientC, TEMP_CORRECTION_60C)

/**
 * Factor de corrección de temperatura (interpolado para 75°C)
 */
const TEMP_FACTOR_75C = ambientC => getTempFactor(ambientC, TEMP_CORRECTION_75C)

/**
 * Factor de agrupamiento (NOM-001-SEDE-2012)
 * @param {number} nConductors - Número de conductores en la misma canalización
 * @returns {number} Factor de corrección
 */
const GROUPING_FACTOR = nConductors => {
  if (nConductors <= 3) return 1.0
  if (nConductors <= 6) return 0.8
  if (nConductors <= 9) return 0.7
  return 0.6
}

/**
 * Obtiene ampacidad base de tabla
 * @param {string} material - 'Cu' | 'Al'
 * @param {number} tempC - Temperatura (60, 75, 90)
 * @param {string|number} size - Calibre (300, 350, '1/0', etc.)
 * @returns {number} Ampacidad en amperes
 * @throws {Error} Si el calibre no existe en la tabla
 */
function getAmpacity(material, tempC, size) {
  // Normalización de material (Maneja "Cu", "Cobre (Cu)", "Al", "Aluminio (Al)")
  let mat = material;
  if (typeof material === 'string') {
    if (material.includes('Cu') || material.toLowerCase().includes('cobre')) mat = 'Cu';
    if (material.includes('Al') || material.toLowerCase().includes('aluminio')) mat = 'Al';
  }

  // Normalización de calibre (limpiar sufijos kcmil, AWG, MCM)
  const cleanSize = typeof size === 'string' ? size.replace(/\s*(awg|kcmil|mcm)/gi, '') : size;

  if (!AMPACITY[mat]) {
    throw new Error(`Material no encontrado: ${mat}`)
  }

  // Asegurar que tempC sea número para indexar
  const temp = parseInt(tempC);
  if (!AMPACITY[mat][temp]) {
    throw new Error(`Temperatura no encontrada para ${mat}: ${temp}°C`)
  }

  // Buscar el valor del calibre
  const val = AMPACITY[mat][temp][cleanSize]

  if (!val) {
    throw new Error(
      `Calibre no encontrado en tabla ${temp}°C: ${mat} ${cleanSize}`
    )
  }
  return val
}

/**
 * Obtiene ampacidad base de tabla 75°C (legacy)
 * @param {string} material - Material
 * @param {string|number} size - Calibre
 * @returns {number} Ampacidad a 75°C
 */
function getAmpacity75(material, size) {
  return getAmpacity(material, 75, size)
}

module.exports = {
  getAmpacity,
  getAmpacity75,
  TEMP_FACTOR_90C,
  TEMP_FACTOR_60C,
  TEMP_FACTOR_75C,
  GROUPING_FACTOR,
}