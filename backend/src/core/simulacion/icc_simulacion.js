/**
 * icc_simulacion.js - ICC Time-Based Simulation
 * 
 * Simula cómo evoluciona el cortocircuito en el tiempo:
 * - ICC inicial (subtransitorio): red + motores a pleno aporte
 * - Decaimiento por motores: I(t) = I0 * e^(-t/T)
 * - Componente de red: constante
 * 
 * Ecuación:
 * I_total(t) = I_red + Σ I_motor(t)
 * I_motor(t) = I0 * e^(-t/T)
 * 
 * Donde T = constante de tiempo subtransitoria (~0.05s)
 */

const iccCore = require('../calculo/icc');
const motoresCore = require('../calculo/motores');

/**
 * Simula ICC en el tiempo (0–200 ms típicamente)
 * @param {Object} params - Parámetros de simulación
 * @param {number} params.voltaje - Voltaje del sistema (V)
 * @param {number} params.resistencia - Resistencia de la red (Ω)
 * @param {number} params.reactancia - Reactancia de la red (Ω)
 * @param {string} params.tipo - Tipo de sistema ('monofasico'|'trifasico')
 * @param {Array} params.motores - Lista de motores { potencia_kw, voltaje }
 * @param {number} params.t_max - Tiempo máximo de simulación en segundos (default 0.2)
 * @param {number} params.pasos - Número de pasos de tiempo (default 50)
 * @param {number} params.T_motor - Constante de tiempo subtransitoria (default 0.05)
 * @param {number} params.factor_aporte - Factor de aporte inicial de motor (default 5)
 * @returns {Array} Array de { t, icc_total, icc_red, icc_motores }
 */
function simularICCEnTiempo({
  voltaje,
  resistencia,
  reactancia,
  tipo = 'trifasico',
  motores = [],
  t_max = 0.2,
  pasos = 50,
  T_motor = 0.05,
  factor_aporte = 5
}) {
  // Validaciones
  if (!voltaje || voltaje <= 0) {
    throw new Error('Voltaje debe ser mayor a 0');
  }
  
  if (pasos < 2) {
    throw new Error('Se requieren al menos 2 pasos de tiempo');
  }

  const resultados = [];

  // ICC base de la red (constante en el tiempo)
  const red = iccCore.calcularICC({
    voltaje,
    resistencia,
    reactancia,
    tipo
  });

  const dt = t_max / pasos;

  // Simulación paso a paso
  for (let i = 0; i <= pasos; i++) {
    const t = i * dt;

    // Aporte de motores en este instante (con decaimiento exponencial)
    const motoresRes = motoresCore.aporteMotoresTotal({
      motores,
      t,
      factor_aporte,
      constante_tiempo: T_motor
    });

    const icc_total = red.icc + motoresRes.total_aporte;

    resultados.push({
      t: parseFloat(t.toFixed(4)),
      icc_total: parseFloat(icc_total.toFixed(2)),
      icc_red: parseFloat(red.icc.toFixed(2)),
      icc_motores: parseFloat(motoresRes.total_aporte.toFixed(2)),
      icc_total_ka: parseFloat((icc_total / 1000).toFixed(3)),
      icc_red_ka: parseFloat((red.icc / 1000).toFixed(3)),
      icc_motores_ka: parseFloat((motoresRes.total_aporte / 1000).toFixed(3))
    });
  }

  // Calcular métricas de la simulación
  const iccInicial = resultados[0].icc_total;
  const iccFinal = resultados[resultados.length - 1].icc_total;
  const decaimiento = ((iccInicial - iccFinal) / iccInicial * 100).toFixed(1);

  return {
    curva: resultados,
    metricas: {
      icc_inicial: iccInicial,
      icc_final: iccFinal,
      decaimiento_porcentaje: parseFloat(decaimiento),
      t_max,
      pasos,
      contribucion_motores_inicial: resultados[0].icc_motores,
      contribucion_motores_final: resultados[resultados.length - 1].icc_motores
    },
    parametros: {
      voltaje,
      tipo,
      cantidad_motores: motores.length,
      T_motor,
      factor_aporte
    }
  };
}

/**
 * Simula múltiples escenarios de motor
 * @param {Object} params - Parámetros base
 * @param {Array} params.escenarios - Lista de configuraciones de motores
 * @returns {Array} Resultados por escenario
 */
function simularEscenarios(params) {
  const { escenarios = [], ...baseParams } = params;
  
  const resultados = [];
  
  for (let i = 0; i < escenarios.length; i++) {
    const escenario = escenarios[i];
    
    const simulacion = simularICCEnTiempo({
      ...baseParams,
      motores: escenario.motores || [],
      T_motor: escenario.T_motor || baseParams.T_motor
    });
    
    resultados.push({
      id: escenario.id || `escenario_${i + 1}`,
      nombre: escenario.nombre || `Escenario ${i + 1}`,
      ...simulacion
    });
  }
  
  return resultados;
}

/**
 * Encuentra el tiempo crítico donde ocurre la máxima corriente
 * @param {Array} curva - Resultados de simulación
 * @returns {Object} { t, icc_max }
 */
function encontrarMaximo(curva) {
  let max = { t: 0, icc: 0 };
  
  for (const punto of curva) {
    if (punto.icc_total > max.icc) {
      max = { t: punto.t, icc: punto.icc_total };
    }
  }
  
  return max;
}

/**
 * Compara simulación con capacidad de breaker
 * @param {Object} simulacion - Resultado de simulación
 * @param {number} capacidadBreaker - Capacidad interruptiva en A
 * @returns {Object} Análisis de adecuación
 */
function verificarCapacidad(simulacion, capacidadBreaker) {
  const maxICC = simulacion.metricas.icc_inicial;
  const margen = ((capacidadBreaker - maxICC) / maxICC * 100).toFixed(1);
  
  return {
    capacidad_breaker: capacidadBreaker,
    icc_maxima: maxICC,
    margen_porcentaje: parseFloat(margen),
    adecuado: maxICC <= capacidadBreaker,
    mensaje: maxICC <= capacidadBreaker 
      ? 'Capacidad adecuada' 
      : `Capacidad insuficiente por ${(maxICC - capacidadBreaker).toFixed(0)} A`
  };
}

module.exports = {
  simularICCEnTiempo,
  simularEscenarios,
  encontrarMaximo,
  verificarCapacidad
};
