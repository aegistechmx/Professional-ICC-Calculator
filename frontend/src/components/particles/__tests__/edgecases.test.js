/**
 * components/particles/__tests__/edgecases.test.js
 * Edge case tests for path calculations and particle physics
 * Tests boundary conditions, error scenarios, and unusual inputs
 */

import { vi } from 'vitest';
import { Particle } from '../Particle.js';
import { ParticleSystem } from '../ParticleSystem.js';
import { edgeToPath, getUpstreamPath, distance, normalizeVector } from '../PathUtils.js';

// Mock canvas for edge case testing
const mockCanvas = {
  width: 1920,
  height: 1080,
  getContext: vi.fn().mockReturnValue({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1
  }),
  getBoundingClientRect: vi.fn().mockReturnValue({
    width: 1920,
    height: 1080
  }),
  style: {},
  toDataURL: vi.fn().mockReturnValue('data:image/png;base64,test')
};

describe('Edge Case Tests', () => {
  let system;

  beforeEach(() => {
    system = new ParticleSystem({ maxParticles: 1000 });
  });

  describe('Particle Physics Edge Cases', () => {
    test('should handle zero-length paths', () => {
      const path = [{ x: 0, y: 0 }]; // Single point
      const particle = new Particle(path, 0.5, 1000);

      expect(particle.getPosition()).toEqual({ x: 0, y: 0 });
      expect(particle.isAlive()).toBe(true);

      // Should still update without crashing
      particle.update(0.016);
      expect(particle.isAlive()).toBe(true);
    });

    test('should handle empty paths', () => {
      const path = []; // Empty array
      const particle = new Particle(path, 0.5, 1000);

      expect(particle.getPosition()).toEqual({ x: 0, y: 0 });
      expect(particle.isAlive()).toBe(true);
    });

    test('should handle paths with identical points', () => {
      const path = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }];
      const particle = new Particle(path, 0.5, 1000);

      expect(particle.getPosition()).toEqual({ x: 0, y: 0 });

      // Should not get stuck
      particle.t = 0.5;
      expect(particle.getPosition()).toEqual({ x: 0, y: 0 });
    });

    test('should handle extremely long paths', () => {
      const path = [];
      for (let i = 0; i < 1000; i++) {
        path.push({ x: i, y: i });
      }

      const particle = new Particle(path, 0.5, 1000);
      particle.t = 0.5;

      const position = particle.getPosition();
      expect(position.x).toBeCloseTo(500, 0);
      expect(position.y).toBeCloseTo(500, 0);
    });

    test('should handle very high current values', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
      const particle = new Particle(path, 0.5, 1000000); // 1MA

      expect(particle.getRadius()).toBe(8); // Should cap at maximum
      expect(particle.getDefaultColor(1000000)).toBe('rgba(255, 255, 0, 0.9)');
    });

    test('should handle zero and negative current values', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];

      const zeroParticle = new Particle(path, 0.5, 0);
      expect(zeroParticle.getRadius()).toBe(2); // Minimum radius
      expect(zeroParticle.getDefaultColor(0)).toBe('rgba(255, 50, 50, 0.7)');

      const negativeParticle = new Particle(path, 0.5, -1000);
      expect(negativeParticle.getRadius()).toBe(2); // Should handle gracefully
    });

    test('should handle infinite and NaN values', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];

      const infiniteParticle = new Particle(path, 0.5, Infinity);
      expect(infiniteParticle.getRadius()).toBe(8); // Should cap

      const nanParticle = new Particle(path, 0.5, NaN);
      expect(nanParticle.getRadius()).toBe(2); // Should default to minimum
    });

    test('should handle extreme speed values', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];

      const fastParticle = new Particle(path, 10, 1000); // Very fast
      expect(fastParticle.speed).toBe(10);

      // Should still update correctly
      fastParticle.update(0.016);
      expect(fastParticle.t).toBe(0.16);

      const slowParticle = new Particle(path, 0.0001, 1000); // Very slow
      slowParticle.update(0.016);
      expect(slowParticle.t).toBeCloseTo(0.0000016, 8);
    });

    test('should handle very small and large delta times', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
      const particle = new Particle(path, 0.5, 1000);

      // Very small delta time
      particle.update(0.000001);
      expect(particle.t).toBeCloseTo(0.0000005, 8);

      // Very large delta time
      particle.t = 0;
      particle.update(10); // 10 seconds
      expect(particle.isAlive()).toBe(false); // Should be dead
    });

    test('should handle boundary t values', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
      const particle = new Particle(path, 0.5, 1000);

      // t = 0
      particle.t = 0;
      expect(particle.getPosition()).toEqual({ x: 0, y: 0 });

      // t = 1
      particle.t = 1;
      expect(particle.getPosition()).toEqual({ x: 100, y: 100 });
      expect(particle.isAlive()).toBe(false);

      // t > 1
      particle.t = 1.5;
      expect(particle.isAlive()).toBe(false);

      // t < 0
      particle.t = -0.1;
      expect(particle.getPosition()).toEqual({ x: 0, y: 0 });
    });
  });

  describe('Path Calculation Edge Cases', () => {
    test('should handle missing nodes in edge to path conversion', () => {
      const edge = { source: 'node1', target: 'node2' };
      const nodes = []; // Empty nodes array

      const path = edgeToPath(edge, nodes);
      expect(path).toEqual([]);
    });

    test('should handle nodes without positions', () => {
      const edge = { source: 'node1', target: 'node2' };
      const nodes = [
        { id: 'node1' }, // No position
        { id: 'node2' }  // No position
      ];

      const path = edgeToPath(edge, nodes);
      expect(path).toEqual([
        { x: 0, y: 0 },
        { x: 0, y: 0 }
      ]);
    });

    test('should handle circular graphs in upstream path', () => {
      const graph = {
        edges: [
          { source: 'node1', target: 'node2' },
          { source: 'node2', target: 'node3' },
          { source: 'node3', target: 'node1' }, // Circular reference
          { source: 'node1', target: 'node4' }
        ]
      };

      const path = getUpstreamPath(graph, 'node4');
      expect(path).toHaveLength(1); // Should stop before cycle
      expect(path[0].source).toBe('node1');
    });

    test('should handle disconnected graphs', () => {
      const graph = {
        edges: [
          { source: 'node1', target: 'node2' },
          { source: 'node3', target: 'node4' } // Disconnected component
        ]
      };

      const path1 = getUpstreamPath(graph, 'node2');
      expect(path1).toHaveLength(1);
      expect(path1[0].source).toBe('node1');

      const path2 = getUpstreamPath(graph, 'node4');
      expect(path2).toHaveLength(1);
      expect(path2[0].source).toBe('node3');

      const path3 = getUpstreamPath(graph, 'node5'); // Non-existent node
      expect(path3).toHaveLength(0);
    });

    test('should handle self-referencing edges', () => {
      const graph = {
        edges: [
          { source: 'node1', target: 'node1' }, // Self-reference
          { source: 'node1', target: 'node2' }
        ]
      };

      const path = getUpstreamPath(graph, 'node2');
      expect(path).toHaveLength(1);
      expect(path[0].source).toBe('node1');
    });

    test('should handle very large coordinate values', () => {
      const edge = { source: 'node1', target: 'node2' };
      const nodes = [
        { id: 'node1', position: { x: 1e10, y: 1e10 } },
        { id: 'node2', position: { x: -1e10, y: -1e10 } }
      ];

      const path = edgeToPath(edge, nodes);
      expect(path).toEqual([
        { x: 1e10, y: 1e10 },
        { x: -1e10, y: -1e10 }
      ]);

      // Distance calculation should handle large numbers
      const dist = distance(nodes[0].position, nodes[1].position);
      expect(dist).toBeCloseTo(2.82842712474619e10, 5);
    });

    test('should handle very small coordinate values', () => {
      const edge = { source: 'node1', target: 'node2' };
      const nodes = [
        { id: 'node1', position: { x: 1e-10, y: 1e-10 } },
        { id: 'node2', position: { x: -1e-10, y: -1e-10 } }
      ];

      const path = edgeToPath(edge, nodes);
      expect(path).toEqual([
        { x: 1e-10, y: 1e-10 },
        { x: -1e-10, y: -1e-10 }
      ]);

      // Distance calculation should handle small numbers
      const dist = distance(nodes[0].position, nodes[1].position);
      expect(dist).toBeCloseTo(2.82842712474619e-10, 15);
    });

    test('should handle NaN and infinite coordinates', () => {
      const edge = { source: 'node1', target: 'node2' };
      const nodes = [
        { id: 'node1', position: { x: NaN, y: Infinity } },
        { id: 'node2', position: { x: -Infinity, y: NaN } }
      ];

      const path = edgeToPath(edge, nodes);
      expect(path).toEqual([
        { x: NaN, y: Infinity },
        { x: -Infinity, y: NaN }
      ]);

      // Distance calculation should handle gracefully
      const dist = distance(nodes[0].position, nodes[1].position);
      expect(isNaN(dist)).toBe(true);
    });
  });

  describe('Mathematical Edge Cases', () => {
    test('should handle zero vector normalization', () => {
      const vector = { x: 0, y: 0 };
      const normalized = normalizeVector(vector);

      expect(normalized.x).toBe(0);
      expect(normalized.y).toBe(0);
    });

    test('should handle very large vector normalization', () => {
      const vector = { x: 1e100, y: 1e100 };
      const normalized = normalizeVector(vector);

      expect(normalized.x).toBeCloseTo(0.70710678, 5);
      expect(normalized.y).toBeCloseTo(0.70710678, 5);
    });

    test('should handle very small vector normalization', () => {
      const vector = { x: 1e-100, y: 1e-100 };
      const normalized = normalizeVector(vector);

      expect(normalized.x).toBeCloseTo(0.70710678, 5);
      expect(normalized.y).toBeCloseTo(0.70710678, 5);
    });

    test('should handle distance calculation with same point', () => {
      const point = { x: 100, y: 100 };
      const dist = distance(point, point);

      expect(dist).toBe(0);
    });

    test('should handle distance calculation with extreme values', () => {
      const p1 = { x: Number.MAX_VALUE, y: Number.MAX_VALUE };
      const p2 = { x: Number.MIN_VALUE, y: Number.MIN_VALUE };

      const dist = distance(p1, p2);
      expect(isFinite(dist)).toBe(true);
      expect(dist).toBeGreaterThan(0);
    });
  });

  describe('System Edge Cases', () => {
    test('should handle spawning particles with invalid options', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];

      // Invalid trail length
      const particle1 = system.spawn(path, 1000, { trailLength: -5 });
      expect(particle1).toBeDefined();
      expect(particle1.maxTrailLength).toBe(-5); // Should accept but handle gracefully

      // Invalid turbulence
      const particle2 = system.spawn(path, 1000, { turbulence: -10 });
      expect(particle2).toBeDefined();
      expect(particle2.turbulence).toBe(-10);

      // Invalid lifespan
      const particle3 = system.spawn(path, 1000, { lifespan: 0 });
      expect(particle3).toBeDefined();
      expect(particle3.lifespan).toBe(0);
    });

    test('should handle maximum particle count overflow', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
      const maxParticles = system.maxParticles;

      // Fill to capacity
      for (let i = 0; i < maxParticles + 10; i++) {
        system.spawn(path, 1000, { lifespan: 10000 }); // Long lifespan
      }

      expect(system.particles.length).toBeLessThanOrEqual(maxParticles);
    });

    test('should handle rapid particle spawning and cleanup', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];

      // Spawn many particles with short lifespan
      for (let i = 0; i < 500; i++) {
        system.spawn(path, 1000, { lifespan: 1 }); // 1ms lifespan
      }

      expect(system.particles.length).toBe(500);

      // Update to clean up
      system.update(0.1); // 100ms

      expect(system.particles.length).toBe(0); // All should be dead
    });

    test('should handle breaker trip with invalid breaker ID', () => {
      const graph = {
        nodes: [{ id: 'node1', position: { x: 0, y: 0 } }],
        edges: []
      };

      // Should not crash with invalid breaker
      expect(() => {
        system.handleBreakerTrip('invalid_breaker', graph);
      }).not.toThrow();

      expect(system.trippedBreakers.has('invalid_breaker')).toBe(true);
    });

    test('should handle fault emission with invalid graph', () => {
      // Invalid graph structures
      const invalidGraphs = [
        null,
        undefined,
        {},
        { nodes: null, edges: [] },
        { nodes: [], edges: null },
        { nodes: 'invalid', edges: [] },
        { nodes: [], edges: 'invalid' }
      ];

      invalidGraphs.forEach(graph => {
        expect(() => {
          system.emitFaultParticles(graph, 'node1', 1000, 'fault1');
        }).not.toThrow();
      });
    });

    test('should handle particle updates with corrupted state', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
      const particle = new Particle(path, 0.5, 1000);

      // Corrupt particle state
      particle.t = NaN;
      particle.speed = Infinity;
      particle.alive = null;
      particle.trail = null;

      // Should not crash
      expect(() => {
        particle.update(0.016);
      }).not.toThrow();

      // Should handle gracefully
      expect(particle.isAlive()).toBe(false);
    });
  });

  describe('Performance Edge Cases', () => {
    test('should handle very large number of particles efficiently', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];

      // Spawn many particles
      for (let i = 0; i < 900; i++) {
        system.spawn(path, 1000 + i, { trailLength: 20 });
      }

      expect(system.particles.length).toBe(900);

      // Update should complete in reasonable time
      const startTime = performance.now();
      system.update(0.016);
      const updateTime = performance.now() - startTime;

      expect(updateTime).toBeLessThan(100); // Should update in under 100ms
    });

    test('should handle particles with very long trails', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];

      // Create particles with very long trails
      for (let i = 0; i < 50; i++) {
        system.spawn(path, 1000, { trailLength: 100 });
      }

      // Update many times to build trails
      for (let frame = 0; frame < 200; frame++) {
        system.update(0.016);
      }

      // Trail length should be limited
      let totalTrailPoints = 0;
      system.particles.forEach(particle => {
        if (particle.trail) {
          totalTrailPoints += particle.trail.length;
        }
      });

      expect(totalTrailPoints).toBeLessThan(50 * 100); // Should not exceed maximum
    });

    test('should handle memory pressure gracefully', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];

      // Fill system to capacity
      for (let i = 0; i < system.maxParticles; i++) {
        system.spawn(path, 1000, { trailLength: 50 });
      }

      // Try to spawn more
      const initialCount = system.particles.length;

      for (let i = 0; i < 100; i++) {
        system.spawn(path, 2000, { trailLength: 50 });
      }

      // Should not exceed maximum
      expect(system.particles.length).toBeLessThanOrEqual(system.maxParticles);

      // Should have cleaned up old particles
      expect(system.particles.length).toBeLessThanOrEqual(initialCount + 100);
    });
  });

  describe('Concurrent Operations Edge Cases', () => {
    test('should handle simultaneous particle spawning and updating', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];

      // Spawn particles while updating
      for (let i = 0; i < 100; i++) {
        system.spawn(path, 1000 + i * 10);

        if (i % 10 === 0) {
          system.update(0.016);
        }
      }

      expect(system.particles.length).toBeGreaterThan(0);
      expect(system.particles.length).toBeLessThanOrEqual(100);
    });

    test('should handle simultaneous breaker trips', () => {
      const graph = {
        nodes: [
          { id: 'breaker1', position: { x: 50, y: 50 }, type: 'breaker' },
          { id: 'breaker2', position: { x: 150, y: 50 }, type: 'breaker' }
        ],
        edges: []
      };

      // Create particles
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
      for (let i = 0; i < 50; i++) {
        system.spawn(path, 1000 + i * 10);
      }

      // Trip multiple breakers simultaneously
      system.handleBreakerTrip('breaker1', graph);
      system.handleBreakerTrip('breaker2', graph);

      expect(system.trippedBreakers.size).toBe(2);

      // Update should handle both trips
      system.update(0.016);
      system.updateTrippedParticles();

      expect(system.trippedBreakers.size).toBe(2);
    });

    test('should handle rapid fault start and stop', () => {
      const graph = {
        nodes: [{ id: 'node1', position: { x: 0, y: 0 } }],
        edges: []
      };

      // Start and stop faults rapidly
      for (let i = 0; i < 20; i++) {
        const faultId = `fault_${i}`;
        system.activeFaults.set(faultId, {
          nodeId: 'node1',
          Icc: 1000 + i * 100,
          startTime: Date.now(),
          graph
        });

        if (i % 5 === 0) {
          system.clearFault(`fault_${i - 2}`);
        }
      }

      expect(system.activeFaults.size).toBeGreaterThan(0);
      expect(system.activeFaults.size).toBeLessThan(20);

      // Clear all
      system.clearAll();
      expect(system.activeFaults.size).toBe(0);
    });
  });

  describe('Error Recovery Edge Cases', () => {
    test('should recover from particle calculation errors', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];

      // Create particle with problematic values
      const particle = new Particle(path, NaN, Infinity, {
        trailLength: -1,
        turbulence: NaN,
        lifespan: -100
      });

      // Should still be able to update
      expect(() => {
        particle.update(0.016);
      }).not.toThrow();

      // Should have reasonable defaults
      expect(particle.getRadius()).toBeGreaterThan(0);
      expect(particle.getRadius()).toBeLessThanOrEqual(8);
    });

    test('should handle corrupted trail data', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
      const particle = new Particle(path, 0.5, 1000);

      // Corrupt trail data
      particle.trail = [
        { x: NaN, y: Infinity, time: -1 },
        { x: undefined, y: null, time: 'invalid' },
        null,
        undefined,
        'invalid'
      ];

      // Should not crash when cleaning trail
      expect(() => {
        particle.cleanupTrail();
      }).not.toThrow();

      // Should handle gracefully
      expect(Array.isArray(particle.trail)).toBe(true);
    });

    test('should handle system state corruption', () => {
      // Corrupt system state
      system.particles = null;
      system.activeFaults = null;
      system.trippedBreakers = null;

      // Should recover gracefully
      expect(() => {
        system.update(0.016);
      }).not.toThrow();

      // Should reset to valid state
      expect(Array.isArray(system.particles)).toBe(true);
      expect(system.particles.length).toBe(0);
    });
  });
});
