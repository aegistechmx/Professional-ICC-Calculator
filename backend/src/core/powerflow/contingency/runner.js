/**
 * runner.js - Contingency execution runner
 *
 * Responsibility: Execute contingency scenarios with power flow solver
 * NO Express, NO axios, NO UI logic
 */

const { solve } = require('../solver')
const { solveFDLF } = require('../fastDecoupled')
const {
  generateN1Contingencies,
  generateN2Contingencies,
} = require('./generator')
const {
  evaluateViolations,
  rankContingencies,
  getSecurityIndex,
  getCriticalContingencies,
} = require('./evaluator')

/**
 * Run N-1 contingency analysis
 * @param {Object} model - Base system model
 * @param {Object} options - Analysis options
 * @returns {Object} Contingency analysis results
 */
function runN1Contingency(model, options = {}) {
  const {
    tolerance = 1e-6,
    maxIterations = 30,
    method = 'NR', // 'NR' or 'FDLF'
    Vmin = 0.95,
    Vmax = 1.05,
    loadingLimit = 1.0,
  } = options

  // Run base case
  const baseResult =
    method === 'FDLF'
      ? solveFDLF(model, { tolerance, maxIterations })
      : solve(model, { tolerance, maxIterations })

  // Generate contingencies
  const contingencies = generateN1Contingencies(model)
  const results = []

  // Execute each contingency
  for (const contingency of contingencies) {
    const contingencyModel = contingency.apply(model)

    let result
    let status = 'ok'

    try {
      result =
        method === 'FDLF'
          ? solveFDLF(contingencyModel, { tolerance, maxIterations })
          : solve(contingencyModel, { tolerance, maxIterations })

      if (!result.converged) {
        status = 'non_converged'
      }
    } catch (error) {
      status = 'error'
      result = { error: error.message }
    }

    // Evaluate violations
    const violations = result.converged
      ? evaluateViolations(result, contingencyModel, {
          Vmin,
          Vmax,
          loadingLimit,
        })
      : { voltage: [], overload: [], critical: true, marginal: false }

    results.push({
      contingency: contingency.type,
      elementId: contingency.elementId,
      from: contingency.from,
      to: contingency.to,
      status,
      converged: result.converged,
      iterations: result.iterations,
      maxMismatch: result.maxMismatch,
      violations,
      voltages: result.voltages,
    })
  }

  // Rank results
  const rankedResults = rankContingencies(results)

  return {
    baseCase: baseResult,
    total: contingencies.length,
    results: rankedResults,
    summary: {
      total: contingencies.length,
      critical: rankedResults.filter(
        r => r.status !== 'ok' || r.violations.critical
      ).length,
      marginal: rankedResults.filter(
        r => r.violations.marginal && !r.violations.critical
      ).length,
      secure: rankedResults.filter(
        r =>
          r.status === 'ok' && !r.violations.critical && !r.violations.marginal
      ).length,
      securityIndex: getSecurityIndex(rankedResults),
    },
    criticalContingencies: getCriticalContingencies(rankedResults),
  }
}

/**
 * Run N-2 contingency analysis
 * @param {Object} model - Base system model
 * @param {Object} options - Analysis options
 * @returns {Object} Contingency analysis results
 */
function runN2Contingency(model, options = {}) {
  const {
    tolerance = 1e-6,
    maxIterations = 30,
    method = 'NR',
    Vmin = 0.95,
    Vmax = 1.05,
    loadingLimit = 1.0,
    maxCombinations = 50,
  } = options

  // Run base case
  const baseResult =
    method === 'FDLF'
      ? solveFDLF(model, { tolerance, maxIterations })
      : solve(model, { tolerance, maxIterations })

  // Generate N-2 contingencies
  const contingencies = generateN2Contingencies(model, maxCombinations)
  const results = []

  // Execute each contingency
  for (const contingency of contingencies) {
    const contingencyModel = contingency.apply(model)

    let result
    let status = 'ok'

    try {
      result =
        method === 'FDLF'
          ? solveFDLF(contingencyModel, { tolerance, maxIterations })
          : solve(contingencyModel, { tolerance, maxIterations })

      if (!result.converged) {
        status = 'non_converged'
      }
    } catch (error) {
      status = 'error'
      result = { error: error.message }
    }

    const violations = result.converged
      ? evaluateViolations(result, contingencyModel, {
          Vmin,
          Vmax,
          loadingLimit,
        })
      : { voltage: [], overload: [], critical: true, marginal: false }

    results.push({
      contingency: contingency.type,
      elementIds: contingency.elementIds,
      status,
      converged: result.converged,
      iterations: result.iterations,
      maxMismatch: result.maxMismatch,
      violations,
    })
  }

  const rankedResults = rankContingencies(results)

  return {
    baseCase: baseResult,
    total: contingencies.length,
    results: rankedResults,
    summary: {
      total: contingencies.length,
      critical: rankedResults.filter(
        r => r.status !== 'ok' || r.violations.critical
      ).length,
      marginal: rankedResults.filter(
        r => r.violations.marginal && !r.violations.critical
      ).length,
      secure: rankedResults.filter(
        r =>
          r.status === 'ok' && !r.violations.critical && !r.violations.marginal
      ).length,
      securityIndex: getSecurityIndex(rankedResults),
    },
    criticalContingencies: getCriticalContingencies(rankedResults),
  }
}

module.exports = {
  runN1Contingency,
  runN2Contingency,
}
