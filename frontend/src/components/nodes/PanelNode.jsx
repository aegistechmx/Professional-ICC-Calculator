import React from 'react';
import { Handle } from 'reactflow';

/**
 * Get color based on ICC value
 */
function getICCColor(icc) {
  if (!icc) return '#10b981';
  if (icc > 10000) return '#dc2626'; // red
  if (icc > 5000) return '#f97316'; // orange
  return '#22c55e'; // green
}

export default function PanelNode({ data }) {
  const iccColor = getICCColor(data.icc);

  return (
    <div className="bg-white border-2 border-green-500 rounded-lg p-3 min-w-[150px] shadow-md">
      <Handle type="target" position="top" className="w-3 h-3 bg-green-500" />

      <div className="flex items-center gap-2">
        <svg width="40" height="40" viewBox="0 0 40 40">
          {/* Panel box */}
          <rect x="8" y="8" width="24" height="24" fill="none" stroke={iccColor} strokeWidth="2" />
          {/* Busbar horizontal line */}
          <line x1="12" y1="16" x2="28" y2="16" stroke={iccColor} strokeWidth="2" />
          <line x1="12" y1="20" x2="28" y2="20" stroke={iccColor} strokeWidth="2" />
          <line x1="12" y1="24" x2="28" y2="24" stroke={iccColor} strokeWidth="2" />
          {/* Connection points */}
          <circle cx="12" cy="16" r="1.5" fill={iccColor} />
          <circle cx="12" cy="20" r="1.5" fill={iccColor} />
          <circle cx="12" cy="24" r="1.5" fill={iccColor} />
        </svg>
        <div>
          <div className="font-bold text-sm">{data.label}</div>
          <div className="text-xs text-gray-500">
            {data.parameters?.tension || 480}V / {data.parameters?.fases || 3}φ
          </div>
          {data.icc && (
            <div className="text-xs font-semibold" style={{ color: iccColor }}>
              ICC: {data.icc.toFixed(1)} A
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position="bottom" className="w-3 h-3 bg-green-500" />
    </div>
  );
}
