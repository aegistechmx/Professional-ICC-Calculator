/**
 * core/data/resistencias.js — Catálogo de Resistencias de Conductores
 * Resistencia DC a 75°C según NEC/NOM (ohm/km)
 * Fuente: NEC Table 9 / NOM-001-SEDE-2012
 */

var RESISTENCIA_COBRE = {
  "14": 8.286,
  "12": 5.211,
  "10": 3.277,
  "8": 2.061,
  "6": 1.296,
  "4": 0.815,
  "3": 0.646,
  "2": 0.513,
  "1": 0.406,
  "1/0": 0.322,
  "2/0": 0.255,
  "3/0": 0.202,
  "4/0": 0.160,
  "250": 0.128,
  "300": 0.107,
  "350": 0.091,
  "400": 0.080,
  "500": 0.064,
  "600": 0.053,
  "750": 0.042,
  "1000": 0.032
};

var RESISTENCIA_ALUMINIO = {
  "12": 8.540,
  "10": 5.380,
  "8": 3.380,
  "6": 2.130,
  "4": 1.340,
  "3": 1.060,
  "2": 0.840,
  "1": 0.660,
  "1/0": 0.530,
  "2/0": 0.420,
  "3/0": 0.330,
  "4/0": 0.260,
  "250": 0.210,
  "300": 0.175,
  "350": 0.150,
  "400": 0.130,
  "500": 0.105,
  "600": 0.087,
  "750": 0.070,
  "1000": 0.053
};

/**
 * Reactancia típica de conductores (ohm/km)
 * Valor promedio para conductores en canalización
 */
var REACTANCIA_TIPICA = 0.08;

/**
 * Obtener resistencia por calibre y material
 * @param {string} calibre - Calibre del conductor
 * @param {string} material - Material (cobre, aluminio)
 * @returns {number} Resistencia (ohm/km)
 */
function obtenerResistencia(calibre, material) {
  material = material || 'cobre';
  
  var tabla = material === 'aluminio' ? RESISTENCIA_ALUMINIO : RESISTENCIA_COBRE;
  
  var resistencia = tabla[calibre];
  
  if (!resistencia) {
    throw new Error("Resistencia no encontrada para calibre " + calibre + " (material: " + material + ")");
  }
  
  return resistencia;
}

/**
 * Obtener reactancia por calibre
 * @param {string} calibre - Calibre del conductor
 * @returns {number} Reactancia (ohm/km)
 */
function obtenerReactancia(calibre) {
  // Reactancia es relativamente constante para calibres estándar
  return REACTANCIA_TIPICA;
}

/**
 * Calcular impedancia total del conductor
 * @param {string} calibre - Calibre del conductor
 * @param {string} material - Material
 * @param {number} longitud_m - Longitud (m)
 * @returns {Object} { R, X, Z }
 */
function calcularImpedancia(calibre, material, longitud_m) {
  var R_por_km = obtenerResistencia(calibre, material);
  var X_por_km = obtenerReactancia(calibre);
  
  var L_km = longitud_m / 1000;
  
  var R = R_por_km * L_km;
  var X = X_por_km * L_km;
  var Z = Math.sqrt(R * R + X * X);
  
  return {
    R: R,
    X: X,
    Z: Z,
    R_por_km: R_por_km,
    X_por_km: X_por_km,
    longitud: longitud_m
  };
}

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RESISTENCIA_COBRE: RESISTENCIA_COBRE,
    RESISTENCIA_ALUMINIO: RESISTENCIA_ALUMINIO,
    REACTANCIA_TIPICA: REACTANCIA_TIPICA,
    obtenerResistencia: obtenerResistencia,
    obtenerReactancia: obtenerReactancia,
    calcularImpedancia: calcularImpedancia
  };
}

if (typeof window !== 'undefined') {
  window.RESISTENCIA_COBRE = RESISTENCIA_COBRE;
  window.RESISTENCIA_ALUMINIO = RESISTENCIA_ALUMINIO;
  window.REACTANCIA_TIPICA = REACTANCIA_TIPICA;
  window.obtenerResistencia = obtenerResistencia;
  window.obtenerReactancia = obtenerReactancia;
  window.calcularImpedancia = calcularImpedancia;
}
