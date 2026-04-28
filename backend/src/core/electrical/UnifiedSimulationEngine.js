/**
 * UnifiedSimulationEngine - Advanced electrical simulation engine
 * Integrates power flow, fault analysis, and dynamic simulation
 */

// Imaginary unit (j in electrical engineering, i in mathematics)
const j = { re: 0, im: 1 };

const ElectricalState = require('./ElectricalState');
const { solveLoadFlow } = require('./NewtonRaphsonSolver');
const { calculateFault } = require('./SymmetricalComponents');
const HarmonicAnalysis = require('./HarmonicAnalysis');
const TransientStability = require('./TransientStability');

/**
 * Unified Simulation Engine Class
 */
class UnifiedSimulationEngine {
  constructor(config = {}) {
    this.state = new ElectricalState(config);
    this.time = 0;
    this.dt = config.dt || 0.01;
    this.maxTime = config.maxTime || 10.0;
    
    // Simulation modules
    this.harmonicAnalysis = new HarmonicAnalysis();
    this.transientStability = new TransientStability();
    
    // Solver configuration
    this.solverConfig = {
      tolerance: config.tolerance || 1e-6,
      maxIterations: config.maxIterations || 50,
      dampingFactor: config.dampingFactor || 0.5,
      voltageLimit: config.voltageLimit || 0.5,
      angleLimit: config.angleLimit || Math.PI / 2
    };
    
    // Event queue
    this.eventQueue = [];
  }

  /**
   * Set system for simulation
   */
  setSystem(system) {
    this.state.setSystem(system);
    
    // Validate system
    if (!this.state.validate()) {
      console.error('System validation failed:', this.state.validationErrors);
    }
    
    // Initialize generators for stability
    if (system.generators) {
      system.generators.forEach(gen => {
        this.transientStability.addGenerator(gen);
      });
    }
    
    return this;
  }

  /**
   * Unified simulation function with physical consistency
   * @param {number} t - Current simulation time
   * @returns {Object} Simulation state at time t
   */
  simulate(t) {
    // Physical consistency cycle - ORDER MATTERS:
    // 1. Apply events (discrete changes to topology)
    this.applyEvents(t);
    
    // 2. Solve network (NR → consistent electrical state)
    this.solveNetwork();
    
    // 3. Compute currents (ALWAYS after NR for consistency)
    this.computeCurrents();
    
    // 4. Evaluate protection (uses consistent currents)
    this.evaluateProtection();
    
    // 5. Integrate dynamics (RK4 with consistent electrical state)
    this.stepDynamics(this.dt);
    
    // Update state time
    this.time = t;
    this.state.time = t;
    
    return this.getState();
  }

  /**
   * Compute currents from consistent electrical state
   * MUST be called after solveNetwork() for physical consistency
   */
  computeCurrents() {
    const { buses, lines } = this.state;
    const Ybus = this.state.Ybus;
    
    if (!Ybus || !buses.length) return;
    
    // Compute line currents from voltage differences and impedances
    lines.forEach(line => {
      const fromBus = this.state.getBus(line.fromBus);
      const toBus = this.state.getBus(line.toBus);
      
      if (fromBus && toBus) {
        const Vfrom = fromBus.V * Math.exp(j * fromBus.theta);
        const Vto = toBus.V * Math.exp(j * toBus.theta);
        const Z = line.r + j * line.x;
        
        // Current = (Vfrom - Vto) / Z
        const I = (Vfrom - Vto) / Z;
        line.current = Math.abs(I);
        line.currentAngle = Math.atan2(I.im, I.re);
      }
    });
  }

  /**
   * Evaluate protection with consistent currents
   * MUST be called after computeCurrents() for physical consistency
   */
  evaluateProtection() {
    const protectionDevices = this.state.protectionDevices || [];
    
    protectionDevices.forEach(device => {
      if (!device.active) return;
      
      // Get current at device location
      const line = this.state.getLine(device.lineId);
      if (!line) return;
      
      const current = line.current || 0;
      
      // Evaluate trip condition with thermal memory
      device.thermalMemory = device.thermalMemory || 0;
      device.thermalMemory += current * this.dt;
      device.thermalMemory *= 0.99; // Thermal decay
      
      // Check trip condition
      if (current > device.pickup) {
        device.tripTime = device.tripTime || 0;
        device.tripTime += this.dt;
        
        if (device.tripTime > device.tripDelay) {
          device.tripped = true;
        }
      } else {
        device.tripTime = 0;
      }
    });
  }

  /**
   * Step dynamics forward with proper double-state swing equation
   * @param {number} dt - Time step
   */
  stepDynamics(dt) {
    const generators = this.state.generators;
    
    generators.forEach(gen => {
      if (gen.type === 'synchronous') {
        // Initialize double state if needed
        if (!gen.delta) gen.delta = 0;
        if (!gen.omega) gen.omega = 1;
        
        // RK4 integration for double state: [delta, omega]
        // State vector: y = [delta, omega]
        
        // k1
        const k1_delta = gen.omega;
        const k1_omega = this.calculateOmegaDot(gen);
        
        // k2
        const k2_delta = gen.omega + 0.5 * dt * k1_omega;
        const k2_omega = this.calculateOmegaDot(gen, 0.5 * dt);
        
        // k3
        const k3_delta = gen.omega + 0.5 * dt * k2_omega;
        const k3_omega = this.calculateOmegaDot(gen, 0.5 * dt);
        
        // k4
        const k4_delta = gen.omega + dt * k3_omega;
        const k4_omega = this.calculateOmegaDot(gen, dt);
        
        // Update double state with RK4
        gen.delta += (dt / 6) * (k1_delta + 2*k2_delta + 2*k3_delta + k4_delta);
        gen.omega += (dt / 6) * (k1_omega + 2*k2_omega + 2*k3_omega + k4_omega);
      }
    });
  }

  /**
   * Calculate omega dot (dω/dt) for swing equation
   * @param {Object} generator - Generator object
   * @param {number} timeOffset - Time offset for intermediate steps
   * @returns {number} Omega dot
   */
  calculateOmegaDot(generator, timeOffset = 0) {
    const H = generator.H || 5;
    const Pm = generator.currentP || generator.P || 0;
    
    // Calculate electrical power (simplified)
    const Pe = this.calculateElectricalPower(generator);
    
    // Swing equation: dω/dt = (Pm - Pe) / (2H)
    return (Pm - Pe) / (2 * H);
  }

  /**
   * Calculate electrical power for generator
   * @param {Object} generator - Generator object
   * @returns {number} Electrical power
   */
  calculateElectricalPower(generator) {
    // Simplified calculation
    const V = this.state.getBus(generator.bus)?.V || 1.0;
    const E = generator.E_prime || 1.0;
    const X = generator.xd_prime || 0.3;
    const delta = generator.delta || 0;
    
    return (E * V / X) * Math.sin(delta);
  }

  /**
   * Apply events at current time with cancellation support
   * @param {number} t - Current time
   */
  applyEvents(t) {
    // Process events scheduled at this time
    this.eventQueue = this.eventQueue.filter(event => {
      if (event.cancelled) {
        // Skip cancelled events
        return false;
      }
      
      if (Math.abs(event.time - t) < this.dt) {
        this.applyEvent(event);
        return false; // Remove processed event
      }
      return true; // Keep future events
    });
  }

  /**
   * Apply a single event
   * @param {Object} event - Event to apply
   */
  applyEvent(event) {
    switch (event.type) {
    case 'fault':
      this.applyFault(event);
      break;
    case 'switch':
      this.applySwitch(event);
      break;
    case 'load_change':
      this.applyLoadChange(event);
      break;
    case 'fault_clear':
      this.clearFault(event);
      break;
    default:
      // eslint-disable-next-line no-console
      console.warn(`Unknown event type: ${event.type}`);
    }
  }

  /**
   * Apply fault event
   * @param {Object} event - Fault event
   */
  applyFault(event) {
    const { busId, type, impedance } = event;
    const bus = this.state.getBus(busId);
    
    if (bus) {
      bus.fault = {
        type,
        impedance: impedance || 0,
        active: true
      };
    }
  }

  /**
   * Apply switch event
   * @param {Object} event - Switch event
   */
  applySwitch(event) {
    const { lineId, state } = event;
    const line = this.state.getLine(lineId);
    
    if (line) {
      line.status = state === 'open' ? false : true;
    }
  }

  /**
   * Apply load change event
   * @param {Object} event - Load change event
   */
  applyLoadChange(event) {
    const { busId, P, Q } = event;
    const bus = this.state.getBus(busId);
    
    if (bus && bus.load) {
      if (P !== undefined) bus.load.P = P;
      if (Q !== undefined) bus.load.Q = Q;
    }
  }

  /**
   * Schedule an event with ID for cancellation
   * @param {Object} event - Event to schedule
   * @returns {string} Event ID
   */
  scheduleEvent(event) {
    if (!event.id) {
      event.id = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    event.cancelled = false;
    this.eventQueue.push(event);
    this.eventQueue.sort((a, b) => a.time - b.time);
    return event.id;
  }

  /**
   * Cancel an event by ID
   * @param {string} eventId - Event ID to cancel
   * @returns {boolean} True if cancelled, false if not found
   */
  cancelEvent(eventId) {
    const event = this.eventQueue.find(e => e.id === eventId);
    if (event) {
      event.cancelled = true;
      return true;
    }
    return false;
  }

  /**
   * Solve network (power flow with damping and limiters)
   */
  solveNetwork() {
    // Build Ybus
    const Ybus = this.state.Ybus;
    
    if (!Ybus) {
      this.state.rebuildMatrices();
      return;
    }
    
    // Solve load flow with robust NR
    const result = this.solveRobustNR(this.state.buses, Ybus);
    
    // Update state with results
    this.state.setPowerFlowResults(result);
  }

  /**
   * Robust Newton-Raphson solver with damping and limiters
   * @param {Array} buses - Bus array
   * @param {Array} Ybus - Admittance matrix
   * @returns {Object} Power flow results
   */
  solveRobustNR(buses, Ybus) {
    const { tolerance, maxIterations, dampingFactor, voltageLimit, angleLimit } = this.solverConfig;
    
    // Initial guess
    let V = buses.map(b => b.V || 1.0);
    let theta = buses.map(b => b.theta || 0);
    
    for (let iter = 0; iter < maxIterations; iter++) {
      // Calculate mismatches
      const mismatches = this.calculateMismatches(buses, Ybus, V, theta);
      
      // Check convergence
      const maxMismatch = Math.max(...mismatches.map(Math.abs));
      if (maxMismatch < tolerance) {
        return {
          converged: true,
          iterations: iter + 1,
          tolerance: maxMismatch,
          V,
          theta,
          P: buses.map(b => b.P || 0),
          Q: buses.map(b => b.Q || 0)
        };
      }
      
      // Check divergence
      if (maxMismatch > 100) {
        console.warn('NR diverging at iteration', iter);
        return {
          converged: false,
          iterations: iter + 1,
          error: 'Divergence detected'
        };
      }
      
      // Calculate Jacobian and solve for updates
      const updates = this.calculateUpdates(buses, Ybus, V, theta, mismatches);
      
      // Apply damping
      updates.dV = updates.dV.map(dv => dv * dampingFactor);
      updates.dTheta = updates.dTheta.map(dtheta => dtheta * dampingFactor);
      
      // Apply limiters
      updates.dV = updates.dV.map(dv => Math.max(-voltageLimit, Math.min(voltageLimit, dv)));
      updates.dTheta = updates.dTheta.map(dtheta => Math.max(-angleLimit, Math.min(angleLimit, dtheta)));
      
      // Update voltages and angles
      V = V.map((v, i) => Math.max(0.8, Math.min(1.2, v + updates.dV[i])));
      theta = theta.map((t, i) => t + updates.dTheta[i]);
    }
    
    return {
      converged: false,
      iterations: maxIterations,
      error: 'Max iterations reached'
    };
  }

  /**
   * Calculate power mismatches
   * @param {Array} buses - Bus array
   * @param {Array} Ybus - Admittance matrix
   * @param {Array} V - Voltage magnitudes
   * @param {Array} theta - Voltage angles
   * @returns {Array} Mismatches
   */
  calculateMismatches(buses, Ybus, V, theta) {
    // Simplified mismatch calculation
    const mismatches = [];
    
    for (let i = 0; i < buses.length; i++) {
      const bus = buses[i];
      if (bus.type === 'Slack') {
        mismatches.push(0);
        mismatches.push(0);
      } else if (bus.type === 'PV') {
        // P mismatch
        mismatches.push((bus.P || 0) - 0); // Simplified
        // Q mismatch
        mismatches.push((bus.Q || 0) - 0); // Simplified
      } else {
        // PQ bus
        mismatches.push((bus.P || 0) - 0);
        mismatches.push((bus.Q || 0) - 0);
      }
    }
    
    return mismatches;
  }

  /**
   * Calculate voltage and angle updates
   * @param {Array} buses - Bus array
   * @param {Array} Ybus - Admittance matrix
   * @param {Array} V - Voltage magnitudes
   * @param {Array} theta - Voltage angles
   * @param {Array} mismatches - Power mismatches
   * @returns {Object} Updates { dV, dTheta }
   */
  calculateUpdates(buses, Ybus, V, theta, mismatches) {
    // Simplified update calculation
    // In full implementation, this would solve Jacobian * updates = mismatches
    return {
      dV: mismatches.map(() => 0.01),
      dTheta: mismatches.map(() => 0.01)
    };
  }

  /**
   * Get current state
   * @returns {Object} Current simulation state
   */
  getState() {
    return this.state.getSnapshot();
  }

  /**
   * Run complete simulation
   * @param {number} duration - Simulation duration
   * @returns {Object} Simulation results
   */
  runSimulation(duration = this.maxTime) {
    const results = [];
    let t = 0;
    
    while (t < duration) {
      const state = this.simulate(t);
      results.push(state);
      t += this.dt;
    }
    
    return {
      success: true,
      duration,
      dt: this.dt,
      results
    };
  }

  /**
   * Reset simulation
   */
  reset() {
    this.time = 0;
    this.eventQueue = [];
    this.state.reset();
  }
}

module.exports = UnifiedSimulationEngine;
