const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const prisma = require('../config/db');
const calculoService = require('../services/calculo.service');

// Create Redis connection with error handling
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

connection.on('error', (err) => {
  console.error('Redis connection error:', err);
});

connection.on('connect', () => {
  // Redis connected - logging removed for production
});

// Create simulation worker
const simulationWorker = new Worker(
  'simulation',
  async (job) => {
    const { projectId, type, data } = job.data;

    try {
      // Update job status to processing
      await prisma.simulationJob.update({
        where: { id: job.id },
        data: { status: 'processing' }
      });

      let result;

      // Process based on simulation type
      switch (type) {
      case 'icc':
        result = await calculoService.icc(data);
        break;
      case 'icc-motores':
        result = await calculoService.iccConMotores(data);
        break;
      case 'falla-minima':
        result = await calculoService.fallaMinima(data);
        break;
      default:
        throw new Error(`Unknown simulation type: ${type}`);
      }

      // Update job status to completed
      await prisma.simulationJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          result: typeof result === 'object' ? JSON.stringify(result) : String(result),
          completedAt: new Date()
        }
      });

      return { success: true, result };
    } catch (error) {
      // Update job status to failed
      await prisma.simulationJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          error: error.message
        }
      });

      throw error;
    }
  },
  {
    connection,
    concurrency: 5 // Process 5 simulations concurrently
  }
);

// Handle worker events
simulationWorker.on('completed', (job) => {
  // Simulation completed - logging removed for production
});

simulationWorker.on('failed', (job, err) => {
  console.error(`Simulation failed for job ${job?.id}:`, err.message);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await simulationWorker.close();
  await connection.quit();
});

module.exports = simulationWorker;
