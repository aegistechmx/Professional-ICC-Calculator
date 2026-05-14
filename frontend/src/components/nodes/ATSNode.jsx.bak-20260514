import React from 'react'
import PropTypes from 'prop-types'
import { Handle } from 'reactflow'

export default function ATSNode({ data, selected }) {
  const mode = data.parameters?.mode || 'normal'
  const transferTime = data.parameters?.transferTime || 10

  const getModeColor = mode => {
    if (mode === 'normal') return 'bg-green-100 border-green-600'
    if (mode === 'emergency') return 'bg-orange-100 border-orange-600'
    return 'bg-gray-100 border-gray-600'
  }

  return (
    <div
      className={`bg-white border-2 rounded-lg p-3 min-w-[150px] shadow-md ${getModeColor(mode)} ${selected ? 'ring-2 ring-blue-500' : ''}`}
    >
      <Handle type="target" position="top" className="w-3 h-3 bg-gray-500" />

      <div className="flex items-center gap-2">
        <svg width="40" height="40" viewBox="0 0 40 40">
          {/* ATS Symbol - Double switch */}
          <rect x="15" y="5" width="10" height="8" fill="#6b7280" rx="1" />
          <rect x="15" y="27" width="10" height="8" fill="#6b7280" rx="1" />

          {/* Switch positions */}
          <line
            x1="10"
            y1="9"
            x2="15"
            y2="9"
            stroke={mode === 'normal' ? '#10b981' : '#6b7280'}
            strokeWidth="2"
          />
          <line
            x1="25"
            y1="9"
            x2="30"
            y2="9"
            stroke="#6b7280"
            strokeWidth="2"
          />

          <line
            x1="10"
            y1="31"
            x2="15"
            y2="31"
            stroke="#6b7280"
            strokeWidth="2"
          />
          <line
            x1="25"
            y1="31"
            x2="30"
            y2="31"
            stroke={mode === 'emergency' ? '#f97316' : '#6b7280'}
            strokeWidth="2"
          />

          {/* Common output */}
          <line
            x1="20"
            y1="13"
            x2="20"
            y2="27"
            stroke="#374151"
            strokeWidth="3"
          />
        </svg>

        <div className="flex flex-col">
          <span className="text-xs font-semibold text-gray-900">ATS</span>
          <span className="text-xs text-gray-600">{mode.toUpperCase()}</span>
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-500">
        Transfer: {transferTime}s
      </div>

      <Handle type="source" position="bottom" className="w-3 h-3 bg-gray-500" />
    </div>
  )
}

ATSNode.propTypes = {
  data: PropTypes.shape({
    parameters: PropTypes.object,
  }),
  selected: PropTypes.bool,
}
