/**
 * DirectionalProtection - Zone-Based Directional Protection
 *
 * This module implements directional protection relays that:
 * - Analyze current angle to determine fault direction
 * - Use zone-based protection logic
 * - Support multiple protection zones (forward/reverse)
 * - Implement angle-based tripping criteria
 *
 * Architecture:
 * Current → Angle Calculation → Zone Check → Trip Decision
 *
 * @class DirectionalProtection
 */

class DirectionalProtection {
  /**
   * Create a new directional protection relay
   * @param {Object} config - Relay configuration
   * @param {string} config.id - Relay ID
   * @param {string} config.location - Relay location (bus ID)
   * @param {Object} config.zones - Protection zones configuration
   * @param {number} config.pickup - Pickup current (A)
   * @param {number} config.timeDelay - Time delay (s)
   * @param {string} config.polarizing - Polarizing method ('voltage', 'current')
   */
  constructor(config = {}) {
    this.id = config.id || 'dir_prot_1'
    this.location = config.location || null
    this.pickup = config.pickup || 5.0 // A
    this.timeDelay = config.timeDelay || 0.1 // s
    this.polarizing = config.polarizing || 'voltage' // voltage (V)

    // Protection zones
    this.zones = config.zones || {
      zone1: {
        angleMin: -30, // degrees
        angleMax: 30, // degrees
        trip: true,
        description: 'Forward zone',
      },
      zone2: {
        angleMin: 150,
        angleMax: 210,
        trip: false,
        description: 'Reverse zone (blocking)',
      },
    }

    // Relay state
    this.state = {
      current: 0,
      angle: 0,
      voltage: 0,
      inZone: false,
      trip: false,
      blocked: false,
      lastTripTime: null,
    }
  }

  /**
   * Calculate current angle for directional determination
   * @param {Object} phasors - Current and voltage phasors
   * @param {Object} phasors.I - Current phasor { magnitude, angle }
   * @param {Object} phasors.V - Voltage phasor { magnitude, angle }
   * @returns {Object} Angle calculation result
   */
  calculateAngle(phasors) {
    const { I, V } = phasors

    // Calculate angle difference between current and voltage
    let angle

    if (this.polarizing === 'voltage' && V) { // voltage (V)
      // Voltage polarizing: angle = angle(I) - angle(V)
      angle = I.angle - V.angle
    } else if (this.polarizing === 'current' && I) { // current (A)
      // Current polarizing: angle = angle(I) relative to reference
      angle = I.angle
    } else {
      // Default: use current angle
      angle = I ? I.angle : 0
    }

    // Normalize angle to -180 to 180 range
    while (angle > 180) angle -= 360
    while (angle < -180) angle += 360

    return {
      angle,
      magnitude: I ? I.magnitude : 0,
      voltage: V ? V.magnitude : 0,
    }
  }

  /**
   * Check if current angle is within a protection zone
   * @param {number} angle - Current angle (degrees)
   * @param {Object} zone - Zone configuration
   * @returns {boolean} True if in zone
   */
  isInZone(angle, zone) {
    // Handle zone crossing -180/180 boundary
    if (zone.angleMin < -90 && zone.angleMax > 90) {
      // Zone crosses the -180/180 boundary
      return angle >= zone.angleMin || angle <= zone.angleMax
    }

    return angle >= zone.angleMin && angle <= zone.angleMax
  }

  /**
   * Determine which zone the current is in
   * @param {number} angle - Current angle (degrees)
   * @returns {Object} Zone information
   */
  determineZone(angle) {
    for (const [zoneName, zoneConfig] of Object.entries(this.zones)) {
      if (this.isInZone(angle, zoneConfig)) {
        return {
          zone: zoneName,
          inZone: true,
          trip: zoneConfig.trip,
          description: zoneConfig.description,
        }
      }
    }

    return {
      zone: null,
      inZone: false,
      trip: false,
      description: 'Outside all zones',
    }
  }

  /**
   * Evaluate if relay should trip
   * @param {Object} measurement - Current measurement
   * @param {number} measurement.I - Current magnitude (A)
   * @param {number} measurement.I_angle - Current angle (degrees)
   * @param {number} measurement.V - Voltage magnitude (V)
   * @param {number} measurement.V_angle - Voltage angle (degrees)
   * @returns {Object} Trip decision
   */
  evaluate(measurement) {
    const { I, I_angle, V, V_angle } = measurement

    // Update state
    this.state.current = I // current (A)
    this.state.voltage = V // voltage (V)

    // Calculate angle
    const angleResult = this.calculateAngle({
      I: { magnitude: I, angle: I_angle },
      V: { magnitude: V, angle: V_angle },
    })

    this.state.angle = angleResult.angle

    // Check pickup
    if (I < this.pickup) {
      this.state.inZone = false
      this.state.trip = false
      return {
        trip: false,
        reason: 'Below pickup threshold',
        current: I,
        pickup: this.pickup,
      }
    }

    // Determine zone
    const zoneResult = this.determineZone(angleResult.angle)
    this.state.inZone = zoneResult.inZone

    // Check if in tripping zone
    if (zoneResult.inZone && zoneResult.trip) {
      this.state.trip = true
      this.state.lastTripTime = Date.now()
      return {
        trip: true,
        reason: 'In tripping zone',
        zone: zoneResult.zone,
        angle: angleResult.angle,
        current: I,
      }
    }

    // Check if in blocking zone
    if (zoneResult.inZone && !zoneResult.trip) {
      this.state.blocked = true
      return {
        trip: false,
        blocked: true,
        reason: 'In blocking zone',
        zone: zoneResult.zone,
        angle: angleResult.angle,
        current: I,
      }
    }

    // Outside all zones
    this.state.trip = false
    this.state.blocked = false
    return {
      trip: false,
      blocked: false,
      reason: 'Outside all zones',
      angle: angleResult.angle,
      current: I,
    }
  }

  /**
   * Get relay state
   * @returns {Object} Current relay state
   */
  getState() {
    return {
      ...this.state,
      id: this.id,
      location: this.location,
      pickup: this.pickup,
      timeDelay: this.timeDelay,
      polarizing: this.polarizing,
    }
  }

  /**
   * Reset relay to initial state
   */
  reset() {
    this.state = {
      current: 0,
      angle: 0,
      voltage: 0,
      inZone: false,
      trip: false,
      blocked: false,
      lastTripTime: null,
    }
  }

  /**
   * Update zone configuration
   * @param {string} zoneName - Zone name
   * @param {Object} zoneConfig - Zone configuration
   */
  updateZone(zoneName, zoneConfig) {
    this.zones[zoneName] = {
      ...this.zones[zoneName],
      ...zoneConfig,
    }
  }

  /**
   * Add a new protection zone
   * @param {string} zoneName - Zone name
   * @param {Object} zoneConfig - Zone configuration
   */
  addZone(zoneName, zoneConfig) {
    this.zones[zoneName] = {
      angleMin: -180,
      angleMax: 180,
      trip: false,
      description: 'Custom zone',
      ...zoneConfig,
    }
  }

  /**
   * Remove a protection zone
   * @param {string} zoneName - Zone name to remove
   */
  removeZone(zoneName) {
    delete this.zones[zoneName]
  }

  /**
   * Get zone configuration
   * @returns {Object} All zone configurations
   */
  getZones() {
    return { ...this.zones }
  }
}

/**
 * Multi-Zone Directional Protection
 * Supports multiple protection zones with different settings
 */
class MultiZoneDirectionalProtection extends DirectionalProtection {
  constructor(config = {}) {
    super(config)

    // Initialize with standard IEC zones
    this.zones = config.zones || {
      zone1: {
        angleMin: -30,
        angleMax: 30,
        trip: true,
        timeDelay: 0,
        reach: 0.8, // 80% of line
        description: 'Zone 1: Instantaneous (80% reach)',
      },
      zone2: {
        angleMin: -30,
        angleMax: 30,
        trip: true,
        timeDelay: 0.3,
        reach: 1.2, // 120% of line
        description: 'Zone 2: Time-delayed (120% reach)',
      },
      zone3: {
        angleMin: -30,
        angleMax: 30,
        trip: true,
        timeDelay: 1.0,
        reach: 2.0, // 200% of line
        description: 'Zone 3: Backup (200% reach)',
      },
      reverse: {
        angleMin: 150,
        angleMax: 210,
        trip: false,
        description: 'Reverse zone (blocking)',
      },
    }
  }

  /**
   * Evaluate with zone-specific time delays
   * @param {Object} measurement - Current measurement
   * @param {number} faultDistance - Distance to fault (pu)
   * @returns {Object} Trip decision with zone information
   */
  evaluateWithDistance(measurement, faultDistance = null) {
    const baseResult = this.evaluate(measurement)

    if (!baseResult.trip || !faultDistance) {
      return baseResult
    }

    // Determine which zone based on distance
    let activeZone = null

    for (const [zoneName, zoneConfig] of Object.entries(this.zones)) {
      if (this.isInZone(this.state.angle, zoneConfig) && zoneConfig.trip) {
        if (faultDistance <= zoneConfig.reach) {
          activeZone = zoneName
          break
        }
      }
    }

    if (activeZone) {
      const zoneConfig = this.zones[activeZone]
      return {
        ...baseResult,
        zone: activeZone,
        timeDelay: zoneConfig.timeDelay,
        reach: zoneConfig.reach,
        faultDistance,
      }
    }

    return baseResult
  }
}

module.exports = {
  DirectionalProtection,
  MultiZoneDirectionalProtection,
}
