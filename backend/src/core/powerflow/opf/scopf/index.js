/**
 * scopf/index.js - Security-Constrained OPF module exports
 * 
 * Responsibility: Centralized exports for SCOPF analysis
 * Architecture: Contingency Generator → Security Constraints → SCOPF Solver
 */

const SCOPFSolver = require('./scopfSolver');
const { 
  generateN1Contingencies,
  generateRankedContingencies,
  applyContingency,
  filterContingencies
} = require('./contingencyGenerator');
const { 
  evaluateSecurityConstraints,
  evaluateContingency,
  checkVoltageViolations,
  checkLineFlowViolations,
  checkGenerationViolations,
  calculateLineFlows,
  determineSeverity
} = require('./securityConstraints');

module.exports = {
  // Main solver
  SCOPFSolver,
  
  // Contingency generation
  generateN1Contingencies,
  generateRankedContingencies,
  applyContingency,
  filterContingencies,
  
  // Security constraint evaluation
  evaluateSecurityConstraints,
  evaluateContingency,
  checkVoltageViolations,
  checkLineFlowViolations,
  checkGenerationViolations,
  calculateLineFlows,
  determineSeverity
};
