/**
 * Catálogos de Ampacidad NOM-001-SEDE-2012 / NEC 310
 * Estructura completa: material + temperatura + calibres reales
 * Basada en tablas oficiales (60/75/90°C, Cu/Al)
 */

const AMPACITY = {
  Cu: {
    60: {
      14: 20, 12: 25, 10: 30, 8: 40, 6: 55, 4: 70, 3: 85, 2: 95, 1: 110,
      '1/0': 125, '2/0': 145, '3/0': 165, '4/0': 195,
      250: 215, 300: 240, 350: 260, 400: 280, 500: 320
    },
    75: {
      14: 20, 12: 25, 10: 35, 8: 50, 6: 65, 4: 85, 3: 100, 2: 115, 1: 130,
      '1/0': 150, '2/0': 175, '3/0': 200, '4/0': 230,
      250: 255, 300: 285, 350: 310, 400: 335, 500: 380
    },
    90: {
      14: 25, 12: 30, 10: 40, 8: 55, 6: 75, 4: 95, 3: 115, 2: 130, 1: 150,
      '1/0': 170, '2/0': 195, '3/0': 225, '4/0': 260,
      250: 290, 300: 320, 350: 350, 400: 380, 500: 430
    }
  },
  Al: {
    75: {
      12: 20, 10: 30, 8: 40, 6: 50, 4: 65, 3: 75, 2: 90, 1: 100,
      '1/0': 120, '2/0': 135, '3/0': 155, '4/0': 180,
      250: 205, 300: 230, 350: 250, 400: 270, 500: 310
    }
  }
};

/**
 * Factor de corrección de temperatura para 90°C (NOM-001-SEDE-2012)
 * @param {number} ambientC - Temperatura ambiente en °C
 * @returns {number} Factor de corrección
 */
const TEMP_CORRECTION_90C = {
  21: 1.08,
  26: 1.04,
  30: 1.00,
  35: 0.96,
  40: 0.91,
  45: 0.87,
  50: 0.82
};

/**
 * Factor de corrección de temperatura (interpolado para 90°C)
 * @param {number} ambientC - Temperatura ambiente en °C
 * @returns {number} Factor de corrección
 */
const TEMP_FACTOR_90C = (ambientC) => {
  const table = TEMP_CORRECTION_90C;
  const temps = Object.keys(table).map(Number).sort((a, b) => a - b);

  if (ambientC <= temps[0]) return table[temps[0]];
  if (ambientC >= temps[temps.length - 1]) return table[temps[temps.length - 1]];

  // Interpolación lineal
  for (let i = 0; i < temps.length - 1; i++) {
    if (ambientC >= temps[i] && ambientC <= temps[i + 1]) {
      const t1 = temps[i];
      const t2 = temps[i + 1];
      const f1 = table[t1];
      const f2 = table[t2];
      return f1 + (f2 - f1) * ((ambientC - t1) / (t2 - t1));
    }
  }

  return 0.82; // fallback
};

/**
 * Factor de agrupamiento (NOM-001-SEDE-2012)
 * @param {number} nConductors - Número de conductores en la misma canalización
 * @returns {number} Factor de corrección
 */
const GROUPING_FACTOR = (nConductors) => {
  if (nConductors <= 3) return 1.00;
  if (nConductors <= 6) return 0.80;
  if (nConductors <= 9) return 0.70;
  return 0.60;
};

/**
 * Obtiene ampacidad base de tabla
 * @param {string} material - 'Cu' | 'Al'
 * @param {number} tempC - Temperatura (60, 75, 90)
 * @param {string|number} size - Calibre (300, 350, '1/0', etc.)
 * @returns {number} Ampacidad en amperes
 * @throws {Error} Si el calibre no existe en la tabla
 */
function getAmpacity(material, tempC, size) {
  if (!AMPACITY[material]) {
    throw new Error(`Material no encontrado: ${material}`);
  }
  if (!AMPACITY[material][tempC]) {
    throw new Error(`Temperatura no encontrada para ${material}: ${tempC}°C`);
  }
  const val = AMPACITY[material][tempC][size];
  if (!val) {
    throw new Error(`Calibre no encontrado en tabla ${tempC}°C: ${material} ${size}`);
  }
  return val;
}

/**
 * Obtiene ampacidad base de tabla 75°C (legacy)
 * @param {string} material - 'Cu' | 'Al'
 * @param {string|number} size - Calibre (300, 350, '1/0', etc.)
 * @returns {number} Ampacidad en amperes
 * @throws {Error} Si el calibre no existe en la tabla
 */
function getAmpacity75C(material, size) {
  return getAmpacity(material, 75, size);
}

module.exports = {
  AMPACITY,
  TEMP_CORRECTION_90C,
  TEMP_FACTOR_90C,
  GROUPING_FACTOR,
  getAmpacity,
  getAmpacity75C
};
