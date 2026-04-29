/**
 * infrastructure/queue/queue.js - Professional distributed queue system
 *
 * Responsibility: Distributed job management with Redis
 */

const Queue = require('bullmq')
const Redis = require('ioredis')

class DistributedQueue {
  constructor(options = {}) {
    this.config = {
      host: options.redisHost || 'localhost',
      port: options.redisPort || 6379,
      db: options.redisDb || 0,
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 5000,
      ...options,
    }

    this.queues = new Map()
    this.redis = new Redis(this.config)
    this.stats = {
      created: 0,
      completed: 0,
      failed: 0,
      retried: 0,
      avgProcessingTime: 0,
    }
  }

  /**
   * Create queue with configuration
   * @param {string} name - Queue name
   * @param {Object} options - Queue options
   * @returns {Queue} Bull queue instance
   */
  createQueue(name, options = {}) {
    const queueConfig = {
      name,
      redis: this.config,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
        attempts: options.attempts || 3,
        backoff: {
          type: options.backoffType || 'exponential',
          delay: options.backoffDelay || 2000,
        },
      },
      settings: {
        stalledInterval: options.stalledInterval || 30000,
        maxStalledCount: options.maxStalledCount || 3,
      },
    }

    const queue = new Queue(name, queueConfig)
    this.queues.set(name, queue)

    // Event handlers
    queue.on('completed', (job, _result) => {
      this.updateStats('completed', job)
      // eslint-disable-next-line no-console
      console.log(`✅ Queue ${name}: Job ${job.id} completed`)
    })

    queue.on('failed', (job, err) => {
      this.updateStats('failed', job)
      // eslint-disable-next-line no-console
      console.error(`❌ Queue ${name}: Job ${job.id} failed:`, err.message)
    })

    queue.on('stalled', job => {
      // eslint-disable-next-line no-console
      console.warn(`⚠️ Queue ${name}: Job ${job.id} stalled`)
    })

    return queue
  }

  /**
   * Add job to queue
   * @param {string} queueName - Target queue
   * @param {Object} data - Job data
   * @param {Object} options - Job options
   * @returns {Promise} Job instance
   */
  async add(queueName, data, options = {}) {
    const queue = this.queues.get(queueName)
    if (!queue) {
      queue = this.createQueue(queueName)
    }

    const job = await queue.add(data, {
      priority: options.priority || 0,
      delay: options.delay || 0,
      attempts: options.attempts || 3,
      removeOnComplete: true,
      removeOnFail: true,
    })

    this.updateStats('created', job)
    // eslint-disable-next-line no-console
    console.log(`📤 Queue ${queueName}: Job ${job.id} added`)

    return job
  }

  /**
   * Add multiple jobs to queue
   * @param {string} queueName - Target queue
   * @param {Array} jobs - Array of job data
   * @param {Object} options - Job options
   * @returns {Promise<Array>} Job instances
   */
  async addBatch(queueName, jobs, options = {}) {
    const queue = this.queues.get(queueName)
    if (!queue) {
      queue = this.createQueue(queueName)
    }

    const jobPromises = jobs.map(data =>
      queue.add(data, {
        ...options,
        priority: options.priority || 0,
      })
    )

    const addedJobs = await Promise.all(jobPromises)

    this.stats.created += jobs.length
    // eslint-disable-next-line no-console
    console.log(`📤 Queue ${queueName}: Batch of ${jobs.length} jobs added`)

    return addedJobs
  }

  /**
   * Get job by ID
   * @param {string} queueName - Queue name
   * @param {string} jobId - Job ID
   * @returns {Promise} Job instance
   */
  async getJob(queueName, jobId) {
    const queue = this.queues.get(queueName)
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`)
    }

    const job = await queue.getJob(jobId)
    return job
  }

  /**
   * Get queue statistics
   * @param {string} queueName - Queue name
   * @returns {Object} Queue statistics
   */
  async getQueueStats(queueName) {
    const queue = this.queues.get(queueName)
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`)
    }

    const waiting = await queue.getWaiting()
    const active = await queue.getActive()
    const completed = await queue.getCompleted()
    const failed = await queue.getFailed()

    return {
      queueName,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      total: waiting + active + completed + failed,
      processingRate:
        active.length > 0
          ? (completed.length / (completed.length + failed.length)) * 100
          : 0,
    }
  }

  /**
   * Get all queue statistics
   * @returns {Object} Overall statistics
   */
  async getAllStats() {
    const queueStats = {}

    for (const queueName of this.queues.keys()) {
      queueStats[queueName] = await this.getQueueStats(queueName)
    }

    return {
      totalQueues: this.queues.size,
      queues: queueStats,
      overall: this.stats,
      redis: {
        host: this.config.host,
        port: this.config.port,
        connected: this.redis.status === 'ready',
      },
    }
  }

  /**
   * Pause queue processing
   * @param {string} queueName - Queue name
   */
  async pauseQueue(queueName) {
    const queue = this.queues.get(queueName)
    if (queue) {
      await queue.pause()
      // eslint-disable-next-line no-console
      console.log(`⏸️ Queue ${queueName}: Paused`)
    }
  }

  /**
   * Resume queue processing
   * @param {string} queueName - Queue name
   */
  async resumeQueue(queueName) {
    const queue = this.queues.get(queueName)
    if (queue) {
      await queue.resume()
      // eslint-disable-next-line no-console
      console.log(`▶️ Queue ${queueName}: Resumed`)
    }
  }

  /**
   * Clear queue
   * @param {string} queueName - Queue name
   */
  async clearQueue(queueName) {
    const queue = this.queues.get(queueName)
    if (queue) {
      await queue.clean(0, 'completed')
      await queue.clean(0, 'failed')
      // eslint-disable-next-line no-console
      console.log(`🗑️ Queue ${queueName}: Cleared`)
    }
  }

  /**
   * Update statistics
   * @param {string} type - Stat type
   * @param {Object} job - Job instance
   */
  updateStats(type, job) {
    this.stats[type]++

    if (job.processedOn) {
      const processingTime = Date.now() - job.processedOn
      this.stats.avgProcessingTime =
        (this.stats.avgProcessingTime * (this.stats.completed - 1) +
          processingTime) /
        this.stats.completed
    }
  }

  /**
   * Shutdown queue system
   */
  async shutdown(_name) {
    // eslint-disable-next-line no-console
    console.log('🛑 Shutting down distributed queue system...')

    // Pause all queues
    for (const [_name, queue] of this.queues) {
      await queue.pause()
    }

    // Wait for active jobs to complete
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Close Redis connection
    await this.redis.quit()

    // eslint-disable-next-line no-console
    console.log('✅ Distributed queue system shutdown complete')
  }

  /**
   * Health check
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const stats = await this.getAllStats()
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        stats,
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      }
    }
  }
}

module.exports = DistributedQueue
