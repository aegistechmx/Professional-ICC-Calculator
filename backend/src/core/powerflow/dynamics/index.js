/**
 * dynamics/index.js - Transient stability module exports
 * 
 * Responsibility: Centralized exports for dynamic simulation
 * Architecture: Models → Integrators → Solver → Events
 */

const Generator = require('./models/generator');
const { rk4Step, rk4Adaptive, integrate } = require('./integrators/rk4');
const DynamicPowerFlowSolver = require('./solver/dynamicSolver');

module.exports = {
  // Models
  Generator,
  
  // Integrators
  rk4Step,
  rk4Adaptive,
  integrate,
  
  // Solver
  DynamicPowerFlowSolver
};
