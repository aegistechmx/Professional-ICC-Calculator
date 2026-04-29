/**
 * Validation - Electrical System Validation Modules
 *
 * This module exports validation utilities for electrical systems
 * to detect configuration errors, inconsistencies, and potential issues.
 *
 * Architecture:
 * System → SystemValidator → Validation Results
 * System → ConsistencyValidator → Cross-Engine Validation
 * System → CrossEngineValidator → Cross-Engine Validation
 */

const { SystemValidator } = require('./SystemValidator')
const { ConsistencyValidator } = require('./ConsistencyValidator')
const { CrossEngineValidator } = require('./CrossEngineValidator')
const { StressTest } = require('./StressTest')
const { EdgeCasesTest } = require('./EdgeCasesTest')
const { CascadeTest } = require('./CascadeTest')
const { ExternalValidation } = require('./ExternalValidation')

module.exports = {
  SystemValidator,
  ConsistencyValidator,
  CrossEngineValidator,
  StressTest,
  EdgeCasesTest,
  CascadeTest,
  ExternalValidation,
}
