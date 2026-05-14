/**
 * core/data/factores_temperatura.js — Factores de Temperatura NOM-001-SEDE-2012
 * Tabla 310.15(B)(2)(a) - Factores de corrección por temperatura ambiente
 */

var FACTORES_TEMPERATURA = {
  60: [
    [21, 1.08], [25, 1.00], [30, 0.91], [35, 0.82], [40, 0.71], [45, 0.58], [50, 0.41]
  ],
  75: [
    [21, 1.05], [25, 1.00], [30, 0.94], [35, 0.88], [40, 0.82], [45, 0.75], [50, 0.67]
  ],
  90: [
    [21, 1.04], [25, 1.00], [30, 0.96], [35, 0.91], [40, 0.87], [45, 0.82], [50, 0.76]
  ]
};

/**
 * Obtener factor de temperatura
 * @param {number} tempAmbiente - Temperatura ambiente (°C)
 * @param {number} tempAislamiento - Temperatura de aislamiento (60, 75, 90)
 * @returns {number} Factor de corrección
 */
function getFactorTemperatura(tempAmbiente, tempAislamiento) {
  tempAislamiento = tempAislamiento || 75;
  tempAmbiente = Number(tempAmbiente) || 30;
  
  var curva = FACTORES_TEMPERATURA[tempAislamiento];
  
  if (!curva) {
    return 0.5; // Fuera de rango
  }
  
  for (var i = 0; i < curva.length; i++) {
    if (tempAmbiente <= curva[i][0]) return curva[i][1];
  }
  
  return 0.5; // Fuera de rango
}

if (typeof window !== 'undefined') {
  window.FACTORES_TEMPERATURA = FACTORES_TEMPERATURA;
  window.getFactorTemperatura = getFactorTemperatura;
}
