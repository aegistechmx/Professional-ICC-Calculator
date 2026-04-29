import React from 'react'
import PropTypes from 'prop-types'
import { Handle } from 'reactflow'

/**
 * Get color based on ICC value
 */
function getICCColor(icc) {
  if (!icc) return '#8b5cf6'
  if (icc > 10000) return '#dc2626' // red
  if (icc > 5000) return '#f97316' // orange
  return '#22c55e' // green
}

export default function MotorNode({ data }) {
  const iccColor = getICCColor(data.icc)
  const params = data.parameters || {}

  return (
    <div className="bg-white border-2 border-purple-500 rounded-lg p-3 min-w-[150px] shadow-md">
      <Handle type="target" position="top" className="w-3 h-3 bg-purple-500" />

      <div className="flex items-center gap-2">
        <svg width="40" height="40" viewBox="0 0 40 40">
          {/* Motor circle */}
          <circle
            cx="20"
            cy="20"
            r="12"
            fill="none"
            stroke={iccColor}
            strokeWidth="2"
          />
          {/* Motor symbol (M) */}
          <text
            x="20"
            y="25"
            textAnchor="middle"
            fontSize="14"
            fontWeight="bold"
            fill={iccColor}
          >
            M
          </text>
          {/* Connection line */}
          <line
            x1="20"
            y1="4"
            x2="20"
            y2="8"
            stroke={iccColor}
            strokeWidth="2"
          />
          {/* Rotation indicator (arrow) */}
          <path
            d="M 28 12 A 8 8 0 0 1 28 28"
            fill="none"
            stroke={iccColor}
            strokeWidth="1.5"
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
              <polygon points="0 0, 6 2, 0 4" fill={iccColor} />
            </marker>
          </defs>
        </svg>
        <div>
          <div className="font-bold text-sm">{data.label}</div>
          <div className="text-xs text-gray-500">{params.hp || 0} HP</div>
          <div className="text-xs text-gray-400">
            V: {params.voltaje || 0} V
          </div>
          {params.fp !== undefined && (
            <div className="text-xs text-gray-400">FP: {params.fp}</div>
          )}
          {data.icc && (
            <div className="text-xs font-semibold" style={{ color: iccColor }}>
              ICC: {data.icc.toFixed(1)} A
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

MotorNode.propTypes = {
  data: PropTypes.object,
}
