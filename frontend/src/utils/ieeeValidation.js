/**
 * IEEE/IEC Standards Validation for Electrical Calculations
 * Ensures calculations meet international electrical engineering standards
 */

/**
 * IEEE 1584-2018 Arc Flash Calculation Validation
 * Validates arc flash parameters and calculations
 */
export const validateIEEE1584 = (parameters) => {
  const errors = []
  const warnings = []

  const {
    voltage,
    boltedFaultCurrent,
    arcGap,
    workingDistance,
    electrodeConfiguration,
    enclosureSize
  } = parameters

  // Voltage validation (IEEE 1584 applies to 208V to 15,000V)
  if (voltage < 208 || voltage > 15000) {
    errors.push('IEEE 1584 applies to systems between 208V and 15,000V')
  }

  // Bolted fault current validation
  if (boltedFaultCurrent < 700 || boltedFaultCurrent > 106000) {
    warnings.push('Bolted fault current outside IEEE 1584 range (700A - 106kA)')
  }

  // Arc gap validation
  if (arcGap < 3 || arcGap > 152) {
    errors.push('Arc gap must be between 3mm and 152mm per IEEE 1584')
  }

  // Working distance validation
  if (workingDistance < 305 || workingDistance > 2540) {
    errors.push('Working distance must be between 305mm and 2540mm per IEEE 1584')
  }

  // Electrode configuration validation
  const validConfigurations = ['VCB', 'VCBB', 'HCB', 'VERTICAL', 'HORIZONTAL']
  if (!validConfigurations.includes(electrodeConfiguration)) {
    errors.push('Invalid electrode configuration for IEEE 1584')
  }

  // Enclosure size validation (if applicable)
  if (enclosureSize && (enclosureSize < 50 || enclosureSize > 124460)) {
    warnings.push('Enclosure size outside typical IEEE 1584 range')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    standard: 'IEEE 1584-2018'
  }
}

/**
 * IEEE 141 (Red Book) Power System Analysis Validation
 * Validates power flow and system analysis parameters
 */
export const validateIEEE141 = (systemData) => {
  const errors = []
  const warnings = []

  const { buses, branches, baseMVA, baseKV } = systemData

  // Base MVA validation
  if (baseMVA < 1 || baseMVA > 10000) {
    warnings.push('Base MVA outside typical range (1-10,000 MVA)')
  }

  // Base voltage validation
  if (baseKV < 0.12 || baseKV > 800) {
    errors.push('Base voltage outside IEEE 141 range (120V - 800kV)')
  }

  // Bus voltage validation (±10% nominal)
  buses.forEach(bus => {
    const nominalVoltage = bus.nominalVoltage || baseKV
    const voltageDeviation = Math.abs((bus.voltage - nominalVoltage) / nominalVoltage) * 100

    if (voltageDeviation > 10) {
      errors.push(`Bus ${bus.id}: Voltage deviation ${voltageDeviation.toFixed(1)}% exceeds ±10% limit`)
    } else if (voltageDeviation > 5) {
      warnings.push(`Bus ${bus.id}: Voltage deviation ${voltageDeviation.toFixed(1)}% approaching ±10% limit`)
    }
  })

  // Branch loading validation
  branches.forEach(branch => {
    if (branch.rating && branch.current) {
      const loading = (branch.current / branch.rating) * 100

      if (loading > 100) {
        errors.push(`Branch ${branch.id}: Overloaded at ${loading.toFixed(1)}% of rating`)
      } else if (loading > 80) {
        warnings.push(`Branch ${branch.id}: Loading ${loading.toFixed(1)}% approaching limit`)
      }
    }
  })

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    standard: 'IEEE 141 (Red Book)'
  }
}

/**
 * IEC 60909 Short Circuit Calculation Validation
 * Validates short circuit calculation parameters per IEC 60909
 */
export const validateIEC60909 = (parameters) => {
  const errors = []
  const warnings = []

  const {
    systemVoltage,
    impedanceRatio,
    temperatureCorrection,
    voltageFactor
  } = parameters

  // System voltage validation (IEC 60909 applies to 400V - 765kV)
  if (systemVoltage < 0.4 || systemVoltage > 765) {
    errors.push('IEC 60909 applies to systems between 400V and 765kV')
  }

  // Voltage factor c validation (Table 1 of IEC 60909)
  const getVoltageFactor = (voltage) => {
    if (voltage >= 0.4 && voltage <= 1) return 1.0
    if (voltage > 1 && voltage <= 35) return 1.1
    return 1.1
  }

  const expectedC = getVoltageFactor(systemVoltage)
  if (Math.abs(voltageFactor - expectedC) > 0.01) {
    errors.push(`Voltage factor should be ${expectedC} for ${systemVoltage}kV system per IEC 60909`)
  }

  // Temperature correction validation
  if (temperatureCorrection < 0.8 || temperatureCorrection > 1.2) {
    warnings.push('Temperature correction factor outside typical range (0.8 - 1.2)')
  }

  // Impedance ratio validation (R/X ratio)
  if (impedanceRatio && (impedanceRatio < 0.05 || impedanceRatio > 2.0)) {
    warnings.push('R/X ratio outside typical range (0.05 - 2.0)')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    standard: 'IEC 60909'
  }
}

/**
 * IEEE 242 (Buff Book) Protection Coordination Validation
 * Validates protection device coordination
 */
export const validateIEEE242 = (protectionData) => {
  const errors = []
  const warnings = []

  const { devices, coordinationCurves, systemFaultCurrent } = protectionData

  // Device rating validation
  devices.forEach(device => {
    const { type, rating, faultCurrentCapability } = device

    // Check if device can handle system fault current
    if (faultCurrentCapability < systemFaultCurrent) {
      errors.push(`${device.type} ${device.id}: Insufficient fault current rating (${faultCurrentCapability}A < ${systemFaultCurrent}A)`)
    }

    // Check device-specific requirements
    switch (type) {
      case 'breaker':
        if (rating < 0.1 || rating > 6300) {
          warnings.push(`Breaker rating ${rating}A outside typical range`)
        }
        break
      case 'fuse':
        if (rating < 1 || rating > 6300) {
          warnings.push(`Fuse rating ${rating}A outside typical range`)
        }
        break
      case 'relay':
        if (!device.timeCurve || !device.instantaneousCurve) {
          errors.push(`Relay ${device.id}: Missing coordination curves`)
        }
        break
    }
  })

  // Coordination curve validation
  coordinationCurves.forEach((curve, index) => {
    const nextCurve = coordinationCurves[index + 1]

    if (nextCurve) {
      // Check for proper coordination (minimum 0.3s time margin)
      const coordinationMargin = 0.3 // 300ms minimum margin
      const currentPoints = [0.5, 1.0, 2.0, 10.0] // Multiples of rating

      currentPoints.forEach(multiple => {
        const current = multiple * curve.rating
        const curveTime = curve.getTimeAtCurrent(current)
        const nextCurveTime = nextCurve.getTimeAtCurrent(current)

        if (curveTime && nextCurveTime) {
          const margin = (nextCurveTime - curveTime) * 1000 // Convert to ms

          if (margin < coordinationMargin * 1000) {
            errors.push(`Poor coordination between ${curve.deviceId} and ${nextCurve.deviceId} at ${multiple}x rating`)
          } else if (margin < coordinationMargin * 1000 * 1.5) {
            warnings.push(`Marginal coordination between ${curve.deviceId} and ${nextCurve.deviceId} at ${multiple}x rating`)
          }
        }
      })
    }
  })

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    standard: 'IEEE 242 (Buff Book)'
  }
}

/**
 * IEEE 1159 Power Quality Monitoring Validation
 * Validates power quality measurements and thresholds
 */
export const validateIEEE1159 = (powerQualityData) => {
  const errors = []
  const warnings = []

  const { voltage, frequency, harmonics, flicker, transients } = powerQualityData

  // Voltage validation (ANSI C84.1 limits)
  const voltageLimits = {
    '480V': { nominal: 480, min: 456, max: 504 }, // Range A
    '208V': { nominal: 208, min: 197, max: 218 },
    '120V': { nominal: 120, min: 114, max: 126 }
  }

  const voltageLevel = `${voltage.nominal}V`
  const limits = voltageLimits[voltageLevel]

  if (limits) {
    if (voltage.measured < limits.min || voltage.measured > limits.max) {
      errors.push(`Voltage ${voltage.measured}V outside ANSI C84.1 Range A (${limits.min}-${limits.max}V)`)
    } else if (Math.abs(voltage.measured - limits.nominal) > limits.nominal * 0.05) {
      warnings.push(`Voltage deviation >5% from nominal`)
    }
  }

  // Frequency validation
  if (frequency.measured < 59.9 || frequency.measured > 60.1) {
    errors.push(`Frequency ${frequency.measured}Hz outside acceptable range (59.9-60.1 Hz)`)
  }

  // Harmonic validation (IEEE 519)
  if (harmonics && harmonics.thd) {
    if (harmonics.thd > 5.0) {
      errors.push(`THD ${harmonics.thd}% exceeds IEEE 519 limit (5%)`)
    } else if (harmonics.thd > 3.0) {
      warnings.push(`THD ${harmonics.thd}% approaching IEEE 519 limit`)
    }
  }

  // Flicker validation (IEC 61000-4-15)
  if (flicker && flicker.pst) {
    if (flicker.pst > 1.0) {
      errors.push(`Flicker Pst ${flicker.pst} exceeds IEC 61000-4-15 limit (1.0)`)
    } else if (flicker.pst > 0.7) {
      warnings.push(`Flicker Pst ${flicker.pst} approaching IEC 61000-4-15 limit`)
    }
  }

  // Transient validation
  if (transients) {
    transients.forEach(transient => {
      if (transient.magnitude > voltage.nominal * 2.0) {
        errors.push(`Transient magnitude ${transient.magnitude}V exceeds 2x nominal voltage`)
      }
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    standard: 'IEEE 1159'
  }
}

/**
 * Comprehensive standards validation
 * Runs all relevant standards checks based on calculation type
 */
export const validateAllStandards = (calculationType, data) => {
  const results = []

  switch (calculationType) {
    case 'arcFlash':
      results.push(validateIEEE1584(data))
      break
    case 'powerFlow':
      results.push(validateIEEE141(data))
      break
    case 'shortCircuit':
      results.push(validateIEC60909(data))
      break
    case 'protection':
      results.push(validateIEEE242(data))
      break
    case 'powerQuality':
      results.push(validateIEEE1159(data))
      break
    case 'comprehensive':
      // Run all validations
      if (data.arcFlash) results.push(validateIEEE1584(data.arcFlash))
      if (data.powerFlow) results.push(validateIEEE141(data.powerFlow))
      if (data.shortCircuit) results.push(validateIEC60909(data.shortCircuit))
      if (data.protection) results.push(validateIEEE242(data.protection))
      if (data.powerQuality) results.push(validateIEEE1159(data.powerQuality))
      break
  }

  // Aggregate results
  const allErrors = results.flatMap(r => r.errors)
  const allWarnings = results.flatMap(r => r.warnings)
  const standards = results.map(r => r.standard)

  return {
    overallValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    standards: standards,
    results: results,
    summary: {
      totalErrors: allErrors.length,
      totalWarnings: allWarnings.length,
      standardsChecked: standards.length,
      criticalIssues: allErrors.filter(e => e.includes('exceeds') || e.includes('insufficient')),
    }
  }
}

/**
 * Generate compliance report
 * Creates a formatted report of standards compliance
 */
export const generateComplianceReport = (validationResults) => {
  const { overallValid, errors, warnings, standards, summary } = validationResults

  const report = {
    timestamp: new Date().toISOString(),
    compliance: {
      overall: overallValid ? 'COMPLIANT' : 'NON-COMPLIANT',
      score: Math.max(0, 100 - (summary.totalErrors * 10) - (summary.totalWarnings * 2)),
      issues: {
        critical: summary.totalErrors,
        warnings: summary.totalWarnings,
      }
    },
    standards: standards.map(std => ({
      name: std,
      status: validationResults.results.find(r => r.standard === std)?.valid ? 'PASS' : 'FAIL'
    })),
    details: {
      errors: errors,
      warnings: warnings
    },
    recommendations: generateRecommendations(errors, warnings)
  }

  return report
}

/**
 * Generate recommendations based on validation issues
 */
const generateRecommendations = (errors, warnings) => {
  const recommendations = []

  // Error-based recommendations
  errors.forEach(error => {
    if (error.includes('voltage')) {
      recommendations.push('Review system voltage levels and consider voltage regulation equipment')
    }
    if (error.includes('overloaded') || error.includes('exceeds rating')) {
      recommendations.push('Upgrade equipment capacity or redistribute loads')
    }
    if (error.includes('coordination')) {
      recommendations.push('Adjust protection device settings or select appropriate devices')
    }
    if (error.includes('harmonic')) {
      recommendations.push('Install harmonic filters or use harmonic-rated transformers')
    }
  })

  // Warning-based recommendations
  warnings.forEach(warning => {
    if (warning.includes('approaching')) {
      recommendations.push('Monitor system parameters and plan for future upgrades')
    }
    if (warning.includes('range')) {
      recommendations.push('Verify measurement accuracy and equipment specifications')
    }
  })

  // Remove duplicates
  return [...new Set(recommendations)]
}
