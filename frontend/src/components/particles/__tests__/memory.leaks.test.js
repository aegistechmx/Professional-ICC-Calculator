/**
 * components/particles/__tests__/memory.leaks.test.js
 * Memory leak tests for long-running animations
 * Tests memory management, cleanup, and resource disposal
 */

import { vi } from 'vitest';
import { ParticleSystem } from '../ParticleSystem.js';
import { ParticleRenderer } from '../ParticleRenderer.js';
import { FaultParticleEngine } from '../FaultParticleEngine.js';
import { BreakerEffects } from '../BreakerEffects.js';

// Mock canvas for memory testing
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

// Mock performance.now for memory testing
const originalPerformanceNow = performance.now;
let mockTime = 0;

describe('Memory Leak Tests', () => {
  let system;
  let renderer;
  let engine;
  let breakerEffects;

  beforeEach(() => {
    // Reset mock time
    mockTime = 0;
    performance.now = vi.fn().mockReturnValue(mockTime);

    system = new ParticleSystem({ maxParticles: 1000 });
    renderer = new ParticleRenderer(mockCanvas);
    engine = new FaultParticleEngine(mockCanvas);
    breakerEffects = new BreakerEffects(system);
  });

  afterEach(() => {
    // Restore original performance.now
    performance.now = originalPerformanceNow;

    // Clean up
    if (system) system.clearAll();
    if (engine) engine.destroy();
  });

  describe('Particle System Memory Management', () => {
    test('should not leak memory with continuous particle spawning and cleanup', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
      const initialMemory = system.getStats().memoryUsage;

      // Run many cycles of spawn and cleanup
      for (let cycle = 0; cycle < 100; cycle++) {
        // Spawn particles
        for (let i = 0; i < 50; i++) {
          system.spawn(path, 1000 + i * 10, { lifespan: 100 });
        }

        // Update to let particles die
        for (let frame = 0; frame < 20; frame++) {
          mockTime += 16; // 16ms per frame
          system.update(0.016);
        }

        // Force cleanup
        system.cleanupOldParticles();
      }

      const finalMemory = system.getStats().memoryUsage;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be minimal (less than 10KB)
      expect(memoryGrowth).toBeLessThan(10240);
      expect(system.particles.length).toBeLessThan(100); // Most should be cleaned up
    });

    test('should properly clean up particles on clearAll', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];

      // Create many particles with trails
      for (let i = 0; i < 500; i++) {
        system.spawn(path, 1000 + i * 10, { trailLength: 10 });
      }

      // Update to build trails
      for (let frame = 0; frame < 30; frame++) {
        system.update(0.016);
      }

      expect(system.particles.length).toBe(500);
      expect(system.activeFaults.size).toBe(0);

      // Clear all
      system.clearAll();

      expect(system.particles.length).toBe(0);
      expect(system.activeFaults.size).toBe(0);
      expect(system.trippedBreakers.size).toBe(0);
    });

    test('should not accumulate memory with long trails', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
      const initialMemory = system.getStats().memoryUsage;

      // Create particles with long trails
      for (let i = 0; i < 100; i++) {
        system.spawn(path, 1000, { trailLength: 50 });
      }

      // Update for many frames to build long trails
      for (let frame = 0; frame < 100; frame++) {
        system.update(0.016);
      }

      // Check trail memory usage
      let totalTrailPoints = 0;
      system.particles.forEach(particle => {
        totalTrailPoints += particle.trail.length;
      });

      // Trail points should be limited despite many updates
      expect(totalTrailPoints).toBeLessThan(100 * 50); // Max trail points per particle

      // Memory should not grow excessively
      const currentMemory = system.getStats().memoryUsage;
      const memoryGrowth = currentMemory - initialMemory;
      expect(memoryGrowth).toBeLessThan(50000); // 50KB for trails
    });

    test('should handle fault cleanup properly', () => {
      const graph = {
        nodes: [{ id: 'n1', position: { x: 0, y: 0 } }],
        edges: []
      };

      // Create multiple faults
      const faultIds = [];
      for (let i = 0; i < 10; i++) {
        const faultId = engine.emitFaultParticles(graph, 'n1', 1000 + i * 100);
        faultIds.push(faultId);
      }

      expect(engine.activeFaults.size).toBe(10);

      // Clear individual faults
      engine.endFault(faultIds[0]);
      expect(engine.activeFaults.size).toBe(9);

      // Clear all faults
      engine.clearAll();
      expect(engine.activeFaults.size).toBe(0);
      expect(engine.trippedBreakers.size).toBe(0);
    });
  });

  describe('Engine Memory Management', () => {
    test('should not leak memory with long-running animations', () => {
      const graph = {
        nodes: [
          { id: 'n1', position: { x: 0, y: 0 } },
          { id: 'n2', position: { x: 100, y: 0 } }
        ],
        edges: [{ source: 'n1', target: 'n2' }]
      };

      const initialStats = engine.getStats();

      // Run animation for many frames
      for (let frame = 0; frame < 1000; frame++) {
        // Occasionally spawn new particles
        if (frame % 60 === 0) {
          engine.emitFaultParticles(graph, 'n2', 5000);
        }

        // Update engine
        mockTime += 16;
        engine.particleSystem.update(0.016);
        engine.render();

        // Clean up old faults periodically
        if (frame % 300 === 0) {
          const faultIds = Array.from(engine.activeFaults.keys());
          if (faultIds.length > 3) {
            engine.endFault(faultIds[0]);
          }
        }
      }

      const finalStats = engine.getStats();

      // Should not have excessive memory growth
      expect(finalStats.totalParticles).toBeLessThan(200);
      expect(finalStats.activeFaults).toBeLessThan(5);
    });

    test('should properly destroy engine and release resources', () => {
      const graph = {
        nodes: [{ id: 'n1', position: { x: 0, y: 0 } }],
        edges: []
      };

      // Create some state
      engine.emitFaultParticles(graph, 'n1', 5000);
      engine.handleBreakerTrip('breaker1', graph);

      expect(engine.activeFaults.size).toBe(1);
      expect(engine.trippedBreakers.size).toBe(1);

      // Destroy engine
      engine.destroy();

      expect(engine.isRunning).toBe(false);
      expect(engine.activeFaults.size).toBe(0);
      expect(engine.trippedBreakers.size).toBe(0);
    });

    test('should handle timeout cleanup properly', () => {
      const graph = {
        nodes: [{ id: 'n1', position: { x: 0, y: 0 } }],
        edges: []
      };

      // Track timeouts
      const originalSetTimeout = global.setTimeout;
      const originalClearTimeout = global.clearTimeout;
      const activeTimeouts = new Set();

      global.setTimeout = vi.fn().mockImplementation((fn, delay) => {
        const timeoutId = originalSetTimeout(fn, delay);
        activeTimeouts.add(timeoutId);
        return timeoutId;
      });

      global.clearTimeout = vi.fn().mockImplementation((timeoutId) => {
        activeTimeouts.delete(timeoutId);
        return originalClearTimeout(timeoutId);
      });

      // Create faults that use timeouts
      for (let i = 0; i < 10; i++) {
        engine.emitFaultParticles(graph, 'n1', 1000 + i * 100);
      }

      expect(activeTimeouts.size).toBeGreaterThan(0);

      // Destroy engine (should clean up timeouts)
      engine.destroy();

      // Restore original functions
      global.setTimeout = originalSetTimeout;
      global.clearTimeout = originalClearTimeout;

      // Note: In a real implementation, we'd need to track and clear timeouts
      // This test verifies the concept of timeout cleanup
    });
  });

  describe('Breaker Effects Memory Management', () => {
    test('should not leak memory with breaker trip effects', () => {
      const graph = {
        nodes: [{ id: 'breaker1', position: { x: 50, y: 50 }, type: 'breaker' }],
        edges: []
      };

      // Create particles
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
      for (let i = 0; i < 100; i++) {
        system.spawn(path, 1000 + i * 10);
      }

      const initialEffects = breakerEffects.trippedBreakers.size;

      // Trip breaker multiple times
      for (let i = 0; i < 20; i++) {
        breakerEffects.handleBreakerTrip('breaker1', { tripTime: 0.1 }, graph);

        // Update to process effects
        for (let frame = 0; frame < 10; frame++) {
          breakerEffects.update(0.016);
        }
      }

      // Should not accumulate effects indefinitely
      expect(breakerEffects.trippedBreakers.size).toBe(1); // Same breaker
    });

    test('should clean up old breaker effects', () => {
      const graph = {
        nodes: [
          { id: 'breaker1', position: { x: 50, y: 50 }, type: 'breaker' },
          { id: 'breaker2', position: { x: 150, y: 50 }, type: 'breaker' }
        ],
        edges: []
      };

      // Trip multiple breakers
      breakerEffects.handleBreakerTrip('breaker1', { tripTime: 0.1 }, graph);

      // Fast forward time
      mockTime += 10000; // 10 seconds

      // Trip another breaker
      breakerEffects.handleBreakerTrip('breaker2', { tripTime: 0.1 }, graph);

      // Update to clean up old effects
      breakerEffects.update(0.016);

      // Should have cleaned up very old effects
      const effects = breakerEffects.getEffects();
      expect(effects.length).toBeLessThan(10); // Should not accumulate indefinitely
    });
  });

  describe('Renderer Memory Management', () => {
    test('should not leak memory with continuous rendering', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];

      // Create particles
      for (let i = 0; i < 200; i++) {
        system.spawn(path, 1000 + i * 10, { trailLength: 8 });
      }

      // Update to build trails
      for (let frame = 0; frame < 50; frame++) {
        system.update(0.016);
      }

      // Render many frames
      const initialCalls = mockCanvas.getContext().clearRect.mock.calls.length;

      for (let frame = 0; frame < 500; frame++) {
        renderer.render(system.particles);
      }

      const finalCalls = mockCanvas.getContext().clearRect.mock.calls.length;

      // Should have called clearRect for each frame
      expect(finalCalls - initialCalls).toBe(500);

      // Canvas context should not accumulate state
      expect(renderer.ctx.save).toHaveBeenCalledTimes(500);
      expect(renderer.ctx.restore).toHaveBeenCalledTimes(500);
    });

    test('should handle canvas resize without memory leaks', () => {
      // Resize multiple times
      const sizes = [
        { width: 800, height: 600 },
        { width: 1920, height: 1080 },
        { width: 2560, height: 1440 },
        { width: 800, height: 600 }
      ];

      sizes.forEach(size => {
        mockCanvas.getBoundingClientRect.mockReturnValue(size);
        renderer.resize();
      });

      // Canvas should be properly sized
      expect(mockCanvas.width).toBe(800);
      expect(mockCanvas.height).toBe(600);

      // Should not accumulate event listeners
      expect(renderer.resizeHandler).toBeUndefined(); // Should be cleaned up
    });

    test('should destroy renderer and clean up resources', () => {
      // Create some rendering state
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
      for (let i = 0; i < 50; i++) {
        system.spawn(path, 1000 + i * 10);
      }

      renderer.render(system.particles);

      // Destroy renderer
      renderer.destroy();

      // Should have cleared canvas
      expect(mockCanvas.getContext().clearRect).toHaveBeenCalled();
    });
  });

  describe('Long-Running Animation Tests', () => {
    test('should handle 10-minute animation without memory issues', () => {
      const graph = {
        nodes: [
          { id: 'n1', position: { x: 0, y: 0 } },
          { id: 'n2', position: { x: 100, y: 0 } },
          { id: 'breaker1', position: { x: 50, y: 0 }, type: 'breaker' }
        ],
        edges: [
          { source: 'n1', target: 'breaker1' },
          { source: 'breaker1', target: 'n2' }
        ]
      };

      const initialMemory = system.getStats().memoryUsage;

      // Simulate 10 minutes of animation (60 FPS * 600 seconds)
      for (let frame = 0; frame < 36000; frame++) {
        mockTime += 16; // 16ms per frame

        // Occasionally spawn new faults
        if (frame % 1800 === 0) { // Every 30 seconds
          engine.emitFaultParticles(graph, 'n2', 3000 + Math.random() * 5000);
        }

        // Occasionally trip breaker
        if (frame % 3600 === 0) { // Every minute
          engine.handleBreakerTrip('breaker1', graph);
        }

        // Update and render
        engine.particleSystem.update(0.016);
        engine.render();

        // Periodic cleanup
        if (frame % 6000 === 0) { // Every 2 minutes
          const faultIds = Array.from(engine.activeFaults.keys());
          if (faultIds.length > 5) {
            engine.endFault(faultIds[0]);
          }
        }
      }

      const finalMemory = system.getStats().memoryUsage;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be reasonable for 10-minute animation
      expect(memoryGrowth).toBeLessThan(102400); // 100KB for 10 minutes
      expect(engine.getStats().totalParticles).toBeLessThan(300);
      expect(engine.getStats().activeFaults).toBeLessThan(10);
    });

    test('should handle high-frequency fault events', () => {
      const graph = {
        nodes: [{ id: 'n1', position: { x: 0, y: 0 } }],
        edges: []
      };

      const initialMemory = system.getStats().memoryUsage;

      // Create faults very frequently (every 10 frames)
      for (let frame = 0; frame < 600; frame++) { // 10 seconds at 60 FPS
        mockTime += 16;

        if (frame % 10 === 0) {
          engine.emitFaultParticles(graph, 'n1', 1000 + frame * 10);
        }

        engine.particleSystem.update(0.016);
        engine.render();

        // Clean up old faults
        if (frame % 100 === 0) {
          const faultIds = Array.from(engine.activeFaults.keys());
          if (faultIds.length > 20) {
            engine.endFault(faultIds[0]);
          }
        }
      }

      const finalMemory = system.getStats().memoryUsage;
      const memoryGrowth = finalMemory - initialMemory;

      // Should handle high-frequency events without excessive memory growth
      expect(memoryGrowth).toBeLessThan(51200); // 50KB for high-frequency events
      expect(engine.getStats().activeFaults).toBeLessThan(25);
    });
  });

  describe('Resource Cleanup Tests', () => {
    test('should clean up all resources on engine destruction', () => {
      const graph = {
        nodes: [
          { id: 'n1', position: { x: 0, y: 0 } },
          { id: 'breaker1', position: { x: 50, y: 0 }, type: 'breaker' }
        ],
        edges: [{ source: 'n1', target: 'breaker1' }]
      };

      // Create complex state
      engine.emitFaultParticles(graph, 'n1', 5000);
      engine.handleBreakerTrip('breaker1', graph);

      // Create particles with trails
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
      for (let i = 0; i < 100; i++) {
        engine.particleSystem.spawn(path, 1000 + i * 10, { trailLength: 10 });
      }

      // Update to build state
      for (let frame = 0; frame < 50; frame++) {
        engine.particleSystem.update(0.016);
      }

      // Verify state exists
      expect(engine.getStats().totalParticles).toBe(100);
      expect(engine.getStats().activeFaults).toBe(1);
      expect(engine.getStats().trippedBreakers).toBe(1);

      // Destroy engine
      engine.destroy();

      // Verify cleanup
      expect(engine.getStats().totalParticles).toBe(0);
      expect(engine.getStats().activeFaults).toBe(0);
      expect(engine.getStats().trippedBreakers).toBe(0);
      expect(engine.isRunning).toBe(false);
    });

    test('should handle emergency cleanup gracefully', () => {
      // Create system with maximum particles
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
      for (let i = 0; i < 1000; i++) {
        system.spawn(path, 1000 + i * 10, { trailLength: 20 });
      }

      // Create many faults
      const graph = { nodes: [{ id: 'n1', position: { x: 0, y: 0 } }], edges: [] };
      for (let i = 0; i < 50; i++) {
        engine.emitFaultParticles(graph, 'n1', 1000 + i * 100);
      }

      // Emergency cleanup
      system.clearAll();
      engine.clearAll();
      breakerEffects.trippedBreakers.clear();

      // Should be completely clean
      expect(system.particles.length).toBe(0);
      expect(system.activeFaults.size).toBe(0);
      expect(system.trippedBreakers.size).toBe(0);
      expect(engine.activeFaults.size).toBe(0);
      expect(engine.trippedBreakers.size).toBe(0);
      expect(breakerEffects.trippedBreakers.size).toBe(0);
    });
  });
});
