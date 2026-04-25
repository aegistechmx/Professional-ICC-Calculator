/**
 * coordinacion.js - Protection Coordination Analysis
 * Evalúa la coordinación entre dispositivos de protección
 * 
 * Objetivo: selectividad → solo dispara el más cercano a la falla
 */

/**
 * Verifica coordinación entre dos dispositivos
 * @param {Object} params - Parámetros de coordinación
 * @param {Array} params.curva1 - Curva del dispositivo aguas abajo (más cercano a falla)
 * @param {Array} params.curva2 - Curva del dispositivo aguas arriba (más lejano a falla)
 * @param {number} params.margen - Margen de tiempo mínimo en segundos (default 0.2)
 * @param {number} params.toleranciaCorriente - Tolerancia para comparar corrientes (default 1 A)
 * @returns {Object} { coordinado: boolean, problemas: Array, margenAplicado: number }
 */
function evaluarCoordinacion({
  curva1,
  curva2,
  margen = 0.2,
  toleranciaCorriente = 1
}) {
  if (!Array.isArray(curva1) || curva1.length === 0) {
    throw new Error('curva1 debe ser un array no vacío');
  }
  
  if (!Array.isArray(curva2) || curva2.length === 0) {
    throw new Error('curva2 debe ser un array no vacío');
  }

  const problemas = [];

  for (let i = 0; i < curva1.length; i++) {
    const p1 = curva1[i];
    
    // Buscar punto en curva2 con corriente similar
    const p2 = curva2.find(p => Math.abs(p.corriente - p1.corriente) < toleranciaCorriente);

    if (!p2) continue;

    // Verificar margen de tiempo
    const diferenciaTiempo = p2.tiempo - p1.tiempo;
    
    if (diferenciaTiempo < margen) {
      problemas.push({
        corriente: p1.corriente,
        t_downstream: p1.tiempo,
        t_upstream: p2.tiempo,
        margenActual: diferenciaTiempo,
        margenRequerido: margen,
        violacion: margen - diferenciaTiempo
      });
    }
  }

  return {
    coordinado: problemas.length === 0,
    problemas,
    margenAplicado: margen,
    totalPuntosAnalizados: curva1.length
  };
}

/**
 * Evalúa coordinación entre múltiples dispositivos en cascada
 * @param {Object} params - Parámetros de coordinación en cascada
 * @param {Array} params.curvas - Array de curvas ordenadas de aguas abajo a aguas arriba
 * @param {number} params.margen - Margen de tiempo mínimo en segundos (default 0.2)
 * @returns {Object} { coordinado: boolean, resultados: Array, resumen: Object }
 */
function evaluarCoordinacionCascada({
  curvas,
  margen = 0.2
}) {
  if (!Array.isArray(curvas) || curvas.length < 2) {
    throw new Error('Se requieren al menos 2 curvas para coordinación en cascada');
  }

  const resultados = [];
  const totalProblemas = [];

  // Evaluar cada par consecutivo (downstream vs upstream)
  for (let i = 0; i < curvas.length - 1; i++) {
    const resultado = evaluarCoordinacion({
      curva1: curvas[i], // aguas abajo
      curva2: curvas[i + 1], // aguas arriba
      margen
    });

    resultados.push({
      par: `${i + 1} -> ${i + 2}`,
      curvaDownstream: i + 1,
      curvaUpstream: i + 2,
      ...resultado
    });

    if (!resultado.coordinado) {
      totalProblemas.push(...resultado.problemas);
    }
  }

  // Resumen
  const paresAnalizados = curvas.length - 1;
  const paresCoordinados = resultados.filter(r => r.coordinado).length;
  const paresNoCoordinados = paresAnalizados - paresCoordinados;

  return {
    coordinado: totalProblemas.length === 0,
    resultados,
    resumen: {
      totalDispositivos: curvas.length,
      paresAnalizados,
      paresCoordinados,
      paresNoCoordinados,
      totalProblemas: totalProblemas.length
    }
  };
}

/**
 * Calcula el punto de cruce entre dos curvas
 * @param {Object} params - Parámetros de cálculo
 * @param {Array} params.curva1 - Primera curva
 * @param {Array} params.curva2 - Segunda curva
 * @returns {Object|null} { corriente, tiempo1, tiempo2 } o null si no hay cruce
 */
function encontrarCruce({
  curva1,
  curva2
}) {
  for (let i = 0; i < curva1.length; i++) {
    const p1 = curva1[i];
    const p2 = curva2.find(p => Math.abs(p.corriente - p1.corriente) < 1);

    if (p2) {
      // Verificar si hay cruce (tiempos muy cercanos)
      const diferenciaTiempo = Math.abs(p1.tiempo - p2.tiempo);
      
      if (diferenciaTiempo < 0.01) {
        return {
          corriente: p1.corriente,
          tiempo: (p1.tiempo + p2.tiempo) / 2
        };
      }
    }
  }

  return null;
}

/**
 * Genera reporte de coordinación
 * @param {Object} resultadoCoordinacion - Resultado de evaluarCoordinacion
 * @returns {Object} Reporte formateado
 */
function generarReporteCoordinacion(resultadoCoordinacion) {
  const { coordinado, problemas, margenAplicado, totalPuntosAnalizados } = resultadoCoordinacion;

  return {
    estado: coordinado ? 'COORDINADO' : 'NO COORDINADO',
    margenTiempo: margenAplicado,
    puntosAnalizados: totalPuntosAnalizados,
    problemas: problemas.length,
    detalleProblemas: problemas.map(p => ({
      corriente: p.corriente.toFixed(2) + ' A',
      tiempoDownstream: p.t_downstream.toFixed(3) + ' s',
      tiempoUpstream: p.t_upstream.toFixed(3) + ' s',
      margenActual: p.margenActual.toFixed(3) + ' s',
      violacion: p.violacion.toFixed(3) + ' s'
    }))
  };
}

module.exports = {
  evaluarCoordinacion,
  evaluarCoordinacionCascada,
  encontrarCruce,
  generarReporteCoordinacion
};
