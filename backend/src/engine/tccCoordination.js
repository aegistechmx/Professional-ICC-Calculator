/**
 * Motor de Coordinación TCC (Time-Current Curve)
 * Curvas reales con interpolación log-log
 * Soporta breakers reales del catálogo
 */

const { assertPositive } = require('./guards.js');

/**
 * Interpolación log-log entre dos puntos
 * @param {Object} p1 - Punto 1 { I, t }
 * @param {Object} p2 - Punto 2 { I, t }
 * @param {number} I - Corriente para interpolar
 * @returns {number} Tiempo interpolado
 */
function logInterpolate(p1, p2, I) {
  const x1 = Math.log10(p1.I);
  const y1 = Math.log10(p1.t);
  const x2 = Math.log10(p2.I);
  const y2 = Math.log10(p2.t);

  const x = Math.log10(I);

  const y = y1 + (y2 - y1) * (x - x1) / (x2 - x1);

  return Math.pow(10, y);
}

/**
 * Calcula tiempo de disparo según curva IEC (legacy)
 * @param {Object} params - Parámetros de cálculo
 * @param {number} params.I - Corriente de falla en amperes
 * @param {number} params.pickup - Corriente pickup en amperes
 * @param {number} params.tms - Time multiplier setting (default 0.1)
 * @returns {number} Tiempo de disparo en segundos
 * @throws {Error} Si los parámetros son inválidos
 */
function calcTripTime({
  I,
  pickup,
  tms = 0.1
}) {
  assertPositive('I', I);
  assertPositive('pickup', pickup);
  assertPositive('tms', tms);

  const ratio = I / pickup;

  if (ratio < 1) return Infinity; // No opera por debajo de pickup

  // IEC estándar inversa (Very Inverse)
  const k = 0.14;
  const alpha = 0.02;

  const t = (k * tms) / (Math.pow(ratio, alpha) - 1);

  return t;
}

/**
 * Calcula tiempo de disparo usando curva real de breaker
 * @param {Object} breaker - Datos del breaker del catálogo
 * @param {number} I_fault - Corriente de falla en amperes
 * @returns {number} Tiempo de disparo en segundos
 * @throws {Error} Si los parámetros son inválidos
 */
function getTripTimeReal(breaker, I_fault) {
  assertPositive('I_fault', I_fault);

  const ratio = I_fault / breaker.In;

  // Zona magnética (instantáneo)
  if (ratio >= breaker.magnetic.pickup) {
    return breaker.magnetic.clearingTime;
  }

  // Zona térmica - interpolación log-log
  const pts = breaker.thermal.points;

  // Buscar segmento donde cae la corriente
  for (let i = 0; i < pts.length - 1; i++) {
    if (ratio >= pts[i].I && ratio <= pts[i + 1].I) {
      return logInterpolate(pts[i], pts[i + 1], ratio);
    }
  }

  // Si está por debajo del primer punto, extrapolación
  if (ratio < pts[0].I) {
    return Infinity; // No opera
  }

  // Si está por encima del último punto, extrapolación
  const lastIdx = pts.length - 1;
  return logInterpolate(pts[lastIdx - 1], pts[lastIdx], ratio);
}

/**
 * Genera puntos de curva para graficación
 * @param {Object} breaker - Datos del breaker
 * @param {number} steps - Número de pasos (default 100)
 * @returns {Array} Array de puntos { x: I, y: t }
 */
function generateCurve(breaker, steps = 100) {
  const data = [];
  const maxRatio = breaker.thermal.points[breaker.thermal.points.length - 1].I * 1.5;

  for (let i = 1; i <= maxRatio; i += maxRatio / steps) {
    const I = breaker.In * i;
    const t = getTripTimeReal(breaker, I);

    if (isFinite(t) && t > 0) {
      data.push({ x: I, y: t });
    }
  }

  return data;
}

/**
 * Verifica coordinación entre dispositivos upstream y downstream (curvas reales)
 * @param {Object} params - Parámetros de verificación
 * @param {Object} params.upstream - Breaker upstream (del catálogo)
 * @param {Object} params.downstream - Breaker downstream (del catálogo)
 * @param {number} params.I_fault - Corriente de falla en amperes
 * @returns {Object} Resultados de la verificación
 * @throws {Error} Si los parámetros son inválidos
 */
function checkCoordinationReal({
  upstream,
  downstream,
  I_fault
}) {
  assertPositive('I_fault', I_fault);

  const t_up = getTripTimeReal(upstream, I_fault);
  const t_down = getTripTimeReal(downstream, I_fault);

  const margin = t_up - t_down;
  const coordinated = margin > 0.2; // 200 ms típico para coordinación

  return {
    coordinated,
    margin,
    t_up,
    t_down,
    msg: coordinated
      ? `Coordinado: margen ${margin.toFixed(3)}s > 0.2s`
      : `NO coordinado: margen ${margin.toFixed(3)}s < 0.2s`
  };
}

/**
 * Verifica coordinación entre dispositivos upstream y downstream (legacy IEC)
 * @param {Object} params - Parámetros de verificación
 * @param {Object} params.upstream - Configuración dispositivo upstream
 * @param {Object} params.downstream - Configuración dispositivo downstream
 * @param {number} params.I_fault - Corriente de falla en amperes
 * @returns {Object} Resultados de la verificación
 * @throws {Error} Si los parámetros son inválidos
 */
function checkCoordination({
  upstream,
  downstream,
  I_fault
}) {
  assertPositive('I_fault', I_fault);

  const t_up = calcTripTime({ ...upstream, I: I_fault });
  const t_down = calcTripTime({ ...downstream, I: I_fault });

  const margin = t_up - t_down;
  const coordinated = margin > 0.2; // 200 ms típico para coordinación

  return {
    coordinated,
    margin,
    t_up,
    t_down,
    msg: coordinated
      ? `Coordinado: margen ${margin.toFixed(3)}s > 0.2s`
      : `NO coordinado: margen ${margin.toFixed(3)}s < 0.2s`
  };
}

module.exports = {
  calcTripTime,
  getTripTimeReal,
  generateCurve,
  checkCoordinationReal,
  checkCoordination
};
