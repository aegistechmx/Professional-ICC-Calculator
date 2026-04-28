import React from 'react';
import { Handle } from 'reactflow';

/**
 * Get color based on ICC value
 */
function getICCColor(icc) {
  if (!icc) return '#ef4444';
  if (icc > 10000) return '#dc2626'; // red
  if (icc > 5000) return '#f97316'; // orange
  return '#22c55e'; // green
}

export default function BreakerNode({ data }) {
  const icc = data.results?.isc || data.icc;
  const iccColor = getICCColor(icc);
  const breakerStatus = data.results?.breakerStatus;

  const getStatusColor = (status) => {
    if (status === 'FAIL') return 'border-red-600 bg-red-50';
    if (status === 'WARNING') return 'border-yellow-600 bg-yellow-50';
    if (status === 'OK') return 'border-green-600 bg-green-50';
    return 'border-gray-500';
  };

  return (
    <div className={`bg-white border-2 rounded-lg p-3 min-w-[150px] shadow-md ${getStatusColor(breakerStatus)}`}>
      <Handle type="target" position="top" className="w-3 h-3 bg-red-500" />

      <div className="flex items-center gap-2">
        <svg width="40" height="40" viewBox="0 0 40 40">
          {/* Vertical line */}
          <line x1="20" y1="4" x2="20" y2="16" stroke={iccColor} strokeWidth="2" />
          {/* Breaker mechanism (rectangle) */}
          <rect x="12" y="16" width="16" height="8" fill="none" stroke={iccColor} strokeWidth="2" />
          {/* Breaker contact line */}
          <line x1="20" y1="24" x2="20" y2="36" stroke={iccColor} strokeWidth="2" />
          {/* Trip indicator */}
          <circle cx="28" cy="20" r="2" fill={iccColor} />
        </svg>
        <div>
          <div className="font-bold text-sm">{data.label}</div>
          <div className="text-xs text-gray-500">
            {data.parameters?.In || 100}A / {(data.parameters?.Icu || 25000) / 1000}kA
          </div>
          {icc && (
            <div className="text-xs font-semibold" style={{ color: iccColor }}>
              ICC: {(icc / 1000).toFixed(2)} kA
            </div>
          )}
          {breakerStatus === 'FAIL' && (
            <div className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded mt-1">
              INSUFICIENTE
            </div>
          )}
          {breakerStatus === 'WARNING' && (
            <div className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-1 rounded mt-1">
              MARGINAL
            </div>
          )}
          {data.trip && (
            <div className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded mt-1">
              TRIP
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position="bottom" className="w-3 h-3 bg-red-500" />
    </div>
  );
}
