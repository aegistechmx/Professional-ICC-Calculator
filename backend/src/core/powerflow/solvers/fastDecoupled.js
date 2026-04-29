/**
 * core/powerflow/solvers/fastDecoupled.js - Fast Decoupled power flow solver
 * 
 * Responsibility: Implement Fast Decoupled Load Flow algorithm
 */

class FastDecoupledSolver {
  constructor(options = {}) {
    this.tolerance = options.tolerance || 1e-6;
    this.maxIterations = options.maxIterations || 20;
    this.acceleration = options.acceleration || 1.0;
  }

  solve(system, options = {}) {
    const config = { ...this.defaultOptions, ...options };
    
    // Initialize voltage vector
    const voltages = this.initializeVoltages(system);
    
    // Build B' and B'' matrices
    const { bPrime, bDoublePrime } = this.buildDecoupledMatrices(system);
    
    let iteration = 0;
    let converged = false;
    let maxMismatch = Infinity;
    
    while (iteration < config.maxIterations && !converged) {
      // Calculate power mismatches
      const mismatches = this.calculateMismatches(voltages, system);
      
      // Check convergence
      maxMismatch = Math.max(...mismatches.map(m => Math.abs(m)));
      converged = maxMismatch < config.tolerance;
      
      if (!converged) {
        // Decoupled updates
        this.updateAngles(voltages, mismatches, bPrime, system);
        this.updateMagnitudes(voltages, mismatches, bDoublePrime, system);
        
        iteration++;
      }
    }
    
    return {
      converged,
      iterations: iteration,
      maxMismatch,
      voltages: this.formatVoltages(voltages),
      flows: this.calculateFlows(voltages, system)
    };
  }

  calculateShortCircuit(system, fault) {
    // Simplified short circuit calculation
    return {
      faultCurrent: { magnitude: 1000, angle: 0 },
      preFaultVoltages: this.calculatePreFaultVoltages(system),
      postFaultVoltages: []
    };
  }

  solveOPF(system, options = {}) {
    const powerflowResult = this.solve(system, options);
    
    if (!powerflowResult.converged) {
      return powerflowResult;
    }
    
    const dispatch = this.calculateOptimalDispatch(system);
    const totalCost = this.calculateTotalCost(dispatch, system.costs);
    
    return {
      ...powerflowResult,
      converged: true,
      totalCost,
      generatorDispatch: dispatch,
      violations: []
    };
  }

  initializeVoltages(system) {
    const voltages = [];
    
    system.buses.forEach(bus => {
      if (bus.type === 'slack') {
        voltages.push({
          magnitude: bus.voltage || 1.0,
          angle: bus.angle || 0.0
        });
      } else if (bus.type === 'pv') {
        voltages.push({
          magnitude: bus.voltage || 1.0,
          angle: 0.0
        });
      } else {
        voltages.push({
          magnitude: 1.0,
          angle: 0.0
        });
      }
    });
    
    return voltages;
  }

  buildDecoupledMatrices(system) {
    const n = system.buses.length;
    const bPrime = Array(n).fill().map(() => Array(n).fill(0));
    const bDoublePrime = Array(n).fill().map(() => Array(n).fill(0));
    
    // Simplified B' and B'' matrix construction
    system.branches.forEach(branch => {
      const from = branch.from - 1;
      const to = branch.to - 1;
      
      const b = -1 / Math.sqrt(branch.impedance.real * branch.impedance.real + branch.impedance.imag * branch.impedance.imag);
      
      bPrime[from][to] = b;
      bPrime[to][from] = b;
      bPrime[from][from] -= b;
      bPrime[to][to] -= b;
      
      bDoublePrime[from][to] = b;
      bDoublePrime[to][from] = b;
      bDoublePrime[from][from] -= b;
      bDoublePrime[to][to] -= b;
    });
    
    return { bPrime, bDoublePrime };
  }

  calculateMismatches(voltages, system) {
    const mismatches = [];
    let index = 0;
    
    system.buses.forEach((bus, i) => {
      const V = voltages[i];
      
      if (bus.type === 'pq') {
        mismatches[index++] = bus.power - this.calculateRealPower(V, i, voltages, system);
        mismatches[index++] = bus.reactive - this.calculateReactivePower(V, i, voltages, system);
      } else if (bus.type === 'pv') {
        mismatches[index++] = bus.power - this.calculateRealPower(V, i, voltages, system);
      }
    });
    
    return mismatches;
  }

  calculateRealPower(voltage, busIndex, voltages, system) {
    // Simplified real power calculation
    let power = 0;
    system.branches.forEach(branch => {
      if (branch.from - 1 === busIndex || branch.to - 1 === busIndex) {
        power += voltage.magnitude * 0.1; // Placeholder
      }
    });
    return power;
  }

  calculateReactivePower(voltage, busIndex, voltages, system) {
    // Simplified reactive power calculation
    let power = 0;
    system.branches.forEach(branch => {
      if (branch.from - 1 === busIndex || branch.to - 1 === busIndex) {
        power += voltage.magnitude * 0.05; // Placeholder
      }
    });
    return power;
  }

  updateAngles(voltages, mismatches, bPrime, system) {
    let index = 0;
    
    system.buses.forEach((bus, i) => {
      if (bus.type === 'pv' || bus.type === 'pq') {
        const deltaP = mismatches[index++];
        // Simplified angle update
        voltages[i].angle += deltaP * 0.01 * this.acceleration;
      }
    });
  }

  updateMagnitudes(voltages, mismatches, bDoublePrime, system) {
    let index = 0;
    
    system.buses.forEach((bus, i) => {
      if (bus.type === 'pv') {
        index++; // Skip real power for PV buses
      } else if (bus.type === 'pq') {
        index++; // Skip real power
        const deltaQ = mismatches[index++];
        // Simplified magnitude update
        voltages[i].magnitude += deltaQ * 0.01 * this.acceleration;
      }
    });
  }

  formatVoltages(voltages) {
    return voltages.map((v, i) => ({
      bus: i + 1,
      magnitude: v.magnitude,
      angle: v.angle,
      complex: { real: v.magnitude * Math.cos(v.angle), imag: v.magnitude * Math.sin(v.angle) }
    }));
  }

  calculateFlows(voltages, system) {
    const flows = [];
    
    system.branches.forEach(branch => {
      const from = branch.from - 1;
      const to = branch.to - 1;
      
      const V_from = voltages[from];
      const V_to = voltages[to];
      
      flows.push({
        from: branch.from,
        to: branch.to,
        power: 0.1, // Placeholder
        reactive: 0.05, // Placeholder
        current: 0.2, // Placeholder
        losses: 0.001 // Placeholder
      });
    });
    
    return flows;
  }

  get defaultOptions() {
    return {
      tolerance: this.tolerance,
      maxIterations: this.maxIterations,
      acceleration: this.acceleration
    };
  }

  calculatePreFaultVoltages(system) {
    return system.buses.map(bus => ({
      bus: bus.id,
      magnitude: bus.voltage || 1.0,
      angle: bus.angle || 0.0
    }));
  }

  calculateOptimalDispatch(system) {
    return system.buses
      .filter(bus => bus.type === 'pv' || bus.type === 'slack')
      .map(bus => ({
        bus: bus.id,
        power: bus.power || 0,
        cost: 0
      }));
  }

  calculateTotalCost(dispatch, costs) {
    return dispatch.reduce((total, gen) => {
      const cost = costs[gen.bus];
      return total + (gen.power * (cost?.b || 20));
    }, 0);
  }
}

module.exports = FastDecoupledSolver;
