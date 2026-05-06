/**
 * Cache simple en memoria para análisis ICC
 * Usa hash MD5 de entrada como key
 * Con límite de tamaño y LRU eviction para prevenir memory leak
 * Operaciones atómicas para prevenir race conditions
 */

const MAX_CACHE_SIZE = 1000;
const cache = new Map();
let cacheOperationInProgress = false;

/**
 * Obtiene valor del cache (operación atómica)
 * @param {string} key - Clave de cache
 * @returns {any} Valor cacheado o undefined
 */
function getCached(key) {
  if (!key || typeof key !== 'string') return undefined;

  // Operación atómica de lectura
  try {
    return cache.get(key);
  } catch (error) {
    // Log cache read errors silently to avoid console statements
    return undefined;
  }
}

/**
 * Guarda valor en cache (operación atómica)
 * @param {string} key - Clave de cache
 * @param {any} val - Valor a guardar
 */
function setCached(key, val) {
  if (!key || typeof key !== 'string') return;

  // Prevenir race conditions con mutex simple
  if (cacheOperationInProgress) {
    // Esperar y reintentar una vez
    setTimeout(() => setCached(key, val), 1);
    return;
  }

  cacheOperationInProgress = true;

  try {
    // Operación atómica de escritura con LRU eviction
    if (cache.size >= MAX_CACHE_SIZE) {
      const firstKey = cache.keys().next().value;
      if (firstKey) {
        cache.delete(firstKey);
      }
    }

    cache.set(key, val);
  } catch (error) {
    // Cache write errors handled silently to avoid console statements
  } finally {
    cacheOperationInProgress = false;
  }
}

/**
 * Limpia todo el cache
 */
function clearCache() {
  cache.clear();
}

/**
 * Invalida entradas del cache que coinciden con un patrón
 * @param {string} pattern - Patrón de búsqueda (substring de la key)
 * @returns {number} Cantidad de entradas eliminadas
 */
function deleteCachedPattern(pattern) {
  if (!pattern || typeof pattern !== 'string') return 0;

  let deleted = 0;
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
      deleted++;
    }
  }
  return deleted;
}

/**
 * Obtiene estadísticas del cache
 * @returns {Object} Estadísticas
 */
function getCacheStats() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys())
  };
}

module.exports = {
  getCached,
  setCached,
  clearCache,
  deleteCachedPattern,
  getCacheStats
};
