import React from 'react'
import PropTypes from 'prop-types'

/**
 * IEC standard breaker symbol
 * Shows a breaker with contact mechanism
 */
export default function BreakerIEC({ size = 60 }) {
  return (
    <svg width={size} height={size * 0.67} viewBox="0 0 60 40">
      {/* Input line */}
      <line x1="0" y1="20" x2="20" y2="20" stroke="black" strokeWidth="2" />
      {/* Breaker mechanism (diagonal contact) */}
      <line x1="20" y1="10" x2="40" y2="30" stroke="black" strokeWidth="2" />
      {/* Output line */}
      <line x1="40" y1="20" x2="60" y2="20" stroke="black" strokeWidth="2" />
      {/* Trip indicator circle */}
      <circle cx="30" cy="20" r="3" fill="black" />
    </svg>
  )
}

BreakerIEC.propTypes = {
  size: PropTypes.number,
}
