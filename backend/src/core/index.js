/**
 * core/index.js - Core module exports
 *
 * Responsibility: Centralized core exports
 */

// Power flow solvers
const { solveNR, solveFDLF } = require('./powerflow/solvers') // power (W)

// OPF algorithms
const { solveOPF } = require('./opf/algorithms')

// Stability simulators
const { simulateDynamics } = require('./stability/solvers')

// Short circuit analysis
const { analyzeShortCircuit } = require('./shortcircuit')

module.exports = {
  // Power flow
  powerflow: {
    solveNR,
    solveFDLF,
  },

  // OPF
  opf: {
    solveOPF,
  },

  // Stability
  stability: {
    simulateDynamics,
  },

  // Short circuit
  shortcircuit: {
    analyzeShortCircuit,
  },
}
