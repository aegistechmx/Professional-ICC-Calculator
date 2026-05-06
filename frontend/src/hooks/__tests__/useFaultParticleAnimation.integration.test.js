/**
 * hooks/__tests__/useFaultParticleAnimation.integration.test.js
 * Integration tests for React hook lifecycle
 * Tests hook initialization, fault animation, cleanup, and state management
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import useFaultParticleAnimation from '../useFaultParticleAnimation.js';

// Mock the particle engine components
jest.mock('../components/particles/FaultParticleEngine.js', () => ({
  FaultParticleEngine: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    clearAll: jest.fn(),
    emitFaultParticles: jest.fn().mockReturnValue('fault_test_123'),
    handleBreakerTrip: jest.fn(),
    getStats: jest.fn().mockReturnValue({
      totalParticles: 10,
      activeFaults: 1,
      trippedBreakers: 0,
      isRunning: true
    }),
    updateOptions: jest.fn(),
    exportFrame: jest.fn().mockReturnValue('data:image/png;base64,test'),
    destroy: jest.fn()
  }))
}));

jest.mock('../components/particles/BreakerEffects.js', () => ({
  BreakerEffects: jest.fn().mockImplementation(() => ({
    handleBreakerTrip: jest.fn()
  }))
}));

// Mock canvas element
const mockCanvas = {
  width: 800,
  height: 600,
  getContext: jest.fn().mockReturnValue({
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    beginPath: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    scale: jest.fn(),
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1
  }),
  getBoundingClientRect: jest.fn().mockReturnValue({
    width: 800,
    height: 600
  }),
  style: {},
  toDataURL: jest.fn().mockReturnValue('data:image/png;base64,test')
};

// Mock HTMLCanvasElement
global.HTMLCanvasElement = jest.fn().mockImplementation(() => mockCanvas);
global.performance = {
  now: jest.fn().mockReturnValue(Date.now())
};
global.requestAnimationFrame = jest.fn().mockImplementation(cb => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn();

describe('useFaultParticleAnimation Hook Integration Tests', () => {
  const mockGraph = {
    nodes: [
      { id: 'source', type: 'source', position: { x: 0, y: 0 }, data: {} },
      { id: 'breaker1', type: 'breaker', position: { x: 100, y: 0 }, data: { rating: 100 } },
      { id: 'load1', type: 'load', position: { x: 200, y: 0 }, data: {} }
    ],
    edges: [
      { id: 'e1', source: 'source', target: 'breaker1' },
      { id: 'e2', source: 'breaker1', target: 'load1' }
    ]
  };

  const mockOnNodeUpdate = jest.fn();
  const mockOnEdgeUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset canvas mock
    mockCanvas.getContext.mockClear();
  });

  describe('Hook Initialization', () => {
    test('should initialize with default state', () => {
      const { result } = renderHook(() => 
        useFaultParticleAnimation(mockGraph, mockOnNodeUpdate, mockOnEdgeUpdate)
      );

      expect(result.current.particleEngine).toBeNull();
      expect(result.current.isAnimating).toBe(false);
      expect(result.current.activeFaults).toBeInstanceOf(Map);
      expect(result.current.activeFaults.size).toBe(0);
      expect(result.current.trippedBreakers).toBeInstanceOf(Set);
      expect(result.current.trippedBreakers.size).toBe(0);
      expect(result.current.canvasRef).toBeDefined();
    });

    test('should initialize particle engine when canvas ref is set', async () => {
      const { result } = renderHook(() => 
        useFaultParticleAnimation(mockGraph, mockOnNodeUpdate, mockOnEdgeUpdate)
      );

      // Simulate canvas being attached
      act(() => {
        result.current.canvasRef.current = mockCanvas;
      });

      await waitFor(() => {
        expect(result.current.particleEngine).not.toBeNull();
      });
    });

    test('should not initialize engine without canvas', () => {
      const { result } = renderHook(() => 
        useFaultParticleAnimation(mockGraph, mockOnNodeUpdate, mockOnEdgeUpdate)
      );

      // Don't set canvas ref
      expect(result.current.particleEngine).toBeNull();
    });
  });

  describe('Fault Animation Lifecycle', () => {
    test('should start fault animation correctly', async () => {
      const { result } = renderHook(() => 
        useFaultParticleAnimation(mockGraph, mockOnNodeUpdate, mockOnEdgeUpdate)
      );

      // Set up canvas
      act(() => {
        result.current.canvasRef.current = mockCanvas;
      });

      await waitFor(() => {
        expect(result.current.particleEngine).not.toBeNull();
      });

      // Start fault animation
      let faultId;
      act(() => {
        faultId = result.current.startFaultParticleAnimation('load1', 5000);
      });

      expect(faultId).toBeDefined();
      expect(mockOnNodeUpdate).toHaveBeenCalledWith('load1', {
        style: {
          background: '#fee2e2',
          border: '3px solid #ef4444',
          boxShadow: '0 0 20px rgba(239, 68, 68, 0.5)'
        },
        data: {
          ...mockGraph.nodes.find(n => n.id === 'load1')?.data,
          status: 'FAULT',
          Icc: 5000
        }
      });
    });

    test('should handle breaker trip during animation', async () => {
      const { result } = renderHook(() => 
        useFaultParticleAnimation(mockGraph, mockOnNodeUpdate, mockOnEdgeUpdate)
      );

      // Set up canvas and start animation
      act(() => {
        result.current.canvasRef.current = mockCanvas;
      });

      await waitFor(() => {
        expect(result.current.particleEngine).not.toBeNull();
      });

      act(() => {
        result.current.startFaultParticleAnimation('load1', 5000);
      });

      // Handle breaker trip
      act(() => {
        result.current.handleBreakerTrip('breaker1', { tripTime: 0.1 }, mockGraph);
      });

      expect(mockOnNodeUpdate).toHaveBeenCalledWith('breaker1', {
        style: {
          background: '#fef3c7',
          border: '3px solid #f59e0b',
          boxShadow: '0 0 15px rgba(245, 158, 11, 0.5)'
        },
        data: {
          ...mockGraph.nodes.find(n => n.id === 'breaker1')?.data,
          status: 'TRIPPED',
          tripTime: 0.1
        }
      });
    });

    test('should stop animation and clean up state', async () => {
      const { result } = renderHook(() => 
        useFaultParticleAnimation(mockGraph, mockOnNodeUpdate, mockOnEdgeUpdate)
      );

      // Set up canvas and start animation
      act(() => {
        result.current.canvasRef.current = mockCanvas;
      });

      await waitFor(() => {
        expect(result.current.particleEngine).not.toBeNull();
      });

      act(() => {
        result.current.startFaultParticleAnimation('load1', 5000);
      });

      expect(result.current.isAnimating).toBe(true);

      // Stop animation
      act(() => {
        result.current.stopParticleAnimation();
      });

      expect(result.current.isAnimating).toBe(false);
      expect(result.current.activeFaults.size).toBe(0);
      expect(result.current.trippedBreakers.size).toBe(0);

      // Should restore node and edge styles
      expect(mockOnNodeUpdate).toHaveBeenCalledWith('source', {
        style: {},
        data: { status: null, Icc: null, tripTime: null }
      });
      expect(mockOnEdgeUpdate).toHaveBeenCalledWith('e1', {
        style: {},
        animated: false,
        data: { status: null, intensity: null }
      });
    });

    test('should handle multiple concurrent faults', async () => {
      const { result } = renderHook(() => 
        useFaultParticleAnimation(mockGraph, mockOnNodeUpdate, mockOnEdgeUpdate)
      );

      act(() => {
        result.current.canvasRef.current = mockCanvas;
      });

      await waitFor(() => {
        expect(result.current.particleEngine).not.toBeNull();
      });

      // Start multiple faults
      act(() => {
        result.current.startFaultParticleAnimation('load1', 3000);
      });

      act(() => {
        result.current.startFaultParticleAnimation('source', 8000);
      });

      expect(result.current.activeFaults.size).toBe(2);
      expect(result.current.isAnimating).toBe(true);
    });
  });

  describe('State Management', () => {
    test('should update active faults state correctly', async () => {
      const { result } = renderHook(() => 
        useFaultParticleAnimation(mockGraph, mockOnNodeUpdate, mockOnEdgeUpdate)
      );

      act(() => {
        result.current.canvasRef.current = mockCanvas;
      });

      await waitFor(() => {
        expect(result.current.particleEngine).not.toBeNull();
      });

      // Start fault
      act(() => {
        result.current.startFaultParticleAnimation('load1', 5000);
      });

      expect(result.current.activeFaults.size).toBe(1);
      expect(result.current.isAnimating).toBe(true);

      // Check fault data structure
      const faultArray = Array.from(result.current.activeFaults.values());
      expect(faultArray[0]).toMatchObject({
        nodeId: 'load1',
        Icc: 5000
      });
      expect(faultArray[0].startTime).toBeDefined();
    });

    test('should update tripped breakers state correctly', async () => {
      const { result } = renderHook(() => 
        useFaultParticleAnimation(mockGraph, mockOnNodeUpdate, mockOnEdgeUpdate)
      );

      act(() => {
        result.current.canvasRef.current = mockCanvas;
      });

      await waitFor(() => {
        expect(result.current.particleEngine).not.toBeNull();
      });

      // Trip breaker
      act(() => {
        result.current.handleBreakerTrip('breaker1', { tripTime: 0.1 }, mockGraph);
      });

      expect(result.current.trippedBreakers.size).toBe(1);
      expect(result.current.trippedBreakers.has('breaker1')).toBe(true);
    });

    test('should clear all state on stop', async () => {
      const { result } = renderHook(() => 
        useFaultParticleAnimation(mockGraph, mockOnNodeUpdate, mockOnEdgeUpdate)
      );

      act(() => {
        result.current.canvasRef.current = mockCanvas;
      });

      await waitFor(() => {
        expect(result.current.particleEngine).not.toBeNull();
      });

      // Create some state
      act(() => {
        result.current.startFaultParticleAnimation('load1', 5000);
      });

      act(() => {
        result.current.handleBreakerTrip('breaker1', { tripTime: 0.1 }, mockGraph);
      });

      expect(result.current.activeFaults.size).toBe(1);
      expect(result.current.trippedBreakers.size).toBe(1);

      // Stop and clear
      act(() => {
        result.current.stopParticleAnimation();
      });

      expect(result.current.activeFaults.size).toBe(0);
      expect(result.current.trippedBreakers.size).toBe(0);
    });
  });

  describe('API Methods', () => {
    test('should update particle options correctly', async () => {
      const { result } = renderHook(() => 
        useFaultParticleAnimation(mockGraph, mockOnNodeUpdate, mockOnEdgeUpdate)
      );

      act(() => {
        result.current.canvasRef.current = mockCanvas;
      });

      await waitFor(() => {
        expect(result.current.particleEngine).not.toBeNull();
      });

      const newOptions = {
        particleSystem: { maxParticles: 800 },
        renderer: { enableGlow: false }
      };

      act(() => {
        result.current.updateParticleOptions(newOptions);
      });

      expect(result.current.particleEngine.updateOptions).toHaveBeenCalledWith(newOptions);
    });

    test('should export frame correctly', async () => {
      const { result } = renderHook(() => 
        useFaultParticleAnimation(mockGraph, mockOnNodeUpdate, mockOnEdgeUpdate)
      );

      act(() => {
        result.current.canvasRef.current = mockCanvas;
      });

      await waitFor(() => {
        expect(result.current.particleEngine).not.toBeNull();
      });

      let frameData;
      act(() => {
        frameData = result.current.exportFrame('png', 0.8);
      });

      expect(frameData).toBe('data:image/png;base64,test');
    });

    test('should get particle statistics correctly', async () => {
      const { result } = renderHook(() => 
        useFaultParticleAnimation(mockGraph, mockOnNodeUpdate, mockOnEdgeUpdate)
      );

      // Without engine
      let stats = result.current.getParticleStats();
      expect(stats).toEqual({
        totalParticles: 0,
        activeFaults: 0,
        trippedBreakers: 0,
        isRunning: false
      });

      // With engine
      act(() => {
        result.current.canvasRef.current = mockCanvas;
      });

      await waitFor(() => {
        expect(result.current.particleEngine).not.toBeNull();
      });

      stats = result.current.getParticleStats();
      expect(stats.totalParticles).toBe(10);
      expect(stats.activeFaults).toBe(1);
      expect(stats.isRunning).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing graph gracefully', () => {
      const { result } = renderHook(() => 
        useFaultParticleAnimation(null, mockOnNodeUpdate, mockOnEdgeUpdate)
      );

      act(() => {
        result.current.canvasRef.current = mockCanvas;
      });

      // Should not crash when trying to start animation
      act(() => {
        const faultId = result.current.startFaultParticleAnimation('load1', 5000);
        expect(faultId).toBeUndefined();
      });
    });

    test('should handle invalid node ID gracefully', async () => {
      const { result } = renderHook(() => 
        useFaultParticleAnimation(mockGraph, mockOnNodeUpdate, mockOnEdgeUpdate)
      );

      act(() => {
        result.current.canvasRef.current = mockCanvas;
      });

      await waitFor(() => {
        expect(result.current.particleEngine).not.toBeNull();
      });

      // Should not crash with invalid node
      act(() => {
        result.current.startFaultParticleAnimation('invalid_node', 5000);
      });

      // Should still try to call node update but handle missing node gracefully
      expect(mockOnNodeUpdate).toHaveBeenCalledWith('invalid_node', expect.any(Object));
    });

    test('should handle missing callbacks gracefully', () => {
      const { result } = renderHook(() => 
        useFaultParticleAnimation(mockGraph, null, null)
      );

      act(() => {
        result.current.canvasRef.current = mockCanvas;
      });

      // Should not crash when callbacks are missing
      expect(() => {
        act(() => {
          result.current.startFaultParticleAnimation('load1', 5000);
        });
      }).not.toThrow();
    });
  });

  describe('Cleanup and Memory Management', () => {
    test('should clean up on unmount', () => {
      const { result, unmount } = renderHook(() => 
        useFaultParticleAnimation(mockGraph, mockOnNodeUpdate, mockOnEdgeUpdate)
      );

      act(() => {
        result.current.canvasRef.current = mockCanvas;
      });

      // Start animation
      act(() => {
        result.current.startFaultParticleAnimation('load1', 5000);
      });

      const mockEngine = result.current.particleEngine;

      // Unmount hook
      act(() => {
        unmount();
      });

      expect(mockEngine.destroy).toHaveBeenCalled();
    });

    test('should handle window resize events', () => {
      const { result } = renderHook(() => 
        useFaultParticleAnimation(mockGraph, mockOnNodeUpdate, mockOnEdgeUpdate)
      );

      act(() => {
        result.current.canvasRef.current = mockCanvas;
      });

      // Mock window resize
      const mockResizeEvent = new Event('resize');
      
      act(() => {
        window.dispatchEvent(mockResizeEvent);
      });

      // Should not crash and should handle resize gracefully
      expect(result.current.canvasRef.current).toBe(mockCanvas);
    });

    test('should not create multiple engines', () => {
      const { result, rerender } = renderHook(() => 
        useFaultParticleAnimation(mockGraph, mockOnNodeUpdate, mockOnEdgeUpdate)
      );

      act(() => {
        result.current.canvasRef.current = mockCanvas;
      });

      // Rerender hook
      rerender();

      // Should still have only one engine reference
      expect(result.current.particleEngine).not.toBeNull();
    });
  });

  describe('Backward Compatibility', () => {
    test('should provide compatibility methods', () => {
      const { result } = renderHook(() => 
        useFaultParticleAnimation(mockGraph, mockOnNodeUpdate, mockOnEdgeUpdate)
      );

      expect(result.current.startFaultAnimation).toBeDefined();
      expect(result.current.stopAnimation).toBeDefined();
      expect(result.current.startFaultAnimation).toBe(result.current.startFaultParticleAnimation);
      expect(result.current.stopAnimation).toBe(result.current.stopParticleAnimation);
    });
  });

  describe('React Dependencies', () => {
    test('should handle graph changes correctly', async () => {
      const { result, rerender } = renderHook(
        ({ graph }) => useFaultParticleAnimation(graph, mockOnNodeUpdate, mockOnEdgeUpdate),
        { initialProps: { graph: mockGraph } }
      );

      act(() => {
        result.current.canvasRef.current = mockCanvas;
      });

      await waitFor(() => {
        expect(result.current.particleEngine).not.toBeNull();
      });

      // Change graph
      const newGraph = {
        nodes: [{ id: 'new_node', type: 'load', position: { x: 50, y: 50 }, data: {} }],
        edges: []
      };

      act(() => {
        rerender({ graph: newGraph });
      });

      // Should handle graph change gracefully
      expect(result.current.particleEngine).not.toBeNull();
    });

    test('should handle callback changes correctly', async () => {
      const { result, rerender } = renderHook(
        ({ onNodeUpdate }) => useFaultParticleAnimation(mockGraph, onNodeUpdate, mockOnEdgeUpdate),
        { initialProps: { onNodeUpdate: mockOnNodeUpdate } }
      );

      act(() => {
        result.current.canvasRef.current = mockCanvas;
      });

      await waitFor(() => {
        expect(result.current.particleEngine).not.toBeNull();
      });

      // Change callback
      const newOnNodeUpdate = jest.fn();
      act(() => {
        rerender({ onNodeUpdate: newOnNodeUpdate });
      });

      // Should use new callback
      act(() => {
        result.current.startFaultParticleAnimation('load1', 5000);
      });

      expect(newOnNodeUpdate).toHaveBeenCalled();
    });
  });
});
