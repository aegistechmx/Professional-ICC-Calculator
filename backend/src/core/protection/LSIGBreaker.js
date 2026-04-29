/**
 * LSIGBreaker - Real Breaker Protection (Long, Short, Instant, Ground)
 *
 * This module implements realistic circuit breaker protection with:
 * - Long Time (L): Overload protection with inverse time characteristic
 * - Short Time (S): Short circuit protection with definite time
 * - Instantaneous (I): Instantaneous trip for high currents
 * - Ground (G): Ground fault protection with separate settings
 *
 * Architecture:
 * Current → LSIG Elements → Trip Logic → Breaker Action
 *
 * @class LSIGBreaker
 */

class LSIGBreaker {
  /**
   * Create a new LSIG breaker
   * @param {Object} config - Breaker configuration
   * @param {string} config.id - Breaker ID
   * @param {string} config.location - Breaker location (bus ID)
   * @param {Object} config.longTime - Long time settings
   * @param {Object} config.shortTime - Short time settings
   * @param {Object} config.instantaneous - Instantaneous settings
   * @param {Object} config.ground - Ground fault settings
   * @param {Object} config.temporalDelays - Temporal delay settings
   */
  constructor(config = {}) {
    this.id = config.id || 'lsig_breaker_1'
    this.location = config.location || null

    // Long Time (L) - Overload protection
    this.longTime = config.longTime || {
      pickup: 1.0, // pu of rated current
      timeDelay: 2.0, // s
      curve: 'standard_inverse',
      enable: true,
    }

    // Short Time (S) - Short circuit protection
    this.shortTime = config.shortTime || {
      pickup: 6.0, // pu
      timeDelay: 0.1, // s
      curve: 'very_inverse',
      enable: true,
    }

    // Instantaneous (I) - High current protection
    this.instantaneous = config.instantaneous || {
      pickup: 10.0, // pu
      enable: true,
    }

    // Ground (G) - Ground fault protection
    this.ground = config.ground || {
      pickup: 0.5, // pu
      timeDelay: 0.3, // s
      curve: 'very_inverse',
      enable: true,
    }

    // Real temporal delays (NEW)
    this.temporalDelays = config.temporalDelays || {
      // Relay pickup delay (time for relay to detect fault)
      relayPickupDelay: 0.016, // 16ms (typical for modern relays)

      // Mechanical breaker delay (time for breaker to open contacts)
      breakerMechanicalDelay: 0.05, // 50ms (typical for power breakers)

      // Arc extinction delay (time for arc to extinguish)
      arcExtinctionDelay: 0.01, // 10ms

      // Total clearing time = pickup + mechanical + arc extinction
      totalClearingTime: 0.076, // 76ms total
    }

    // Breaker state
    this.state = {
      current: 0,
      groundCurrent: 0,
      longTimeTrip: false,
      shortTimeTrip: false,
      instantaneousTrip: false,
      groundTrip: false,
      overallTrip: false,
      tripTime: null,
      tripElement: null,
      closed: true,

      // Temporal state (NEW)
      faultDetectedAt: null,
      relayPickupAt: null,
      breakerCommandAt: null,
      breakerOpenedAt: null,
      arcExtinguishedAt: null,
      totalClearingTime: null,
    }

    // Rated current (A)
    this.ratedCurrent = config.ratedCurrent || 100 // A
  }

  /**
   * Calculate operating time for inverse time curves
   * @param {number} current - Current (pu)
   * @param {number} pickup - Pickup (pu)
   * @param {string} curve - Curve type
   * @param {number} timeDelay - Time delay multiplier (s)
   * @returns {number} Operating time (s)
   */
  calculateInverseTime(current, pickup, curve, timeDelay) {
    if (current <= pickup) return Infinity
    // current (A)

    const M = current / pickup // Multiple of pickup

    switch (curve) {
      case 'standard_inverse':
        return timeDelay * (0.14 / (M ** 0.02 - 1))
      case 'very_inverse':
        return timeDelay * (13.5 / (M - 1))
      case 'extremely_inverse':
        return timeDelay * (80 / (M ** 2 - 1))
      case 'long_inverse':
        return timeDelay * (120 / (M - 1))
      case 'moderately_inverse':
        return timeDelay * (1 / (M ** 0.02 - 0.02))
      default:
        return timeDelay * (0.14 / (M ** 0.02 - 1))
    }
  }

  /**
   * Evaluate Long Time (L) element
   * @param {number} current - Current (A)
   * @returns {Object} Long time evaluation result
   */
  evaluateLongTime(current) {
    if (!this.longTime.enable) {
      return { trip: false, reason: 'Long time disabled' }
    }

    const current_pu = current / this.ratedCurrent
    // current (A)

    if (current_pu < this.longTime.pickup) {
      return {
        trip: false,
        reason: 'Below long time pickup',
        current_pu,
        pickup: this.longTime.pickup,
      }
    }

    const operatingTime = this.calculateInverseTime(
      current_pu,
      this.longTime.pickup,
      this.longTime.curve,
      this.longTime.timeDelay
    )

    return {
      trip: true,
      operatingTime,
      current_pu,
      pickup: this.longTime.pickup,
      curve: this.longTime.curve,
    }
  }

  /**
   * Evaluate Short Time (S) element
   * @param {number} current - Current (A)
   * @returns {Object} Short time evaluation result
   */
  evaluateShortTime(current) {
    if (!this.shortTime.enable) {
      return { trip: false, reason: 'Short time disabled' }
    }

    const current_pu = current / this.ratedCurrent
    // current (A)

    if (current_pu < this.shortTime.pickup) {
      return {
        trip: false,
        reason: 'Below short time pickup',
        current_pu,
        pickup: this.shortTime.pickup,
      }
    }

    const operatingTime = this.calculateInverseTime(
      current_pu,
      this.shortTime.pickup,
      this.shortTime.curve,
      this.shortTime.timeDelay
    )

    return {
      trip: true,
      operatingTime,
      current_pu,
      pickup: this.shortTime.pickup,
      curve: this.shortTime.curve,
    }
  }

  /**
   * Evaluate Instantaneous (I) element
   * @param {number} current - Current (A)
   * @returns {Object} Instantaneous evaluation result
   */
  evaluateInstantaneous(current) {
    if (!this.instantaneous.enable) {
      return { trip: false, reason: 'Instantaneous disabled' }
    }

    const current_pu = current / this.ratedCurrent
    // current (A)

    if (current_pu < this.instantaneous.pickup) {
      return {
        trip: false,
        reason: 'Below instantaneous pickup',
        current_pu,
        pickup: this.instantaneous.pickup,
      }
    }

    return {
      trip: true,
      operatingTime: 0, // Instantaneous
      current_pu,
      pickup: this.instantaneous.pickup,
    }
  }

  /**
   * Evaluate Ground (G) element
   * @param {number} groundCurrent - Ground current (A)
   * @returns {Object} Ground evaluation result
   */
  evaluateGround(groundCurrent) {
    if (!this.ground.enable) {
      return { trip: false, reason: 'Ground protection disabled' }
    }

    const current_pu = groundCurrent / this.ratedCurrent
    // current (A)

    if (current_pu < this.ground.pickup) {
      return {
        trip: false,
        reason: 'Below ground pickup',
        current_pu,
        pickup: this.ground.pickup,
      }
    }

    const operatingTime = this.calculateInverseTime(
      current_pu,
      this.ground.pickup,
      this.ground.curve,
      this.ground.timeDelay
    )

    return {
      trip: true,
      operatingTime,
      current_pu,
      pickup: this.ground.pickup,
      curve: this.ground.curve,
    }
  }

  /**
   * Evaluate complete LSIG protection with real temporal delays
   * @param {Object} measurement - Current measurement
   * @param {number} measurement.I - Phase current (A)
   * @param {number} measurement.Ig - Ground current (A)
   * @param {number} currentTime - Current simulation time (s)
   * @returns {Object} Complete LSIG evaluation result
   */
  evaluate(measurement, currentTime = 0) {
    // current (A)
    const { I, Ig } = measurement

    // Update state
    this.state.current = I
    // current (A)
    this.state.groundCurrent = Ig

    // Evaluate each element
    const longTimeResult = this.evaluateLongTime(I)
    const shortTimeResult = this.evaluateShortTime(I)
    const instantaneousResult = this.evaluateInstantaneous(I)
    const groundResult = this.evaluateGround(Ig)

    // Determine which element trips first (with temporal delays)
    const trips = []

    if (longTimeResult.trip) {
      const totalDelay =
        longTimeResult.operatingTime +
        this.temporalDelays.relayPickupDelay +
        this.temporalDelays.breakerMechanicalDelay +
        this.temporalDelays.arcExtinctionDelay
      trips.push({
        element: 'longTime',
        operatingTime: longTimeResult.operatingTime,
        totalClearingTime: totalDelay,
        tripAt: currentTime + totalDelay,
      })
    }

    if (shortTimeResult.trip) {
      const totalDelay =
        shortTimeResult.operatingTime +
        this.temporalDelays.relayPickupDelay +
        this.temporalDelays.breakerMechanicalDelay +
        this.temporalDelays.arcExtinctionDelay
      trips.push({
        element: 'shortTime',
        operatingTime: shortTimeResult.operatingTime,
        totalClearingTime: totalDelay,
        tripAt: currentTime + totalDelay,
      })
    }

    if (instantaneousResult.trip) {
      const totalDelay =
        instantaneousResult.operatingTime +
        this.temporalDelays.relayPickupDelay +
        this.temporalDelays.breakerMechanicalDelay +
        this.temporalDelays.arcExtinctionDelay
      trips.push({
        element: 'instantaneous',
        operatingTime: instantaneousResult.operatingTime,
        totalClearingTime: totalDelay,
        tripAt: currentTime + totalDelay,
      })
    }

    if (groundResult.trip) {
      const totalDelay =
        groundResult.operatingTime +
        this.temporalDelays.relayPickupDelay +
        this.temporalDelays.breakerMechanicalDelay +
        this.temporalDelays.arcExtinctionDelay
      trips.push({
        element: 'ground',
        operatingTime: groundResult.operatingTime,
        totalClearingTime: totalDelay,
        tripAt: currentTime + totalDelay,
      })
    }

    // Sort by trip time (fastest first)
    trips.sort((a, b) => a.tripAt - b.tripAt)

    // Determine overall trip
    const overallTrip = trips.length > 0
    const tripElement = overallTrip ? trips[0].element : null
    const tripTime = overallTrip ? trips[0].tripAt : null

    // Update temporal state (NEW)
    if (overallTrip && !this.state.overallTrip) {
      // Fault just detected
      this.state.faultDetectedAt = currentTime
      // current (A)
      this.state.relayPickupAt =
        currentTime + this.temporalDelays.relayPickupDelay
      this.state.breakerCommandAt =
        trips[0].tripAt - this.temporalDelays.arcExtinctionDelay
      this.state.breakerOpenedAt = trips[0].tripAt
      this.state.arcExtinguishedAt = trips[0].tripAt
      this.state.totalClearingTime = trips[0].totalClearingTime
    }

    // Update state
    this.state.longTimeTrip = longTimeResult.trip
    this.state.shortTimeTrip = shortTimeResult.trip
    this.state.instantaneousTrip = instantaneousResult.trip
    this.state.groundTrip = groundResult.trip
    this.state.overallTrip = overallTrip
    this.state.tripTime = tripTime
    this.state.tripElement = tripElement

    return {
      overallTrip,
      tripElement,
      tripTime,
      elements: {
        longTime: longTimeResult,
        shortTime: shortTimeResult,
        instantaneous: instantaneousResult,
        ground: groundResult,
      },
      trips,
      temporalDelays: this.temporalDelays,
      temporalState: {
        faultDetectedAt: this.state.faultDetectedAt,
        relayPickupAt: this.state.relayPickupAt,
        breakerCommandAt: this.state.breakerCommandAt,
        breakerOpenedAt: this.state.breakerOpenedAt,
        totalClearingTime: this.state.totalClearingTime,
      },
    }
  }

  /**
   * Check if breaker should trip at current time
   * @param {number} currentTime - Current simulation time
   * @returns {boolean} True if breaker should trip
   */
  shouldTrip(currentTime) {
    if (!this.state.tripTime) return false
    return currentTime >= this.state.tripTime
    // current (A)
  }

  /**
   * Reset breaker state
   */
  reset() {
    this.state = {
      current: 0,
      groundCurrent: 0,
      longTimeTrip: false,
      shortTimeTrip: false,
      instantaneousTrip: false,
      groundTrip: false,
      overallTrip: false,
      tripTime: null,
      tripElement: null,
      closed: true,
      faultDetectedAt: null,
      relayPickupAt: null,
      breakerCommandAt: null,
      breakerOpenedAt: null,
      arcExtinguishedAt: null,
      totalClearingTime: null,
    }
  }

  /**
   * Trip the breaker
   */
  trip() {
    this.state.closed = false
    this.state.overallTrip = true
    this.state.tripTime = Date.now()
  }

  /**
   * Close the breaker
   */
  close() {
    this.state.closed = true
    this.state.overallTrip = false
    this.state.tripElement = null
    this.state.tripTime = null

    // Reset element trips
    this.state.longTimeTrip = false
    this.state.shortTimeTrip = false
    this.state.instantaneousTrip = false
    this.state.groundTrip = false
  }

  /**
   * Get breaker state
   * @returns {Object} Current breaker state
   */
  getState() {
    return {
      ...this.state,
      id: this.id,
      location: this.location,
      ratedCurrent: this.ratedCurrent,
      settings: {
        longTime: this.longTime,
        shortTime: this.shortTime,
        instantaneous: this.instantaneous,
        ground: this.ground,
      },
    }
  }

  /**
   * Update Long Time settings
   * @param {Object} settings - New long time settings
   */
  updateLongTime(settings) {
    this.longTime = {
      ...this.longTime,
      ...settings,
    }
  }

  /**
   * Update Short Time settings
   * @param {Object} settings - New short time settings
   */
  updateShortTime(settings) {
    this.shortTime = {
      ...this.shortTime,
      ...settings,
    }
  }

  /**
   * Update Instantaneous settings
   * @param {Object} settings - New instantaneous settings
   */
  updateInstantaneous(settings) {
    this.instantaneous = {
      ...this.instantaneous,
      ...settings,
    }
  }

  /**
   * Update Ground settings
   * @param {Object} settings - New ground settings
   */
  updateGround(settings) {
    this.ground = {
      ...this.ground,
      ...settings,
    }
  }

  /**
   * Enable/disable element
   * @param {string} element - Element name ('L', 'S', 'I', 'G')
   * @param {boolean} enable - Enable/disable
   */
  setElementEnabled(element, enable) {
    switch (element) {
      case 'L':
        this.longTime.enable = enable
        break
      case 'S':
        this.shortTime.enable = enable
        break
      case 'I':
        this.instantaneous.enable = enable
        break
      case 'G':
        this.ground.enable = enable
        break
    }
  }
}

/**
 * LSIGBreaker with Coordination
 * Extends LSIGBreaker with coordination capabilities
 */
class LSIGBreakerCoordination extends LSIGBreaker {
  constructor(config = {}) {
    super(config)

    // Coordination settings
    this.coordination = config.coordination || {
      upstreamBreaker: null,
      downstreamBreaker: null,
      coordinationMargin: 0.3, // 300ms margin
      enable: true,
    }
  }

  /**
   * Evaluate with coordination
   * @param {Object} measurement - Current measurement
   * @param {Object} upstreamState - Upstream breaker state
   * @param {Object} downstreamState - Downstream breaker state
   * @returns {Object} Coordination evaluation result
   */
  evaluateWithCoordination(
    measurement,
    upstreamState = null,
    downstreamState = null
  ) {
    const baseResult = this.evaluate(measurement)

    if (!this.coordination.enable) {
      return baseResult
    }

    // Check coordination with upstream breaker
    if (upstreamState && upstreamState.tripTime) {
      const coordinationTime =
        upstreamState.tripTime - this.coordination.coordinationMargin

      if (baseResult.tripTime < coordinationTime) {
        return {
          ...baseResult,
          coordinationIssue: true,
          reason: 'Trips before upstream breaker coordination margin',
          requiredTime: coordinationTime,
          actualTime: baseResult.tripTime,
          margin: coordinationTime - baseResult.tripTime,
        }
      }
    }

    // Check coordination with downstream breaker
    if (downstreamState && downstreamState.tripTime) {
      const coordinationTime =
        downstreamState.tripTime + this.coordination.coordinationMargin

      if (baseResult.tripTime > coordinationTime) {
        return {
          ...baseResult,
          coordinationIssue: true,
          reason: 'Trips after downstream breaker coordination margin',
          requiredTime: coordinationTime,
          actualTime: baseResult.tripTime,
          margin: baseResult.tripTime - coordinationTime,
        }
      }
    }

    return {
      ...baseResult,
      coordinationOK: true,
    }
  }

  /**
   * Auto-adjust settings for coordination
   * @param {Object} upstreamBreaker - Upstream breaker instance
   * @param {Object} downstreamBreaker - Downstream breaker instance
   * @returns {Object} Adjustment recommendations
   */
  autoAdjustForCoordination(upstreamBreaker = null, downstreamBreaker = null) {
    const recommendations = []

    if (upstreamBreaker) {
      // Adjust long time to be faster than upstream
      const upstreamLT = upstreamBreaker.longTime
      if (this.longTime.timeDelay >= upstreamLT.timeDelay) {
        const newDelay =
          upstreamLT.timeDelay - this.coordination.coordinationMargin
        recommendations.push({
          element: 'L',
          setting: 'timeDelay',
          currentValue: this.longTime.timeDelay,
          recommendedValue: newDelay,
          reason: 'Faster than upstream for coordination',
        })
      }
    }

    if (downstreamBreaker) {
      // Adjust long time to be slower than downstream
      const downstreamLT = downstreamBreaker.longTime
      if (this.longTime.timeDelay <= downstreamLT.timeDelay) {
        const newDelay =
          downstreamLT.timeDelay + this.coordination.coordinationMargin
        recommendations.push({
          element: 'L',
          setting: 'timeDelay',
          currentValue: this.longTime.timeDelay,
          recommendedValue: newDelay,
          reason: 'Slower than downstream for coordination',
        })
      }
    }

    return recommendations
  }
}

module.exports = {
  LSIGBreaker,
  LSIGBreakerCoordination,
}
