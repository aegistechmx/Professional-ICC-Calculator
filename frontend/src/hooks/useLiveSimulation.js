/* eslint-disable no-console */
import { useEffect, useRef, useCallback } from 'react'
import { useStore } from '../store/useStore'

/**
 * Live simulation hook
 * Automatically runs simulation when nodes or edges change
 * Updates nodes with ICC values in real-time
 * @param {number} delay - Debounce delay in milliseconds (default: 300)
 * @returns {Object} Simulation results and control functions
 */
export default function useLiveSimulation(delay = 300) {
  const nodes = useStore(state => state.nodes)
  const edges = useStore(state => state.edges)
  const setNodes = useStore(state => state.setNodes)

  const timeoutRef = useRef(null)
  const isSimulatingRef = useRef(false)
  const lastNodesHash = useRef('')
  const lastEdgesHash = useRef('')
  const requestIdRef = useRef(0) // Track request sequence to prevent race conditions

  // Create hash of nodes/edges for comparison (ignoring simulation results)
  const getNodesHash = useCallback(nodes => {
    return nodes
      .map(n => `${n.id}:${n.type}:${JSON.stringify(n.data?.parameters)}`)
      .join('|')
  }, [])

  const getEdgesHash = useCallback(edges => {
    return edges
      .map(
        e =>
          `${e.id}:${e.source}:${e.target}:${JSON.stringify(e.data?.calibre)}`
      )
      .join('|')
  }, [])

  useEffect(() => {
    // Check if nodes/edges actually changed (structure, not simulation results)
    const currentNodesHash = getNodesHash(nodes)
    const currentEdgesHash = getEdgesHash(edges)

    // Skip if no structural changes
    if (
      currentNodesHash === lastNodesHash.current &&
      currentEdgesHash === lastEdgesHash.current
    ) {
      return
    }

    // Update hashes
    lastNodesHash.current = currentNodesHash
    lastEdgesHash.current = currentEdgesHash

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout with debounce
    timeoutRef.current = setTimeout(async () => {
      if (isSimulatingRef.current) return

      const currentRequestId = ++requestIdRef.current
      isSimulatingRef.current = true
      try {
        const API_BASE =
          import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'

        // Strip simulation results before sending to API
        const cleanNodes = nodes.map(n => ({
          ...n,
          data: {
            ...n.data,
            icc: undefined,
            trip: undefined,
          },
        }))

        const res = await fetch(`${API_BASE}/cortocircuito/calculate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ nodes: cleanNodes, edges }),
        })

        if (!res.ok) {
          throw new Error('Simulation failed')
        }

        const data = await res.json()

        // Check if this request is still the latest (prevent race conditions)
        if (currentRequestId !== requestIdRef.current) {
          return // Ignore outdated response
        }

        // Update nodes with ICC values and trip status
        // But preserve the current structure hash to prevent re-triggering
        const updated = nodes.map(n => ({
          ...n,
          data: {
            ...n.data,
            results: data.resultsByNodeId?.[n.id] || null,
          },
        }))

        setNodes(updated)
      } catch (error) {
        console.warn('Live simulation error:', error)
      } finally {
        isSimulatingRef.current = false
      }
    }, delay)

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [nodes, edges, setNodes, delay, getNodesHash, getEdgesHash])

  return {
    isSimulating: isSimulatingRef.current,
  }
}
