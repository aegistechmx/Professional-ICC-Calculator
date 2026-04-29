/**
 * Engineer Mode Utilities
 * Provides detailed engineering information for simulation analysis
 */

/**
 * Calculate power mismatch for each bus
 * @param {Object} powerFlowResults - Power flow results
 * @returns {Object} Mismatch data
 */
export function calculateMismatches(powerFlowResults) {
  const mismatches = []

  powerFlowResults.buses.forEach((bus, i) => {
    const P_calc = powerFlowResults.P[i]
    const Q_calc = powerFlowResults.Q[i]
    const P_spec = bus.P || 0
    const Q_spec = bus.Q || 0

    const P_mismatch = P_calc - P_spec
    const Q_mismatch = Q_calc - Q_spec
    const totalMismatch = Math.sqrt(
      P_mismatch * P_mismatch + Q_mismatch * Q_mismatch
    )

    mismatches.push({
      busId: bus.id,
      P_mismatch,
      Q_mismatch,
      totalMismatch,
      converged: totalMismatch < 0.01,
    })
  })

  return mismatches
}

/**
 * Get NR solver statistics
 * @param {Object} solverResult - Solver result
 * @returns {Object} Solver statistics
 */
export function getSolverStats(solverResult) {
  return {
    iterations: solverResult.iterations,
    converged: solverResult.converged,
    finalTolerance: solverResult.tolerance,
    maxMismatch: solverResult.maxMismatch || 0,
    convergenceRate: calculateConvergenceRate(solverResult.iterations),
  }
}

/**
 * Calculate convergence rate (iterations per tolerance order)
 * @param {number} iterations - Number of iterations
 * @returns {string} Convergence rate description
 */
function calculateConvergenceRate(iterations) {
  if (iterations <= 3) return 'fast'
  if (iterations <= 6) return 'normal'
  if (iterations <= 10) return 'slow'
  return 'very slow'
}

/**
 * Get voltage profile data
 * @param {Object} powerFlowResults - Power flow results
 * @returns {Object} Voltage profile
 */
export function getVoltageProfile(powerFlowResults) {
  const profile = []

  powerFlowResults.buses.forEach((bus, i) => {
    profile.push({
      busId: bus.id,
      voltage: powerFlowResults.V[i],
      angle: powerFlowResults.theta[i],
      status: getVoltageStatus(powerFlowResults.V[i]),
      deviation: (powerFlowResults.V[i] - 1.0) * 100, // % deviation from nominal
    })
  })

  return profile
}

/**
 * Get voltage status
 * @param {number} voltage - Voltage magnitude in pu
 * @returns {string} Status
 */
function getVoltageStatus(voltage) {
  if (voltage < 0.95) return 'low'
  if (voltage > 1.05) return 'high'
  return 'normal'
}

/**
 * Get line loading data
 * @param {Object} powerFlowResults - Power flow results
 * @param {Array} lines - Line data
 * @returns {Object} Line loading
 */
export function getLineLoading(powerFlowResults, lines) {
  const loading = []

  lines.forEach(line => {
    const limit = line.thermalLimit || 100
    const flow = line.current || 0
    const loadingPercent = (flow / limit) * 100

    loading.push({
      lineId: line.id,
      fromBus: line.fromBus,
      toBus: line.toBus,
      flow: flow,
      limit: limit,
      loadingPercent: loadingPercent,
      status: getLoadingStatus(loadingPercent),
    })
  })

  return loading
}

/**
 * Get loading status
 * @param {number} percent - Loading percentage
 * @returns {string} Status
 */
function getLoadingStatus(percent) {
  if (percent > 100) return 'overloaded'
  if (percent > 90) return 'critical'
  if (percent > 70) return 'high'
  return 'normal'
}

/**
 * Generate engineer mode dashboard data
 * @param {Object} simulationData - Complete simulation data
 * @returns {Object} Dashboard data
 */
export function generateEngineerDashboard(simulationData) {
  const mismatches = calculateMismatches(simulationData.powerFlow)
  const solverStats = getSolverStats(simulationData.powerFlow)
  const voltageProfile = getVoltageProfile(simulationData.powerFlow)
  const lineLoading = getLineLoading(
    simulationData.powerFlow,
    simulationData.lines
  )

  return {
    solver: solverStats,
    mismatches: mismatches,
    voltageProfile: voltageProfile,
    lineLoading: lineLoading,
    summary: {
      totalBuses: simulationData.powerFlow.buses.length,
      convergedBuses: mismatches.filter(m => m.converged).length,
      overloadedLines: lineLoading.filter(l => l.status === 'overloaded')
        .length,
      voltageViolations: voltageProfile.filter(v => v.status !== 'normal')
        .length,
    },
  }
}

/**
 * Format mismatch for display
 * @param {number} value - Mismatch value
 * @returns {string} Formatted string
 */
export function formatMismatch(value) {
  if (Math.abs(value) < 0.001) return '0'
  return value.toFixed(4)
}

/**
 * Get convergence color
 * @param {boolean} converged - Convergence status
 * @returns {string} Hex color
 */
export function getConvergenceColor(converged) {
  return converged ? '#00cc00' : '#ff0000'
}

/**
 * Get loading color
 * @param {string} status - Loading status
 * @returns {string} Hex color
 */
export function getLoadingColor(status) {
  const colors = {
    normal: '#00cc00',
    high: '#ffcc00',
    critical: '#ff6600',
    overloaded: '#ff0000',
  }
  return colors[status] || '#999999'
}
