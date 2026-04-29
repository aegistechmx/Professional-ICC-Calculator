/**
 * powerflow/index.js - Power flow module exports
 *
 * Responsibility: Centralized exports for all power flow solvers
 * Architecture: Clean module interface
 */

// Core solvers
const { solve } = require('./solver')
const { solveFDLF } = require('./fastDecoupled')

// Individual components (for advanced usage)
const { buildJacobian } = require('./jacobian')
const { calcMismatch } = require('./mismatch')
const { enforcePVLimits } = require('./pvControl')
const { lineSearch } = require('./lineSearch')
const { applyTrustRegion } = require('./trustRegion')

module.exports = {
  // Main solvers
  solve, // Newton-Raphson with all stability features
  solveFDLF, // Fast Decoupled Load Flow

  // Individual components
  buildJacobian,
  calcMismatch,
  enforcePVLimits,
  lineSearch,
  applyTrustRegion,
}
