import React from 'react'
import PropTypes from 'prop-types'

/**
 * IEC standard panel/busbar symbol
 * Shows a panel with horizontal busbars
 */
export default function PanelIEC({ size = 60 }) {
  return (
    <svg width={size} height={size * 0.67} viewBox="0 0 60 40">
      {/* Input line */}
      <line x1="0" y1="20" x2="10" y2="20" stroke="black" strokeWidth="2" />
      {/* Panel box */}
      <rect
        x="10"
        y="5"
        width="40"
        height="30"
        stroke="black"
        strokeWidth="2"
        fill="none"
      />
      {/* Busbars (3 horizontal lines) */}
      <line x1="15" y1="12" x2="45" y2="12" stroke="black" strokeWidth="2" />
      <line x1="15" y1="20" x2="45" y2="20" stroke="black" strokeWidth="2" />
      <line x1="15" y1="28" x2="45" y2="28" stroke="black" strokeWidth="2" />
      {/* Output line */}
      <line x1="50" y1="20" x2="60" y2="20" stroke="black" strokeWidth="2" />
    </svg>
  )
}

PanelIEC.propTypes = {
  size: PropTypes.number,
}
