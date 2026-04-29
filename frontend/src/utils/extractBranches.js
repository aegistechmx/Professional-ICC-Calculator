/**
 * Extract electrical branches from React Flow graph
 * Each branch represents a path from source (utility/transformer/generator) to load
 */

export function extractBranches(nodes, edges) {
  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    return { branches: [], errors: ['Invalid nodes or edges'] }
  }

  const branches = []
  const errors = []

  // Find source nodes (utility, transformer, generator)
  const sourceNodes = nodes.filter(
    n =>
      n.type === 'utility' || n.type === 'transformer' || n.type === 'generator'
  )

  if (sourceNodes.length === 0) {
    errors.push('No source found (utility, transformer, or generator)')
    return { branches, errors }
  }

  // Build adjacency list
  const adjacency = {}
  edges.forEach(edge => {
    if (!adjacency[edge.source]) adjacency[edge.source] = []
    adjacency[edge.source].push({ target: edge.target, edge })
  })

  // DFS to find all paths from sources to loads
  sourceNodes.forEach(source => {
    const visited = new Set()
    const path = [source]

    function dfs(nodeId, currentPath) {
      const node = nodes.find(n => n.id === nodeId)
      if (!node) return

      // If we reached a load, save the branch
      if (
        node.type === 'load' ||
        node.type === 'motor' ||
        node.type === 'panel'
      ) {
        const branchEdges = []
        for (let i = 0; i < currentPath.length - 1; i++) {
          const edge = edges.find(
            e =>
              e.source === currentPath[i].id &&
              e.target === currentPath[i + 1].id
          )
          if (edge) branchEdges.push(edge)
        }

        branches.push({
          id: `branch-${branches.length + 1}`,
          source: currentPath[0],
          target: node,
          nodes: [...currentPath],
          edges: branchEdges,
          totalLength: branchEdges.reduce(
            (sum, e) => sum + (e.data?.longitud || 0),
            0
          ),
          sourceType: currentPath[0].type,
        })
        return
      }

      // Continue DFS
      const neighbors = adjacency[nodeId] || []
      neighbors.forEach(({ target }) => {
        if (!visited.has(target)) {
          visited.add(target)
          const targetNode = nodes.find(n => n.id === target)
          if (targetNode) {
            dfs(target, [...currentPath, targetNode])
          }
          visited.delete(target)
        }
      })
    }

    visited.add(source.id)
    dfs(source.id, path)
  })

  return { branches, errors }
}

/**
 * Calculate accumulated impedance for a branch
 */
export function calculateBranchImpedance(branch) {
  let totalR = 0
  let totalX = 0

  branch.edges.forEach(edge => {
    const length = edge.data?.longitud || 10
    const calibre = edge.data?.calibre || '350'
    const material = edge.data?.material || 'cobre'

    // Get impedance per km for this conductor
    const impedance = getConductorImpedance(calibre, material)

    // Convert length to km and calculate
    const lengthKm = length / 1000
    totalR += impedance.R * lengthKm
    totalX += impedance.X * lengthKm
  })

  return { R: totalR, X: totalX }
}

/**
 * Get impedance for a specific conductor
 */
function getConductorImpedance(calibre, material) {
  // Standard impedance values per km at 75°C
  const impedances = {
    copper: {
      350: { R: 0.0518, X: 0.0769 },
      '4/0': { R: 0.0852, X: 0.0796 },
      '3/0': { R: 0.1074, X: 0.0813 },
      '2/0': { R: 0.1354, X: 0.0832 },
      '1/0': { R: 0.1707, X: 0.0852 },
      12: { R: 1.588, X: 0.107 },
    },
    aluminum: {
      350: { R: 0.0852, X: 0.0769 },
      '4/0': { R: 0.1404, X: 0.0796 },
      '3/0': { R: 0.1769, X: 0.0813 },
      '2/0': { R: 0.223, X: 0.0832 },
    },
  }

  const mat =
    material.toLowerCase() === 'aluminio' || material.toLowerCase() === 'al'
      ? 'aluminum'
      : 'copper'

  return impedances[mat]?.[calibre] || { R: 0.0518, X: 0.0769 }
}
