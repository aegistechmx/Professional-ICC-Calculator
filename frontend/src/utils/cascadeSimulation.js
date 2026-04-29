/* eslint-disable no-console */
/**
 * Cascade Simulation Engine
 * Dynamic simulation of protection system response to faults
 */

import { EventQueue, createTripEvent, EVENT_TYPES } from './eventEngine'
import { calcTripTime } from './protection'
import { calcLineFlows } from './lineFlows'

/**
 * Evaluate relays and determine trip times
 * @param {Array} relays - Relay configurations
 * @param {Array} flows - Current flows
 * @param {number} currentTime - Current simulation time
 * @returns {Array} Array of trip events
 */
export function evaluateRelays(relays, flows, currentTime) {
  const trips = []

  for (const relay of relays) {
    const flow = flows.find(f => f.from === relay.bus)
    if (!flow) continue

    const tripTime = calcTripTime(flow.IkA, relay)

    if (tripTime !== Infinity) {
      trips.push({
        relayId: relay.id,
        time: currentTime + tripTime,
        tripTime,
        current: flow.IkA,
        pickup: relay.pickup_kA,
      })
    }
  }

  return trips
}

/**
 * Apply fault to system state
 * @param {Object} state - Current system state
 * @param {string} busId - Bus where fault occurs
 * @param {Object} faultData - Fault parameters
 * @returns {Object} Updated system state
 */
export function applyFaultToState(state, busId, faultData = {}) {
  const newNodes = state.nodes.map(node => {
    if (node.id === busId) {
      return {
        ...node,
        data: {
          ...node.data,
          fault: true,
          faultType: faultData.faultType || '3P',
        },
        style: {
          ...node.style,
          background: '#ff0000',
          border: '4px solid #8b0000',
        },
      }
    }
    return node
  })

  return {
    ...state,
    nodes: newNodes,
    faultBus: busId,
    faultActive: true,
  }
}

/**
 * Open breaker in system state
 * @param {Object} state - Current system state
 * @param {string} relayId - Relay ID to trip
 * @returns {Object} Updated system state
 */
export function openBreaker(state, relayId) {
  // Find edges associated with this relay
  const newEdges = state.edges.map(edge => {
    if (edge.data.relayId === relayId) {
      return {
        ...edge,
        data: {
          ...edge.data,
          status: 'open',
          tripped: true,
          tripTime: state.currentTime,
        },
        style: {
          ...edge.style,
          stroke: '#ff0000',
          strokeWidth: 1,
          strokeDasharray: 'none',
          animated: false,
        },
      }
    }
    return edge
  })

  return {
    ...state,
    edges: newEdges,
    trippedRelays: [...(state.trippedRelays || []), relayId],
  }
}

/**
 * Run cascade simulation
 * @param {Object} initialState - Initial system state
 * @param {Array} relays - Relay configurations
 * @param {string} faultBus - Bus where fault occurs
 * @param {Object} options - Simulation options
 * @returns {Object} Simulation timeline and results
 */
export async function simulateCascade(
  initialState,
  relays,
  faultBus,
  options = {}
) {
  const {
    maxTime = 2.0,
    timeStep = 0.01,
    solvePowerFlow,
    calculateCurrents,
  } = options

  const eventQueue = new EventQueue()
  eventQueue.add({
    time: 0,
    type: EVENT_TYPES.FAULT,
    elementId: faultBus,
  })

  let state = { ...initialState, currentTime: 0, trippedRelays: [] }
  const timeline = []

  while (!eventQueue.isEmpty() && state.currentTime < maxTime) {
    const event = eventQueue.getNext()
    state.currentTime = event.time

    // Apply event
    if (event.type === EVENT_TYPES.FAULT) {
      state = applyFaultToState(state, event.elementId, event.data)
    } else if (event.type === EVENT_TYPES.TRIP) {
      state = openBreaker(state, event.elementId)
    }

    // Recalculate system (new currents after fault/trip)
    const powerFlowResult = await solvePowerFlow(state.nodes, state.edges, {
      Sbase_MVA: 100,
    })

    if (!powerFlowResult.success) {
      console.warn('Power flow failed during cascade simulation')
      break
    }

    // Calculate flows
    const branches = state.edges.map(e => ({
      from: e.source,
      to: e.target,
      R: e.data.R || 0.01,
      X: e.data.X || 0.1,
      B: e.data.B || 0,
      tap: e.data.tap || 1,
    }))

    const flows = calcLineFlows(
      branches,
      powerFlowResult.Y,
      powerFlowResult.V,
      powerFlowResult.theta,
      powerFlowResult.index
    )

    const flowsWithI = calculateCurrents(
      flows,
      powerFlowResult.V,
      powerFlowResult.base,
      powerFlowResult.index
    )

    // Evaluate relays
    const trips = evaluateRelays(relays, flowsWithI, state.currentTime)

    // Add trip events for relays that haven't tripped yet
    for (const trip of trips) {
      if (!state.trippedRelays.includes(trip.relayId)) {
        eventQueue.add(createTripEvent(trip.relayId, trip.time))
      }
    }

    // Record timeline step
    timeline.push({
      time: state.currentTime,
      state: { ...state },
      flows: flowsWithI,
      powerFlow: powerFlowResult,
      event,
    })

    // Advance time if no more events
    if (eventQueue.isEmpty() && state.currentTime < maxTime) {
      state.currentTime = Math.min(state.currentTime + timeStep, maxTime)
    }
  }

  return {
    timeline,
    finalState: state,
    trippedRelays: state.trippedRelays || [],
    simulationTime: state.currentTime,
  }
}

/**
 * Get simulation summary
 * @param {Object} simulationResult - Result from simulateCascade
 * @returns {Object} Summary statistics
 */
export function getSimulationSummary(simulationResult) {
  const { timeline, trippedRelays, simulationTime } = simulationResult

  const faultEvent = timeline.find(t => t.event.type === EVENT_TYPES.FAULT)
  const tripEvents = timeline.filter(t => t.event.type === EVENT_TYPES.TRIP)

  return {
    totalEvents: timeline.length,
    faultTime: faultEvent?.time || 0,
    firstTripTime: tripEvents[0]?.time || null,
    lastTripTime: tripEvents[tripEvents.length - 1]?.time || null,
    totalTripped: trippedRelays.length,
    simulationDuration: simulationTime,
    trippedSequence: tripEvents.map(t => ({
      relayId: t.event.elementId,
      time: t.event.time,
    })),
  }
}
