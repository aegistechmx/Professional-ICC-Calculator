/**
 * SimulationQueue - Job Queue for Async Simulations
 * 
 * This module implements a job queue system for:
 * - Asynchronous simulation processing
 * - Long-running simulations
 * - Job scheduling and prioritization
 * - Worker management
 * 
 * Architecture:
 * Job → Queue → Worker → Result → Callback
 * 
 * @class SimulationQueue
 */

class SimulationQueue {
  /**
   * Create a new simulation queue
   * @param {Object} options - Queue options
   * @param {Object} options.redis - Redis configuration
   * @param {number} options.concurrency - Number of concurrent workers
   */
  constructor(options = {}) {
    this.options = {
      concurrency: options.concurrency || 2,
      redis: options.redis || {
        host: 'localhost',
        port: 6379
      },
      ...options
    };
    
    // In-memory queue (for development without Redis)
    this.queue = [];
    this.workers = [];
    this.processing = false;
    
    // Job results storage
    this.results = new Map();
  }

  /**
   * Add a simulation job to the queue
   * @param {Object} job - Job configuration
   * @param {string} job.id - Job ID
   * @param {string} job.type - Job type ('powerflow', 'fault', 'dynamic', 'protection')
   * @param {Object} job.data - Job data
   * @param {number} job.priority - Job priority (higher = more important)
   * @param {Function} callback - Callback function
   * @returns {string} Job ID
   */
  addJob(job, callback = null) {
    if (!job.id) {
      job.id = this.generateJobId();
    }
    
    if (!job.priority) {
      job.priority = 0;
    }
    
    if (!job.status) {
      job.status = 'pending';
    }
    
    job.createdAt = Date.now();
    job.callback = callback;
    
    // Add to queue (insert in priority order)
    this.insertByPriority(job);
    
    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }
    
    return job.id;
  }

  /**
   * Insert job into queue by priority
   * @param {Object} job - Job to insert
   */
  insertByPriority(job) {
    let inserted = false;
    
    for (let i = 0; i < this.queue.length; i++) {
      if (job.priority > this.queue[i].priority) {
        this.queue.splice(i, 0, job);
        inserted = true;
        break;
      }
    }
    
    if (!inserted) {
      this.queue.push(job);
    }
  }

  /**
   * Process the job queue
   */
  async processQueue() {
    if (this.processing) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      // Check concurrency limit
      if (this.workers.length >= this.options.concurrency) {
        await this.waitForWorker();
      }
      
      // Get next job
      const job = this.queue.shift();
      job.status = 'processing';
      job.startedAt = Date.now();
      
      // Process job in worker
      const worker = this.processJob(job);
      this.workers.push(worker);
      
      // Wait for worker to complete
      try {
        const result = await worker;
        job.status = 'completed';
        job.completedAt = Date.now();
        job.result = result;
        this.results.set(job.id, job);
        
        // Call callback if provided
        if (job.callback) {
          job.callback(null, result);
        }
      } catch (error) {
        job.status = 'failed';
        job.completedAt = Date.now();
        job.error = error;
        this.results.set(job.id, job);
        
        // Call callback with error
        if (job.callback) {
          job.callback(error, null);
        }
      }
      
      // Remove from workers
      this.workers = this.workers.filter(w => w !== worker);
    }
    
    this.processing = false;
  }

  /**
   * Process a single job
   * @param {Object} job - Job to process
   * @returns {Promise} Job result
   */
  async processJob(job) {
    const { type, data } = job;
    
    switch (type) {
    case 'powerflow':
      return this.processPowerFlow(data);
    case 'fault':
      return this.processFault(data);
    case 'dynamic':
      return this.processDynamic(data);
    case 'protection':
      return this.processProtection(data);
    default:
      throw new Error(`Unknown job type: ${type}`);
    }
  }

  /**
   * Process power flow job
   * @param {Object} data - Power flow data
   * @returns {Promise} Power flow result
   */
  async processPowerFlow(data) {
    // Simulate processing delay
    await this.delay(100);
    
    // In real implementation, this would call the actual power flow solver
    return {
      success: true,
      converged: true,
      iterations: 5,
      buses: data.buses || [],
      timestamp: Date.now()
    };
  }

  /**
   * Process fault analysis job
   * @param {Object} data - Fault data
   * @returns {Promise} Fault analysis result
   */
  async processFault(data) {
    // Simulate processing delay
    await this.delay(150);
    
    return {
      success: true,
      faultType: data.faultType || '3P',
      faultCurrent: 10.5,
      timestamp: Date.now()
    };
  }

  /**
   * Process dynamic simulation job
   * @param {Object} data - Dynamic simulation data
   * @returns {Promise} Dynamic simulation result
   */
  async processDynamic(data) {
    // Simulate processing delay (longer for dynamic)
    await this.delay(500);
    
    return {
      success: true,
      stable: true,
      duration: data.duration || 5.0,
      timeSteps: data.duration / 0.01,
      timestamp: Date.now()
    };
  }

  /**
   * Process protection coordination job
   * @param {Object} data - Protection data
   * @returns {Promise} Protection result
   */
  async processProtection(data) {
    // Simulate processing delay
    await this.delay(200);
    
    return {
      success: true,
      coordinated: true,
      devices: data.devices || [],
      timestamp: Date.now()
    };
  }

  /**
   * Wait for a worker to become available
   * @returns {Promise}
   */
  async waitForWorker() {
    while (this.workers.length >= this.options.concurrency) {
      await this.delay(100);
    }
  }

  /**
   * Delay helper
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get job status
   * @param {string} jobId - Job ID
   * @returns {Object} Job status
   */
  getJobStatus(jobId) {
    const job = this.results.get(jobId);
    
    if (job) {
      return {
        id: job.id,
        status: job.status,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        result: job.result,
        error: job.error
      };
    }
    
    // Check if job is in queue
    const queuedJob = this.queue.find(j => j.id === jobId);
    if (queuedJob) {
      return {
        id: queuedJob.id,
        status: queuedJob.status,
        createdAt: queuedJob.createdAt,
        position: this.queue.indexOf(queuedJob)
      };
    }
    
    return {
      id: jobId,
      status: 'not_found'
    };
  }

  /**
   * Cancel a job
   * @param {string} jobId - Job ID
   * @returns {boolean} True if cancelled
   */
  cancelJob(jobId) {
    // Check if job is in queue
    const queueIndex = this.queue.findIndex(j => j.id === jobId);
    if (queueIndex !== -1) {
      const job = this.queue.splice(queueIndex, 1)[0];
      job.status = 'cancelled';
      this.results.set(jobId, job);
      return true;
    }
    
    // Cannot cancel processing jobs in this simple implementation
    return false;
  }

  /**
   * Get queue statistics
   * @returns {Object} Queue statistics
   */
  getStats() {
    return {
      queueSize: this.queue.length,
      processing: this.workers.length,
      concurrency: this.options.concurrency,
      completed: this.results.size,
      processingStatus: this.processing
    };
  }

  /**
   * Clear the queue
   */
  clearQueue() {
    this.queue.forEach(job => {
      job.status = 'cancelled';
      this.results.set(job.id, job);
    });
    this.queue = [];
  }

  /**
   * Clear completed results
   */
  clearResults() {
    this.results.clear();
  }

  /**
   * Generate unique job ID
   * @returns {string} Job ID
   */
  generateJobId() {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Shutdown the queue
   */
  async shutdown() {
    // Wait for current jobs to complete
    while (this.workers.length > 0) {
      await this.delay(100);
    }
    
    // Cancel remaining jobs
    this.clearQueue();
  }
}

/**
 * SimulationQueue with Redis (Production)
 * Uses Bull for production-grade job queue
 */
class RedisSimulationQueue extends SimulationQueue {
  constructor(options = {}) {
    super(options);
    
    // In production, this would use Bull with Redis
    // For now, we use the in-memory implementation
    console.warn('Redis not configured, using in-memory queue');
  }
}

module.exports = {
  SimulationQueue,
  RedisSimulationQueue
};
