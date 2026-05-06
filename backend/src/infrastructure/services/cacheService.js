const { toElectricalPrecision, formatElectricalValue } = require('../../utils/electricalUtils');
/**
 * infrastructure/services/cacheService.js - Caché Inteligente
 * Cache basado en hash para evitar cálculos repetidos
 */

/* eslint-disable no-console */
const crypto = require('crypto');

class CacheService {
  constructor() {
    this.cache = new Map();
    this.maxSize = 1000; // Máximo 1000 entradas en cache
    this.hitCount = 0;
    this.missCount = 0;
    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      hitRate: 0
    };
  }

  /**
   * Generar hash único para input
   * @param {Object} input - Datos de entrada
   * @returns {string} Hash MD5 del input
   */
  hashInput(input) {
    // Normalizar input para hash consistente
    const normalizedInput = this.normalizeForHash(input);
    const inputString = JSON.stringify(normalizedInput);

    return crypto
      .createHash('md5')
      .update(inputString)
      .digest('hex');
  }

  /**
   * Normalizar input para hashing consistente
   */
  normalizeForHash(input) {
    const normalized = {};

    // Ordenar claves y remover campos irrelevantes
    const keys = Object.keys(input).sort();

    for (const key of keys) {
      if (key !== 'timestamp' && key !== 'jobId') {
        normalized[key] = input[key];
      }
    }

    return normalized;
  }

  /**
   * Obtener del cache
   * @param {string} key - Clave del cache
   * @returns {Object|null} Datos cacheados o null
   */
  get(key) {
    this.stats.totalRequests++;

    const entry = this.cache.get(key);

    if (entry && !this.isExpired(entry)) {
      this.stats.cacheHits++;
      this.hitCount++;

      // Actualizar LRU (mover al final)
      this.cache.delete(key);
      this.cache.set(key, entry);

      console.log(`[CACHE] HIT for key: ${key.substring(0, 8)}...`);
      return entry.data;
    }

    this.stats.cacheMisses++;
    this.missCount++;

    if (entry) {
      // Remover entrada expirada
      this.cache.delete(key);
      console.log(`[CACHE] EXPIRED for key: ${key.substring(0, 8)}...`);
    } else {
      console.log(`[CACHE] MISS for key: ${key.substring(0, 8)}...`);
    }

    return null;
  }

  /**
   * Guardar en cache
   * @param {string} key - Clave del cache
   * @param {Object} data - Datos a cachear
   * @param {number} ttl - Time to live en segundos (opcional)
   */
  set(key, data, ttl = 3600) {
    // Verificar tamaño máximo
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const entry = {
      data,
      timestamp: Date.now(),
      ttl: ttl * 1000, // Convertir a milisegundos
      accessCount: 1
    };

    this.cache.set(key, entry);
    console.log(`[CACHE] SET for key: ${key.substring(0, 8)}..., TTL: ${ttl}s`);
  }

  /**
   * Verificar si entrada está expirada
   */
  isExpired(entry) {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Evictar entrada menos usada (LRU)
   */
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`[CACHE] EVICTED LRU key: ${oldestKey.substring(0, 8)}...`);
    }
  }

  /**
   * Calcular con cache
   * @param {Object} input - Datos de entrada
   * @param {Function} calculationFunction - Función de cálculo
   * @param {Object} options - Opciones (ttl, etc.)
   * @returns {Promise<Object>} Resultado (cacheado o calculado)
   */
  async calcularConCache(input, calculationFunction, options = {}) {
    const key = this.hashInput(input);
    const ttl = options.ttl || 3600;

    // Intentar obtener del cache
    const cached = this.get(key);
    if (cached) {
      return {
        cached: true,
        data: cached,
        cacheKey: key,
        hitRate: this.getHitRate()
      };
    }

    // Ejecutar cálculo
    console.log(`[CACHE] Executing calculation for key: ${key.substring(0, 8)}...`);
    const result = await calculationFunction(input, options);

    // Guardar en cache
    this.set(key, result, ttl);

    return {
      cached: false,
      data: result,
      cacheKey: key,
      hitRate: this.getHitRate()
    };
  }

  /**
   * Limpiar cache
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`[CACHE] CLEARED ${size} entries`);
  }

  /**
   * Limpiar entradas expiradas
   */
  cleanup() {
    let cleaned = 0;

    for (const [key, entry] of this.cache) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[CACHE] CLEANUP: removed ${cleaned} expired entries`);
    }

    return cleaned;
  }

  /**
   * Obtener estadísticas
   */
  getStats() {
    this.updateHitRate();

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: this.stats.hitRate,
      totalRequests: this.stats.totalRequests,
      memoryUsage: this.getMemoryUsage()
    };
  }

  /**
   * Actualizar hit rate
   */
  updateHitRate() {
    this.stats.hitRate = this.stats.totalRequests > 0
      ? (this.stats.cacheHits / this.stats.totalRequests * 100).toFixed(2)
      : 0;
  }

  /**
   * Estimar uso de memoria
   */
  getMemoryUsage() {
    let totalSize = 0;

    for (const [key, entry] of this.cache) {
      totalSize += key.length * 2; // String size
      totalSize += JSON.stringify(entry.data).length * 2;
      totalSize += 64; // Metadata overhead
    }

    return {
      bytes: totalSize,
      kb: (totalSize / 1024).toFixed(2),
      mb: (totalSize / 1024 / 1024).toFixed(4)
    };
  }

  /**
   * Obtener hit rate
   */
  getHitRate() {
    this.updateHitRate();
    return toElectricalPrecision(parseFloat(this.stats.hitRate));
  }

  /**
   * Invalidar cache por patrón
   */
  invalidatePattern(pattern) {
    let invalidated = 0;

    for (const [key] of this.cache) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    console.log(`[CACHE] INVALIDATED ${invalidated} entries matching pattern: ${pattern}`);
    return invalidated;
  }
}

// Singleton instance
const cacheService = new CacheService();

// Cleanup periódico
setInterval(() => {
  cacheService.cleanup();
}, 60000); // Cada minuto

module.exports = {
  calcularConCache: (input, calcFn, options) => cacheService.calcularConCache(input, calcFn, options),
  get: (key) => cacheService.get(key),
  set: (key, data, ttl) => cacheService.set(key, data, ttl),
  clear: () => cacheService.clear(),
  getStats: () => cacheService.getStats(),
  cleanup: () => cacheService.cleanup(),
  invalidatePattern: (pattern) => cacheService.invalidatePattern(pattern)
};
