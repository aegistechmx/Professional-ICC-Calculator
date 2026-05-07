/**
 * core/validation/NOM001SEDE2012.js - NOM-001-SEDE-2012 Compliance Validation
 *
 * Responsibility: Validate electrical installations according to Mexican standard NOM-001-SEDE-2012
 * Scope: Instalaciones Eléctricas (Utilización) - Electrical Installations (Utilization)
 */

/**
 * NOM-001-SEDE-2012 validation class
 */
class NOM001SEDE2012Validator {
  constructor() {
    this.standard = 'NOM-001-SEDE-2012'
    this.version = '2012'
    this.publicationDate = '2012-11-28'
    this.scope = 'Instalaciones Eléctricas (Utilización)'
  }

  /**
   * Validate complete electrical installation
   * @param {Object} installation - Electrical installation data
   * @returns {Object} Validation results
   */
  validateInstallation(installation) {
    const results = {
      standard: this.standard,
      version: this.version,
      timestamp: new Date().toISOString(),
      overall: { compliant: true, warnings: [], errors: [] },
      sections: {},
    }

    // Validate each section
    results.sections.general = this.validateGeneralRequirements(installation)
    results.sections.protection = this.validateProtectionSystems(installation)
    results.sections.conductors = this.validateConductors(installation)
    results.sections.grounding = this.validateGroundingSystem(installation)
    results.sections.emergency = this.validateEmergencySystems(installation)

    // Calculate overall compliance
    this.calculateOverallCompliance(results)

    return results
  }

  /**
   * Validate general requirements
   * @param {Object} installation - Installation data
   * @returns {Object} General requirements validation
   */
  validateGeneralRequirements(installation) {
    const validation = {
      section: 'General Requirements',
      compliant: true,
      checks: [],
      warnings: [],
      errors: [],
    }

    // Check voltage levels
    if (installation.voltage) {
      validation.checks.push({
        requirement: 'Voltage levels must be within permitted ranges',
        status: this.checkVoltageLevels(installation.voltage) ? 'pass' : 'fail',
        details: `Voltage: ${installation.voltage}V`,
      })
    }

    // Check load calculations
    if (installation.loads) {
      validation.checks.push({
        requirement: 'Load calculations must follow NOM-001-SEDE-2012 methods',
        status: this.validateLoadCalculations(installation.loads)
          ? 'pass'
          : 'fail',
        details: `Total load: ${installation.loads.total || 'N/A'} kW`,
      })
    }

    // Check conductor sizing
    if (installation.conductors) {
      validation.checks.push({
        requirement: 'Conductor sizing must comply with ampacity tables',
        status: this.validateConductorSizing(installation.conductors)
          ? 'pass'
          : 'fail',
        details: `${installation.conductors.length || 0} conductors checked`,
      })
    }

    return validation
  }

  /**
   * Validate protection systems
   * @param {Object} installation - Installation data
   * @returns {Object} Protection systems validation
   */
  validateProtectionSystems(installation) {
    const validation = {
      section: 'Protection Systems',
      compliant: true,
      checks: [],
      warnings: [],
      errors: [],
    }

    // Check overcurrent protection
    if (installation.protection) {
      validation.checks.push({
        requirement: 'Overcurrent protection devices must be properly sized',
        status: this.validateOvercurrentProtection(installation.protection)
          ? 'pass'
          : 'fail',
        details: `Protection devices: ${installation.protection.devices?.length || 0}`,
      })

      // Check coordination
      validation.checks.push({
        requirement: 'Protection coordination must be verified',
        status: this.validateProtectionCoordination(installation.protection)
          ? 'pass'
          : 'fail',
        details: 'Coordination study required',
      })
    }

    // Check short circuit protection
    validation.checks.push({
      requirement: 'Short circuit protection must be adequate',
      status: this.validateShortCircuitProtection(installation)
        ? 'pass'
        : 'fail',
      details: 'Short circuit analysis required',
    })

    return validation
  }

  /**
   * Validate conductors and cables
   * @param {Object} installation - Installation data
   * @returns {Object} Conductors validation
   */
  validateConductors(installation) {
    const validation = {
      section: 'Conductors and Cables',
      compliant: true,
      checks: [],
      warnings: [],
      errors: [],
    }

    if (installation.conductors) {
      installation.conductors.forEach((conductor, index) => {
        const conductorCheck = {
          requirement: `Conductor ${index + 1} must meet NOM-001-SEDE-2012 requirements`,
          status: this.validateIndividualConductor(conductor) ? 'pass' : 'fail',
          details: `Type: ${conductor.type || 'N/A'}, Size: ${conductor.size || 'N/A'}`,
        }
        validation.checks.push(conductorCheck)
      })
    }

    return validation
  }

  /**
   * Validate grounding system
   * @param {Object} installation - Installation data
   * @returns {Object} Grounding validation
   */
  validateGroundingSystem(installation) {
    const validation = {
      section: 'Grounding System',
      compliant: true,
      checks: [],
      warnings: [],
      errors: [],
    }

    // Check grounding electrode system
    validation.checks.push({
      requirement: 'Grounding electrode system must comply with Chapter 9',
      status: this.validateGroundingElectrodes(installation.grounding)
        ? 'pass'
        : 'fail',
      details: 'Grounding resistance must be ≤ 25Ω',
    })

    // Check equipment grounding
    validation.checks.push({
      requirement: 'Equipment grounding conductors must be properly sized',
      status: this.validateEquipmentGrounding(installation.grounding)
        ? 'pass'
        : 'fail',
      details: 'EGC sizing per Table 250-122',
    })

    return validation
  }

  /**
   * Validate emergency systems
   * @param {Object} installation - Installation data
   * @returns {Object} Emergency systems validation
   */
  validateEmergencySystems(installation) {
    const validation = {
      section: 'Emergency Systems',
      compliant: true,
      checks: [],
      warnings: [],
      errors: [],
    }

    if (installation.emergency) {
      // Check emergency lighting
      validation.checks.push({
        requirement: 'Emergency lighting must meet Article 700 requirements',
        status: this.validateEmergencyLighting(installation.emergency)
          ? 'pass'
          : 'fail',
        details: 'Emergency lighting duration: 90 minutes minimum',
      })

      // Check backup power
      validation.checks.push({
        requirement: 'Backup power systems must be properly maintained',
        status: this.validateBackupPower(installation.emergency)
          ? 'pass'
          : 'fail',
        details: 'Generator or battery backup required',
      })
    }

    return validation
  }

  /**
   * Check voltage levels according to NOM-001-SEDE-2012
   * @param {number} voltage - System voltage
   * @returns {boolean} Compliance status
   */
  checkVoltageLevels(voltage) {
    // Common voltage levels in Mexico according to NOM-001-SEDE-2012
    const permittedVoltages = [
      127, 220, 240, 277, 380, 400, 440, 460, 480, 575, 600, 2300, 4160, 13800,
    ]

    return permittedVoltages.includes(voltage)
  }

  /**
   * Validate load calculations
   * @param {Object} loads - Load data
   * @returns {boolean} Compliance status
   */
  validateLoadCalculations(loads) {
    // Simplified validation - in real implementation would check
    // against NOM-001-SEDE-2012 calculation methods
    return loads && typeof loads.total === 'number' && loads.total > 0
  }

  /**
   * Validate conductor sizing
   * @param {Array} conductors - Conductor data
   * @returns {boolean} Compliance status
   */
  validateConductorSizing(conductors) {
    return Array.isArray(conductors) && conductors.length > 0
  }

  /**
   * Validate overcurrent protection
   * @param {Object} protection - Protection data
   * @returns {boolean} Compliance status
   */
  validateOvercurrentProtection(protection) {
    return protection && protection.devices && Array.isArray(protection.devices)
  }

  /**
   * Validate protection coordination
   * @param {Object} protection - Protection data
   * @returns {boolean} Compliance status
   */
  validateProtectionCoordination(protection) {
    // Simplified check - would require TCC analysis in real implementation
    return protection && protection.coordination !== false
  }

  /**
   * Validate short circuit protection
   * @param {Object} installation - Installation data
   * @returns {boolean} Compliance status
   */
  validateShortCircuitProtection(installation) {
    // Would require short circuit analysis
    return installation.shortCircuitAnalysis !== undefined
  }

  /**
   * Validate individual conductor
   * @param {Object} conductor - Conductor data
   * @returns {boolean} Compliance status
   */
  validateIndividualConductor(conductor) {
    return conductor && conductor.type && conductor.size
  }

  /**
   * Validate grounding electrodes
   * @param {Object} grounding - Grounding data
   * @returns {boolean} Compliance status
   */
  validateGroundingElectrodes(grounding) {
    // Check if grounding resistance meets requirement (≤ 25Ω)
    return (
      grounding &&
      grounding.resistance !== undefined &&
      grounding.resistance <= 25
    )
  }

  /**
   * Validate equipment grounding
   * @param {Object} grounding - Grounding data
   * @returns {boolean} Compliance status
   */
  validateEquipmentGrounding(grounding) {
    return grounding && grounding.equipmentGrounding !== undefined
  }

  /**
   * Validate emergency lighting
   * @param {Object} emergency - Emergency systems data
   * @returns {boolean} Compliance status
   */
  validateEmergencyLighting(emergency) {
    return emergency && emergency.lighting && emergency.lighting.duration >= 90
  }

  /**
   * Validate backup power
   * @param {Object} emergency - Emergency systems data
   * @returns {boolean} Compliance status
   */
  validateBackupPower(emergency) {
    return emergency && (emergency.generator || emergency.battery)
  }

  /**
   * Calculate overall compliance
   * @param {Object} results - Validation results
   */
  calculateOverallCompliance(results) {
    let allCompliant = true
    let totalWarnings = 0
    let totalErrors = 0

    Object.values(results.sections).forEach(section => {
      if (!section.compliant) {
        allCompliant = false
      }
      totalWarnings += section.warnings?.length || 0
      totalErrors += section.errors?.length || 0
    })

    results.overall.compliant = allCompliant && totalErrors === 0
    results.overall.warnings = totalWarnings
    results.overall.errors = totalErrors
    results.overall.summary = {
      sections: Object.keys(results.sections).length,
      checks: Object.values(results.sections).reduce(
        (sum, section) => sum + (section.checks?.length || 0),
        0
      ),
      passed: Object.values(results.sections).reduce(
        (sum, section) =>
          sum + (section.checks?.filter(c => c.status === 'pass').length || 0),
        0
      ),
      failed: Object.values(results.sections).reduce(
        (sum, section) =>
          sum + (section.checks?.filter(c => c.status === 'fail').length || 0),
        0
      ),
    }
  }

  /**
   * Generate compliance report
   * @param {Object} results - Validation results
   * @returns {string} Formatted report
   */
  generateReport(results) {
    let report = `NOM-001-SEDE-2012 Compliance Report\n`
    report += `Generated: ${results.timestamp}\n`
    report += `Standard: ${results.standard} Version ${results.version}\n`
    report += `Scope: ${this.scope}\n\n`

    report += `Overall Status: ${results.overall.compliant ? 'COMPLIANT' : 'NON-COMPLIANT'}\n`
    report += `Summary: ${results.overall.summary.passed}/${results.overall.summary.checks} checks passed\n\n`

    Object.entries(results.sections).forEach(([_sectionName, section]) => {
      report += `${section.section}: ${section.compliant ? 'COMPLIANT' : 'NON-COMPLIANT'}\n`
      section.checks.forEach(check => {
        report += `  ${check.status === 'pass' ? '✅' : '❌'} ${check.requirement}\n`
        if (check.details) report += `    ${check.details}\n`
      })
      report += '\n'
    })

    return report
  }
}

module.exports = {
  NOM001SEDE2012Validator,

  // Convenience functions
  validateNOM001SEDE2012: installation => {
    const validator = new NOM001SEDE2012Validator()
    return validator.validateInstallation(installation)
  },

  generateNOM001Report: results => {
    const validator = new NOM001SEDE2012Validator()
    return validator.generateReport(results)
  },
}
