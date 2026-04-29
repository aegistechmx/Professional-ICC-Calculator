/* eslint-disable no-console */
import React from 'react'

/**
 * Performance utilities for optimization
 * Lazy loading, memoization, and calculation optimization
 */

/**
 * Debounce function to limit execution rate
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function to limit execution to once per period
 * @param {Function} func - Function to throttle
 * @param {number} limit - Milliseconds between executions
 * @returns {Function} Throttled function
 */
export function throttle(func, limit = 100) {
  let inThrottle
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Memoize expensive calculations
 * @param {Function} fn - Function to memoize
 * @returns {Function} Memoized function
 */
export function memoize(fn) {
  const cache = new Map()
  return function (...args) {
    const key = JSON.stringify(args)
    if (cache.has(key)) {
      return cache.get(key)
    }
    const result = fn.apply(this, args)
    cache.set(key, result)
    return result
  }
}

/**
 * Lazy load component with dynamic import
 * @param {Function} importFunc - Dynamic import function
 * @returns {React.LazyExoticComponent} Lazy component
 */
export function lazyLoad(importFunc) {
  return React.lazy(() => {
    return importFunc().catch(err => {
      if (import.meta.env.DEV) {
        console.error('Failed to load component:', err)
      }
      return { default: () => <div>Error loading component</div> }
    })
  })
}

/**
 * Chunk large arrays for processing
 * @param {Array} array - Array to chunk
 * @param {number} size - Chunk size
 * @returns {Array[]} Array of chunks
 */
export function chunkArray(array, size = 100) {
  const chunks = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

/**
 * Process array in chunks with yield control
 * @param {Array} items - Items to process
 * @param {Function} processor - Processing function
 * @param {number} chunkSize - Items per chunk
 * @param {number} delayMs - Delay between chunks
 */
export async function processInChunks(
  items,
  processor,
  chunkSize = 50,
  delayMs = 0
) {
  const chunks = chunkArray(items, chunkSize)
  const results = []

  for (let i = 0; i < chunks.length; i++) {
    const chunkResults = await Promise.all(chunks[i].map(processor))
    results.push(...chunkResults)

    // Yield control to UI thread
    if (delayMs > 0 && i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }

    // Allow browser to render
    if (typeof window !== 'undefined' && window.requestAnimationFrame) {
      await new Promise(resolve => requestAnimationFrame(resolve))
    }
  }

  return results
}

/**
 * Measure execution time of a function
 * @param {Function} fn - Function to measure
 * @param {string} label - Label for console output
 * @returns {Function} Wrapped function with timing
 */
export function measurePerformance(fn, label = 'Performance') {
  return function (...args) {
    const start = performance.now()
    const result = fn.apply(this, args)
    const end = performance.now()
    if (import.meta.env.DEV) {
      console.log(`${label}: ${(end - start).toFixed(2)}ms`)
    }
    return result
  }
}

/**
 * Cache for expensive calculations
 */
export class CalculationCache {
  constructor(maxSize = 100) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  get(key) {
    return this.cache.get(key)
  }

  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      // LRU eviction - remove oldest entry
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
  }

  has(key) {
    return this.cache.has(key)
  }

  clear() {
    this.cache.clear()
  }
}

/**
 * Optimize React Flow node updates
 * Only update changed nodes to prevent unnecessary renders
 * @param {Array} currentNodes - Current nodes
 * @param {Array} newNodes - New nodes with updates
 * @returns {Array} Optimized node array
 */
export function optimizeNodeUpdates(currentNodes, newNodes) {
  const currentMap = new Map(currentNodes.map(n => [n.id, n]))
  const updates = []

  for (const newNode of newNodes) {
    const currentNode = currentMap.get(newNode.id)
    if (
      !currentNode ||
      JSON.stringify(currentNode) !== JSON.stringify(newNode)
    ) {
      updates.push(newNode)
    }
  }

  return updates
}

/**
 * Web Worker wrapper for heavy calculations
 * @param {Function} workerFunction - Function to run in worker
 * @returns {Function} Function that returns a Promise
 */
export function createWorker(workerFunction) {
  const blob = new Blob([`(${workerFunction.toString()})()`], {
    type: 'application/javascript',
  })
  const workerUrl = URL.createObjectURL(blob)

  return function postMessage(data) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(workerUrl)
      worker.onmessage = e => resolve(e.data)
      worker.onerror = reject
      worker.postMessage(data)
    })
  }
}

export default {
  debounce,
  throttle,
  memoize,
  lazyLoad,
  chunkArray,
  processInChunks,
  measurePerformance,
  CalculationCache,
  optimizeNodeUpdates,
  createWorker,
}
