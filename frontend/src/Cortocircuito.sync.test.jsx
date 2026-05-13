import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../store/useStore', () => ({
  useStore: vi.fn(),
}))

vi.mock('./modules/cortocircuito/hooks/useICC', () => ({
  useICC: vi.fn(),
}))

import CortocircuitoPage from './modules/cortocircuito/CortocircuitoPage'
import { useStore } from './store/useStore'
import { useICC } from './modules/cortocircuito/hooks/useICC'

describe('Cortocircuito synchronization', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.useFakeTimers()
    vi.clearAllMocks()
    useICC.mockReturnValue({
      runICC: vi.fn(),
      runOptimization: vi.fn(),
      loading: false,
      result: null,
      error: null,
      optimization: null,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should apply incoming storage events to the store', () => {
    const setNodes = vi.fn()
    const setEdges = vi.fn()

    useStore.mockImplementation(selector =>
      selector({ nodes: [], edges: [], setNodes, setEdges })
    )

    render(<CortocircuitoPage />)

    const payload = [{ id: 'sync-node' }]
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'icc-sync-nodes',
        newValue: JSON.stringify(payload),
      })
    )

    expect(setNodes).toHaveBeenCalledWith(payload)
    expect(setEdges).not.toHaveBeenCalled()
  })

  it('should persist sync payload to localStorage on interval when nodes exist', () => {
    const setNodes = vi.fn()
    const setEdges = vi.fn()
    const nodes = [{ id: 'sync-node' }]
    const edges = []

    useStore.mockImplementation(selector => selector({ nodes, edges, setNodes, setEdges }))

    render(<CortocircuitoPage />)

    vi.advanceTimersByTime(1000)

    expect(window.localStorage.getItem('icc-sync-nodes')).toBe(JSON.stringify(nodes))
    expect(window.localStorage.getItem('icc-sync-edges')).toBe(JSON.stringify(edges))
  })
})
