/**
 * simulacion.service.js - Simulation Service
 * Servicio para simulación de ICC en el tiempo
 */

const simCore = require('../core/simulacion/icc_simulacion');
const graficasGenerador = require('../core/graficas/generador');

/**
 * Simula ICC en el tiempo
 * @param {Object} data - Datos de simulación
 * @returns {Object} Resultado de simulación con curva completa
 */
exports.simularICC = async (data) => {
  const resultado = simCore.simularICCEnTiempo(data);
  
  return resultado;
};

/**
 * Simula ICC y genera gráfica
 * @param {Object} data - Datos de simulación
 * @param {boolean} data.generarGrafica - Si se debe generar gráfica
 * @returns {Object} Resultado con gráfica opcional
 */
exports.simularICCConGrafica = async (data) => {
  const { generarGrafica = false, ...simData } = data;
  
  // Ejecutar simulación
  const resultado = simCore.simularICCEnTiempo(simData);
  
  // Generar gráfica si se solicita
  let graficaBuffer = null;
  if (generarGrafica) {
    try {
      // Preparar datos para gráfica ICC vs tiempo
      const datosGrafica = resultado.curva.map(p => ({
        tiempo: p.t * 1000, // Convertir a ms para visualización
        icc: p.icc_total_ka // En kA
      }));
      
      graficaBuffer = await graficasGenerador.generarGraficaICCTiempo(datosGrafica);
    } catch (err) {
      console.warn('Error generando gráfica:', err.message);
    }
  }
  
  return {
    ...resultado,
    grafica: graficaBuffer
  };
};

/**
 * Simula múltiples escenarios
 * @param {Object} data - Datos con array de escenarios
 * @returns {Array} Resultados por escenario
 */
exports.simularEscenarios = async (data) => {
  return simCore.simularEscenarios(data);
};

/**
 * Verifica capacidad de breaker contra simulación
 * @param {Object} data - Datos de simulación y capacidad
 * @returns {Object} Análisis de capacidad
 */
exports.verificarCapacidad = async (data) => {
  const { capacidadBreaker, ...simData } = data;
  
  const simulacion = simCore.simularICCEnTiempo(simData);
  
  const verificacion = simCore.verificarCapacidad(
    simulacion, 
    capacidadBreaker
  );
  
  return {
    simulacion,
    verificacion
  };
};
