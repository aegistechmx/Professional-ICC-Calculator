import React from 'react';

/**
 * IEC standard transformer symbol
 * Shows two concentric circles representing primary and secondary windings
 */
export default function TransformerIEC({ size = 60 }) {
  return (
    <svg width={size} height={size * 0.67} viewBox="0 0 60 40">
      {/* Input line */}
      <line x1="0" y1="20" x2="10" y2="20" stroke="black" strokeWidth="2" />
      {/* Primary winding */}
      <circle cx="20" cy="20" r="10" stroke="black" strokeWidth="2" fill="none" />
      {/* Secondary winding */}
      <circle cx="40" cy="20" r="10" stroke="black" strokeWidth="2" fill="none" />
      {/* Output line */}
      <line x1="50" y1="20" x2="60" y2="20" stroke="black" strokeWidth="2" />
    </svg>
  );
}
