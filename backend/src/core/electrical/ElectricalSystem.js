/**
 * ElectricalSystem - Unified Electrical Model
 * Core class representing a complete electrical power system
 * 
 * This is the foundation for industrial-grade power system simulation
 * including load flow, short circuit, and dynamic analysis
 */

/**
 * Bus - Electrical node in the system
 */
class Bus {
  constructor(data) {
    this.id = data.id;
    this.name = data.name || `Bus ${data.id}`;
    this.type = data.type || 'PQ'; // 'PV', 'PQ', 'Slack'
    this.baseKV = data.baseKV || 13.8;
    this.voltage = data.voltage || { magnitude: 1.0, angle: 0 }; // per unit
    this.voltageMax = data.voltageMax || 1.05;
    this.voltageMin = data.voltageMin || 0.95;
    this.generation = data.generation || { P: 0, Q: 0 }; // MW, MVAR
    this.load = data.load || { P: 0, Q: 0 }; // MW, MVAR
    this.shunt = data.shunt || { G: 0, B: 0 }; // per unit
    this.coordinates = data.coordinates || { x: 0, y: 0 };
  }
}

/**
 * Line - Transmission or distribution line
 */
class Line {
  constructor(data) {
    this.id = data.id;
    this.fromBus = data.fromBus; // Bus ID
    this.toBus = data.toBus; // Bus ID
    this.length = data.length || 1; // km
    this.r = data.r || 0.01; // per unit resistance
    this.x = data.x || 0.1; // per unit reactance
    this.b = data.b || 0.0; // per unit susceptance
    this.tapRatio = data.tapRatio || 1.0;
    this.phaseShift = data.phaseShift || 0; // degrees
    this.thermalLimit = data.thermalLimit || 100; // MVA
    this.status = data.status !== undefined ? data.status : true;
  }
}

/**
 * Transformer - Power transformer
 */
class Transformer {
  constructor(data) {
    this.id = data.id;
    this.fromBus = data.fromBus; // Bus ID
    this.toBus = data.toBus; // Bus ID
    this.primaryKV = data.primaryKV || 13.8;
    this.secondaryKV = data.secondaryKV || 0.48;
    this.mva = data.mva || 0.5;
    this.impedance = data.impedance || 0.0575; // per unit
    this.r = data.r || 0.01; // per unit resistance
    this.x = data.x || 0.0565; // per unit reactance
    this.tapRatio = data.tapRatio || 1.0;
    this.grounding = data.grounding || 'yg_solido'; // yg_solido, yg_resistivo, delta
    this.status = data.status !== undefined ? data.status : true;
  }
}

/**
 * Load - Electrical load
 */
class Load {
  constructor(data) {
    this.id = data.id;
    this.bus = data.bus; // Bus ID
    this.type = data.type || 'constant_power'; // constant_power, constant_impedance, constant_current
    this.P = data.P || 0; // MW
    this.Q = data.Q || 0; // MVAR
    this.powerFactor = data.powerFactor || 0.85;
    this.voltageDependence = data.voltageDependence || { a: 1, b: 0, c: 0 }; // P = P0 * (V/V0)^a
    this.status = data.status !== undefined ? data.status : true;
  }
}

/**
 * Motor - Electric motor (induction or synchronous)
 */
class Motor {
  constructor(data) {
    this.id = data.id;
    this.bus = data.bus; // Bus ID
    this.type = data.type || 'induction'; // induction, synchronous
    this.hp = data.hp || 100;
    this.kW = data.kW || (data.hp * 0.746);
    this.voltage = data.voltage || 0.48;
    this.efficiency = data.efficiency || 0.92;
    this.powerFactor = data.powerFactor || 0.85;
    this.xd = data.xd || 0.2; // direct axis reactance
    this.xd_prime = data.xd_prime || 0.15; // transient reactance
    this.xd_double_prime = data.xd_double_prime || 0.1; // subtransient reactance
    this.H = data.H || 3; // inertia constant (seconds)
    this.x0 = data.x0 || 0.05; // zero sequence reactance
    this.r1 = data.r1 || 0.01; // positive sequence resistance
    this.r2 = data.r2 || 0.01; // rotor resistance
    this.status = data.status !== undefined ? data.status : true;
  }
}

/**
 * Generator - Power generator
 */
class Generator {
  constructor(data) {
    this.id = data.id;
    this.bus = data.bus; // Bus ID
    this.type = data.type || 'synchronous';
    this.mva = data.mva || 100;
    this.P = data.P || 0; // MW
    this.Q = data.Q || 0; // MVAR
    this.Pmax = data.Pmax || 100;
    this.Pmin = data.Pmin || 0;
    this.Qmax = data.Qmax || 50;
    this.Qmin = data.Qmin || -50;
    this.xd = data.xd || 1.8; // synchronous reactance
    this.xd_prime = data.xd_prime || 0.3; // transient reactance
    this.xd_double_prime = data.xd_double_prime || 0.2; // subtransient reactance
    this.xg = data.xg || 0.1; // grounding reactance
    this.rg = data.rg || 0; // grounding resistance
    this.status = data.status !== undefined ? data.status : true;
  }
}

/**
 * ElectricalSystem - Complete power system model
 */
class ElectricalSystem {
  constructor(data = {}) {
    this.name = data.name || 'Electrical System';
    this.baseMVA = data.baseMVA || 100;
    this.baseKV = data.baseKV || 13.8;
    this.frequency = data.frequency || 60;
    
    // System components
    this.buses = [];
    this.lines = [];
    this.transformers = [];
    this.loads = [];
    this.motors = [];
    this.generators = [];
    
    // Initialize from data if provided
    if (data.buses) this.buses = data.buses.map(b => new Bus(b));
    if (data.lines) this.lines = data.lines.map(l => new Line(l));
    if (data.transformers) this.transformers = data.transformers.map(t => new Transformer(t));
    if (data.loads) this.loads = data.loads.map(l => new Load(l));
    if (data.motors) this.motors = data.motors.map(m => new Motor(m));
    if (data.generators) this.generators = data.generators.map(g => new Generator(g));
  }
  
  /**
   * Add components to the system
   */
  addBus(bus) {
    this.buses.push(new Bus(bus));
    return this;
  }
  
  addLine(line) {
    this.lines.push(new Line(line));
    return this;
  }
  
  addTransformer(transformer) {
    this.transformers.push(new Transformer(transformer));
    return this;
  }
  
  addLoad(load) {
    this.loads.push(new Load(load));
    return this;
  }
  
  addMotor(motor) {
    this.motors.push(new Motor(motor));
    return this;
  }
  
  addGenerator(generator) {
    this.generators.push(new Generator(generator));
    return this;
  }
  
  /**
   * Get bus by ID
   */
  getBus(id) {
    return this.buses.find(b => b.id === id);
  }
  
  /**
   * Get all buses connected to a bus
   */
  getConnectedBuses(busId) {
    const connected = new Set();
    
    // Check lines
    this.lines.forEach(line => {
      if (line.fromBus === busId) connected.add(line.toBus);
      if (line.toBus === busId) connected.add(line.fromBus);
    });
    
    // Check transformers
    this.transformers.forEach(tr => {
      if (tr.fromBus === busId) connected.add(tr.toBus);
      if (tr.toBus === busId) connected.add(tr.fromBus);
    });
    
    return Array.from(connected).map(id => this.getBus(id)).filter(b => b);
  }
  
  /**
   * Validate system topology
   */
  validateTopology() {
    const errors = [];
    
    // Check if at least one slack bus exists
    const slackBuses = this.buses.filter(b => b.type === 'Slack');
    if (slackBuses.length === 0) {
      errors.push('No slack bus found in the system');
    }
    
    // Check for isolated buses
    const connectedBusIds = new Set();
    this.lines.forEach(l => { connectedBusIds.add(l.fromBus); connectedBusIds.add(l.toBus); });
    this.transformers.forEach(t => { connectedBusIds.add(t.fromBus); connectedBusIds.add(t.toBus); });
    
    const isolatedBuses = this.buses.filter(b => !connectedBusIds.has(b.id));
    if (isolatedBuses.length > 0) {
      errors.push(`Isolated buses found: ${isolatedBuses.map(b => b.name).join(', ')}`);
    }
    
    // Check for duplicate bus IDs
    const busIds = this.buses.map(b => b.id);
    const duplicateIds = busIds.filter((id, index) => busIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push(`Duplicate bus IDs found: ${[...new Set(duplicateIds)].join(', ')}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Get system summary
   */
  getSummary() {
    return {
      name: this.name,
      baseMVA: this.baseMVA,
      baseKV: this.baseKV,
      frequency: this.frequency,
      buses: this.buses.length,
      lines: this.lines.length,
      transformers: this.transformers.length,
      loads: this.loads.length,
      motors: this.motors.length,
      generators: this.generators.length,
      totalLoadMW: this.loads.reduce((sum, l) => sum + l.P, 0),
      totalGenerationMW: this.generators.reduce((sum, g) => sum + g.P, 0),
      totalMotorMW: this.motors.reduce((sum, m) => sum + m.kW, 0) / 1000
    };
  }
}

module.exports = {
  ElectricalSystem,
  Bus,
  Line,
  Transformer,
  Load,
  Motor,
  Generator
};
