/**
 * components/particles/__tests__/performance.test.js
 * Performance tests for high particle counts
 * Tests system performance under stress and memory usage
 */

import { vi } from 'vitest';
import { ParticleSystem } from '../ParticleSystem.js';
import { ParticleRenderer } from '../ParticleRenderer.js';
import { FaultParticleEngine } from '../FaultParticleEngine.js';

// Mock canvas for performance testing
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
    lineWidth: 1,
    createLinearGradient: vi.fn().mockReturnValue({
      addColorStop: vi.fn()
    }),
    createRadialGradient: vi.fn().mockReturnValue({
      addColorStop: vi.fn()
    })
  }),
  getBoundingClientRect: vi.fn().mockReturnValue({
    width: 1920,
    height: 1080
  }),
  style: {},
  toDataURL: vi.fn().mockReturnValue('data:image/png;base64,test')
};

describe('Particle System Performance Tests', () => {
  let system;
  let renderer;
  let engine;

  beforeEach(() => {
    system = new ParticleSystem({ maxParticles: 1000 });
    renderer = new ParticleRenderer(mockCanvas);
    engine = new FaultParticleEngine(mockCanvas);
  });

  describe('High Particle Count Performance', () => {
    test('should handle 100 particles within performance threshold', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
      const startTime = performance.now();

      // Spawn 100 particles
      for (let i = 0; i < 100; i++) {
        system.spawn(path, 1000 + i * 10);
      }

      const spawnTime = performance.now() - startTime;

      // Verify particles were spawned before they complete their path
      expect(system.particles.length).toBe(100);

      // Update particles for 100 frames
      const updateStartTime = performance.now();
      for (let frame = 0; frame < 100; frame++) {
        system.update(0.016); // 60 FPS
      }
      const updateTime = performance.now() - updateStartTime;

      // Render particles for 100 frames
      const renderStartTime = performance.now();
      for (let frame = 0; frame < 100; frame++) {
        renderer.render(system.particles);
      }
      const renderTime = performance.now() - renderStartTime;

      expect(spawnTime).toBeLessThan(50); // 50ms to spawn 100 particles
      expect(updateTime).toBeLessThan(100); // 100ms for 100 update frames
      expect(renderTime).toBeLessThan(200); // 200ms for 100 render frames
    });

    test('should handle 500 particles within performance threshold', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
      const startTime = performance.now();

      // Spawn 500 particles
      for (let i = 0; i < 500; i++) {
        system.spawn(path, 1000 + i * 10);
      }

      const spawnTime = performance.now() - startTime;

      // Verify particles were spawned (max is 1000, so all 500 should exist)
      expect(system.particles.length).toBe(500);

      // Update particles for 60 frames (1 second at 60 FPS)
      const updateStartTime = performance.now();
      for (let frame = 0; frame < 60; frame++) {
        system.update(0.016);
      }
      const updateTime = performance.now() - updateStartTime;

      // Render particles for 60 frames
      const renderStartTime = performance.now();
      for (let frame = 0; frame < 60; frame++) {
        renderer.render(system.particles);
      }
      const renderTime = performance.now() - renderStartTime;

      expect(spawnTime).toBeLessThan(100); // 100ms to spawn 500 particles
      expect(updateTime).toBeLessThan(100); // 100ms for 60 update frames
      expect(renderTime).toBeLessThan(300); // 300ms for 60 render frames
    });

    test('should maintain 60 FPS with 300 particles', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];

      // Spawn 300 particles
      for (let i = 0; i < 300; i++) {
        system.spawn(path, 1000 + i * 10);
      }

      // Measure frame time
      const frameTimes = [];
      for (let frame = 0; frame < 120; frame++) { // 2 seconds at 60 FPS
        const frameStart = performance.now();

        system.update(0.016);
        renderer.render(system.particles);

        const frameTime = performance.now() - frameStart;
        frameTimes.push(frameTime);
      }

      const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      const maxFrameTime = Math.max(...frameTimes);

      expect(avgFrameTime).toBeLessThan(16.67); // 60 FPS = 16.67ms per frame
      expect(maxFrameTime).toBeLessThan(33.33); // Allow some spikes but not below 30 FPS
    });

    test('should handle particle cleanup efficiently', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];

      // Spawn particles with short lifespan
      for (let i = 0; i < 200; i++) {
        system.spawn(path, 1000, { lifespan: 100 });
      }

      expect(system.particles.length).toBe(200);

      // Fast forward time and update
      const startTime = performance.now();
      for (let i = 0; i < 10; i++) {
        system.update(0.1); // 100ms per update
      }
      const cleanupTime = performance.now() - startTime;

      // Most particles should be cleaned up
      expect(system.particles.length).toBeLessThan(50);
      expect(cleanupTime).toBeLessThan(50); // Cleanup should be fast
    });
  });

  describe('Memory Usage Performance', () => {
    test('should not exceed memory budget with high particle counts', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];

      // Measure initial memory
      const initialStats = system.getStats();

      // Spawn many particles
      for (let i = 0; i < 800; i++) {
        system.spawn(path, 1000 + i * 10, { trailLength: 10 });
      }

      // Check stats immediately after spawn (may include particles from cleanup)
      const afterSpawnStats = system.getStats();
      expect(afterSpawnStats.totalParticles).toBeLessThanOrEqual(1000);
      expect(afterSpawnStats.totalParticles).toBeGreaterThan(700);

      // Update for several frames to build trails
      for (let frame = 0; frame < 50; frame++) {
        system.update(0.016);
      }

      const afterUpdateStats = system.getStats();
      expect(afterSpawnStats.memoryUsage).toBeLessThanOrEqual(200000); // 200KB memory budget
      expect(afterUpdateStats.memoryUsage).toBeLessThanOrEqual(afterSpawnStats.memoryUsage * 1.5); // Trail memory shouldn't double
    });

    test('should clean up old particles when at max capacity', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];

      // Fill system to max capacity
      for (let i = 0; i < 1000; i++) {
        system.spawn(path, 1000 + i * 10);
      }

      // After cleanup, system keeps 80% of max (800 particles)
      expect(system.particles.length).toBeLessThanOrEqual(1000);
      expect(system.particles.length).toBeGreaterThan(700);

      // Try to spawn more particles (will cleanup old ones)
      const initialOldestTime = system.particles[0].createdAt;

      for (let i = 0; i < 100; i++) {
        system.spawn(path, 2000 + i * 10);
      }

      // Should still be at max capacity (80% of 1000 = 800)
      expect(system.particles.length).toBeLessThanOrEqual(1000);
      expect(system.particles.length).toBeGreaterThan(700);
      // Oldest particles should be removed (newer timestamp)
      expect(system.particles[0].createdAt).toBeGreaterThan(initialOldestTime);
    });

    test('should handle trail memory efficiently', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];

      // Spawn particles with long trails
      for (let i = 0; i < 100; i++) {
        system.spawn(path, 1000, { trailLength: 20 });
      }

      // Update to build trails
      for (let frame = 0; frame < 30; frame++) {
        system.update(0.016);
      }

      let totalTrailPoints = 0;
      system.particles.forEach(particle => {
        totalTrailPoints += particle.trail.length;
      });

      // Trail points should be limited
      expect(totalTrailPoints).toBeLessThan(100 * 20); // Max trail points
      expect(totalTrailPoints).toBeGreaterThan(0); // Should have some trail points
    });
  });

  describe('Rendering Performance', () => {
    test('should render complex scenes efficiently', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];

      // Create particles with various intensities
      const intensities = [1000, 3000, 5000, 8000, 12000, 15000];
      for (let i = 0; i < 300; i++) {
        const intensity = intensities[i % intensities.length];
        system.spawn(path, intensity, {
          trailLength: intensity > 5000 ? 8 : 4,
          turbulence: intensity > 10000 ? 2 : 0
        });
      }

      // Update to create trails
      for (let frame = 0; frame < 20; frame++) {
        system.update(0.016);
      }

      // Measure rendering time
      const renderTimes = [];
      for (let frame = 0; frame < 60; frame++) {
        const renderStart = performance.now();
        renderer.render(system.particles);
        const renderTime = performance.now() - renderStart;
        renderTimes.push(renderTime);
      }

      const avgRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
      const maxRenderTime = Math.max(...renderTimes);

      expect(avgRenderTime).toBeLessThan(16.67); // Should maintain 60 FPS
      expect(maxRenderTime).toBeLessThan(50); // Allow occasional spikes
    });

    test('should handle glow effects performance', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];

      // Create high-intensity particles that trigger glow
      for (let i = 0; i < 100; i++) {
        system.spawn(path, 15000); // High intensity for glow
      }

      // Update particles
      for (let frame = 0; frame < 10; frame++) {
        system.update(0.016);
      }

      // Measure rendering with glow
      const renderStart = performance.now();
      for (let frame = 0; frame < 60; frame++) {
        renderer.render(system.particles);
      }
      const renderTime = performance.now() - renderStart;

      expect(renderTime).toBeLessThan(1000); // 60 frames should render in under 1 second
    });

    test('should scale rendering performance with particle count', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
      const particleCounts = [50, 100, 200, 400];
      const renderTimes = [];

      particleCounts.forEach(count => {
        // Clear system
        system.clearAll();

        // Spawn particles
        for (let i = 0; i < count; i++) {
          system.spawn(path, 1000 + i * 10);
        }

        // Update to create trails
        for (let frame = 0; frame < 10; frame++) {
          system.update(0.016);
        }

        // Measure rendering time
        const renderStart = performance.now();
        for (let frame = 0; frame < 30; frame++) {
          renderer.render(system.particles);
        }
        const renderTime = performance.now() - renderStart;

        renderTimes.push({ count, time: renderTime });
      });

      // Performance should scale reasonably (not exponentially)
      const time50 = renderTimes.find(r => r.count === 50).time;
      const time400 = renderTimes.find(r => r.count === 400).time;
      const scalingFactor = time400 / time50;

      expect(scalingFactor).toBeLessThan(10); // Should not scale worse than 8x for 8x particles
    });
  });

  describe('Stress Tests', () => {
    test('should handle rapid particle spawning and cleanup', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];

      // Rapidly spawn and let particles die
      const startTime = performance.now();

      for (let cycle = 0; cycle < 50; cycle++) {
        // Spawn burst of particles
        for (let i = 0; i < 20; i++) {
          system.spawn(path, 1000, { lifespan: 50 });
        }

        // Update multiple times
        for (let frame = 0; frame < 5; frame++) {
          system.update(0.016);
        }
      }

      const totalTime = performance.now() - startTime;

      // After cleanup, system keeps 80% of max (800 particles)
      expect(system.particles.length).toBeLessThanOrEqual(800);
      expect(totalTime).toBeLessThan(500); // Should complete in under 500ms
    });

    test('should handle concurrent fault animations', () => {
      const graph = {
        nodes: [
          { id: 'n1', position: { x: 0, y: 0 } },
          { id: 'n2', position: { x: 100, y: 0 } },
          { id: 'n3', position: { x: 200, y: 0 } },
          { id: 'n4', position: { x: 300, y: 0 } },
          { id: 'n5', position: { x: 400, y: 0 } }
        ],
        edges: [
          { source: 'n1', target: 'n2' },
          { source: 'n2', target: 'n3' },
          { source: 'n3', target: 'n4' },
          { source: 'n4', target: 'n5' }
        ]
      };

      // Start multiple concurrent faults
      const faultIds = [];
      const startTime = performance.now();

      for (let i = 0; i < 5; i++) {
        const faultId = engine.emitFaultParticles(graph, `n${i + 1}`, 5000 + i * 1000);
        faultIds.push(faultId);
      }

      const emitTime = performance.now() - startTime;

      // Check stats immediately after emit
      let stats = engine.getStats();
      expect(stats.totalParticles).toBeGreaterThan(0);
      expect(stats.activeFaults).toBe(5);

      // Update for several frames
      for (let frame = 0; frame < 60; frame++) {
        engine.particleSystem.update(0.016);
        engine.render();
      }

      expect(faultIds.length).toBe(5);
      expect(emitTime).toBeLessThan(100); // Should emit faults quickly
    });

    test('should maintain performance with breaker trips', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];

      // Create many particles
      for (let i = 0; i < 300; i++) {
        system.spawn(path, 1000 + i * 10);
      }

      // Trip some particles (simulate breaker trip)
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        if (system.particles[i]) {
          system.particles[i].setTripped(true);
        }
      }

      // Update with tripped particles
      for (let frame = 0; frame < 60; frame++) {
        system.update(0.016);
        system.updateTrippedParticles();
      }

      const updateTime = performance.now() - startTime;

      expect(updateTime).toBeLessThan(100); // Trip handling should be fast
      expect(system.particles.filter(p => p.tripped).length).toBe(100);
    });
  });

  describe('Resource Management', () => {
    test('should properly clean up resources on destroy', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];

      // Create particles and state
      for (let i = 0; i < 200; i++) {
        system.spawn(path, 1000 + i * 10);
      }

      system.activeFaults.set('test1', { nodeId: 'n1', Icc: 5000 });
      system.trippedBreakers.add('breaker1');

      expect(system.particles.length).toBe(200);
      expect(system.activeFaults.size).toBe(1);
      expect(system.trippedBreakers.size).toBe(1);

      // Destroy system
      system.clearAll();

      expect(system.particles.length).toBe(0);
      expect(system.activeFaults.size).toBe(0);
      expect(system.trippedBreakers.size).toBe(0);
    });

    test('should handle canvas resize efficiently', () => {
      // Mock different canvas sizes
      const sizes = [
        { width: 800, height: 600 },
        { width: 1920, height: 1080 },
        { width: 2560, height: 1440 }
      ];

      const resizeTimes = [];

      sizes.forEach(size => {
        mockCanvas.getBoundingClientRect.mockReturnValue({
          width: size.width,
          height: size.height
        });

        const resizeStart = performance.now();
        renderer.resize();
        const resizeTime = performance.now() - resizeStart;

        resizeTimes.push(resizeTime);
      });

      // Resizing should be fast regardless of canvas size
      resizeTimes.forEach(time => {
        expect(time).toBeLessThan(10); // Should resize in under 10ms
      });

      expect(mockCanvas.width).toBe(2560);
      expect(mockCanvas.height).toBe(1440);
    });
  });
});
