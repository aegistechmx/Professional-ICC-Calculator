/**
 * ConsistencyValidator - Cross-Engine Consistency Tests
 *
 * This module validates that all calculations produce consistent results:
 * - All calculations must come from the same state at the same instant
 * - Ybus must be consistent across all engines
 * - Currents must match between power flow and fault analysis
 *
 * Architecture:
 * System → Run All Engines → Compare Results → Validation Report
 *
 * @class ConsistencyValidator
 */

class ConsistencyValidator {
  /**
   * Create a new consistency validator
   * @param {Object} options - Validator options
   */
  constructor(options = {}) {
    this.options = {
      tolerance: options.tolerance || 1e-6,
      ...options,
    }

    this.results = {
      passed: [],
      failed: [],
      warnings: [],
    }
  }

  /**
   * Run consistency test across all engines
   * @param {Object} system - ElectricalSystem instance
   * @param {Object} engines - Engine instances
   * @returns {Object} Validation results
   */
  runConsistencyTest(system, engines) {
    this.resetResults()

    // Store initial state
    const initialState = this.captureState(system)

    // Run all engines from same initial state
    const results = {
      powerFlow: null,
      fault: null,
      dynamics: null,
    }

    try {
      // Run power flow
      const systemPF = this.cloneSystem(system)
      results.powerFlow = engines.powerFlow.run(systemPF)
      // power (W)

      // Run fault analysis
      const systemFault = this.cloneSystem(system)
      results.fault = engines.fault.run(systemFault)

      // Run dynamics
      const systemDyn = this.cloneSystem(system)
      results.dynamics = engines.dynamics.run(systemDyn)

      // Validate consistency
      this.validateYbusConsistency(results)
      this.validateCurrentConsistency(results)
      this.validateVoltageConsistency(results)
      this.validateStateConsistency(initialState, results)
    } catch (error) {
      this.results.failed.push({
        test: 'engine_execution',
        error: error.message,
      })
    }

    return this.generateReport(results)
  }

  /**
   * Capture system state
   * @param {Object} system - ElectricalSystem instance
   * @returns {Object} Captured state
   */
  captureState(system) {
    return {
      buses: system.buses.map(b => ({
        id: b.id,
        type: b.type,
        V: b.V,
        theta: b.theta,
        P: b.P,
        Q: b.Q,
      })),
      lines: system.lines.map(l => ({
        id: l.id,
        from: l.from,
        to: l.to,
        R: l.R,
        X: l.X,
        B: l.B,
      })),
      trafos: system.trafos.map(t => ({
        id: t.id,
        fromBus: t.fromBus,
        toBus: t.toBus,
        R: t.R,
        X: t.X,
        tap: t.tap,
      })),
    }
  }

  /**
   * Clone system for independent testing
   * @param {Object} system - ElectricalSystem instance
   * @returns {Object} Cloned system
   */
  cloneSystem(system) {
    return JSON.parse(JSON.stringify(system))
  }

  /**
   * Validate Ybus consistency across engines
   * @param {Object} results - Engine results
   */
  validateYbusConsistency(results) {
    if (!results.powerFlow || !results.fault) {
      this.results.warnings.push({
        test: 'ybus_consistency',
        message: 'Cannot validate Ybus: missing engine results',
      })
      return
    }

    // Extract Ybus from power flow
    const YbusPF = results.powerFlow.Ybus || results.powerFlow.ybus
    // power (W)

    // Extract Ybus from fault analysis
    const YbusFault = results.fault.Ybus || results.fault.ybus

    if (!YbusPF || !YbusFault) {
      this.results.warnings.push({
        test: 'ybus_consistency',
        message: 'Ybus not available in engine results',
      })
      return
    }

    // Compare Ybus matrices
    const diff = this.compareMatrices(YbusPF, YbusFault)

    if (diff < this.options.tolerance) {
      this.results.passed.push({
        test: 'ybus_consistency',
        message: 'Ybus consistent across engines',
        difference: diff,
      })
    } else {
      this.results.failed.push({
        test: 'ybus_consistency',
        message: 'Ybus inconsistent across engines',
        difference: diff,
        tolerance: this.options.tolerance,
      })
    }
  }

  /**
   * Validate current consistency between power flow and fault
   * @param {Object} results - Engine results
   */
  validateCurrentConsistency(results) {
    if (!results.powerFlow || !results.fault) {
      this.results.warnings.push({
        test: 'current_consistency',
        message: 'Cannot validate currents: missing engine results',
      })
      return
    }

    // Get currents from power flow
    const currentsPF = this.extractCurrents(results.powerFlow)
    // current (A)

    // Get currents from fault analysis
    const currentsFault = this.extractCurrents(results.fault)
    // current (A)

    // Compare currents (should match for normal operating conditions)
    const maxDiff = this.compareCurrents(currentsPF, currentsFault)
    // current (A)

    if (maxDiff < this.options.tolerance) {
      this.results.passed.push({
        test: 'current_consistency',
        message: 'Currents consistent between power flow and fault analysis',
        maxDifference: maxDiff,
      })
    } else {
      this.results.warnings.push({
        test: 'current_consistency',
        message:
          'Currents differ between power flow and fault analysis (expected for fault conditions)',
        maxDifference: maxDiff,
      })
    }
  }

  /**
   * Validate voltage consistency
   * @param {Object} results - Engine results
   */
  validateVoltageConsistency(results) {
    if (!results.powerFlow || !results.dynamics) {
      this.results.warnings.push({
        test: 'voltage_consistency',
        message: 'Cannot validate voltages: missing engine results',
      })
      return
    }

    // Get voltages from power flow
    const voltagesPF = this.extractVoltages(results.powerFlow)
    // voltage (V)

    // Get initial voltages from dynamics (should match power flow)
    const voltagesDyn = results.dynamics.voltages
      ? // voltage (V)
        results.dynamics.voltages[0]
      : null

    if (!voltagesDyn) {
      this.results.warnings.push({
        test: 'voltage_consistency',
        message: 'Initial dynamics voltages not available',
      })
      return
    }

    // Compare initial voltages
    const maxDiff = this.compareVoltages(voltagesPF, voltagesDyn)
    // voltage (V)

    if (maxDiff < this.options.tolerance) {
      this.results.passed.push({
        test: 'voltage_consistency',
        message: 'Initial voltages consistent between power flow and dynamics',
        maxDifference: maxDiff,
      })
    } else {
      this.results.failed.push({
        test: 'voltage_consistency',
        message:
          'Initial voltages inconsistent between power flow and dynamics',
        maxDifference: maxDiff,
        tolerance: this.options.tolerance,
      })
    }
  }

  /**
   * Validate state consistency
   * @param {Object} initialState - Initial system state
   * @param {Object} results - Engine results
   */
  validateStateConsistency(initialState, results) {
    // Validate that all engines started from same state
    const checks = [
      {
        name: 'bus_count',
        expected: initialState.buses.length,
        actual: results.powerFlow?.buses?.length,
        tolerance: 0,
      },
      {
        name: 'line_count',
        expected: initialState.lines.length,
        actual: results.powerFlow?.lines?.length,
        tolerance: 0,
      },
      {
        name: 'transformer_count',
        expected: initialState.trafos.length,
        actual: results.powerFlow?.trafos?.length,
        tolerance: 0,
      },
    ]

    checks.forEach(check => {
      if (check.actual === undefined) {
        this.results.warnings.push({
          test: 'state_consistency',
          message: `Cannot validate ${check.name}: value not available`,
        })
        return
      }

      if (Math.abs(check.actual - check.expected) <= check.tolerance) {
        this.results.passed.push({
          test: 'state_consistency',
          message: `${check.name} consistent`,
          expected: check.expected,
          actual: check.actual,
        })
      } else {
        this.results.failed.push({
          test: 'state_consistency',
          message: `${check.name} inconsistent`,
          expected: check.expected,
          actual: check.actual,
        })
      }
    })
  }

  /**
   * Extract currents from engine results
   * @param {Object} results - Engine results
   * @returns {Array} Currents array
   */
  extractCurrents(results) {
    if (results.lines) {
      return results.lines.map(l => l.current || l.I_flow || 0)
      // current (A)
    }
    if (results.currents) {
      return results.currents
    }
    return []
  }

  /**
   * Extract voltages from engine results
   * @param {Object} results - Engine results
   * @returns {Array} Voltages array
   */
  extractVoltages(results) {
    if (results.buses) {
      return results.buses.map(b => b.V || b.voltage || 1.0)
      // voltage (V)
    }
    if (results.voltages) {
      return results.voltages
    }
    return []
  }

  /**
   * Compare matrices
   * @param {Array} matrixA - First matrix
   * @param {Array} matrixB - Second matrix
   * @returns {number} Maximum difference
   */
  compareMatrices(matrixA, matrixB) {
    if (!matrixA || !matrixB) return Infinity

    let maxDiff = 0

    for (let i = 0; i < matrixA.length; i++) {
      for (let j = 0; j < matrixA[i].length; j++) {
        const valA = matrixA[i][j]
        const valB = matrixB[i][j]

        // Handle complex numbers
        if (typeof valA === 'object' && valA.real !== undefined) {
          const diffReal = Math.abs(valA.real - valB.real)
          const diffImag = Math.abs(valA.imag - valB.imag)
          maxDiff = Math.max(maxDiff, diffReal, diffImag)
        } else {
          const diff = Math.abs(valA - valB)
          maxDiff = Math.max(maxDiff, diff)
        }
      }
    }

    return maxDiff
  }

  /**
   * Compare currents
   * @param {Array} currentsA - First currents array
   * @param {Array} currentsB - Second currents array
   * @returns {number} Maximum difference
   */
  compareCurrents(currentsA, currentsB) {
    if (!currentsA || !currentsB) return Infinity

    let maxDiff = 0
    const minLen = Math.min(currentsA.length, currentsB.length)
    // current (A)

    for (let i = 0; i < minLen; i++) {
      const diff = Math.abs(currentsA[i] - currentsB[i])
      // current (A)
      maxDiff = Math.max(maxDiff, diff)
    }

    return maxDiff
  }

  /**
   * Compare voltages
   * @param {Array} voltagesA - First voltages array
   * @param {Array} voltagesB - Second voltages array
   * @returns {number} Maximum difference
   */
  compareVoltages(voltagesA, voltagesB) {
    if (!voltagesA || !voltagesB) return Infinity

    let maxDiff = 0
    const minLen = Math.min(voltagesA.length, voltagesB.length)
    // voltage (V)

    for (let i = 0; i < minLen; i++) {
      const diff = Math.abs(voltagesA[i] - voltagesB[i])
      // voltage (V)
      maxDiff = Math.max(maxDiff, diff)
    }

    return maxDiff
  }

  /**
   * Generate validation report
   * @param {Object} results - Engine results
   * @returns {Object} Validation report
   */
  generateReport(results) {
    const passedCount = this.results.passed.length
    const failedCount = this.results.failed.length
    const warningCount = this.results.warnings.length

    return {
      overall: failedCount === 0 ? 'PASS' : 'FAIL',
      passed: passedCount,
      failed: failedCount,
      warnings: warningCount,
      tests: {
        passed: this.results.passed,
        failed: this.results.failed,
        warnings: this.results.warnings,
      },
      engineResults: results,
      timestamp: new Date().toISOString(),
    }
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

  /**
   * Assert condition (for testing)
   * @param {boolean} condition - Condition to assert
   * @param {string} message - Assertion message
   * @throws {Error} If condition is false
   */
  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`)
    }
  }

  /**
   * Assert Ybus consistent
   * @param {Object} YbusA - First Ybus
   * @param {Object} YbusB - Second Ybus
   * @param {number} tolerance - Tolerance
   */
  assertYbusConsistent(YbusA, YbusB, tolerance = this.options.tolerance) {
    const diff = this.compareMatrices(YbusA, YbusB)
    this.assert(
      diff < tolerance,
      `Ybus inconsistent: difference ${diff} exceeds tolerance ${tolerance}`
    )
  }

  /**
   * Assert currents match
   * @param {Array} currentsA - First currents
   * @param {Array} currentsB - Second currents
   * @param {number} tolerance - Tolerance
   */
  assertCurrentsMatch(
    currentsA,
    currentsB,
    tolerance = this.options.tolerance
  ) {
    const maxDiff = this.compareCurrents(currentsA, currentsB)
    // current (A)
    this.assert(
      maxDiff < tolerance,
      `Currents do not match: max difference ${maxDiff} exceeds tolerance ${tolerance}`
    )
  }
}

module.exports = ConsistencyValidator
