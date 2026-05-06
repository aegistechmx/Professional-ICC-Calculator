/**
 * utils/validator.js - Validación REAL (no opcional)
 * Validación robusta para todos los endpoints
 */

/**
 * Valida input para cálculo ICC
 * @param {Object} data - Datos de entrada
 * @returns {boolean} true si válido
 * @throws {Error} si inválido
 */
function validateICCInput(data) {
  if (!data) {
    throw new Error('Body requerido');
  }

  if (!data.I_carga && !(data.voltage && data.impedance)) {
    throw new Error('Se requiere I_carga o (voltage + impedance)');
  }

  // Validar voltaje e impedancia si vienen
  if (data.voltage !== undefined) { // voltage (V)
    if (typeof data.voltage !== 'number' || data.voltage <= 0) { // voltage (V)
      throw new Error('Voltage debe ser un número positivo');
    }
    if (data.voltage < 120 || data.voltage > 35000) {
      throw new Error('Voltage fuera de rango (120-35000V)');
    }
  }

  if (data.impedance !== undefined) { // impedance (Ω)
    if (typeof data.impedance !== 'number' || data.impedance <= 0) { // impedance (Ω)
      throw new Error('Impedance debe ser un número positivo');
    }
    if (data.impedance > 100) {
      throw new Error('Impedancia demasiado alta (>100 ohms)');
    }
  }

  // Validar I_carga si viene
  if (data.I_carga !== undefined) {
    if (typeof data.I_carga !== 'number' || data.I_carga <= 0) {
      throw new Error('I_carga debe ser un número positivo');
    }
    if (data.I_carga > 10000) {
      throw new Error('I_carga demasiado alta (>10000A)');
    }
  }

  return true;
}

/**
 * Valida input para cálculo de sistema completo
 * @param {Object} data - Datos de entrada
 * @returns {boolean} true si válido
 * @throws {Error} si inválido
 */
function validateSystemInput(data) {
  if (!data) {
    throw new Error('Body requerido');
  }

  // Campos requeridos para sistema completo
  const required = [
    'I_carga',
    'material',
    'tempAislamiento',
    'tempAmbiente',
    'nConductores',
    'paralelos',
    'tempTerminal',
    'voltaje',
    'FP',
    'longitud',
    'tipoSistema'
  ];

  for (const field of required) {
    if (data[field] === undefined || data[field] === null) {
      throw new Error(`Campo requerido: ${field}`);
    }
  }

  // Validar I_carga
  if (typeof data.I_carga !== 'number' || data.I_carga <= 0) {
    throw new Error('I_carga debe ser un número positivo');
  }
  if (data.I_carga > 10000) {
    throw new Error('I_carga demasiado alta (>10000A)');
  }

  // Validar material
  if (!['cobre', 'aluminio'].includes(data.material)) {
    throw new Error('Material debe ser "cobre" o "aluminio"');
  }

  // Validar temperaturas
  const validTemps = [60, 75, 90];
  if (!validTemps.includes(data.tempAislamiento)) {
    throw new Error('tempAislamiento debe ser 60, 75, o 90');
  }
  if (!validTemps.includes(data.tempTerminal)) {
    throw new Error('tempTerminal debe ser 60, 75, o 90');
  }

  // Validar tempAmbiente
  if (typeof data.tempAmbiente !== 'number' || data.tempAmbiente < -40 || data.tempAmbiente > 60) {
    throw new Error('tempAmbiente debe estar entre -40°C y 60°C');
  }

  // Validar conductores
  if (typeof data.nConductores !== 'number' || data.nConductores < 1 || data.nConductores > 100) {
    throw new Error('nConductores debe ser entre 1 y 100');
  }
  if (typeof data.paralelos !== 'number' || data.paralelos < 1 || data.paralelos > 10) {
    throw new Error('paralelos debe ser entre 1 y 10');
  }

  // Validar voltaje
  if (typeof data.voltaje !== 'number' || data.voltaje < 120 || data.voltaje > 35000) { // voltage (V)
    throw new Error('voltaje debe estar entre 120V y 35000V');
  }

  // Validar factor de potencia
  if (typeof data.FP !== 'number' || data.FP < 0.1 || data.FP > 1.0) {
    throw new Error('FP debe estar entre 0.1 y 1.0');
  }

  // Validar longitud
  if (typeof data.longitud !== 'number' || data.longitud < 0 || data.longitud > 10000) {
    throw new Error('longitud debe estar entre 0 y 10000 metros');
  }

  // Validar tipo de sistema
  if (!['1F', '3F'].includes(data.tipoSistema)) {
    throw new Error('tipoSistema debe ser "1F" o "3F"');
  }

  return true;
}

/**
 * Valida input para cálculo de ampacidad
 * @param {Object} data - Datos de entrada
 * @returns {boolean} true si válido
 * @throws {Error} si inválido
 */
function validateAmpacityInput(data) {
  if (!data) {
    throw new Error('Body requerido');
  }

  // Campos requeridos para ampacidad
  const required = ['calibre', 'material', 'tempAislamiento', 'tempAmbiente', 'nConductores', 'paralelos', 'tempTerminal'];

  for (const field of required) {
    if (data[field] === undefined || data[field] === null) {
      throw new Error(`Campo requerido: ${field}`);
    }
  }

  // Validar calibre
  if (typeof data.calibre !== 'string' || data.calibre.trim().length === 0) {
    throw new Error('calibre debe ser un string válido');
  }

  // Validar material
  if (!['cobre', 'aluminio'].includes(data.material)) {
    throw new Error('Material debe ser "cobre" o "aluminio"');
  }

  // Validar temperaturas
  const validTemps = [60, 75, 90];
  if (!validTemps.includes(data.tempAislamiento)) {
    throw new Error('tempAislamiento debe ser 60, 75, o 90');
  }
  if (!validTemps.includes(data.tempTerminal)) {
    throw new Error('tempTerminal debe ser 60, 75, o 90');
  }

  // Validar tempAmbiente
  if (typeof data.tempAmbiente !== 'number' || data.tempAmbiente < -40 || data.tempAmbiente > 60) {
    throw new Error('tempAmbiente debe estar entre -40°C y 60°C');
  }

  // Validar conductores
  if (typeof data.nConductores !== 'number' || data.nConductores < 1 || data.nConductores > 100) {
    throw new Error('nConductores debe ser entre 1 y 100');
  }
  if (typeof data.paralelos !== 'number' || data.paralelos < 1 || data.paralelos > 10) {
    throw new Error('paralelos debe ser entre 1 y 10');
  }

  return true;
}

/**
 * Sanitiza input removiendo campos peligrosos
 * @param {Object} data - Datos a sanitizar
 * @returns {Object} Datos sanitizados
 */
function sanitizeInput(data) {
  if (!data || typeof data !== 'object') {
    return {};
  }

  const sanitized = {};
  const allowedFields = [
    'I_carga', 'voltage', 'impedance', 'material', 'tempAislamiento',
    'tempAmbiente', 'nConductores', 'paralelos', 'tempTerminal',
    'voltaje', 'FP', 'longitud', 'tipoSistema', 'calibre', 'modo',
    'Z_fuente'
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      sanitized[field] = data[field];
    }
  }

  return sanitized;
}

module.exports = {
  validateICCInput,
  validateSystemInput,
  validateAmpacityInput,
  sanitizeInput
};
