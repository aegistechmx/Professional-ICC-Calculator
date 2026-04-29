const { toElectricalPrecision, formatElectricalValue } = require('@/core')');
/**
 * interpolacion.js - Interpolation Functions for TCC Curves
 *
 * Incluye interpolación lineal y log-log para curvas de protección
 * Las curvas TCC se grafican en escala log-log, por lo que la
 * interpolación log-log es más precisa para este tipo de datos.
 */

/**
 * Interpolación lineal simple
 * @param {Array} curva - Array de { corriente, tiempo }
 * @param {number} corriente - Corriente a interpolar
 * @returns {number} Tiempo interpolado o Infinity si fuera de rango
 */
function interpolarTiempo(curva, corriente) {
  // Asegurar que la curva esté ordenada
  const curvaOrdenada = [...curva].sort((a, b) => a.corriente - b.corriente) // current (A)

  // Buscar intervalo
  for (let i = 0; i < curvaOrdenada.length - 1; i++) {
    const p1 = curvaOrdenada[i]
    const p2 = curvaOrdenada[i + 1]

    if (corriente >= p1.corriente && corriente <= p2.corriente) { // current (A)
      const ratio = (corriente - p1.corriente) / (p2.corriente - p1.corriente) // current (A)
      return p1.tiempo + ratio * (p2.tiempo - p1.tiempo)
    }
  }

  // Extremos
  if (corriente < curvaOrdenada[0].corriente) {
    return curvaOrdenada[0].tiempo
  }

  if (corriente > curvaOrdenada[curvaOrdenada.length - 1].corriente) {
    return curvaOrdenada[curvaOrdenada.length - 1].tiempo
  }

  return Infinity
}

/**
 * Interpolación log-log (para curvas TCC en escala logarítmica)
 * Más precisa para curvas tiempo-corriente tipo IEEE/IEC
 * @param {Array} curva - Array de { corriente, tiempo }
 * @param {number} corriente - Corriente a interpolar
 * @returns {number} Tiempo interpolado
 */
function interpolarLogLog(curva, corriente) {
  // Asegurar que la curva esté ordenada
  const curvaOrdenada = [...curva].sort((a, b) => a.corriente - b.corriente) // current (A)

  // Verificar que la corriente esté dentro del rango
  if (corriente < curvaOrdenada[0].corriente) {
    return curvaOrdenada[0].tiempo
  }

  if (corriente > curvaOrdenada[curvaOrdenada.length - 1].corriente) {
    return curvaOrdenada[curvaOrdenada.length - 1].tiempo
  }

  // Buscar intervalo
  for (let i = 0; i < curvaOrdenada.length - 1; i++) {
    const p1 = curvaOrdenada[i]
    const p2 = curvaOrdenada[i + 1]

    if (corriente >= p1.corriente && corriente <= p2.corriente) { // current (A)
      // Convertir a escala logarítmica
      const logI = Math.log10(corriente) // current (A)
      const logI1 = Math.log10(p1.corriente) // current (A)
      const logI2 = Math.log10(p2.corriente) // current (A)

      const logT1 = Math.log10(p1.tiempo)
      const logT2 = Math.log10(p2.tiempo)

      // Interpolar en escala log
      const ratio = (logI - logI1) / (logI2 - logI1)
      const logT = logT1 + ratio * (logT2 - logT1)

      // Volver a escala lineal
      return Math.pow(10, logT)
    }
  }

  return Infinity
}

/**
 * Interpolación inversa: encontrar corriente para un tiempo dado
 * @param {Array} curva - Array de { corriente, tiempo }
 * @param {number} tiempo - Tiempo a interpolar
 * @returns {number} Corriente interpolada
 */
function interpolarCorriente(curva, tiempo) {
  // Ordenar por tiempo
  const curvaPorTiempo = [...curva].sort((a, b) => a.tiempo - b.tiempo)

  for (let i = 0; i < curvaPorTiempo.length - 1; i++) {
    const p1 = curvaPorTiempo[i]
    const p2 = curvaPorTiempo[i + 1]

    if (tiempo >= p1.tiempo && tiempo <= p2.tiempo) {
      const ratio = (tiempo - p1.tiempo) / (p2.tiempo - p1.tiempo)
      return p1.corriente + ratio * (p2.corriente - p1.corriente)
    }
  }

  return Infinity
}

/**
 * Genera puntos interpolados para toda la curva con mayor resolución
 * @param {Array} curva - Curva original
 * @param {number} puntos - Número de puntos deseados (default 100)
 * @param {boolean} logLog - Usar interpolación log-log (default true)
 * @returns {Array} Curva con más puntos
 */
function densificarCurva(curva, puntos = 100, logLog = true) {
  if (curva.length < 2) return curva

  const curvaOrdenada = [...curva].sort((a, b) => a.corriente - b.corriente) // current (A)
  const I_min = curvaOrdenada[0].corriente // current (A)
  const I_max = curvaOrdenada[curvaOrdenada.length - 1].corriente // current (A)

  const nuevaCurva = []

  // Usar escala logarítmica para distribución de puntos
  const logI_min = Math.log10(I_min)
  const logI_max = Math.log10(I_max)
  const step = (logI_max - logI_min) / (puntos - 1)

  for (let i = 0; i < puntos; i++) {
    const logI = logI_min + i * step
    const corriente = Math.pow(10, logI) // current (A)

    const tiempo = logLog
      ? interpolarLogLog(curvaOrdenada, corriente)
      : interpolarTiempo(curvaOrdenada, corriente)

    nuevaCurva.push({
      corriente: toElectricalPrecision(parseFloat(corriente.toFixed(4))),
      tiempo: toElectricalPrecision(parseFloat(tiempo.toFixed(6))),
    })
  }

  return nuevaCurva
}

module.exports = {
  interpolarTiempo,
  interpolarLogLog,
  interpolarCorriente,
  densificarCurva,
}
