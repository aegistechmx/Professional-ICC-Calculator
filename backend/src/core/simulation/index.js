/**
 * Simulation Core - Industrial Simulation Engine Modules
 * 
 * This module exports the pure, independent simulation engines
 * that can run in backend workers without UI dependencies.
 * 
 * Architecture:
 * ElectricalSystem → SimulationCore → EventEngine → Results
 */

const { SimulationCore, EventQueue } = require('./SimulationCore');
const { PowerFlowEngine } = require('./PowerFlowEngine');
const DynamicSimulation = require('./DynamicSimulation');

module.exports = {
  // Core Simulation Engine
  SimulationCore,
  EventQueue,
  
  // Power Flow Engine
  PowerFlowEngine,
  
  // Dynamic Simulation
  DynamicSimulation
};
