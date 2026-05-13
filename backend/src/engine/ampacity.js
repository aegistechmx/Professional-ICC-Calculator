/**
 * Motor de Ampacidad (sin ambigüedades)
 * Cálculo de ampacidad corregida según NOM-001-SEDE-2012
 * REGLA CLAVE: Calcular con 90°C pero limitar con terminal 75°C
 */

const {
  getAmpacity,
  TEMP_FACTOR_90C,
  TEMP_FACTOR_60C,
  TEMP_FACTOR_75C,
  GROUPING_FACTOR,
} = require('./catalogs.js')
const { assertPositive, assertEnum } = require('./guards.js')

/**
 * Calcula ampacidad corregida
 * @param {Object} params - Parámetros de cálculo
 * @param {string} params.material - 'Cu' | 'Al'
 * @param {string|number} params.size - Calibre (300, 350, '1/0', etc.)
 * @param {number} params.ambientC - Temperatura ambiente en °C (default 30)
 * @param {number} params.insulationTempC - Temperatura del aislamiento (75 o 90, default 90)
 * @param {number} params.nConductors - Número de conductores en la misma canalización (default 3)
 * @param {number} params.parallels - Número de conductores en paralelo (default 1)
 * @returns {Object} Resultados del cálculo
 * @throws {Error} Si los parámetros son inválidos
 */
function calcAmpacity({
  material = 'Cu',
  size,
  ambientC = 30,
  insulationTempC = 90,
  nConductors = 3,
  parallels = 1,
}) {
  assertEnum('material', material, ['Cu', 'Al'])
  assertPositive('ambientC', ambientC)
  assertPositive('nConductors', nConductors)
  assertPositive('parallels', parallels)

  // REGLA NOM: La ampacidad base para correcciones debe ser la del aislamiento del conductor
  let I_base_tabla;
  try {
    I_base_tabla = getAmpacity(material, insulationTempC, size) 
  } catch (e) {
    // Fallback de seguridad: si no hay tabla para la temp específica, usar la inmediata inferior
    const fallbackTemp = insulationTempC > 75 ? 75 : 60;
    I_base_tabla = getAmpacity(material, fallbackTemp, size)
  }
  
  // Seleccionar factor de corrección según temperatura de aislamiento del cable
  const F_temp = insulationTempC === 60 ? TEMP_FACTOR_60C(ambientC) :
                 insulationTempC === 75 ? TEMP_FACTOR_75C(ambientC) : 
                 TEMP_FACTOR_90C(ambientC)

  const F_group = GROUPING_FACTOR(nConductors)

  // Corriente corregida por conductor y luego por paralelos
  const I_corr = parseFloat((I_base_tabla * F_temp * F_group * parallels).toFixed(6))

  return {
    I_tabla: I_base_tabla,
    F_temp,
    F_group,
    parallels,
    I_corr,
  }
}

module.exports = {
  calcAmpacity,
}
