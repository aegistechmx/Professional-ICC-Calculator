/**
 * tcc.js - Time Current Characteristic (TCC) Curves
 * Calcula curvas de protección según norma IEC
 *
 * Fórmula IEC:
 * t = TMS * (k / (I/Ip)^α - 1)
 *
 * Donde:
 * - I = corriente // current (A)
 * - Ip = corriente de pickup // current (A)
 * - TMS = ajuste de tiempo (Time Multiplier Setting)
 * - k, α = constantes según tipo de curva
 */

const curvasIEC = {
  standard: { k: 0.14, alpha: 0.02 },
  very: { k: 13.5, alpha: 1 },
  extremely: { k: 80, alpha: 2 },
  long_time: { k: 120, alpha: 1 },
  short_time: { k: 0.05, alpha: 0.01 },
}

/**
 * Calcula tiempo de disparo IEC
 * @param {Object} params - Parámetros de cálculo
 * @param {number} params.corriente - Corriente en amperes
 * @param {number} params.pickup - Corriente de pickup en amperes
 * @param {number} params.tms - Time Multiplier Setting (default 0.1)
 * @param {string} params.tipo - Tipo de curva: 'standard', 'very', 'extremely', 'long_time', 'short_time'
 * @returns {number} Tiempo de disparo en segundos
 */
function tiempoDisparoIEC({ corriente, pickup, tms = 0.1, tipo = 'standard' }) { // current (A)
  if (!corriente || corriente <= 0) { // current (A)
    throw new Error('Corriente debe ser mayor a 0')
  }

  if (!pickup || pickup <= 0) {
    throw new Error('Pickup debe ser mayor a 0')
  }

  if (!tms || tms <= 0) {
    throw new Error('TMS debe ser mayor a 0')
  }

  if (corriente <= pickup) return Infinity // current (A)

  const curva = curvasIEC[tipo]
  if (!curva) {
    throw new Error(`Tipo de curva inválido: ${tipo}`)
  }

  const relacion = corriente / pickup // current (A)

  const denominador = Math.pow(relacion, curva.alpha) - 1

  // Prevent division by near-zero
  if (denominador < 0.001) return Infinity

  const t = tms * (curva.k / denominador)

  return t
}

/**
 * Genera curva completa (para graficar)
 * @param {Object} params - Parámetros de la curva
 * @param {number} params.pickup - Corriente de pickup en amperes
 * @param {number} params.tms - Time Multiplier Setting
 * @param {string} params.tipo - Tipo de curva
 * @param {number} params.I_min - Corriente mínima para graficar (default pickup * 1.1)
 * @param {number} params.I_max - Corriente máxima para graficar (default 20000)
 * @param {number} params.puntos - Número de puntos a generar (default 50)
 * @returns {Array} Array de objetos { corriente, tiempo }
 */
function generarCurva({
  pickup,
  tms,
  tipo,
  I_min,
  I_max = 20000,
  puntos = 50,
}) {
  if (!pickup || pickup <= 0) {
    throw new Error('Pickup debe ser mayor a 0')
  }

  if (!tms || tms <= 0) {
    throw new Error('TMS debe ser mayor a 0')
  }

  const I_min_calc = I_min || pickup * 1.1
  const data = []

  const step = (I_max - I_min_calc) / puntos

  for (let i = 0; i <= puntos; i++) {
    const I = I_min_calc + i * step

    const t = tiempoDisparoIEC({
      corriente: I,
      pickup,
      tms,
      tipo,
    })

    if (isFinite(t) && t > 0 && t < 10000) {
      data.push({ corriente: I, tiempo: t })
    }
  }

  return data
}

/**
 * Evalúa si una corriente específica disparará el dispositivo
 * @param {Object} params - Parámetros de evaluación
 * @param {number} params.corriente - Corriente a evaluar
 * @param {number} params.pickup - Corriente de pickup
 * @param {number} params.tms - Time Multiplier Setting
 * @param {string} params.tipo - Tipo de curva
 * @param {number} params.tiempoMaximo - Tiempo máximo permitido (opcional)
 * @returns {Object} { dispara: boolean, tiempo: number, dentroDeTiempo: boolean }
 */
function evaluarDisparo({ corriente, pickup, tms, tipo, tiempoMaximo }) {
  const tiempo = tiempoDisparoIEC({ corriente, pickup, tms, tipo }) // current (A)
  const dispara = isFinite(tiempo) && tiempo < Infinity

  const resultado = {
    dispara,
    tiempo,
    dentroDeTiempo: true,
  }

  if (tiempoMaximo && dispara) {
    resultado.dentroDeTiempo = tiempo <= tiempoMaximo
  }

  return resultado
}

/**
 * Obtiene constantes de curva IEC
 * @param {string} tipo - Tipo de curva
 * @returns {Object} { k, alpha }
 */
function getConstantesCurva(tipo) {
  const curva = curvasIEC[tipo]
  if (!curva) {
    throw new Error(`Tipo de curva inválido: ${tipo}`)
  }
  return { ...curva }
}

module.exports = {
  tiempoDisparoIEC,
  generarCurva,
  evaluarDisparo,
  getConstantesCurva,
  curvasIEC,
}
