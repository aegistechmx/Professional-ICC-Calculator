/**
 * EdgeCasesTest - Edge Case Testing Module
 *
 * This module implements edge case testing for the simulation engine:
 * - Islanding scenarios
 * - Loss of generation
 * - Reconnection events
 * - Frequency deviation
 * - Voltage instability
 *
 * Architecture:
 * Test Generator → Edge Case Scenario → Simulation → Validation → Report
 *
 * @class EdgeCasesTest
 */

class EdgeCasesTest {
  /**
   * Create a new edge cases test
   * @param {Object} options - Test options
   */
  constructor(options = {}) {
    this.options = {
      ...options,
    }

    this.results = {
      islanding: null,
      lossOfGeneration: null,
      reconnection: null,
      overall: 'PASS',
    }
  }

  /**
   * Test islanding scenario
   * @param {Object} system - ElectricalSystem
   * @param {Object} engines - Simulation engines
   * @returns {Object} Islanding test results
   */
  testIslanding(system, engines) {
    try {
      // Create islanded system (disconnect from main grid)
      const islandedSystem = this.createIslandedSystem(system)

      // Run power flow on islanded system
      const pfResult = engines.powerFlow // power (W)
        ? engines.powerFlow.run(islandedSystem)
        : null

      // Check voltage stability
      const voltageStable = pfResult // voltage (V)
        ? pfResult.voltages.every(v => v > 0.85 && v < 1.15) // voltage (V)
        : false

      // Check frequency deviation (if dynamics available)
      let frequencyStable = true
      if (engines.dynamics) {
        const dynResult = engines.dynamics.run({ duration: 2.0 })
        frequencyStable = dynResult.stable
      }

      const result = {
        success: pfResult !== null,
        voltageStable,
        frequencyStable,
        overallStable: voltageStable && frequencyStable,
        powerFlowConverged: pfResult ? pfResult.converged : false,
      }

      this.results.islanding = result

      return result
    } catch (error) {
      this.results.islanding = {
        success: false,
        error: error.message,
      }

      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Create islanded system
   * @param {Object} system - Original system
   * @returns {Object} Islanded system
   */
  createIslandedSystem(system) {
    // Clone system
    const { ElectricalSystem } = require('../../core')
    const islanded = new ElectricalSystem()

    // Add buses (subset that will form the island)
    const islandBuses = system.buses.slice(0, Math.min(5, system.buses.length))
    islandBuses.forEach(bus => {
      const islandBus = { ...bus }

      // Convert first bus to slack (local generation)
      if (bus.id === islandBuses[0].id) {
        islandBus.type = 'Slack'
      }

      islanded.addBus(islandBus)
    })

    // Add lines connecting island buses
    system.lines.forEach(line => {
      const fromInIsland = islandBuses.some(b => b.id === line.from)
      const toInIsland = islandBuses.some(b => b.id === line.to)

      if (fromInIsland && toInIsland) {
        islanded.addLine(line)
      }
    })

    return islanded
  }

  /**
   * Test loss of generation scenario
   * @param {Object} system - ElectricalSystem
   * @param {Object} engines - Simulation engines
   * @returns {Object} Loss of generation test results
   */
  testLossOfGeneration(system, engines) {
    try {
      // Identify generators
      const generators = system.buses.filter(
        b => b.type === 'PV' || b.type === 'Slack'
      )

      if (generators.length === 0) {
        return {
          success: false,
          error: 'No generators found',
        }
      }

      // Remove one generator (simulate loss)
      const generatorToTrip = generators[generators.length - 1]
      generatorToTrip.type = 'PQ' // Convert to load bus
      generatorToTrip.generation = { P: 0, Q: 0 }

      // Run power flow after loss
      const pfResult = engines.powerFlow ? engines.powerFlow.run(system) : null // power (W)

      // Check voltage stability after loss
      const voltageStable = pfResult // voltage (V)
        ? pfResult.voltages.every(v => v > 0.9 && v < 1.1) // voltage (V)
        : false

      // Check if remaining generation can meet load
      const totalGeneration = system.buses.reduce(
        (sum, b) => sum + (b.generation.P || 0),
        0
      )
      const totalLoad = system.buses.reduce(
        (sum, b) => sum + (b.load.P || 0),
        0
      )
      const generationSufficient = totalGeneration >= totalLoad * 0.9 // Allow 10% margin

      const result = {
        success: pfResult !== null,
        voltageStable,
        generationSufficient,
        overallStable: voltageStable && generationSufficient,
        powerFlowConverged: pfResult ? pfResult.converged : false,
        totalGeneration,
        totalLoad,
      }

      this.results.lossOfGeneration = result

      return result
    } catch (error) {
      this.results.lossOfGeneration = {
        success: false,
        error: error.message,
      }

      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Test reconnection scenario
   * @param {Object} system - ElectricalSystem
   * @param {Object} engines - Simulation engines
   * @returns {Object} Reconnection test results
   */
  testReconnection(system, engines) {
    try {
      // Simulate line disconnection (open breaker)
      const lineToDisconnect = system.lines[0]
      if (!lineToDisconnect) {
        return {
          success: false,
          error: 'No lines to disconnect',
        }
      }

      // Remove line
      const removedLines = system.lines.filter(
        l => l.id !== lineToDisconnect.id
      )
      system.lines = removedLines

      // Run power flow after disconnection
      const pfResult1 = engines.powerFlow ? engines.powerFlow.run(system) : null // power (W)

      // Reconnect line
      system.lines.push(lineToDisconnect)

      // Run power flow after reconnection
      const pfResult2 = engines.powerFlow ? engines.powerFlow.run(system) : null // power (W)

      // Check stability during transition
      const voltageStable1 = pfResult1 // voltage (V)
        ? pfResult1.voltages.every(v => v > 0.85 && v < 1.15) // voltage (V)
        : false
      const voltageStable2 = pfResult2 // voltage (V)
        ? pfResult2.voltages.every(v => v > 0.95 && v < 1.05) // voltage (V)
        : false

      // Check if system recovered
      const recovered =
        voltageStable2 && (pfResult2 ? pfResult2.converged : false)

      const result = {
        success: pfResult2 !== null,
        voltageStableAfterDisconnect: voltageStable1,
        voltageStableAfterReconnect: voltageStable2,
        recovered,
        powerFlowConverged1: pfResult1 ? pfResult1.converged : false,
        powerFlowConverged2: pfResult2 ? pfResult2.converged : false,
      }

      this.results.reconnection = result

      return result
    } catch (error) {
      this.results.reconnection = {
        success: false,
        error: error.message,
      }

      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Run all edge case tests
   * @param {Object} system - ElectricalSystem
   * @param {Object} engines - Simulation engines
   * @returns {Object} Complete edge case test results
   */
  runAllEdgeCases(system, engines) {
    const results = {
      islanding: this.testIslanding(system, engines),
      lossOfGeneration: this.testLossOfGeneration(system, engines),
      reconnection: this.testReconnection(system, engines),
      overall: 'PASS',
    }

    // Determine overall status
    const failedTests = Object.values(results).filter(
      r => r.success === false || r.overallStable === false
    )
    results.overall = failedTests.length === 0 ? 'PASS' : 'FAIL'

    this.results = results

    return results
  }

  /**
   * Generate edge case test report
   * @param {Object} results - Edge case test results
   * @returns {Object} Formatted report
   */
  generateReport(results) {
    return {
      title: 'Edge Cases Test Report',
      timestamp: new Date().toISOString(),
      tests: results,
      overall: results.overall,
      recommendations: this.generateRecommendations(results),
    }
  }

  /**
   * Generate recommendations based on edge case results
   * @param {Object} results - Edge case test results
   * @returns {Array} Recommendations
   */
  generateRecommendations(results) {
    const recommendations = []

    // Check islanding
    if (results.islanding && !results.islanding.overallStable) {
      recommendations.push({
        type: 'islanding',
        severity: 'error',
        message: 'System unstable during islanding',
        suggestion:
          'Implement automatic load shedding and frequency control for islanded operation',
      })
    }

    // Check loss of generation
    if (
      results.lossOfGeneration &&
      !results.lossOfGeneration.generationSufficient
    ) {
      recommendations.push({
        type: 'generation',
        severity: 'warning',
        message: 'Insufficient generation after loss of generator',
        suggestion:
          'Implement spinning reserve requirements and automatic generation control',
      })
    }

    // Check reconnection
    if (results.reconnection && !results.reconnection.recovered) {
      recommendations.push({
        type: 'reconnection',
        severity: 'warning',
        message: 'System did not recover after reconnection',
        suggestion:
          'Implement synchronization checks and soft reconnection procedures',
      })
    }

    return recommendations
  }
}

module.exports = EdgeCasesTest
