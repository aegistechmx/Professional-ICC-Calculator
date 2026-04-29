import React from 'react'
import PropTypes from 'prop-types'

/**
 * IEC standard motor symbol
 * Shows a circle with 'M' and rotation indicator
 */
export default function MotorIEC({ size = 50 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 50 50">
      {/* Input line */}
      <line x1="25" y1="0" x2="25" y2="15" stroke="black" strokeWidth="2" />
      {/* Motor circle */}
      <circle
        cx="25"
        cy="25"
        r="20"
        stroke="black"
        strokeWidth="2"
        fill="none"
      />
      {/* Motor label 'M' */}
      <text
        x="25"
        y="30"
        fontSize="14"
        fontWeight="bold"
        textAnchor="middle"
        fill="black"
      >
        M
      </text>
      {/* Rotation indicator arrow */}
      <path
        d="M 40 15 A 15 15 0 0 1 40 35"
        stroke="black"
        strokeWidth="1.5"
        fill="none"
        markerEnd="url(#arrowhead)"
      />
      <defs>
        <marker
          id="arrowhead"
          markerWidth="6"
          markerHeight="4"
          refX="5"
          refY="2"
          orient="auto"
        >
          <polygon points="0 0, 6 2, 0 4" fill="black" />
        </marker>
      </defs>
    </svg>
  )
}

MotorIEC.propTypes = {
  size: PropTypes.number,
}
