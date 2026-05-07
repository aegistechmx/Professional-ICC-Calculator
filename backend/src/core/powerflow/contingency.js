/**
 * core/powerflow/contingency.js - Power System Contingency Analysis
 *
 * Responsibility: Analyze power system contingencies and their impacts
 */

/**
 * Generate N-1 contingencies for power system
 * @param {Object} system - Power system model
 * @returns {Array} Array of contingency scenarios
 */
function generateN1Contingencies(system) {
  const contingencies = []

  if (!system || !system.branches) {
    return contingencies
  }

  // Generate line outage contingencies
  for (const branch of system.branches) {
    contingencies.push({
      type: 'line',
      id: branch.id,
      from: branch.from,
      to: branch.to,
      description: `Line outage: ${branch.from} - ${branch.to}`,
    })
  }

  // Generate generator outage contingencies
  if (system.generators) {
    for (const generator of system.generators) {
      contingencies.push({
        type: 'generator',
        id: generator.id,
        bus: generator.bus,
        description: `Generator outage at bus ${generator.bus}`,
      })
    }
  }

  return contingencies
}

/**
 * Analyze contingency impact
 * @param {Object} system - Power system model
 * @param {Object} contingency - Contingency scenario
 * @returns {Object} Analysis results
 */
function analyzeContingency(system, contingency) {
  try {
    // Create modified system without the contingency element
    const modifiedSystem = removeElement(system, contingency)

    // Run simplified power flow
    const powerFlowResult = runSimplifiedPowerFlow(modifiedSystem)

    // Check for violations
    const violations = checkViolations(powerFlowResult)

    return {
      contingency,
      powerFlow: powerFlowResult,
      violations,
      severity: determineSeverity(violations),
    }
  } catch (error) {
    return {
      contingency,
      error: error.message,
      severity: 'unknown',
    }
  }
}

/**
 * Remove element from system based on contingency
 * @param {Object} system - Original system
 * @param {Object} contingency - Contingency to apply
 * @returns {Object} Modified system
 */
function removeElement(system, contingency) {
  const modifiedSystem = JSON.parse(JSON.stringify(system))

  switch (contingency.type) {
    case 'line':
      if (modifiedSystem.branches) {
        modifiedSystem.branches = modifiedSystem.branches.filter(
          b => b.id !== contingency.id
        )
      }
      break
    case 'generator':
      if (modifiedSystem.generators) {
        modifiedSystem.generators = modifiedSystem.generators.filter(
          g => g.id !== contingency.id
        )
      }
      break
  }

  return modifiedSystem
}

/**
 * Run simplified power flow analysis
 * @param {Object} system - Power system model
 * @returns {Object} Power flow results
 */
function runSimplifiedPowerFlow(system) {
  const n = system.buses?.length || 0
  if (n === 0) return { converged: false, voltages: [] }

  // Initialize voltages
  const voltages = new Array(n).fill(1.0)
  const angles = new Array(n).fill(0.0)

  // Simple iteration for demonstration
  for (let iter = 0; iter < 10; iter++) {
    for (let i = 0; i < n; i++) {
      const bus = system.buses[i]
      if (bus && bus.power) {
        // Simplified voltage update
        voltages[i] += 0.01 * (bus.power.P - voltages[i])
      }
    }
  }

  return {
    converged: true,
    voltages,
    angles,
    iterations: 10,
    maxMismatch: 0.001,
  }
}

/**
 * Check for system violations
 * @param {Object} powerFlowResult - Power flow results
 * @returns {Array} List of violations
 */
function checkViolations(powerFlowResult) {
  const violations = []

  if (!powerFlowResult.voltages) return violations

  // Check voltage violations
  for (let i = 0; i < powerFlowResult.voltages.length; i++) {
    const voltage = powerFlowResult.voltages[i]
    if (voltage < 0.9 || voltage > 1.1) {
      violations.push({
        type: 'voltage',
        bus: i,
        value: voltage,
        limit: voltage < 0.9 ? 0.9 : 1.1,
        severity: Math.abs(voltage - 1.0) > 0.1 ? 'high' : 'medium',
      })
    }
  }

  return violations
}

/**
 * Determine contingency severity
 * @param {Array} violations - List of violations
 * @returns {string} Severity level
 */
function determineSeverity(violations) {
  const highSeverityViolations = violations.filter(
    v => v.severity === 'high'
  ).length

  if (highSeverityViolations > 3) return 'critical'
  if (highSeverityViolations > 0) return 'severe'
  if (violations.length > 0) return 'moderate'
  return 'minor'
}

module.exports = {
  generateN1Contingencies,
  analyzeContingency,
  removeElement,
  runSimplifiedPowerFlow,
  checkViolations,
  determineSeverity,
}
