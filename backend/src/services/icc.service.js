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

      // Simple ICC calculation: I = V / (sqrt(3) * Z)
      const Icc = input.V / (Math.sqrt(3) * input.Z);

      const result = {
        method: 'simple_icc',
        Icc: Math.round(Icc * 100) / 100,
        voltage: input.V,
        impedance: input.Z,
        precision: 'IEEE_1584',
        formula: 'Isc = V / (sqrt(3) * Z)',
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
