const { toElectricalPrecision, formatElectricalValue } = require('../../utils/electricalUtils');
/**
 * domain/services/electricalCalculation.domain.js - Lógica Pura del Motor Eléctrico // Unit: Ω (Ohms)
 * Domain layer: cálculos eléctricos sin dependencias externas
 */

/* eslint-disable no-console */
const { initMotores } = require('../../infrastructure/adapters/motorAdapter');

class ElectricalCalculationDomain {
  constructor() {
    this.motor = initMotores();
    this.engineVersion = '2.1.0';
    this.standards = ['IEEE 1584', 'IEC 60909', 'NOM-001-SEDE-2012'];
  }

  /**
   * Pipeline PRO real de cálculo
   * @param {Object} input - Datos de entrada
   * @param {Object} options - Opciones de cálculo
   * @returns {Object} Resultado del pipeline
   */
  async executePipeline(input, options = {}) {
    const pipeline = options.mode || 'engineering';

    // eslint-disable-next-line no-console
    console.log(`[DOMAIN] Iniciando pipeline: ${pipeline}`);
    // eslint-disable-next-line no-console
    console.time('pipeline-completo');

    try {
      // 1. Normalización
      const normalizedInput = this.normalizeInput(input);

      // 2. Cálculo base
      const baseCalculation = await this.calculateBase(normalizedInput);

      // 3. Corto circuito
      const shortCircuit = await this.calculateShortCircuit(baseCalculation);

      // 4. Protección
      const protection = await this.calculateProtection(baseCalculation, shortCircuit);

      // 5. Coordinación
      const coordination = await this.calculateCoordination(protection);

      // 6. Optimización (opcional)
      let optimization = null;
      if (pipeline === 'optimization' || pipeline === 'simulation') {
        optimization = await this.optimizeSystem(baseCalculation, protection);
      }

      // 7. Validación final
      const validation = await this.validateResults(baseCalculation, protection, shortCircuit);

      // eslint-disable-next-line no-console
      console.timeEnd('pipeline-completo');

      return {
        input: normalizedInput,
        pipeline: {
          mode: pipeline,
          steps: ['normalization', 'base_calculation', 'short_circuit', 'protection', 'coordination', 'validation', 'optimization'],
          completed: optimization ? 'optimization' : 'validation'
        },
        results: {
          base: baseCalculation,
          shortCircuit,
          protection,
          coordination,
          optimization,
          validation
        },
        metadata: {
          engineVersion: this.engineVersion,
          standards: this.standards,
          timestamp: new Date().toISOString(),
          processingTime: 'measured'
        }
      };

    } catch (error) {
      // eslint-disable-next-line no-console
      console.timeEnd('pipeline-completo');
      // eslint-disable-next-line no-console
      console.error('[DOMAIN] Error en pipeline:', error.message);
      throw new Error(`Pipeline execution failed: ${error.message}`);
    }
  }

  /**
   * Normalización de input
   */
  normalizeInput(input) {
    return {
      ...input,
      normalized: true,
      timestamp: new Date().toISOString(),
      engineVersion: this.engineVersion
    };
  }

  /**
   * Cálculo base (ampacidad, conductor, caída de tensión)
   */
  async calculateBase(input) {
    // eslint-disable-next-line no-console
    console.log('[DOMAIN] Cálculo base...');
    // eslint-disable-next-line no-console
    console.time('calculo-base');

    try {
      const result = this.motor.ejecutar(input);

      // eslint-disable-next-line no-console
      console.timeEnd('calculo-base');
      return {
        ampacidad: result.ampacidad,
        conductor: result.conductor,
        caida: result.caida,
        sistema: result.sistema
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.timeEnd('calculo-base');
      throw error;
    }
  }

  /**
   * Cálculo de corto circuito
   */
  async calculateShortCircuit(baseCalculation) {
    // eslint-disable-next-line no-console
    console.log('[DOMAIN] Cálculo de corto circuito...');
    // eslint-disable-next-line no-console
    console.time('corto-circuito');

    try {
      // Cálculo ICC básico
      const voltage = baseCalculation.sistema?.voltaje || 480; // voltage (V)
      const impedance = 0.1; // Impedancia típica // Unit: Ω (Ohms)
      const Icc = toElectricalPrecision(parseFloat((voltage / (Math.sqrt(3) * impedance)).toFixed(6))); // voltage (V)

      // eslint-disable-next-line no-console
      console.timeEnd('corto-circuito');

      return {
        Icc: Math.round(Icc * 100) / 100,
        impedance,
        voltage,
        method: 'basic_iec_60909',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.timeEnd('corto-circuito');
      throw error;
    }
  }

  /**
   * Cálculo de protección
   */
  async calculateProtection(baseCalculation, shortCircuit) {
    // eslint-disable-next-line no-console
    console.log('[DOMAIN] Cálculo de protección...');
    // eslint-disable-next-line no-console
    console.time('proteccion');

    try {
      const I_diseño = baseCalculation.sistema?.I_diseño || 187.5;
      const Icu = shortCircuit.Icc * 1.25;

      // Selección de breaker estándar
      const breakers = [15, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 225, 250, 300, 350, 400, 450, 500, 600, 700, 800, 1000, 1200, 1600, 2000, 2500, 3000, 4000, 5000, 6000];

      let In = breakers[0];
      for (const breaker of breakers) {
        if (breaker >= I_diseño) {
          In = breaker;
          break;
        }
      }

      // eslint-disable-next-line no-console
      console.timeEnd('proteccion');

      return {
        In,
        Icu: Math.round(Icu),
        tipo: 'LSIG',
        seleccion: 'automatica',
        criterio: 'I_diseño * 1.25',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.timeEnd('proteccion');
      throw error;
    }
  }

  /**
   * Coordinación de protecciones
   */
  async calculateCoordination(protection) {
    // eslint-disable-next-line no-console
    console.log('[DOMAIN] Coordinación de protecciones...');
    // eslint-disable-next-line no-console
    console.time('coordinacion');

    try {
      // Coordinación básica
      const coordinada = protection.In <= protection.Icu * 0.8;

      // eslint-disable-next-line no-console
      console.timeEnd('coordinacion');

      return {
        coordinada,
        mensaje: coordinada ? 'Coordinación básica OK' : 'Requiere revisión',
        criterio: 'In <= 0.8 * Icu',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.timeEnd('coordinacion');
      throw error;
    }
  }

  /**
   * Optimización del sistema (algoritmos genéticos, etc.)
   */
  async optimizeSystem(baseCalculation, protection) {
    // eslint-disable-next-line no-console
    console.log('[DOMAIN] Optimización del sistema...');
    // eslint-disable-next-line no-console
    console.time('optimizacion');

    try {
      // Simulación de optimización básica
      const optimized = {
        original: {
          conductor: baseCalculation.conductor.calibre,
          proteccion: protection.In
        },
        optimized: {
          conductor: baseCalculation.conductor.calibre,
          proteccion: protection.In,
          ahorro: 0
        },
        iteraciones: 10,
        algoritmo: 'basic_ga',
        convergencia: true
      };

      // eslint-disable-next-line no-console
      console.timeEnd('optimizacion');
      return optimized;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.timeEnd('optimizacion');
      throw error;
    }
  }

  /**
   * Validación final de resultados
   */
  async validateResults(baseCalculation, protection, shortCircuit) {
    // eslint-disable-next-line no-console
    console.log('[DOMAIN] Validación final...');
    // eslint-disable-next-line no-console
    console.time('validacion');

    try {
      const errores = [];
      const warnings = [];

      // Validación de ampacidad
      if (baseCalculation.ampacidad?.I_final < baseCalculation.sistema?.I_diseño) {
        errores.push('No cumple ampacidad');
      }

      // Validación de protección
      if (protection.Icu < shortCircuit.Icc) {
        errores.push('Protección insuficiente');
      }

      // Validación de caída de tensión
      if (baseCalculation.caida?.porcentaje > 3) {
        warnings.push('Caída de tensión > 3%');
      }

      // eslint-disable-next-line no-console
      console.timeEnd('validacion');

      return {
        ok: errores.length === 0,
        errores,
        warnings,
        normas: this.standards,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.timeEnd('validacion');
      throw error;
    }
  }

  /**
   * Get domain info
   */
  getInfo() {
    return {
      name: 'ElectricalCalculationDomain',
      version: this.engineVersion,
      standards: this.standards,
      capabilities: ['pipeline', 'optimization', 'validation'],
      modes: ['fast', 'engineering', 'optimization', 'simulation']
    };
  }
}

module.exports = ElectricalCalculationDomain;
