/**
 * sqd_real.service.js - Real SQD Curves Service
 * 
 * Servicio para evaluar coordinación usando curvas reales
 * digitalizadas desde PDFs de fabricante.
 */

const sqdReal = require('../core/protecciones/sqd_real');
const { interpolarLogLog } = require('../core/protecciones/interpolacion');
const graficasGenerador = require('../core/graficas/generador');

/**
 * Evalúa coordinación entre dos breakers usando curvas reales
 * @param {Object} data - Datos de coordinación
 * @param {string} data.curvaDownstream - Nombre de curva downstream
 * @param {string} data.curvaUpstream - Nombre de curva upstream
 * @param {number} data.margen - Margen de tiempo requerido (default 0.2)
 * @returns {Object} Resultado de coordinación
 */
exports.evaluarCoordinacionReal = async (data) => {
  const { curvaDownstream, curvaUpstream, margen = 0.2 } = data;

  // Cargar curvas
  const curvaDown = sqdReal.obtenerCurva(curvaDownstream);
  const curvaUp = sqdReal.obtenerCurva(curvaUpstream);

  if (!curvaDown) {
    throw new Error(`Curva downstream '${curvaDownstream}' no encontrada`);
  }

  if (!curvaUp) {
    throw new Error(`Curva upstream '${curvaUpstream}' no encontrada`);
  }

  // Analizar coordinación en puntos de la curva downstream
  const problemas = [];
  const puntosAnalizados = [];

  for (const punto of curvaDown) {
    const I = punto.corriente;
    const t_down = punto.tiempo;

    // Interpolar tiempo en curva upstream
    const t_up = interpolarLogLog(curvaUp, I);

    if (!isFinite(t_up)) continue;

    const margenReal = t_up - t_down;

    puntosAnalizados.push({
      corriente: I,
      t_down,
      t_up,
      margen: parseFloat(margenReal.toFixed(4))
    });

    if (margenReal < margen) {
      problemas.push({
        corriente: I,
        t_down: parseFloat(t_down.toFixed(4)),
        t_up: parseFloat(t_up.toFixed(4)),
        margenReal: parseFloat(margenReal.toFixed(4)),
        margenRequerido: margen,
        deficit: parseFloat((margen - margenReal).toFixed(4))
      });
    }
  }

  // Encontrar punto crítico (mínimo margen)
  let puntoCritico = null;
  let minMargen = Infinity;

  for (const p of puntosAnalizados) {
    if (p.margen < minMargen) {
      minMargen = p.margen;
      puntoCritico = p;
    }
  }

  // Generar gráfica comparativa
  let graficaBuffer = null;
  try {
    graficaBuffer = await graficasGenerador.generarGraficaTCC([
      { nombre: curvaDownstream, puntos: curvaDown, color: '#2563eb' },
      { nombre: curvaUpstream, puntos: curvaUp, color: '#dc2626' }
    ]);
  } catch (err) {
    console.warn('Error generando gráfica:', err.message);
  }

  return {
    coordinado: problemas.length === 0,
    margenRequerido: margen,
    margenMinimo: puntoCritico ? parseFloat(minMargen.toFixed(4)) : null,
    puntoCritico,
    totalPuntosAnalizados: puntosAnalizados.length,
    problemas: problemas.slice(0, 10), // Limitar a 10 problemas principales
    curvas: {
      downstream: curvaDownstream,
      upstream: curvaUpstream
    },
    grafica: graficaBuffer
  };
};

/**
 * Calcula tiempo de disparo para una curva real
 * @param {string} nombreCurva - Nombre de la curva
 * @param {number} corriente - Corriente en A
 * @returns {number} Tiempo de disparo en segundos
 */
exports.tiempoDisparo = async (nombreCurva, corriente) => {
  return sqdReal.tiempoDisparoReal(nombreCurva, corriente);
};

/**
 * Lista todas las curvas reales disponibles
 * @returns {Array} Lista de nombres
 */
exports.listarCurvas = async () => {
  return sqdReal.listarCurvas();
};

/**
 * Obtiene una curva completa
 * @param {string} nombreCurva - Nombre de la curva
 * @returns {Array} Array de { corriente, tiempo }
 */
exports.obtenerCurva = async (nombreCurva) => {
  return sqdReal.obtenerCurva(nombreCurva);
};

/**
 * Compara múltiples curvas reales (para análisis de cascada)
 * @param {Array} nombresCurvas - Array de nombres de curvas [downstream, ..., upstream]
 * @param {number} margen - Margen requerido
 * @returns {Object} Análisis de coordinación en cascada
 */
exports.analizarCascadaReal = async (nombresCurvas, margen = 0.2) => {
  if (nombresCurvas.length < 2) {
    throw new Error('Se requieren al menos 2 curvas para análisis en cascada');
  }

  const resultados = [];

  // Analizar cada par consecutivo
  for (let i = 0; i < nombresCurvas.length - 1; i++) {
    const resultado = await exports.evaluarCoordinacionReal({
      curvaDownstream: nombresCurvas[i],
      curvaUpstream: nombresCurvas[i + 1],
      margen
    });

    resultados.push({
      par: `${nombresCurvas[i]} → ${nombresCurvas[i + 1]}`,
      ...resultado
    });
  }

  // Verificar si toda la cascada está coordinada
  const todosCoordinados = resultados.every(r => r.coordinado);

  return {
    coordinado: todosCoordinados,
    totalNiveles: nombresCurvas.length,
    paresAnalizados: resultados.length,
    resultados,
    margenRequerido: margen
  };
};
