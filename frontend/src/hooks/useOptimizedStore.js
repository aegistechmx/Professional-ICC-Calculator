/**
 * Optimized store selectors to reduce re-renders
 * Uses individual selectors to prevent unnecessary updates
 */

import { useStore } from '../store/useStore'

// Individual selectors for frequently accessed state
export const useNodesState = () => useStore(state => state.nodes)
export const useEdgesState = () => useStore(state => state.edges)
export const useSelectedNode = () => useStore(state => state.selectedNode)
export const useSelectedEdge = () => useStore(state => state.selectedEdge)
export const useMode = () => useStore(state => state.mode)
export const useSystemMode = () => useStore(state => state.systemMode)
export const useICResults = () => useStore(state => state.iccResults)
export const usePowerFlowResults = () => useStore(state => state.powerFlowResults)
export const useShortCircuitResults = () => useStore(state => state.shortCircuitResults)

// Action selectors to prevent function recreation
export const useStoreActions = () => useStore(state => ({
  setNodes: state.setNodes,
  setEdges: state.setEdges,
  setSelectedNode: state.setSelectedNode,
  setSelectedEdge: state.setSelectedEdge,
  addNode: state.addNode,
  updateNode: state.updateNode,
  removeNode: state.removeNode,
  updateEdge: state.updateEdge,
  removeEdge: state.removeEdge,
  calculateICC: state.calculateICC,
  calculatePowerFlow: state.calculatePowerFlow,
  calculateShortCircuitFromGraph: state.calculateShortCircuitFromGraph,
}))

// Combined selector for simulation state
export const useSimulationState = () => useStore(state => ({
  isPlaying: state.isPlaying,
  currentTime: state.currentTime,
  maxTime: state.maxTime,
  playbackSpeed: state.playbackSpeed,
}))

// Combined selector for validation state
export const useValidationState = () => useStore(state => ({
  validationErrors: state.validationErrors,
  invalidConnections: state.invalidConnections,
  lastValidationTime: state.lastValidationTime,
}))
