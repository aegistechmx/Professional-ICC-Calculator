/**
 * ElectricalState - Unified Global System Model
 * 
 * Single source of truth for all system data, matrices, and results
 * Provides consistent state across all simulation modules
 */

const { buildYbus, buildZeroSequenceYbus } = require('./YbusBuilder');

/**
 * Electrical State Class
 */
class ElectricalState {
  constructor(config = {}) {
    // System components
    this.buses = [];
    this.lines = [];
    this.transformers = [];
    this.generators = [];
    this.loads = [];
    this.motors = [];
    this.shunts = [];
    
    // System base values
    this.base = {
      MVA: config.baseMVA || 100,
      KV: config.baseKV || 13.8,
      frequency: 60
    };
    
    // Network matrices
    this.Ybus = null;
    this.Zbus = null;
    this.YbusPositive = null;
    this.YbusNegative = null;
    this.YbusZero = null;
    
    // Simulation results
    this.results = {
      powerFlow: null,
      fault: null,
      harmonics: null,
      dynamics: null,
      stability: null,
      protection: null
    };
    
    // Time-domain state
    this.time = 0;
    this.dt = 0.01;
    
    // Event queue
    this.events = [];
    
    // Validation status
    this.isValid = false;
    this.validationErrors = [];
  }

  /**
   * Set system components
   */
  setSystem(system) {
    this.buses = system.buses || [];
    this.lines = system.lines || [];
    this.transformers = system.transformers || [];
    this.generators = system.generators || [];
    this.loads = system.loads || [];
    this.motors = system.motors || [];
    this.shunts = system.shunts || [];
    
    // Rebuild network matrices
    this.rebuildMatrices();
    
    return this;
  }

  /**
   * Rebuild network matrices
   */
  rebuildMatrices() {
    if (this.buses.length === 0) return;
    
    // Build positive sequence Ybus
    this.Ybus = buildYbus(this.buses, this.lines);
    
    // Build sequence networks for fault analysis
    this.YbusPositive = buildYbus(this.buses, this.lines);
    this.YbusNegative = buildYbus(this.buses, this.lines);
    this.YbusZero = buildZeroSequenceYbus(this.buses, this.lines);
    
    // Calculate Zbus (inverse of Ybus)
    this.Zbus = this.invertMatrix(this.Ybus);
  }

  /**
   * Invert matrix (simplified)
   */
  invertMatrix(matrix) {
    // This should use a proper matrix inversion library
    // For now, return placeholder
    return matrix;
  }

  /**
   * Validate system topology
   */
  validate() {
    this.validationErrors = [];
    
    // Check for isolated buses
    const connectedBuses = new Set();
    this.lines.forEach(line => {
      connectedBuses.add(line.fromBus);
      connectedBuses.add(line.toBus);
    });
    
    this.buses.forEach(bus => {
      if (!connectedBuses.has(bus.id) && this.buses.length > 1) {
        this.validationErrors.push(`Isolated bus: ${bus.id}`);
      }
    });
    
    // Check for zero impedance
    this.lines.forEach(line => {
      if (line.r === 0 && line.x === 0) {
        this.validationErrors.push(`Zero impedance line: ${line.id}`);
      }
    });
    
    // Check transformer consistency
    this.transformers.forEach(xfm => {
      if (xfm.primaryKV === xfm.secondaryKV && xfm.impedance === 0) {
        this.validationErrors.push(`Invalid transformer: ${xfm.id}`);
      }
    });
    
    this.isValid = this.validationErrors.length === 0;
    return this.isValid;
  }

  /**
   * Get bus by ID
   */
  getBus(id) {
    return this.buses.find(b => b.id === id);
  }

  /**
   * Get line by ID
   */
  getLine(id) {
    return this.lines.find(l => l.id === id);
  }

  /**
   * Get generator by ID
   */
  getGenerator(id) {
    return this.generators.find(g => g.id === id);
  }

  /**
   * Set power flow results
   */
  setPowerFlowResults(results) {
    this.results.powerFlow = results;
    
    // Update bus voltages
    if (results.converged) {
      this.buses.forEach((bus, i) => {
        bus.V = results.V[i];
        bus.theta = results.theta[i];
        bus.P = results.P[i];
        bus.Q = results.Q[i];
      });
    }
    
    return this;
  }

  /**
   * Set fault analysis results
   */
  setFaultResults(results) {
    this.results.fault = results;
    return this;
  }

  /**
   * Set harmonic analysis results
   */
  setHarmonicResults(results) {
    this.results.harmonics = results;
    return this;
  }

  /**
   * Set dynamic simulation results
   */
  setDynamicResults(results) {
    this.results.dynamics = results;
    return this;
  }

  /**
   * Set stability analysis results
   */
  setStabilityResults(results) {
    this.results.stability = results;
    return this;
  }

  /**
   * Set protection coordination results
   */
  setProtectionResults(results) {
    this.results.protection = results;
    return this;
  }

  /**
   * Get current state snapshot
   */
  getSnapshot() {
    return {
      time: this.time,
      buses: this.buses.map(b => ({
        id: b.id,
        type: b.type,
        V: b.V,
        theta: b.theta,
        P: b.P,
        Q: b.Q
      })),
      lines: this.lines.map(l => ({
        id: l.id,
        from: l.fromBus,
        to: l.toBus,
        status: l.status
      })),
      generators: this.generators.map(g => ({
        id: g.id,
        bus: g.bus,
        P: g.currentP || 0,
        Q: g.Q
      })),
      results: this.results
    };
  }

  /**
   * Restore state from snapshot
   */
  restoreSnapshot(snapshot) {
    this.time = snapshot.time;
    this.results = snapshot.results;
    
    // Restore bus states
    snapshot.buses.forEach(sb => {
      const bus = this.getBus(sb.id);
      if (bus) {
        bus.V = sb.V;
        bus.theta = sb.theta;
        bus.P = sb.P;
        bus.Q = sb.Q;
      }
    });
    
    // Restore line states
    snapshot.lines.forEach(sl => {
      const line = this.getLine(sl.id);
      if (line) {
        line.status = sl.status;
      }
    });
    
    // Restore generator states
    snapshot.generators.forEach(sg => {
      const gen = this.getGenerator(sg.id);
      if (gen) {
        gen.currentP = sg.P;
        gen.Q = sg.Q;
      }
    });
    
    return this;
  }

  /**
   * Reset to initial state
   */
  reset() {
    this.time = 0;
    this.events = [];
    this.results = {
      powerFlow: null,
      fault: null,
      harmonics: null,
      dynamics: null,
      stability: null,
      protection: null
    };
    
    // Reset bus voltages to nominal
    this.buses.forEach(bus => {
      bus.V = 1.0;
      bus.theta = 0;
      bus.P = 0;
      bus.Q = 0;
    });
    
    // Reset lines to closed
    this.lines.forEach(line => {
      line.status = true;
    });
    
    return this;
  }

  /**
   * Get system summary
   */
  getSummary() {
    return {
      buses: this.buses.length,
      lines: this.lines.length,
      transformers: this.transformers.length,
      generators: this.generators.length,
      loads: this.loads.length,
      motors: this.motors.length,
      baseMVA: this.base.MVA,
      baseKV: this.base.KV,
      isValid: this.isValid,
      validationErrors: this.validationErrors
    };
  }
}

module.exports = ElectricalState;
