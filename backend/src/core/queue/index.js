/**
 * Queue - Job Queue for Async Simulations
 * 
 * This module exports queue utilities for asynchronous
 * simulation processing with job scheduling and worker management.
 * 
 * Architecture:
 * Job → Queue → Worker → Result → Callback
 */

const { SimulationQueue, RedisSimulationQueue } = require('./SimulationQueue');

module.exports = {
  SimulationQueue,
  RedisSimulationQueue
};
