/**
 * Cálculo de Límite de Terminal (Art. 110.14C NOM-001-SEDE-2012)
 * Siempre definido según 60/75°C
 */

const { getAmpacity } = require('./catalogs.js');
const { assertEnum } = require('./guards.js');

/**
 * Calcula el límite de terminal
 * @param {Object} params - Parámetros de cálculo
 * @param {string} params.material - 'Cu' | 'Al'
 * @param {string|number} params.size - Calibre (300, 350, '1/0', etc.)
 * @param {number} params.terminalTempC - Temperatura de terminal en °C (60 o 75)
 * @returns {Object} Resultados del cálculo
 * @throws {Error} Si los parámetros son inválidos
 */
function calcTerminalLimit({
  material = 'Cu',
  size,
  terminalTempC = 75
}) {
  assertEnum('terminalTempC', terminalTempC, [60, 75]);

  // REGLA: Terminal siempre limita con 60°C o 75°C
  const I_terminal = getAmpacity(material, terminalTempC, size);

  if (!I_terminal || I_terminal <= 0) {
    throw new Error('Límite de terminal inválido');
  }

  return { I_terminal };
}

module.exports = {
  calcTerminalLimit
};
