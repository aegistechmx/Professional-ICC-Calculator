const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const prisma = require('../config/db');
const pdfService = require('../services/reporte/pdf.service');

// Create Redis connection
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

// Create PDF generation worker
const pdfWorker = new Worker(
  'pdf-generation',
  async (job) => {
    const { projectId, reportData } = job.data;

    try {
      // Update job status to processing
      await prisma.simulationJob.update({
        where: { id: job.id },
        data: { status: 'processing' }
      });

      // Generate PDF
      const pdfBuffer = await pdfService.generarPDF(reportData);

      // Update job status to completed
      await prisma.simulationJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          result: { pdfSize: pdfBuffer.length },
          completedAt: new Date()
        }
      });

      return { success: true, pdfSize: pdfBuffer.length };
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
    concurrency: 3 // Process 3 PDFs concurrently
  }
);

// Handle worker events
pdfWorker.on('completed', (job) => {
  console.log(`PDF generation completed for job ${job.id}`);
});

pdfWorker.on('failed', (job, err) => {
  console.error(`PDF generation failed for job ${job?.id}:`, err.message);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await pdfWorker.close();
  await connection.quit();
});

module.exports = pdfWorker;
