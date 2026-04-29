/**
 * TCCCurves - Time-Current Characteristic Curves (IEC/ANSI)
 *
 * Implements standard TCC curves for overcurrent protection:
 * - IEC 60255 (Standard, Very, Extremely Inverse)
 * - ANSI/IEEE C37.112 (Moderately, Very, Extremely Inverse)
 * - Long Time and Short Time inverse curves
 *
 * Standard IEC equation: t = TMS * (K / ((I/Is)^α - 1))
 *
 * Where:
 * - t: Operating time (seconds)
 * - TMS: Time multiplier setting
 * - I: Fault current
 * - Is: Pickup current (setting)
 * - K, α: Curve constants
 */

/**
 * IEC 60255 Curve Constants
 */
const IEC_CURVES = {
  standard: { K: 0.14, alpha: 0.02, name: 'Standard Inverse (IEC)' },
  very: { K: 13.5, alpha: 1, name: 'Very Inverse (IEC)' },
  extremely: { K: 80, alpha: 2, name: 'Extremely Inverse (IEC)' },
  long_time: { K: 120, alpha: 1, name: 'Long Time Inverse (IEC)' },
  short_time: { K: 0.05, alpha: 0.04, name: 'Short Time Inverse (IEC)' },
}

/**
 * IEEE/ANSI C37.112 Curve Constants
 */
const ANSI_CURVES = {
  moderately: { K: 0.0515, alpha: 0.02, name: 'Moderately Inverse (ANSI)' },
  very: { K: 19.61, alpha: 2, name: 'Very Inverse (ANSI)' },
  extremely: { K: 28.2, alpha: 2, name: 'Extremely Inverse (ANSI)' },
}

/**
 * Calculate operating time for a TCC curve
 * @param {Object} params - Curve parameters
 * @returns {number} Operating time in seconds
 */
function calculateOperatingTime(params) {
  const {
    pickup, // Pickup current (A)
    current, // Fault current (A)
    tms, // Time multiplier setting
    curveType = 'standard', // Curve type
    standard = 'iec', // 'iec' or 'ansi'
  } = params

  // Validate inputs
  if (current <= pickup) { // current (A)
    return Infinity // No operation if current below pickup
  }

  if (tms <= 0) {
    return 0
  }

  // Get curve constants
  const curves = standard === 'iec' ? IEC_CURVES : ANSI_CURVES
  const curve = curves[curveType] || curves.standard

  const { K, alpha } = curve

  // Calculate I/Is ratio
  const I_ratio = current / pickup // current (A)

  // IEC equation: t = TMS * (K / ((I/Is)^α - 1))
  const t = tms * (K / (Math.pow(I_ratio, alpha) - 1))

  return t
}

/**
 * Generate TCC curve points
 * @param {Object} params - Curve parameters
 * @returns {Array} Array of { current, time } points
 */
function generateTCCCurve(params) {
  const {
    pickup,
    tms,
    curveType = 'standard',
    standard = 'iec',
    I_min = pickup * 1.1, // Start at 110% of pickup
    I_max = pickup * 100, // End at 100x pickup
    points = 100, // Number of points
  } = params

  const curvePoints = []

  // Logarithmic spacing for better visualization
  const logMin = Math.log10(I_min)
  const logMax = Math.log10(I_max)
  const step = (logMax - logMin) / points

  for (let i = 0; i <= points; i++) {
    const current = Math.pow(10, logMin + i * step) // current (A)
    const time = calculateOperatingTime({
      pickup,
      current,
      tms,
      curveType,
      standard,
    })

    if (time !== Infinity && time > 0) {
      curvePoints.push({ current, time })
    }
  }

  return curvePoints
}

/**
 * Evaluate trip condition for a given current
 * @param {Object} params - Curve parameters
 * @returns {Object} Trip status
 */
function evaluateTrip(params) {
  const {
    pickup,
    current,
    tms,
    curveType = 'standard',
    standard = 'iec',
    timeElapsed = 0,
    tiempoMaximo, // Maximum allowed time (optional)
  } = params

  const operatingTime = calculateOperatingTime({
    pickup,
    current,
    tms,
    curveType,
    standard,
  })

  const trip = operatingTime !== Infinity && timeElapsed >= operatingTime

  let timeToTrip = operatingTime - timeElapsed
  if (timeToTrip < 0) timeToTrip = 0

  const result = {
    trip,
    operatingTime,
    timeElapsed,
    timeToTrip,
    currentAbovePickup: current > pickup,
  }

  // Check maximum time constraint
  if (tiempoMaximo && operatingTime > tiempoMaximo) {
    result.trip = true
    result.timeToTrip = tiempoMaximo - timeElapsed
    result.reason = 'max_time_exceeded'
  }

  return result
}

/**
 * Calculate curve constants for coordination
 * @param {Object} params - Coordination parameters
 * @returns {Object} Recommended TMS for coordination
 */
function calculateCoordinationTMS(params) {
  const {
    downstreamPickup,
    upstreamPickup,
    faultCurrent,
    coordinationMargin = 0.2, // 20% margin
    downstreamCurveType = 'standard',
    upstreamCurveType = 'standard',
    standard = 'iec',
  } = params

  // Calculate downstream operating time
  const t_downstream = calculateOperatingTime({
    pickup: downstreamPickup,
    current: faultCurrent,
    tms: 1, // Reference TMS = 1
    curveType: downstreamCurveType,
    standard,
  })

  // Required upstream time with margin
  const t_upstream_required = t_downstream * (1 + coordinationMargin)

  // Calculate required TMS for upstream
  const t_upstream_ref = calculateOperatingTime({
    pickup: upstreamPickup,
    current: faultCurrent,
    tms: 1,
    curveType: upstreamCurveType,
    standard,
  })

  const tms_required = t_upstream_required / t_upstream_ref

  return {
    downstreamTime: t_downstream,
    upstreamTimeRequired: t_upstream_required,
    recommendedTMS: tms_required,
    coordinationMargin,
  }
}

/**
 * LSIG (Long Short Instantaneous Ground) coordination
 * Special coordination for ground fault protection
 */
function calculateLSIGCoordination(params) {
  const {
    pickupPhase,
    pickupGround,
    faultCurrent,
    tmsPhase,
    tmsGround,
    curveType = 'standard',
    standard = 'iec',
  } = params

  // Phase element operating time
  const t_phase = calculateOperatingTime({
    pickup: pickupPhase,
    current: faultCurrent,
    tms: tmsPhase,
    curveType,
    standard,
  })

  // Ground element operating time
  const t_ground = calculateOperatingTime({
    pickup: pickupGround,
    current: faultCurrent,
    tms: tmsGround,
    curveType,
    standard,
  })

  // LSIG should trip faster than phase for ground faults
  const lsigFast = t_ground < t_phase

  return {
    phaseTime: t_phase,
    groundTime: t_ground,
    lsigFast,
    recommendation: lsigFast
      ? 'LSIG properly coordinated'
      : 'Adjust TMS for faster ground trip',
  }
}

/**
 * Get curve constants for a given curve type
 */
function getCurveConstants(curveType, standard = 'iec') {
  const curves = standard === 'iec' ? IEC_CURVES : ANSI_CURVES
  return curves[curveType] || curves.standard
}

/**
 * Get available curve types
 */
function getAvailableCurves(standard = 'iec') {
  const curves = standard === 'iec' ? IEC_CURVES : ANSI_CURVES
  return Object.keys(curves).map(key => ({
    id: key,
    ...curves[key],
  }))
}

/**
 * Compare two curves at a specific current
 */
function compareCurves(params) {
  const {
    curve1: { pickup: p1, tms: t1, type: type1 },
    curve2: { pickup: p2, tms: t2, type: type2 },
    current,
    standard = 'iec',
  } = params

  const t1_calc = calculateOperatingTime({
    pickup: p1,
    current,
    tms: t1,
    curveType: type1,
    standard,
  })

  const t2_calc = calculateOperatingTime({
    pickup: p2,
    current,
    tms: t2,
    curveType: type2,
    standard,
  })

  const margin = (t2_calc - t1_calc) / t1_calc

  return {
    curve1Time: t1_calc,
    curve2Time: t2_calc,
    margin,
    coordinated: margin > 0,
    marginPercent: margin * 100,
  }
}

module.exports = {
  IEC_CURVES,
  ANSI_CURVES,
  calculateOperatingTime,
  generateTCCCurve,
  evaluateTrip,
  calculateCoordinationTMS,
  calculateLSIGCoordination,
  getCurveConstants,
  getAvailableCurves,
  compareCurves,
}
