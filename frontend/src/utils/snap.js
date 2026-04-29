/**
 * Snap utilities for CAD-style alignment
 */

/**
 * Snap position to grid
 * @param {Object} position - Position with x and y coordinates
 * @param {number} [gridSize=20] - Grid size for snapping
 * @returns {Object} Snapped position
 */
export function snapToGrid(position, gridSize = 20) {
  return {
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize,
  }
}

/**
 * Snap position to other nodes (alignment)
 * @param {Object} pos - Current position
 * @param {Array} nodes - Array of existing nodes
 * @param {number} [threshold=10] - Snap threshold in pixels
 * @returns {Object} Snapped position
 */
export function snapToOtherNodes(pos, nodes, threshold = 10) {
  let snapped = { ...pos }

  nodes.forEach(n => {
    // Snap X alignment
    if (Math.abs(n.position.x - pos.x) < threshold) {
      snapped.x = n.position.x
    }
    // Snap Y alignment
    if (Math.abs(n.position.y - pos.y) < threshold) {
      snapped.y = n.position.y
    }
  })

  return snapped
}

/**
 * Combined snap: first to grid, then to other nodes
 * @param {Object} position - Current position
 * @param {Array} nodes - Array of existing nodes
 * @param {number} [gridSize=20] - Grid size
 * @param {number} [threshold=10] - Snap threshold
 * @returns {Object} Snapped position
 */
export function snap(position, nodes, gridSize = 20, threshold = 10) {
  const gridSnapped = snapToGrid(position, gridSize)
  const nodeSnapped = snapToOtherNodes(gridSnapped, nodes, threshold)
  return nodeSnapped
}

/**
 * Check if position is aligned with another node
 * @param {Object} pos1 - First position
 * @param {Object} pos2 - Second position
 * @param {number} [threshold=5] - Alignment threshold
 * @returns {Object} Alignment info { xAligned, yAligned }
 */
export function checkAlignment(pos1, pos2, threshold = 5) {
  return {
    xAligned: Math.abs(pos1.x - pos2.x) < threshold,
    yAligned: Math.abs(pos1.y - pos2.y) < threshold,
  }
}
