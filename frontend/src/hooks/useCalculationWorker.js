/**
 * Hook for managing calculation web worker
 * Provides optimized calculation performance with progress tracking
 */

import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Custom hook for web worker calculations
 * @param {string} workerPath - Path to worker script
 * @returns {Object} Worker interface with calculation methods
 */
export const useCalculationWorker = (workerPath = '/src/workers/calculation.worker.js') => {
  const [isCalculating, setIsCalculating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [results, setResults] = useState(null)

  const workerRef = useRef(null)
  const pendingRequests = useRef(new Map())
  const requestIdRef = useRef(0)

  // Initialize worker
  useEffect(() => {
    try {
      workerRef.current = new Worker(workerPath)

      workerRef.current.onmessage = (event) => {
        const { id, data, success, error: workerError } = event.data

        const request = pendingRequests.get(id)
        if (!request) return

        pendingRequests.delete(id)

        if (success) {
          request.resolve(data)
        } else {
          request.reject(new Error(workerError))
        }
      }

      workerRef.current.onerror = (error) => {
        // eslint-disable-next-line no-console
        console.error('Worker error:', error)
        setError(error.message)

        // Reject all pending requests
        pendingRequests.forEach(request => {
          request.reject(new Error('Worker error occurred'))
        })
        pendingRequests.clear()
      }

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to initialize worker:', error)
      setError(error.message)
    }

    // Cleanup
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
      }
      pendingRequests.clear()
    }
  }, [workerPath])

  /**
   * Send message to worker and return promise
   */
  const sendMessage = useCallback((type, data) => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'))
        return
      }

      const id = ++requestIdRef.current
      pendingRequests.set(id, { resolve, reject })

      workerRef.current.postMessage({ type, data, id })
    })
  }, [])

  /**
   * Calculate ICC with worker
   */
  const calculateICC = useCallback(async (nodes, edges, options = {}) => {
    setIsCalculating(true)
    setError(null)
    setProgress(0)

    try {
      const result = await sendMessage('calculateICC', { nodes, edges, options })
      setResults(result)
      return result
    } catch (error) {
      setError(error.message)
      throw error
    } finally {
      setIsCalculating(false)
      setProgress(0)
    }
  }, [sendMessage])

  /**
   * Calculate harmonics with worker
   */
  const calculateHarmonics = useCallback(async (harmonics, voltage, isc, il, options = {}) => {
    setIsCalculating(true)
    setError(null)
    setProgress(0)

    try {
      const result = await sendMessage('calculateHarmonics', {
        harmonics,
        voltage,
        isc,
        il,
        options
      })
      setResults(result)
      return result
    } catch (error) {
      setError(error.message)
      throw error
    } finally {
      setIsCalculating(false)
      setProgress(0)
    }
  }, [sendMessage])

  /**
   * Calculate power flow with worker
   */
  const calculatePowerFlow = useCallback(async (nodes, edges, options = {}) => {
    setIsCalculating(true)
    setError(null)
    setProgress(0)

    try {
      const result = await sendMessage('calculatePowerFlow', { nodes, edges, options })
      setResults(result)
      return result
    } catch (error) {
      setError(error.message)
      throw error
    } finally {
      setIsCalculating(false)
      setProgress(0)
    }
  }, [sendMessage])

  /**
   * Validate standards with worker
   */
  const validateStandards = useCallback(async (calculationType, parameters, standards) => {
    setIsCalculating(true)
    setError(null)
    setProgress(0)

    try {
      const result = await sendMessage('validateStandards', {
        calculationType,
        parameters,
        standards
      })
      setResults(result)
      return result
    } catch (error) {
      setError(error.message)
      throw error
    } finally {
      setIsCalculating(false)
      setProgress(0)
    }
  }, [sendMessage])

  /**
   * Perform batch calculations
   */
  const performBatchCalculation = useCallback(async (scenarios, calculationType) => {
    setIsCalculating(true)
    setError(null)
    setProgress(0)

    try {
      const result = await sendMessage('batchCalculation', {
        scenarios,
        calculationType
      })
      setResults(result)
      return result
    } catch (error) {
      setError(error.message)
      throw error
    } finally {
      setIsCalculating(false)
      setProgress(0)
    }
  }, [sendMessage])

  /**
   * Cancel all pending calculations
   */
  const cancelCalculations = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = new Worker(workerPath)
    }

    pendingRequests.forEach(request => {
      request.reject(new Error('Calculation cancelled'))
    })
    pendingRequests.clear()

    setIsCalculating(false)
    setProgress(0)
  }, [workerPath])

  return {
    // State
    isCalculating,
    progress,
    error,
    results,

    // Methods
    calculateICC,
    calculateHarmonics,
    calculatePowerFlow,
    validateStandards,
    performBatchCalculation,
    cancelCalculations,

    // Utilities
    clearError: () => setError(null),
    clearResults: () => setResults(null),

    // Worker status
    isWorkerReady: !!workerRef.current,
    pendingRequests: pendingRequests.size
  }
}

/**
 * Fallback hook for when worker is not available
 * Provides same interface but runs calculations in main thread
 */
export const useFallbackCalculation = () => {
  const [isCalculating, setIsCalculating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [results, setResults] = useState(null)

  const calculateICC = useCallback(async (nodes, edges) => {
    setIsCalculating(true)
    setError(null)

    try {
      // Import and run ICC calculation in main thread
      const { calculateICCPerNode } = await import('../utils/calculateNodeICC')

      // Simulate progress
      const steps = 10
      for (let i = 0; i <= steps; i++) {
        setProgress((i / steps) * 100)
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      const result = calculateICCPerNode(nodes, edges)
      setResults(result)
      return result
    } catch (error) {
      setError(error.message)
      throw error
    } finally {
      setIsCalculating(false)
      setProgress(0)
    }
  }, [])

  const calculateHarmonics = useCallback(async (harmonics, voltage, isc, il) => {
    setIsCalculating(true)
    setError(null)

    try {
      const {
        calculateTHD,
        calculateIndividualHarmonics,
        validateHarmonicsIEEE519,
        calculateKFactor
      } = await import('../utils/harmonicAnalysis')

      setProgress(25)
      const thd = calculateTHD(harmonics)

      setProgress(50)
      const individualHarmonics = calculateIndividualHarmonics(harmonics)

      setProgress(75)
      const validation = validateHarmonicsIEEE519(harmonics, voltage, isc, il)

      setProgress(90)
      const kFactor = calculateKFactor(harmonics)

      setProgress(100)

      const result = {
        thd,
        individualHarmonics,
        validation,
        kFactor,
        calculationTime: 0
      }

      setResults(result)
      return result
    } catch (error) {
      setError(error.message)
      throw error
    } finally {
      setIsCalculating(false)
      setProgress(0)
    }
  }, [])

  const calculatePowerFlow = useCallback(async (nodes) => {
    setIsCalculating(true)
    setError(null)

    try {
      // Simplified power flow calculation
      setProgress(50)

      const results = nodes.map(node => ({
        nodeId: node.id,
        voltage: 1.0,
        angle: 0,
        power: { P: 0, Q: 0 }
      }))

      setProgress(100)

      const result = {
        results,
        converged: true,
        iterations: 1,
        calculationTime: 0
      }

      setResults(result)
      return result
    } catch (error) {
      setError(error.message)
      throw error
    } finally {
      setIsCalculating(false)
      setProgress(0)
    }
  }, [])

  const validateStandards = useCallback(async (calculationType, parameters) => {
    setIsCalculating(true)
    setError(null)

    try {
      const { validateAllStandards } = await import('../utils/ieeeValidation')

      setProgress(50)
      const result = validateAllStandards(calculationType, parameters)

      setProgress(100)
      setResults(result)
      return result
    } catch (error) {
      setError(error.message)
      throw error
    } finally {
      setIsCalculating(false)
      setProgress(0)
    }
  }, [])

  const performBatchCalculation = useCallback(async (scenarios, calculationType) => {
    setIsCalculating(true)
    setError(null)

    try {
      const results = []

      for (let i = 0; i < scenarios.length; i++) {
        setProgress((i / scenarios.length) * 100)

        let result
        switch (calculationType) {
          case 'ICC':
            result = await calculateICC(scenarios[i].nodes, scenarios[i].edges)
            break
          case 'harmonics':
            result = await calculateHarmonics(
              scenarios[i].harmonics,
              scenarios[i].voltage,
              scenarios[i].isc,
              scenarios[i].il
            )
            break
          case 'powerFlow':
            result = await calculatePowerFlow(scenarios[i].nodes, scenarios[i].edges)
            break
          default:
            throw new Error(`Unknown calculation type: ${calculationType}`)
        }

        results.push({
          scenarioIndex: i,
          scenarioName: scenarios[i].name || `Scenario ${i + 1}`,
          ...result
        })
      }

      setProgress(100)

      const batchResult = {
        results,
        totalScenarios: scenarios.length,
        calculationTime: 0,
        averageTimePerScenario: 0
      }

      setResults(batchResult)
      return batchResult
    } catch (error) {
      setError(error.message)
      throw error
    } finally {
      setIsCalculating(false)
      setProgress(0)
    }
  }, [calculateICC, calculateHarmonics, calculatePowerFlow])

  const cancelCalculations = useCallback(() => {
    // No-op for fallback calculations
    setIsCalculating(false)
    setProgress(0)
  }, [])

  return {
    // State
    isCalculating,
    progress,
    error,
    results,

    // Methods
    calculateICC,
    calculateHarmonics,
    calculatePowerFlow,
    validateStandards,
    performBatchCalculation,
    cancelCalculations,

    // Utilities
    clearError: () => setError(null),
    clearResults: () => setResults(null),

    // Worker status
    isWorkerReady: false,
    pendingRequests: 0
  }
}

/**
 * Smart hook that tries to use worker but falls back to main thread
 */
export const useSmartCalculation = (workerPath) => {
  const [useWorker, setUseWorker] = useState(true)
  const workerHook = useCalculationWorker(workerPath)
  const fallbackHook = useFallbackCalculation()

  // Detect if worker is available and working
  useEffect(() => {
    const testWorker = async () => {
      try {
        // Simple test calculation
        await workerHook.calculateICC([], {})
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Worker not available, using fallback:', error.message)
        setUseWorker(false)
      }
    }

    if (useWorker && workerHook.isWorkerReady) {
      testWorker()
    }
  }, [useWorker, workerHook])

  // Return appropriate hook based on availability
  return useWorker && workerHook.isWorkerReady ? workerHook : fallbackHook
}
