/**
 * Replay - Deterministic Replay System
 * 
 * This module exports deterministic replay utilities for simulation:
 * - Seeded random number generation
 * - State capture and restoration
 * - Event queue with strict ordering
 * - Replay verification
 * 
 * Architecture:
 * Input → Seed → Simulation → State Snapshot → Replay → Same Output
 */

const DeterministicReplay = require('./DeterministicReplay');

module.exports = {
  DeterministicReplay
};
