import React from 'react';
import { Handle } from 'reactflow';

/**
 * Get color based on ICC value
 */
function getICCColor(icc) {
  if (!icc) return '#3b82f6';
  if (icc > 10000) return '#dc2626'; // red
  if (icc > 5000) return '#f97316'; // orange
  return '#22c55e'; // green
}

export default function GeneratorNode({ data }) {
  const iccColor = getICCColor(data.icc);

  return (
    <div className="bg-white border-2 border-orange-500 rounded-lg p-3 min-w-[150px] shadow-md">
      <Handle type="target" position="top" className="w-3 h-3 bg-orange-500" />

      <div className="flex items-center gap-2">
        <svg width="40" height="40" viewBox="0 0 40 40">
          {/* Generator symbol - circle with G */}
          <circle cx="20" cy="20" r="15" fill="none" stroke={iccColor} strokeWidth="2" />
          <text x="20" y="25" textAnchor="middle" fontSize="12" fill={iccColor} fontWeight="bold">G</text>
          {/* Output line */}
          <line x1="20" y1="35" x2="20" y2="40" stroke={iccColor} strokeWidth="2" />
        </svg>
        <div>
          <div className="font-bold text-sm">{data.label}</div>
          <div className="text-xs text-gray-500">
            {data.parameters?.kVA || 100}kVA
          </div>
          <div className="text-xs text-gray-400">
            {data.parameters?.voltaje || 480}V
          </div>
          {data.icc && (
            <div className="text-xs font-semibold" style={{ color: iccColor }}>
              ICC: {data.icc.toFixed(1)} A
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position="bottom" className="w-3 h-3 bg-orange-500" />
    </div>
  );
}