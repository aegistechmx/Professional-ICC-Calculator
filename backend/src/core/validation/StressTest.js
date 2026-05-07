/**
 * core/validation/StressTest.js - Stress Testing for Power System Calculations
 *
 * Responsibility: Stress testing framework for power system solvers
 */

/**
 * Run stress tests on power system solvers
 * @param {Object} system - Power system model
 * @param {Object} options - Test options
 * @returns {Object} Stress test results
 */
function runStressTest(system, options = {}) {
  const {
    testTypes = ['voltage', 'current', 'impedance'],
    stressLevels = [0.1, 0.5, 1.0, 2.0, 5.0, 10.0],
    iterations = 100,
  } = options

  try {
    const results = {
      testSuite: 'StressTest',
      timestamp: new Date().toISOString(),
      system: {
        buses: system.buses?.length || 0,
        branches: system.branches?.length || 0,
      },
      tests: [],
    }

    // Run stress tests for each parameter
    for (const testType of testTypes) {
      for (const stressLevel of stressLevels) {
        const testResult = runSingleStressTest(
          system,
          testType,
          stressLevel,
          iterations
        )
        results.tests.push(testResult)
      }
    }

    // Calculate summary statistics
    results.summary = calculateStressSummary(results.tests)

    return results
  } catch (error) {
    throw new Error(`Stress test failed: ${error.message}`)
  }
}

/**
 * Run single stress test
 * @param {Object} system - Power system model
 * @param {string} testType - Type of stress test
 * @param {number} stressLevel - Stress level multiplier
 * @param {number} iterations - Number of iterations
 * @returns {Object} Test result
 */
function runSingleStressTest(system, testType, stressLevel, iterations) {
  const testSystem = createStressedSystem(system, testType, stressLevel)
  const results = {
    testType,
    stressLevel,
    iterations: [],
    convergence: [],
    performance: [],
    errors: [],
  }

  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now()

    try {
      // Run power flow calculation
      const result = calculatePowerFlow(testSystem)
      const endTime = performance.now()

      results.iterations.push({
        iteration: i + 1,
        converged: result.converged,
        iterations: result.iterations || 0,
        maxMismatch: result.maxMismatch || 0,
        time: endTime - startTime,
      })

      results.convergence.push(result.converged)
      results.performance.push(endTime - startTime)
    } catch (error) {
      results.errors.push({
        iteration: i + 1,
        error: error.message,
      })
    }
  }

  // Calculate test statistics
  results.stats = {
    convergenceRate: results.convergence.filter(c => c).length / iterations,
    avgTime:
      results.performance.reduce((a, b) => a + b, 0) /
      results.performance.length,
    maxTime: Math.max(...results.performance),
    minTime: Math.min(...results.performance),
    errorRate: results.errors.length / iterations,
  }

  return results
}

/**
 * Create stressed system for testing
 * @param {Object} system - Original power system
 * @param {string} testType - Type of stress
 * @param {number} stressLevel - Stress multiplier
 * @returns {Object} Stressed system
 */
function createStressedSystem(system, testType, stressLevel) {
  const stressedSystem = JSON.parse(JSON.stringify(system)) // Deep clone

  switch (testType) {
    case 'voltage':
      // Stress voltage levels
      stressedSystem.buses = stressedSystem.buses.map(bus => ({
        ...bus,
        voltage: (bus.voltage || 1.0) * stressLevel,
      }))
      break

    case 'current':
      // Stress current loads
      stressedSystem.buses = stressedSystem.buses.map(bus => ({
        ...bus,
        power: {
          P: (bus.power?.P || 0) * stressLevel,
          Q: (bus.power?.Q || 0) * stressLevel,
        },
      }))
      break

    case 'impedance':
      // Stress branch impedances
      stressedSystem.branches = stressedSystem.branches.map(branch => ({
        ...branch,
        resistance: (branch.resistance || 0.1) * stressLevel,
        reactance: (branch.reactance || 0.1) * stressLevel,
      }))
      break
  }

  return stressedSystem
}

/**
 * Calculate power flow (simplified)
 * @param {Object} system - Power system model
 * @returns {Object} Power flow result
 */
function calculatePowerFlow(system) {
  // Simplified power flow calculation for stress testing
  const iterations = 10
  const tolerance = 1e-6

  // Initialize voltages
  const n = system.buses?.length || 0
  const voltage = new Array(n).fill(1.0)
  const angle = new Array(n).fill(0.0)

  // Simple iterative solution
  for (let iter = 0; iter < iterations; iter++) {
    let maxMismatch = 0

    // Calculate power mismatches
    for (let i = 0; i < n; i++) {
      let P_calc = 0
      const _Q_calc = 0

      for (let j = 0; j < n; j++) {
        if (i !== j) {
          const V_diff = parseFloat((voltage[i] - voltage[j]).toFixed(6))
          P_calc += parseFloat((V_diff / 0.1).toFixed(6)) // Simplified impedance
        }
      }

      const P_scheduled = system.buses[i]?.power?.P || 0
      const mismatch = Math.abs(P_scheduled - P_calc)
      maxMismatch = Math.max(maxMismatch, mismatch)

      // Update voltage (simplified)
      voltage[i] += 0.01 * (P_scheduled - P_calc)
    }

    if (maxMismatch < tolerance) {
      return {
        converged: true,
        iterations: iter + 1,
        maxMismatch,
        voltages: voltage,
        angles: angle,
      }
    }
  }

  return {
    converged: false,
    iterations: iterations,
    maxMismatch,
    voltages: voltage,
    angles: angle,
  }
}

/**
 * Calculate stress test summary
 * @param {Array} tests - Array of test results
 * @returns {Object} Summary statistics
 */
function calculateStressSummary(tests) {
  const summary = {
    totalTests: tests.length,
    passedTests: 0,
    failedTests: 0,
    avgConvergenceRate: 0,
    avgPerformance: 0,
    criticalStressLevel: null,
  }

  // Calculate statistics
  let totalConvergenceRate = 0
  let totalPerformance = 0

  for (const test of tests) {
    if (test.stats.convergenceRate > 0.8) {
      summary.passedTests++
    } else {
      summary.failedTests++
    }

    totalConvergenceRate += test.stats.convergenceRate
    totalPerformance += test.stats.avgTime
  }

  summary.avgConvergenceRate = totalConvergenceRate / tests.length
  summary.avgPerformance = totalPerformance / tests.length

  // Find critical stress level
  const stressTests = tests.filter(t => t.testType === 'voltage')
  if (stressTests.length > 0) {
    const criticalTest = stressTests.find(t => t.stats.convergenceRate < 0.5)
    if (criticalTest) {
      summary.criticalStressLevel = criticalTest.stressLevel
    }
  }

  return summary
}

module.exports = {
  runStressTest,
}
