const { toElectricalPrecision, formatElectricalValue } = require('../../utils/electricalUtils');
/**
 * infrastructure/middleware/security.middleware.js - Seguridad Básica
 * Rate limiting, validación y sanitización de datos
 */

/* eslint-disable no-console */
const rateLimit = require('express-rate-limit');
const { validateICCInput, validateSystemInput, validateAmpacityInput, sanitizeInput } = require('../../shared/utils/validator');

class SecurityMiddleware {
  constructor() {
    this.rateLimiters = this.createRateLimiters();
    this.requestCounts = new Map();
  }

  /**
   * Crear rate limiters para diferentes endpoints
   */
  createRateLimiters() {
    return {
      // Límite general para API
      general: rateLimit({
        windowMs: toElectricalPrecision(15 * 60) * 1000, // 15 minutos
        max: 1000, // 1000 requests por 15 minutos
        message: {
          success: false,
          error: 'Too many requests, please try again later',
          retryAfter: '15 minutes'
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
          console.warn(`[SECURITY] Rate limit exceeded for IP: ${req.ip}`);
          res.status(429).json({
            success: false,
            error: 'Too many requests, please try again later',
            retryAfter: '15 minutes'
          });
        }
      }),

      // Límite estricto para cálculos pesados
      calculations: rateLimit({
        windowMs: toElectricalPrecision(1 * 60) * 1000, // 1 minuto
        max: 10, // 10 cálculos por minuto
        message: {
          success: false,
          error: 'Calculation rate limit exceeded',
          retryAfter: '1 minute'
        },
        keyGenerator: (req) => req.ip,
        handler: (req, res) => {
          console.warn(`[SECURITY] Calculation rate limit exceeded for IP: ${req.ip}`);
          res.status(429).json({
            success: false,
            error: 'Calculation rate limit exceeded',
            retryAfter: '1 minute'
          });
        }
      }),

      // Límite para jobs asíncronos
      jobs: rateLimit({
        windowMs: toElectricalPrecision(5 * 60) * 1000, // 5 minutos
        max: 20, // 20 jobs por 5 minutos
        message: {
          success: false,
          error: 'Job creation rate limit exceeded',
          retryAfter: '5 minutes'
        },
        handler: (req, res) => {
          console.warn(`[SECURITY] Job rate limit exceeded for IP: ${req.ip}`);
          res.status(429).json({
            success: false,
            error: 'Job creation rate limit exceeded',
            retryAfter: '5 minutes'
          });
        }
      })
    };
  }

  /**
   * Middleware de rate limiting general
   */
  rateLimitGeneral() {
    return this.rateLimiters.general;
  }

  /**
   * Middleware de rate limiting para cálculos
   */
  rateLimitCalculations() {
    return this.rateLimiters.calculations;
  }

  /**
   * Middleware de rate limiting para jobs
   */
  rateLimitJobs() {
    return this.rateLimiters.jobs;
  }

  /**
   * Middleware de validación para ICC
   */
  validateICC(req, res, next) {
    try {
      // Sanitizar input primero
      const sanitizedInput = sanitizeInput(req.body);
      req.body = sanitizedInput;

      // Validar input
      validateICCInput(req.body);

      console.log(`[SECURITY] ICC validation passed for IP: ${req.ip}`);
      next();

    } catch (error) {
      console.warn(`[SECURITY] ICC validation failed for IP: ${req.ip}:`, error.message);

      res.status(400).json({
        success: false,
        error: error.message,
        type: 'validation_error'
      });
    }
  }

  /**
   * Middleware de validación para sistema completo
   */
  validateSystem(req, res, next) {
    try {
      // Sanitizar input primero
      const sanitizedInput = sanitizeInput(req.body);
      req.body = sanitizedInput;

      // Validar input
      validateSystemInput(req.body);

      console.log(`[SECURITY] System validation passed for IP: ${req.ip}`);
      next();

    } catch (error) {
      console.warn(`[SECURITY] System validation failed for IP: ${req.ip}:`, error.message);

      res.status(400).json({
        success: false,
        error: error.message,
        type: 'validation_error'
      });
    }
  }

  /**
   * Middleware de validación para ampacidad
   */
  validateAmpacity(req, res, next) {
    try {
      // Sanitizar input primero
      const sanitizedInput = sanitizeInput(req.body);
      req.body = sanitizedInput;

      // Validar input
      validateAmpacityInput(req.body);

      console.log(`[SECURITY] Ampacity validation passed for IP: ${req.ip}`);
      next();

    } catch (error) {
      console.warn(`[SECURITY] Ampacity validation failed for IP: ${req.ip}:`, error.message);

      res.status(400).json({
        success: false,
        error: error.message,
        type: 'validation_error'
      });
    }
  }

  /**
   * Middleware de sanitización de query params
   */
  sanitizeQuery(req, res, next) {
    if (req.query) {
      const sanitizedQuery = {};

      // Solo permitir parámetros conocidos
      const allowedParams = ['mode', 'limit', 'offset', 'status', 'dateFrom', 'dateTo'];

      for (const param of allowedParams) {
        if (req.query[param] !== undefined) {
          sanitizedQuery[param] = req.query[param];
        }
      }

      req.query = sanitizedQuery;
    }

    next();
  }

  /**
   * Middleware de logging de seguridad
   */
  securityLogger(req, res, next) {
    const startTime = Date.now();

    // Log de request
    console.log(`[SECURITY] Request: ${req.method} ${req.url} from IP: ${req.ip}`);

    // Override res.json para log de respuesta
    const originalJson = res.json;
    res.json = function (data) {
      const duration = Date.now() - startTime;

      console.log(`[SECURITY] Response: ${res.statusCode} in ${duration}ms for IP: ${req.ip}`);

      // Log de respuestas de error
      if (res.statusCode >= 400) {
        console.warn(`[SECURITY] Error response: ${res.statusCode} - ${data.error || 'Unknown error'}`);
      }

      return originalJson.call(this, data);
    };

    next();
  }

  /**
   * Middleware de headers de seguridad
   */
  securityHeaders(req, res, next) {
    // Headers de seguridad
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'");

    // Headers de CORS (ajustar según necesidad)
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 horas

    next();
  }

  /**
   * Middleware de detección de patrones sospechosos
   */
  suspiciousPatternDetection(req, res, next) {
    const ip = req.ip;
    const now = Date.now();

    // Obtener contador de requests
    let counter = this.requestCounts.get(ip) || { count: 0, resetTime: now + 60000 };

    // Resetear si pasó el tiempo
    if (now > counter.resetTime) {
      counter = { count: 0, resetTime: now + 60000 };
    }

    counter.count++;
    this.requestCounts.set(ip, counter);

    // Detectar patrones sospechosos
    if (counter.count > 100) { // Más de 100 requests por minuto
      console.warn(`[SECURITY] Suspicious activity detected from IP: ${ip} (${counter.count} requests/minute)`);

      // Podrías implementar bloqueo temporal aquí
      if (counter.count > 200) {
        return res.status(429).json({
          success: false,
          error: 'Suspicious activity detected, temporarily blocked',
          retryAfter: '1 minute'
        });
      }
    }

    next();
  }

  /**
   * Middleware de validación de tamaño de payload
   */
  payloadSizeLimit(req, res, next) {
    const contentLength = req.get('Content-Length');
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (contentLength && parseInt(contentLength) > maxSize) {
      console.warn(`[SECURITY] Payload too large from IP: ${req.ip} (${contentLength} bytes)`);
      return res.status(413).json({
        success: false,
        error: 'Payload too large',
        maxSize: '10MB'
      });
    }

    next();
  }

  /**
   * Obtener estadísticas de seguridad
   */
  getSecurityStats() {
    const now = Date.now();
    let activeIPs = 0;
    let totalRequests = 0;

    for (const [_ip, counter] of this.requestCounts) {
      if (now <= counter.resetTime) {
        activeIPs++;
        totalRequests += counter.count;
      }
    }

    return {
      activeIPs,
      totalRequests,
      rateLimiters: {
        general: this.rateLimiters.general,
        calculations: this.rateLimiters.calculations,
        jobs: this.rateLimiters.jobs
      }
    };
  }

  /**
   * Limpiar contadores viejos
   */
  cleanup() {
    const now = Date.now();

    for (const [ip, counter] of this.requestCounts) {
      if (now > counter.resetTime) {
        this.requestCounts.delete(ip);
      }
    }
  }
}

// Singleton instance
const securityMiddleware = new SecurityMiddleware();

// Cleanup periódico
setInterval(() => {
  securityMiddleware.cleanup();
}, 60000); // Cada minuto

module.exports = {
  rateLimitGeneral: () => securityMiddleware.rateLimitGeneral(),
  rateLimitCalculations: () => securityMiddleware.rateLimitCalculations(),
  rateLimitJobs: () => securityMiddleware.rateLimitJobs(),
  validateICC: (req, res, next) => securityMiddleware.validateICC(req, res, next),
  validateSystem: (req, res, next) => securityMiddleware.validateSystem(req, res, next),
  validateAmpacity: (req, res, next) => securityMiddleware.validateAmpacity(req, res, next),
  sanitizeQuery: (req, res, next) => securityMiddleware.sanitizeQuery(req, res, next),
  securityLogger: (req, res, next) => securityMiddleware.securityLogger(req, res, next),
  securityHeaders: (req, res, next) => securityMiddleware.securityHeaders(req, res, next),
  suspiciousPatternDetection: (req, res, next) => securityMiddleware.suspiciousPatternDetection(req, res, next),
  payloadSizeLimit: (req, res, next) => securityMiddleware.payloadSizeLimit(req, res, next),
  getSecurityStats: () => securityMiddleware.getSecurityStats()
};
