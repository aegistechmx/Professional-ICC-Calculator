/**
 * IEC Standard Inverse Curves
 * Industrial protection coordination curves per IEC 60255
 */

/**
 * IEC curve parameters
 * Formula: t = TMS × k / ((I/Ip)^α - 1)
 */
export const IEC_CURVES = {
  standard: {
    name: 'Standard Inverse',
    k: 0.14,
    alpha: 0.02,
    description: 'IEC Standard Inverse (SI)',
  },
  very: {
    name: 'Very Inverse',
    k: 13.5,
    alpha: 1,
    description: 'IEC Very Inverse (VI)',
  },
  extreme: {
    name: 'Extremely Inverse',
    k: 80,
    alpha: 2,
    description: 'IEC Extremely Inverse (EI)',
  },
  long: {
    name: 'Long Time Inverse',
    k: 120,
    alpha: 1,
    description: 'IEC Long Time Inverse (LTI)',
  },
  short: {
    name: 'Short Time Inverse',
    k: 0.05,
    alpha: 0.04,
    description: 'IEC Short Time Inverse (STI)',
  },
}

/**
 * Get curve parameters by type
 * @param {string} curveType - Curve type ('standard', 'very', 'extreme', etc.)
 * @returns {Object} Curve parameters { k, alpha, name, description }
 */
export function getCurveParameters(curveType) {
  return IEC_CURVES[curveType] || IEC_CURVES.standard
}

/**
 * Get available curve types
 * @returns {Array} Array of available curve types
 */
export function getAvailableCurves() {
  return Object.keys(IEC_CURVES)
}

/**
 * Calculate trip time using IEC formula
 * t = TMS × k / ((I/Ip)^α - 1)
 *
 * @param {number} I - Current in kA
 * @param {number} pickup - Pickup current in kA
 * @param {number} TMS - Time multiplier setting
 * @param {string} curveType - IEC curve type
 * @returns {number} Trip time in seconds
 */
export function calcTripTime(I, pickup, TMS, curveType = 'standard') {
  const { k, alpha } = getCurveParameters(curveType)

  const ratio = I / pickup

  if (ratio <= 1) return Infinity

  return TMS * (k / (Math.pow(ratio, alpha) - 1))
}

/**
 * Generate TCC curve points for visualization
 * Generates time-current characteristic points
 *
 * @param {Object} relay - Relay configuration
 * @param {number} maxMultiple - Maximum current multiple (default 20)
 * @param {number} steps - Number of points (default 50)
 * @returns {Array} Array of { I, t } points
 */
export function generateTCCCurve(relay, maxMultiple = 20, steps = 50) {
  const points = []
  const stepFactor = Math.pow(maxMultiple, 1 / steps)

  for (let i = 0; i < steps; i++) {
    const multiple = Math.pow(stepFactor, i)
    const I = relay.pickup_kA * multiple
    const t = calcTripTime(I, relay.pickup_kA, relay.TMS, relay.curve)

    if (t !== Infinity && t < 1000) {
      // Filter unreasonable values
      points.push({ I, t })
    }
  }

  return points
}

/**
 * Calculate required TMS for a desired trip time
 * Inverse of trip time calculation
 *
 * @param {number} I - Current in kA
 * @param {number} pickup - Pickup current in kA
 * @param {number} desiredTime - Desired trip time in seconds
 * @param {string} curveType - IEC curve type
 * @returns {number} Required TMS
 */
export function calcRequiredTMS(
  I,
  pickup,
  desiredTime,
  curveType = 'standard'
) {
  const { k, alpha } = getCurveParameters(curveType)

  const ratio = I / pickup

  if (ratio <= 1) return 0

  return (desiredTime * (Math.pow(ratio, alpha) - 1)) / k
}
