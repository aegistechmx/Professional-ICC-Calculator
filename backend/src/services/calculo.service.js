const Motor = require('../core/calculo/motor');
const iccCore = require('../core/calculo/icc');
const motoresCore = require('../core/calculo/motores');
const { iccSimpleSchema, iccSchema, fallaMinimaSchema } = require('../validators/calculo.schema');

/**
 * @typedef {Object} ICCParams
 * @property {number} voltaje - System voltage in volts
 * @property {number} resistencia - Resistance in ohms
 * @property {number} reactancia - Reactance in ohms
 * @property {'trifasico'|'monofasico'|'bifasico'} tipo - Fault type
 * @property {string} [modo] - Calculation mode: 'conocido' or 'mva'
 * @property {number} [tension] - Optional tension value
 */

/**
 * @typedef {Object} ICCResult
 * @property {number} icc - Short circuit current in amps
 * @property {number} impedancia - Total impedance in ohms
 * @property {string} tipo - Fault type
 * @property {number} mva - Short circuit power in MVA
 * @property {Array} [puntos] - Array of calculation points
 * @property {number} [max_kA] - Maximum current in kA
 */

/**
 * @typedef {Object} MotorData
 * @property {number} potencia_kw - Motor power in kW
 * @property {number} voltaje - Motor voltage in volts
 * @property {string} nombre - Motor name
 * @property {number} [hp] - Motor horsepower
 * @property {string} [tipo] - Motor type
 */

/**
 * Simple ICC calculation (basic impedance-based)
 * @param {ICCParams} data - ICC calculation parameters
 * @returns {Promise<ICCResult>} ICC calculation result
 * @throws {Error} If validation fails
 */
exports.iccSimple = async (data) => {
  // Validate input
  iccSimpleSchema.parse(data);

  const resultado = iccCore.calcularICC(data);

  const potencia = iccCore.calcularPotenciaCorto({
    voltaje: data.voltaje,
    icc: resultado.icc
  });

  return {
    ...resultado,
    ...potencia
  };
};

/**
 * Comprehensive ICC calculation (full system with feeders, motors, etc.)
 * @param {Object} data - Full system calculation parameters
 * @returns {Promise<Object>} Complete ICC calculation result with points
 * @throws {Error} If calculation fails
 */
exports.icc = async (data) => {
  // Validate input
  iccSchema.parse(data);

  // Execute calculation
  const result = Motor.ejecutar(data);

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
};

/**
 * Calculate minimum fault current for sensitivity analysis
 * @param {Object} data - Minimum fault calculation parameters
 * @param {Array} data.puntosMax - Maximum fault current points
 * @param {string} data.tipoSistema - System type ('3f' or '1f')
 * @returns {Promise<Object>} Minimum fault current results
 * @throws {Error} If validation fails
 */
exports.fallaMinima = async (data) => {
  // Validate input
  fallaMinimaSchema.parse(data);

  // Execute calculation
  const result = Motor.ejecutarFallaMinima(data.puntosMax, data.tipoSistema);

  return result;
};

/**
 * Calculate earth return resistance based on transformer configuration
 * @param {Object} data - Earth return calculation parameters
 * @param {string} [data.tipoAterrizamiento] - Grounding type (default: 'yg_solido')
 * @param {number} data.tension - System voltage in volts
 * @param {number} [data.trafoKVA] - Transformer kVA (default: 500)
 * @param {number} [data.trafoZ] - Transformer impedance % (default: 5.75)
 * @returns {Promise<{retornoTierra: number}>} Earth return resistance in mΩ
 * @throws {Error} If tension is invalid
 */
exports.retornoTierra = async (data) => {
  const { tipoAterrizamiento, tension, trafoKVA, trafoZ } = data;

  if (!tension || tension <= 0) {
    throw new Error('Tensión inválida');
  }

  const retorno = Motor.calcularRetornoTierraAutomatico(
    tipoAterrizamiento || 'yg_solido',
    tension,
    trafoKVA || 500,
    trafoZ || 5.75
  );

  return { retornoTierra: retorno };
};

/**
 * ICC calculation with motor contribution (time-based exponential decay model)
 * Combines grid ICC with motor contribution at specific time
 * @param {Object} data - Motor contribution calculation parameters
 * @param {number} data.voltaje - System voltage in volts
 * @param {number} data.resistencia - System resistance in ohms
 * @param {number} data.reactancia - System reactance in ohms
 * @param {string} data.tipo - Fault type
 * @param {MotorData[]} [data.motores] - Array of motors contributing to fault
 * @param {number} [data.tiempo] - Time in seconds for motor contribution (default: 0)
 * @param {boolean} [data.generarCurva] - Whether to generate motor curve
 * @returns {Promise<Object>} Combined ICC result with motor contribution
 */
exports.iccConMotores = async (data) => {
  const {
    voltaje,
    resistencia,
    reactancia,
    tipo,
    motores = [],
    tiempo = 0
  } = data;

  // ICC de la red
  const red = iccCore.calcularICC({
    voltaje,
    resistencia,
    reactancia,
    tipo
  });

  // Aporte de motores en el tiempo especificado
  const motoresRes = motoresCore.aporteMotoresTotal({
    motores,
    t: tiempo,
    factor_aporte: 5,
    constante_tiempo: 0.05
  });

  const iccTotal = red.icc + motoresRes.total_aporte;

  // Generar curva de motores si se solicita
  let curvaMotores = null;
  if (data.generarCurva) {
    curvaMotores = motoresCore.generarCurvaMotores(motores, 0.2, 20);
  }

  return {
    icc_red: red.icc,
    icc_motores: motoresRes.total_aporte,
    icc_total: iccTotal,
    icc_red_ka: parseFloat((red.icc / 1000).toFixed(3)),
    icc_motores_ka: parseFloat((motoresRes.total_aporte / 1000).toFixed(3)),
    icc_total_ka: parseFloat((iccTotal / 1000).toFixed(3)),
    tiempo,
    detalle_motores: motoresRes.motores,
    curva_motores: curvaMotores
  };
};
