/**
 * PowerFlowEngine - Decoupled Power Flow Solver
 * 
 * This is a completely independent power flow engine that:
 * - Does NOT depend on ReactFlow or UI structures
 * - Uses pure ElectricalSystem models
 * - Can run in backend workers independently
 * - Supports multiple solver methods
 * 
 * Architecture:
 * ElectricalSystem → Ybus Builder → Solver → Results
 * 
 * @class PowerFlowEngine
 */

const { buildYbus, buildSequenceYbus, buildZeroSequenceYbus } = require('../electrical/YbusBuilder');
const { solveLoadFlow, buildJacobian } = require('../electrical/NewtonRaphsonSolver');
const { ElectricalSystem } = require('../electrical/ElectricalSystem');
const { Complex } = require('../electrical/Complex');

class PowerFlowEngine {
  /**
   * Create a new power flow engine
   * @param {Object} options - Engine options
   * @param {string} options.solver - Solver method ('newton-raphson', 'fast-decoupled', 'gauss-seidel')
   * @param {Object} options.solverConfig - Solver configuration
   */
  constructor(options = {}) {
    this.options = {
      solver: options.solver || 'newton-raphson',
      solverConfig: {
        tolerance: 1e-6,
        maxIterations: 50,
        ...options.solverConfig
      },
      ...options
    };
    
    this.results = null;
    this.system = null;
  }

  /**
   * Run power flow analysis on an electrical system
   * @param {ElectricalSystem} system - ElectricalSystem instance
   * @returns {Object} Power flow results
   */
  run(system) {
    this.system = system;
    
    // Validate system
    if (!system || !system.buses || system.buses.length === 0) {
      return {
        success: false,
        error: 'Invalid system: no buses found'
      };
    }
    
    // Check for slack bus
    const slackBuses = system.buses.filter(b => b.type === 'SLACK');
    if (slackBuses.length === 0) {
      return {
        success: false,
        error: 'No slack bus found in system'
      };
    }
    
    // Build Ybus matrix
    const YbusResult = buildYbus(system.buses, system.lines);
    
    // Solve power flow
    const solverResult = this.solve(system.buses, YbusResult);
    
    if (!solverResult.converged) {
      return {
        success: false,
        error: 'Power flow did not converge',
        solverResult: solverResult
      };
    }
    
    // Update system with results
    system.buses.forEach((bus, i) => {
      bus.V = solverResult.V[i];
      bus.theta = solverResult.theta[i];
      bus.P = solverResult.P[i];
      bus.Q = solverResult.Q[i];
    });
    
    // Calculate line flows
    const lineFlows = this.calculateLineFlows(system.buses, system.lines, YbusResult);
    
    // Prepare results
    this.results = {
      success: true,
      converged: solverResult.converged,
      iterations: solverResult.iterations,
      tolerance: solverResult.tolerance,
      maxError: solverResult.maxError,
      buses: system.buses.map((bus, i) => ({
        id: bus.id,
        type: bus.type,
        V: solverResult.V[i],
        theta: solverResult.theta[i],
        P: solverResult.P[i],
        Q: solverResult.Q[i]
      })),
      lines: lineFlows,
      system: {
        P_loss: solverResult.P_loss,
        Q_loss: solverResult.Q_loss
      }
    };
    
    return this.results;
  }

  /**
   * Solve power flow using selected method
   * @param {Array} buses - Array of bus objects
   * @param {Object} Ybus - Ybus matrix
   * @returns {Object} Solver results
   */
  solve(buses, Ybus) {
    switch (this.options.solver) {
    case 'newton-raphson':
      return this.solveNewtonRaphson(buses, Ybus);
    case 'fast-decoupled':
      return this.solveFastDecoupled(buses, Ybus);
    case 'gauss-seidel':
      return this.solveGaussSeidel(buses, Ybus);
    default:
      return this.solveNewtonRaphson(buses, Ybus);
    }
  }

  /**
   * Newton-Raphson solver
   * @param {Array} buses - Array of bus objects
   * @param {Object} Ybus - Ybus matrix
   * @returns {Object} Solver results
   */
  solveNewtonRaphson(buses, Ybus) {
    return solveLoadFlow(buses, Ybus, this.options.solverConfig);
  }

  /**
   * Fast Decoupled solver (simplified implementation)
   * @param {Array} buses - Array of bus objects
   * @param {Object} Ybus - Ybus matrix
   * @returns {Object} Solver results
   */
  solveFastDecoupled(buses, Ybus) {
    // Simplified fast decoupled implementation
    // In a full implementation, this would use B' and B'' matrices
    const { tolerance, maxIterations } = this.options.solverConfig;
    const n = buses.length;
    
    // Initialize voltage and angle
    const V = buses.map(b => b.V || 1.0);
    const theta = buses.map(b => b.theta || 0.0);
    
    let converged = false;
    let iterations = 0;
    let maxError = Infinity;
    
    while (iterations < maxIterations && !converged) {
      // Calculate power mismatches
      const P_mismatch = [];
      const Q_mismatch = [];
      
      for (let i = 0; i < n; i++) {
        const bus = buses[i];
        if (bus.type === 'SLACK') continue;
        
        let P_calc = 0;
        let Q_calc = 0;
        
        for (let j = 0; j < n; j++) {
          const G = Ybus[i][j].real;
          const B = Ybus[i][j].imag;
          const theta_ij = theta[i] - theta[j];
          
          P_calc += V[i] * V[j] * (G * Math.cos(theta_ij) + B * Math.sin(theta_ij));
          Q_calc += V[i] * V[j] * (G * Math.sin(theta_ij) - B * Math.cos(theta_ij));
        }
        
        P_mismatch[i] = (bus.P || 0) - P_calc;
        Q_mismatch[i] = (bus.Q || 0) - Q_calc;
      }
      
      // Check convergence
      maxError = Math.max(
        ...P_mismatch.filter((_, i) => buses[i].type !== 'SLACK').map(Math.abs),
        ...Q_mismatch.filter((_, i) => buses[i].type === 'PQ').map(Math.abs)
      );
      
      if (maxError < tolerance) {
        converged = true;
        break;
      }
      
      // Update voltages and angles (simplified)
      for (let i = 0; i < n; i++) {
        if (buses[i].type === 'SLACK') continue;
        
        if (buses[i].type === 'PQ') {
          V[i] += P_mismatch[i] * 0.1;
        }
        
        theta[i] += Q_mismatch[i] * 0.01;
      }
      
      iterations++;
    }
    
    return {
      converged,
      iterations,
      maxError,
      tolerance,
      V,
      theta,
      P: buses.map((b, i) => {
        let P_calc = 0;
        for (let j = 0; j < n; j++) {
          const G = Ybus[i][j].real;
          const B = Ybus[i][j].imag;
          const theta_ij = theta[i] - theta[j];
          P_calc += V[i] * V[j] * (G * Math.cos(theta_ij) + B * Math.sin(theta_ij));
        }
        return P_calc;
      }),
      Q: buses.map((b, i) => {
        let Q_calc = 0;
        for (let j = 0; j < n; j++) {
          const G = Ybus[i][j].real;
          const B = Ybus[i][j].imag;
          const theta_ij = theta[i] - theta[j];
          Q_calc += V[i] * V[j] * (G * Math.sin(theta_ij) - B * Math.cos(theta_ij));
        }
        return Q_calc;
      }),
      P_loss: 0,
      Q_loss: 0
    };
  }

  /**
   * Gauss-Seidel solver (simplified implementation)
   * @param {Array} buses - Array of bus objects
   * @param {Object} Ybus - Ybus matrix
   * @returns {Object} Solver results
   */
  solveGaussSeidel(buses, Ybus) {
    // Simplified Gauss-Seidel implementation
    const { tolerance, maxIterations } = this.options.solverConfig;
    const n = buses.length;
    
    // Initialize voltage
    const V = buses.map(b => {
      const angle = b.theta || 0;
      const magnitude = b.V || 1.0;
      return {
        real: magnitude * Math.cos(angle),
        imag: magnitude * Math.sin(angle)
      };
    });
    
    let converged = false;
    let iterations = 0;
    let maxError = Infinity;
    
    while (iterations < maxIterations && !converged) {
      let maxDelta = 0;
      
      for (let i = 0; i < n; i++) {
        const bus = buses[i];
        if (bus.type === 'SLACK') continue;
        
        // Calculate new voltage
        const V_i = new Complex(V[i].real, V[i].imag);
        const numerator = new Complex(bus.P, -bus.Q).divide(V_i.conjugate());
        let denominator = new Complex(0, 0);
        
        for (let j = 0; j < n; j++) {
          if (i !== j) {
            const V_j = new Complex(V[j].real, V[j].imag);
            const Y_ij = new Complex(Ybus[i][j].real, Ybus[i][j].imag);
            denominator = denominator.add(Y_ij.multiply(V_j));
          }
        }
        
        const V_new = numerator.subtract(denominator).divide(new Complex(Ybus[i][i].real, Ybus[i][i].imag));
        
        // Calculate delta
        const delta = V_new.subtract(V_i).magnitude();
        maxDelta = Math.max(maxDelta, delta);
        
        // Update voltage
        V[i] = {
          real: V_new.real,
          imag: V_new.imag
        };
        
        // Fix voltage magnitude for PV buses
        if (bus.type === 'PV' && bus.V) {
          const magnitude = Math.sqrt(V[i].real ** 2 + V[i].imag ** 2);
          V[i].real = V[i].real * bus.V / magnitude;
          V[i].imag = V[i].imag * bus.V / magnitude;
        }
      }
      
      maxError = maxDelta;
      
      if (maxError < tolerance) {
        converged = true;
        break;
      }
      
      iterations++;
    }
    
    // Convert to polar
    const V_mag = V.map(v => Math.sqrt(v.real ** 2 + v.imag ** 2));
    const V_angle = V.map(v => Math.atan2(v.imag, v.real));
    
    return {
      converged,
      iterations,
      maxError,
      tolerance,
      V: V_mag,
      theta: V_angle,
      P: buses.map(b => b.P || 0),
      Q: buses.map(b => b.Q || 0),
      P_loss: 0,
      Q_loss: 0
    };
  }

  /**
   * Calculate line flows
   * @param {Array} buses - Array of bus objects
   * @param {Array} lines - Array of line objects
   * @param {Object} Ybus - Ybus matrix
   * @returns {Array} Line flow results
   */
  calculateLineFlows(buses, lines, Ybus) {
    return lines.map(line => {
      const fromIndex = buses.findIndex(b => b.id === line.from);
      const toIndex = buses.findIndex(b => b.id === line.to);
      
      if (fromIndex === -1 || toIndex === -1) {
        return {
          id: line.id,
          from: line.from,
          to: line.to,
          P_flow: 0,
          Q_flow: 0,
          S_flow: 0,
          I_flow: 0
        };
      }
      
      const V_from = buses[fromIndex].V;
      const theta_from = buses[fromIndex].theta;
      const V_to = buses[toIndex].V;
      const theta_to = buses[toIndex].theta;
      
      const Y = Ybus[fromIndex][toIndex];
      const theta_diff = theta_from - theta_to;
      
      const I_real = V_from * Math.cos(theta_from) * Y.real - V_from * Math.sin(theta_from) * Y.imag -
                     V_to * Math.cos(theta_to) * Y.real + V_to * Math.sin(theta_to) * Y.imag;
      const I_imag = V_from * Math.sin(theta_from) * Y.real + V_from * Math.cos(theta_from) * Y.imag -
                     V_to * Math.sin(theta_to) * Y.real - V_to * Math.cos(theta_to) * Y.imag;
      
      const V_from_complex = new Complex(V_from * Math.cos(theta_from), V_from * Math.sin(theta_from));
      const I_complex = new Complex(I_real, I_imag);
      const S_complex = V_from_complex.multiply(I_complex.conjugate());
      
      return {
        id: line.id,
        from: line.from,
        to: line.to,
        P_flow: S_complex.real,
        Q_flow: S_complex.imag,
        S_flow: Math.abs(S_complex),
        I_flow: Math.abs(I_complex)
      };
    });
  }

  /**
   * Get results
   * @returns {Object} Power flow results
   */
  getResults() {
    return this.results;
  }

  /**
   * Get system state
   * @returns {Object} System state
   */
  getSystemState() {
    if (!this.system) return null;
    
    return {
      buses: this.system.buses.map(b => ({
        id: b.id,
        type: b.type,
        V: b.V,
        theta: b.theta,
        P: b.P,
        Q: b.Q
      })),
      lines: this.system.lines.map(l => ({
        id: l.id,
        from: l.from,
        to: l.to,
        R: l.R,
        X: l.X,
        B: l.B
      }))
    };
  }
}

module.exports = PowerFlowEngine;
