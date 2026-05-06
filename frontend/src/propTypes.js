/**
 * Centralized PropTypes definitions for React components
 * Provides reusable validation schemas for common props
 */

import PropTypes from 'prop-types';

// Electrical parameter validation
export const electricalPropTypes = {
  voltage: PropTypes.number,
  current: PropTypes.number,
  impedance: PropTypes.number,
  power: PropTypes.number,
  frequency: PropTypes.number,
  material: PropTypes.oneOf(['Cu', 'Al', 'cobre', 'aluminio']),
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  temperature: PropTypes.number
};

// Graph structure validation
export const graphPropTypes = {
  nodes: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    position: PropTypes.shape({
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired
    }),
    data: PropTypes.shape({
      parameters: PropTypes.shape(electricalPropTypes)
    })
  })),
  edges: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    source: PropTypes.string.isRequired,
    target: PropTypes.string.isRequired,
    data: PropTypes.shape({
      longitudinal: PropTypes.number,
      material: PropTypes.string,
      calibre: PropTypes.string
    })
  }))
};

// ICC calculation results validation
export const iccResultPropTypes = {
  Isc: PropTypes.number,
  voltage: PropTypes.number,
  impedance: PropTypes.number,
  faultBus: PropTypes.string,
  method: PropTypes.string,
  timestamp: PropTypes.string
};

// Optimization results validation
export const optimizationPropTypes = {
  metrics: PropTypes.shape({
    coordinated: PropTypes.number,
    total: PropTypes.number,
    optimized: PropTypes.bool,
    iterations: PropTypes.number
  }),
  original: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    pickup: PropTypes.number,
    tms: PropTypes.number,
    inst: PropTypes.bool
  })),
  optimized: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    pickup: PropTypes.number,
    tms: PropTypes.number,
    inst: PropTypes.bool
  }))
};

// System model validation
export const systemModelPropTypes = {
  nodes: PropTypes.array,
  edges: PropTypes.array,
  equipment: PropTypes.object,
  timestamp: PropTypes.string
};

// Event handler validation
export const eventHandlerPropTypes = {
  onBusClick: PropTypes.func,
  onBusDrag: PropTypes.func,
  onEdgeClick: PropTypes.func,
  onNodeSelect: PropTypes.func,
  onGraphChange: PropTypes.func
};

// Status and loading states
export const statusPropTypes = {
  loading: PropTypes.bool,
  error: PropTypes.string,
  status: PropTypes.oneOf(['idle', 'calculating', 'completed', 'error']),
  message: PropTypes.string
};

export default {
  electricalPropTypes,
  graphPropTypes,
  iccResultPropTypes,
  optimizationPropTypes,
  systemModelPropTypes,
  eventHandlerPropTypes,
  statusPropTypes
};
