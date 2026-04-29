const { toElectricalPrecision, formatElectricalValue } = require('@/core')');
/**
 * auto_ajuste.js - Automatic Protection Adjustment Engine
 * Ajusta TMS automáticamente para lograr coordinación entre protecciones
 *
 * Motor inteligente tipo "ingeniero automático"
 */

const tcc = require('./tcc')
const coordMulti = require('./coordinacion_multi')

/**
 * Ajusta TMS automáticamente para lograr coordinación
 * @param {Array} protecciones - Array de protecciones con curvas
 * @param {Object} opciones - Opciones de ajuste
 * @param {number} opciones.margen - Margen objetivo (default 0.2)
 * @param {number} opciones.incremento - Incremento de TMS por iteración (default 0.05)
 * @param {number} opciones.maxIntentos - Máximo de iteraciones (default 20)
 * @param {number} opciones.tmsMaximo - TMS máximo permitido (default 1.0)
 * @returns {Object} Resultado del ajuste
 */
function autoAjustarTMS(protecciones, opciones = {}) {
  const {
    margen = 0.2,
    incremento = 0.05,
    maxIntentos = 20,
    tmsMaximo = 1.0,
  } = opciones

  if (!Array.isArray(protecciones) || protecciones.length < 2) {
    throw new Error('Se requieren al menos 2 protecciones para auto-ajuste')
  }

  // Crear copia para no modificar originales
  const proteccionesAjustadas = protecciones.map(p => ({
    ...p,
    tmsOriginal: p.tms,
    ajustesRealizados: 0,
  }))

  let intento = 0
  const historial = []

  while (intento < maxIntentos) {
    // Evaluar coordinación actual
    const evaluacion = coordMulti.evaluarCoordinacionMulti({
      protecciones: proteccionesAjustadas,
      margen,
    })

    historial.push({
      intento: intento + 1,
      coordinado: evaluacion.coordinado,
      problemasCount: evaluacion.problemas.length,
    })

    if (evaluacion.coordinado) {
      return {
        exito: true,
        protecciones: proteccionesAjustadas,
        iteraciones: intento + 1,
        historial,
        mensaje: `Coordinación lograda en ${intento + 1} iteraciones`,
      }
    }

    // Ajustar upstream (hacer más lento) para cada problema
    let ajustesEnEstaIteracion = 0

    for (const problema of evaluacion.problemas) {
      const protUpIndex = proteccionesAjustadas.findIndex(
        p => p.nombre === problema.nivel_up
      )

      if (protUpIndex === -1) continue

      const protUp = proteccionesAjustadas[protUpIndex]

      // Verificar que no exceda TMS máximo
      if (protUp.tms + incremento > tmsMaximo) {
        continue // No se puede ajustar más
      }

      // Incrementar TMS del upstream
      protUp.tms += incremento
      protUp.ajustesRealizados++
      ajustesEnEstaIteracion++

      // Regenerar curva con nuevo TMS
      protUp.curva = tcc.generarCurva({
        pickup: protUp.pickup,
        tms: protUp.tms,
        tipo: protUp.tipo,
        I_min: protUp.I_min,
        I_max: protUp.I_max,
        puntos: protUp.puntos || 50,
      })
    }

    // Si no se pudo hacer ajustes, terminamos
    if (ajustesEnEstaIteracion === 0) {
      return {
        exito: false,
        protecciones: proteccionesAjustadas,
        iteraciones: intento + 1,
        historial,
        mensaje: 'No se pudo coordinar: TMS máximo alcanzado en protecciones',
        problemasPendientes: evaluacion.problemas,
      }
    }

    intento++
  }

  // No se logró coordinación en el máximo de intentos
  const evaluacionFinal = coordMulti.evaluarCoordinacionMulti({
    protecciones: proteccionesAjustadas,
    margen,
  })

  return {
    exito: false,
    protecciones: proteccionesAjustadas,
    iteraciones: maxIntentos,
    historial,
    mensaje: `No se pudo coordinar automáticamente en ${maxIntentos} iteraciones`,
    problemasPendientes: evaluacionFinal.problemas,
  }
}

/**
 * Calcula ajustes recomendados sin aplicarlos
 * @param {Array} protecciones - Array de protecciones
 * @param {number} margen - Margen objetivo
 * @returns {Object} Recomendaciones de ajuste
 */
function calcularAjustesRecomendados(protecciones, margen = 0.2) {
  const recomendaciones = []

  const evaluacion = coordMulti.evaluarCoordinacionMulti({
    protecciones,
    margen,
  })

  if (evaluacion.coordinado) {
    return {
      coordinado: true,
      mensaje: 'Sistema ya está coordinado',
      recomendaciones: [],
    }
  }

  // Agrupar problemas por par de niveles
  const problemasPorPar = {}

  for (const problema of evaluacion.problemas) {
    const key = `${problema.nivel_down}→${problema.nivel_up}`
    if (!problemasPorPar[key]) {
      problemasPorPar[key] = {
        par: key,
        nivel_up: problema.nivel_up,
        problemas: [],
        peorMargen: Infinity,
      }
    }
    problemasPorPar[key].problemas.push(problema)
    if (problema.margen_real < problemasPorPar[key].peorMargen) {
      problemasPorPar[key].peorMargen = problema.margen_real
    }
  }

  // Generar recomendaciones
  for (const key in problemasPorPar) {
    const grupo = problemasPorPar[key]
    const ajusteSugerido =
      Math.ceil((margen - grupo.peorMargen + 0.05) / 0.05) * 0.05 // Redondear a múltiplo de 0.05

    recomendaciones.push({
      par: grupo.par,
      nivel_up: grupo.nivel_up,
      peorMargen: toElectricalPrecision(parseFloat(grupo.peorMargen.toFixed(4))),
      margenObjetivo: margen,
      ajusteSugerido: toElectricalPrecision(parseFloat(ajusteSugerido.toFixed(2))),
      problemasCount: grupo.problemas.length,
    })
  }

  return {
    coordinado: false,
    mensaje: `Se encontraron ${recomendaciones.length} pares que requieren ajuste`,
    recomendaciones: recomendaciones.sort(
      (a, b) => a.peorMargen - b.peorMargen
    ),
  }
}

/**
 * Restaura TMS originales
 * @param {Array} protecciones - Protecciones ajustadas
 * @returns {Array} Protecciones con TMS original
 */
function restaurarTMS(protecciones) {
  return protecciones.map(p => ({
    ...p,
    tms: p.tmsOriginal || p.tms,
    curva: tcc.generarCurva({
      pickup: p.pickup,
      tms: p.tmsOriginal || p.tms,
      tipo: p.tipo,
      I_min: p.I_min,
      I_max: p.I_max,
      puntos: p.puntos || 50,
    }),
  }))
}

module.exports = {
  autoAjustarTMS,
  calcularAjustesRecomendados,
  restaurarTMS,
}
