/**
 * core/adapters/motorAdapter.js - Motor Adapter Limpio
 * Elimina globals peligrosos con inyección controlada
 */

const MotorElectrico = require('../../../../icc-core/cortocircuito/js/core/MotorElectrico');
const MotorAmpacidadNOM = require('../../../../icc-core/cortocircuito/js/core/MotorAmpacidadNOM');
const conductoresData = require('../../../../icc-core/cortocircuito/js/core/data/conductores.nom');

/**
 * Inicializa motores con inyección de dependencias controlada
 * Simula entorno browser SIN contaminar global real
 */
function initMotores() {
  // Contexto controlado - NO es global real
  const context = {
    MotorAmpacidadNOM,
    CONDUCTORES_NOM: conductoresData.CONDUCTORES_NOM,
    factorTemperatura: conductoresData.factorTemperatura,
    factorAgrupamiento: conductoresData.factorAgrupamiento
  };

  return {
    /**
     * Ejecuta motor con inyección controlada de dependencias
     * @param {Object} input - Datos de entrada
     * @returns {Object} Resultado del cálculo
     */
    ejecutar: (input) => {
      // Guardar estado original de globals
      const originalGlobals = {};

      // Inyectar dependencias SOLO en runtime
      Object.keys(context).forEach(key => {
        originalGlobals[key] = global[key];
        global[key] = context[key];
      });

      try {
        // Ejecutar motor con dependencias inyectadas
        const result = MotorElectrico.ejecutarMotorElectrico(input);
        return result;
      } finally {
        // LIMPIAR globals - CRUCIAL
        Object.keys(originalGlobals).forEach(key => {
          if (originalGlobals[key] !== undefined) {
            global[key] = originalGlobals[key];
          } else {
            delete global[key];
          }
        });
      }
    },

    /**
     * Ejecutar ampacidad NOM directamente
     */
    ejecutarAmpacidad: (input) => {
      // Guardar estado original de globals
      const originalGlobals = {};

      // Inyectar dependencias para ampacidad
      Object.keys(context).forEach(key => {
        originalGlobals[key] = global[key];
        global[key] = context[key];
      });

      try {
        // Ejecutar ampacidad con dependencias inyectadas
        const result = MotorAmpacidadNOM.calcularAmpacidadNOM(input);
        return result;
      } finally {
        // LIMPIAR globals
        Object.keys(originalGlobals).forEach(key => {
          if (originalGlobals[key] !== undefined) {
            global[key] = originalGlobals[key];
          } else {
            delete global[key];
          }
        });
      }
    },

    /**
     * Obtener información del adaptador
     */
    getInfo: () => ({
      name: 'MotorAdapter',
      version: '1.0.0',
      dependencies: Object.keys(context),
      controlled: true,
      noGlobalPollution: true
    })
  };
}

module.exports = { initMotores };
