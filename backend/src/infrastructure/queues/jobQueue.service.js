/**
 * infrastructure/queues/jobQueue.service.js - Job Queue para Estudios Grandes
 * BullMQ implementation para cálculos pesados y asíncronos
 */

/* eslint-disable no-console */
const { Queue, Worker } = require('bullmq');
const { v4: uuidv4 } = require('uuid');
const { runSystemWorker } = require('../services/workerService');
const { saveStudy } = require('../repositories/study.repository');

// Configuración de Redis (para producción)
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  // Para desarrollo sin Redis, usar memoria
  ...(process.env.NODE_ENV === 'development' && {
    // BullMQ fallback a memoria en desarrollo
  })
};

class JobQueueService {
  constructor() {
    this.queue = new Queue('electrical-calculations', {
      connection,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    });

    this.worker = new Worker('electrical-calculations', this.processJob.bind(this), {
      connection,
      concurrency: 2
    });

    this.setupEventListeners();
    this.jobs = new Map();
  }

  /**
   * Configurar event listeners
   */
  setupEventListeners() {
    // Eventos del worker
    this.worker.on('completed', (job) => {
      console.log(`[QUEUE] Job completed: ${job.id}`);
      this.jobs.delete(job.id);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`[QUEUE] Job failed: ${job.id}`, err.message);
      this.jobs.delete(job.id);
    });

    this.worker.on('error', (err) => {
      console.error('[QUEUE] Worker error:', err);
    });

    // Eventos de la cola
    this.queue.on('waiting', (job) => {
      console.log(`[QUEUE] Job waiting: ${job.id}`);
    });

    this.queue.on('active', (job) => {
      console.log(`[QUEUE] Job active: ${job.id}`);
    });

    this.queue.on('stalled', (job) => {
      console.log(`[QUEUE] Job stalled: ${job.id}`);
    });
  }

  /**
   * Procesar job del worker
   */
  async processJob(job) {
    const { input, options, studyId } = job.data;

    console.log(`[QUEUE] Processing job ${job.id} with study ${studyId}`);

    try {
      // Ejecutar cálculo en worker thread
      const result = await runSystemWorker(input, options);

      if (!result.success) {
        throw new Error(result.error || 'Calculation failed');
      }

      // Guardar estudio en persistencia
      await saveStudy(input, result.data, {
        studyId,
        jobId: job.id,
        queueProcessed: true
      });

      return {
        success: true,
        studyId,
        result: result.data,
        jobId: job.id
      };

    } catch (error) {
      console.error(`[QUEUE] Job ${job.id} processing error:`, error.message);

      // Guardar estudio con error
      try {
        await saveStudy(input, { error: error.message }, {
          studyId,
          jobId: job.id,
          queueProcessed: false,
          error: true
        });
      } catch (saveError) {
        console.error('[QUEUE] Error saving failed study:', saveError.message);
      }

      throw error;
    }
  }

  /**
   * Crear job para cálculo asíncrono
   * @param {Object} input - Datos de entrada
   * @param {Object} options - Opciones del cálculo
   * @returns {Promise<Object>} Job creado
   */
  async createJob(input, options = {}) {
    const jobId = uuidv4();
    const studyId = options.studyId || uuidv4();

    const jobData = {
      input,
      options: {
        mode: options.mode || 'engineering',
        ...options
      },
      studyId,
      createdAt: new Date().toISOString()
    };

    try {
      const _job = await this.queue.add('electrical-calculation', jobData, {
        jobId,
        priority: options.priority || 0,
        delay: options.delay || 0,
        removeOnComplete: options.removeOnComplete !== false
      });

      this.jobs.set(jobId, {
        id: jobId,
        studyId,
        status: 'queued',
        createdAt: new Date().toISOString()
      });

      console.log(`[QUEUE] Job created: ${jobId} for study: ${studyId}`);

      return {
        jobId,
        studyId,
        status: 'queued',
        queuePosition: await this.getQueuePosition(jobId),
        estimatedTime: this.estimateProcessingTime(options.mode)
      };

    } catch (error) {
      console.error(`[QUEUE] Error creating job:`, error.message);
      throw new Error(`Failed to create job: ${error.message}`);
    }
  }

  /**
   * Obtener estado de job
   * @param {string} jobId - ID del job
   * @returns {Promise<Object>} Estado del job
   */
  async getJobStatus(jobId) {
    try {
      const job = await this.queue.getJob(jobId);

      if (!job) {
        // Buscar en jobs locales
        const localJob = this.jobs.get(jobId);
        if (localJob) {
          return localJob;
        }

        return {
          jobId,
          status: 'not_found',
          message: 'Job not found'
        };
      }

      const status = await job.getState();

      return {
        jobId,
        studyId: job.data.studyId,
        status,
        progress: job.progress,
        data: job.data,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        failedReason: job.failedReason,
        returnvalue: job.returnvalue,
        queuePosition: status === 'waiting' ? await this.getQueuePosition(jobId) : 0
      };

    } catch (error) {
      console.error(`[QUEUE] Error getting job status ${jobId}:`, error.message);
      return {
        jobId,
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Cancelar job
   * @param {string} jobId - ID del job
   * @returns {Promise<boolean>} True si se canceló
   */
  async cancelJob(jobId) {
    try {
      const job = await this.queue.getJob(jobId);

      if (!job) {
        return false;
      }

      await job.remove();
      this.jobs.delete(jobId);

      console.log(`[QUEUE] Job cancelled: ${jobId}`);
      return true;

    } catch (error) {
      console.error(`[QUEUE] Error cancelling job ${jobId}:`, error.message);
      return false;
    }
  }

  /**
   * Obtener posición en cola
   */
  async getQueuePosition(jobId) {
    try {
      const waiting = await this.queue.getWaiting();
      const position = waiting.findIndex(job => job.id === jobId);
      return position >= 0 ? position + 1 : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Estimar tiempo de procesamiento
   */
  estimateProcessingTime(mode = 'engineering') {
    const estimates = {
      fast: 1000,      // 1 segundo
      engineering: 5000, // 5 segundos
      optimization: 30000, // 30 segundos
      simulation: 60000   // 1 minuto
    };

    return estimates[mode] || estimates.engineering;
  }

  /**
   * Obtener estadísticas de la cola
   */
  async getQueueStats() {
    try {
      const counts = await this.queue.getJobCounts();
      const waiting = await this.queue.getWaiting();

      return {
        counts,
        waiting: waiting.length,
        activeJobs: this.jobs.size,
        workerStatus: {
          running: this.worker.isRunning(),
          closing: this.worker.closing
        }
      };

    } catch (error) {
      console.error('[QUEUE] Error getting queue stats:', error.message);
      return {
        counts: {},
        waiting: 0,
        activeJobs: 0,
        workerStatus: { running: false, closing: false }
      };
    }
  }

  /**
   * Limpiar jobs completados
   */
  async cleanCompleted() {
    try {
      await this.queue.clean(0, 0, 'completed');
      console.log('[QUEUE] Cleaned completed jobs');
    } catch (error) {
      console.error('[QUEUE] Error cleaning completed jobs:', error.message);
    }
  }

  /**
   * Pausar cola
   */
  async pause() {
    try {
      await this.queue.pause();
      console.log('[QUEUE] Queue paused');
    } catch (error) {
      console.error('[QUEUE] Error pausing queue:', error.message);
    }
  }

  /**
   * Reanudar cola
   */
  async resume() {
    try {
      await this.queue.resume();
      console.log('[QUEUE] Queue resumed');
    } catch (error) {
      console.error('[QUEUE] Error resuming queue:', error.message);
    }
  }

  /**
   * Cerrar cola y worker
   */
  async close() {
    try {
      await this.worker.close();
      await this.queue.close();
      console.log('[QUEUE] Queue and worker closed');
    } catch (error) {
      console.error('[QUEUE] Error closing queue:', error.message);
    }
  }
}

// Singleton instance
const jobQueueService = new JobQueueService();

module.exports = {
  createJob: (input, options) => jobQueueService.createJob(input, options),
  getJobStatus: (jobId) => jobQueueService.getJobStatus(jobId),
  cancelJob: (jobId) => jobQueueService.cancelJob(jobId),
  getQueueStats: () => jobQueueService.getQueueStats(),
  cleanCompleted: () => jobQueueService.cleanCompleted(),
  pause: () => jobQueueService.pause(),
  resume: () => jobQueueService.resume(),
  close: () => jobQueueService.close()
};
