/**
 * Electrical - Electrical System Modules
 * 
 * This module exports electrical system components and solvers
 * for power flow analysis and fault calculations.
 * 
 * Architecture:
 * ElectricalSystem → Ybus → Power Flow Solver → Results
 */

const { ElectricalSystem, Bus, Line, Transformer, Load, Motor, Generator } = require('./ElectricalSystem');
const { buildYbus, buildSequenceYbus, buildZeroSequenceYbus } = require('./YbusBuilder');
const { solveLoadFlow, buildJacobian } = require('./NewtonRaphsonSolver');
const { solveLoadFlowRobust, solveNRWithDamping, solveFastDecoupled, solveGaussSeidel } = require('./NewtonRaphsonSolverRobust');
const { calculateFault, calculateFaultScan, sequenceToPhase, phaseToSequence } = require('./SymmetricalComponents');

module.exports = {
  // Electrical Model
  ElectricalSystem,
  Bus,
  Line,
  Transformer,
  Load,
  Motor,
  Generator,
  
  // Ybus Builder
  buildYbus,
  buildSequenceYbus,
  buildZeroSequenceYbus,
  
  // Power Flow Solvers
  solveLoadFlow,
  buildJacobian,
  solveLoadFlowRobust,
  solveNRWithDamping,
  solveFastDecoupled,
  solveGaussSeidel,
  
  // Fault Analysis
  calculateFault,
  calculateFaultScan,
  sequenceToPhase,
  phaseToSequence
};
