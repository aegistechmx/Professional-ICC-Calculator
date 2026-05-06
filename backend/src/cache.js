/**
 * Cache simple en memoria para análisis ICC
 * Usa hash MD5 de entrada como key
 * Con límite de tamaño y LRU eviction para prevenir memory leak
 */

const MAX_CACHE_SIZE = 1000;
const cache = new Map();

/**
 * Obtiene valor del cache
 * @param {string} key - Clave de cache
 * @returns {any} Valor cacheado o undefined
 */
function getCached(key) {
  if (!key || typeof key !== 'string') return undefined;
  return cache.get(key);
}

/**
 * Guarda valor en cache
 * @param {string} key - Clave de cache
 * @param {any} val - Valor a guardar
 */
function setCached(key, val) {
  if (!key || typeof key !== 'string') return;

  // Evict oldest entry if at capacity (LRU)
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }

  cache.set(key, val);
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
