/**
 * SimulationCore - Pure Industrial Simulation Engine
 * 
 * This is a completely decoupled, independent simulation engine that:
 * - Does NOT depend on ReactFlow or UI structures
 * - Uses pure electrical system models
 * - Supports real-time event-based simulation
 * - Can run in backend workers independently
 * 
 * Architecture:
 * System Model → Event Queue → Solver → Results
 * 
 * @class SimulationCore
 */
const { ElectricalSystem } = require('../electrical/ElectricalSystem');
const { buildYbus, buildSequenceYbus, buildZeroSequenceYbus } = require('../electrical/YbusBuilder');
const { solveLoadFlow, buildJacobian } = require('../electrical/NewtonRaphsonSolver');
const { calculateFault, calculateFaultScan, sequenceToPhase, phaseToSequence } = require('../electrical/SymmetricalComponents');
const { ProtectionDevice, analyzeCoordination } = require('../protections/ProtectionCoordination');
const { EventEngine, EventTypes } = require('../events/EventEngine');

class SimulationCore {
  /**
   * Create a new simulation engine instance
   * @param {Object} system - ElectricalSystem instance or system configuration
   * @param {Object} options - Simulation options
   * @param {Object} options.solver - Solver configuration { tolerance, maxIterations }
   * @param {Object} options.fault - Fault analysis configuration
   * @param {Object} options.protection - Protection coordination configuration
   * @param {boolean} options.enableDynamic - Enable dynamic simulation
   * @param {number} options.timeStep - Time step for dynamic simulation (s)
   */
  constructor(system, options = {}) {
    this.system = system;
    this.options = {
      solver: {
        tolerance: 1e-6,
        maxIterations: 50,
        ...options.solver
      },
      fault: {
        faultType: '3P',
        ...options.fault
      },
      protection: {
        enableCoordination: false,
        ...options.protection
      },
      enableDynamic: options.enableDynamic || false,
      timeStep: options.timeStep || 0.01,
      ...options
    };
    
    // Simulation state
    this.state = {
      time: 0,
      converged: false,
      iteration: 0,
      events: [],
      results: null
    };
    
    // Event engine for time-based simulation
    this.eventEngine = new EventEngine({
      system: this.system,
      applyEvent: this.applyEvent.bind(this),
      recomputeSystem: this.recomputeSystem.bind(this),
      maxTime: options.maxTime || Infinity,
      timeStep: this.options.timeStep
    });
    
    // Register default event handlers
    this.registerDefaultHandlers();
  }

  /**
   * Register default event handlers
   */
  registerDefaultHandlers() {
    this.eventEngine.registerHandler(EventTypes.FAULT, this.applyFault.bind(this));
    this.eventEngine.registerHandler(EventTypes.SWITCH, this.applySwitch.bind(this));
    this.eventEngine.registerHandler(EventTypes.LOAD_CHANGE, this.applyLoadChange.bind(this));
  }

  /**
   * Recompute system state after event
   * @param {Object} system - System to recompute
   */
  recomputeSystem(system) {
    // Run power flow to recompute system state
    const pfResult = this.runPowerFlow(system);
    return pfResult;
  }

  /**
   * Run power flow analysis
   * @param {Object} systemOverride - Optional system override
   * @returns {Object} Power flow results
   */
  runPowerFlow(systemOverride = null) {
    const system = systemOverride || this.system;
    
    // Build Ybus matrix
    const Ybus = buildYbus(system.buses, system.lines);
    
    // Solve load flow using Newton-Raphson
    const result = solveLoadFlow(system.buses, Ybus, this.options.solver);
    
    // Update system with results
    if (result.converged) {
      system.buses.forEach((bus, i) => {
        bus.V = result.V[i];
        bus.theta = result.theta[i];
        bus.P = result.P[i];
        bus.Q = result.Q[i];
      });
    }
    
    this.state.converged = result.converged;
    this.state.iteration = result.iterations;
    
    return {
      success: result.converged,
      converged: result.converged,
      iterations: result.iterations,
      tolerance: result.tolerance,
      buses: system.buses.map((bus, i) => ({
        id: bus.id,
        type: bus.type,
        V: result.V[i],
        theta: result.theta[i],
        P: result.P[i],
        Q: result.Q[i]
      }))
    };
  }

  /**
   * Run fault analysis
   * @param {Object} faultConfig - Fault configuration
   * @param {string} faultConfig.type - Fault type ('3P', 'LL', 'LG', 'LLG')
   * @param {string} faultConfig.busId - Target bus ID (null for all buses)
   * @param {Object} faultConfig.options - Additional fault options
   * @returns {Object} Fault analysis results
   */
  runFaultAnalysis(faultConfig = {}) {
    const {
      type = '3P',
      busId = null,
      options = {}
    } = faultConfig;
    
    const system = this.system;
    
    // Build sequence Ybus for fault analysis
    const sequenceYbus = buildSequenceYbus(system.buses, system.lines);
    
    if (busId) {
      // Single fault analysis
      const busIndex = system.buses.findIndex(b => b.id === busId);
      if (busIndex === -1) {
        return {
          success: false,
          error: `Bus ${busId} not found`
        };
      }
      
      const faultResult = calculateFault(type, busIndex, sequenceYbus, options);
      return {
        success: true,
        faultType: type,
        busId: busId,
        busIndex: busIndex,
        ...faultResult
      };
    } else {
      // Fault scan (all buses)
      const faultResult = calculateFaultScan(sequenceYbus, type, options);
      return {
        success: true,
        faultType: type,
        scan: true,
        ...faultResult
      };
    }
  }

  /**
   * Run protection coordination analysis
   * @param {Object} protectionConfig - Protection configuration
   * @param {Array} protectionConfig.devices - Array of protection devices
   * @returns {Object} Protection coordination results
   */
  runProtection(protectionConfig = {}) {
    const { devices = [] } = protectionConfig;
    
    // Create protection devices from configuration
    const protectionDevices = devices.map(d => new ProtectionDevice(d));
    
    // Analyze coordination
    const coordinationResult = analyzeCoordination(protectionDevices, this.system);
    
    return {
      success: true,
      devices: protectionDevices,
      coordination: coordinationResult
    };
  }

  /**
   * Run dynamic simulation (time-based)
   * @param {Object} dynamicConfig - Dynamic simulation configuration
   * @param {number} dynamicConfig.duration - Simulation duration (s)
   * @param {number} dynamicConfig.timeStep - Time step (s)
   * @returns {Object} Dynamic simulation results
   */
  runDynamicSimulation(dynamicConfig = {}) {
    const {
      duration = 1.0,
      timeStep = this.options.timeStep
    } = dynamicConfig;
    
    const results = {
      time: [],
      voltages: [],
      currents: [],
      frequencies: []
    };
    
    let t = 0;
    while (t < duration) {
      // Step simulation
      const stepResult = this.step(t);
      
      // Store results
      results.time.push(t);
      results.voltages.push(stepResult.voltages);
      results.currents.push(stepResult.currents);
      results.frequencies.push(stepResult.frequencies);
      
      t += timeStep;
    }
    
    return {
      success: true,
      duration: duration,
      timeStep: timeStep,
      results: results
    };
  }

  /**
   * Step simulation forward in time
   * @param {number} time - Current simulation time (s)
   * @returns {Object} Step results
   */
  step(time) {
    // Process events at this time using event engine
    while (!this.eventEngine.queue.empty() && this.eventEngine.queue.peek().time <= time) {
      const event = this.eventEngine.queue.pop();
      this.applyEvent(event);
    }
    
    // Run power flow for current state
    const pfResult = this.runPowerFlow();
    
    // Extract voltages and currents
    const voltages = this.system.buses.map(b => b.V || 1.0);
    const currents = this.system.lines.map(l => l.current || 0);
    const frequencies = this.system.buses.map(b => b.frequency || 60.0);
    
    this.state.time = time;
    
    return {
      time: time,
      converged: pfResult.converged,
      voltages: voltages,
      currents: currents,
      frequencies: frequencies
    };
  }

  /**
   * Apply an event to the system
   * @param {Object} event - Event to apply
   * @param {string} event.type - Event type ('fault', 'switch', 'load_change')
   * @param {Object} event.data - Event data
   */
  applyEvent(event) {
    switch (event.type) {
    case EventTypes.FAULT:
      // Apply fault
      this.applyFault(event.data);
      break;
    case EventTypes.SWITCH:
      // Apply switch operation
      this.applySwitch(event.data);
      break;
    case EventTypes.LOAD_CHANGE:
      // Apply load change
      this.applyLoadChange(event.data);
      break;
    default:
      console.warn(`Unknown event type: ${event.type}`);
    }
    
    // Store event in state
    this.state.events.push(event);
  }

  /**
   * Apply fault event
   * @param {Object} faultData - Fault data
   */
  applyFault(faultData) {
    const { busId, type, impedance } = faultData;
    const bus = this.system.buses.find(b => b.id === busId);
    
    if (!bus) {
      console.error(`Bus ${busId} not found for fault`);
      return false;
    }
    
    // Apply fault to bus
    bus.fault = {
      type,
      impedance: impedance || 0,
      active: true
    };
    
    return true;
  }

  /**
   * Apply switch event
   * @param {Object} switchData - Switch data
   */
  applySwitch(switchData) {
    const { lineId, state } = switchData;
    const line = this.system.lines.find(l => l.id === lineId);
    
    if (!line) {
      console.error(`Line ${lineId} not found for switching`);
      return false;
    }
    
    // Apply switch state
    line.status = state === 'open' ? false : true;
    
    return true;
  }

  /**
   * Apply load change event
   * @param {Object} loadData - Load change data
   */
  applyLoadChange(loadData) {
    const { busId, P, Q } = loadData;
    const bus = this.system.buses.find(b => b.id === busId);
    
    if (!bus) {
      console.error(`Bus ${busId} not found for load change`);
      return false;
    }
    
    // Apply load change
    if (P !== undefined) bus.load.P = P;
    if (Q !== undefined) bus.load.Q = Q;
    
    return true;
  }

  /**
   * Schedule an event
   * @param {Object} event - Event to schedule
   * @returns {string} Event ID
   */
  scheduleEvent(event) {
    return this.eventEngine.schedule(event);
  }

  /**
   * Cancel an event
   * @param {string} eventId - Event ID to cancel
   * @returns {boolean} True if cancelled, false if not found
   */
  cancelEvent(eventId) {
    return this.eventEngine.cancel(eventId);
  }

  /**
   * Reset simulation to initial state
   */
  reset() {
    this.state = {
      time: 0,
      converged: false,
      iteration: 0,
      events: [],
      results: null
    };
    this.eventEngine.reset();
  }

  /**
   * Get current simulation state
   * @returns {Object} Current state
   */
  getState() {
    return {
      ...this.state,
      system: {
        buses: this.system.buses.map(b => ({
          id: b.id,
          type: b.type,
          V: b.V,
          theta: b.theta
        })),
        lines: this.system.lines.map(l => ({
          id: l.id,
          from: l.from,
          to: l.to,
          current: l.current
        }))
      }
    };
  }
}

/**
 * Priority Queue for Event Engine
 * Uses binary heap for O(log n) push/pop operations
 */
class EventQueue {
  constructor() {
    this.events = [];
  }

  /**
   * Push event into queue
   * @param {Object} event - Event to push { time, type, data }
   */
  push(event) {
    this.events.push(event);
    this.bubbleUp(this.events.length - 1);
  }

  /**
   * Pop event with smallest time
   * @returns {Object} Event with smallest time
   */
  pop() {
    if (this.events.length === 0) return null;
    
    const min = this.events[0];
    const end = this.events.pop();
    
    if (this.events.length > 0) {
      this.events[0] = end;
      this.sinkDown(0);
    }
    
    return min;
  }

  /**
   * Peek at event with smallest time without removing
   * @returns {Object} Event with smallest time
   */
  peek() {
    return this.events.length > 0 ? this.events[0] : null;
  }

  /**
   * Check if queue is empty
   * @returns {boolean}
   */
  empty() {
    return this.events.length === 0;
  }

  /**
   * Clear all events
   */
  clear() {
    this.events = [];
  }

  /**
   * Bubble up element to maintain heap property
   * @param {number} index - Index to bubble up
   */
  bubbleUp(index) {
    const element = this.events[index];
    
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.events[parentIndex];
      
      if (element.time >= parent.time) break;
      
      this.events[index] = parent;
      index = parentIndex;
    }
    
    this.events[index] = element;
  }

  /**
   * Sink down element to maintain heap property
   * @param {number} index - Index to sink down
   */
  sinkDown(index) {
    const length = this.events.length;
    const element = this.events[index];
    
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const leftChildIndex = 2 * index + 1;
      const rightChildIndex = 2 * index + 2;
      let swapIndex = null;
      let leftChild, rightChild;
      
      if (leftChildIndex < length) {
        leftChild = this.events[leftChildIndex];
        if (leftChild.time < element.time) {
          swapIndex = leftChildIndex;
        }
      }
      
      if (rightChildIndex < length) {
        rightChild = this.events[rightChildIndex];
        if (
          (swapIndex === null && rightChild.time < element.time) ||
          (swapIndex !== null && rightChild.time < leftChild.time)
        ) {
          swapIndex = rightChildIndex;
        }
      }
      
      if (swapIndex === null) break;
      
      this.events[index] = this.events[swapIndex];
      index = swapIndex;
    }
    
    this.events[index] = element;
  }
}

module.exports = {
  SimulationCore,
  EventQueue
};
