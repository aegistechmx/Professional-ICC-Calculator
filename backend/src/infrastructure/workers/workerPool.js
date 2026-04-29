/**
 * infrastructure/workers/workerPool.js - Professional worker pool management
 * 
 * Responsibility: Efficient parallel processing with resource management
 */

const { Worker } = require('worker_threads');
const os = require('os');

class WorkerPool {
  constructor(workerFile, options = {}) {
    this.workerFile = workerFile;
    this.maxSize = options.maxSize || os.cpus().length;
    this.minSize = options.minSize || 2;
    this.workers = [];
    this.queue = [];
    this.active = 0;
    this.taskId = 0;
    this.stats = {
      created: 0,
      completed: 0,
      failed: 0,
      avgTime: 0,
      maxTime: 0,
      minTime: Infinity
    };
  }

  /**
   * Create new worker
   * @returns {Worker} Worker instance
   */
  createWorker() {
    return new Worker(this.workerFile, {
      resourceLimits: {
        maxOldGenerationSize: 16 * 1024 * 1024 // 16MB
      }
    });
  }

  /**
   * Initialize worker pool
   */
  async initialize() {
    console.log(`🚀 Initializing worker pool (size: ${this.minSize}-${this.maxSize})`);
    
    // Create minimum workers
    for (let i = 0; i < this.minSize; i++) {
      this.workers.push(this.createWorker());
    }

    console.log(`✅ Worker pool initialized with ${this.minSize} workers`);
  }

  /**
   * Execute task with worker
   * @param {Object} task - Task to execute
   * @returns {Promise} Task result
   */
  async execute(task) {
    return new Promise((resolve, reject) => {
      this.taskId++;
      const taskId = this.taskId;
      
      const taskWrapper = {
        id: taskId,
        task,
        resolve,
        reject,
        startTime: Date.now()
      };

      this.queue.push(taskWrapper);
      this.processQueue();
    });
  }

  /**
   * Process task queue
   */
  processQueue() {
    // Scale workers based on queue length
    const targetWorkers = Math.min(
      this.maxSize,
      Math.max(this.minSize, Math.ceil(this.queue.length / 2))
    );

    // Add workers if needed
    while (this.workers.length < targetWorkers) {
      this.workers.push(this.createWorker());
      this.stats.created++;
    }

    // Remove excess workers
    while (this.workers.length > targetWorkers) {
      const worker = this.workers.pop();
      worker.terminate();
    }

    // Assign tasks to available workers
    while (this.queue.length > 0 && this.active < this.workers.length) {
      const taskWrapper = this.queue.shift();
      const worker = this.workers[this.active];
      
      this.active++;

      worker.once('message', (result) => {
        const duration = Date.now() - taskWrapper.startTime;
        
        // Update statistics
        this.stats.completed++;
        this.stats.avgTime = (this.stats.avgTime * (this.stats.completed - 1) + duration) / this.stats.completed;
        this.stats.maxTime = Math.max(this.stats.maxTime, duration);
        this.stats.minTime = Math.min(this.stats.minTime, duration);
        
        this.active--;
        taskWrapper.resolve(result);
        
        // Process next task
        this.processQueue();
      });

      worker.once('error', (error) => {
        this.stats.failed++;
        this.active--;
        taskWrapper.reject(error);
        
        // Process next task
        this.processQueue();
      });

      worker.once('exit', () => {
        this.active--;
        console.error(`❌ Worker exited unexpectedly for task ${taskWrapper.id}`);
      });

      worker.postMessage(taskWrapper.task);
    }
  }

  /**
   * Execute multiple tasks in parallel
   * @param {Array} tasks - Tasks to execute
   * @returns {Promise<Array>} Results
   */
  async executeAll(tasks) {
    console.log(`🚀 Executing ${tasks.length} tasks in parallel...`);
    
    const promises = tasks.map(task => this.execute(task));
    const results = await Promise.all(promises);
    
    console.log(`✅ Completed ${tasks.length} parallel tasks`);
    return results;
  }

  /**
   * Execute tasks with concurrency limit
   * @param {Array} tasks - Tasks to execute
   * @param {number} concurrency - Maximum concurrent tasks
   * @returns {Promise<Array>} Results
   */
  async executeWithLimit(tasks, concurrency = this.maxSize) {
    console.log(`🚀 Executing ${tasks.length} tasks with concurrency ${concurrency}...`);
    
    const results = [];
    for (let i = 0; i < tasks.length; i += concurrency) {
      const batch = tasks.slice(i, i + concurrency);
      const batchResults = await this.executeAll(batch);
      results.push(...batchResults);
    }
    
    console.log(`✅ Completed ${tasks.length} tasks with limited concurrency`);
    return results;
  }

  /**
   * Get pool statistics
   * @returns {Object} Pool statistics
   */
  getStats() {
    return {
      ...this.stats,
      queueLength: this.queue.length,
      activeWorkers: this.active,
      totalWorkers: this.workers.length,
      utilization: (this.active / this.workers.length * 100).toFixed(1) + '%'
    };
  }

  /**
   * Shutdown worker pool
   */
  async shutdown() {
    console.log('🛑 Shutting down worker pool...');
    
    // Wait for all active tasks to complete
    while (this.active > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Terminate all workers
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    
    console.log('✅ Worker pool shutdown complete');
  }

  /**
   * Get detailed status
   * @returns {Object} Detailed status
   */
  getStatus() {
    return {
      initialized: this.workers.length > 0,
      workers: {
        total: this.workers.length,
        active: this.active,
        idle: this.workers.length - this.active
      },
      queue: {
        length: this.queue.length,
        oldest: this.queue.length > 0 ? this.queue[0].id : null
      },
      performance: {
        throughput: this.stats.completed / (Date.now() - this.stats.startTime) * 1000, // tasks/sec
        avgTaskTime: this.stats.avgTime,
        successRate: (this.stats.completed / (this.stats.completed + this.stats.failed) * 100).toFixed(1) + '%'
      }
    };
  }
}

module.exports = WorkerPool;
