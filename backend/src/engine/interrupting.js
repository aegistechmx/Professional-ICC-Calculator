/**
 * Verificación Interruptiva (corregido y claro)
 * Capacidad interruptiva del breaker vs corriente de falla
 */

const { assertPositive } = require('./guards.js');

/**
 * Verifica si cumple capacidad interruptiva
 * @param {Object} params - Parámetros de verificación
 * @param {number} params.Icu_kA - Capacidad interruptiva del breaker en kA
 * @param {number} params.Isc_kA - Corriente de cortocircuito en kA
 * @returns {Object} Resultados de la verificación
 * @throws {Error} Si los parámetros son inválidos
 */
function checkInterrupting({ Icu_kA, Isc_kA }) {
  assertPositive('Icu_kA', Icu_kA);
  assertPositive('Isc_kA', Isc_kA);

  // ✔️ Correcto: debe ser MAYOR o IGUAL
  const ok = Icu_kA >= Isc_kA;

  return {
    ok,
    msg: ok
      ? `Cumple interruptiva: ${Icu_kA} kA ≥ ${Isc_kA} kA`
      : `NO cumple interruptiva: ${Icu_kA} kA < ${Isc_kA} kA`
  };
}

module.exports = {
  checkInterrupting
};
