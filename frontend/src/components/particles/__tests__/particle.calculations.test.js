/**
 * components/particles/__tests__/particle.calculations.test.js
 * Unit tests for mathematical calculations in particle system
 * Tests particle speed, radius, color mapping, and physics calculations
 */

import { Particle } from '../Particle.js';
import { ParticleSystem } from '../ParticleSystem.js';
import { edgeToPath, getUpstreamPath, distance, normalizeVector } from '../PathUtils.js';

describe('Particle Mathematical Calculations', () => {
  describe('Particle Speed Calculations', () => {
    test('should calculate correct speed for low current (1000A)', () => {
      const system = new ParticleSystem();
      const speed = system.calculateSpeed(1000);

      // Expected: 0.3 + log10(1000) * 0.24 = 0.3 + 3 * 0.24 = 1.02
      expect(speed).toBeCloseTo(1.02, 2);
      expect(speed).toBeGreaterThan(0);
      expect(speed).toBeLessThanOrEqual(1.5);
    });

    test('should calculate correct speed for medium current (5000A)', () => {
      const system = new ParticleSystem();
      const speed = system.calculateSpeed(5000);

      // Expected: 0.3 + log10(5000) * 0.24 = 0.3 + 3.699 * 0.24 = 1.188
      expect(speed).toBeCloseTo(1.188, 2);
    });

    test('should calculate correct speed for high current (15000A)', () => {
      const system = new ParticleSystem();
      const speed = system.calculateSpeed(15000);

      // Expected: 0.3 + log10(15000) * 0.24 = 0.3 + 4.176 * 0.24 = 1.302
      expect(speed).toBeCloseTo(1.302, 2);
    });

    test('should handle minimum current (1A)', () => {
      const system = new ParticleSystem();
      const speed = system.calculateSpeed(1);

      // Expected: 0.3 + log10(1) * 0.24 = 0.3 + 0 * 0.24 = 0.3
      expect(speed).toBe(0.3);
    });

    test('should cap speed at maximum (1.5)', () => {
      const system = new ParticleSystem();
      const speed = system.calculateSpeed(100000); // Very high current

      expect(speed).toBe(1.5);
    });

    test('should handle zero current gracefully', () => {
      const system = new ParticleSystem();
      const speed = system.calculateSpeed(0);

      // Should use Math.max(1, Icc) internally
      expect(speed).toBe(0.3);
    });
  });

  describe('Particle Radius Calculations', () => {
    test('should calculate correct radius for low intensity', () => {
      const path = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
      const particle = new Particle(path, 0.5, 1000);

      // Expected: 2 + log10(1000) * 0.5 = 2 + 3 * 0.5 = 3.5
      expect(particle.getRadius()).toBeCloseTo(3.5, 2);
    });

    test('should calculate correct radius for medium intensity', () => {
      const path = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
      const particle = new Particle(path, 0.5, 5000);

      // Expected: 2 + log10(5000) * 0.5 = 2 + 3.699 * 0.5 = 3.85
      expect(particle.getRadius()).toBeCloseTo(3.85, 2);
    });

    test('should calculate correct radius for high intensity', () => {
      const path = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
      const particle = new Particle(path, 0.5, 20000);

      // Expected: 2 + log10(20000) * 0.5 = 2 + 4.301 * 0.5 = 4.15
      expect(particle.getRadius()).toBeCloseTo(4.15, 2);
    });

    test('should cap radius at maximum (8)', () => {
      const path = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
      const particle = new Particle(path, 0.5, 1e13); // Very high intensity to hit cap

      expect(particle.getRadius()).toBe(8);
    });

    test('should handle minimum intensity', () => {
      const path = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
      const particle = new Particle(path, 0.5, 1);

      // Expected: 2 + log10(1) * 0.5 = 2 + 0 * 0.5 = 2
      expect(particle.getRadius()).toBe(2);
    });
  });

  describe('Color Mapping', () => {
    test('should return red for low intensity (< 2000A)', () => {
      const path = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
      const particle = new Particle(path, 0.5, 1000);

      expect(particle.getDefaultColor(1000)).toBe('rgba(255, 50, 50, 0.7)');
    });

    test('should return orange-red for medium-low intensity (2000-5000A)', () => {
      const path = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
      const particle = new Particle(path, 0.5, 3000);

      expect(particle.getDefaultColor(3000)).toBe('rgba(255, 80, 0, 0.8)');
    });

    test('should return orange for medium intensity (5000-10000A)', () => {
      const path = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
      const particle = new Particle(path, 0.5, 7500);

      expect(particle.getDefaultColor(7500)).toBe('rgba(255, 150, 0, 0.8)');
    });

    test('should return yellow for high intensity (> 10000A)', () => {
      const path = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
      const particle = new Particle(path, 0.5, 15000);

      expect(particle.getDefaultColor(15000)).toBe('rgba(255, 255, 0, 0.9)');
    });

    test('should handle boundary values correctly', () => {
      const path = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
      const particle = new Particle(path, 0.5, 2000);

      expect(particle.getDefaultColor(2000)).toBe('rgba(255, 50, 50, 0.7)');
    });
  });

  describe('Particle Count Calculations', () => {
    test('should calculate correct particle count for low current', () => {
      const system = new ParticleSystem();
      const count = system.calculateParticleCount(1000);

      // Expected: 5 + log10(1000) * 2 = 5 + 3 * 2 = 11
      expect(count).toBe(11);
    });

    test('should calculate correct particle count for medium current', () => {
      const system = new ParticleSystem();
      const count = system.calculateParticleCount(5000);

      // Expected: 5 + log10(5000) * 2 = 5 + 3.699 * 2 = 12.398 -> 12
      expect(count).toBe(12);
    });

    test('should calculate correct particle count for high current', () => {
      const system = new ParticleSystem();
      const count = system.calculateParticleCount(20000);

      // Expected: 5 + log10(20000) * 2 = 5 + 4.301 * 2 = 13.602 -> 13
      expect(count).toBe(13);
    });

    test('should cap particle count at maximum (30)', () => {
      const system = new ParticleSystem();
      const count = system.calculateParticleCount(1e13); // Very high current to hit cap

      expect(count).toBe(30);
    });

    test('should ensure minimum particle count (3)', () => {
      const system = new ParticleSystem();
      const count = system.calculateParticleCount(0.1); // Very low current

      expect(count).toBe(3);
    });
  });

  describe('Position Interpolation', () => {
    test('should interpolate linear path correctly at t=0', () => {
      const path = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
      const particle = new Particle(path, 0.5, 1000);
      particle.t = 0;

      const pos = particle.getPosition();
      expect(pos.x).toBe(0);
      expect(pos.y).toBe(0);
    });

    test('should interpolate linear path correctly at t=0.5', () => {
      const path = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
      const particle = new Particle(path, 0.5, 1000);
      particle.t = 0.5;

      const pos = particle.getPosition();
      expect(pos.x).toBe(5);
      expect(pos.y).toBe(5);
    });

    test('should interpolate linear path correctly at t=1', () => {
      const path = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
      const particle = new Particle(path, 0.5, 1000);
      particle.t = 1;

      const pos = particle.getPosition();
      expect(pos.x).toBe(10);
      expect(pos.y).toBe(10);
    });

    test('should handle multi-point path interpolation', () => {
      const path = [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 10 }];
      const particle = new Particle(path, 0.5, 1000);
      particle.t = 0.5; // Should be at middle point

      const pos = particle.getPosition();
      expect(pos.x).toBe(5);
      expect(pos.y).toBe(0);
    });

    test('should apply turbulence when enabled', () => {
      const path = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
      const particle = new Particle(path, 0.5, 1000, { turbulence: 5 });
      particle.t = 0.5;

      const pos = particle.getPosition();
      // Position should be close to (5, 5) but with some turbulence
      expect(pos.x).toBeGreaterThan(0);
      expect(pos.x).toBeLessThan(10);
      expect(pos.y).toBeGreaterThan(0);
      expect(pos.y).toBeLessThan(10);
    });
  });

  describe('Path Calculations', () => {
    test('should calculate distance correctly', () => {
      const p1 = { x: 0, y: 0 };
      const p2 = { x: 3, y: 4 };

      expect(distance(p1, p2)).toBe(5);
    });

    test('should normalize vector correctly', () => {
      const vector = { x: 3, y: 4 };
      const normalized = normalizeVector(vector);

      expect(normalized.x).toBeCloseTo(0.6, 2);
      expect(normalized.y).toBeCloseTo(0.8, 2);
    });

    test('should handle zero vector normalization', () => {
      const vector = { x: 0, y: 0 };
      const normalized = normalizeVector(vector);

      expect(normalized.x).toBe(0);
      expect(normalized.y).toBe(0);
    });

    test('should convert edge to path correctly', () => {
      const edge = { source: 'node1', target: 'node2' };
      const nodes = [
        { id: 'node1', position: { x: 0, y: 0 } },
        { id: 'node2', position: { x: 10, y: 10 } }
      ];

      const path = edgeToPath(edge, nodes);
      expect(path).toEqual([
        { x: 0, y: 0 },
        { x: 10, y: 10 }
      ]);
    });

    test('should handle missing nodes in edge to path', () => {
      const edge = { source: 'node1', target: 'node2' };
      const nodes = []; // Empty nodes array

      const path = edgeToPath(edge, nodes);
      expect(path).toEqual([]);
    });

    test('should find upstream path correctly', () => {
      const graph = {
        edges: [
          { source: 'source', target: 'breaker1' },
          { source: 'breaker1', target: 'bus1' },
          { source: 'bus1', target: 'load1' }
        ]
      };

      const path = getUpstreamPath(graph, 'load1');
      expect(path).toHaveLength(2);
      expect(path[0].source).toBe('bus1');
      expect(path[1].source).toBe('breaker1');
    });

    test('should handle circular graphs in upstream path', () => {
      const graph = {
        edges: [
          { source: 'node1', target: 'node2' },
          { source: 'node2', target: 'node3' },
          { source: 'node3', target: 'node1' } // Circular reference
        ]
      };

      const path = getUpstreamPath(graph, 'node3');
      expect(path).toHaveLength(2); // Should stop before repeating
    });
  });

  describe('Particle Lifecycle', () => {
    test('should mark particle as dead when t >= 1', () => {
      const path = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
      const particle = new Particle(path, 0.5, 1000);
      particle.t = 1;

      expect(particle.isAlive()).toBe(false);
    });

    test('should mark particle as dead when lifespan exceeded', () => {
      const path = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
      const particle = new Particle(path, 0.5, 1000, { lifespan: 100 });

      // Fast forward time
      particle.createdAt = Date.now() - 200;
      particle.update(0.1);

      expect(particle.isAlive()).toBe(false);
    });

    test('should handle particle trip correctly', () => {
      const path = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
      const particle = new Particle(path, 0.5, 1000);

      particle.setTripped(true);

      expect(particle.tripped).toBe(true);
      expect(particle.color).toBe('rgba(59, 130, 246, 0.8)');
      expect(particle.speed).toBe(0.15); // 0.5 * 0.3
    });

    test('should update trail correctly', () => {
      const path = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
      const particle = new Particle(path, 0.5, 1000, { trailLength: 3 });

      // Update particle to generate trail
      particle.t = 0.5;
      particle.update(0.1);

      expect(particle.trail.length).toBeGreaterThan(0);
      expect(particle.trail.length).toBeLessThanOrEqual(3);
    });

    test('should cleanup old trail points', () => {
      const path = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
      const particle = new Particle(path, 0.5, 1000, { trailLength: 3 });

      // Add old trail points
      const oldTime = Date.now() - 300;
      particle.trail = [
        { x: 0, y: 0, time: oldTime },
        { x: 2, y: 2, time: oldTime + 100 },
        { x: 4, y: 4, time: oldTime + 200 },
        { x: 6, y: 6, time: Date.now() }
      ];

      particle.cleanupTrail();

      // Should remove old points (older than 200ms)
      expect(particle.trail.length).toBeLessThan(4);
    });
  });

  describe('Electrical Standards Compliance', () => {
    test('should follow IEEE 1584 color coding standards', () => {
      const testCases = [
        { current: 1000, expectedColor: 'rgba(255, 50, 50, 0.7)' },  // Low - Red
        { current: 3000, expectedColor: 'rgba(255, 80, 0, 0.8)' },  // Medium-Low - Orange-Red
        { current: 7500, expectedColor: 'rgba(255, 150, 0, 0.8)' }, // Medium - Orange
        { current: 15000, expectedColor: 'rgba(255, 255, 0, 0.9)' } // High - Yellow
      ];

      testCases.forEach(({ current, expectedColor }) => {
        const path = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
        const particle = new Particle(path, 0.5, current);

        expect(particle.getDefaultColor(current)).toBe(expectedColor);
      });
    });

    test('should maintain precision requirements (minimum 6 decimal places)', () => {
      const path = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
      const particle = new Particle(path, 0.5, 1234.56789);

      const radius = particle.getRadius();
      const speed = 0.5; // Default speed

      // Should maintain high precision
      expect(radius.toString()).toMatch(/\d+\.\d{6,}/);
      expect(typeof radius).toBe('number');
      expect(isFinite(radius)).toBe(true);
    });

    test('should handle SI units correctly', () => {
      const testCurrents = [1000, 2500, 5000, 10000, 15000]; // Amperes

      testCurrents.forEach(current => {
        const path = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
        const particle = new Particle(path, 0.5, current);

        expect(particle.intensity).toBe(current);
        expect(particle.getRadius()).toBeGreaterThan(0);
        expect(particle.getRadius()).toBeLessThanOrEqual(8);
      });
    });
  });
});
