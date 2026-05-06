const { toElectricalPrecision, formatElectricalValue } = require('../../utils/electricalUtils');
/**
 * infrastructure/workers/system.worker.js - Worker Real para Cálculos Pesados
 * CRÍTICO: GA, IA, autocorrección NO corren en thread principal
 */

/* eslint-disable no-console */
const { parentPort } = require('worker_threads');
const ElectricalCalculationDomain = require('../../domain/services/electricalCalculation.domain');

// Inicializar domain service
const domain = new ElectricalCalculationDomain();

// Manejar mensajes del thread principal
parentPort.on('message', async (job) => {
  const startTime = process.hrtime.bigint();

  try {
    console.log(`[WORKER] Iniciando job ID: ${job.id || 'unknown'}`);
    console.log(`[WORKER] Modo: ${job.options?.mode || 'engineering'}`);

    // Ejecutar cálculo pesado en worker
    const result = await domain.executePipeline(job.input, job.options);

    const endTime = process.hrtime.bigint();
    const duration = toElectricalPrecision(Number(endTime - startTime)) / 1000000; // Convertir a ms

    // Enviar resultado exitoso
    parentPort.postMessage({
      success: true,
      jobId: job.id,
      result: {
        ...result,
        performance: {
          workerThread: true,
          duration: `${duration.toFixed(2)}ms`,
          timestamp: new Date().toISOString()
        }
      }
    });

    console.log(`[WORKER] Job ${job.id || 'unknown'} completado en ${duration.toFixed(2)}ms`);

  } catch (error) {
    const endTime = process.hrtime.bigint();
    const duration = toElectricalPrecision(Number(endTime - startTime)) / 1000000;

    console.error(`[WORKER] Error en job ${job.id || 'unknown'}:`, error.message);

    // Enviar error
    parentPort.postMessage({
      success: false,
      jobId: job.id,
      error: {
        message: error.message,
        stack: error.stack,
        duration: `${duration.toFixed(2)}ms`,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Manejar errores del worker
process.on('uncaughtException', (error) => {
  console.error('[WORKER] Uncaught Exception:', error);
  parentPort.postMessage({
    success: false,
    error: {
      message: 'Worker uncaught exception',
      details: error.message
    }
  });
});

process.on('unhandledRejection', (reason, _promise) => {
  console.error('[WORKER] Unhandled Rejection:', reason);
  parentPort.postMessage({
    success: false,
    error: {
      message: 'Worker unhandled rejection',
      details: reason
    }
  });
});

// Salud del worker
parentPort.on('message', (job) => {
  if (job.type === 'health') {
    parentPort.postMessage({
      type: 'health',
      status: 'healthy',
      domain: domain.getInfo(),
      workerId: process.pid,
      timestamp: new Date().toISOString()
    });
  }
});

console.log('[WORKER] System worker initialized');
