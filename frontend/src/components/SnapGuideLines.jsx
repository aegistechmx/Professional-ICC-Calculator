import React from 'react'
import PropTypes from 'prop-types'

/**
 * Visual snap feedback component
 * Shows guide lines when nodes are aligned with other nodes
 */
export default function SnapGuideLines({ position, nodes, threshold = 10 }) {
  const guideLines = []

  if (!position) return null

  nodes.forEach(node => {
    // Check X alignment
    if (Math.abs(node.position.x - position.x) < threshold) {
      guideLines.push({
        type: 'vertical',
        x: node.position.x,
        color: '#3b82f6',
      })
    }

    // Check Y alignment
    if (Math.abs(node.position.y - position.y) < threshold) {
      guideLines.push({
        type: 'horizontal',
        y: node.position.y,
        color: '#3b82f6',
      })
    }
  })

  if (guideLines.length === 0) return null

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      {guideLines.map((line, index) => (
        <line
          key={index}
          x1={line.type === 'vertical' ? line.x : 0}
          y1={line.type === 'horizontal' ? line.y : 0}
          x2={line.type === 'vertical' ? line.x : 10000}
          y2={line.type === 'horizontal' ? line.y : 10000}
          stroke={line.color}
          strokeWidth={1}
          strokeDasharray="5,5"
          opacity={0.7}
        />
      ))}
    </svg>
  )
}

SnapGuideLines.propTypes = {
  position: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number,
  }),
  nodes: PropTypes.array,
  threshold: PropTypes.number,
}
