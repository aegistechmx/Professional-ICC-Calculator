/**
 * Config - Configuration Modules
 *
 * This module exports configuration utilities for the simulation engine,
 * including real-world tolerance standards for static and dynamic analysis.
 *
 * Architecture:
 * ToleranceConfig → Solvers → Validation
 */

const ToleranceConfig = require('./ToleranceConfig')

module.exports = {
  ToleranceConfig,
}
