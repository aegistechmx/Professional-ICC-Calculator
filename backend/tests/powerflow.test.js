/**
 * tests/powerflow.test.js - Comprehensive power flow calculation tests
 * 
 * Responsibility: Test core power flow algorithms and electrical calculations
 */

const { PowerFlowSolver } = require('../src/core/powerflow/solvers');
const Complex = require('../src/shared/math/Complex');

describe('Power Flow Calculations', () => {
  let solver;

  beforeEach(() => {
    solver = new PowerFlowSolver();
  });

  describe('Basic Power Flow', () => {
    test('should solve simple 3-bus system', () => {
      const system = {
        buses: [
          { id: 1, type: 'slack', voltage: 1.0, angle: 0.0 },
          { id: 2, type: 'pv', voltage: 1.0, power: 0.5 },
          { id: 3, type: 'pq', power: -0.3, reactive: -0.1 }
        ],
        branches: [
          { from: 1, to: 2, impedance: { real: 0.01, imag: 0.03 } },
          { from: 2, to: 3, impedance: { real: 0.02, imag: 0.04 } },
          { from: 1, to: 3, impedance: { real: 0.03, imag: 0.06 } }
        ]
      };

      const result = solver.solve(system);

      expect(result.converged).toBe(true);
      expect(result.iterations).toBeLessThan(10);
      expect(result.maxMismatch).toBeLessThan(1e-6);
      
      // Verify voltage magnitudes are within reasonable bounds
      result.voltages.forEach(v => {
        expect(v.magnitude).toBeGreaterThan(0.9);
        expect(v.magnitude).toBeLessThan(1.1);
      });
    });

    test('should handle convergence criteria', () => {
      const system = {
        buses: [
          { id: 1, type: 'slack', voltage: 1.0, angle: 0.0 },
          { id: 2, type: 'pq', power: -0.5, reactive: -0.2 }
        ],
        branches: [
          { from: 1, to: 2, impedance: { real: 0.01, imag: 0.02 } }
        ]
      };

      const result = solver.solve(system, { tolerance: 1e-8, maxIterations: 20 });

      expect(result.converged).toBe(true);
      expect(result.maxMismatch).toBeLessThan(1e-8);
    });
  });

  describe('IEEE Test Systems', () => {
    test('should solve IEEE 5-bus system', () => {
      const ieee5Bus = {
        buses: [
          { id: 1, type: 'slack', voltage: 1.0, angle: 0.0 },
          { id: 2, type: 'pv', voltage: 1.0, power: 0.4 },
          { id: 3, type: 'pv', voltage: 1.0, power: 0.3 },
          { id: 4, type: 'pq', power: -0.3, reactive: -0.1 },
          { id: 5, type: 'pq', power: -0.4, reactive: -0.15 }
        ],
        branches: [
          { from: 1, to: 2, impedance: { real: 0.02, imag: 0.06 } },
          { from: 1, to: 3, impedance: { real: 0.08, imag: 0.24 } },
          { from: 2, to: 3, impedance: { real: 0.06, imag: 0.18 } },
          { from: 2, to: 4, impedance: { real: 0.06, imag: 0.18 } },
          { from: 2, to: 5, impedance: { real: 0.04, imag: 0.12 } },
          { from: 3, to: 4, impedance: { real: 0.01, imag: 0.03 } },
          { from: 4, to: 5, impedance: { real: 0.08, imag: 0.24 } }
        ]
      };

      const result = solver.solve(ieee5Bus);

      expect(result.converged).toBe(true);
      expect(result.voltages).toHaveLength(5);
      
      // Verify power balance
      const totalGeneration = result.flows.reduce((sum, f) => sum + f.power, 0);
      const totalLoad = ieee5Bus.buses
        .filter(b => b.type === 'pq')
        .reduce((sum, b) => sum + Math.abs(b.power), 0);
      
      expect(Math.abs(totalGeneration - totalLoad)).toBeLessThan(0.01);
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero impedance branches', () => {
      const system = {
        buses: [
          { id: 1, type: 'slack', voltage: 1.0, angle: 0.0 },
          { id: 2, type: 'pq', power: -0.1, reactive: -0.05 }
        ],
        branches: [
          { from: 1, to: 2, impedance: { real: 0.001, imag: 0.001 } }
        ]
      };

      expect(() => {
        const result = solver.solve(system);
        expect(result.converged).toBe(true);
      }).not.toThrow();
    });

    test('should handle isolated buses', () => {
      const system = {
        buses: [
          { id: 1, type: 'slack', voltage: 1.0, angle: 0.0 },
          { id: 2, type: 'pq', power: -0.1, reactive: -0.05 },
          { id: 3, type: 'pq', power: -0.2, reactive: -0.1 }
        ],
        branches: [
          { from: 1, to: 2, impedance: { real: 0.01, imag: 0.02 } }
          // Bus 3 is isolated
        ]
      };

      expect(() => {
        solver.solve(system);
      }).toThrow('Isolated bus detected');
    });

    test('should handle multiple slack buses', () => {
      const system = {
        buses: [
          { id: 1, type: 'slack', voltage: 1.0, angle: 0.0 },
          { id: 2, type: 'slack', voltage: 1.02, angle: 0.0 },
          { id: 3, type: 'pq', power: -0.3, reactive: -0.1 }
        ],
        branches: [
          { from: 1, to: 2, impedance: { real: 0.01, imag: 0.02 } },
          { from: 2, to: 3, impedance: { real: 0.02, imag: 0.04 } }
        ]
      };

      expect(() => {
        const result = solver.solve(system);
        expect(result.converged).toBe(true);
      }).not.toThrow();
    });
  });

  describe('Performance Tests', () => {
    test('should solve large system efficiently', () => {
      // Generate 100-bus test system
      const buses = [];
      const branches = [];

      for (let i = 1; i <= 100; i++) {
        if (i === 1) {
          buses.push({ id: i, type: 'slack', voltage: 1.0, angle: 0.0 });
        } else if (i <= 10) {
          buses.push({ id: i, type: 'pv', voltage: 1.0, power: Math.random() * 0.5 });
        } else {
          buses.push({ id: i, type: 'pq', power: -Math.random() * 0.3, reactive: -Math.random() * 0.1 });
        }
      }

      // Create mesh network
      for (let i = 1; i < 100; i++) {
        for (let j = i + 1; j <= Math.min(i + 3, 100); j++) {
          branches.push({
            from: i,
            to: j,
            impedance: { real: 0.01 * Math.random(), imag: 0.03 * Math.random() }
          });
        }
      }

      const startTime = performance.now();
      const result = solver.solve({ buses, branches });
      const endTime = performance.now();

      expect(result.converged).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should solve in under 5 seconds
    });
  });

  describe('Numerical Stability', () => {
    test('should handle ill-conditioned systems', () => {
      const system = {
        buses: [
          { id: 1, type: 'slack', voltage: 1.0, angle: 0.0 },
          { id: 2, type: 'pq', power: -0.999, reactive: -0.999 },
          { id: 3, type: 'pq', power: -0.001, reactive: -0.001 }
        ],
        branches: [
          { from: 1, to: 2, impedance: { real: 0.0001, imag: 0.0001 } },
          { from: 2, to: 3, impedance: { real: 100, imag: 100 } },
          { from: 1, to: 3, impedance: { real: 0.0001, imag: 0.0001 } }
        ]
      };

      expect(() => {
        const result = solver.solve(system);
        expect(result.converged).toBe(true);
      }).not.toThrow();
    });
  });
});

describe('Short Circuit Calculations', () => {
  let solver;

  beforeEach(() => {
    solver = new PowerFlowSolver();
  });

  test('should calculate three-phase fault current', () => {
    const system = {
      buses: [
        { id: 1, type: 'slack', voltage: 1.0, angle: 0.0 },
        { id: 2, type: 'pq', power: -0.5, reactive: -0.2 }
      ],
      branches: [
        { from: 1, to: 2, impedance: { real: 0.01, imag: 0.03 } }
      ],
      generators: [
        { bus: 1, power: 1.0, reactance: 0.2 }
      ]
    };

    const faultCurrent = solver.calculateShortCircuit(system, {
      type: '3phase',
      location: 2,
      impedance: { real: 0, imag: 0 }
    });

    expect(faultCurrent.magnitude).toBeGreaterThan(0);
    expect(faultCurrent.angle).toBeDefined();
  });

  test('should calculate single line-to-ground fault', () => {
    const system = {
      buses: [
        { id: 1, type: 'slack', voltage: 1.0, angle: 0.0 },
        { id: 2, type: 'pq', power: -0.5, reactive: -0.2 }
      ],
      branches: [
        { from: 1, to: 2, impedance: { real: 0.01, imag: 0.03 } }
      ],
      generators: [
        { bus: 1, power: 1.0, reactance: 0.2 }
      ]
    };

    const faultCurrent = solver.calculateShortCircuit(system, {
      type: 'slg',
      location: 2,
      impedance: { real: 0, imag: 0 }
    });

    expect(faultCurrent.magnitude).toBeGreaterThan(0);
    expect(faultCurrent.zeroSequence).toBeDefined();
    expect(faultCurrent.positiveSequence).toBeDefined();
    expect(faultCurrent.negativeSequence).toBeDefined();
  });
});

describe('OPF Calculations', () => {
  let solver;

  beforeEach(() => {
    solver = new PowerFlowSolver();
  });

  test('should solve optimal power flow', () => {
    const system = {
      buses: [
        { id: 1, type: 'slack', voltage: 1.0, angle: 0.0 },
        { id: 2, type: 'pv', voltage: 1.0, power: 0.5, minPower: 0.1, maxPower: 1.0 },
        { id: 3, type: 'pq', power: -0.3, reactive: -0.1 }
      ],
      branches: [
        { from: 1, to: 2, impedance: { real: 0.01, imag: 0.03 } },
        { from: 2, to: 3, impedance: { real: 0.02, imag: 0.04 } },
        { from: 1, to: 3, impedance: { real: 0.03, imag: 0.06 } }
      ],
      costs: {
        1: { a: 0, b: 20, c: 0.01 },
        2: { a: 0, b: 25, c: 0.015 }
      }
    };

    const result = solver.solveOPF(system);

    expect(result.converged).toBe(true);
    expect(result.totalCost).toBeGreaterThan(0);
    expect(result.generatorDispatch).toBeDefined();
    expect(result.violations).toHaveLength(0);
  });
});
