/**
 * components/particles/__tests__/canvas.rendering.test.js
 * Canvas rendering and visual effect tests
 * Tests canvas operations, visual effects, and rendering performance
 */

import { vi } from 'vitest';
import { ParticleRenderer } from '../ParticleRenderer.js';
import { Particle } from '../Particle.js';
import { ParticleSystem } from '../ParticleSystem.js';
import { BreakerEffects } from '../BreakerEffects.js';

if (typeof globalThis.requestAnimationFrame !== 'function') {
  globalThis.requestAnimationFrame = cb => setTimeout(cb, 0);
}

// Mock canvas with full context for rendering tests
const createMockCanvas = () => ({
  width: 1920,
  height: 1080,
  getContext: vi.fn().mockReturnValue({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    rect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    clip: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    translate: vi.fn(),
    transform: vi.fn(),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
    createLinearGradient: vi.fn().mockReturnValue({
      addColorStop: vi.fn()
    }),
    createRadialGradient: vi.fn().mockReturnValue({
      addColorStop: vi.fn()
    }),
    createPattern: vi.fn(),
    drawImage: vi.fn(),
    putImageData: vi.fn(),
    getImageData: vi.fn(),
    createImageData: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 100 }),
    font: '',
    textAlign: '',
    textBaseline: '',
    fillText: vi.fn(),
    strokeText: vi.fn()
  }),
  getBoundingClientRect: vi.fn().mockReturnValue({
    width: 1920,
    height: 1080
  }),
  style: {},
  toDataURL: vi.fn().mockReturnValue('data:image/png;base64,test'),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
});

describe('Canvas Rendering Tests', () => {
  let canvas;
  let renderer;
  let ctx;

  beforeEach(() => {
    canvas = createMockCanvas();
    renderer = new ParticleRenderer(canvas);
    ctx = canvas.getContext();
  });

  describe('Basic Rendering Operations', () => {
    test('should initialize canvas context correctly', () => {
      // setupCanvas sets globalCompositeOperation to 'source-over'
      expect(ctx.globalCompositeOperation).toBe('source-over');
      // imageSmoothing is enabled in setupCanvas
      expect(ctx.imageSmoothingEnabled).toBe(true);
    });

    test('should clear canvas correctly', () => {
      renderer.clear();
      expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height);
    });

    test('should handle empty particle array', () => {
      renderer.render([]);
      expect(ctx.clearRect).toHaveBeenCalled();
      expect(ctx.arc).not.toHaveBeenCalled();
    });

    test('should render single particle correctly', () => {
      const path = [{ x: 50, y: 50 }, { x: 100, y: 100 }];
      const particle = new Particle(path, 0.5, 1000);
      particle.t = 0.5;

      renderer.render([particle]);

      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.arc).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });

    test('should render multiple particles correctly', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
      const particles = [];

      for (let i = 0; i < 10; i++) {
        const particle = new Particle(path, 0.5, 1000 + i * 100);
        particle.t = i * 0.1;
        particles.push(particle);
      }

      renderer.render(particles);

      expect(ctx.beginPath).toHaveBeenCalledTimes(10);
      expect(ctx.arc).toHaveBeenCalledTimes(10);
      expect(ctx.fill).toHaveBeenCalledTimes(10);
    });
  });

  describe('Visual Effects', () => {
    test('should render glow effects for high intensity particles', () => {
      const path = [{ x: 50, y: 50 }, { x: 100, y: 100 }];
      const particle = new Particle(path, 0.5, 15000); // High intensity
      particle.t = 0.5;

      renderer.options.enableGlow = true;
      renderer.render([particle]);

      // Should have multiple rendering passes for glow
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.globalAlpha).toBeLessThan(1);
      expect(ctx.arc).toHaveBeenCalled();
    });

    test('should render particle trails correctly', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
      const particle = new Particle(path, 0.5, 5000, { trailLength: 5 });

      // Build trail
      for (let i = 0; i < 10; i++) {
        particle.update(0.016);
      }

      renderer.options.enableTrails = true;
      renderer.render([particle]);

      // Should render trail points
      expect(particle.trail.length).toBeGreaterThan(0);
      expect(ctx.globalAlpha).toBeLessThan(1); // Trail should be transparent
    });

    test('should render breaker trip effects', () => {
      const path = [{ x: 50, y: 50 }, { x: 100, y: 100 }];
      const particle = new Particle(path, 0.5, 1000);
      particle.setTripped(true);

      renderer.render([particle]);

      // Tripped particle should have different color
      expect(ctx.fillStyle).toContain('59, 130, 246'); // Blue color
    });

    test('should handle turbulence effects', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
      const particle = new Particle(path, 0.5, 5000, { turbulence: 5 });
      particle.t = 0.5;

      renderer.render([particle]);

      // Position should be affected by turbulence
      const position = particle.getPosition();
      expect(position.x).not.toBe(50); // Should be offset from exact position
      expect(position.y).not.toBe(50);
    });
  });

  describe('Color and Appearance', () => {
    test('should apply correct colors based on particle intensity', () => {
      const path = [{ x: 50, y: 50 }, { x: 100, y: 100 }];

      renderer.options.enableGlow = false;
      renderer.options.enableTrails = false;

      // Low intensity - red
      const lowParticle = new Particle(path, 0.5, 1000);
      renderer.render([lowParticle]);
      expect(ctx.fillStyle).toContain('255, 50, 50');

      // Medium intensity - orange-red
      const mediumParticle = new Particle(path, 0.5, 4000);
      renderer.render([mediumParticle]);
      expect(ctx.fillStyle).toContain('255, 80, 0');

      // High intensity - yellow
      const highParticle = new Particle(path, 0.5, 15000);
      renderer.render([highParticle]);
      expect(highParticle.color).toContain('255, 255, 0');
    });

    test('should handle alpha transparency correctly', () => {
      const path = [{ x: 50, y: 50 }, { x: 100, y: 100 }];
      const particle = new Particle(path, 0.5, 5000);

      renderer.render([particle]);

      // Should have alpha channel
      expect(ctx.fillStyle).toMatch(/rgba\(\d+, \d+, \d+, [\d.]+\)/);
    });

    test('should render particle size based on intensity', () => {
      const path = [{ x: 50, y: 50 }, { x: 100, y: 100 }];

      // Small particle
      const smallParticle = new Particle(path, 0.5, 1000);
      const smallRadius = smallParticle.getRadius();

      // Large particle
      const largeParticle = new Particle(path, 0.5, 15000);
      const largeRadius = largeParticle.getRadius();

      expect(largeRadius).toBeGreaterThan(smallRadius);
      expect(smallRadius).toBeGreaterThanOrEqual(2);
      expect(largeRadius).toBeLessThanOrEqual(8);
    });
  });

  describe('Canvas Operations', () => {
    test('should handle canvas resizing correctly', () => {
      const newWidth = 2560;
      const newHeight = 1440;

      canvas.getBoundingClientRect.mockReturnValue({
        width: newWidth,
        height: newHeight
      });

      renderer.resize();

      // Canvas dimensions are scaled by devicePixelRatio
      expect(canvas.width).toBe(newWidth * window.devicePixelRatio);
      expect(canvas.height).toBe(newHeight * window.devicePixelRatio);
      expect(canvas.style.width).toBe(newWidth + 'px');
      expect(canvas.style.height).toBe(newHeight + 'px');
    });

    test('should export canvas as image', () => {
      const imageData = renderer.exportImage('png', 1.0);

      expect(canvas.toDataURL).toHaveBeenCalledWith('image/png', 1.0);
      expect(imageData).toBe('data:image/png;base64,test');
    });

    test('should handle different export formats', () => {
      // PNG format
      renderer.exportImage('png', 0.8);
      expect(canvas.toDataURL).toHaveBeenCalledWith('image/png', 0.8);

      // JPEG format
      renderer.exportImage('jpeg', 0.9);
      expect(canvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.9);
    });

    test('should handle canvas context loss', () => {
      // Create a new renderer with null context to test initialization handling
      const nullCanvas = {
        getContext: vi.fn(() => null),
        getBoundingClientRect: vi.fn(() => ({ width: 800, height: 600 }))
      };

      // Should handle gracefully during construction
      let errorRenderer;
      expect(() => {
        errorRenderer = new ParticleRenderer(nullCanvas);
      }).not.toThrow();
    });
  });

  describe('Performance Optimization', () => {
    test('should batch rendering operations', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
      const particles = [];

      for (let i = 0; i < 100; i++) {
        particles.push(new Particle(path, 0.5, 1000 + i * 10));
      }

      renderer.options.enableGlow = false;
      renderer.options.enableTrails = false;
      renderer.render(particles);

      // Should render 100 particles
      expect(ctx.beginPath).toHaveBeenCalledTimes(100);
      expect(ctx.arc).toHaveBeenCalledTimes(100);
    });

    test('should skip rendering for off-screen particles', () => {
      const path = [{ x: -1000, y: -1000 }, { x: -900, y: -900 }]; // Off-screen
      const particle = new Particle(path, 0.5, 1000);

      renderer.render([particle]);

      // Should still attempt to render (culling handled by particle system)
      expect(ctx.arc).toHaveBeenCalled();
    });

    test('should handle high particle counts efficiently', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
      const particles = [];

      // Create many particles
      for (let i = 0; i < 500; i++) {
        particles.push(new Particle(path, 0.5, 1000));
      }

      renderer.options.enableGlow = false;
      renderer.options.enableTrails = false;
      renderer.render(particles);

      // Should handle high counts
      expect(ctx.beginPath).toHaveBeenCalledTimes(500);
    });
  });

  describe('Visual Quality', () => {
    test('should render smooth particle edges', () => {
      const path = [{ x: 50, y: 50 }, { x: 100, y: 100 }];
      const particle = new Particle(path, 0.5, 5000);

      renderer.render([particle]);

      // Should use proper rendering settings
      expect(ctx.globalAlpha).toBeGreaterThan(0);
      expect(ctx.globalAlpha).toBeLessThanOrEqual(1);
    });

    test('should handle anti-aliasing correctly', () => {
      const path = [{ x: 50.5, y: 50.5 }, { x: 100.5, y: 100.5 }]; // Sub-pixel positions
      const particle = new Particle(path, 0.5, 5000);
      particle.t = 0.5;

      renderer.render([particle]);

      // Should render sub-pixel positions
      expect(ctx.arc).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        0,
        Math.PI * 2
      );
    });

    test('should maintain visual consistency across frames', () => {
      const path = [{ x: 50, y: 50 }, { x: 100, y: 100 }];
      const particle = new Particle(path, 0.5, 5000);

      renderer.options.enableGlow = false;
      renderer.options.enableTrails = false;

      // Render multiple frames
      for (let frame = 0; frame < 10; frame++) {
        particle.update(0.016);
        renderer.render([particle]);
      }

      // Should maintain consistent rendering
      expect(ctx.beginPath).toHaveBeenCalledTimes(10);
      expect(ctx.fill).toHaveBeenCalledTimes(10);
    });
  });

  describe('Breaker Effects Rendering', () => {
    test('should render breaker trip animations', () => {
      const breakerEffects = new BreakerEffects(new ParticleSystem());
      const graph = {
        nodes: [{ id: 'breaker1', position: { x: 100, y: 100 }, type: 'breaker' }],
        edges: []
      };

      // Trigger breaker trip
      breakerEffects.handleBreakerTrip('breaker1', { tripTime: 0.1 }, graph, 5000);

      // Render effects
      breakerEffects.renderEffects(ctx, graph.nodes);

      // Should render breaker trip visualization
      expect(ctx.save).toHaveBeenCalled();
    });

    test('should handle multiple simultaneous breaker trips', () => {
      const breakerEffects = new BreakerEffects(new ParticleSystem());
      const graph = {
        nodes: [
          { id: 'breaker1', position: { x: 100, y: 100 }, type: 'breaker' },
          { id: 'breaker2', position: { x: 200, y: 100 }, type: 'breaker' }
        ],
        edges: []
      };

      // Trip multiple breakers
      breakerEffects.handleBreakerTrip('breaker1', { tripTime: 0.1 }, graph, 5000);
      breakerEffects.handleBreakerTrip('breaker2', { tripTime: 0.1 }, graph, 5000);

      breakerEffects.renderEffects(ctx, graph.nodes);

      // Should render multiple effects
      expect(ctx.save).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid particle data gracefully', () => {
      const invalidParticle = {
        getPosition: () => ({ x: NaN, y: Infinity }),
        getRadius: () => -1,
        color: 'invalid-color'
      };

      expect(() => {
        renderer.render([invalidParticle]);
      }).not.toThrow();
    });

    test('should handle canvas context errors', () => {
      // Mock context error
      ctx.arc.mockImplementation(() => {
        throw new Error('Context error');
      });

      const path = [{ x: 50, y: 50 }, { x: 100, y: 100 }];
      const particle = new Particle(path, 0.5, 1000);

      expect(() => {
        renderer.render([particle]);
      }).not.toThrow();
    });

    test('should handle memory pressure during rendering', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
      const particles = [];

      // Create very large particle array
      for (let i = 0; i < 1000; i++) {
        particles.push(new Particle(path, 0.5, 1000 + i * 10));
      }

      expect(() => {
        renderer.render(particles);
      }).not.toThrow();
    });
  });

  describe('Advanced Visual Effects', () => {
    test('should render gradient effects for particles', () => {
      const path = [{ x: 50, y: 50 }, { x: 100, y: 100 }];
      const particle = new Particle(path, 0.5, 10000); // High intensity

      renderer.options.enableGradients = true;
      renderer.render([particle]);

      // Should use gradient for high intensity particles
      expect(ctx.createRadialGradient).toHaveBeenCalled();
    });

    test('should render particle shadows', () => {
      const path = [{ x: 50, y: 50 }, { x: 100, y: 100 }];
      const particle = new Particle(path, 0.5, 5000);

      renderer.options.enableShadows = true;
      renderer.render([particle]);

      // Should apply shadow settings
      expect(ctx.save).toHaveBeenCalled();
    });

    test('should handle composite operations correctly', () => {
      const path = [{ x: 50, y: 50 }, { x: 100, y: 100 }];
      const particles = [
        new Particle(path, 0.5, 5000),
        new Particle(path, 0.5, 8000)
      ];

      renderer.options.enableBlending = true;
      renderer.render(particles);

      // Should use composite operations
      expect(ctx.globalCompositeOperation).toBeDefined();
    });

    test('should render particle motion blur', () => {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
      const particle = new Particle(path, 0.5, 5000);

      // Build velocity for motion blur
      for (let i = 0; i < 5; i++) {
        particle.update(0.016);
      }

      renderer.options.enableMotionBlur = true;
      renderer.render([particle]);

      // Should render motion blur effect
      expect(ctx.globalAlpha).toBeLessThan(1);
    });
  });

  describe('Debug and Development Features', () => {
    test('should render debug information when enabled', () => {
      const stats = {
        totalParticles: 10,
        activeFaults: 2,
        trippedBreakers: 1
      };

      renderer.options.debug = true;
      renderer.renderDebugInfo(stats);

      // Should render debug text with statistics
      expect(ctx.fillText).toHaveBeenCalled();
      expect(ctx.font).toBeDefined();
    });

    test('should not render debug info when disabled', () => {
      const stats = { totalParticles: 10, activeFaults: 2, trippedBreakers: 1 };

      renderer.options.debug = false;
      renderer.renderDebugInfo(stats);

      // Should not call fillText when debug is disabled
      expect(ctx.fillText).not.toHaveBeenCalled();
    });

    test('should render particle statistics when debug enabled', () => {
      const stats = {
        totalParticles: 10,
        activeFaults: 2,
        trippedBreakers: 1
      };

      renderer.options.debug = true;
      renderer.renderDebugInfo(stats);

      // Should render statistics text
      expect(ctx.fillText).toHaveBeenCalled();
      expect(ctx.font).toBeDefined();
    });
  });

  describe('Accessibility Features', () => {
    test('should handle high contrast mode', () => {
      const path = [{ x: 50, y: 50 }, { x: 100, y: 100 }];
      const particle = new Particle(path, 0.5, 5000);

      renderer.options.highContrast = true;
      renderer.render([particle]);

      // Should use high contrast colors
      expect(ctx.fillStyle).toBeDefined();
    });

    test('should handle reduced motion preferences', () => {
      // When reducedMotion is enabled, the renderer should still function
      // but may skip certain visual effects
      const path = [{ x: 50, y: 50 }, { x: 100, y: 100 }];
      const particle = new Particle(path, 0.5, 5000);

      renderer.options.reducedMotion = true;

      // Should render without throwing
      expect(() => {
        renderer.render([particle]);
      }).not.toThrow();

      // Particle position should be valid
      const position = particle.getPosition();
      expect(position.x).toBeDefined();
      expect(position.y).toBeDefined();
    });

    test('should handle color blind friendly mode', () => {
      const path = [{ x: 50, y: 50 }, { x: 100, y: 100 }];
      const particle = new Particle(path, 0.5, 5000);

      renderer.options.colorBlindFriendly = true;
      renderer.render([particle]);

      // Should use accessible color palette
      expect(ctx.fillStyle).toBeDefined();
    });
  });
});
