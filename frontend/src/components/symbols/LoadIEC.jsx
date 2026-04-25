import React from 'react';

/**
 * IEC standard load symbol
 * Shows a load with arrow pointing down and ground symbol
 */
export default function LoadIEC({ size = 60 }) {
  return (
    <svg width={size} height={size * 0.83} viewBox="0 0 60 50">
      {/* Input line */}
      <line x1="30" y1="0" x2="30" y2="15" stroke="black" strokeWidth="2" />
      {/* Load box */}
      <rect x="15" y="15" width="30" height="20" stroke="black" strokeWidth="2" fill="none" />
      {/* Load arrow pointing down */}
      <polygon points="30,18 25,28 35,28" fill="black" />
      <line x1="30" y1="28" x2="30" y2="35" stroke="black" strokeWidth="2" />
      {/* Ground symbol */}
      <line x1="20" y1="35" x2="40" y2="35" stroke="black" strokeWidth="2" />
      <line x1="23" y1="38" x2="37" y2="38" stroke="black" strokeWidth="2" />
      <line x1="26" y1="41" x2="34" y2="41" stroke="black" strokeWidth="2" />
    </svg>
  );
}
