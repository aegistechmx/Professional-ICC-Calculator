/**
 * core/validation/mexicanStandards.js - Mexican Electrical Standards Integration
 *
 * Responsibility: Integrate Mexican electrical standards (NOM) into ICC validation framework
 */

const { NOM001SEDE2012Validator } = require('./NOM001SEDE2012')

/**
 * Mexican Electrical Standards Validator
 */
class MexicanStandardsValidator {
  constructor() {
    this.standards = {
      'NOM-001-SEDE-2012': {
        name: 'Instalaciones Eléctricas (Utilización)',
        validator: new NOM001SEDE2012Validator(),
        mandatory: true,
        scope: 'Electrical installations for utilization',
      },
      'NOM-002-SEDE-2019': {
        name: 'Instalaciones Eléctricas (Generación)',
        validator: null, // To be implemented
        mandatory: true,
        scope: 'Electrical installations for generation',
      },
      'NOM-003-SEDE-2018': {
        name: 'Instalaciones Eléctricas (Distribución)',
        validator: null, // To be implemented
        mandatory: true,
        scope: 'Electrical installations for distribution',
      },
    }
  }

  /**
   * Validate installation against applicable Mexican standards
   * @param {Object} installation - Electrical installation data
   * @param {Array} applicableStandards - List of standards to validate
   * @returns {Object} Comprehensive validation results
   */
  validateInstallation(
    installation,
    applicableStandards = ['NOM-001-SEDE-2012']
  ) {
    const results = {
      country: 'México',
      standardsFramework: 'NOM (Normas Oficiales Mexicanas)',
      timestamp: new Date().toISOString(),
      installation: {
        type: installation.type || 'Utilización',
        voltage: installation.voltage,
        location: installation.location || 'México',
      },
      results: {},
      overall: {
        compliant: true,
        mandatoryStandards: 0,
        mandatoryCompliant: 0,
        warnings: [],
        errors: [],
      },
    }

    // Validate each applicable standard
    applicableStandards.forEach(standardCode => {
      const standard = this.standards[standardCode]
      if (standard && standard.validator) {
        try {
          const standardResult =
            standard.validator.validateInstallation(installation)
          results.results[standardCode] = standardResult

          if (standard.mandatory) {
            results.overall.mandatoryStandards++
            if (standardResult.overall.compliant) {
              results.overall.mandatoryCompliant++
            }
          }

          // Collect warnings and errors
          if (standardResult.overall.warnings > 0) {
            results.overall.warnings.push({
              standard: standardCode,
              count: standardResult.overall.warnings,
            })
          }

          if (standardResult.overall.errors > 0) {
            results.overall.errors.push({
              standard: standardCode,
              count: standardResult.overall.errors,
            })
          }
        } catch (error) {
          results.overall.errors.push({
            standard: standardCode,
            error: error.message,
          })
        }
      } else {
        results.overall.warnings.push({
          standard: standardCode,
          message: 'Standard validator not available',
        })
      }
    })

    // Calculate overall compliance
    results.overall.compliant =
      results.overall.mandatoryCompliant ===
        results.overall.mandatoryStandards &&
      results.overall.errors.length === 0

    return results
  }

  /**
   * Get list of available Mexican standards
   * @returns {Array} Available standards
   */
  getAvailableStandards() {
    return Object.entries(this.standards).map(([code, info]) => ({
      code,
      name: info.name,
      scope: info.scope,
      mandatory: info.mandatory,
      available: info.validator !== null,
    }))
  }

  /**
   * Determine applicable standards based on installation type
   * @param {Object} installation - Installation data
   * @returns {Array} Applicable standards
   */
  getApplicableStandards(installation) {
    const applicable = []

    // Based on installation type
    switch (installation.type) {
      case 'Utilización':
      case 'utilization':
        applicable.push('NOM-001-SEDE-2012')
        break
      case 'Generación':
      case 'generation':
        applicable.push('NOM-002-SEDE-2019')
        break
      case 'Distribución':
      case 'distribution':
        applicable.push('NOM-003-SEDE-2018')
        break
      default:
        // Default to utilization standard
        applicable.push('NOM-001-SEDE-2012')
    }

    // Add voltage-based standards
    if (installation.voltage) {
      if (installation.voltage > 23000) {
        // High voltage might require additional standards
        applicable.push('NOM-001-SEDE-2012') // Still applies
      }
    }

    return [...new Set(applicable)] // Remove duplicates
  }

  /**
   * Generate comprehensive compliance report
   * @param {Object} results - Validation results
   * @returns {string} Formatted report
   */
  generateComplianceReport(results) {
    let report = `COMPLIANCE REPORT - MEXICAN ELECTRICAL STANDARDS\n`
    report += `Generated: ${results.timestamp}\n`
    report += `Country: México\n`
    report += `Framework: ${results.standardsFramework}\n\n`

    report += `INSTALLATION DETAILS:\n`
    report += `  Type: ${results.installation.type}\n`
    report += `  Voltage: ${results.installation.voltage || 'N/A'}V\n`
    report += `  Location: ${results.installation.location}\n\n`

    report += `OVERALL STATUS: ${results.overall.compliant ? 'COMPLIANT' : 'NON-COMPLIANT'}\n`
    report += `Mandatory Standards: ${results.overall.mandatoryCompliant}/${results.overall.mandatoryStandards}\n\n`

    // Report for each standard
    Object.entries(results.results).forEach(
      ([standardCode, standardResult]) => {
        const standard = this.standards[standardCode]
        report += `${standardCode} - ${standard.name}\n`
        report += `Status: ${standardResult.overall.compliant ? 'COMPLIANT' : 'NON-COMPLIANT'}\n`

        if (standardResult.overall.summary) {
          const summary = standardResult.overall.summary
          report += `Checks: ${summary.passed}/${summary.checks} passed\n`
        }

        if (standardResult.overall.warnings > 0) {
          report += `Warnings: ${standardResult.overall.warnings}\n`
        }

        if (standardResult.overall.errors > 0) {
          report += `Errors: ${standardResult.overall.errors}\n`
        }

        report += '\n'
      }
    )

    // Summary of issues
    if (results.overall.warnings.length > 0) {
      report += `WARNINGS SUMMARY:\n`
      results.overall.warnings.forEach(warning => {
        report += `  ${warning.standard}: ${warning.count || warning.message}\n`
      })
      report += '\n'
    }

    if (results.overall.errors.length > 0) {
      report += `ERRORS SUMMARY:\n`
      results.overall.errors.forEach(error => {
        report += `  ${error.standard}: ${error.count || error.error}\n`
      })
      report += '\n'
    }

    return report
  }

  /**
   * Validate specific NOM standard
   * @param {string} standardCode - Standard code
   * @param {Object} installation - Installation data
   * @returns {Object} Validation results
   */
  validateStandard(standardCode, installation) {
    const standard = this.standards[standardCode]
    if (!standard) {
      throw new Error(`Standard ${standardCode} not found`)
    }

    if (!standard.validator) {
      throw new Error(`Validator for ${standardCode} not implemented`)
    }

    return standard.validator.validateInstallation(installation)
  }

  /**
   * Add new standard validator
   * @param {string} code - Standard code
   * @param {Object} validator - Validator instance
   * @param {Object} metadata - Standard metadata
   */
  addStandard(code, validator, metadata) {
    this.standards[code] = {
      validator,
      mandatory: metadata.mandatory || false,
      scope: metadata.scope,
      name: metadata.name,
    }
  }
}

module.exports = {
  MexicanStandardsValidator,
  NOM001SEDE2012Validator,

  // Convenience functions
  validateMexicanStandards: (installation, standards) => {
    const validator = new MexicanStandardsValidator()
    return validator.validateInstallation(installation, standards)
  },

  getMexicanStandards: () => {
    const validator = new MexicanStandardsValidator()
    return validator.getAvailableStandards()
  },

  generateMexicanComplianceReport: results => {
    const validator = new MexicanStandardsValidator()
    return validator.generateComplianceReport(results)
  },
}
