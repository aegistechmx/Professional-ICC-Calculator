/**
 * core/validation/EdgeCasesTest.js - Edge Cases Testing for Power System Calculations
 *
 * Responsibility: Test edge cases and boundary conditions
 */

/**
 * Test edge cases for power system calculations
 * @param {Object} system - Power system model
 * @param {Object} options - Test options
 * @returns {Object} Edge case test results
 */
function runEdgeCasesTest(system, options = {}) {
  const {
    testTypes = ['zero', 'infinite', 'negative', 'boundary'],
    parameters = ['voltage', 'current', 'impedance', 'power'],
  } = options

  try {
    const results = {
      testSuite: 'EdgeCasesTest',
      timestamp: new Date().toISOString(),
      tests: [],
    }

    // Run edge case tests
    for (const testType of testTypes) {
      for (const param of parameters) {
        const testResult = runEdgeCaseTest(system, testType, param)
        results.tests.push(testResult)
      }
    }

    // Calculate summary statistics
    results.summary = calculateEdgeCaseSummary(results.tests)

    return results
  } catch (error) {
    throw new Error(`Edge case test failed: ${error.message}`)
  }
}

/**
 * Run single edge case test
 * @param {Object} system - Power system model
 * @param {string} testType - Type of edge case
 * @param {string} param - Parameter to test
 * @returns {Object} Test result
 */
function runEdgeCaseTest(system, testType, param) {
  const testSystem = createEdgeCaseSystem(system, testType, param)
  const result = {
    testName: `${testType}_${param}`,
    testType,
    parameter: param,
    system: testSystem,
    result: null,
    error: null,
    passed: false,
  }

  try {
    // Run power flow calculation
    const powerFlowResult = calculatePowerFlow(testSystem)
    result.result = powerFlowResult

    // Evaluate test result
    result.passed = evaluateEdgeCaseResult(testType, param, powerFlowResult)
  } catch (error) {
    result.error = error.message
    result.passed = false
  }

  return result
}

/**
 * Create edge case system for testing
 * @param {Object} system - Original power system
 * @param {string} testType - Type of edge case
 * @param {string} param - Parameter to modify
 * @returns {Object} Modified system
 */
function createEdgeCaseSystem(system, testType, param) {
  const testSystem = JSON.parse(JSON.stringify(system)) // Deep clone

  switch (testType) {
    case 'zero':
      return createZeroValueSystem(testSystem, param)
    case 'infinite':
      return createInfiniteValueSystem(testSystem, param)
    case 'negative':
      return createNegativeValueSystem(testSystem, param)
    case 'boundary':
      return createBoundaryValueSystem(testSystem, param)
    default:
      return testSystem
  }
}

/**
 * Create system with zero values
 * @param {Object} system - Original system
 * @param {string} param - Parameter to set to zero
 * @returns {Object} Modified system
 */
function createZeroValueSystem(system, param) {
  const testSystem = JSON.parse(JSON.stringify(system))

  switch (param) {
    case 'voltage':
      if (testSystem.buses) {
        testSystem.buses.forEach(bus => {
          bus.voltage = 0
        })
      }
      break
    case 'current':
      if (testSystem.buses) {
        testSystem.buses.forEach(bus => {
          if (bus.power) {
            bus.power.P = 0
            bus.power.Q = 0
          }
        })
      }
      break
    case 'impedance':
      if (testSystem.branches) {
        testSystem.branches.forEach(branch => {
          branch.resistance = 0
          branch.reactance = 0
        })
      }
      break
    case 'power':
      if (testSystem.buses) {
        testSystem.buses.forEach(bus => {
          if (bus.power) {
            bus.power.P = 0
            bus.power.Q = 0
          }
        })
      }
      break
  }

  return testSystem
}

/**
 * Create system with infinite values
 * @param {Object} system - Original system
 * @param {string} param - Parameter to set to infinite
 * @returns {Object} Modified system
 */
function createInfiniteValueSystem(system, param) {
  const testSystem = JSON.parse(JSON.stringify(system))

  switch (param) {
    case 'voltage':
      if (testSystem.buses) {
        testSystem.buses.forEach(bus => {
          bus.voltage = Infinity
        })
      }
      break
    case 'current':
      if (testSystem.buses) {
        testSystem.buses.forEach(bus => {
          if (bus.power) {
            bus.power.P = Infinity
            bus.power.Q = Infinity
          }
        })
      }
      break
    case 'impedance':
      if (testSystem.branches) {
        testSystem.branches.forEach(branch => {
          branch.resistance = Infinity
          branch.reactance = Infinity
        })
      }
      break
    case 'power':
      if (testSystem.buses) {
        testSystem.buses.forEach(bus => {
          if (bus.power) {
            bus.power.P = Infinity
            bus.power.Q = Infinity
          }
        })
      }
      break
  }

  return testSystem
}

/**
 * Create system with negative values
 * @param {Object} system - Original system
 * @param {string} param - Parameter to make negative
 * @returns {Object} Modified system
 */
function createNegativeValueSystem(system, param) {
  const testSystem = JSON.parse(JSON.stringify(system))

  switch (param) {
    case 'voltage':
      if (testSystem.buses) {
        testSystem.buses.forEach(bus => {
          bus.voltage = -1.0
        })
      }
      break
    case 'current':
      if (testSystem.buses) {
        testSystem.buses.forEach(bus => {
          if (bus.power) {
            bus.power.P = -100
            bus.power.Q = -50
          }
        })
      }
      break
    case 'impedance':
      if (testSystem.branches) {
        testSystem.branches.forEach(branch => {
          branch.resistance = -0.1
          branch.reactance = -0.05
        })
      }
      break
    case 'power':
      if (testSystem.buses) {
        testSystem.buses.forEach(bus => {
          if (bus.power) {
            bus.power.P = -1000
            bus.power.Q = -500
          }
        })
      }
      break
  }

  return testSystem
}

/**
 * Create system with boundary values
 * @param {Object} system - Original system
 * @param {string} param - Parameter to set to boundary
 * @returns {Object} Modified system
 */
function createBoundaryValueSystem(system, param) {
  const testSystem = JSON.parse(JSON.stringify(system))

  switch (param) {
    case 'voltage':
      if (testSystem.buses) {
        testSystem.buses.forEach(bus => {
          bus.voltage = 0.001 // Very low voltage
        })
      }
      break
    case 'current':
      if (testSystem.buses) {
        testSystem.buses.forEach(bus => {
          if (bus.power) {
            bus.power.P = 0.001 // Very low power
            bus.power.Q = 0.001
          }
        })
      }
      break
    case 'impedance':
      if (testSystem.branches) {
        testSystem.branches.forEach(branch => {
          branch.resistance = 1e-6 // Very low resistance
          branch.reactance = 1e-6 // Very low reactance
        })
      }
      break
    case 'power':
      if (testSystem.buses) {
        testSystem.buses.forEach(bus => {
          if (bus.power) {
            bus.power.P = 1e6 // Very high power
            bus.power.Q = 1e6
          }
        })
      }
      break
  }

  return testSystem
}

/**
 * Evaluate edge case test result
 * @param {string} testType - Type of edge case
 * @param {string} param - Parameter tested
 * @param {Object} result - Power flow result
 * @returns {boolean} Test passed
 */
function evaluateEdgeCaseResult(testType, param, result) {
  switch (testType) {
    case 'zero':
      // Zero values should either converge gracefully or fail gracefully
      return result.converged !== false || result.error !== undefined
    case 'infinite':
      // Infinite values should be handled without crashing
      return !isNaN(result.maxMismatch) && isFinite(result.maxMismatch)
    case 'negative':
      // Negative values should be rejected or handled appropriately
      return result.error !== undefined || result.converged === false
    case 'boundary':
      // Boundary values should converge
      return result.converged === true
    default:
      return false
  }
}

/**
 * Calculate edge case test summary
 * @param {Array} tests - Array of test results
 * @returns {Object} Summary statistics
 */
function calculateEdgeCaseSummary(tests) {
  const summary = {
    totalTests: tests.length,
    passedTests: 0,
    failedTests: 0,
    testTypeResults: {},
  }

  // Count passed/failed tests
  for (const test of tests) {
    if (test.passed) {
      summary.passedTests++
    } else {
      summary.failedTests++
    }

    // Group by test type
    if (!summary.testTypeResults[test.testType]) {
      summary.testTypeResults[test.testType] = {
        total: 0,
        passed: 0,
        failed: 0,
      }
    }

    summary.testTypeResults[test.testType].total++
    if (test.passed) {
      summary.testTypeResults[test.testType].passed++
    } else {
      summary.testTypeResults[test.testType].failed++
    }
  }

  // Calculate pass rates
  summary.passRate = summary.passedTests / summary.totalTests
  summary.testTypePassRates = {}

  for (const testType in summary.testTypeResults) {
    const results = summary.testTypeResults[testType]
    summary.testTypePassRates[testType] = results.passed / results.total
  }

  return summary
}

/**
 * Simplified power flow calculation for edge case testing
 * @param {Object} system - Power system model
 * @returns {Object} Power flow result
 */
function calculatePowerFlow(system) {
  // Very simplified power flow for edge case testing
  const n = system.buses?.length || 0

  if (n === 0) {
    return { converged: false, error: 'No buses in system' }
  }

  const voltage = new Array(n).fill(parseFloat((1.0).toFixed(6)))
  const angle = new Array(n).fill(parseFloat((0.0).toFixed(6)))

  // Check for invalid values
  for (let i = 0; i < n; i++) {
    const bus = system.buses[i]

    if (!isFinite(bus.voltage) || bus.voltage <= 0) {
      return {
        converged: false,
        error: `Invalid voltage at bus ${i}: ${bus.voltage}`,
        maxMismatch: Infinity,
      }
    }

    voltage[i] = bus.voltage || 1.0
  }

  // Simple iteration
  let maxMismatch = Infinity
  for (let iter = 0; iter < 10; iter++) {
    let totalMismatch = 0

    for (let i = 0; i < n; i++) {
      let mismatch = 0
      const bus = system.buses[i]

      if (bus.power) {
        // Simplified mismatch calculation
        mismatch = Math.abs(bus.power.P - voltage[i])
      }

      totalMismatch += mismatch
    }

    maxMismatch = Math.max(maxMismatch, totalMismatch)

    if (totalMismatch < 1e-6) {
      return {
        converged: true,
        iterations: iter + 1,
        maxMismatch: totalMismatch,
        voltages: voltage,
        angles: angle,
      }
    }

    // Simple update
    for (let i = 0; i < n; i++) {
      const bus = system.buses[i]
      if (bus.power) {
        voltage[i] += 0.01 * (bus.power.P - voltage[i])
      }
    }
  }

  return {
    converged: false,
    iterations: 10,
    maxMismatch,
    voltages: voltage,
    angles: angle,
  }
}

module.exports = {
  runEdgeCasesTest,
}
