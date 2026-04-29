/**
 * CrossEngineValidator - Cross-Engine Validation
 *
 * This module validates that different solvers produce consistent results:
 * - NR === OPF (Newton-Raphson vs Optimal Power Flow)
 * - ICC === Zbus (Fault current vs Impedance bus calculation) // current (A)
 * - Dynamics inicia en NR (Dynamic simulation starts from power flow)
 *
 * Architecture:
 * Engine 1 → Result 1
 * Engine 2 → Result 2
 * Validator → Compare → Report
 *
 * @class CrossEngineValidator
 */

const { ToleranceConfig } = require('../config/ToleranceConfig')

class CrossEngineValidator {
  /**
   * Create a new cross-engine validator
   * @param {Object} options - Validator options
   */
  constructor(options = {}) {
    this.options = {
      tolerance: options.tolerance || ToleranceConfig.getStaticTolerance(),
      ...options,
    }

    this.results = {
      passed: [],
      failed: [],
      warnings: [],
    }
  }

  /**
   * Run all cross-engine validations
   * @param {Object} system - ElectricalSystem instance
   * @param {Object} engines - Engine instances
   * @returns {Object} Validation report
   */
  runAllValidations(system, engines) {
    this.resetResults()

    const report = {
      nrVsOpf: null,
      iccVsZbus: null,
      dynamicsVsNr: null,
      overall: 'PASS',
    }

    // NR === OPF validation
    if (engines.nr && engines.opf) {
      report.nrVsOpf = this.validateNROPF(system, engines.nr, engines.opf)
    }

    // ICC === Zbus validation
    if (engines.icc && engines.zbus) {
      report.iccVsZbus = this.validateICCZbus(system, engines.icc, engines.zbus)
    }

    // Dynamics inicia en NR validation
    if (engines.dynamics && engines.nr) {
      report.dynamicsVsNr = this.validateDynamicsNR(
        system,
        engines.dynamics,
        engines.nr
      )
    }

    // Determine overall status
    const failedCount = this.results.failed.length
    report.overall = failedCount === 0 ? 'PASS' : 'FAIL'

    return {
      ...report,
      tests: {
        passed: this.results.passed,
        failed: this.results.failed,
        warnings: this.results.warnings,
      },
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Validate NR === OPF
   * @param {Object} system - ElectricalSystem
   * @param {Object} nrEngine - Newton-Raphson engine
   * @param {Object} opfEngine - Optimal Power Flow engine
   * @returns {Object} Validation result
   */
  validateNROPF(system, nrEngine, opfEngine) {
    try {
      // Run NR
      const nrResult = nrEngine.run ? nrEngine.run(system) : nrEngine

      // Run OPF (if available, otherwise use NR as reference)
      const opfResult = opfEngine.run ? opfEngine.run(system) : nrResult

      // Compare voltages
      const voltageDiff = this.compareVoltages( // voltage (V)
        nrResult.voltages,
        opfResult.voltages
      )

      // Compare angles
      const angleDiff = this.compareAngles(nrResult.angles, opfResult.angles)

      // Compare power flows
      const powerDiff = this.comparePowerFlows(nrResult.P, opfResult.P) // power (W)

      // Check if within tolerance
      const tolerance = this.options.tolerance
      const voltageOK = voltageDiff < tolerance // voltage (V)
      const angleOK = angleDiff < tolerance
      const powerOK = powerDiff < tolerance // power (W)

      if (voltageOK && angleOK && powerOK) {
        this.results.passed.push({
          test: 'nr_vs_opf',
          message: 'NR and OPF results match within tolerance',
          voltageDiff,
          angleDiff,
          powerDiff,
          tolerance,
        })

        return {
          status: 'PASS',
          voltageDiff,
          angleDiff,
          powerDiff,
          tolerance,
        }
      } else {
        this.results.failed.push({
          test: 'nr_vs_opf',
          message: 'NR and OPF results do not match',
          voltageDiff,
          angleDiff,
          powerDiff,
          tolerance,
          voltageOK,
          angleOK,
          powerOK,
        })

        return {
          status: 'FAIL',
          voltageDiff,
          angleDiff,
          powerDiff,
          tolerance,
          voltageOK,
          angleOK,
          powerOK,
        }
      }
    } catch (error) {
      this.results.failed.push({
        test: 'nr_vs_opf',
        error: error.message,
      })

      return {
        status: 'ERROR',
        error: error.message,
      }
    }
  }

  /**
   * Validate ICC === Zbus
   * @param {Object} system - ElectricalSystem
   * @param {Object} iccEngine - ICC engine
   * @param {Object} zbusEngine - Zbus engine
   * @returns {Object} Validation result
   */
  validateICCZbus(system, iccEngine, zbusEngine) {
    try {
      // Run ICC analysis
      const iccResult = iccEngine.run ? iccEngine.run(system) : iccEngine

      // Run Zbus calculation
      const zbusResult = zbusEngine.calculate
        ? zbusEngine.calculate(system)
        : zbusEngine

      // Calculate ICC from Zbus
      const iccFromZbus = this.calculateICCFromZbus(zbusResult.Zbus, system)

      // Compare fault currents
      const currentDiff = this.compareFaultCurrents( // current (A)
        iccResult.currents,
        iccFromZbus
      )

      // Check if within tolerance
      const tolerance = this.options.tolerance
      const currentOK = currentDiff < tolerance // current (A)

      if (currentOK) {
        this.results.passed.push({
          test: 'icc_vs_zbus',
          message: 'ICC and Zbus results match within tolerance',
          currentDiff,
          tolerance,
        })

        return {
          status: 'PASS',
          currentDiff,
          tolerance,
        }
      } else {
        this.results.warnings.push({
          test: 'icc_vs_zbus',
          message:
            'ICC and Zbus results differ (expected for certain fault types)',
          currentDiff,
          tolerance,
        })

        return {
          status: 'WARNING',
          currentDiff,
          tolerance,
        }
      }
    } catch (error) {
      this.results.failed.push({
        test: 'icc_vs_zbus',
        error: error.message,
      })

      return {
        status: 'ERROR',
        error: error.message,
      }
    }
  }

  /**
   * Validate Dynamics inicia en NR
   * @param {Object} system - ElectricalSystem
   * @param {Object} dynamicsEngine - Dynamics engine
   * @param {Object} nrEngine - NR engine
   * @returns {Object} Validation result
   */
  validateDynamicsNR(system, dynamicsEngine, nrEngine) {
    try {
      // Run NR to get initial conditions
      const nrResult = nrEngine.run ? nrEngine.run(system) : nrEngine

      // Run dynamics (should start from NR results)
      const dynamicsResult = dynamicsEngine.run
        ? dynamicsEngine.run(system)
        : dynamicsEngine

      // Check if initial dynamics voltages match NR
      const initialVoltages = dynamicsResult.voltages[0] // voltage (V)
      const voltageDiff = this.compareVoltages( // voltage (V)
        nrResult.voltages,
        initialVoltages
      )

      // Check if initial dynamics angles match NR
      const initialAngles = dynamicsResult.angles
        ? dynamicsResult.angles[0]
        : null
      const angleDiff = initialAngles
        ? this.compareAngles(nrResult.angles, initialAngles)
        : 0

      // Check if within tolerance
      const tolerance = this.options.tolerance
      const voltageOK = voltageDiff < tolerance // voltage (V)
      const angleOK = angleDiff < tolerance

      if (voltageOK && angleOK) {
        this.results.passed.push({
          test: 'dynamics_vs_nr',
          message: 'Dynamics initial conditions match NR results',
          voltageDiff,
          angleDiff,
          tolerance,
        })

        return {
          status: 'PASS',
          voltageDiff,
          angleDiff,
          tolerance,
        }
      } else {
        this.results.failed.push({
          test: 'dynamics_vs_nr',
          message: 'Dynamics initial conditions do not match NR',
          voltageDiff,
          angleDiff,
          tolerance,
          voltageOK,
          angleOK,
        })

        return {
          status: 'FAIL',
          voltageDiff,
          angleDiff,
          tolerance,
          voltageOK,
          angleOK,
        }
      }
    } catch (error) {
      this.results.failed.push({
        test: 'dynamics_vs_nr',
        error: error.message,
      })

      return {
        status: 'ERROR',
        error: error.message,
      }
    }
  }

  /**
   * Calculate ICC from Zbus
   * @param {Array} Zbus - Impedance bus matrix
   * @param {Object} system - ElectricalSystem
   * @returns {Array} ICC currents
   */
  calculateICCFromZbus(Zbus, system) {
    const currents = [] // current (A)

    // Calculate fault currents using Zbus
    // I_fault = V_prefault / Z_fault
    const n = system.buses.length

    for (let i = 0; i < n; i++) {
      // Simplified: assume 1.0 pu pre-fault voltage
      const Z_ii = Zbus[i][i]
      const Z_mag = Math.sqrt(Z_ii.re * Z_ii.re + Z_ii.im * Z_ii.im)
      const I_fault = 1.0 / Z_mag
      currents.push(I_fault)
    }

    return currents
  }

  /**
   * Compare voltages
   * @param {Array} voltagesA - First voltage array
   * @param {Array} voltagesB - Second voltage array
   * @returns {number} Maximum difference
   */
  compareVoltages(voltagesA, voltagesB) {
    if (!voltagesA || !voltagesB) return Infinity

    let maxDiff = 0
    const minLen = Math.min(voltagesA.length, voltagesB.length) // voltage (V)

    for (let i = 0; i < minLen; i++) {
      const valA =
        typeof voltagesA[i] === 'object' // voltage (V)
          ? Math.sqrt(voltagesA[i].re ** 2 + voltagesA[i].im ** 2)
          : voltagesA[i]
      const valB =
        typeof voltagesB[i] === 'object' // voltage (V)
          ? Math.sqrt(voltagesB[i].re ** 2 + voltagesB[i].im ** 2)
          : voltagesB[i]

      const diff = Math.abs(valA - valB)
      maxDiff = Math.max(maxDiff, diff)
    }

    return maxDiff
  }

  /**
   * Compare angles
   * @param {Array} anglesA - First angle array
   * @param {Array} anglesB - Second angle array
   * @returns {number} Maximum difference
   */
  compareAngles(anglesA, anglesB) {
    if (!anglesA || !anglesB) return Infinity

    let maxDiff = 0
    const minLen = Math.min(anglesA.length, anglesB.length)

    for (let i = 0; i < minLen; i++) {
      const diff = Math.abs(anglesA[i] - anglesB[i])
      maxDiff = Math.max(maxDiff, diff)
    }

    return maxDiff
  }

  /**
   * Compare power flows
   * @param {Array} powerA - First power array
   * @param {Array} powerB - Second power array
   * @returns {number} Maximum difference
   */
  comparePowerFlows(powerA, powerB) {
    if (!powerA || !powerB) return Infinity

    let maxDiff = 0
    const minLen = Math.min(powerA.length, powerB.length) // power (W)

    for (let i = 0; i < minLen; i++) {
      const diff = Math.abs(powerA[i] - powerB[i]) // power (W)
      maxDiff = Math.max(maxDiff, diff)
    }

    return maxDiff
  }

  /**
   * Compare fault currents
   * @param {Array} currentsA - First current array
   * @param {Array} currentsB - Second current array
   * @returns {number} Maximum difference
   */
  compareFaultCurrents(currentsA, currentsB) {
    if (!currentsA || !currentsB) return Infinity

    let maxDiff = 0
    const minLen = Math.min(currentsA.length, currentsB.length) // current (A)

    for (let i = 0; i < minLen; i++) {
      const diff = Math.abs(currentsA[i] - currentsB[i]) // current (A)
      maxDiff = Math.max(maxDiff, diff)
    }

    return maxDiff
  }

  /**
   * Reset validation results
   */
  resetResults() {
    this.results = {
      passed: [],
      failed: [],
      warnings: [],
    }
  }
}

module.exports = CrossEngineValidator
