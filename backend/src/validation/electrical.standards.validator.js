/**
 * src/validation/electrical.standards.validator.js - Electrical Standards Compliance Validator
 *
 * Responsibility: Validate compliance with IEEE and IEC electrical standards
 * Standards: IEEE 1584, IEEE 141, IEEE 242, IEC 60909, NEC 2023
 */

const { toElectricalPrecision } = require('../shared/utils/electricalUtils')

class ElectricalStandardsValidator {
  constructor() {
    this.standards = {
      IEEE_1584: {
        name: 'IEEE 1584-2018',
        description: 'Guide for Performing Arc-Flash Calculations',
        requirements: {
          precision: 6,
          voltageRange: [50, 15000], // Volts
          currentRange: [100, 106000], // Amperes
          gapDistance: [3, 152], // mm
          workingDistance: [305, 3660] // mm
        }
      },
      IEC_60909: {
        name: 'IEC 60909-2016',
        description: 'Short-Circuit Currents in Three-Phase AC Systems',
        requirements: {
          precision: 6,
          voltageRange: [100, 725000], // Volts
          frequency: [50, 60], // Hz
          temperature: 20, // °C reference
          impedanceRange: [0.0001, 1000] // Ohms
        }
      },
      IEEE_141: {
        name: 'IEEE 141-1993 (Red Book)',
        description: 'Electric Power Distribution for Industrial Plants',
        requirements: {
          precision: 4,
          voltageDrop: [0.05, 0.1], // 5-10% max
          powerFactor: [0.8, 1.0],
          harmonics: 0.05 // 5% THD max
        }
      },
      IEEE_242: {
        name: 'IEEE 242-2001 (Buff Book)',
        description: 'Protection and Coordination of Industrial and Commercial Power Systems',
        requirements: {
          precision: 4,
          coordinationTime: [0.01, 10], // seconds
          selectivityRatio: 2.0,
          pickupRange: [0.5, 10] // times rated current
        }
      }
    }
  }

  /**
   * Validate IEEE 1584 compliance for arc-flash calculations
   * @param {Object} calculation - Arc-flash calculation result
   * @returns {Object} Compliance result
   */
  validateIEEE1584(calculation) {
    const standard = this.standards.IEEE_1584
    const violations = []
    const warnings = []

    // Check precision
    if (calculation.incidentEnergy) {
      const decimalPlaces = calculation.incidentEnergy.toString().split('.')[1]?.length || 0
      if (decimalPlaces < standard.requirements.precision) {
        violations.push({
          type: 'PRECISION',
          field: 'incidentEnergy',
          expected: `${standard.requirements.precision} decimal places`,
          actual: `${decimalPlaces} decimal places`
        })
      }
    }

    // Check voltage range
    if (calculation.voltage) {
      const [minV, maxV] = standard.requirements.voltageRange // voltage (V)
      if (calculation.voltage < minV || calculation.voltage > maxV) {
        warnings.push({
          type: 'RANGE_WARNING',
          field: 'voltage',
          range: `${minV}-${maxV}V`,
          actual: `${calculation.voltage}V`
        })
      }
    }

    // Check arc duration
    if (calculation.arcDuration) {
      if (calculation.arcDuration > 2) { // 2 seconds max for safety
        violations.push({
          type: 'SAFETY',
          field: 'arcDuration',
          maximum: '2 seconds',
          actual: `${calculation.arcDuration} seconds`
        })
      }
    }

    return {
      standard: standard.name,
      compliant: violations.length === 0,
      violations,
      warnings,
      score: this.calculateComplianceScore(violations, warnings)
    }
  }

  /**
   * Validate IEC 60909 compliance for short-circuit calculations
   * @param {Object} calculation - Short-circuit calculation result
   * @returns {Object} Compliance result
   */
  validateIEC60909(calculation) {
    const standard = this.standards.IEC_60909
    const violations = []
    const warnings = []

    // Check precision
    ['Ik3', 'Ik2', 'Ik1', 'Ike'].forEach(current => { // current (A)
      if (calculation[current]) {
        const decimalPlaces = calculation[current].toString().split('.')[1]?.length || 0 // current (A)
        if (decimalPlaces < standard.requirements.precision) {
          violations.push({
            type: 'PRECISION',
            field: current,
            expected: `${standard.requirements.precision} decimal places`,
            actual: `${decimalPlaces} decimal places`
          })
        }
      }
    })

    // Check voltage range
    if (calculation.systemVoltage) {
      const [minV, maxV] = standard.requirements.voltageRange // voltage (V)
      if (calculation.systemVoltage < minV || calculation.systemVoltage > maxV) {
        warnings.push({
          type: 'RANGE_WARNING',
          field: 'systemVoltage',
          range: `${minV}-${maxV}V`,
          actual: `${calculation.systemVoltage}V`
        })
      }
    }

    // Check X/R ratio
    if (calculation.xrRatio) {
      if (calculation.xrRatio > 50) { // Very high X/R ratio
        warnings.push({
          type: 'ENGINEERING_WARNING',
          field: 'xrRatio',
          recommendation: 'Consider DC component for high X/R ratios',
          actual: calculation.xrRatio
        })
      }
    }

    return {
      standard: standard.name,
      compliant: violations.length === 0,
      violations,
      warnings,
      score: this.calculateComplianceScore(violations, warnings)
    }
  }

  /**
   * Validate IEEE 141 compliance for power distribution
   * @param {Object} calculation - Power distribution calculation
   * @returns {Object} Compliance result
   */
  validateIEEE141(calculation) {
    const standard = this.standards.IEEE_141
    const violations = []
    const warnings = []

    // Check voltage drop
    if (calculation.voltageDrop) {
      const [minDrop, maxDrop] = standard.requirements.voltageDrop // voltage (V)
      const dropPercentage = (calculation.voltageDrop / calculation.nominalVoltage) * 100 // voltage (V)

      if (dropPercentage > maxDrop * 100) {
        violations.push({
          type: 'VOLTAGE_DROP',
          field: 'voltageDrop',
          maximum: `${maxDrop * 100}%`,
          actual: `${dropPercentage.toFixed(2)}%`
        })
      } else if (dropPercentage > minDrop * 100) {
        warnings.push({
          type: 'VOLTAGE_DROP_WARNING',
          field: 'voltageDrop',
          recommended: `<${minDrop * 100}%`,
          actual: `${dropPercentage.toFixed(2)}%`
        })
      }
    }

    // Check power factor
    if (calculation.powerFactor) {
      const [minPF, _maxPF] = standard.requirements.powerFactor // power (W)
      if (calculation.powerFactor < minPF) {
        violations.push({
          type: 'POWER_FACTOR',
          field: 'powerFactor',
          minimum: minPF,
          actual: calculation.powerFactor
        })
      }
    }

    return {
      standard: standard.name,
      compliant: violations.length === 0,
      violations,
      warnings,
      score: this.calculateComplianceScore(violations, warnings)
    }
  }

  /**
   * Validate IEEE 242 compliance for protection coordination
   * @param {Object} calculation - Protection coordination calculation
   * @returns {Object} Compliance result
   */
  validateIEEE242(calculation) {
    const standard = this.standards.IEEE_242
    const violations = []
    const warnings = []

    // Check coordination time
    if (calculation.coordinationTime) {
      const [minTime, maxTime] = standard.requirements.coordinationTime
      if (calculation.coordinationTime < minTime || calculation.coordinationTime > maxTime) {
        violations.push({
          type: 'COORDINATION_TIME',
          field: 'coordinationTime',
          range: `${minTime}-${maxTime}s`,
          actual: `${calculation.coordinationTime}s`
        })
      }
    }

    // Check selectivity
    if (calculation.selectivityRatio) {
      if (calculation.selectivityRatio < standard.requirements.selectivityRatio) {
        violations.push({
          type: 'SELECTIVITY',
          field: 'selectivityRatio',
          minimum: standard.requirements.selectivityRatio,
          actual: calculation.selectivityRatio
        })
      }
    }

    return {
      standard: standard.name,
      compliant: violations.length === 0,
      violations,
      warnings,
      score: this.calculateComplianceScore(violations, warnings)
    }
  }

  /**
   * Run comprehensive standards validation
   * @param {Object} calculations - All calculation results
   * @param {Array} standardsToCheck - Standards to validate
   * @returns {Object} Comprehensive validation report
   */
  validateAllStandards(calculations, standardsToCheck = ['IEEE_1584', 'IEC_60909', 'IEEE_141', 'IEEE_242']) {
    const results = {}
    let totalViolations = 0
    let totalWarnings = 0

    standardsToCheck.forEach(standard => {
      switch (standard) {
        case 'IEEE_1584':
          if (calculations.arcFlash) {
            results[standard] = this.validateIEEE1584(calculations.arcFlash)
            totalViolations += results[standard].violations.length
            totalWarnings += results[standard].warnings.length
          }
          break
        case 'IEC_60909':
          if (calculations.shortCircuit) {
            results[standard] = this.validateIEC60909(calculations.shortCircuit)
            totalViolations += results[standard].violations.length
            totalWarnings += results[standard].warnings.length
          }
          break
        case 'IEEE_141':
          if (calculations.powerDistribution) {
            results[standard] = this.validateIEEE141(calculations.powerDistribution) // power (W)
            totalViolations += results[standard].violations.length
            totalWarnings += results[standard].warnings.length
          }
          break
        case 'IEEE_242':
          if (calculations.protectionCoordination) {
            results[standard] = this.validateIEEE242(calculations.protectionCoordination)
            totalViolations += results[standard].violations.length
            totalWarnings += results[standard].warnings.length
          }
          break
      }
    })

    return {
      timestamp: new Date().toISOString(),
      standards: results,
      summary: {
        totalStandards: Object.keys(results).length,
        compliantStandards: Object.values(results).filter(r => r.compliant).length,
        totalViolations,
        totalWarnings,
        overallCompliance: totalViolations === 0,
        averageScore: this.calculateAverageScore(Object.values(results))
      }
    }
  }

  /**
   * Calculate compliance score
   * @param {Array} violations - List of violations
   * @param {Array} warnings - List of warnings
   * @returns {number} Compliance score (0-100)
   */
  calculateComplianceScore(violations, warnings) {
    const baseScore = 100
    const violationPenalty = 20
    const warningPenalty = 5

    const score = baseScore - (violations.length * violationPenalty) - (warnings.length * warningPenalty)
    return Math.max(0, score)
  }

  /**
   * Calculate average score across multiple standards
   * @param {Array} results - Validation results
   * @returns {number} Average score
   */
  calculateAverageScore(results) {
    if (results.length === 0) return 100

    const totalScore = results.reduce((sum, result) => sum + result.score, 0)
    return toElectricalPrecision(totalScore / results.length)
  }

  /**
   * Generate compliance report
   * @param {Object} validationResults - Validation results
   * @returns {string} Formatted report
   */
  generateReport(validationResults) {
    const { summary, standards } = validationResults
    let report = `# Electrical Standards Compliance Report\n`
    report += `Generated: ${new Date().toISOString()}\n\n`

    report += `## Summary\n`
    report += `- Overall Compliance: ${summary.overallCompliance ? 'COMPLIANT' : 'NON-COMPLIANT'}\n`
    report += `- Standards Checked: ${summary.totalStandards}\n`
    report += `- Compliant Standards: ${summary.compliantStandards}\n`
    report += `- Total Violations: ${summary.totalViolations}\n`
    report += `- Total Warnings: ${summary.totalWarnings}\n`
    report += `- Average Score: ${summary.averageScore}/100\n\n`

    Object.entries(standards).forEach(([_standard, result]) => {
      report += `## ${result.standard}\n`
      report += `- Status: ${result.compliant ? 'COMPLIANT' : 'NON-COMPLIANT'}\n`
      report += `- Score: ${result.score}/100\n`

      if (result.violations.length > 0) {
        report += `### Violations:\n`
        result.violations.forEach(v => {
          report += `- ${v.type}: ${v.field} - ${v.expected || v.maximum || v.minimum} (actual: ${v.actual})\n`
        })
      }

      if (result.warnings.length > 0) {
        report += `### Warnings:\n`
        result.warnings.forEach(w => {
          report += `- ${w.type}: ${w.field} - ${w.recommendation || w.range || w.actual}\n`
        })
      }
      report += `\n`
    })

    return report
  }
}

module.exports = {
  ElectricalStandardsValidator
}
