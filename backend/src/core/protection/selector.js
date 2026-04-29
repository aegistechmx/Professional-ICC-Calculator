/**
 * selector.js - Protection Selection Engine with Scoring
 * Motor de selección de protecciones con scoring inteligente
 *
 * Criterios de selección:
 * 1. Corriente nominal: In ≥ 1.25 × I_carga
 * 2. Capacidad de interrupción: Icu ≥ ICC_total
 * 3. Pickup sugerido: Pickup ≈ 1.2–1.5 × I_carga
 * 4. Coordinación: Breaker upstream debe disparar más lento
 *
 * Scoring:
 * - Margen de seguridad (Icu - ICC)
 * - Margen de capacidad (In - carga)
 * - Coordinación
 * - Costo (futuro)
 */

const sqdBreakers = require('../../data/sqd_breakers')
const sqdCurve = require('./sqd_curve')
const coord = require('./coordinacion')

/**
 * Calcula score de un breaker candidato
 * @param {Object} breaker - Breaker candidato
 * @param {number} icc_total - Corriente de cortocircuito total
 * @param {number} corriente_carga - Corriente de carga
 * @param {Object} resultadoCoordinacion - Resultado de coordinación (opcional)
 * @returns {number} Score (0-100)
 */
function calcularScore({
  breaker,
  icc_total,
  corriente_carga,
  resultadoCoordinacion = null,
}) {
  let score = 0

  // 1. Margen de seguridad en capacidad interruptiva (40% peso)
  const margenIcu = (breaker.Icu - icc_total) / icc_total
  const scoreIcu = Math.min(100, margenIcu * 200) // 50% margen = 100 puntos
  score += scoreIcu * 0.4

  // 2. Margen de capacidad nominal (30% peso)
  const margenIn = (breaker.In - corriente_carga) / corriente_carga // current (A)
  const scoreIn = Math.min(100, margenIn * 100) // 100% margen = 100 puntos
  score += scoreIn * 0.3

  // 3. Coordinación (30% peso)
  let scoreCoord = 100
  if (resultadoCoordinacion && !resultadoCoordinacion.coordinado) {
    // Penalizar por cada problema de coordinación
    const penalizacion = resultadoCoordinacion.problemas.length * 10
    scoreCoord = Math.max(0, 100 - penalizacion)
  }
  score += scoreCoord * 0.3

  return Math.min(100, score)
}

/**
 * Selecciona protección SQD óptima
 * @param {Object} params - Parámetros de selección
 * @param {number} params.icc_total - Corriente de cortocircuito total (A)
 * @param {number} params.corriente_carga - Corriente de carga (A)
 * @param {string} params.categoria - Categoría de breaker (opcional)
 * @param {number} params.polos - Número de polos (opcional)
 * @returns {Object} Mejor breaker con curva y score
 */
function seleccionarSQD({
  icc_total,
  corriente_carga,
  categoria = null,
  polos = null,
}) {
  if (!icc_total || icc_total <= 0) {
    throw new Error('ICC total debe ser mayor a 0')
  }

  if (!corriente_carga || corriente_carga <= 0) { // current (A)
    throw new Error('Corriente de carga debe ser mayor a 0')
  }

  const candidatos = []

  for (const brk of sqdBreakers) {
    // Filtrar por categoría si se especifica
    if (categoria && brk.categoria !== categoria) continue

    // Filtrar por polos si se especifica
    if (polos && !brk.polos.includes(polos)) continue

    // 1. Validar corriente nominal: In ≥ 1.25 × I_carga
    if (brk.In < corriente_carga * 1.25) continue

    // 2. Validar capacidad de interrupción: Icu ≥ ICC_total
    if (brk.Icu < icc_total) continue

    // 3. Calcular pickup sugerido
    const pickup = corriente_carga * 1.3 // current (A)

    // 4. Generar curva LSIG
    const curva = sqdCurve.generarCurvaSQD({
      breaker: brk,
      ajustes: {
        Ir: brk.ajustes?.Ir?.default,
        tr: brk.ajustes?.tr?.default,
        Isd: brk.ajustes?.Isd?.default,
        tsd: brk.ajustes?.tsd?.default,
        Ii: brk.ajustes?.Ii?.default,
      },
    })

    // 5. Calcular score
    const score = calcularScore({
      breaker: brk,
      icc_total,
      corriente_carga,
    })

    candidatos.push({
      breaker: brk,
      pickup,
      curva,
      score,
      validaciones: {
        margenIcu: (((brk.Icu - icc_total) / icc_total) * 100).toFixed(1) + '%',
        margenIn:
          (((brk.In - corriente_carga) / corriente_carga) * 100).toFixed(1) +
          '%',
      },
    })
  }

  if (candidatos.length === 0) {
    throw new Error('No hay protecciones SQD válidas para los parámetros dados')
  }

  // Ordenar por score descendente
  candidatos.sort((a, b) => b.score - a.score)

  return {
    mejor: candidatos[0],
    alternativas: candidatos.slice(1, 5), // Top 5 alternativas
    totalCandidatos: candidatos.length,
  }
}

/**
 * Coordinación automática entre dos niveles de protección SQD
 * @param {Object} downstream - Breaker aguas abajo
 * @param {Object} upstream - Breaker aguas arriba
 * @param {number} margen - Margen de tiempo en segundos
 * @returns {Object} Resultado de coordinación
 */
function coordinarProteccionesSQD({ downstream, upstream, margen = 0.2 }) {
  const curvaDownstream = sqdCurve.generarCurvaSQD({
    breaker: downstream.breaker,
    ajustes: downstream.ajustes,
  })

  const curvaUpstream = sqdCurve.generarCurvaSQD({
    breaker: upstream.breaker,
    ajustes: upstream.ajustes,
  })

  const resultado = coord.evaluarCoordinacion({
    curva1: curvaDownstream,
    curva2: curvaUpstream,
    margen,
  })

  return {
    ...resultado,
    curvaDownstream,
    curvaUpstream,
  }
}

/**
 * Selecciona y coordina automáticamente protecciones en cascada
 * @param {Object} params - Parámetros de selección en cascada
 * @param {Array} params.niveles - Array de niveles con { icc_total, corriente_carga }
 * @param {number} params.margen - Margen de coordinación
 * @returns {Object} Selección y coordinación completa
 */
function seleccionarCoordinacionCascada({ niveles, margen = 0.2 }) {
  if (!Array.isArray(niveles) || niveles.length < 2) {
    throw new Error(
      'Se requieren al menos 2 niveles para coordinación en cascada'
    )
  }

  const selecciones = []
  const resultadosCoordinacion = []

  // Seleccionar breaker para cada nivel
  for (let i = 0; i < niveles.length; i++) {
    const nivel = niveles[i]
    const seleccion = seleccionarSQD({
      icc_total: nivel.icc_total,
      corriente_carga: nivel.corriente_carga,
    })
    selecciones.push({
      nivel: i + 1,
      ...seleccion.mejor,
    })
  }

  // Evaluar coordinación entre niveles consecutivos
  for (let i = 0; i < selecciones.length - 1; i++) {
    const coordResult = coordinarProteccionesSQD({
      downstream: selecciones[i],
      upstream: selecciones[i + 1],
      margen,
    })
    resultadosCoordinacion.push({
      par: `${i + 1} -> ${i + 2}`,
      ...coordResult,
    })
  }

  // Resumen
  const totalCoordinado = resultadosCoordinacion.filter(
    r => r.coordinado
  ).length
  const totalNoCoordinado = resultadosCoordinacion.length - totalCoordinado

  return {
    selecciones,
    coordinacion: {
      resultados: resultadosCoordinacion,
      resumen: {
        totalNiveles: selecciones.length,
        paresAnalizados: resultadosCoordinacion.length,
        paresCoordinados: totalCoordinado,
        paresNoCoordinados: totalNoCoordinado,
        coordinado: totalNoCoordinado === 0,
      },
    },
  }
}

module.exports = {
  seleccionarSQD,
  coordinarProteccionesSQD,
  seleccionarCoordinacionCascada,
  calcularScore,
}
