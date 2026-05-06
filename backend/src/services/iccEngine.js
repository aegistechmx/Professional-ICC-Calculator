const { toElectricalPrecision, formatElectricalValue } = require('../../utils/electricalUtils');
/**
 * services/iccEngine.js - Engine con modos FAST vs FULL
 * Wrapper limpio que orquesta los cálculos
 */

const { initMotores } = require('../core/adapters/motorAdapter');
const { log, error } = require('../utils/logger');

// Inicializar motor una sola vez
const motor = initMotores();

/**
 * Calcula sistema según modo (FAST vs FULL)
 * @param {Object} input - Datos de entrada
 * @param {Object} options - Opciones de cálculo
 * @returns {Object} Resultado del cálculo
 */
function calcularSistema(input, options = {}) {
  const startTime = Date.now();
  const mode = options.mode || 'fast';

  log(`Iniciando cálculo en modo: ${mode}`);

  try {
    let result;

    if (mode === 'fast') {
      result = calcularRapido(input);
    } else if (mode === 'full') {
      result = motor.ejecutar(input);
    } else {
      throw new Error('Modo inválido. Use "fast" o "full"');
    }

    const duration = Date.now() - startTime;
    log(`Cálculo completado en ${duration}ms`);

    return {
      ...result,
      metadata: {
        mode,
        duration,
        timestamp: new Date().toISOString()
      }
    };

  } catch (err) {
    error(`Error en cálculo modo ${mode}:`, err.message);
    throw err;
  }
}

/**
 * Modo rápido - API responsiva
 * @param {Object} input - Datos básicos
 * @returns {Object} Resultado rápido
 */
function calcularRapido({ voltage, impedance, I_carga }) {
  log('Ejecutando cálculo rápido');

  if (voltage && impedance) {
    // Cálculo ICC básico con IEEE precision
    const Icc = toElectricalPrecision(parseFloat((voltage / (Math.sqrt(3)) * impedance)).toFixed(6)); // voltage (V)

    return {
      Icc: toElectricalPrecision(parseFloat(Icc.toFixed(6))),
      metodo: 'basico',
      tipo: 'icc',
      precision: 'IEEE_1584',
      formula: 'Isc = V / (sqrt(3) * Z)',
      voltage,
      impedance
    };
  }

  if (I_carga) {
    // Estimación básica de diseño
    return {
      I_diseño: I_carga * 1.25,
      I_carga,
      metodo: 'estimado',
      tipo: 'diseño',
      factor: 1.25,
      estandar: 'NOM-001-SEDE-2012'
    };
  }

  throw new Error('Datos insuficientes. Se requiere I_carga o (voltage + impedance)');
}

/**
 * Calcula ampacidad NOM (modo específico)
 * @param {Object} input - Datos de ampacidad
 * @returns {Object} Resultado de ampacidad
 */
function calcularAmpacidad(input) {
  log('Ejecutando cálculo de ampacidad NOM');

  try {
    const result = motor.ejecutarAmpacidad(input);

    return {
      ...result,
      metadata: {
        tipo: 'ampacidad',
        estandar: 'NOM-001-SEDE-2012',
        timestamp: new Date().toISOString()
      }
    };

  } catch (err) {
    error('Error en cálculo de ampacidad:', err.message);
    throw err;
  }
}

/**
 * Health check del engine
 */
function healthCheck() {
  try {
    const adapterInfo = motor.getInfo();

    return {
      status: 'healthy',
      engine: 'iccEngine',
      version: '1.0.0',
      adapter: adapterInfo,
      modes: ['fast', 'full'],
      capabilities: ['icc', 'ampacidad', 'sistema_completo'],
      timestamp: new Date().toISOString()
    };

  } catch (err) {
    error('Error en health check:', err.message);
    return {
      status: 'unhealthy',
      error: err.message,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  calcularSistema,
  calcularAmpacidad,
  healthCheck,
  // Exportar para testing
  _calcularRapido: calcularRapido
};
