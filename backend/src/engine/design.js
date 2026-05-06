/**
 * Cálculo de Diseño y Verificación NOM 310 / 110.14
 */

const { assertPositive } = require('./guards.js');

/**
 * Calcula corriente de diseño
 * @param {Object} params - Parámetros de cálculo
 * @param {number} params.I_base - Corriente base en amperes
 * @param {number} params.Fcc - Factor de capacidad de carga (default 1.25)
 * @returns {Object} Resultados del cálculo
 * @throws {Error} Si los parámetros son inválidos
 */
function calcDesignCurrent({ I_base, Fcc = 1.25 }) {
  assertPositive('I_base', I_base);
  assertPositive('Fcc', Fcc);
  return { I_design: I_base * Fcc };
}

/**
 * Calcula ampacidad final (mínimo entre ampacidad corregida y límite de terminal)
 * @param {Object} params - Parámetros de cálculo
 * @param {number} params.I_corr - Ampacidad corregida
 * @param {number} params.I_terminal - Límite de terminal
 * @returns {Object} Resultados del cálculo
 * @throws {Error} Si el resultado es inválido
 */
function finalAmpacity({ I_corr, I_terminal }) {
  const I_final = Math.min(I_corr, I_terminal);
  if (!isFinite(I_final)) {
    throw new Error('I_final inválida');
  }
  return { I_final };
}

/**
 * Verifica si cumple ampacidad
 * @param {Object} params - Parámetros de verificación
 * @param {number} params.I_final - Ampacidad final
 * @param {number} params.I_design - Corriente de diseño
 * @returns {Object} Resultados de la verificación
 */
function checkAmpacity({ I_final, I_design }) {
  const ok = I_final >= I_design;
  return {
    ok,
    margin: (I_final - I_design) / I_design, // puede ser negativo
    msg: ok
      ? 'Cumple ampacidad'
      : `NO cumple ampacidad: I_final=${I_final.toFixed(1)}A < I_diseño=${I_design.toFixed(1)}A`
  };
}

module.exports = {
  calcDesignCurrent,
  finalAmpacity,
  checkAmpacity
};
