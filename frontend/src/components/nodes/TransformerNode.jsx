import React from 'react'
import PropTypes from 'prop-types'
import { Handle } from 'reactflow'

/**
 * Get color based on ICC value
 */
function getICCColor(icc) {
  if (!icc) return '#3b82f6'
  if (icc > 10000) return '#dc2626' // red
  if (icc > 5000) return '#f97316' // orange
  return '#22c55e' // green
}

export default function TransformerNode({ data }) {
  const icc = data.results?.isc || data.icc
  const iccColor = getICCColor(icc)

  return (
    <div className="bg-white border-2 border-blue-500 rounded-lg p-3 min-w-[150px] shadow-md">
      <Handle type="target" position="top" className="w-3 h-3 bg-blue-500" />

      <div className="flex items-center gap-2">
        <svg width="40" height="40" viewBox="0 0 40 40">
          {/* Primary winding */}
          <circle
            cx="20"
            cy="12"
            r="8"
            fill="none"
            stroke={iccColor}
            strokeWidth="2"
          />
          {/* Secondary winding */}
          <circle
            cx="20"
            cy="28"
            r="8"
            fill="none"
            stroke={iccColor}
            strokeWidth="2"
          />
          {/* Connection lines */}
          <line
            x1="20"
            y1="4"
            x2="20"
            y2="4"
            stroke={iccColor}
            strokeWidth="2"
          />
          <line
            x1="20"
            y1="36"
            x2="20"
            y2="36"
            stroke={iccColor}
            strokeWidth="2"
          />
        </svg>
        <div>
          <div className="font-bold text-sm">{data.label}</div>
          <div className="text-xs text-gray-500">
            {data.parameters?.kVA || 500}kVA
          </div>
          <div className="text-xs text-gray-400">
            {data.parameters?.primario || 13800}V →{' '}
            {data.parameters?.secundario || 480}V
          </div>
          {icc && (
            <div className="text-xs font-semibold" style={{ color: iccColor }}>
              ICC: {(icc / 1000).toFixed(2)} kA
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position="bottom" className="w-3 h-3 bg-blue-500" />
    </div>
  )
}

TransformerNode.propTypes = {
  data: PropTypes.object,
}
