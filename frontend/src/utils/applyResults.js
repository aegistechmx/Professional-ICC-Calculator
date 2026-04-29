/**
 * Apply simulation results to ReactFlow nodes and edges
 * Visual feedback for power flow analysis
 */

import { getVoltageStatus, getVoltageNodeStyle } from './voltageColor'
import { calcLineFlows, calcCurrents, getFlowEdgeStyle } from './lineFlows'

/**
 * Apply power flow results to nodes
 * Updates node colors, labels, and styles based on voltage levels
 *
 * @param {Array} nodes - ReactFlow nodes
 * @param {Object} results - Power flow results
 * @param {Object} indexMap - Bus index map
 * @returns {Array} Updated nodes
 */
export function applyNodeResults(nodes, results, indexMap) {
  return nodes.map(node => {
    const i = indexMap[node.id]
    if (i === undefined) return node

    const V = results.V[i]
    const theta = results.theta[i]
    const theta_deg = theta * (180 / Math.PI)

    return {
      ...node,
      data: {
        ...node.data,
        Vpu: V,
        theta_rad: theta,
        theta_deg: theta_deg,
        status: getVoltageStatus(V),
        label: `${node.data.label || node.id}\n${V.toFixed(3)} pu\n${theta_deg.toFixed(1)}°`,
      },
      style: {
        ...node.style,
        ...getVoltageNodeStyle(V),
      },
    }
  })
}

/**
 * Apply power flow results to edges
 * Updates edge labels, colors, and styles based on power flow
 *
 * @param {Array} edges - ReactFlow edges
 * @param {Array} flows - Line flow results
 * @param {boolean} showCurrent - Include current in kA
 * @returns {Array} Updated edges
 */
export function applyEdgeResults(edges, flows, showCurrent = false) {
  return edges.map(edge => {
    const flow = flows.find(f => f.from === edge.source && f.to === edge.target)

    if (!flow) return edge

    const direction = flow.P >= 0 ? '→' : '←'
    const P_MW = Math.abs(flow.P).toFixed(2)
    const Q_MVAR = Math.abs(flow.Q).toFixed(2)

    let label
    if (showCurrent && flow.IkA !== undefined) {
      const IkA = flow.IkA.toFixed(2)
      label = `${direction} ${P_MW} MW\n${IkA} kA`
    } else {
      label = `${direction} ${P_MW} MW\n+j${Q_MVAR} MVAR`
    }

    return {
      ...edge,
      label,
      data: {
        ...edge.data,
        flow,
        P_pu: flow.P,
        Q_pu: flow.Q,
        S_pu: flow.magnitude,
        IkA: flow.IkA,
      },
      style: {
        ...edge.style,
        ...getFlowEdgeStyle(flow.magnitude),
      },
      animated: true, // Enable animation for flow direction
    }
  })
}

/**
 * Extract branches from ReactFlow edges
 * Converts edges to branch format for flow calculation
 *
 * @param {Array} edges - ReactFlow edges
 * @returns {Array} Branch array
 */
export function extractBranches(edges) {
  return edges.map(edge => ({
    from: edge.source,
    to: edge.target,
    R: edge.data.R || 0.01,
    X: edge.data.X || 0.1,
    B: edge.data.B || 0,
    tap: edge.data.tap || 1,
  }))
}

/**
 * Apply flow animation to edges
 * Adds animated dashed lines based on flow magnitude
 *
 * @param {Array} edges - ReactFlow edges
 * @param {Array} flows - Line flow results
 * @returns {Array} Updated edges with animation
 */
export function applyFlowAnimation(edges, flows) {
  return edges.map(edge => {
    const flow = flows.find(f => f.from === edge.source && f.to === edge.target)

    if (!flow) return edge

    const speed = Math.min(Math.abs(flow.P) * 2, 10)
    const animationDuration = speed > 0 ? `${1 / speed}s` : '2s'

    return {
      ...edge,
      animated: true,
      style: {
        ...edge.style,
        strokeDasharray: '5 5',
        animationDuration,
      },
    }
  })
}

/**
 * Apply complete simulation results to ReactFlow
 * Updates both nodes and edges with visual feedback
 *
 * @param {Object} data - ReactFlow data { nodes, edges }
 * @param {Object} results - Power flow results
 * @param {Object} options - Visualization options
 * @returns {Object} Updated ReactFlow data
 */
export function applySimulationResults(data, results, options = {}) {
  const { nodes, edges } = data
  const { showCurrent = false, animateFlow = false } = options

  // Build index map from results
  const indexMap = results.buses.reduce((map, bus, i) => {
    map[bus.id] = i
    return map
  }, {})

  // Calculate line flows
  const branches = extractBranches(edges)
  const flows = calcLineFlows(
    branches,
    results.Y,
    results.V,
    results.theta,
    indexMap
  )

  // Calculate currents if base is available
  let flowsWithI = flows
  if (results.base && results.base.Vbase_kV) {
    flowsWithI = calcCurrents(flows, results.V, results.base, indexMap)
  }

  // Apply results to nodes and edges
  const newNodes = applyNodeResults(nodes, results, indexMap)
  let newEdges = applyEdgeResults(edges, flowsWithI, showCurrent)

  // Apply animation if requested
  if (animateFlow) {
    newEdges = applyFlowAnimation(newEdges, flowsWithI)
  }

  return {
    nodes: newNodes,
    edges: newEdges,
    flows: flowsWithI,
    indexMap,
  }
}
