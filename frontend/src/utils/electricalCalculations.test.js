/**
 * Unit tests for electrical calculations
 * Tests for ICC, ampacity, and protection coordination
 */

/* eslint-env jest */

import {
  validateConnection,
  validateConnectivity,
  validateLoops,
  validateHierarchy,
  validateCableAmpacity,
  validateBreakerCapacity,
  validateSystem
} from './validation';

// Mock data for tests
const createMockNode = (id, type, label, parameters = {}) => ({
  id,
  type,
  data: { label, parameters }
});

const createMockEdge = (id, source, target, data = {}) => ({
  id,
  source,
  target,
  data
});

describe('Electrical Validation Tests', () => {
  describe('validateConnection', () => {
    test('allows transformer to panel', () => {
      expect(validateConnection('transformer', 'panel')).toBe(true);
    });

    test('allows transformer to breaker', () => {
      expect(validateConnection('transformer', 'breaker')).toBe(true);
    });

    test('allows transformer to ATS', () => {
      expect(validateConnection('transformer', 'ats')).toBe(true);
    });

    test('allows generator to ATS', () => {
      expect(validateConnection('generator', 'ats')).toBe(true);
    });

    test('allows ATS to breaker', () => {
      expect(validateConnection('ats', 'breaker')).toBe(true);
    });

    test('prevents connection to generator', () => {
      expect(validateConnection('transformer', 'generator')).toBe(false);
      expect(validateConnection('panel', 'generator')).toBe(false);
      expect(validateConnection('breaker', 'generator')).toBe(false);
    });

    test('prevents invalid connections', () => {
      expect(validateConnection('load', 'panel')).toBe(false);
      expect(validateConnection('motor', 'breaker')).toBe(false);
    });
  });

  describe('validateConnectivity', () => {
    test('returns valid for empty system', () => {
      const result = validateConnectivity([], []);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('detects isolated nodes', () => {
      const nodes = [
        createMockNode('1', 'transformer', 'T1'),
        createMockNode('2', 'panel', 'P1'), // isolated
        createMockNode('3', 'load', 'C1')  // isolated
      ];
      const edges = [];

      const result = validateConnectivity(nodes, edges);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('validates connected system', () => {
      const nodes = [
        createMockNode('1', 'transformer', 'T1'),
        createMockNode('2', 'panel', 'P1'),
        createMockNode('3', 'load', 'C1')
      ];
      const edges = [
        createMockEdge('e1', '1', '2'),
        createMockEdge('e2', '2', '3')
      ];

      const result = validateConnectivity(nodes, edges);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateLoops', () => {
    test('allows tree structure', () => {
      const nodes = [
        createMockNode('1', 'transformer', 'T1'),
        createMockNode('2', 'panel', 'P1'),
        createMockNode('3', 'load', 'C1')
      ];
      const edges = [
        createMockEdge('e1', '1', '2'),
        createMockEdge('e2', '2', '3')
      ];

      const result = validateLoops(nodes, edges);
      expect(result.isValid).toBe(true);
    });

    test('detects cycles', () => {
      const nodes = [
        createMockNode('1', 'panel', 'P1'),
        createMockNode('2', 'panel', 'P2'),
        createMockNode('3', 'panel', 'P3')
      ];
      const edges = [
        createMockEdge('e1', '1', '2'),
        createMockEdge('e2', '2', '3'),
        createMockEdge('e3', '3', '1') // creates cycle
      ];

      const result = validateLoops(nodes, edges);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateHierarchy', () => {
    test('validates transformer has outputs', () => {
      const nodes = [
        createMockNode('1', 'transformer', 'T1'),
        createMockNode('2', 'load', 'C1')
      ];
      const edges = [
        createMockEdge('e1', '1', '2')
      ];

      const result = validateHierarchy(nodes, edges);
      expect(result.isValid).toBe(true);
    });

    test('detects transformer without outputs', () => {
      const nodes = [
        createMockNode('1', 'transformer', 'T1'), // no outputs
        createMockNode('2', 'load', 'C1')        // no inputs
      ];
      const edges = [];

      const result = validateHierarchy(nodes, edges);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Transformador'))).toBe(true);
      expect(result.errors.some(e => e.includes('Carga'))).toBe(true);
    });

    test('validates ATS requirements', () => {
      const nodes = [
        createMockNode('1', 'transformer', 'T1'),
        createMockNode('2', 'generator', 'G1'),
        createMockNode('3', 'ats', 'ATS1'),
        createMockNode('4', 'panel', 'P1')
      ];
      const edges = [
        createMockEdge('e1', '1', '3'),
        createMockEdge('e2', '2', '3'),
        createMockEdge('e3', '3', '4')
      ];

      const result = validateHierarchy(nodes, edges);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateCableAmpacity', () => {
    test('detects undersized cable', () => {
      const edges = [
        createMockEdge('e1', '1', '2', {
          calibre: '12',    // 25A capacity
          paralelo: 1,
          longitud: 10
        })
      ];
      const nodeCurrents = { '2': 200 }; // 200A load

      const result = validateCableAmpacity(edges, nodeCurrents);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('accepts properly sized cable', () => {
      const edges = [
        createMockEdge('e1', '1', '2', {
          calibre: '500',   // 380A capacity
          paralelo: 1,
          longitud: 10
        })
      ];
      const nodeCurrents = { '2': 200 };

      const result = validateCableAmpacity(edges, nodeCurrents);
      expect(result.isValid).toBe(true);
    });

    test('warns on high cable utilization', () => {
      const edges = [
        createMockEdge('e1', '1', '2', {
          calibre: '4/0',   // 230A capacity
          paralelo: 1,
          longitud: 10
        })
      ];
      const nodeCurrents = { '2': 180 }; // 180A x 1.25 = 225A, close to 230A

      const result = validateCableAmpacity(edges, nodeCurrents);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('warns on long cable runs', () => {
      const edges = [
        createMockEdge('e1', '1', '2', {
          calibre: '350',
          paralelo: 1,
          longitud: 50  // > 30m
        })
      ];

      const result = validateCableAmpacity(edges);
      expect(result.warnings.some(w => w.includes('50m'))).toBe(true);
    });
  });

  describe('validateBreakerCapacity', () => {
    test('detects undersized breaker', () => {
      const nodes = [
        createMockNode('1', 'breaker', 'B1', {
          In: 100,
          Icarga: 150  // load > breaker rating
        })
      ];

      const result = validateBreakerCapacity(nodes);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Capacidad'))).toBe(true);
    });

    test('detects insufficient Icu', () => {
      const nodes = [
        createMockNode('1', 'breaker', 'B1', {
          In: 200,
          Icarga: 150,
          Icu: 5000,              // 5kA interrupting capacity
          availableFaultCurrent: 10000  // 10kA available
        })
      ];

      const result = validateBreakerCapacity(nodes);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('explosión'))).toBe(true);
    });

    test('warns on breakers below 125% rule', () => {
      const nodes = [
        createMockNode('1', 'breaker', 'B1', {
          In: 100,
          Icarga: 90   // 90 x 1.25 = 112.5, breaker is only 100
        })
      ];

      const result = validateBreakerCapacity(nodes);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('1.25'))).toBe(true);
    });

    test('accepts properly sized breaker', () => {
      const nodes = [
        createMockNode('1', 'breaker', 'B1', {
          In: 150,
          Icarga: 100,
          Icu: 25000,
          availableFaultCurrent: 15000
        })
      ];

      const result = validateBreakerCapacity(nodes);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateSystem - Complete Integration', () => {
    test('validates complete correct system', () => {
      const nodes = [
        createMockNode('1', 'transformer', 'T1', { kVA: 500, Z: 5.75 }),
        createMockNode('2', 'panel', 'P1'),
        createMockNode('3', 'breaker', 'B1', { In: 200, Icarga: 150 }),
        createMockNode('4', 'load', 'C1')
      ];
      const edges = [
        createMockEdge('e1', '1', '2', { calibre: '500', paralelo: 1 }),
        createMockEdge('e2', '2', '3', { calibre: '300', paralelo: 1 }),
        createMockEdge('e3', '3', '4', { calibre: '4/0', paralelo: 1 })
      ];

      const result = validateSystem(nodes, edges);
      expect(result.isValid).toBe(true);
      expect(result.details.connectivity).toBe(true);
      expect(result.details.loops).toBe(true);
      expect(result.details.hierarchy).toBe(true);
    });

    test('detects multiple errors in invalid system', () => {
      const nodes = [
        createMockNode('1', 'transformer', 'T1'), // no outputs
        createMockNode('2', 'breaker', 'B1', { In: 50, Icarga: 100 }), // undersized
        createMockNode('3', 'load', 'C1'), // no inputs
        createMockNode('4', 'generator', 'G1') // isolated
      ];
      const edges = [];

      const result = validateSystem(nodes, edges);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(2);
    });
  });
});

// Performance tests
describe('Performance Tests', () => {
  test('handles large systems efficiently', () => {
    const nodes = Array.from({ length: 100 }, (_, i) =>
      createMockNode(`node-${i}`, 'panel', `P${i}`)
    );
    const edges = Array.from({ length: 99 }, (_, i) =>
      createMockEdge(`edge-${i}`, `node-${i}`, `node-${i + 1}`)
    );

    const start = performance.now();
    const result = validateSystem(nodes, edges);
    const end = performance.now();

    expect(end - start).toBeLessThan(1000); // Should complete in < 1 second
    expect(result).toBeDefined();
  });
});

export default {};
