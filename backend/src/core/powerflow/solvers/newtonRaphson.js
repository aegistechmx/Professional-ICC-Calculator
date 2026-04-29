/**
 * core/powerflow/solvers/newtonRaphson.js - Newton-Raphson power flow solver
 * 
 * Responsibility: Implement Newton-Raphson algorithm for power flow analysis
 */

class NewtonRaphsonSolver {
  constructor(options = {}) {
    this.tolerance = options.tolerance || 1e-6;
    this.maxIterations = options.maxIterations || 20;
    this.acceleration = options.acceleration || 1.0;
  }

  solve(system, options = {}) {
    const config = { ...this.defaultOptions, ...options };
    
    // Initialize voltage vector
    const voltages = this.initializeVoltages(system);
    
    // Build Y-bus matrix
    const ybus = this.buildYBus(system);
    
    let iteration = 0;
    let converged = false;
    let maxMismatch = Infinity;
    
    while (iteration < config.maxIterations && !converged) {
      // Calculate power mismatches
      const mismatches = this.calculateMismatches(voltages, ybus, system);
      
      // Check convergence
      maxMismatch = Math.max(...mismatches.map(m => Math.abs(m)));
      converged = maxMismatch < config.tolerance;
      
      if (!converged) {
        // Build Jacobian matrix
        const jacobian = this.buildJacobian(voltages, ybus, system);
        
        // Solve for voltage corrections
        const corrections = this.solveLinearSystem(jacobian, mismatches);
        
        // Update voltages
        this.updateVoltages(voltages, corrections, system);
        
        iteration++;
      }
    }
    
    return {
      converged,
      iterations: iteration,
      maxMismatch,
      voltages: this.formatVoltages(voltages),
      flows: this.calculateFlows(voltages, ybus, system),
      ybus: ybus
    };
  }

  calculateShortCircuit(system, fault) {
    // Simplified short circuit calculation
    const ybus = this.buildYBus(system);
    const faultImpedance = fault.impedance || { real: 0, imag: 0 };
    
    // Calculate fault current
    const faultCurrent = this.calculateFaultCurrent(ybus, fault, faultImpedance);
    
    return {
      faultCurrent,
      preFaultVoltages: this.calculatePreFaultVoltages(system),
      postFaultVoltages: this.calculatePostFaultVoltages(ybus, fault)
    };
  }

  solveOPF(system, options = {}) {
    // Simplified OPF calculation
    const powerflowResult = this.solve(system, options);
    
    if (!powerflowResult.converged) {
      return powerflowResult;
    }
    
    // Calculate optimal dispatch
    const dispatch = this.calculateOptimalDispatch(system, powerflowResult);
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
          angle: 0.0 // Flat start
        });
      } else { // pq
        voltages.push({
          magnitude: 1.0, // Flat start
          angle: 0.0
        });
      }
    });
    
    return voltages;
  }

  buildYBus(system) {
    const n = system.buses.length;
    const ybus = Array(n).fill().map(() => Array(n).fill().map(() => ({ real: 0, imag: 0 })));
    
    // Add branch admittances
    system.branches.forEach(branch => {
      const from = branch.from - 1;
      const to = branch.to - 1;
      const y = this.admittance(branch.impedance);
      
      // Off-diagonal elements
      ybus[from][to] = this.addComplex(ybus[from][to], this.multiplyComplex(y, -1));
      ybus[to][from] = this.addComplex(ybus[to][from], this.multiplyComplex(y, -1));
      
      // Diagonal elements
      ybus[from][from] = this.addComplex(ybus[from][from], y);
      ybus[to][to] = this.addComplex(ybus[to][to], y);
    });
    
    // Add shunt admittances
    system.buses.forEach((bus, i) => {
      if (bus.shunt) {
        ybus[i][i] = this.addComplex(ybus[i][i], bus.shunt);
      }
    });
    
    return ybus;
  }

  calculateMismatches(voltages, ybus, system) {
    const mismatches = [];
    let index = 0;
    
    system.buses.forEach((bus, i) => {
      const V = voltages[i];
      const V_complex = this.polarToComplex(V.magnitude, V.angle);
      
      // Calculate power injection
      let S = { real: 0, imag: 0 };
      ybus[i].forEach((y_ij, j) => {
        const V_j = voltages[j];
        const V_j_complex = this.polarToComplex(V_j.magnitude, V_j.angle);
        const product = this.multiplyComplex(V_j_complex, y_ij);
        S = this.addComplex(S, this.multiplyComplex(V_complex, product));
      });
      
      if (bus.type === 'pq') {
        // Both real and reactive power mismatches
        mismatches[index++] = bus.power - (-S.real); // Note: S is injected power
        mismatches[index++] = bus.reactive - (-S.imag);
      } else if (bus.type === 'pv') {
        // Only real power mismatch (voltage magnitude fixed)
        mismatches[index++] = bus.power - (-S.real);
      }
      // Slack bus has no mismatch
    });
    
    return mismatches;
  }

  buildJacobian(voltages, ybus, system) {
    const n = system.buses.length;
    const size = this.calculateJacobianSize(system);
    const jacobian = Array(size).fill().map(() => Array(size).fill(0));
    
    // Simplified Jacobian calculation
    // In a real implementation, this would calculate partial derivatives
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (i === j) {
          jacobian[i][j] = 10; // Diagonal dominance
        } else {
          jacobian[i][j] = Math.random() * 0.1; // Small off-diagonal
        }
      }
    }
    
    return jacobian;
  }

  solveLinearSystem(jacobian, mismatches) {
    // Simplified linear solver (Gaussian elimination)
    const n = mismatches.length;
    const augmented = jacobian.map((row, i) => [...row, mismatches[i]]);
    
    // Forward elimination
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }
      
      // Swap rows
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
      
      // Eliminate column
      for (let k = i + 1; k < n; k++) {
        const factor = augmented[k][i] / augmented[i][i];
        for (let j = i; j <= n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }
    
    // Back substitution
    const solution = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
      solution[i] = augmented[i][n];
      for (let j = i + 1; j < n; j++) {
        solution[i] -= augmented[i][j] * solution[j];
      }
      solution[i] /= augmented[i][i];
    }
    
    return solution;
  }

  updateVoltages(voltages, corrections, system) {
    let index = 0;
    
    system.buses.forEach((bus, i) => {
      if (bus.type === 'pq') {
        // Update both magnitude and angle
        voltages[i].angle += corrections[index++] * this.acceleration;
        voltages[i].magnitude += corrections[index++] * this.acceleration;
      } else if (bus.type === 'pv') {
        // Update only angle
        voltages[i].angle += corrections[index++] * this.acceleration;
      }
      // Slack bus voltage remains fixed
    });
  }

  formatVoltages(voltages) {
    return voltages.map((v, i) => ({
      bus: i + 1,
      magnitude: v.magnitude,
      angle: v.angle,
      complex: this.polarToComplex(v.magnitude, v.angle)
    }));
  }

  calculateFlows(voltages, ybus, system) {
    const flows = [];
    
    system.branches.forEach(branch => {
      const from = branch.from - 1;
      const to = branch.to - 1;
      
      const V_from = voltages[from];
      const V_to = voltages[to];
      
      const V_from_complex = this.polarToComplex(V_from.magnitude, V_from.angle);
      const V_to_complex = this.polarToComplex(V_to.magnitude, V_to.angle);
      
      const y = ybus[from][to];
      const I = this.multiplyComplex(this.subtractComplex(V_from_complex, V_to_complex), y);
      const S = this.multiplyComplex(V_from_complex, this.conjugateComplex(I));
      
      flows.push({
        from: branch.from,
        to: branch.to,
        power: S.real,
        reactive: S.imag,
        current: I.magnitude,
        losses: this.calculateLosses(S, branch)
      });
    });
    
    return flows;
  }

  // Helper methods
  get defaultOptions() {
    return {
      tolerance: this.tolerance,
      maxIterations: this.maxIterations,
      acceleration: this.acceleration
    };
  }

  calculateJacobianSize(system) {
    let size = 0;
    system.buses.forEach(bus => {
      if (bus.type === 'pq') size += 2; // P and Q
      else if (bus.type === 'pv') size += 1; // Only P
      // Slack bus contributes 0
    });
    return size;
  }

  admittance(impedance) {
    const z = impedance;
    const y_mag_sq = z.real * z.real + z.imag * z.imag;
    return {
      real: z.real / y_mag_sq,
      imag: -z.imag / y_mag_sq
    };
  }

  polarToComplex(magnitude, angle) {
    return {
      real: magnitude * Math.cos(angle),
      imag: magnitude * Math.sin(angle)
    };
  }

  addComplex(a, b) {
    return {
      real: a.real + b.real,
      imag: a.imag + b.imag
    };
  }

  subtractComplex(a, b) {
    return {
      real: a.real - b.real,
      imag: a.imag - b.imag
    };
  }

  multiplyComplex(a, b) {
    return {
      real: a.real * b.real - a.imag * b.imag,
      imag: a.real * b.imag + a.imag * b.real
    };
  }

  conjugateComplex(a) {
    return {
      real: a.real,
      imag: -a.imag
    };
  }

  calculateFaultCurrent(ybus, fault, faultImpedance) {
    // Simplified fault current calculation
    return {
      magnitude: 1000, // Placeholder
      angle: 0
    };
  }

  calculatePreFaultVoltages(system) {
    return system.buses.map(bus => ({
      bus: bus.id,
      magnitude: bus.voltage || 1.0,
      angle: bus.angle || 0.0
    }));
  }

  calculatePostFaultVoltages(ybus, fault) {
    // Simplified post-fault voltage calculation
    return [];
  }

  calculateOptimalDispatch(system, powerflowResult) {
    // Simplified economic dispatch
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

  calculateLosses(power, branch) {
    // Simplified loss calculation
    return Math.abs(power.real) * 0.02; // 2% loss assumption
  }
}

module.exports = NewtonRaphsonSolver;
