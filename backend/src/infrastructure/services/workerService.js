/**
 * infrastructure/services/workerService.js - Wrapper del Worker
 * Servicio para manejar workers de forma asíncrona
 */

const { Worker } = require('worker_threads');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class WorkerService {
  constructor() {
    this.workers = new Map();
    this.maxWorkers = 4; // Máximo 4 workers en paralelo
    this.activeJobs = 0;
  }

  /**
   * Ejecutar cálculo en worker thread
   * @param {Object} input - Datos de entrada
   * @param {Object} options - Opciones del cálculo
   * @returns {Promise<Object>} Resultado del cálculo
   */
  async runSystemWorker(input, options = {}) {
    const jobId = options.jobId || uuidv4();

    return new Promise((resolve, reject) => {
      // Verificar límite de workers
      if (this.activeJobs >= this.maxWorkers) {
        reject(new Error('Maximum worker limit reached'));
        return;
      }

      this.activeJobs++;

      const worker = new Worker(
        path.resolve(__dirname, '../workers/system.worker.js'),
        {
          resourceLimits: {
            maxOldGenerationSizeMb: 512,
            maxYoungGenerationSizeMb: 128
          }
        }
      );

      // Timeout para el worker
      const timeout = setTimeout(() => {
        worker.terminate();
        this.activeJobs--;
        reject(new Error('Worker timeout'));
      }, 30000); // 30 segundos timeout

      // Manejar mensajes del worker
      worker.on('message', (result) => {
        clearTimeout(timeout);
        this.activeJobs--;

        if (result.success) {
          resolve({
            success: true,
            jobId: result.jobId,
            data: result.result,
            workerThread: true
          });
        } else {
          reject(new Error(result.error.message));
        }
      });

      // Manejar errores del worker
      worker.on('error', (error) => {
        clearTimeout(timeout);
        this.activeJobs--;
        reject(error);
      });

      // Manejar salida del worker
      worker.on('exit', (code) => {
        clearTimeout(timeout);
        this.activeJobs--;

        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });

      // Enviar job al worker
      worker.postMessage({
        id: jobId,
        input,
        options
      });

      // Guardar referencia al worker
      this.workers.set(jobId, worker);
    });
  }

  /**
   * Health check de workers
   */
  async healthCheck() {
    try {
      const worker = new Worker(
        path.resolve(__dirname, '../workers/system.worker.js')
      );

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          worker.terminate();
          reject(new Error('Health check timeout'));
        }, 5000);

        worker.on('message', (result) => {
          clearTimeout(timeout);
          if (result.type === 'health') {
            worker.terminate();
            resolve({
              status: 'healthy',
              activeJobs: this.activeJobs,
              maxWorkers: this.maxWorkers,
              worker: result
            });
          }
        });

        worker.on('error', (error) => {
          clearTimeout(timeout);
          worker.terminate();
          reject(error);
        });

        worker.postMessage({ type: 'health' });
      });
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        activeJobs: this.activeJobs
      };
    }
  }

  /**
   * Obtener estadísticas de workers
   */
  getStats() {
    return {
      activeJobs: this.activeJobs,
      maxWorkers: this.maxWorkers,
      availableWorkers: this.maxWorkers - this.activeJobs,
      totalWorkers: this.workers.size
    };
  }

  /**
   * Terminar todos los workers
   */
  async terminateAll() {
    const terminationPromises = [];

    for (const [_jobId, worker] of this.workers) {
      terminationPromises.push(
        new Promise((resolve) => {
          worker.terminate();
          resolve();
        })
      );
    }

    await Promise.all(terminationPromises);
    this.workers.clear();
    this.activeJobs = 0;
  }

  /**
   * Limpiar workers terminados
   */
  cleanup() {
    for (const [jobId, worker] of this.workers) {
      if (worker.exited) {
        this.workers.delete(jobId);
        this.activeJobs = Math.max(0, this.activeJobs - 1);
      }
    }
  }
}

// Singleton instance
const workerService = new WorkerService();

module.exports = {
  runSystemWorker: (input, options) => workerService.runSystemWorker(input, options),
  healthCheck: () => workerService.healthCheck(),
  getStats: () => workerService.getStats(),
  terminateAll: () => workerService.terminateAll(),
  cleanup: () => workerService.cleanup()
};
