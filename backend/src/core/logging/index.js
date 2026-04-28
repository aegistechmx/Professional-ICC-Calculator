/**
 * Logging - Complete Traceability System
 * 
 * This module exports logging utilities for electrical systems
 * to provide complete traceability of simulation decisions.
 * 
 * Architecture:
 * Simulation Events → Logger → Event Log → Replay/Reports
 */

const { SimulationLogger } = require('./SimulationLogger');

// Export LogLevel constants for external use
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  CRITICAL: 4
};

module.exports = {
  SimulationLogger,
  LogLevel,
  getGlobalLogger: () => global.__simulationLogger,
  setGlobalLogger: (logger) => { global.__simulationLogger = logger; },
  logEvent: (event, level) => {
    const logger = global.__simulationLogger;
    if (logger) {
      logger.logEvent(event, level);
    }
  }
};
