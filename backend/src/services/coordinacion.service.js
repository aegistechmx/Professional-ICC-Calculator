/**
 * coordinacion.service.js - Coordination Analysis Service
 * Servicio para análisis de coordinación de tableros completos
 */

const coordMulti = require('../core/protecciones/coordinacion_multi');
const auto = require('../core/protecciones/auto_ajuste');
const graficasGenerador = require('../core/graficas/generador');

/**
 * Analiza coordinación de un tablero completo con auto-ajuste
 * @param {Object} data - Datos del análisis
 * @param {Array} data.protecciones - Array de protecciones con curvas
 * @param {number} data.margen - Margen de coordinación (default 0.2)
 * @param {boolean} data.intentarAjuste - Intentar auto-ajuste si no está coordinado
 * @returns {Object} Resultado del análisis
 */
exports.analizarTablero = async (data) => {
  const { protecciones, margen = 0.2, intentarAjuste = true } = data;

  // 1. Evaluar coordinación inicial
  const evaluacion = coordMulti.evaluarCoordinacionMulti({
    protecciones,
    margen
  });

  // 2. Generar resumen de coordinación
  const resumen = coordMulti.generarResumenCoordinacion(protecciones, margen);

  // 3. Generar gráfica de coordinación si hay curvas
  let graficaBuffer = null;
  try {
    const curvas = protecciones.map(p => ({
      nombre: p.nombre,
      puntos: p.curva
    }));
    graficaBuffer = await graficasGenerador.generarGraficaTCC(curvas);
  } catch (err) {
    console.warn('No se pudo generar gráfica de coordinación:', err.message);
  }

  // Si ya está coordinado, retornar éxito
  if (evaluacion.coordinado) {
    return {
      estado: 'coordinado',
      coordinado: true,
      margenAplicado: margen,
      evaluacion,
      resumen,
      grafica: graficaBuffer,
      mensaje: 'Sistema coordinado correctamente'
    };
  }

  // 4. Intentar auto-ajuste si está habilitado
  if (intentarAjuste) {
    const ajuste = auto.autoAjustarTMS(protecciones, {
      margen,
      incremento: 0.05,
      maxIntentos: 20
    });

    // Re-evaluar después del ajuste
    const evaluacionPostAjuste = coordMulti.evaluarCoordinacionMulti({
      protecciones: ajuste.protecciones,
      margen
    });

    // Generar nueva gráfica con curvas ajustadas
    let graficaAjustadaBuffer = null;
    try {
      const curvasAjustadas = ajuste.protecciones.map(p => ({
        nombre: p.nombre + (p.ajustesRealizados > 0 ? ' (ajustado)' : ''),
        puntos: p.curva
      }));
      graficaAjustadaBuffer = await graficasGenerador.generarGraficaTCC(curvasAjustadas);
    } catch (err) {
      console.warn('No se pudo generar gráfica ajustada:', err.message);
    }

    if (ajuste.exito) {
      return {
        estado: 'ajustado',
        coordinado: true,
        margenAplicado: margen,
        evaluacion: evaluacionPostAjuste,
        ajusteRealizado: ajuste,
        resumen: coordMulti.generarResumenCoordinacion(ajuste.protecciones, margen),
        graficaOriginal: graficaBuffer,
        graficaAjustada: graficaAjustadaBuffer,
        mensaje: `Coordinación lograda mediante auto-ajuste en ${ajuste.iteraciones} iteraciones`
      };
    }

    // Auto-ajuste falló, retornar estado no coordinado con recomendaciones
    const recomendaciones = auto.calcularAjustesRecomendados(protecciones, margen);

    return {
      estado: 'no_coordinado',
      coordinado: false,
      margenAplicado: margen,
      evaluacion,
      resumen,
      intentoAjuste: ajuste,
      recomendaciones,
      grafica: graficaBuffer,
      mensaje: 'No se pudo lograr coordinación automáticamente. Se requiere intervención manual.'
    };
  }

  // Sin auto-ajuste, retornar evaluación original
  const recomendaciones = auto.calcularAjustesRecomendados(protecciones, margen);

  return {
    estado: 'no_coordinado',
    coordinado: false,
    margenAplicado: margen,
    evaluacion,
    resumen,
    recomendaciones,
    grafica: graficaBuffer,
    mensaje: 'Sistema no coordinado. Auto-ajuste deshabilitado.'
  };
};

/**
 * Solo evalúa coordinación sin intentar ajuste
 * @param {Object} data - Datos del análisis
 * @returns {Object} Evaluación de coordinación
 */
exports.evaluarSolo = async (data) => {
  const { protecciones, margen = 0.2 } = data;

  const evaluacion = coordMulti.evaluarCoordinacionMulti({
    protecciones,
    margen
  });

  const resumen = coordMulti.generarResumenCoordinacion(protecciones, margen);

  return {
    coordinado: evaluacion.coordinado,
    margenAplicado: margen,
    evaluacion,
    resumen,
    mensaje: evaluacion.coordinado 
      ? 'Sistema coordinado' 
      : `Se encontraron ${evaluacion.problemas.length} problemas de coordinación`
  };
};

/**
 * Aplica auto-ajuste a protecciones
 * @param {Object} data - Datos del ajuste
 * @returns {Object} Resultado del ajuste
 */
exports.aplicarAjuste = async (data) => {
  const { protecciones, margen = 0.2, opciones = {} } = data;

  const ajuste = auto.autoAjustarTMS(protecciones, {
    margen,
    ...opciones
  });

  // Re-evaluar
  const evaluacion = coordMulti.evaluarCoordinacionMulti({
    protecciones: ajuste.protecciones,
    margen
  });

  return {
    exito: ajuste.exito,
    ajuste,
    evaluacion,
    mensaje: ajuste.mensaje
  };
};
