/**
 * Motor de Caída de Tensión (NOM-001-SEDE-2012)
 * Fórmula trifásica: ΔV = √3 · I · (R·cosφ + X·sinφ) · L
 */

const { assertPositive } = require('./guards.js');

/**
 * Calcula caída de tensión trifásica
 * @param {Object} params - Parámetros de cálculo
 * @param {number} params.I - Corriente en amperes
 * @param {number} params.V - Voltaje en volts
 * @param {number} params.L - Longitud en metros
 * @param {number} params.R - Resistencia en ohm/km
 * @param {number} params.X - Reactancia en ohm/km
 * @param {number} params.fp - Factor de potencia (0-1)
 * @returns {Object} Resultados del cálculo
 * @throws {Error} Si los parámetros son inválidos
 */
function calcVoltageDrop({
  I,
  V,
  L,
  R,
  X,
  fp
}) {
  assertPositive('I', I);
  assertPositive('V', V);
  assertPositive('L', L);
  assertPositive('R', R);
  assertPositive('X', X);
  if (fp <= 0 || fp > 1) {
    throw new Error('Factor de potencia debe estar entre 0 y 1');
  }

  const L_km = L / 1000;
  const sinPhi = Math.sqrt(1 - fp * fp);

  // Fórmula trifásica: ΔV = √3 · I · (R·cosφ + X·sinφ) · L
  const deltaV = Math.sqrt(3) * I * (R * fp + X * sinPhi) * L_km;
  const percent = (deltaV / V) * 100;

  return {
    deltaV,
    percent
  };
}

/**
 * Verifica caída de tensión según NOM-001-SEDE-2012
 * @param {number} percent - Porcentaje de caída de tensión
 * @returns {Object} Resultados de la verificación
 */
function checkVoltageDrop(percent) {
  if (percent <= 3) {
    return { ok: true, level: 'OK', msg: `Caída ${percent.toFixed(2)}% ≤ 3%` };
  }
  if (percent <= 5) {
    return { ok: true, level: 'LÍMITE', msg: `Caída ${percent.toFixed(2)}% ≤ 5% (límite)` };
  }

  return {
    ok: false,
    level: 'VIOLACIÓN',
    msg: `Caída ${percent.toFixed(2)}% > 5% (violación NOM)`
  };
}

module.exports = {
  calcVoltageDrop,
  checkVoltageDrop
};
