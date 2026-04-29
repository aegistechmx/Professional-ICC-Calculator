/**
 * ElectricalSystem.js - Unified Power System Contract
 * 
 * This defines the standard format for electrical system data
 * used throughout the core power flow engine.
 * 
 * NO Express, NO axios, NO UI logic
 * 
 * @typedef {Object} Bus
 * @property {number} id - Bus identifier
 * @property {'Slack'|'PV'|'PQ'} type - Bus type
 * @property {number} V - Voltage magnitude (per unit)
 * @property {number} theta - Voltage angle (radians)
 * @property {number} P - Active power injection (per unit)
 * @property {number} Q - Reactive power injection (per unit)
 * @property {number} [Qmin] - Minimum reactive power (PV buses)
 * @property {number} [Qmax] - Maximum reactive power (PV buses)
 * @property {number} [Vmin] - Minimum voltage (PQ buses)
 * @property {number} [Vmax] - Maximum voltage (PQ buses)
 * 
 * @typedef {Object} Branch
 * @property {number} from - From bus index
 * @property {number} to - To bus index
 * @property {number} R - Resistance (per unit)
 * @property {number} X - Reactance (per unit)
 * @property {number} [B] - Shunt susceptance (per unit)
 * @property {number} [ratio] - Transformer tap ratio
 * @property {number} [angle] - Transformer phase shift (radians)
 * 
 * @typedef {Object} ElectricalSystem
 * @property {number} baseMVA - Base MVA
 * @property {number} baseKV - Base voltage (kV)
 * @property {Bus[]} buses - Array of buses
 * @property {Branch[]} branches - Array of branches
 */

/**
 * Create a new electrical system
 * @param {Object} config - System configuration
 * @param {number} config.baseMVA - Base MVA
 * @param {number} config.baseKV - Base voltage (kV)
 * @returns {ElectricalSystem} Electrical system object
 */
function createSystem(config) {
  return {
    baseMVA: config.baseMVA || 100,
    baseKV: config.baseKV || 138,
    buses: [],
    branches: []
  };
}

/**
 * Add a bus to the system
 * @param {ElectricalSystem} system - Electrical system
 * @param {Bus} bus - Bus data
 * @returns {ElectricalSystem} Updated system
 */
function addBus(system, bus) {
  system.buses.push({
    id: bus.id,
    type: bus.type || 'PQ',
    V: bus.V || 1.0,
    theta: bus.theta || 0,
    P: bus.P || 0,
    Q: bus.Q || 0,
    Qmin: bus.Qmin,
    Qmax: bus.Qmax,
    Vmin: bus.Vmin || 0.95,
    Vmax: bus.Vmax || 1.05
  });
  return system;
}

/**
 * Add a branch to the system
 * @param {ElectricalSystem} system - Electrical system
 * @param {Branch} branch - Branch data
 * @returns {ElectricalSystem} Updated system
 */
function addBranch(system, branch) {
  system.branches.push({
    from: branch.from,
    to: branch.to,
    R: branch.R || 0,
    X: branch.X || 0,
    B: branch.B || 0,
    ratio: branch.ratio || 1.0,
    angle: branch.angle || 0
  });
  return system;
}

/**
 * Validate system data
 * @param {ElectricalSystem} system - Electrical system
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
function validateSystem(system) {
  const errors = [];

  if (!system.baseMVA || system.baseMVA <= 0) {
    errors.push('Invalid baseMVA');
  }

  if (!system.baseKV || system.baseKV <= 0) {
    errors.push('Invalid baseKV');
  }

  if (!system.buses || system.buses.length === 0) {
    errors.push('No buses defined');
  }

  const slackBuses = system.buses.filter(b => b.type === 'Slack');
  if (slackBuses.length === 0) {
    errors.push('No slack bus defined');
  } else if (slackBuses.length > 1) {
    errors.push('Multiple slack buses defined');
  }

  system.buses.forEach((bus, i) => {
    if (bus.V <= 0) {
      errors.push(`Bus ${i}: Invalid voltage magnitude`);
    }
    if (bus.type !== 'Slack' && bus.type !== 'PV' && bus.type !== 'PQ') {
      errors.push(`Bus ${i}: Invalid bus type`);
    }
  });

  system.branches.forEach((branch, i) => {
    if (branch.from < 0 || branch.from >= system.buses.length) {
      errors.push(`Branch ${i}: Invalid from bus index`);
    }
    if (branch.to < 0 || branch.to >= system.buses.length) {
      errors.push(`Branch ${i}: Invalid to bus index`);
    }
    if (branch.R === 0 && branch.X === 0) {
      errors.push(`Branch ${i}: Zero impedance`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  createSystem,
  addBus,
  addBranch,
  validateSystem
};
