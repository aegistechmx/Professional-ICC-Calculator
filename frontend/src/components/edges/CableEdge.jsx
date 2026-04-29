import React from 'react'
import PropTypes from 'prop-types'
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from 'reactflow'

export default function CableEdge(props) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style,
    markerEnd,
    data,
  } = props

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const input = data || {}
  const res = data?.results || data?.results?.cable
  const ampacity = res?.ampacity
  const voltageDrop = res?.voltageDrop_pct
  const ampacityStatus = res?.ampacityStatus

  const getStatusColor = status => {
    if (status === 'FAIL') return 'border-red-400 text-red-800 bg-red-50'
    if (status === 'WARNING')
      return 'border-yellow-400 text-yellow-800 bg-yellow-50'
    return 'border-gray-300 text-gray-800'
  }

  const labelLines = []
  if (input.material && input.calibre) {
    labelLines.push(`${input.material} ${input.calibre}`)
  }
  if (ampacity != null) {
    labelLines.push(`Amp: ${Math.round(ampacity)} A`)
  }
  if (voltageDrop != null) {
    labelLines.push(`ΔV ${voltageDrop.toFixed(2)}%`)
  }
  if (res?.impedance?.Z != null) {
    labelLines.push(`Z: ${res.impedance.Z.toFixed(4)} Ω`)
  }

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      {labelLines.length > 0 && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className={`bg-white/90 border rounded px-2 py-1 text-[11px] shadow ${getStatusColor(ampacityStatus)}`}
          >
            {labelLines.map((l, i) => (
              <div key={i} className="leading-tight whitespace-nowrap">
                {l}
              </div>
            ))}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

CableEdge.propTypes = {
  id: PropTypes.string,
  sourceX: PropTypes.number,
  sourceY: PropTypes.number,
  targetX: PropTypes.number,
  targetY: PropTypes.number,
  sourcePosition: PropTypes.string,
  targetPosition: PropTypes.string,
  style: PropTypes.object,
  markerEnd: PropTypes.string,
  data: PropTypes.object,
}
