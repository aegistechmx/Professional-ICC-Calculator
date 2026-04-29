/**
 * evaluator.js - Contingency result evaluator
 *
 * Responsibility: Analyze contingency results and detect violations
 * NO Express, NO axios, NO UI logic
 */

/**
 * Calculate branch flows from power flow results
 * @param {Object} result - Power flow result
 * @param {Object} model - System model
 * @returns {Array} Array of branch flows
 */
function calculateFlows(result, model) {
  const flows = []
  const { voltages } = result

  model.branches.forEach(branch => {
    const Vfrom = voltages[branch.from]
    const Vto = voltages[branch.to]

    const VfromMag = Math.sqrt(Vfrom.re * Vfrom.re + Vfrom.im * Vfrom.im)
    const VtoMag = Math.sqrt(Vto.re * Vto.im + Vto.im * Vto.im)
    const thetaFrom = Math.atan2(Vfrom.im, Vfrom.re)
    const thetaTo = Math.atan2(Vto.im, Vto.re)
    const theta = thetaFrom - thetaTo

    // Simplified flow calculation (I = (Vfrom - Vto) / Z)
    const Z = Math.sqrt(branch.R * branch.R + branch.X * branch.X)
    const VdiffMag = Math.sqrt(
      Math.pow(VfromMag * Math.cos(thetaFrom) - VtoMag * Math.cos(thetaTo), 2) +
        Math.pow(VfromMag * Math.sin(thetaFrom) - VtoMag * Math.sin(thetaTo), 2)
    )

    const I = VdiffMag / Z
    const S = VfromMag * I // Approximate MVA flow

    flows.push({
      id: branch.id,
      from: branch.from,
      to: branch.to,
      flow: S,
      current: I,
    })
  })

  return flows
}

/**
 * Evaluate violations in contingency results
 * @param {Object} result - Power flow result
 * @param {Object} model - System model
 * @param {Object} limits - Voltage and loading limits
 * @returns {Object} Violation analysis
 */
function evaluateViolations(result, model, limits = {}) {
  const { Vmin = 0.95, Vmax = 1.05, loadingLimit = 1.0 } = limits

  const violations = {
    voltage: [],
    overload: [],
    critical: false,
    marginal: false,
  }

  // Voltage violations
  result.voltages.forEach((v, i) => {
    const magnitude = Math.sqrt(v.re * v.re + v.im * v.im)

    if (magnitude < Vmin * 0.9 || magnitude > Vmax * 1.1) {
      violations.voltage.push({
        bus: i,
        magnitude,
        type:
          magnitude < Vmin * 0.9
            ? 'critical_undervoltage'
            : 'critical_overvoltage',
      })
      violations.critical = true
    } else if (magnitude < Vmin || magnitude > Vmax) {
      violations.voltage.push({
        bus: i,
        magnitude,
        type: magnitude < Vmin ? 'undervoltage' : 'overvoltage',
      })
      violations.marginal = true
    }
  })

  // Overload violations
  const flows = calculateFlows(result, model)
  flows.forEach(flow => {
    const branch = model.branches.find(b => b.id === flow.id)
    if (branch && branch.limit) {
      const loading = flow.flow / branch.limit

      if (loading > loadingLimit * 1.2) {
        violations.overload.push({
          element: flow.id,
          loading,
          type: 'critical_overload',
        })
        violations.critical = true
      } else if (loading > loadingLimit) {
        violations.overload.push({
          element: flow.id,
          loading,
          type: 'overload',
        })
        violations.marginal = true
      }
    }
  })

  return violations
}

/**
 * Rank contingencies by severity
 * @param {Array} results - Contingency results
 * @returns {Array} Ranked results
 */
function rankContingencies(results) {
  return results
    .map(r => {
      const violationCount =
        (r.violations?.voltage?.length || 0) +
        (r.violations?.overload?.length || 0)

      const severity =
        (r.status !== 'ok' ? 100 : 0) +
        (r.violations?.critical ? 50 : 0) +
        (r.violations?.marginal ? 20 : 0) +
        violationCount * 10

      return { ...r, severity, violationCount }
    })
    .sort((a, b) => b.severity - a.severity)
}

/**
 * Get security index
 * @param {Array} results - Contingency results
 * @returns {number} Security index (0-1, higher is more secure)
 */
function getSecurityIndex(results) {
  if (results.length === 0) return 1

  const secure = results.filter(
    r => r.status === 'ok' && !r.violations?.critical && !r.violations?.marginal
  ).length

  return secure / results.length
}

/**
 * Get critical contingencies
 * @param {Array} results - Contingency results
 * @returns {Array} Critical contingencies
 */
function getCriticalContingencies(results) {
  return results.filter(r => r.status !== 'ok' || r.violations?.critical)
}

module.exports = {
  calculateFlows,
  evaluateViolations,
  rankContingencies,
  getSecurityIndex,
  getCriticalContingencies,
}
