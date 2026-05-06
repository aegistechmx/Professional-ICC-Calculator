import React, { useState, useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

/**
 * Custom hook for API calls with loading and error states
 * @param {string} endpoint - API endpoint path (without base URL)
 * @returns {Object} Object with data, loading, error, and execute function
 */
export function useApi(endpoint) {
  const [state, setState] = useState({
    data: null,
    loading: false,
    error: null,
  })

  const execute = useCallback(
    async (options = {}) => {
      setState({ data: null, loading: true, error: null })

      try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
          method: options.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
        })

        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'API request failed')
        }

        setState({ data: result.data, loading: false, error: null })
        return result.data
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error'
        setState({ data: null, loading: false, error: errorMessage })
        throw err
      }
    },
    [endpoint]
  )

  return { ...state, execute }
}

/**
 * Custom hook for POST requests
 * @param {string} endpoint - API endpoint path
 * @returns {Object} Object with data, loading, error, and execute function
 */
export function usePost(endpoint) {
  const { data, loading, error, execute } = useApi(endpoint)

  const post = React.useCallback(
    async body => {
      return execute({ method: 'POST', body })
    },
    [execute]
  )

  return { data, loading, error, execute: post }
}

/**
 * Custom hook for GET requests
 * @param {string} endpoint - API endpoint path
 * @returns {Object} Object with data, loading, error, and execute function
 */
export function useGet(endpoint) {
  const { data, loading, error, execute } = useApi(endpoint)

  const get = useCallback(async () => {
    return execute({ method: 'GET' })
  }, [execute])

  return { data, loading, error, execute: get }
}
