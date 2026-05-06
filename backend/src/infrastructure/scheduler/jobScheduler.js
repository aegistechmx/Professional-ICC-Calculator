/**
 * infrastructure/scheduler/jobScheduler.js - Professional distributed job scheduler
 *
 * Responsibility: High-performance job scheduling and orchestration
 */

const DistributedQueue = require('../queue/queue')
const WorkerPool = require('../workers/workerPool')
const path = require('path')

class JobScheduler {
  constructor(options = {}) {
    this.config = {
      maxConcurrentJobs: options.maxConcurrentJobs || 50,
      priorityQueues: ['critical', 'high', 'normal', 'low'],
      jobTimeout: options.jobTimeout || 300000, // 5 minutes
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 5000,
      ...options,
    }

    this.queue = new DistributedQueue({
      redisHost: options.redisHost || 'localhost',
      redisPort: options.redisPort || 6379,
    })

    this.workerPool = new WorkerPool(
      path.resolve(__dirname, '../workers/job.worker.js'),
      { maxSize: options.maxWorkers || 8 }
    )

    this.jobs = new Map()
    this.stats = {
      scheduled: 0,
      running: 0,
      completed: 0,
      failed: 0,
      avgExecutionTime: 0,
      throughput: 0,
    }

    this.isRunning = false
  }

  /**
   * Initialize scheduler
   */
  async initialize() {
    // eslint-disable-next-line no-console
    console.log('🚀 Initializing distributed job scheduler...')

    await this.queue.initialize()
    await this.workerPool.initialize()

    this.isRunning = true
    // eslint-disable-next-line no-console
    console.log('✅ Job scheduler initialized successfully')
  }

  /**
   * Schedule job with priority
   * @param {string} type - Job type
   * @param {Object} data - Job data
   * @param {Object} options - Job options
   * @returns {Promise} Job ID
   */
  async scheduleJob(type, data, options = {}) {
    if (!this.isRunning) {
      throw new Error('Scheduler not initialized')
    }

    const {
      priority = 'normal',
      delay = 0,
      timeout = this.config.jobTimeout,
      attempts = this.config.retryAttempts,
      dependencies = [],
    } = options

    const jobData = {
      id: this.generateJobId(),
      type,
      data,
      priority,
      delay,
      timeout,
      attempts,
      dependencies,
      createdAt: new Date().toISOString(),
    }

    // Add to queue based on priority
    const queueName = this.getQueueName(priority)
    const job = await this.queue.add(queueName, jobData, {
      priority: this.getPriorityValue(priority),
      delay,
      removeOnComplete: true,
      attempts,
    })

    this.jobs.set(job.id, {
      ...jobData,
      status: 'queued',
      queuedAt: new Date().toISOString(),
    })

    this.stats.scheduled++
    // eslint-disable-next-line no-console
    console.log(
      `📤 Job scheduled: ${job.id} (${type}) with priority ${priority}`
    )

    return job.id
  }

  /**
   * Schedule batch of jobs
   * @param {Array} jobs - Array of job specifications
   * @param {Object} options - Batch options
   * @returns {Promise<Array>} Job IDs
   */
  async scheduleBatch(jobs, options = {}) {
    const {
      executeInParallel = true,
      _maxConcurrency = this.config.maxConcurrentJobs, // current (A)
    } = options

    // eslint-disable-next-line no-console
    console.log(`📤 Scheduling batch of ${jobs.length} jobs...`)

    if (executeInParallel) {
      // Check dependencies and execute in parallel
      const orderedJobs = this.resolveDependencies(jobs)
      const jobIds = await Promise.all(
        orderedJobs.map(job =>
          this.scheduleJob(job.type, job.data, {
            ...job.options,
            priority: job.priority,
          })
        )
      )

      // eslint-disable-next-line no-console
      console.log(`✅ Batch scheduled: ${jobIds.length} jobs`)
      return jobIds
    } else {
      // Execute sequentially respecting dependencies
      const jobIds = []
      for (const job of jobs) {
        const jobId = await this.scheduleJob(job.type, job.data, {
          ...job.options,
          priority: job.priority,
        })
        jobIds.push(jobId)
      }

      // eslint-disable-next-line no-console
      console.log(`✅ Batch scheduled: ${jobIds.length} jobs (sequential)`)
      return jobIds
    }
  }

  /**
   * Schedule recurring job
   * @param {string} type - Job type
   * @param {Object} data - Job data
   * @param {Object} schedule - Schedule configuration
   * @param {Object} options - Job options
   * @returns {Promise} Job ID
   */
  async scheduleRecurring(type, data, schedule, options = {}) {
    const {
      cron = '0 */5 * * *', // Every 5 minutes
      timezone = 'UTC',
      maxRuns = null,
      removeOnComplete = false,
    } = schedule

    const jobData = {
      id: this.generateJobId(),
      type,
      data,
      schedule: { cron, timezone, maxRuns, removeOnComplete },
      ...options,
      recurring: true,
    }

    const queueName = this.getQueueName(options.priority || 'normal')
    const job = await this.queue.add(queueName, jobData, {
      priority: this.getPriorityValue(options.priority || 'normal'),
      repeat: { cron: schedule.cron, timezone: schedule.timezone },
    })

    this.jobs.set(job.id, {
      ...jobData,
      status: 'scheduled',
      scheduledAt: new Date().toISOString(),
    })

    // eslint-disable-next-line no-console
    console.log(
      `📤 Recurring job scheduled: ${job.id} (${type}) with schedule ${cron}`
    )

    return job.id
  }

  /**
   * Get job status
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Job status
   */
  async getJobStatus(jobId) {
    const job = this.jobs.get(jobId)
    if (!job) {
      throw new Error(`Job ${jobId} not found`)
    }

    // Try to get from queue first
    try {
      const queueJob = await this.queue.getJob('any', jobId)
      if (queueJob) {
        return {
          ...job,
          ...queueJob,
          queueStatus: queueJob.finishedOn ? 'completed' : 'processing',
        }
      }
    } catch (error) {
      // Return stored job status
      return job
    }
  }

  /**
   * Cancel job
   * @param {string} jobId - Job ID
   * @returns {Promise} Cancel result
   */
  async cancelJob(jobId) {
    const job = this.jobs.get(jobId)
    if (!job) {
      throw new Error(`Job ${jobId} not found`)
    }

    try {
      // Remove from queue
      await this.queue.removeJob('any', jobId)

      // Update job status
      job.status = 'cancelled'
      job.cancelledAt = new Date().toISOString()

      // eslint-disable-next-line no-console
      console.log(`❌ Job cancelled: ${jobId}`)

      return { success: true, jobId }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`❌ Failed to cancel job ${jobId}:`, error)
      return { success: false, error: error.message, jobId }
    }
  }

  /**
   * Get scheduler statistics
   * @returns {Object} Scheduler statistics
   */
  async getStats() {
    const queueStats = await this.queue.getAllStats()
    const workerStats = this.workerPool.getStats()

    return {
      scheduler: {
        ...this.stats,
        uptime: this.isRunning ? Date.now() - this.startTime : 0,
        isRunning: this.isRunning,
      },
      queue: queueStats,
      workers: workerStats,
      performance: {
        throughput:
          this.stats.completed > 0
            ? this.stats.completed / ((Date.now() - this.startTime) / 1000)
            : 0,
        avgExecutionTime: this.stats.avgExecutionTime,
        successRate:
          this.stats.completed > 0
            ? (this.stats.completed /
                (this.stats.completed + this.stats.failed)) *
              100
            : 0,
      },
    }
  }

  /**
   * Get queue name based on priority
   * @param {string} priority - Priority level
   * @returns {string} Queue name
   */
  getQueueName(priority) {
    const queueMap = {
      critical: 'critical-jobs',
      high: 'high-priority-jobs',
      normal: 'normal-jobs',
      low: 'low-priority-jobs',
    }

    return queueMap[priority] || queueMap.normal
  }

  /**
   * Get priority value
   * @param {string} priority - Priority level
   * @returns {number} Priority value
   */
  getPriorityValue(priority) {
    const priorityMap = {
      critical: 10,
      high: 8,
      normal: 5,
      low: 2,
    }

    return priorityMap[priority] || 5
  }

  /**
   * Resolve job dependencies
   * @param {Array} jobs - Array of jobs
   * @returns {Array>} Ordered jobs
   */
  resolveDependencies(jobs) {
    const resolved = []
    const visited = new Set()

    const resolveJob = job => {
      if (visited.has(job.id)) return
      visited.add(job.id)

      // Check if all dependencies are resolved
      const allDepsResolved = (job.dependencies || []).every(depId =>
        resolved.some(r => r.id === depId)
      )

      if (allDepsResolved) {
        resolved.push(job)
        // Find jobs that depend on this one
        const dependents = jobs.filter(j =>
          (j.dependencies || []).includes(job.id)
        )
        // Recursively resolve dependents
        const resolvedDependents = dependents.flatMap(d => resolveJob(d))
        resolved.push(...resolvedDependents)
      }
    }

    return jobs
      .filter(job => !visited.has(job.id))
      .flatMap(job => resolveJob(job))
  }

  /**
   * Generate unique job ID
   * @returns {string} Job ID
   */
  generateJobId() {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Shutdown scheduler
   */
  async shutdown() {
    // eslint-disable-next-line no-console
    console.log('🛑 Shutting down job scheduler...')

    this.isRunning = false

    // Shutdown queue and worker pool
    await Promise.all([this.queue.shutdown(), this.workerPool.shutdown()])

    // eslint-disable-next-line no-console
    console.log('✅ Job scheduler shutdown complete')
  }
}

module.exports = JobScheduler
