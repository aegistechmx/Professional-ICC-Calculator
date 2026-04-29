/**
 * Protection coordination utilities
 * IEC standard inverse curves and relay coordination
 */

import { calcTripTime as calcIECTripTime, IEC_CURVES } from './iecCurves'

/**
 * Calculate trip time for a relay
 * @param {number} IkA - Current in kA
 * @param {Object} relay - Relay configuration
 * @returns {number} Trip time in seconds
 */
export function calcTripTime(IkA, relay) {
  return calcIECTripTime(
    IkA,
    relay.pickup_kA,
    relay.TMS,
    relay.curve || 'standard'
  )
}

/**
 * Check if protection would trip
 * @param {Object} flow - Flow data with IkA
 * @param {Object} relay - Relay configuration
 * @returns {Object} Trip evaluation result
 */
export function evaluateProtection(flow, relay) {
  const tripTime = calcTripTime(flow.IkA, relay)

  if (tripTime === Infinity) {
    return {
      trip: false,
      time: null,
      message: 'OK - Current below pickup',
      pickup_kA: relay.pickup_kA,
      current_kA: flow.IkA,
    }
  }

  return {
    trip: true,
    time: tripTime,
    message: `TRIP - ${tripTime.toFixed(2)} s`,
    pickup_kA: relay.pickup_kA,
    current_kA: flow.IkA,
  }
}

/**
 * Coordinate relays automatically
 * Ensures upstream relay trips slower than downstream relay
 *
 * @param {Array} relays - Array of relay configurations
 * @param {Array} flows - Array of flow results with currents
 * @param {number} margin - Coordination time margin in seconds (default 0.3s)
 * @returns {Array} Updated relays with adjusted TMS
 */
export function coordinateRelays(relays, flows, margin = 0.3) {
  const updated = [...relays]

  for (const relay of updated) {
    if (!relay.upstream) continue

    const upstream = updated.find(r => r.id === relay.upstream)
    if (!upstream) continue

    // Get current at this bus
    const flow = flows.find(f => f.from === relay.bus)
    if (!flow) continue

    const I = flow.IkA

    const t_down = calcTripTime(I, relay)
    let t_up = calcTripTime(I, upstream)

    // Adjust upstream if not coordinated
    if (t_up <= t_down + margin) {
      // Increase upstream TMS to achieve coordination
      const desiredTime = t_down + margin + 0.1 // Extra 0.1s buffer
      upstream.TMS = Math.max(
        upstream.TMS * 1.2,
        (desiredTime / t_up) * upstream.TMS
      )
    }
  }

  return updated
}

/**
 * Auto-tune relays iteratively
 * Runs coordination algorithm multiple times for convergence
 *
 * @param {Array} relays - Array of relay configurations
 * @param {Array} flows - Array of flow results with currents
 * @param {number} iterations - Number of tuning iterations (default 10)
 * @param {number} margin - Coordination time margin in seconds (default 0.3s)
 * @returns {Array} Tuned relays
 */
export function autoTuneRelays(relays, flows, iterations = 10, margin = 0.3) {
  let tuned = [...relays]

  for (let iter = 0; iter < iterations; iter++) {
    tuned = coordinateRelays(tuned, flows, margin)
  }

  return tuned
}

/**
 * Apply protection status to nodes
 * Updates node border color based on protection trip status
 *
 * @param {Array} nodes - ReactFlow nodes
 * @param {Array} relays - Relay configurations
 * @param {Array} flows - Line flow results with currents
 * @returns {Array} Updated nodes with protection status
 */
export function applyProtection(nodes, relays, flows) {
  return nodes.map(node => {
    const relay = relays.find(r => r.bus === node.id)
    if (!relay) return node

    const flow = flows.find(f => f.from === node.id)
    if (!flow) return node

    const result = evaluateProtection(flow, relay)

    // Color based on trip time
    let borderColor = '2px solid green'
    if (result.trip) {
      if (result.time < 0.3) {
        borderColor = '4px solid red' // Critical
      } else if (result.time < 0.5) {
        borderColor = '3px solid orange' // Warning
      } else {
        borderColor = '2px solid blue' // Will trip but delayed
      }
    }

    return {
      ...node,
      style: {
        ...node.style,
        border: borderColor,
        borderWidth: result.trip ? 3 : 2,
      },
      data: {
        ...node.data,
        protection: result.trip ? `${result.time.toFixed(2)} s` : 'OK',
        protectionResult: result,
        relay: {
          pickup_kA: relay.pickup_kA,
          TMS: relay.TMS,
          curve: relay.curve,
          tripTime: result.time,
        },
      },
    }
  })
}

/**
 * Apply relay state with coordination status
 * Shows coordination information on nodes
 *
 * @param {Array} nodes - ReactFlow nodes
 * @param {Array} relays - Relay configurations
 * @param {Array} flows - Line flow results with currents
 * @returns {Array} Updated nodes with relay state
 */
export function applyRelayState(nodes, relays, flows) {
  return nodes.map(node => {
    const relay = relays.find(r => r.bus === node.id)
    if (!relay) return node

    const flow = flows.find(f => f.from === node.id)
    if (!flow) return node

    const t = calcTripTime(flow.IkA, relay)

    // Check coordination with upstream
    let coordinationStatus = 'OK'
    if (relay.upstream) {
      const upstream = relays.find(r => r.id === relay.upstream)
      if (upstream) {
        const t_up = calcTripTime(flow.IkA, upstream)
        const margin = t_up - t

        if (margin < 0.3) {
          coordinationStatus = 'NOT COORDINATED'
        } else {
          coordinationStatus = 'COORDINATED'
        }
      }
    }

    return {
      ...node,
      data: {
        ...node.data,
        relay: t === Infinity ? 'NO TRIP' : `${t.toFixed(2)} s`,
        coordination: coordinationStatus,
        curve: relay.curve,
        TMS: relay.TMS,
        pickup: relay.pickup_kA,
      },
      style: {
        ...node.style,
        border: t < 0.3 && t !== Infinity ? '3px solid red' : '2px solid green',
      },
    }
  })
}

/**
 * Get protection status color
 * @param {boolean} trip - Whether protection has tripped
 * @param {number} time - Trip time in seconds
 * @returns {string} CSS color
 */
export function getProtectionColor(trip, time) {
  if (!trip) return '#00cc00'
  if (time < 0.3) return '#ff0000'
  if (time < 0.5) return '#ff9900'
  return '#3399ff'
}

/**
 * Validate relay configuration
 * @param {Object} relay - Relay configuration
 * @returns {Object} Validation result
 */
export function validateRelay(relay) {
  const errors = []
  const warnings = []

  if (!relay.pickup_kA || relay.pickup_kA <= 0) {
    errors.push('Pickup current must be positive')
  }

  if (!relay.TMS || relay.TMS <= 0) {
    errors.push('TMS must be positive')
  }

  if (relay.TMS > 10) {
    warnings.push('TMS is very high (>10)')
  }

  if (!IEC_CURVES[relay.curve]) {
    warnings.push(`Unknown curve type: ${relay.curve}`)
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
