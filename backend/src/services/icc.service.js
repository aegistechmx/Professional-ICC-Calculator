/**
 * services/icc.service.js - ICC calculation service
 * Clean separation of business logic from controllers
 */

const logger = require('../utils/logger');
const MotorElectricoWrapper = require('../core/motorElectrico.wrapper');
const { validateInput, systemCalculationSchema } = require('../validation/electrical.schemas');

class ICCService {
  constructor() {
    this.motorWrapper = null;
    this.dependencies = {};
    this.initialized = false;
  }

  /**
   * Initialize service with dependencies
   */
  async initialize() {
    if (this.initialized) return;

    logger.info('Initializing ICC Service');

    // Load dependencies
    const conductoresData = require('../../../icc-core/cortocircuito/js/core/data/conductores.nom');
    const MotorAmpacidadNOM = require('../../../icc-core/cortocircuito/js/core/MotorAmpacidadNOM');

    this.dependencies = {
      MotorAmpacidadNOM,
      CONDUCTORES_NOM: conductoresData.CONDUCTORES_NOM,
      factorTemperatura: conductoresData.factorTemperatura,
      factorAgrupamiento: conductoresData.factorAgrupamiento
    };

    // Initialize motor wrapper with dependencies
    this.motorWrapper = new MotorElectricoWrapper(this.dependencies);
    await this.motorWrapper.initialize();

    this.initialized = true;
    logger.info('ICC Service initialized successfully');
  }

  /**
   * Calculate short circuit current only (pure ICC)
   */
  async calculateICC(input) {
    const _startTime = process.hrtime.bigint();
    logger.startTimer('icc_calculation');

    try {
      // Validate input for ICC calculation
      if (!input.V || !input.Z) {
        throw new Error('V (voltage) and Z (impedance) are required for ICC calculation');
      }

      // Fórmula CORRECTA para ICC trifásico con validación kVA
      const V = input.V || input.voltage || 480;  // Default a 480V
      const Z = input.Z / 100;  // Convertir porcentaje a decimal
      const Icc_simple = V / (Math.sqrt(3) * Z);  // En amperes

      // Validación adicional con método de kVA si está disponible
      let Icc_final = Icc_simple;
      let method = 'simple_icc';

      if (input.kVA) {
        const I_fl = (input.kVA * 1000) / (V * Math.sqrt(3));  // Corriente plena de carga
        const Icc_kva = I_fl / Z;  // ICC basado en kVA
        Icc_final = Math.min(Icc_simple, Icc_kva);  // Usar el valor más conservador
        method = 'conservative_icc_with_kva_validation';
      }

      const result = {
        method: method,
        Icc: Math.round(Icc_final * 100) / 100,  // Convertir a centésimas
        voltage: input.V,
        impedance: input.Z,
        kVA: input.kVA,
        I_full_load: input.kVA ? ((input.kVA * 1000) / (V * Math.sqrt(3))).toFixed(2) + ' A' : null,
        Icc_simple: Icc_simple.toFixed(2) + ' A',
        Icc_kva_method: input.kVA ? Icc_kva.toFixed(2) + ' A' : null,
        precision: 'IEEE_1584_corrected',
        formula: input.kVA ?
          'Isc = min[V/(√3×Z), (kVA×1000)/(V×√3×Z)]' :
          'Isc = V/(√3×Z)',
        timestamp: new Date().toISOString()
      };

      const duration = logger.endTimer('icc_calculation');
      logger.logCalculation('icc', input, result, duration);

      return result;

    } catch (error) {
      const duration = logger.endTimer('icc_calculation');
      logger.logCalculationError('icc', input, error, duration);
      throw error;
    }
  }

  /**
   * Calculate complete electrical system
   */
  async calculateSystem(input, options = {}) {
    const _startTime = process.hrtime.bigint();
    logger.startTimer('system_calculation');

    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // Validate comprehensive input
      const validation = validateInput(systemCalculationSchema, input);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      const validatedInput = validation.data;
      const { mode = 'fast' } = options;

      logger.debug('Starting system calculation', { mode, inputKeys: Object.keys(validatedInput) });

      // Execute motor with dependency injection
      const result = await this.motorWrapper.ejecutarMotorElectrico(validatedInput, { mode });

      // Add metadata
      const enhancedResult = {
        ...result,
        metadata: {
          mode,
          calculationTime: Date.now(),
          version: '2.0.0',
          dependencies: Object.keys(this.dependencies)
        }
      };

      const duration = logger.endTimer('system_calculation');
      logger.logCalculation('system', validatedInput, enhancedResult, duration);

      return enhancedResult;

    } catch (error) {
      const duration = logger.endTimer('system_calculation');
      logger.logCalculationError('system', input, error, duration);
      throw error;
    }
  }

  /**
   * Calculate ampacity only
   */
  async calculateAmpacity(input) {
    const _startTime = process.hrtime.bigint();
    logger.startTimer('ampacity_calculation');

    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // Validate ampacity input
      if (!input.calibre || !input.material || !input.tempAislamiento) {
        throw new Error('calibre, material, and tempAislamiento are required for ampacity calculation');
      }

      // Use MotorAmpacidadNOM directly
      const result = this.dependencies.MotorAmpacidadNOM.calcularAmpacidadNOM(input);

      const duration = logger.endTimer('ampacity_calculation');
      logger.logCalculation('ampacity', input, result, duration);

      return result;

    } catch (error) {
      const duration = logger.endTimer('ampacity_calculation');
      logger.logCalculationError('ampacity', input, error, duration);
      throw error;
    }
  }

  /**
   * Get service information
   */
  getInfo() {
    return {
      name: 'ICC Service',
      version: '2.0.0',
      initialized: this.initialized,
      capabilities: ['icc', 'system', 'ampacity'],
      dependencies: Object.keys(this.dependencies),
      motorInfo: this.motorWrapper?.getInfo() || null
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const info = this.getInfo();
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        ...info
      };
    } catch (error) {
      logger.error('Health check failed', { error: error.message });
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }
}

// Singleton instance
const iccService = new ICCService();

module.exports = iccService;
