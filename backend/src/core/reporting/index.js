/**
 * Reporting - Report Generation Modules
 * 
 * This module exports report generation utilities for electrical systems
 * to produce professional engineering documentation.
 * 
 * Architecture:
 * Simulation Results → Report Generator → Professional Report
 */

const { EnhancedReportGenerator } = require('./EnhancedReportGenerator');
const { ProfessionalReportGenerator } = require('./ProfessionalReportGenerator');

module.exports = {
  EnhancedReportGenerator,
  ProfessionalReportGenerator
};
