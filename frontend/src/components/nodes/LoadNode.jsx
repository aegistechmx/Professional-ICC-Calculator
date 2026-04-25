import React from 'react';
import { Handle } from 'reactflow';

/**
 * Get color based on ICC value
 */
function getICCColor(icc) {
  if (!icc) return '#f59e0b';
  if (icc > 10000) return '#dc2626'; // red
  if (icc > 5000) return '#f97316'; // orange
  return '#22c55e'; // green
}

export default function LoadNode({ data }) {
  const iccColor = getICCColor(data.icc);
  const params = data.parameters || {};

  return (
    <div className="bg-white border-2 border-yellow-500 rounded-lg p-3 min-w-[150px] shadow-md">
      <Handle type="target" position="top" className="w-3 h-3 bg-yellow-500" />

      <div className="flex items-center gap-2">
        <svg width="40" height="40" viewBox="0 0 40 40">
          {/* Load box */}
          <rect x="10" y="10" width="20" height="20" fill="none" stroke={iccColor} strokeWidth="2" />
          {/* Load symbol (arrow pointing down) */}
          <polygon points="20,14 16,22 24,22" fill={iccColor} />
          <line x1="20" y1="22" x2="20" y2="28" stroke={iccColor} strokeWidth="2" />
          {/* Ground symbol */}
          <line x1="14" y1="28" x2="26" y2="28" stroke={iccColor} strokeWidth="2" />
          <line x1="16" y1="31" x2="24" y2="31" stroke={iccColor} strokeWidth="2" />
          <line x1="18" y1="34" x2="22" y2="34" stroke={iccColor} strokeWidth="2" />
        </svg>
        <div>
          <div className="font-bold text-sm">{data.label}</div>
          <div className="text-xs text-gray-500">
            P: {params.potencia_kW || 0} kW
          </div>
          {params.potencia_kVAR !== undefined && (
            <div className="text-xs text-gray-400">
              Q: {params.potencia_kVAR || 0} kVAR
            </div>
          )}
          {params.voltaje && (
            <div className="text-xs text-gray-400">
              V: {params.voltaje} V
            </div>
          )}
          {data.icc && (
            <div className="text-xs font-semibold" style={{ color: iccColor }}>
              ICC: {data.icc.toFixed(1)} A
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
