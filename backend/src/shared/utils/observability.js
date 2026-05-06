const { toElectricalPrecision, formatElectricalValue } = require('../../utils/electricalUtils');
/**
 * shared/utils/observability.js - Observabilidad Enterprise
 * Métricas, logs estructurados y monitoring
 */

/* eslint-disable no-console */
class ObservabilityService {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        error: 0,
        byEndpoint: {},
        byMethod: {},
        avgResponseTime: 0
      },
      calculations: {
        total: 0,
        byMode: { fast: 0, engineering: 0, optimization: 0, simulation: 0 },
        avgCalculationTime: 0,
        cacheHitRate: 0,
        workerUtilization: 0
      },
      system: {
        uptime: Date.now(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: 0,
        activeWorkers: 0,
        queueSize: 0
      },
      errors: {
        total: 0,
        byType: {},
        byEndpoint: {},
        recent: []
      }
    };

    this.timers = new Map();
    this.startTime = Date.now();
  }

  /**
   * Iniciar timer para medir performance
   */
  startTimer(operation, context = {}) {
    const timerId = `${operation}_${Date.now()}`;
    this.timers.set(timerId, {
      operation,
      context,
      startTime: process.hrtime.bigint(),
      startTimestamp: Date.now()
    });

    return timerId;
  }

  /**
   * Finalizar timer y registrar métrica
   */
  endTimer(timerId, result = {}) {
    const timer = this.timers.get(timerId);
    if (!timer) return null;

    const endTime = process.hrtime.bigint();
    const duration = toElectricalPrecision(Number(endTime - timer.startTime)) / 1000000; // Convertir a ms

    // Registrar métrica
    this.recordMetric(timer.operation, duration, {
      ...timer.context,
      ...result
    });

    // Limpiar timer
    this.timers.delete(timerId);

    return {
      operation: timer.operation,
      duration: `${duration.toFixed(2)}ms`,
      context: timer.context
    };
  }

  /**
   * Registrar métrica específica
   */
  recordMetric(operation, duration, context = {}) {
    // Actualizar métricas de requests
    if (operation.startsWith('request_')) {
      this.metrics.requests.total++;

      if (context.success) {
        this.metrics.requests.success++;
      } else {
        this.metrics.requests.error++;
      }

      // Por endpoint
      const endpoint = context.endpoint || 'unknown';
      this.metrics.requests.byEndpoint[endpoint] =
        (this.metrics.requests.byEndpoint[endpoint] || 0) + 1;

      // Por método
      const method = context.method || 'unknown';
      this.metrics.requests.byMethod[method] =
        (this.metrics.requests.byMethod[method] || 0) + 1;

      // Actualizar tiempo promedio
      this.updateAvgResponseTime(duration);
    }

    // Actualizar métricas de cálculos
    if (operation.startsWith('calculation_')) {
      this.metrics.calculations.total++;

      const mode = context.mode || 'unknown';
      if (this.metrics.calculations.byMode[mode] !== undefined) {
        this.metrics.calculations.byMode[mode]++;
      }

      this.updateAvgCalculationTime(duration);

      if (context.cached) {
        this.updateCacheHitRate(true);
      } else {
        this.updateCacheHitRate(false);
      }
    }

    // Log estructurado
    this.logMetric(operation, duration, context);
  }

  /**
   * Log estructurado de métrica
   */
  logMetric(operation, duration, context) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: context.success !== false ? 'info' : 'error',
      operation,
      duration: `${duration.toFixed(2)}ms`,
      context,
      system: {
        uptime: Date.now() - this.startTime,
        memory: process.memoryUsage(),
        pid: process.pid
      }
    };

    // eslint-disable-next-line no-console
    console.log(JSON.stringify(logEntry));
  }

  /**
   * Registrar error
   */
  recordError(error, context = {}) {
    this.metrics.errors.total++;

    const errorType = error.name || 'UnknownError';
    this.metrics.errors.byType[errorType] =
      (this.metrics.errors.byType[errorType] || 0) + 1;

    const endpoint = context.endpoint || 'unknown';
    this.metrics.errors.byEndpoint[endpoint] =
      (this.metrics.errors.byEndpoint[endpoint] || 0) + 1;

    // Agregar a errores recientes (máx 50)
    this.metrics.errors.recent.unshift({
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      context,
      errorType
    });

    if (this.metrics.errors.recent.length > 50) {
      this.metrics.errors.recent = this.metrics.errors.recent.slice(0, 50);
    }

    // Log estructurado de error
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      error: {
        message: error.message,
        stack: error.stack,
        type: errorType
      },
      context,
      system: {
        uptime: Date.now() - this.startTime,
        memory: process.memoryUsage(),
        pid: process.pid
      }
    };

    console.error(JSON.stringify(logEntry));
  }

  /**
   * Actualizar tiempo promedio de respuesta
   */
  updateAvgResponseTime(newDuration) {
    const total = this.metrics.requests.total;
    const current = this.metrics.requests.avgResponseTime; // current (A)

    this.metrics.requests.avgResponseTime =
      ((current * (total - 1)) + newDuration) / total;
  }

  /**
   * Actualizar tiempo promedio de cálculo
   */
  updateAvgCalculationTime(newDuration) {
    const _total = this.metrics.calculations.total;
    const current = this.metrics.calculations.avgCalculationTime; // current (A)

    this.metrics.calculations.avgCalculationTime =
      ((current * (_total - 1)) + newDuration) / _total;
  }

  /**
   * Actualizar cache hit rate
   */
  updateCacheHitRate(hit) {
    // Implementación simple de cache hit rate
    const _total = this.metrics.calculations.total;
    if (hit) {
      // Incrementar cache hits (simplificado)
    }
  }

  /**
   * Actualizar métricas del sistema
   */
  updateSystemMetrics() {
    this.metrics.system.memoryUsage = process.memoryUsage();
    this.metrics.system.uptime = Date.now() - this.startTime;

    // CPU usage (simplificado)
    const cpuUsage = process.cpuUsage();
    this.metrics.system.cpuUsage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convertir a segundos
  }

  /**
   * Actualizar métricas de workers
   */
  updateWorkerMetrics(activeWorkers, queueSize = 0) {
    this.metrics.system.activeWorkers = activeWorkers;
    this.metrics.system.queueSize = queueSize;
    this.metrics.calculations.workerUtilization =
      activeWorkers > 0 ? (activeWorkers / 4) * 100 : 0; // Asumiendo 4 workers max
  }

  /**
   * Obtener todas las métricas
   */
  getMetrics() {
    this.updateSystemMetrics();

    return {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      activeTimers: this.timers.size
    };
  }

  /**
   * Obtener métricas de health check
   */
  getHealthMetrics() {
    this.updateSystemMetrics();

    const errorRate = this.metrics.requests.total > 0
      ? (this.metrics.requests.error / this.metrics.requests.total) * 100
      : 0;

    const avgResponseTime = this.metrics.requests.avgResponseTime;
    const memoryUsage = this.metrics.system.memoryUsage;

    // Determinar status de salud
    let status = 'healthy';
    let issues = [];

    if (errorRate > 10) {
      status = 'degraded';
      issues.push(`High error rate: ${errorRate.toFixed(2)}%`);
    }

    if (avgResponseTime > 5000) {
      status = 'degraded';
      issues.push(`High response time: ${avgResponseTime.toFixed(2)}ms`);
    }

    if (memoryUsage.heapUsed > memoryUsage.heapTotal * 0.9) {
      status = 'critical';
      issues.push('High memory usage');
    }

    return {
      status,
      issues,
      metrics: {
        errorRate: `${errorRate.toFixed(2)}%`,
        avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
        memoryUsage: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        uptime: `${(this.metrics.system.uptime / 1000 / 60).toFixed(2)}min`,
        totalRequests: this.metrics.requests.total,
        totalCalculations: this.metrics.calculations.total,
        activeWorkers: this.metrics.system.activeWorkers
      }
    };
  }

  /**
   * Crear dashboard de métricas
   */
  getDashboard() {
    const metrics = this.getMetrics();
    const health = this.getHealthMetrics();

    return {
      overview: {
        status: health.status,
        uptime: metrics.uptime,
        timestamp: metrics.timestamp
      },
      performance: {
        requests: {
          total: metrics.requests.total,
          success: metrics.requests.success,
          error: metrics.requests.error,
          avgResponseTime: `${metrics.requests.avgResponseTime.toFixed(2)}ms`,
          successRate: metrics.requests.total > 0
            ? `${((metrics.requests.success / metrics.requests.total) * 100).toFixed(2)}%`
            : '0%'
        },
        calculations: {
          total: metrics.calculations.total,
          avgTime: `${metrics.calculations.avgCalculationTime.toFixed(2)}ms`,
          byMode: metrics.calculations.byMode,
          workerUtilization: `${metrics.calculations.workerUtilization.toFixed(2)}%`
        }
      },
      system: {
        memory: {
          used: `${(metrics.system.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
          total: `${(metrics.system.memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
          usage: `${((metrics.system.memoryUsage.heapUsed / metrics.system.memoryUsage.heapTotal) * 100).toFixed(2)}%`
        },
        workers: {
          active: metrics.system.activeWorkers,
          queueSize: metrics.system.queueSize
        }
      },
      errors: {
        total: metrics.errors.total,
        recent: metrics.errors.recent.slice(0, 10),
        byType: metrics.errors.byType,
        byEndpoint: metrics.errors.byEndpoint
      }
    };
  }

  /**
   * Resetear métricas
   */
  resetMetrics() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        error: 0,
        byEndpoint: {},
        byMethod: {},
        avgResponseTime: 0
      },
      calculations: {
        total: 0,
        byMode: { fast: 0, engineering: 0, optimization: 0, simulation: 0 },
        avgCalculationTime: 0,
        cacheHitRate: 0,
        workerUtilization: 0
      },
      system: {
        uptime: Date.now(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: 0,
        activeWorkers: 0,
        queueSize: 0
      },
      errors: {
        total: 0,
        byType: {},
        byEndpoint: {},
        recent: []
      }
    };

    this.startTime = Date.now();
    console.log('[OBSERVABILITY] Metrics reset');
  }
}

// Singleton instance
const observabilityService = new ObservabilityService();

// Actualizar métricas del sistema periódicamente
setInterval(() => {
  observabilityService.updateSystemMetrics();
}, 30000); // Cada 30 segundos

module.exports = {
  startTimer: (operation, context) => observabilityService.startTimer(operation, context),
  endTimer: (timerId, result) => observabilityService.endTimer(timerId, result),
  recordError: (error, context) => observabilityService.recordError(error, context),
  recordMetric: (operation, duration, context) => observabilityService.recordMetric(operation, duration, context),
  updateWorkerMetrics: (activeWorkers, queueSize) => observabilityService.updateWorkerMetrics(activeWorkers, queueSize),
  getMetrics: () => observabilityService.getMetrics(),
  getHealthMetrics: () => observabilityService.getHealthMetrics(),
  getDashboard: () => observabilityService.getDashboard(),
  resetMetrics: () => observabilityService.resetMetrics()
};
