/**
 * Validadores de entrada (anti-basura)
 * Bloquean NaN, undefined, valores inválidos
 */

/**
 * Valida que un valor sea un número finito
 * @param {string} name - Nombre del parámetro (para mensajes de error)
 * @param {number} v - Valor a validar
 * @throws {Error} Si el valor no es un número finito
 */
function assertElectricalPrecision(name, v) {
  if (typeof v !== 'number' || !isFinite(v)) {
    throw new Error(`Valor inválido en ${name}: ${v}`);
  }
}

/**
 * Valida que un valor sea un número positivo
 * @param {string} name - Nombre del parámetro
 * @param {number} v - Valor a validar
 * @throws {Error} Si el valor no es un número positivo
 */
function assertPositive(name, v) {
  assertElectricalPrecision(name, v);
  if (v <= 0) throw new Error(`${name} debe ser > 0 (recibido ${v})`);
}

/**
 * Valida que un valor esté en una lista de valores permitidos
 * @param {string} name - Nombre del parámetro
 * @param {*} v - Valor a validar
 * @param {Array} list - Lista de valores permitidos
 * @throws {Error} Si el valor no está en la lista
 */
function assertEnum(name, v, list) {
  if (!list.includes(v)) {
    throw new Error(`${name} inválido: ${v}. Valores permitidos: ${list.join(', ')}`);
  }
}

module.exports = {
  assertElectricalPrecision,
  assertPositive,
  assertEnum
};
