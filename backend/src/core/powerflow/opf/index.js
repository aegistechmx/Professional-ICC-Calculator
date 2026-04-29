/**
 * opf/index.js - Optimal Power Flow module exports
 *
 * Responsibility: Centralized exports for economic dispatch optimization
 * Architecture: Generator Models → Objective → Constraints → Solver
 */

const Generator = require('./generator')
const {
  totalCost,
  costGradient,
  costHessian,
  incrementalCost,
  isConvex,
  costReduction,
} = require('./objective')
const {
  powerBalanceMismatch,
  enforcePowerBalance,
  checkGenerationLimits,
  checkVoltageLimits,
  checkLineFlowLimits,
  calculatePenalty,
  checkAllConstraints,
} = require('./constraints')
const NewtonOPFSolver = require('./solver')

module.exports = {
  // Models
  Generator,

  // Objective functions
  totalCost,
  costGradient,
  costHessian,
  incrementalCost,
  isConvex,
  costReduction,

  // Constraints
  powerBalanceMismatch,
  enforcePowerBalance,
  checkGenerationLimits,
  checkVoltageLimits,
  checkLineFlowLimits,
  calculatePenalty,
  checkAllConstraints,

  // Solver
  NewtonOPFSolver,
}
