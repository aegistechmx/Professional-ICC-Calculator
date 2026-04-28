/**
 * core/data/factores_agrupamiento.js — Factores de Agrupamiento NOM-001-SEDE-2012
 * Tabla 310.15(g) - Factores de corrección por agrupamiento de conductores
 */

/**
 * Obtener factor de agrupamiento
 * @param {number} nConductores - Número de conductores actuales
 * @returns {number} Factor de agrupamiento
 */
function getFactorAgrupamiento(nConductores) {
  nConductores = Number(nConductores) || 3;
  
  if (nConductores <= 3) return 1.00;
  if (nConductores <= 6) return 0.80;
  if (nConductores <= 9) return 0.70;
  if (nConductores <= 20) return 0.50;
  if (nConductores <= 30) return 0.45;
  if (nConductores <= 40) return 0.40;
  
  return 0.35;
}

if (typeof window !== 'undefined') {
  window.getFactorAgrupamiento = getFactorAgrupamiento;
}
