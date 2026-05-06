import React, { memo } from 'react'
import { Handle, Position } from 'reactflow'
import PropTypes from 'prop-types'

/**
 * Capacitor Bank Node Component
 * Represents power factor correction capacitors in electrical systems
 */
const CapBankNode = memo(({ data, selected }) => {
  const { parameters = {}, label = 'Capacitor Bank' } = data
  const { kVAR = 100, voltage = 480, stages = 1 } = parameters

  const getCapacitorColor = () => {
    if (selected) return '#3b82f6'
    return '#10b981' // Green for capacitors
  }

  const getDisplayText = () => {
    return `${label}\n${kVAR} kVAR\n${voltage}V\n${stages} stage${stages > 1 ? 's' : ''}`
  }

  return (
    <div
      style={{
        background: getCapacitorColor(),
        color: 'white',
        padding: '10px',
        borderRadius: '8px',
        border: selected ? '2px solid #1f2937' : '2px solid transparent',
        minWidth: '120px',
        textAlign: 'center',
        fontSize: '12px',
        fontWeight: 'bold',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Capacitor symbol */}
      <div style={{ marginBottom: '8px', fontSize: '20px' }}>||</div>
      
      <div style={{ whiteSpace: 'pre-line', lineHeight: '1.2' }}>
        {getDisplayText()}
      </div>

      {/* Power factor indicator */}
      {data.results?.powerFactor && (
        <div style={{ 
          marginTop: '4px', 
          fontSize: '10px',
          padding: '2px 4px',
          backgroundColor: 'rgba(255,255,255,0.2)',
          borderRadius: '4px'
        }}>
          PF: {data.results.powerFactor.toFixed(3)}
        </div>
      )}

      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{ background: '#1f2937', width: 8, height: 8 }}
      />

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ background: '#1f2937', width: 8, height: 8 }}
      />
    </div>
  )
})

CapBankNode.displayName = 'CapBankNode'

CapBankNode.propTypes = {
  data: PropTypes.shape({
    label: PropTypes.string,
    parameters: PropTypes.shape({
      kVAR: PropTypes.number,
      voltage: PropTypes.number,
      stages: PropTypes.number,
    }),
    results: PropTypes.object,
  }),
  selected: PropTypes.bool,
}

export default CapBankNode
