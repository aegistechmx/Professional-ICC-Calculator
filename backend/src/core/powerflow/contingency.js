/**
 * contingency.js - Legacy compatibility layer for contingency analysis
 * 
 * Responsibility: Backward compatibility wrapper for new modular architecture
 * NO Express, NO axios, NO UI logic
 */

const { 
  runN1Contingency, 
  runN2Contingency,
  generateN1Contingencies,
  generateN2Contingencies,
  evaluateViolations,
  rankContingencies,
  getSecurityIndex,
  getCriticalContingencies
} = require('./contingency/index');

// Re-export for backward compatibility
module.exports = {
  runN1Contingency,
  runN2Contingency,
  generateN1Contingencies,
  generateN2Contingencies,
  evaluateViolations,
  rankContingencies,
  getSecurityIndex,
  getCriticalContingencies
};
