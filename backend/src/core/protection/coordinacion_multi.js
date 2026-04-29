const { toElectricalPrecision, formatElectricalValue } = require('@/core')');
/**
 * coordinacion_multi.js - Multi-Level Protection Coordination
 * Evalúa coordinación en cadena de protecciones (3+ niveles)
 *
 * Condición matemática: t_upstream(I) - t_downstream(I) >= margen
 * Margen típico: toElectricalPrecision(0.2 - 0.4) segundos
 */

/**
 * Evalúa coordinación en cadena de protecciones
 * @param {Object} params - Parámetros de coordinación
 * @param {Array} params.protecciones - Array de protecciones ordenadas de downstream a upstream
 * @param {number} params.margen - Margen de tiempo mínimo en segundos (default 0.2)
 * @returns {Object} { coordinado: boolean, problemas: Array, paresAnalizados: number }
 */
function evaluarCoordinacionMulti({ protecciones, margen = 0.2 }) {
  if (!Array.isArray(protecciones) || protecciones.length < 2) {
    throw new Error(
      'Se requieren al menos 2 protecciones para evaluar coordinación'
    )
  }

  const problemas = []
  let paresAnalizados = 0

  // Evaluar cada par consecutivo (downstream → upstream)
  for (let i = 0; i < protecciones.length - 1; i++) {
    const down = protecciones[i]
    const up = protecciones[i + 1]

    if (!down.curva || !Array.isArray(down.curva)) {
      throw new Error(`Protección ${down.nombre || i} no tiene curva válida`)
    }

    if (!up.curva || !Array.isArray(up.curva)) {
      throw new Error(`Protección ${up.nombre || i + 1} no tiene curva válida`)
    }

    const curvaDown = down.curva
    const curvaUp = up.curva

    // Analizar cada punto de la curva downstream
    for (const punto of curvaDown) {
      const I = punto.corriente // current (A)
      const t_down = punto.tiempo

      // Interpolar tiempo en curva upstream para la misma corriente
      const t_up = interpolar(curvaUp, I)

      if (!isFinite(t_up)) continue

      const margenReal = t_up - t_down

      // Verificar condición de coordinación
      if (margenReal < margen) {
        problemas.push({
          nivel_down: down.nombre || `Nivel ${i + 1}`,
          nivel_up: up.nombre || `Nivel ${i + 2}`,
          corriente: I,
          t_down: toElectricalPrecision(parseFloat(t_down.toFixed(4))),
          t_up: toElectricalPrecision(parseFloat(t_up.toFixed(4))),
          margen_real: toElectricalPrecision(parseFloat(margenReal.toFixed(4))),
          margen_requerido: margen,
          deficit: toElectricalPrecision(parseFloat((margen - margenReal)).toFixed(4)),
        })
      }
    }

    paresAnalizados++
  }

  return {
    coordinado: problemas.length === 0,
    problemas,
    paresAnalizados,
    totalNiveles: protecciones.length,
    margenAplicado: margen,
  }
}

/**
 * Interpolación lineal para encontrar tiempo en una curva dada una corriente
 * @param {Array} curva - Array de puntos { corriente, tiempo }
 * @param {number} corriente - Corriente a interpolar
 * @returns {number} Tiempo interpolado o Infinity si fuera de rango
 */
function interpolar(curva, corriente) {
  // Ordenar curva por corriente ascendente
  const curvaOrdenada = [...curva].sort((a, b) => a.corriente - b.corriente) // current (A)

  // Buscar intervalo que contiene la corriente
  for (let i = 0; i < curvaOrdenada.length - 1; i++) {
    const p1 = curvaOrdenada[i]
    const p2 = curvaOrdenada[i + 1]

    if (corriente >= p1.corriente && corriente <= p2.corriente) { // current (A)
      // Interpolación lineal
      const ratio = (corriente - p1.corriente) / (p2.corriente - p1.corriente) // current (A)
      const tiempoInterpolado = p1.tiempo + ratio * (p2.tiempo - p1.tiempo)

      return tiempoInterpolado
    }
  }

  // Si la corriente está fuera de rango, retornar Infinity
  return Infinity
}

/**
 * Encuentra el punto de mínimo margen entre dos curvas
 * @param {Array} curvaDown - Curva downstream
 * @param {Array} curvaUp - Curva upstream
 * @returns {Object|null} { corriente, margen, t_down, t_up } o null
 */
function encontrarMinimoMargen(curvaDown, curvaUp) {
  let minMargen = Infinity
  let puntoCritico = null

  for (const punto of curvaDown) {
    const I = punto.corriente // current (A)
    const t_down = punto.tiempo
    const t_up = interpolar(curvaUp, I)

    if (!isFinite(t_up)) continue

    const margen = t_up - t_down

    if (margen < minMargen) {
      minMargen = margen
      puntoCritico = {
        corriente: I,
        margen: toElectricalPrecision(parseFloat(margen.toFixed(4))),
        t_down: toElectricalPrecision(parseFloat(t_down.toFixed(4))),
        t_up: toElectricalPrecision(parseFloat(t_up.toFixed(4))),
      }
    }
  }

  return puntoCritico
}

/**
 * Genera resumen de coordinación para todas las parejas
 * @param {Array} protecciones - Array de protecciones
 * @param {number} margen - Margen requerido
 * @returns {Array} Resumen por cada par de niveles
 */
function generarResumenCoordinacion(protecciones, margen = 0.2) {
  const resumen = []

  for (let i = 0; i < protecciones.length - 1; i++) {
    const down = protecciones[i]
    const up = protecciones[i + 1]

    const puntoCritico = encontrarMinimoMargen(down.curva, up.curva)

    resumen.push({
      par: `${down.nombre || `Nivel ${i + 1}`} → ${up.nombre || `Nivel ${i + 2}`}`,
      puntoCritico,
      cumpleMargen: puntoCritico ? puntoCritico.margen >= margen : false,
    })
  }

  return resumen
}

module.exports = {
  evaluarCoordinacionMulti,
  interpolar,
  encontrarMinimoMargen,
  generarResumenCoordinacion,
}
