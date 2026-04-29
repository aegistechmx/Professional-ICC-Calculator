/**
 * Calculate short circuit current per node based on accumulated impedance from source
 * This provides node-by-node fault current analysis
 */

/**
 * Calculate accumulated impedance from source to each node
 * @param {Array} nodes - All nodes in the system
 * @param {Array} edges - All edges (cables) in the system
 * @returns {Object} Map of nodeId -> {accumulatedR, accumulatedX, sourceVoltage, faultCurrent}
 */
export function calculateAccumulatedImpedance(nodes, edges) {
  const nodeImpedance = {}

  // Initialize all nodes
  nodes.forEach(node => {
    nodeImpedance[node.id] = {
      R: 0,
      X: 0,
      sourceVoltage: 0,
      sourceType: null,
      path: [],
      calculated: false,
    }
  })

  // Find source nodes
  const sources = nodes.filter(
    n =>
      n.type === 'transformer' || n.type === 'generator' || n.type === 'utility'
  )

  if (sources.length === 0) {
    return {
      error: 'No source nodes found (transformer, generator, or utility)',
    }
  }

  // Initialize sources with their voltage
  sources.forEach(source => {
    const voltage =
      source.data?.parameters?.secundario ||
      source.data?.parameters?.voltaje ||
      source.data?.parameters?.tension ||
      480

    nodeImpedance[source.id] = {
      R: 0,
      X: 0,
      sourceVoltage: voltage,
      sourceType: source.type,
      path: [source.id],
      calculated: true,
    }
  })

  // Build adjacency list with edge data
  const adjacency = {}
  edges.forEach(edge => {
    if (!adjacency[edge.source]) adjacency[edge.source] = []
    adjacency[edge.source].push({
      target: edge.target,
      edge: edge,
    })
  })

  // BFS from each source to calculate accumulated impedance
  sources.forEach(source => {
    const queue = [source.id]
    const visited = new Set([source.id])

    while (queue.length > 0) {
      const currentId = queue.shift()
      const currentData = nodeImpedance[currentId]

      const neighbors = adjacency[currentId] || []

      neighbors.forEach(({ target, edge }) => {
        if (visited.has(target)) return

        // Calculate cable impedance
        const length = edge.data?.longitud || 10 // meters
        const calibre = edge.data?.calibre || '350'
        const material = edge.data?.material || 'cobre'
        const paralelo = edge.data?.paralelo || 1

        // Get impedance per km
        const cableR = getConductorResistance(calibre, material)
        const cableX = getConductorReactance(calibre, material)

        // Convert to actual impedance (ohms)
        const lengthKm = length / 1000
        const deltaR = (cableR * lengthKm) / Math.max(1, paralelo)
        const deltaX = (cableX * lengthKm) / Math.max(1, paralelo)

        // Accumulate impedance
        nodeImpedance[target] = {
          R: currentData.R + deltaR,
          X: currentData.X + deltaX,
          sourceVoltage: currentData.sourceVoltage,
          sourceType: currentData.sourceType,
          path: [...currentData.path, target],
          calculated: true,
        }

        visited.add(target)
        queue.push(target)
      })
    }
  })

  return { nodeImpedance, sources: sources.map(s => s.id) }
}

/**
 * Calculate fault current for each node
 * @param {Object} nodeImpedance - Result from calculateAccumulatedImpedance
 * @returns {Object} Map of nodeId -> fault current data
 */
export function calculateNodeFaultCurrents(nodeImpedance) {
  const faultCurrents = {}

  Object.entries(nodeImpedance).forEach(([nodeId, data]) => {
    if (!data.calculated) {
      faultCurrents[nodeId] = {
        isc: 0,
        error: 'Node not connected to source',
      }
      return
    }

    // Calculate total impedance magnitude
    const Z_total = Math.sqrt(data.R ** 2 + data.X ** 2)

    // Calculate 3-phase fault current: I_sc = V / (sqrt(3) * Z)
    const I_sc_3f =
      Z_total > 0.001 ? data.sourceVoltage / (Math.sqrt(3) * Z_total) : 0

    // Calculate 1-phase fault current (approximate): I_sc_1f = V / (2 * Z)
    const I_sc_1f = Z_total > 0.001 ? data.sourceVoltage / (2 * Z_total) : 0

    // X/R ratio for asymmetry calculation
    const X_R_ratio = data.R > 0 ? data.X / data.R : 999

    faultCurrents[nodeId] = {
      isc_3f: I_sc_3f,
      isc_1f: I_sc_1f,
      isc_3f_ka: I_sc_3f / 1000,
      isc_1f_ka: I_sc_1f / 1000,
      accumulated_R: data.R,
      accumulated_X: data.X,
      Z_total: Z_total,
      X_R_ratio: X_R_ratio,
      sourceVoltage: data.sourceVoltage,
      sourceType: data.sourceType,
      path: data.path,
    }
  })

  return faultCurrents
}

/**
 * Main function to calculate ICC per node
 * Combines impedance calculation and fault current calculation
 */
export function calculateICCPerNode(nodes, edges) {
  // Step 1: Calculate accumulated impedance
  const impedanceResult = calculateAccumulatedImpedance(nodes, edges)

  if (impedanceResult.error) {
    return { error: impedanceResult.error }
  }

  // Step 2: Calculate fault currents
  const faultCurrents = calculateNodeFaultCurrents(
    impedanceResult.nodeImpedance
  )

  return {
    nodeResults: faultCurrents,
    sources: impedanceResult.sources,
    summary: {
      totalNodes: Object.keys(faultCurrents).length,
      maxIsc: Math.max(
        ...Object.values(faultCurrents).map(d => d.isc_3f_ka || 0)
      ),
      minIsc: Math.min(
        ...Object.values(faultCurrents)
          .filter(d => d.isc_3f_ka > 0)
          .map(d => d.isc_3f_ka || Infinity)
      ),
    },
  }
}

// Helper functions for conductor data
function getConductorResistance(calibre, material) {
  // Resistance in ohms per km at 75°C
  const resistances = {
    cobre: {
      350: 0.0518,
      '4/0': 0.0852,
      '3/0': 0.1074,
      '2/0': 0.1354,
      '1/0': 0.1707,
      12: 1.588,
    },
    aluminio: {
      350: 0.0852,
      '4/0': 0.1404,
      '3/0': 0.1769,
      '2/0': 0.223,
    },
  }

  const mat = material.toLowerCase()
  return resistances[mat]?.[calibre] || 0.0518 // Default to 350 copper
}

function getConductorReactance(calibre, material) {
  // Reactance in ohms per km (typical values for 600V cables)
  const reactances = {
    cobre: {
      350: 0.0769,
      '4/0': 0.0796,
      '3/0': 0.0813,
      '2/0': 0.0832,
      '1/0': 0.0852,
      12: 0.107,
    },
    aluminio: {
      350: 0.0769,
      '4/0': 0.0796,
      '3/0': 0.0813,
    },
  }

  const mat = material.toLowerCase()
  return reactances[mat]?.[calibre] || 0.0769
}
