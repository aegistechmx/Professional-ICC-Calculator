/**
 * advancedSimulator.js - Advanced dynamic simulator with complete generator models
 * 
 * Responsibility: Integrate complete generator models (AVR + Governor + PSS)
 * NO Express, NO axios, NO UI logic
 */

const { solveFDLF } = require('../fastDecoupled');
const { createCompleteGenerator } = require('./models');
const { applyFaultAtTime } = require('./faultModel');
const { checkSystemStability } = require('./stabilityCriteria');

/**
 * Advanced dynamic simulator with complete generator models
 */
class AdvancedDynamicSimulator {
  constructor(system, options = {}) {
    this.system = JSON.parse(JSON.stringify(system)); // Deep clone
    this.options = {
      dt: 0.01, // Time step (seconds)
      tEnd: 5.0, // End time (seconds)
      method: 'RK4', // 'RK4' or 'Euler'
      powerFlowMethod: 'FDLF',
      maxAngleDiff: Math.PI, // Maximum angle difference
      maxSpeedDeviation: 0.5, // Maximum speed deviation
      ...options
    };

    // Initialize complete generator models
    this.generators = [];
    this.initializeCompleteGenerators();
  }

  /**
   * Initialize complete generator models
   */
  initializeCompleteGenerators() {
    this.system.buses.forEach((bus, i) => {
      if (bus.type === 'PV' && bus.P > 0) {
        const generatorParams = {
          id: i,
          bus: i,
          Pm: bus.P,
          inertia: bus.H || 5.0,
          damping: bus.D || 2.0,
          xd: bus.xd || 0.3,
          xq: bus.xq || 0.4,
          xdPrime: bus.xdPrime || 0.25,
          Tdo: bus.Tdo || 5.0,
          TdoPrime: bus.TdoPrime || 1.0,
          Tqo: bus.Tqo || 1.5,
          
          // AVR parameters
          avr: {
            Ka: bus.avrKa || 200,
            Ta: bus.avrTa || 0.05,
            Vref: bus.Vref || 1.0,
            Vmax: bus.Vmax || 5.0,
            Vmin: bus.Vmin || 0.0
          },
          
          // Governor parameters
          gov: {
            Tg: bus.govTg || 0.3,
            R: bus.govR || 0.05,
            Pref: bus.Pref || bus.P,
            Pmax: bus.Pmax || 1.5,
            Pmin: bus.Pmin || 0.2
          },
          
          // PSS parameters
          pss: {
            K: bus.pssK || 10,
            Tw: bus.pssTw || 10,
            T1: bus.pssT1 || 0.1,
            T2: bus.pssT2 || 0.05,
            T3: bus.pssT3 || 1.0
          }
        };

        this.generators.push(createCompleteGenerator(generatorParams));
      }
    });
  }

  /**
   * Run advanced dynamic simulation with complete models
   * @param {Object} fault - Fault specification
   * @returns {Object} Simulation results
   */
  simulateWithCompleteModels(fault) {
    const results = {
      time: [],
      angles: [],
      speeds: [],
      powers: [],
      voltages: [],
      excitations: [],
      mechanicalPowers: [],
      pssSignals: [],
      stable: true,
      instabilityTime: null,
      maxAngleDiff: 0,
      fault
    };

    let t = 0;
    let currentSystem = JSON.parse(JSON.stringify(this.system));

    console.log(`Starting advanced dynamic simulation with complete models: ${fault.description}`);

    while (t < this.options.tEnd) {
      // Apply fault at specified time
      currentSystem = applyFaultAtTime(currentSystem, fault, t);

      // Solve power flow for current system state
      const pfResult = this.solvePowerFlow(currentSystem);
      
      if (!pfResult.converged) {
        results.stable = false;
        results.instabilityTime = t;
        break;
      }

      // Update all generators with complete models
      this.updateAllGeneratorsComplete(pfResult.voltages, this.options.dt);

      // Check stability
      const stabilityCheck = this.checkCompleteStability();
      if (!stabilityCheck.stable) {
        results.stable = false;
        results.instabilityTime = t;
        results.maxAngleDiff = stabilityCheck.maxAngleDiff;
        break;
      }

      // Store results
      results.time.push(t);
      results.angles.push(this.generators.map(g => g.generator.getState().delta));
      results.speeds.push(this.generators.map(g => g.generator.getState().omega));
      results.powers.push(this.generators.map(g => g.generator.getState().Pe));
      results.excitations.push(this.generators.map(g => g.avr.getState().Efd));
      results.mechanicalPowers.push(this.generators.map(g => g.gov.getState().Pm));
      results.pssSignals.push(this.generators.map(g => g.pss.getState().output));
      results.voltages.push(pfResult.voltages);

      t += this.options.dt;
    }

    console.log(`Advanced dynamic simulation completed: ${results.stable ? 'STABLE' : 'UNSTABLE'}`);
    if (!results.stable) {
      console.log(`Instability detected at t=${results.instabilityTime.toFixed(3)}s`);
    }

    return results;
  }

  /**
   * Solve power flow for current system state
   * @param {Object} system - Current system model
   * @returns {Object} Power flow results
   */
  solvePowerFlow(system) {
    // Update system with current generator angles
    this.generators.forEach((gen, i) => {
      const state = gen.generator.getState();
      const bus = system.buses.find(b => b.id === gen.generator.bus);
      if (bus) {
        bus.voltage = {
          magnitude: 1.0, // Assume constant voltage magnitude
          angle: state.delta // Use generator angle as bus angle
        };
      }
    });

    return solveFDLF(system, {
      tolerance: 1e-6,
      maxIterations: 20
    });
  }

  /**
   * Update all generators with complete models
   * @param {Array} voltages - Voltage results from power flow
   * @param {number} dt - Time step
   */
  updateAllGeneratorsComplete(voltages, dt) {
    this.generators.forEach((gen, i) => {
      const V = voltages[gen.generator.bus];
      if (V) {
        const Vmag = Math.sqrt(V.re * V.re + V.im * V.im);
        const Vang = Math.atan2(V.im, V.re);
        
        // Calculate electrical quantities
        const Vd = Vmag * Math.cos(Vang - gen.generator.getState().delta);
        const Vq = Vmag * Math.sin(Vang - gen.generator.getState().delta);
        
        // Calculate currents (simplified)
        const Id = (gen.generator.getState().Eq - Vq) / gen.generator.xd;
        const Iq = (gen.generator.getState().Ed + Vd) / gen.generator.xq;
        
        const inputs = {
          Vd,
          Vq,
          Id,
          Iq,
          V: Vmag,
          omega: gen.generator.getState().omega
        };

        // Update complete generator model
        const state = gen.generator.getState();
        const avrOutput = gen.avr.updateState(Vmag, gen.pss.getState().output, dt);
        const govOutput = gen.gov.updateState(state.omega, dt);
        const pssOutput = gen.pss.calculateOutput(state.omega);
        
        // Update generator state
        gen.generator.updateState(state, {
          ...inputs,
          Efd: avrOutput,
          Pm: govOutput
        }, dt);
      }
    });
  }

  /**
   * Check system stability with complete models
   * @returns {Object} Stability check results
   */
  checkCompleteStability() {
    const generatorStates = this.generators.map(g => g.generator.getState());
    
    return checkSystemStability(generatorStates, {
      maxAngleDiff: this.options.maxAngleDiff,
      maxSpeedDeviation: this.options.maxSpeedDeviation,
      criteria: ['angle', 'speed', 'energy']
    });
  }

  /**
   * Run multiple fault scenarios with complete models
   * @param {Array} faults - Array of fault specifications
   * @returns {Array} Results for each fault
   */
  simulateMultipleFaultsComplete(faults) {
    const results = [];
    
    console.log(`Simulating ${faults.length} fault scenarios with complete models...`);
    
    faults.forEach((fault, i) => {
      console.log(`\nFault ${i + 1}/${faults.length}: ${fault.description}`);
      
      // Reset all generators
      this.resetAllGenerators();
      
      // Simulate fault with complete models
      const result = this.simulateWithCompleteModels(fault);
      results.push(result);
      
      // Summary
      console.log(`  Result: ${result.stable ? 'STABLE' : 'UNSTABLE'}`);
      if (!result.stable) {
        console.log(`  Instability time: ${result.instabilityTime.toFixed(3)}s`);
        console.log(`  Max angle difference: ${(result.maxAngleDiff * 180 / Math.PI).toFixed(1)}°`);
      }
    });
    
    return results;
  }

  /**
   * Reset all generators to initial state
   */
  resetAllGenerators() {
    this.generators.forEach(gen => {
      if (gen.generator && gen.generator.reset) {
        gen.generator.reset();
      }
      if (gen.avr && gen.avr.reset) {
        gen.avr.reset();
      }
      if (gen.gov && gen.gov.reset) {
        gen.gov.reset();
      }
      if (gen.pss && gen.pss.reset) {
        gen.pss.reset();
      }
    });
  }

  /**
   * Get final generator states
   * @returns {Array} Final states
   */
  getFinalStates() {
    return this.generators.map(gen => ({
      id: gen.generator.id,
      bus: gen.generator.bus,
      generator: gen.generator.getState(),
      avr: gen.avr.getState(),
      governor: gen.gov.getState(),
      pss: gen.pss.getState()
    }));
  }

  /**
   * Calculate comprehensive stability margins
   * @returns {Object} Stability margins
   */
  calculateComprehensiveMargins() {
    const generatorStates = this.generators.map(g => g.generator.getState());
    const stabilityCheck = checkSystemStability(generatorStates, {
      criteria: ['angle', 'speed', 'energy']
    });

    return {
      overallStable: stabilityCheck.overallStable,
      margins: stabilityCheck.criteria,
      criticalGenerators: stabilityCheck.criticalGenerators,
      summary: stabilityCheck.summary
    };
  }
}

module.exports = AdvancedDynamicSimulator;
