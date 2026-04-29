/**
 * Timeline Playback for Dynamic Simulation Visualization
 * Plays back simulation timeline in real-time or accelerated
 */

/**
 * Play timeline with real-time visualization
 * @param {Array} timeline - Simulation timeline
 * @param {Function} set - setState function from useStore
 * @param {Object} options - Playback options
 * @returns {Promise<void>}
 */
export async function playTimeline(timeline, set, options = {}) {
  const {
    speed = 1, // Playback speed multiplier
    delay = 300, // Delay between steps (ms)
    onStep = null, // Callback for each step
    onComplete = null, // Callback when complete
  } = options

  for (let i = 0; i < timeline.length; i++) {
    const step = timeline[i]

    // Update ReactFlow with current state
    set({
      nodes: step.state.nodes,
      edges: step.state.edges,
      currentTime: step.time,
      currentEvent: step.event,
    })

    // Call step callback if provided
    if (onStep) {
      onStep(step, i)
    }

    // Wait before next step
    await new Promise(resolve => setTimeout(resolve, delay / speed))
  }

  // Call complete callback if provided
  if (onComplete) {
    onComplete()
  }
}

/**
 * Get timeline statistics
 * @param {Array} timeline - Simulation timeline
 * @returns {Object} Timeline statistics
 */
export function getTimelineStats(timeline) {
  if (!timeline || timeline.length === 0) {
    return {
      totalSteps: 0,
      duration: 0,
      faultEvent: null,
      tripEvents: [],
      maxCurrent: 0,
    }
  }

  const faultEvent = timeline.find(t => t.event.type === 'fault')
  const tripEvents = timeline.filter(t => t.event.type === 'trip')
  const maxCurrent = timeline.reduce((max, step) => {
    const maxFlow = step.flows.reduce(
      (flowMax, f) => Math.max(flowMax, f.IkA || 0),
      0
    )
    return Math.max(max, maxFlow)
  }, 0)

  return {
    totalSteps: timeline.length,
    duration: timeline[timeline.length - 1].time,
    faultTime: faultEvent?.time || 0,
    firstTripTime: tripEvents[0]?.event?.time || null,
    lastTripTime: tripEvents[tripEvents.length - 1]?.event?.time || null,
    totalTrips: tripEvents.length,
    maxCurrent,
    faultEvent,
    tripEvents,
  }
}
