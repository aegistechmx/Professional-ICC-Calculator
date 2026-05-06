const { toElectricalPrecision, formatElectricalValue } = require('../../utils/electricalUtils');
/**
 * application/services/systemCalculation.service.js - PRO Pipeline Application Service
 * Casos de uso del sistema con múltiples modos de cálculo
 */

/* eslint-disable no-console */
const ElectricalCalculationDomain = require('../../domain/services/electricalCalculation.domain');
const { runSystemWorker } = require('../../infrastructure/services/workerService');
const { calcularConCache } = require('../../infrastructure/services/cacheService');
const { saveStudy, getStudy } = require('../../infrastructure/repositories/study.repository');
const { createJob, getJobStatus } = require('../../infrastructure/queues/jobQueue.service');
const { startTimer, endTimer, recordError, updateWorkerMetrics: _updateWorkerMetrics } = require('../../shared/utils/observability');
const { getCurrentVersion } = require('../../shared/utils/engineVersioning');

class SystemCalculationService {
  constructor() {
    this.domain = new ElectricalCalculationDomain();
    this.engineVersion = getCurrentVersion().version;
  }

  /**
   * Pipeline PRO real con múltiples modos
   * @param {Object} input - Datos de entrada
   * @param {Object} options - Opciones del cálculo
   * @returns {Promise<Object>} Resultado del pipeline
   */
  async executeCalculation(input, options = {}) {
    const timerId = startTimer('calculation_system', { mode: options.mode });

    try {
      const mode = options.mode || 'engineering';
      console.log(`[APPLICATION] Starting PRO pipeline in ${mode} mode`);

      // Validar modo
      this.validateMode(mode);

      // Ejecutar según modo
      let result;
      switch (mode) {
        case 'fast':
          result = await this.executeFastMode(input, options);
          break;
        case 'engineering':
          result = await this.executeEngineeringMode(input, options);
          break;
        case 'optimization':
          result = await this.executeOptimizationMode(input, options);
          break;
        case 'simulation':
          result = await this.executeSimulationMode(input, options);
          break;
        default:
          throw new Error(`Unsupported mode: ${mode}`);
      }

      const timerResult = endTimer(timerId, { success: true, mode });

      return {
        ...result,
        pipeline: {
          mode,
          engineVersion: this.engineVersion,
          performance: timerResult,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      endTimer(timerId, { success: false, error: error.message });
      recordError(error, { mode: options.mode, operation: 'system_calculation' });
      throw error;
    }
  }

  /**
   * Modo FAST - Respuesta inmediata
   */
  async executeFastMode(input, _options) {
    console.log('[APPLICATION] Executing FAST mode');

    // Cálculo con cache para máxima velocidad
    const cacheResult = await calcularConCache(
      input,
      async (data) => {
        // Cálculo ICC básico sin worker
        const voltage = data.voltage || 480; // voltage (V)
        const impedance = data.impedance || 0.1; // impedance (Ω)
        const Icc = toElectricalPrecision(parseFloat((voltage / (Math.sqrt(3) * impedance)).toFixed(6))); // voltage (V)

        return {
          Icc: Math.round(Icc * 100) / 100,
          metodo: 'basico',
          tipo: 'icc_fast',
          precision: 'IEEE_1584',
          formula: 'Isc = V / (sqrt(3) * Z)',
          cached: false
        };
      },
      { ttl: 300 } // 5 minutos cache para modo fast
    );

    return {
      success: true,
      mode: 'fast',
      data: cacheResult.data,
      cached: cacheResult.cached,
      hitRate: cacheResult.hitRate
    };
  }

  /**
   * Modo ENGINEERING - Cálculo completo con worker
   */
  async executeEngineeringMode(input, options) {
    console.log('[APPLICATION] Executing ENGINEERING mode');

    // Cálculo con worker thread
    const workerResult = await runSystemWorker(input, { mode: 'engineering' });

    if (!workerResult.success) {
      throw new Error(workerResult.error || 'Worker calculation failed');
    }

    // Guardar estudio si se solicita
    let studyId = null;
    if (options.saveStudy) {
      const study = await saveStudy(input, workerResult.data, {
        mode: 'engineering',
        calculationType: 'worker_based'
      });
      studyId = study.id;
    }

    return {
      success: true,
      mode: 'engineering',
      data: workerResult.data,
      workerThread: true,
      studyId
    };
  }

  /**
   * Modo OPTIMIZATION - Con algoritmos genéticos
   */
  async executeOptimizationMode(input, options) {
    console.log('[APPLICATION] Executing OPTIMIZATION mode');

    // Cálculo con worker y optimización
    const workerResult = await runSystemWorker(input, {
      mode: 'optimization',
      optimizationOptions: {
        algorithm: 'genetic',
        generations: 50,
        populationSize: 100
      }
    });

    if (!workerResult.success) {
      throw new Error(workerResult.error || 'Optimization calculation failed');
    }

    // Guardar estudio de optimización
    let studyId = null;
    if (options.saveStudy) {
      const study = await saveStudy(input, workerResult.data, {
        mode: 'optimization',
        calculationType: 'genetic_optimization',
        algorithm: 'GA'
      });
      studyId = study.id;
    }

    return {
      success: true,
      mode: 'optimization',
      data: workerResult.data,
      workerThread: true,
      optimization: true,
      studyId
    };
  }

  /**
   * Modo SIMULATION - Simulación completa
   */
  async executeSimulationMode(input, options) {
    console.log('[APPLICATION] Executing SIMULATION mode');

    // Para simulaciones grandes, usar job queue
    if (options.useQueue !== false) {
      const job = await createJob(input, {
        mode: 'simulation',
        simulationOptions: {
          scenarios: options.scenarios || 5,
          monteCarlo: options.monteCarlo || false,
          iterations: options.iterations || 1000
        }
      });

      return {
        success: true,
        mode: 'simulation',
        jobId: job.jobId,
        studyId: job.studyId,
        status: 'queued',
        queuePosition: job.queuePosition,
        estimatedTime: job.estimatedTime,
        message: 'Large simulation queued for processing'
      };
    }

    // Simulación directa (para pruebas)
    const workerResult = await runSystemWorker(input, {
      mode: 'simulation',
      simulationOptions: {
        scenarios: 3,
        monteCarlo: false,
        iterations: 100
      }
    });

    if (!workerResult.success) {
      throw new Error(workerResult.error || 'Simulation calculation failed');
    }

    return {
      success: true,
      mode: 'simulation',
      data: workerResult.data,
      workerThread: true,
      simulation: true
    };
  }

  /**
   * Ejecutar cálculo asíncrono (job queue)
   */
  async executeAsyncCalculation(input, options = {}) {
    const timerId = startTimer('calculation_async', { mode: options.mode });

    try {
      const job = await createJob(input, options);

      endTimer(timerId, { success: true, jobId: job.jobId });

      return {
        success: true,
        jobId: job.jobId,
        studyId: job.studyId,
        status: 'queued',
        queuePosition: job.queuePosition,
        estimatedTime: job.estimatedTime,
        mode: options.mode || 'engineering',
        message: 'Calculation queued for processing'
      };

    } catch (error) {
      endTimer(timerId, { success: false, error: error.message });
      recordError(error, { operation: 'async_calculation' });
      throw error;
    }
  }

  /**
   * Obtener estado de cálculo asíncrono
   */
  async getCalculationStatus(jobId) {
    try {
      const status = await getJobStatus(jobId);

      if (!status) {
        return {
          success: false,
          error: 'Job not found',
          jobId
        };
      }

      // Si el job está completado, cargar el estudio
      let study = null;
      if (status.status === 'completed' && status.studyId) {
        study = await getStudy(status.studyId);
      }

      return {
        success: true,
        jobId,
        status: status.status,
        progress: status.progress,
        data: status.returnvalue,
        study,
        processedOn: status.processedOn,
        finishedOn: status.finishedOn,
        queuePosition: status.queuePosition || 0
      };

    } catch (error) {
      recordError(error, { operation: 'get_calculation_status', jobId });
      throw error;
    }
  }

  /**
   * Validar modo de cálculo
   */
  validateMode(mode) {
    const validModes = ['fast', 'engineering', 'optimization', 'simulation'];

    if (!validModes.includes(mode)) {
      throw new Error(`Invalid mode: ${mode}. Valid modes: ${validModes.join(', ')}`);
    }
  }

  /**
   * Obtener capacidades del servicio
   */
  getCapabilities() {
    return {
      modes: {
        fast: {
          description: 'Quick ICC calculation',
          responseTime: '<100ms',
          features: ['cache', 'basic_calculation'],
          useCase: 'Real-time frontend responses'
        },
        engineering: {
          description: 'Complete system analysis',
          responseTime: '1-5s',
          features: ['worker_threads', 'full_pipeline', 'validation'],
          useCase: 'Professional engineering studies'
        },
        optimization: {
          description: 'Genetic algorithm optimization',
          responseTime: '10-30s',
          features: ['genetic_algorithm', 'cost_optimization', 'multi_objective'],
          useCase: 'System optimization and cost analysis'
        },
        simulation: {
          description: 'Monte Carlo simulation',
          responseTime: '30-60s',
          features: ['monte_carlo', 'scenario_analysis', 'statistical_analysis'],
          useCase: 'Risk analysis and reliability studies'
        }
      },
      features: [
        'worker_threads',
        'intelligent_caching',
        'job_queue',
        'persistence',
        'versioning',
        'observability',
        'security'
      ],
      engineVersion: this.engineVersion,
      standards: ['IEEE 1584', 'IEC 60909', 'NOM-001-SEDE-2012']
    };
  }

  /**
   * Health check del servicio
   */
  async healthCheck() {
    try {
      const domainInfo = this.domain.getInfo();
      const capabilities = this.getCapabilities();

      return {
        status: 'healthy',
        service: 'SystemCalculationService',
        version: this.engineVersion,
        domain: domainInfo,
        capabilities,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      recordError(error, { operation: 'health_check' });
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Singleton instance
const systemCalculationService = new SystemCalculationService();

module.exports = {
  executeCalculation: (input, options) => systemCalculationService.executeCalculation(input, options),
  executeAsyncCalculation: (input, options) => systemCalculationService.executeAsyncCalculation(input, options),
  getCalculationStatus: (jobId) => systemCalculationService.getCalculationStatus(jobId),
  getCapabilities: () => systemCalculationService.getCapabilities(),
  healthCheck: () => systemCalculationService.healthCheck()
};
