/**
 * Harmonic Analysis Utilities
 * IEEE 519 compliant harmonic calculations and analysis
 */

/**
 * Calculate Total Harmonic Distortion (THD)
 * @param {Array} harmonics - Array of harmonic magnitudes (fundamental = index 1)
 * @returns {number} THD percentage
 */
export function calculateTHD(harmonics) {
  if (!harmonics || harmonics.length < 2) return 0

  const fundamental = harmonics[1] || 0
  if (fundamental === 0) return 0

  const harmonicSum = harmonics
    .slice(2) // Skip fundamental (index 0 and 1)
    .reduce((sum, h) => sum + (h || 0) ** 2, 0)

  return (Math.sqrt(harmonicSum) / fundamental) * 100
}

/**
 * Calculate individual harmonic distortion
 * @param {Array} harmonics - Array of harmonic magnitudes
 * @returns {Array} Array of individual harmonic percentages
 */
export function calculateIndividualHarmonics(harmonics) {
  if (!harmonics || harmonics.length < 2) return []

  const fundamental = harmonics[1] || 0
  if (fundamental === 0) return []

  return harmonics.slice(2).map((h, index) => ({
    harmonic: index + 2, // Harmonic order (3rd, 5th, etc.)
    magnitude: h || 0,
    percentage: ((h || 0) / fundamental) * 100,
  }))
}

/**
 * IEEE 519 harmonic limits for different voltage levels
 */
const IEEE_519_LIMITS = {
  '2.4-69kV': {
    maxCurrentDemand: 20, // Maximum current demand in kA
    limits: {
      'Isc/IL < 20': { odd: 4.0, even: 1.0 },
      '20 < Isc/IL < 50': { odd: 7.0, even: 2.5 },
      '50 < Isc/IL < 100': { odd: 10.0, even: 4.0 },
      '100 < Isc/IL < 1000': { odd: 12.0, even: 5.5 },
      'Isc/IL > 1000': { odd: 15.0, even: 7.0 },
    }
  },
  '69-138kV': {
    maxCurrentDemand: 50,
    limits: {
      'Isc/IL < 20': { odd: 2.5, even: 1.0 },
      '20 < Isc/IL < 50': { odd: 5.0, even: 2.0 },
      '50 < Isc/IL < 100': { odd: 7.5, even: 3.0 },
      '100 < Isc/IL < 1000': { odd: 10.0, even: 4.0 },
      'Isc/IL > 1000': { odd: 12.0, even: 5.5 },
    }
  },
  '>138kV': {
    maxCurrentDemand: 100,
    limits: {
      'Isc/IL < 20': { odd: 1.0, even: 0.5 },
      '20 < Isc/IL < 50': { odd: 2.5, even: 1.0 },
      '50 < Isc/IL < 100': { odd: 5.0, even: 2.0 },
      '100 < Isc/IL < 1000': { odd: 7.5, even: 3.0 },
      'Isc/IL > 1000': { odd: 10.0, even: 4.0 },
    }
  }
}

/**
 * Get IEEE 519 harmonic limits for given system parameters
 * @param {number} voltage - System voltage in volts
 * @param {number} isc - Available short circuit current in amps
 * @param {number} il - Load current in amps
 * @returns {Object} Harmonic limits
 */
export function getIEEE519Limits(voltage, isc, il) {
  let voltageClass
  if (voltage < 69000) voltageClass = '2.4-69kV'
  else if (voltage <= 138000) voltageClass = '69-138kV'
  else voltageClass = '>138kV'

  const iscRatio = isc / il
  let limitCategory

  if (iscRatio < 20) limitCategory = 'Isc/IL < 20'
  else if (iscRatio < 50) limitCategory = '20 < Isc/IL < 50'
  else if (iscRatio < 100) limitCategory = '50 < Isc/IL < 100'
  else if (iscRatio < 1000) limitCategory = '100 < Isc/IL < 1000'
  else limitCategory = 'Isc/IL > 1000'

  return {
    voltageClass,
    iscRatio,
    limitCategory,
    limits: IEEE_519_LIMITS[voltageClass].limits[limitCategory],
    maxCurrentDemand: IEEE_519_LIMITS[voltageClass].maxCurrentDemand,
  }
}

/**
 * Validate harmonics against IEEE 519 limits
 * @param {Array} harmonics - Harmonic magnitudes
 * @param {number} voltage - System voltage
 * @param {number} isc - Short circuit current
 * @param {number} il - Load current
 * @returns {Object} Validation results
 */
export function validateHarmonicsIEEE519(harmonics, voltage, isc, il) {
  const limits = getIEEE519Limits(voltage, isc, il)
  const individualHarmonics = calculateIndividualHarmonics(harmonics)
  const thd = calculateTHD(harmonics)

  const violations = []
  const warnings = []

  // Check individual harmonics
  individualHarmonics.forEach(({ harmonic, percentage }) => {
    const isOdd = harmonic % 2 === 1
    const limit = isOdd ? limits.limits.odd : limits.limits.even

    if (percentage > limit) {
      violations.push({
        harmonic,
        type: 'violation',
        measured: percentage,
        limit,
        message: `${harmonic}th harmonic exceeds IEEE 519 limit: ${percentage.toFixed(2)}% > ${limit}%`
      })
    } else if (percentage > limit * 0.8) {
      warnings.push({
        harmonic,
        type: 'warning',
        measured: percentage,
        limit,
        message: `${harmonic}th harmonic approaching IEEE 519 limit: ${percentage.toFixed(2)}% (limit: ${limit}%)`
      })
    }
  })

  // Check THD (general guideline: <5% for most systems)
  const thdLimit = 5.0 // General THD limit
  if (thd > thdLimit) {
    violations.push({
      type: 'thd_violation',
      measured: thd,
      limit: thdLimit,
      message: `THD exceeds recommended limit: ${thd.toFixed(2)}% > ${thdLimit}%`
    })
  } else if (thd > thdLimit * 0.8) {
    warnings.push({
      type: 'thd_warning',
      measured: thd,
      limit: thdLimit,
      message: `THD approaching recommended limit: ${thd.toFixed(2)}% (limit: ${thdLimit}%)`
    })
  }

  return {
    thd,
    individualHarmonics,
    limits,
    violations,
    warnings,
    compliant: violations.length === 0,
    summary: {
      totalViolations: violations.length,
      totalWarnings: warnings.length,
      worstHarmonic: violations.length > 0 ?
        violations.reduce((worst, v) => v.measured > worst.measured ? v : worst) : null,
    }
  }
}

/**
 * Calculate K-factor for transformer sizing
 * K-factor = Sum(h^2 * (Ih/I1)^2) for all harmonics
 * @param {Array} harmonics - Harmonic magnitudes
 * @returns {number} K-factor
 */
export function calculateKFactor(harmonics) {
  if (!harmonics || harmonics.length < 2) return 1.0

  const fundamental = harmonics[1] || 0
  if (fundamental === 0) return 1.0

  const kFactor = harmonics
    .slice(1) // Skip DC component
    .reduce((sum, h, index) => {
      const harmonicOrder = index + 1
      const harmonicRatio = (h || 0) / fundamental
      return sum + (harmonicOrder ** 2) * (harmonicRatio ** 2)
    }, 0)

  return Math.max(kFactor, 1.0) // Minimum K-factor of 1.0
}

/**
 * Generate harmonic spectrum for typical non-linear loads
 * @param {string} loadType - Type of non-linear load
 * @param {number} fundamental - Fundamental current magnitude
 * @returns {Array} Harmonic spectrum
 */
export function generateHarmonicSpectrum(loadType, fundamental = 100) {
  const harmonics = [0, fundamental] // DC + fundamental

  switch (loadType) {
    case 'rectifier':
      // 6-pulse rectifier: 5th, 7th, 11th, 13th, 17th, 19th
      harmonics[5] = fundamental * 0.20
      harmonics[7] = fundamental * 0.14
      harmonics[11] = fundamental * 0.09
      harmonics[13] = fundamental * 0.07
      harmonics[17] = fundamental * 0.05
      harmonics[19] = fundamental * 0.04
      break

    case 'vfd':
      // Variable Frequency Drive: significant 5th, 7th, 11th, 13th
      harmonics[5] = fundamental * 0.35
      harmonics[7] = fundamental * 0.20
      harmonics[11] = fundamental * 0.10
      harmonics[13] = fundamental * 0.08
      break

    case 'ups':
      // UPS: 3rd, 5th, 7th, 9th, 11th
      harmonics[3] = fundamental * 0.25
      harmonics[5] = fundamental * 0.15
      harmonics[7] = fundamental * 0.10
      harmonics[9] = fundamental * 0.08
      harmonics[11] = fundamental * 0.06
      break

    case 'led':
      // LED lighting: 3rd, 5th, 7th
      harmonics[3] = fundamental * 0.80
      harmonics[5] = fundamental * 0.50
      harmonics[7] = fundamental * 0.30
      break

    default:
      // Generic non-linear load
      harmonics[3] = fundamental * 0.30
      harmonics[5] = fundamental * 0.20
      harmonics[7] = fundamental * 0.15
      harmonics[9] = fundamental * 0.10
  }

  return harmonics
}
