/**
 * Protections - Protection Coordination Modules
 * 
 * This module exports protection coordination utilities for electrical systems
 * to analyze and optimize protection device settings.
 * 
 * Architecture:
 * Protection Devices → Coordination Analysis → TCC Curves → Selectivity
 */

const { ProtectionDevice, analyzeCoordination, analyzeCascadeCoordination, buildSelectivityMatrix, autoAdjustSettings, evaluateSelectivity, generateCoordinationReport } = require('./ProtectionCoordination');
const { DirectionalProtection, MultiZoneDirectionalProtection } = require('./DirectionalProtection');
const { PhaseGroundProtection, GroundFaultProtection } = require('./PhaseGroundProtection');
const { LSIGBreaker, LSIGBreakerCoordination } = require('./LSIGBreaker');
const { ThermalMemory, ThermalMemoryProtection } = require('./ThermalMemory');
const { CTSaturation, CTSaturationProtection } = require('./CTSaturation');

module.exports = {
  // Protection Coordination
  ProtectionDevice,
  analyzeCoordination,
  analyzeCascadeCoordination,
  buildSelectivityMatrix,
  autoAdjustSettings,
  evaluateSelectivity,
  generateCoordinationReport,
  
  // Directional Protection
  DirectionalProtection,
  MultiZoneDirectionalProtection,
  
  // Phase/Ground Protection
  PhaseGroundProtection,
  GroundFaultProtection,
  
  // LSIG Breaker Protection
  LSIGBreaker,
  LSIGBreakerCoordination,
  
  // Thermal Memory (NEW)
  ThermalMemory,
  ThermalMemoryProtection,
  
  // CT Saturation (NEW)
  CTSaturation,
  CTSaturationProtection
};
