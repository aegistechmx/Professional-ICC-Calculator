/**
 * DeterministicReplay - Deterministic Replay System
 * 
 * This module ensures that the same input always produces the same output:
 * - Strict event queue ordering
 * - No uncontrolled async operations
 * - Seeded random number generation
 * - Complete state capture and restoration
 * 
 * This makes the simulation:
 * - Reproducible → Verifiable → Testable
 * 
 * Architecture:
 * Input → Seed → Simulation → State Snapshot → Replay → Same Output
 * 
 * @class DeterministicReplay
 */

class DeterministicReplay {
  /**
   * Create a new deterministic replay system
   * @param {Object} options - Replay options
   */
  constructor(options = {}) {
    this.options = {
      seed: options.seed || Date.now(),
      enableSnapshot: options.enableSnapshot !== false,
      ...options
    };
    
    this.seed = this.options.seed;
    this.rng = this.createSeededRNG(this.seed);
    
    // State snapshots
    this.snapshots = [];
    this.currentSnapshot = null;
    
    // Event queue (strict ordering)
    this.eventQueue = [];
    this.eventIndex = 0;
  }

  /**
   * Create seeded random number generator
   * @param {number} seed - Random seed
   * @returns {Function} Seeded RNG function
   */
  createSeededRNG(seed) {
    let state = seed;
    
    return () => {
      state = (state * 9301 + 49297) % 233280;
      return state / 233280;
    };
  }

  /**
   * Get seeded random number
   * @returns {number} Random number (0-1)
   */
  random() {
    return this.rng();
  }

  /**
   * Get seeded random integer
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Random integer
   */
  randomInt(min, max) {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /**
   * Capture simulation state
   * @param {Object} system - ElectricalSystem
   * @param {Object} engines - Simulation engines
   * @returns {Object} State snapshot
   */
  captureState(system, engines) {
    const snapshot = {
      timestamp: Date.now(),
      seed: this.seed,
      eventIndex: this.eventIndex,
      system: this.serializeSystem(system),
      engines: this.serializeEngines(engines),
      rngState: this.rng.toString()
    };
    
    this.currentSnapshot = snapshot;
    this.snapshots.push(snapshot);
    
    return snapshot;
  }

  /**
   * Restore simulation state
   * @param {Object} snapshot - State snapshot
   * @param {Object} system - ElectricalSystem
   * @param {Object} engines - Simulation engines
   * @returns {Object} Restored state
   */
  restoreState(snapshot, system, engines) {
    // Restore seed
    this.seed = snapshot.seed;
    this.rng = this.createSeededRNG(this.seed);
    
    // Restore event index
    this.eventIndex = snapshot.eventIndex;
    
    // Restore system state
    this.deserializeSystem(snapshot.system, system);
    
    // Restore engine states
    this.deserializeEngines(snapshot.engines, engines);
    
    this.currentSnapshot = snapshot;
    
    return {
      seed: this.seed,
      eventIndex: this.eventIndex
    };
  }

  /**
   * Serialize system to snapshot
   * @param {Object} system - ElectricalSystem
   * @returns {Object} Serialized system
   */
  serializeSystem(system) {
    return {
      buses: system.buses.map(b => ({
        id: b.id,
        type: b.type,
        voltage: b.voltage,
        generation: b.generation,
        load: b.load
      })),
      lines: system.lines.map(l => ({
        id: l.id,
        from: l.from,
        to: l.to,
        R: l.R,
        X: l.X,
        B: l.B,
        rating: l.rating,
        closed: l.closed !== false
      })),
      trafos: system.trafos.map(t => ({
        id: t.id,
        fromBus: t.fromBus,
        toBus: t.toBus,
        R: t.R,
        X: t.X,
        tap: t.tap
      }))
    };
  }

  /**
   * Deserialize system from snapshot
   * @param {Object} snapshot - Serialized system
   * @param {Object} system - ElectricalSystem
   */
  deserializeSystem(snapshot, system) {
    // Restore buses
    snapshot.buses.forEach(sb => {
      const bus = system.buses.find(b => b.id === sb.id);
      if (bus) {
        bus.type = sb.type;
        bus.voltage = sb.voltage;
        bus.generation = sb.generation;
        bus.load = sb.load;
      }
    });
    
    // Restore lines
    snapshot.lines.forEach(sl => {
      const line = system.lines.find(l => l.id === sl.id);
      if (line) {
        line.R = sl.R;
        line.X = sl.X;
        line.B = sl.B;
        line.rating = sl.rating;
        line.closed = sl.closed;
      }
    });
    
    // Restore trafos
    snapshot.trafos.forEach(st => {
      const trafo = system.trafos.find(t => t.id === st.id);
      if (trafo) {
        trafo.R = st.R;
        trafo.X = st.X;
        trafo.tap = st.tap;
      }
    });
  }

  /**
   * Serialize engines to snapshot
   * @param {Object} engines - Simulation engines
   * @returns {Object} Serialized engines
   */
  serializeEngines(engines) {
    const serialized = {};
    
    Object.keys(engines).forEach(key => {
      const engine = engines[key];
      
      if (engine && engine.state) {
        serialized[key] = {
          state: engine.state,
          options: engine.options || {}
        };
      } else {
        serialized[key] = null;
      }
    });
    
    return serialized;
  }

  /**
   * Deserialize engines from snapshot
   * @param {Object} snapshot - Serialized engines
   * @param {Object} engines - Simulation engines
   */
  deserializeEngines(snapshot, engines) {
    Object.keys(snapshot).forEach(key => {
      const engine = engines[key];
      const engineSnapshot = snapshot[key];
      
      if (engine && engineSnapshot) {
        engine.state = engineSnapshot.state;
        if (engineSnapshot.options) {
          engine.options = engineSnapshot.options;
        }
      }
    });
  }

  /**
   * Add event to queue
   * @param {Object} event - Event object
   */
  addEvent(event) {
    event.id = this.eventIndex++;
    event.timestamp = Date.now();
    this.eventQueue.push(event);
    
    // Sort queue by time (strict ordering)
    this.eventQueue.sort((a, b) => a.time - b.time);
  }

  /**
   * Get next event from queue
   * @returns {Object|null} Next event or null
   */
  getNextEvent() {
    if (this.eventQueue.length === 0) {
      return null;
    }
    
    return this.eventQueue.shift();
  }

  /**
   * Peek at next event without removing
   * @returns {Object|null} Next event or null
   */
  peekNextEvent() {
    if (this.eventQueue.length === 0) {
      return null;
    }
    
    return this.eventQueue[0];
  }

  /**
   * Clear event queue
   */
  clearQueue() {
    this.eventQueue = [];
    this.eventIndex = 0;
  }

  /**
   * Save replay data
   * @param {Object} data - Replay data
   * @returns {string} JSON string
   */
  saveReplay(data) {
    const replayData = {
      seed: this.seed,
      snapshots: this.snapshots,
      eventQueue: this.eventQueue,
      eventIndex: this.eventIndex,
      simulationData: data
    };
    
    return JSON.stringify(replayData);
  }

  /**
   * Load replay data
   * @param {string} jsonString - JSON string
   * @returns {Object} Replay data
   */
  loadReplay(jsonString) {
    const replayData = JSON.parse(jsonString);
    
    this.seed = replayData.seed;
    this.rng = this.createSeededRNG(this.seed);
    this.snapshots = replayData.snapshots || [];
    this.eventQueue = replayData.eventQueue || [];
    this.eventIndex = replayData.eventIndex || 0;
    
    return replayData.simulationData;
  }

  /**
   * Verify replay consistency
   * @param {Object} originalResult - Original simulation result
   * @param {Object} replayResult - Replay simulation result
   * @param {number} tolerance - Tolerance for comparison
   * @returns {Object} Verification result
   */
  verifyReplay(originalResult, replayResult, tolerance = 1e-6) {
    const differences = [];
    
    // Compare voltages
    if (originalResult.voltages && replayResult.voltages) {
      for (let i = 0; i < originalResult.voltages.length; i++) {
        const v1 = typeof originalResult.voltages[i] === 'object' ?
          Math.sqrt(originalResult.voltages[i].re ** 2 + originalResult.voltages[i].im ** 2) :
          originalResult.voltages[i];
        const v2 = typeof replayResult.voltages[i] === 'object' ?
          Math.sqrt(replayResult.voltages[i].re ** 2 + replayResult.voltages[i].im ** 2) :
          replayResult.voltages[i];
        
        const diff = Math.abs(v1 - v2);
        if (diff > tolerance) {
          differences.push({
            type: 'voltage',
            index: i,
            original: v1,
            replay: v2,
            difference: diff
          });
        }
      }
    }
    
    // Compare angles
    if (originalResult.angles && replayResult.angles) {
      for (let i = 0; i < originalResult.angles.length; i++) {
        const diff = Math.abs(originalResult.angles[i] - replayResult.angles[i]);
        if (diff > tolerance) {
          differences.push({
            type: 'angle',
            index: i,
            original: originalResult.angles[i],
            replay: replayResult.angles[i],
            difference: diff
          });
        }
      }
    }
    
    // Compare currents
    if (originalResult.currents && replayResult.currents) {
      for (let i = 0; i < originalResult.currents.length; i++) {
        const diff = Math.abs(originalResult.currents[i] - replayResult.currents[i]);
        if (diff > tolerance) {
          differences.push({
            type: 'current',
            index: i,
            original: originalResult.currents[i],
            replay: replayResult.currents[i],
            difference: diff
          });
        }
      }
    }
    
    return {
      consistent: differences.length === 0,
      differences,
      tolerance
    };
  }

  /**
   * Reset replay system
   */
  reset() {
    this.seed = this.options.seed;
    this.rng = this.createSeededRNG(this.seed);
    this.snapshots = [];
    this.currentSnapshot = null;
    this.eventQueue = [];
    this.eventIndex = 0;
  }
}

module.exports = DeterministicReplay;
