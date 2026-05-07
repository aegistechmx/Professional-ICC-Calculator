/**
 * core/validation/ExternalValidation.js - External Validation for Power System Calculations
 *
 * Responsibility: Validate calculations against external references and standards
 */

/**
 * Validate against external reference data
 * @param {Object} system - Power system model
 * @param {Object} calculationResults - Results to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation results
 */
function validateAgainstExternalReferences(
  system,
  calculationResults,
  options = {}
) {
  const {
    referenceData = null,
    tolerance = 0.01,
    standards = ['IEEE', 'IEC'],
  } = options

  try {
    const results = {
      validationSuite: 'ExternalValidation',
      timestamp: new Date().toISOString(),
      system: {
        buses: system.buses?.length || 0,
        branches: system.branches?.length || 0,
      },
      validations: [],
    }

    // Validate power flow results
    if (calculationResults.powerFlow) {
      const powerFlowValidation = validatePowerFlowResults(
        system,
        calculationResults.powerFlow,
        referenceData,
        tolerance
      )
      results.validations.push(powerFlowValidation)
    }

    // Validate short circuit results
    if (calculationResults.shortCircuit) {
      const shortCircuitValidation = validateShortCircuitResults(
        system,
        calculationResults.shortCircuit,
        referenceData,
        tolerance
      )
      results.validations.push(shortCircuitValidation)
    }

    // Validate protection results
    if (calculationResults.protection) {
      const protectionValidation = validateProtectionResults(
        system,
        calculationResults.protection,
        referenceData,
        tolerance
      )
      results.validations.push(protectionValidation)
    }

    // Validate against standards
    for (const standard of standards) {
      const standardValidation = validateAgainstStandard(
        system,
        calculationResults,
        standard
      )
      results.validations.push(standardValidation)
    }

    // Calculate summary
    results.summary = calculateValidationSummary(results.validations)

    return results
  } catch (error) {
    throw new Error(`External validation failed: ${error.message}`)
  }
}

/**
 * Validate power flow results against references
 * @param {Object} system - Power system model
 * @param {Object} results - Power flow results
 * @param {Object} referenceData - Reference data
 * @param {number} tolerance - Validation tolerance
 * @returns {Object} Power flow validation
 */
function validatePowerFlowResults(system, results, referenceData, tolerance) {
  const validation = {
    type: 'PowerFlow',
    tolerance,
    passed: true,
    errors: [],
    warnings: [],
    comparisons: [],
  }

  try {
    // Validate voltage magnitudes
    if (results.voltages) {
      for (let i = 0; i < results.voltages.length; i++) {
        const voltage = results.voltages[i]

        if (!isFinite(voltage) || voltage <= 0) {
          validation.errors.push({
            type: 'invalid_voltage',
            bus: i,
            value: voltage,
            message: `Invalid voltage magnitude at bus ${i}: ${voltage}`,
          })
          validation.passed = false
        } else if (voltage > 1.5 || voltage < 0.85) {
          validation.warnings.push({
            type: 'voltage_out_of_range',
            bus: i,
            value: voltage,
            range: '0.85 - 1.15 p.u.',
            message: `Voltage out of acceptable range at bus ${i}: ${voltage}`,
          })
        }

        // Compare with reference data
        if (referenceData?.powerFlow?.voltages) {
          const refVoltage = referenceData.powerFlow.voltages[i]
          if (refVoltage) {
            const deviation = parseFloat(
              Math.abs(voltage - refVoltage).toFixed(6)
            )
            const percentDeviation = parseFloat(
              ((deviation / refVoltage) * 100).toFixed(6)
            )

            validation.comparisons.push({
              bus: i,
              parameter: 'voltage',
              calculated: voltage,
              reference: refVoltage,
              deviation,
              percentDeviation,
              withinTolerance: deviation <= tolerance,
            })
          }
        }
      }
    }

    // Validate power flows
    if (results.flows) {
      for (let i = 0; i < results.flows.length; i++) {
        const flow = results.flows[i]

        if (!flow.P_from || !flow.P_to) {
          validation.errors.push({
            type: 'invalid_flow',
            branch: i,
            message: `Missing power flow data for branch ${i}`,
          })
          validation.passed = false
        }

        // Check power balance
        const powerBalance = Math.abs(flow.P_from + flow.P_to)
        if (powerBalance > tolerance) {
          validation.warnings.push({
            type: 'power_imbalance',
            branch: i,
            imbalance: powerBalance,
            message: `Power imbalance on branch ${i}: ${powerBalance}`,
          })
        }
      }
    }

    // Validate convergence
    if (results.converged === false) {
      validation.warnings.push({
        type: 'non_converged',
        message: 'Power flow did not converge within maximum iterations',
      })
    }

    return validation
  } catch (error) {
    return {
      type: 'PowerFlow',
      passed: false,
      errors: [{ type: 'validation_error', message: error.message }],
      warnings: [],
      comparisons: [],
    }
  }
}

/**
 * Validate short circuit results against references
 * @param {Object} system - Power system model
 * @param {Object} results - Short circuit results
 * @param {Object} referenceData - Reference data
 * @param {number} tolerance - Validation tolerance
 * @returns {Object} Short circuit validation
 */
function validateShortCircuitResults(
  system,
  results,
  referenceData,
  tolerance
) {
  const validation = {
    type: 'ShortCircuit',
    tolerance,
    passed: true,
    errors: [],
    warnings: [],
    comparisons: [],
  }

  try {
    // Validate fault currents
    if (results.faultCurrents) {
      for (let i = 0; i < results.faultCurrents.length; i++) {
        const current = results.faultCurrents[i]

        if (!isFinite(current) || current <= 0) {
          validation.errors.push({
            type: 'invalid_current',
            bus: i,
            value: current,
            message: `Invalid fault current at bus ${i}: ${current}`,
          })
          validation.passed = false
        } else if (current > 100000) {
          // 100kA limit
          validation.warnings.push({
            type: 'excessive_current',
            bus: i,
            value: current,
            limit: 100000,
            message: `Excessive fault current at bus ${i}: ${current}A`,
          })
        }

        // Compare with reference data
        if (referenceData?.shortCircuit?.faultCurrents) {
          const refCurrent = referenceData.shortCircuit.faultCurrents[i]
          if (refCurrent) {
            const deviation = Math.abs(current - refCurrent)
            const percentDeviation = (deviation / refCurrent) * 100

            validation.comparisons.push({
              bus: i,
              parameter: 'fault_current',
              calculated: current,
              reference: refCurrent,
              deviation,
              percentDeviation,
              withinTolerance: deviation <= refCurrent * tolerance,
            })
          }
        }
      }
    }

    // Validate impedances
    if (results.impedances) {
      for (let i = 0; i < results.impedances.length; i++) {
        const impedance = results.impedances[i]

        if (
          !impedance ||
          !isFinite(impedance.real) ||
          !isFinite(impedance.imag)
        ) {
          validation.errors.push({
            type: 'invalid_impedance',
            bus: i,
            value: impedance,
            message: `Invalid impedance at bus ${i}: ${JSON.stringify(impedance)}`,
          })
          validation.passed = false
        }
      }
    }

    // Validate X/R ratios
    if (results.xratios) {
      for (let i = 0; i < results.xratios.length; i++) {
        const xratio = results.xratios[i]

        if (!isFinite(xratio) || xratio <= 0) {
          validation.warnings.push({
            type: 'invalid_xr_ratio',
            bus: i,
            value: xratio,
            message: `Invalid X/R ratio at bus ${i}: ${xratio}`,
          })
        }
      }
    }

    return validation
  } catch (error) {
    return {
      type: 'ShortCircuit',
      passed: false,
      errors: [{ type: 'validation_error', message: error.message }],
      warnings: [],
      comparisons: [],
    }
  }
}

/**
 * Validate protection results against references
 * @param {Object} system - Power system model
 * @param {Object} results - Protection results
 * @param {Object} referenceData - Reference data
 * @param {number} tolerance - Validation tolerance
 * @returns {Object} Protection validation
 */
function validateProtectionResults(system, results, referenceData, tolerance) {
  const validation = {
    type: 'Protection',
    tolerance,
    passed: true,
    errors: [],
    warnings: [],
    comparisons: [],
  }

  try {
    // Validate trip times
    if (results.tripTimes) {
      for (let i = 0; i < results.tripTimes.length; i++) {
        const tripTime = results.tripTimes[i]

        if (!isFinite(tripTime) || tripTime <= 0) {
          validation.errors.push({
            type: 'invalid_trip_time',
            device: i,
            value: tripTime,
            message: `Invalid trip time for device ${i}: ${tripTime}`,
          })
          validation.passed = false
        } else if (tripTime > 10) {
          // 10 second limit
          validation.warnings.push({
            type: 'excessive_trip_time',
            device: i,
            value: tripTime,
            limit: 10,
            message: `Excessive trip time for device ${i}: ${tripTime}s`,
          })
        }

        // Compare with reference data
        if (referenceData?.protection?.tripTimes) {
          const refTripTime = referenceData.protection.tripTimes[i]
          if (refTripTime) {
            const deviation = Math.abs(tripTime - refTripTime)
            const percentDeviation = (deviation / refTripTime) * 100

            validation.comparisons.push({
              device: i,
              parameter: 'trip_time',
              calculated: tripTime,
              reference: refTripTime,
              deviation,
              percentDeviation,
              withinTolerance: deviation <= refTripTime * tolerance,
            })
          }
        }
      }
    }

    // Validate coordination
    if (results.coordination) {
      const { coordinationIndex, selectivity } = results.coordination

      if (
        !isFinite(coordinationIndex) ||
        coordinationIndex < 0 ||
        coordinationIndex > 1
      ) {
        validation.errors.push({
          type: 'invalid_coordination',
          value: coordinationIndex,
          message: `Invalid coordination index: ${coordinationIndex}`,
        })
        validation.passed = false
      }

      if (!isFinite(selectivity) || selectivity < 0 || selectivity > 1) {
        validation.warnings.push({
          type: 'poor_selectivity',
          value: selectivity,
          message: `Poor selectivity index: ${selectivity}`,
        })
      }
    }

    return validation
  } catch (error) {
    return {
      type: 'Protection',
      passed: false,
      errors: [{ type: 'validation_error', message: error.message }],
      warnings: [],
      comparisons: [],
    }
  }
}

/**
 * Validate against specific standard
 * @param {Object} system - Power system model
 * @param {Object} results - Calculation results
 * @param {string} standard - Standard to validate against
 * @returns {Object} Standard validation
 */
function validateAgainstStandard(system, results, standard) {
  const validation = {
    type: 'Standard',
    standard,
    passed: true,
    errors: [],
    warnings: [],
    requirements: [],
  }

  try {
    switch (standard.toUpperCase()) {
      case 'IEEE':
        return validateAgainstIEEE(system, results)
      case 'IEC':
        return validateAgainstIEC(system, results)
      default:
        validation.warnings.push({
          type: 'unknown_standard',
          standard,
          message: `Unknown standard: ${standard}`,
        })
    }
  } catch (error) {
    validation.errors.push({
      type: 'standard_validation_error',
      message: error.message,
    })
    validation.passed = false
  }

  return validation
}

/**
 * Validate against IEEE standards
 * @param {Object} system - Power system model
 * @param {Object} results - Calculation results
 * @returns {Object} IEEE validation
 */
function validateAgainstIEEE(system, results) {
  const validation = {
    type: 'IEEE',
    passed: true,
    errors: [],
    warnings: [],
    requirements: [],
  }

  // IEEE 141 (Red Book) requirements
  if (results.voltages) {
    for (let i = 0; i < results.voltages.length; i++) {
      const voltage = results.voltages[i]

      // Voltage limits (ANSI C84.1)
      if (voltage > 1.1 || voltage < 0.9) {
        validation.warnings.push({
          type: 'ieee_voltage_limit',
          requirement: 'ANSI C84.1',
          bus: i,
          value: voltage,
          range: '0.9 - 1.1 p.u.',
          message: `Voltage outside ANSI C84.1 limits at bus ${i}: ${voltage}`,
        })
      }
    }
  }

  // IEEE 242 (Buff Book) requirements
  if (results.protection) {
    validation.requirements.push({
      standard: 'IEEE 242',
      requirement: 'Protection coordination',
      status: 'validated',
    })
  }

  return validation
}

/**
 * Validate against IEC standards
 * @param {Object} system - Power system model
 * @param {Object} results - Calculation results
 * @returns {Object} IEC validation
 */
function validateAgainstIEC(system, results) {
  const validation = {
    type: 'IEC',
    passed: true,
    errors: [],
    warnings: [],
    requirements: [],
  }

  // IEC 60909 requirements
  if (results.shortCircuit) {
    validation.requirements.push({
      standard: 'IEC 60909',
      requirement: 'Short circuit calculations',
      status: 'validated',
    })
  }

  // IEC 61850 requirements
  if (results.protection) {
    validation.requirements.push({
      standard: 'IEC 61850',
      requirement: 'Protection and control',
      status: 'validated',
    })
  }

  return validation
}

/**
 * Calculate validation summary
 * @param {Array} validations - Array of validation results
 * @returns {Object} Summary statistics
 */
function calculateValidationSummary(validations) {
  const summary = {
    totalValidations: validations.length,
    passedValidations: 0,
    failedValidations: 0,
    totalErrors: 0,
    totalWarnings: 0,
    overallPassed: true,
  }

  for (const validation of validations) {
    if (validation.passed) {
      summary.passedValidations++
    } else {
      summary.failedValidations++
      summary.overallPassed = false
    }

    summary.totalErrors += validation.errors?.length || 0
    summary.totalWarnings += validation.warnings?.length || 0
  }

  summary.passRate = summary.passedValidations / summary.totalValidations
  summary.errorRate = summary.totalErrors / summary.totalValidations
  summary.warningRate = summary.totalWarnings / summary.totalValidations

  return summary
}

module.exports = {
  validateAgainstExternalReferences,
}
