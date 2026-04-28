/**
 * Core Electrical Simulation Engine
 * 
 * This module exports the unified electrical simulation system
 * that transforms the ICC Calculator from a calculator to an
 * industrial-grade power system simulator.
 * 
 * Architecture:
 * ReactFlow Editor → ElectricalSystem → Solver Engine → Results
 * 
 * Phases Implemented:
 * Phase 1: Unified Model + Load Flow ✓
 * Phase 2: Fault Analysis + Topology Validation ✓
 * Phase 3: Protection Coordination + Scenarios ✓
 * Phase 4: Dynamics + Advanced Visualization (pending)
 * Phase 5: Industrial Simulation Core (new) ✓
 */

// Phase 1: Unified Electrical Model
const {
  ElectricalSystem,
  Bus,
  Line,
  Transformer,
  Load,
  Motor,
  Generator
} = require('./electrical/ElectricalSystem');

const {
  convertToElectricalSystem,
  applySimulationResults
} = require('./electrical/ReactFlowConverter');

const {
  buildYbus,
  buildSequenceYbus,
  buildZeroSequenceYbus,
  calculatePowerFlow
} = require('./electrical/YbusBuilder');

const {
  solveLoadFlow,
  buildJacobian
} = require('./electrical/NewtonRaphsonSolver');

// Phase 2: Fault Analysis & Topology
const {
  calculateFault,
  calculateFaultScan,
  sequenceToPhase,
  phaseToSequence,
  addComplex,
  subtractComplex,
  multiplyComplex,
  divideComplex
} = require('./electrical/SymmetricalComponents');

const {
  validateTopology,
  detectLoops,
  findDirectSourceToLoadConnections,
  validateTransformerRatios,
  checkThermalLimits,
  validateGrounding,
  validateSolvability
} = require('./electrical/TopologyValidator');

// Phase 3: Protection & Scenarios
const {
  IEC_CURVES,
  ANSI_CURVES,
  calculateOperatingTime,
  generateTCCCurve,
  evaluateTrip,
  calculateCoordinationTMS,
  calculateLSIGCoordination,
  getCurveConstants,
  getAvailableCurves,
  compareCurves
} = require('./protections/TCCCurves');

const {
  ProtectionDevice,
  analyzeCoordination,
  analyzeCascadeCoordination,
  buildSelectivityMatrix,
  autoAdjustSettings,
  evaluateSelectivity,
  generateCoordinationReport
} = require('./protections/ProtectionCoordination');

const {
  Scenario,
  ScenarioManager,
  createFaultScenarios
} = require('./scenarios/ScenarioSystem');

// Phase 5: Industrial Simulation Core (NEW)
const {
  SimulationCore,
  EventQueue
} = require('./simulation/SimulationCore');

const {
  PriorityQueue,
  EventEngine,
  EventTypes
} = require('./events/EventEngine');

const {
  PowerFlowEngine
} = require('./simulation/PowerFlowEngine');

const {
  DynamicSimulation
} = require('./simulation/DynamicSimulation');

const {
  SystemValidator,
  ConsistencyValidator,
  CrossEngineValidator,
  StressTest,
  EdgeCasesTest,
  CascadeTest,
  ExternalValidation
} = require('./validation');

const {
  ToleranceConfig
} = require('./config');

const {
  SimulationLogger,
  LogLevel,
  getGlobalLogger,
  setGlobalLogger,
  logEvent
} = require('./logging');

const {
  DeterministicReplay
} = require('./replay');

const {
  SimulationQueue,
  RedisSimulationQueue
} = require('./queue/SimulationQueue');

const {
  SparseMatrix,
  SparseSolver
} = require('./solver/SparseMatrix');

const {
  EnhancedReportGenerator,
  ProfessionalReportGenerator
} = require('./reporting');

const {
  DirectionalProtection,
  MultiZoneDirectionalProtection
} = require('./protections/DirectionalProtection');

const {
  PhaseGroundProtection,
  GroundFaultProtection
} = require('./protections/PhaseGroundProtection');

const {
  LSIGBreaker,
  LSIGBreakerCoordination
} = require('./protections/LSIGBreaker');

const {
  ThermalMemory,
  ThermalMemoryProtection
} = require('./protections/ThermalMemory');

const {
  CTSaturation,
  CTSaturationProtection
} = require('./protections/CTSaturation');

module.exports = {
  // Phase 1: Electrical Model
  ElectricalSystem,
  Bus,
  Line,
  Transformer,
  Load,
  Motor,
  Generator,
  convertToElectricalSystem,
  applySimulationResults,
  
  // Phase 1: Power Flow
  buildYbus,
  buildSequenceYbus,
  buildZeroSequenceYbus,
  calculatePowerFlow,
  solveLoadFlow,
  buildJacobian,
  
  // Phase 2: Fault Analysis
  calculateFault,
  calculateFaultScan,
  sequenceToPhase,
  phaseToSequence,
  addComplex,
  subtractComplex,
  multiplyComplex,
  divideComplex,
  
  // Phase 2: Topology
  validateTopology,
  detectLoops,
  findDirectSourceToLoadConnections,
  validateTransformerRatios,
  checkThermalLimits,
  validateGrounding,
  validateSolvability,
  
  // Phase 3: TCC Curves
  IEC_CURVES,
  ANSI_CURVES,
  calculateOperatingTime,
  generateTCCCurve,
  evaluateTrip,
  calculateCoordinationTMS,
  calculateLSIGCoordination,
  getCurveConstants,
  getAvailableCurves,
  compareCurves,
  
  // Phase 3: Protection Coordination
  ProtectionDevice,
  analyzeCoordination,
  analyzeCascadeCoordination,
  buildSelectivityMatrix,
  autoAdjustSettings,
  evaluateSelectivity,
  generateCoordinationReport,
  
  // Phase 3: Directional Protection (NEW)
  DirectionalProtection,
  MultiZoneDirectionalProtection,
  
  // Phase 3: Phase/Ground Protection (NEW)
  PhaseGroundProtection,
  GroundFaultProtection,
  
  // Phase 3: LSIG Breaker Protection (NEW)
  LSIGBreaker,
  LSIGBreakerCoordination,
  
  // Phase 3: Thermal Memory (NEW)
  ThermalMemory,
  ThermalMemoryProtection,
  
  // Phase 3: CT Saturation (NEW)
  CTSaturation,
  CTSaturationProtection,
  
  // Phase 3: Scenarios
  Scenario,
  ScenarioManager,
  createFaultScenarios,
  
  // Phase 5: Industrial Simulation Core
  SimulationCore,
  EventQueue,
  EventEngine,
  EventTypes,
  PriorityQueue,
  PowerFlowEngine,
  DynamicSimulation,
  
  // Validation
  SystemValidator,
  ConsistencyValidator,
  CrossEngineValidator,
  StressTest,
  EdgeCasesTest,
  CascadeTest,
  ExternalValidation,
  
  // Configuration (NEW)
  ToleranceConfig,
  
  // Logging (NEW)
  SimulationLogger,
  LogLevel,
  getGlobalLogger,
  setGlobalLogger,
  logEvent,
  
  // Replay (NEW)
  DeterministicReplay,
  
  // Job Queue (NEW)
  SimulationQueue,
  RedisSimulationQueue,
  
  // Sparse Solver (NEW)
  SparseMatrix,
  SparseSolver,
  
  // Enhanced Reporting (NEW)
  EnhancedReportGenerator,
  ProfessionalReportGenerator
};
