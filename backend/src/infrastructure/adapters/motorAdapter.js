/**
 * infrastructure/adapters/motorAdapter.js - Motor Adapter para Enterprise
 * Adaptador limpio para el motor eléctrico original
 */

const MotorElectrico = require('../../../../icc-core/cortocircuito/js/core/MotorElectrico');
const MotorAmpacidadNOM = require('../../../../icc-core/cortocircuito/js/core/MotorAmpacidadNOM');
const conductoresData = require('../../../../icc-core/cortocircuito/js/core/data/conductores.nom');

function initMotores() {
  const context = {
    MotorAmpacidadNOM,
    CONDUCTORES_NOM: conductoresData.CONDUCTORES_NOM,
    factorTemperatura: conductoresData.factorTemperatura,
    factorAgrupamiento: conductoresData.factorAgrupamiento
  };

  return {
    ejecutar: (input) => {
      const originalGlobals = {};
      
      Object.keys(context).forEach(key => {
        originalGlobals[key] = global[key];
        global[key] = context[key];
      });

      try {
        return MotorElectrico.ejecutarMotorElectrico(input);
      } finally {
        Object.keys(originalGlobals).forEach(key => {
          if (originalGlobals[key] !== undefined) {
            global[key] = originalGlobals[key];
          } else {
            delete global[key];
          }
        });
      }
    },

    ejecutarAmpacidad: (input) => {
      const originalGlobals = {};
      
      Object.keys(context).forEach(key => {
        originalGlobals[key] = global[key];
        global[key] = context[key];
      });

      try {
        return MotorAmpacidadNOM.calcularAmpacidadNOM(input);
      } finally {
        Object.keys(originalGlobals).forEach(key => {
          if (originalGlobals[key] !== undefined) {
            global[key] = originalGlobals[key];
          } else {
            delete global[key];
          }
        });
      }
    },

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
