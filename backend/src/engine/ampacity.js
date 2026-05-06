/**
 * Motor de Ampacidad (sin ambigüedades)
 * Cálculo de ampacidad corregida según NOM-001-SEDE-2012
 * REGLA CLAVE: Calcular con 90°C pero limitar con terminal 75°C
 */

const { getAmpacity, TEMP_FACTOR_90C, GROUPING_FACTOR } = require('./catalogs.js');
const { assertPositive, assertEnum } = require('./guards.js');

/**
 * Calcula ampacidad corregida
 * @param {Object} params - Parámetros de cálculo
 * @param {string} params.material - 'Cu' | 'Al'
 * @param {string|number} params.size - Calibre (300, 350, '1/0', etc.)
 * @param {number} params.ambientC - Temperatura ambiente en °C (default 30)
 * @param {number} params.nConductors - Número de conductores en la misma canalización (default 3)
 * @param {number} params.parallels - Número de conductores en paralelo (default 1)
 * @returns {Object} Resultados del cálculo
 * @throws {Error} Si los parámetros son inválidos
 */
function calcAmpacity({
  material = 'Cu',
  size,
  ambientC = 30,
  nConductors = 3,
  parallels = 1
}) {
  assertEnum('material', material, ['Cu', 'Al']);
  assertPositive('ambientC', ambientC);
  assertPositive('nConductors', nConductors);
  assertPositive('parallels', parallels);

  // REGLA NOM: Calcular con 90°C (conductores tipo THHN/THWN)
  const I_tabla_90C = getAmpacity(material, 90, size); // NUNCA 0
  const F_temp = TEMP_FACTOR_90C(ambientC);
  const F_group = GROUPING_FACTOR(nConductors);

  // Corriente corregida por conductor y luego por paralelos
  const I_corr = I_tabla_90C * F_temp * F_group * parallels;

  return {
    I_tabla: I_tabla_90C,
    F_temp,
    F_group,
    parallels,
    I_corr
  };
}

module.exports = {
  calcAmpacity
};
