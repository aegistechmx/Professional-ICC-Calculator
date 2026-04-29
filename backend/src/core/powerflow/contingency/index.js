/**
 * contingency/index.js - Contingency analysis module exports
 *
 * Responsibility: Centralized exports for contingency analysis
 * Architecture: Generator → Runner → Evaluator
 */

const {
  generateN1Contingencies,
  generateN2Contingencies,
} = require('./generator')
const { runN1Contingency, runN2Contingency } = require('./runner')
const {
  calculateFlows,
  evaluateViolations,
  rankContingencies,
  getSecurityIndex,
  getCriticalContingencies,
} = require('./evaluator')

module.exports = {
  // Scenario generation
  generateN1Contingencies,
  generateN2Contingencies,

  // Execution
  runN1Contingency,
  runN2Contingency,

  // Evaluation
  calculateFlows,
  evaluateViolations,
  rankContingencies,
  getSecurityIndex,
  getCriticalContingencies,
}
