/**
 * Switching Operations for Dynamic Simulation
 * Handles breaker opening/closing and fault application
 */

/**
 * Open breaker in system state
 * @param {Object} state - Current system state
 * @param {string} relayId - Relay ID to trip
 * @returns {Object} Updated system state
 */
export function openBreaker(state, relayId) {
  const newEdges = state.edges.map(edge => {
    if (edge.data.relayId === relayId) {
      return {
        ...edge,
        data: {
          ...edge.data,
          status: 'open',
          tripped: true,
          tripTime: state.currentTime || 0,
        },
        style: {
          ...edge.style,
          stroke: '#ff0000',
          strokeWidth: 1,
          strokeDasharray: 'none',
          animated: false,
        },
      }
    }
    return edge
  })

  return {
    ...state,
    edges: newEdges,
    trippedRelays: [...(state.trippedRelays || []), relayId],
  }
}

/**
 * Close breaker in system state
 * @param {Object} state - Current system state
 * @param {string} relayId - Relay ID to close
 * @returns {Object} Updated system state
 */
export function closeBreaker(state, relayId) {
  const newEdges = state.edges.map(edge => {
    if (edge.data.relayId === relayId) {
      return {
        ...edge,
        data: {
          ...edge.data,
          status: 'closed',
          tripped: false,
          closeTime: state.currentTime || 0,
        },
        style: {
          ...edge.style,
          stroke: '#00cc00',
          strokeWidth: 2,
          animated: true,
        },
      }
    }
    return edge
  })

  return {
    ...state,
    edges: newEdges,
    trippedRelays: (state.trippedRelays || []).filter(id => id !== relayId),
  }
}

/**
 * Apply fault to system state
 * @param {Object} state - Current system state
 * @param {string} busId - Bus where fault occurs
 * @param {Object} faultData - Fault parameters
 * @returns {Object} Updated system state
 */
export function applyFault(state, busId, faultData = {}) {
  const newNodes = state.nodes.map(node => {
    if (node.id === busId) {
      return {
        ...node,
        data: {
          ...node.data,
          fault: true,
          faultType: faultData.faultType || '3P',
          faultImpedance: faultData.impedance || 0,
        },
        style: {
          ...node.style,
          background: '#ff0000',
          border: '4px solid #8b0000',
        },
      }
    }
    return node
  })

  return {
    ...state,
    nodes: newNodes,
    faultBus: busId,
    faultActive: true,
    faultData,
  }
}

/**
 * Clear fault from system state
 * @param {Object} state - Current system state
 * @returns {Object} Updated system state
 */
export function clearFault(state) {
  const newNodes = state.nodes.map(node => {
    if (node.data.fault) {
      return {
        ...node,
        data: {
          ...node.data,
          fault: false,
        },
        style: {
          ...node.style,
          background: node.style.originalBackground || '#ffffff',
          border: '2px solid #222',
        },
      }
    }
    return node
  })

  return {
    ...state,
    nodes: newNodes,
    faultBus: null,
    faultActive: false,
    faultData: null,
  }
}

/**
 * Remove open breakers from topology
 * @param {Object} state - Current system state
 * @returns {Object} Updated system state with open breakers removed
 */
export function removeOpenBreakers(state) {
  const activeEdges = state.edges.filter(edge => edge.data.status !== 'open')

  return {
    ...state,
    edges: activeEdges,
  }
}

/**
 * Restore all breakers to closed state
 * @param {Object} state - Current system state
 * @returns {Object} Updated system state with all breakers closed
 */
export function restoreAllBreakers(state) {
  const newEdges = state.edges.map(edge => ({
    ...edge,
    data: {
      ...edge.data,
      status: 'closed',
      tripped: false,
    },
    style: {
      ...edge.style,
      stroke: '#00cc00',
      strokeWidth: 2,
      animated: true,
    },
  }))

  return {
    ...state,
    edges: newEdges,
    trippedRelays: [],
  }
}

/**
 * Get switching state summary
 * @param {Object} state - Current system state
 * @returns {Object} Switching state summary
 */
export function getSwitchingState(state) {
  const totalBreakers = state.edges.filter(e => e.data.relayId).length
  const openBreakers = state.edges.filter(e => e.data.status === 'open').length
  const closedBreakers = totalBreakers - openBreakers

  return {
    totalBreakers,
    openBreakers,
    closedBreakers,
    faultActive: state.faultActive || false,
    faultBus: state.faultBus || null,
    trippedRelays: state.trippedRelays || [],
  }
}
