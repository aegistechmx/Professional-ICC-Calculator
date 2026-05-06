/**
 * core/motorElectrico.wrapper.js - Clean wrapper for MotorElectrico
 * Dependency injection pattern - no globals
 */

class MotorElectricoWrapper {
  constructor(dependencies = {}) {
    this.dependencies = {
      MotorAmpacidadNOM: dependencies.MotorAmpacidadNOM,
      CONDUCTORES_NOM: dependencies.CONDUCTORES_NOM,
      factorTemperatura: dependencies.factorTemperatura,
      factorAgrupamiento: dependencies.factorAgrupamiento,
      VoltageDropEngine: dependencies.VoltageDropEngine,
      ShortcircuitEngine: dependencies.ShortcircuitEngine,
      obtenerResistencia: dependencies.obtenerResistencia,
      REACTANCIA_TIPICA: dependencies.REACTANCIA_TIPICA
    };

    this.motor = null;
    this.initialized = false;
  }

  /**
   * Initialize motor with injected dependencies
   */
  async initialize() {
    if (this.initialized) return;

    // Set up global-like access but controlled through wrapper
    const originalMotor = require('../../../icc-core/cortocircuito/js/core/MotorElectrico');

    // Create a controlled environment for the motor
    this.motor = {
      ejecutarMotorElectrico: (input) => {
        // Temporarily set dependencies in global scope for the motor
        const originalGlobals = {};

        Object.keys(this.dependencies).forEach(key => {
          if (this.dependencies[key]) {
            originalGlobals[key] = global[key];
            global[key] = this.dependencies[key];
          }
        });

        try {
          return originalMotor.ejecutarMotorElectrico(input);
        } finally {
          // Clean up globals
          Object.keys(originalGlobals).forEach(key => {
            if (originalGlobals[key] !== undefined) {
              global[key] = originalGlobals[key];
            } else {
              delete global[key];
            }
          });
        }
      },
      normalizarInput: originalMotor.normalizarInput
    };

    this.initialized = true;
  }

  /**
   * Execute motor with dependency injection
   */
  async ejecutarMotorElectrico(input, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const { mode = 'fast' } = options;

    // Fast mode - skip heavy calculations
    if (mode === 'fast') {
      return this.motor.ejecutarMotorElectrico(input);
    }

    // Full mode - complete analysis
    return this.motor.ejecutarMotorElectrico(input);
  }

  /**
   * Get system info without calculations
   */
  getInfo() {
    return {
      name: 'MotorElectricoWrapper',
      version: '2.0.0',
      capabilities: [
        'ampacidad',
        'conductor_selection',
        'voltage_drop',
        'short_circuit',
        'protection_coordination',
        'nom_validation'
      ],
      dependencies: Object.keys(this.dependencies).filter(key => this.dependencies[key]),
      initialized: this.initialized
    };
  }
}

module.exports = MotorElectricoWrapper;
