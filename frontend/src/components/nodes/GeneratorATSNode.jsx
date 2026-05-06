import React from 'react'
import PropTypes from 'prop-types'
import { Handle } from 'reactflow'

export default function GeneratorATSNode({ data, selected }) {
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
          {/* Generator ATS Symbol - Generator with ATS switch */}
          <circle cx="20" cy="20" r="8" fill="#3b82f6" />
          <rect x="16" y="12" width="8" height="12" fill="#6b7280" rx="1" />
          <path d="M 12 20 L 16 16 M 24 20 L 20 16" stroke="#374151" strokeWidth="2" fill="none" />
          <text x="20" y="35" textAnchor="middle" fontSize="10" fill="#374151">ATS</text>
        </svg>

        <div className="text-xs">
          <div className="font-semibold">Generator ATS</div>
          <div className="text-gray-500">Mode: {mode}</div>
          <div className="text-gray-500">Transfer: {transferTime}s</div>
        </div>
      </div>
    </div>
  )
}

GeneratorATSNode.propTypes = {
  data: PropTypes.object.isRequired,
  selected: PropTypes.bool
}
