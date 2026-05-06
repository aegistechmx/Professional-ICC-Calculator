/**
 * PhaseGroundProtection - Phase vs Ground Current Separation
 *
 * This module implements protection logic that separates:
 * - I_phase: Phase currents (Ia, Ib, Ic)
 * - I_ground: Ground/neutral current (In, 3I0)
 *
 * This allows for more precise fault analysis and protection coordination.
 *
 * Architecture:
 * Three-Phase Currents → Symmetrical Components → Phase/Ground Separation → Protection Logic
 *
 * @class PhaseGroundProtection
 */

class PhaseGroundProtection {
  /**
   * Create a new phase-ground protection relay
   * @param {Object} config - Relay configuration
   * @param {string} config.id - Relay ID
   * @param {string} config.location - Relay location (bus ID)
   * @param {Object} config.phaseSettings - Phase protection settings
   * @param {Object} config.groundSettings - Ground protection settings
   */
  constructor(config = {}) {
    this.id = config.id || 'pg_prot_1'
    this.location = config.location || null

    // Phase protection settings
    this.phaseSettings = config.phaseSettings || {
      pickup: 5.0, // A
      timeDelay: 0.1, // s
      curve: 'standard_inverse',
      enable: true,
    }

    // Ground protection settings
    this.groundSettings = config.groundSettings || {
      pickup: 1.0, // A
      timeDelay: 0.5, // s
      curve: 'very_inverse',
      enable: true,
    }

    // Relay state
    this.state = {
      Ia: 0,
      Ib: 0,
      Ic: 0,
      I0: 0,
      I_ground: 0,
      I_phase_max: 0,
      phaseTrip: false,
      groundTrip: false,
      lastTripTime: null,
    }
  }

  /**
   * Calculate symmetrical components from phase currents
   * @param {Object} phaseCurrents - Phase currents { Ia, Ib, Ic }
   * @returns {Object} Symmetrical components { I0, I1, I2 }
   */
  calculateSymmetricalComponents(phaseCurrents) {
    const { Ia, Ib, Ic } = phaseCurrents

    // Convert to complex numbers (assuming angles are in degrees)
    const Ia_complex = this.toComplex(Ia)
    const Ib_complex = this.toComplex(Ib)
    const Ic_complex = this.toComplex(Ic)

    // Calculate sequence components
    const I0 = Ia_complex.add(Ib_complex).add(Ic_complex).divide(3)
    const I1 = Ia_complex.add(Ib_complex.multiply(this.alpha()))
      .add(Ic_complex.multiply(this.alpha().multiply(this.alpha())))
      .divide(3)
    const I2 = Ia_complex.add(
      Ib_complex.multiply(this.alpha().multiply(this.alpha()))
    )
      .add(Ic_complex.multiply(this.alpha()))
      .divide(3)

    return {
      I0: { magnitude: I0.magnitude(), angle: I0.angle() },
      I1: { magnitude: I1.magnitude(), angle: I1.angle() },
      I2: { magnitude: I2.magnitude(), angle: I2.angle() },
    }
  }

  /**
   * Convert magnitude/angle to complex
   * @param {Object} phasor - Phasor { magnitude, angle }
   * @returns {Object} Complex number
   */
  toComplex(phasor) {
    const magnitude = phasor.magnitude || 0
    const angle = ((phasor.angle || 0) * Math.PI) / 180
    return {
      real: magnitude * Math.cos(angle),
      imag: magnitude * Math.sin(angle),
      magnitude: () => magnitude,
      angle: () => phasor.angle || 0,
      add: other => ({
        real: magnitude * Math.cos(angle) + other.real,
        imag: magnitude * Math.sin(angle) + other.imag,
        magnitude: () =>
          Math.sqrt(
            (magnitude * Math.cos(angle) + other.real) ** 2 +
              (magnitude * Math.sin(angle) + other.imag) ** 2
          ),
        angle: () =>
          (Math.atan2(
            magnitude * Math.sin(angle) + other.imag,
            magnitude * Math.cos(angle) + other.real
          ) *
            180) /
          Math.PI,
        divide: scalar => ({
          real: (magnitude * Math.cos(angle)) / scalar,
          imag: (magnitude * Math.sin(angle)) / scalar,
          magnitude: () => magnitude / scalar,
          angle: () => phasor.angle || 0,
        }),
        multiply: other => {
          const r1 = magnitude * Math.cos(angle)
          const i1 = magnitude * Math.sin(angle)
          const r2 = other.real
          const i2 = other.imag
          return {
            real: r1 * r2 - i1 * i2,
            imag: r1 * i2 + i1 * r2,
            magnitude: () =>
              magnitude * Math.sqrt(other.real ** 2 + other.imag ** 2),
            angle: () =>
              (phasor.angle || 0) +
              (Math.atan2(other.imag, other.real) * 180) / Math.PI,
          }
        },
      }),
    }
  }

  /**
   * Alpha operator (120° rotation)
   * @returns {Object} Complex number representing e^(j120°)
   */
  alpha() {
    const angle = (120 * Math.PI) / 180
    return {
      real: Math.cos(angle),
      imag: Math.sin(angle),
      magnitude: () => 1,
      angle: () => 120,
    }
  }

  /**
   * Separate phase and ground currents
   * @param {Object} currents - Three-phase currents { Ia, Ib, Ic, In }
   * @returns {Object} Separated currents
   */
  separateCurrents(currents) {
    const { Ia, Ib, Ic, In } = currents // current (A)
    // current (A)

    // Calculate zero-sequence current
    const I0 = this.calculateSymmetricalComponents({ Ia, Ib, Ic }).I0
    const I_ground_calculated = 3 * I0.magnitude

    // Use measured ground current if available, otherwise calculated
    const I_ground = In !== undefined ? In.magnitude : I_ground_calculated

    // Calculate phase currents (remove zero-sequence component)
    const Ia_phase = Ia.magnitude - I0.magnitude
    const Ib_phase = Ib.magnitude - I0.magnitude
    const Ic_phase = Ic.magnitude - I0.magnitude

    // Maximum phase current
    const I_phase_max = Math.max(Ia_phase, Ib_phase, Ic_phase, 0)

    return {
      phase: {
        Ia: Ia_phase,
        Ib: Ib_phase,
        Ic: Ic_phase,
        max: I_phase_max,
        angles: {
          Ia: Ia.angle,
          Ib: Ib.angle,
          Ic: Ic.angle,
        },
      },
      ground: {
        I0: I0.magnitude,
        I_ground,
        I_ground_measured: In !== undefined ? In.magnitude : null,
      },
      sequence: {
        I0,
        I1: this.calculateSymmetricalComponents({ Ia, Ib, Ic }).I1,
        I2: this.calculateSymmetricalComponents({ Ia, Ib, Ic }).I2,
      },
    }
  }

  /**
   * Evaluate phase protection
   * @param {number} I_phase - Phase current (A)
   * @returns {Object} Phase protection decision
   */
  evaluatePhase(I_phase) {
    if (!this.phaseSettings.enable) {
      return {
        trip: false,
        reason: 'Phase protection disabled',
      }
    }

    if (I_phase < this.phaseSettings.pickup) {
      return {
        trip: false,
        reason: 'Below phase pickup threshold',
        current: I_phase,
        pickup: this.phaseSettings.pickup,
      }
    }

    return {
      trip: true,
      reason: 'Phase current exceeds pickup',
      current: I_phase,
      pickup: this.phaseSettings.pickup,
      timeDelay: this.phaseSettings.timeDelay,
      curve: this.phaseSettings.curve,
    }
  }

  /**
   * Evaluate ground protection
   * @param {number} I_ground - Ground current (A)
   * @returns {Object} Ground protection decision
   */
  evaluateGround(I_ground) {
    if (!this.groundSettings.enable) {
      return {
        trip: false,
        reason: 'Ground protection disabled',
      }
    }

    if (I_ground < this.groundSettings.pickup) {
      return {
        trip: false,
        reason: 'Below ground pickup threshold',
        current: I_ground,
        pickup: this.groundSettings.pickup,
      }
    }

    return {
      trip: true,
      reason: 'Ground current exceeds pickup',
      current: I_ground,
      pickup: this.groundSettings.pickup,
      timeDelay: this.groundSettings.timeDelay,
      curve: this.groundSettings.curve,
    }
  }

  /**
   * Evaluate complete protection (phase + ground)
   * @param {Object} currents - Three-phase currents { Ia, Ib, Ic, In }
   * @returns {Object} Complete protection decision
   */
  evaluate(currents) {
    // Separate currents
    const separated = this.separateCurrents(currents) // current (A)
    // current (A)

    // Update state
    this.state.Ia = separated.phase.Ia
    this.state.Ib = separated.phase.Ib
    this.state.Ic = separated.phase.Ic
    this.state.I0 = separated.ground.I0
    this.state.I_ground = separated.ground.I_ground
    this.state.I_phase_max = separated.phase.max

    // Evaluate phase protection
    const phaseResult = this.evaluatePhase(separated.phase.max)
    this.state.phaseTrip = phaseResult.trip

    // Evaluate ground protection
    const groundResult = this.evaluateGround(separated.ground.I_ground)
    this.state.groundTrip = groundResult.trip

    // Overall trip decision
    const overallTrip = phaseResult.trip || groundResult.trip

    if (overallTrip) {
      this.state.lastTripTime = Date.now()
    }

    return {
      trip: overallTrip,
      phase: phaseResult,
      ground: groundResult,
      separated,
      timestamp: Date.now(),
    }
  }

  /**
   * Determine fault type based on currents
   * @param {Object} separated - Separated currents from separateCurrents()
   * @returns {Object} Fault type determination
   */
  determineFaultType(separated) {
    const { sequence } = separated

    const I0 = sequence.I0.magnitude
    const I2 = sequence.I2.magnitude
    const I1 = sequence.I1.magnitude

    // Fault type classification
    if (I0 < 0.1 && I2 < 0.1) {
      return { type: 'three_phase', confidence: 'high' }
    }

    if (I0 > 0.1 * I1 && I2 < 0.1 * I1) {
      return { type: 'single_line_to_ground', confidence: 'high' }
    }

    if (I0 < 0.1 * I1 && I2 > 0.1 * I1) {
      return { type: 'line_to_line', confidence: 'high' }
    }

    if (I0 > 0.1 * I1 && I2 > 0.1 * I1) {
      return { type: 'double_line_to_ground', confidence: 'high' }
    }

    return { type: 'unknown', confidence: 'low' }
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
      phaseSettings: this.phaseSettings,
      groundSettings: this.groundSettings,
    }
  }

  /**
   * Reset relay to initial state
   */
  reset() {
    this.state = {
      Ia: 0,
      Ib: 0,
      Ic: 0,
      I0: 0,
      I_ground: 0,
      I_phase_max: 0,
      phaseTrip: false,
      groundTrip: false,
      lastTripTime: null,
    }
  }

  /**
   * Update phase protection settings
   * @param {Object} settings - New phase settings
   */
  updatePhaseSettings(settings) {
    this.phaseSettings = {
      ...this.phaseSettings,
      ...settings,
    }
  }

  /**
   * Update ground protection settings
   * @param {Object} settings - New ground settings
   */
  updateGroundSettings(settings) {
    this.groundSettings = {
      ...this.groundSettings,
      ...settings,
    }
  }
}

/**
 * Ground Fault Protection - Specialized for ground faults
 */
class GroundFaultProtection extends PhaseGroundProtection {
  constructor(config = {}) {
    super(config)

    // Specialized for ground faults
    this.groundSettings = config.groundSettings || {
      pickup: 0.5, // Lower pickup for ground faults
      timeDelay: 0.3, // Faster tripping for ground faults
      curve: 'very_inverse',
      enable: true,
      sensitive: true, // Enable sensitive ground fault detection
    }

    this.phaseSettings = config.phaseSettings || {
      pickup: 10.0, // Higher pickup for phase
      timeDelay: 0.1,
      curve: 'standard_inverse',
      enable: true,
    }
  }

  /**
   * Evaluate with sensitive ground fault detection
   * @param {Object} currents - Three-phase currents
   * @returns {Object} Enhanced ground fault evaluation
   */
  evaluateSensitive(currents) {
    const baseResult = this.evaluate(currents) // current (A)
    // current (A)

    if (!this.groundSettings.sensitive) {
      return baseResult
    }

    // Sensitive ground fault detection
    const separated = this.separateCurrents(currents) // current (A)
    // current (A)
    const I_ground = separated.ground.I_ground

    // Check for residual current (unbalanced load)
    const I_unbalanced =
      Math.abs(separated.phase.Ia - separated.phase.Ib) +
      Math.abs(separated.phase.Ib - separated.phase.Ic) +
      Math.abs(separated.phase.Ic - separated.phase.Ia)

    return {
      ...baseResult,
      sensitive: {
        I_ground,
        I_unbalanced: I_unbalanced / 3,
        residualDetected: I_ground > this.groundSettings.pickup * 0.5,
      },
    }
  }
}

module.exports = {
  PhaseGroundProtection,
  GroundFaultProtection,
}
