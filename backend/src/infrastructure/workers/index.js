/**
 * infrastructure/workers/index.js - Worker infrastructure
 * 
 * Responsibility: Background processing and parallel execution
 */

const { Worker } = require('worker_threads');
const path = require('path');

/**
 * Create worker for heavy computations
 * @param {string} workerType - Type of worker
 * @param {Object} options - Worker options
 * @returns {Promise} Worker result
 */
function createWorker(workerType, options = {}) {
  return new Promise((resolve, reject) => {
    let worker;
    
    try {
      // Select worker script based on type
      const workerScript = getWorkerScript(workerType);
      
      worker = new Worker(workerScript, {
        workerData: options
      });

      worker.on('message', (result) => {
        resolve(result);
      });

      worker.on('error', (error) => {
        reject(error);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get worker script path
 * @param {string} workerType - Type of worker
 * @returns {string} Worker script path
 */
function getWorkerScript(workerType) {
  const workerScripts = {
    'powerflow': path.join(__dirname, 'powerflow.worker.js'),
    'opf': path.join(__dirname, 'opf.worker.js'),
    'contingency': path.join(__dirname, 'contingency.worker.js'),
    'ts-scopf': path.join(__dirname, 'ts-scopf.worker.js')
  };

  const script = workerScripts[workerType];
  if (!script) {
    throw new Error(`Unknown worker type: ${workerType}`);
  }

  return script;
}

/**
 * Run parallel computations
 * @param {Array} tasks - Array of tasks
 * @param {string} workerType - Type of worker
 * @param {Object} options - Worker options
 * @returns {Promise<Array>} Results
 */
async function runParallel(tasks, workerType, options = {}) {
  const promises = tasks.map(task => 
    createWorker(workerType, { ...options, task })
  );

  try {
    const results = await Promise.all(promises);
    return results;
  } catch (error) {
    throw new Error(`Parallel execution failed: ${error.message}`);
  }
}

/**
 * Worker manager for managing multiple workers
 */
class WorkerManager {
  constructor(maxWorkers = 4) {
    this.maxWorkers = maxWorkers;
    this.workers = new Map();
    this.taskQueue = [];
  }

  /**
   * Execute task with worker
   * @param {Object} task - Task to execute
   * @param {string} workerType - Type of worker
   * @returns {Promise} Task result
   */
  async execute(task, workerType) {
    if (this.workers.size >= this.maxWorkers) {
      // Queue task if max workers reached
      return new Promise((resolve, reject) => {
        this.taskQueue.push({ task, workerType, resolve, reject });
      });
    }

    return this.createAndExecuteWorker(task, workerType);
  }

  /**
   * Create and execute worker
   * @param {Object} task - Task to execute
   * @param {string} workerType - Type of worker
   * @returns {Promise} Task result
   */
  async createAndExecuteWorker(task, workerType) {
    const workerId = this.generateWorkerId();
    
    try {
      const result = await createWorker(workerType, { ...task, workerId });
      this.workers.set(workerId, { task, workerType });
      
      // Process queued tasks
      this.processQueue();
      
      return result;
    } finally {
      this.workers.delete(workerId);
    }
  }

  /**
   * Process queued tasks
   */
  processQueue() {
    if (this.taskQueue.length > 0 && this.workers.size < this.maxWorkers) {
      const { task, workerType, resolve, reject } = this.taskQueue.shift();
      this.createAndExecuteWorker(task, workerType)
        .then(resolve)
        .catch(reject);
    }
  }

  /**
   * Generate unique worker ID
   * @returns {string} Worker ID
   */
  generateWorkerId() {
    return `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get worker statistics
   * @returns {Object} Worker statistics
   */
  getStats() {
    return {
      activeWorkers: this.workers.size,
      maxWorkers: this.maxWorkers,
      queuedTasks: this.taskQueue.length
    };
  }
}

module.exports = {
  createWorker,
  runParallel,
  WorkerManager
};
