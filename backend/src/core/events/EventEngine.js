/**
 * EventEngine - Industrial Event-Based Simulation Engine
 * 
 * This module provides a robust event-driven simulation system with:
 * - Priority Queue for time-ordered event processing
 * - Deterministic event ordering
 * - Real-time simulation loop
 * - Event scheduling and cancellation
 * - State change tracking
 * 
 * Architecture:
 * Events → Priority Queue → Event Loop → State Updates → New Events
 * 
 * @class EventEngine
 */

/**
 * Priority Queue for time-ordered event processing
 * Uses binary heap for O(log n) push/pop operations
 */
class PriorityQueue {
  constructor() {
    this.queue = [];
    this.size = 0;
  }

  /**
   * Push event into queue
   * @param {Object} event - Event to push { time, priority, type, data, id }
   * @returns {string} Event ID
   */
  push(event) {
    if (!event.id) {
      event.id = this.generateId();
    }
    
    this.queue.push(event);
    this.size++;
    this.bubbleUp(this.size - 1);
    
    return event.id;
  }

  /**
   * Pop event with smallest time (and highest priority if times equal)
   * @returns {Object} Event or null if empty
   */
  pop() {
    if (this.size === 0) return null;
    
    const min = this.queue[0];
    const end = this.queue.pop();
    this.size--;
    
    if (this.size > 0) {
      this.queue[0] = end;
      this.sinkDown(0);
    }
    
    return min;
  }

  /**
   * Peek at next event without removing
   * @returns {Object} Event or null if empty
   */
  peek() {
    return this.size > 0 ? this.queue[0] : null;
  }

  /**
   * Remove event by ID
   * @param {string} eventId - Event ID to remove
   * @returns {boolean} True if removed, false if not found
   */
  remove(eventId) {
    const index = this.queue.findIndex(e => e.id === eventId);
    if (index === -1) return false;
    
    // Remove and replace with last element
    const end = this.queue.pop();
    this.size--;
    
    if (index < this.size) {
      this.queue[index] = end;
      
      // Try to bubble up first, if that doesn't work, sink down
      if (index > 0 && this.queue[index].time < this.queue[Math.floor((index - 1) / 2)].time) {
        this.bubbleUp(index);
      } else {
        this.sinkDown(index);
      }
    }
    
    return true;
  }

  /**
   * Check if queue is empty
   * @returns {boolean}
   */
  empty() {
    return this.size === 0;
  }

  /**
   * Get queue size
   * @returns {number}
   */
  getSize() {
    return this.size;
  }

  /**
   * Clear all events
   */
  clear() {
    this.queue = [];
    this.size = 0;
  }

  /**
   * Generate unique event ID
   * @returns {string}
   */
  generateId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Bubble up element to maintain heap property
   * @param {number} index - Index to bubble up
   */
  bubbleUp(index) {
    const element = this.queue[index];
    
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.queue[parentIndex];
      
      // Compare by time first, then by priority if times are equal
      if (element.time > parent.time) break;
      if (element.time === parent.time && element.priority <= parent.priority) break;
      
      this.queue[index] = parent;
      index = parentIndex;
    }
    
    this.queue[index] = element;
  }

  /**
   * Sink down element to maintain heap property
   * @param {number} index - Index to sink down
   */
  sinkDown(index) {
    const length = this.size;
    const element = this.queue[index];
    
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const leftChildIndex = 2 * index + 1;
      const rightChildIndex = 2 * index + 2;
      let swapIndex = null;
      let leftChild, rightChild;
      
      if (leftChildIndex < length) {
        leftChild = this.queue[leftChildIndex];
        if (leftChild.time < element.time) {
          swapIndex = leftChildIndex;
        } else if (leftChild.time === element.time && leftChild.priority > element.priority) {
          swapIndex = leftChildIndex;
        }
      }
      
      if (rightChildIndex < length) {
        rightChild = this.queue[rightChildIndex];
        if (
          (swapIndex === null && rightChild.time < element.time) ||
          (swapIndex === null && rightChild.time === element.time && rightChild.priority > element.priority) ||
          (swapIndex !== null && rightChild.time < leftChild.time) ||
          (swapIndex !== null && rightChild.time === leftChild.time && rightChild.priority > leftChild.priority)
        ) {
          swapIndex = rightChildIndex;
        }
      }
      
      if (swapIndex === null) break;
      
      this.queue[index] = this.queue[swapIndex];
      index = swapIndex;
    }
    
    this.queue[index] = element;
  }
}

/**
 * Event Engine for time-based simulation
 * Processes events in chronological order with deterministic ordering
 */
class EventEngine {
  /**
   * Create a new event engine
   * @param {Object} options - Engine options
   * @param {Object} options.system - System model to apply events to
   * @param {Function} options.applyEvent - Function to apply event to system
   * @param {Function} options.recomputeSystem - Function to recompute system state
   * @param {number} options.maxTime - Maximum simulation time
   * @param {number} options.timeStep - Default time step for event scheduling
   */
  constructor(options = {}) {
    this.queue = new PriorityQueue();
    this.system = options.system || null;
    this.applyEvent = options.applyEvent || null;
    this.recomputeSystem = options.recomputeSystem || null;
    this.maxTime = options.maxTime || Infinity;
    this.timeStep = options.timeStep || 0.01;
    
    // Engine state
    this.currentTime = 0;
    this.eventCount = 0;
    this.processedEvents = [];
    this.isRunning = false;
    
    // Event handlers
    this.handlers = new Map();
  }

  /**
   * Schedule an event
   * @param {Object} event - Event to schedule
   * @param {number} event.time - Event time
   * @param {string} event.type - Event type
   * @param {Object} event.data - Event data
   * @param {number} event.priority - Event priority (higher = more important)
   * @returns {string} Event ID
   */
  schedule(event) {
    if (!event.time) {
      event.time = this.currentTime + this.timeStep;
    }
    
    if (!event.priority) {
      event.priority = 0;
    }
    
    const eventId = this.queue.push(event);
    this.eventCount++;
    
    return eventId;
  }

  /**
   * Cancel an event by ID
   * @param {string} eventId - Event ID to cancel
   * @returns {boolean} True if cancelled, false if not found
   */
  cancel(eventId) {
    return this.queue.remove(eventId);
  }

  /**
   * Run event loop until queue is empty or maxTime is reached
   * @param {Object} options - Run options
   * @param {number} options.maxTime - Override max time
   * @param {Function} options.onEvent - Callback for each processed event
   * @param {Function} options.onStep - Callback for each time step
   * @returns {Object} Run results
   */
  run(options = {}) {
    const {
      maxTime = this.maxTime,
      onEvent = null,
      onStep = null
    } = options;
    
    this.isRunning = true;
    this.currentTime = 0;
    const startTime = Date.now();
    
    const results = {
      processed: 0,
      cancelled: 0,
      skipped: 0,
      endTime: 0,
      duration: 0,
      events: []
    };
    
    // Main event loop
    while (!this.queue.empty()) {
      const event = this.queue.peek();
      
      // Check if we've reached max time
      if (event.time > maxTime) {
        break;
      }
      
      // Update current time
      this.currentTime = event.time;
      
      // Process event
      const processed = this.processEvent(event);
      
      if (processed) {
        results.processed++;
        results.events.push({
          ...event,
          processed: true,
          timestamp: this.currentTime
        });
        
        if (onEvent) {
          onEvent(event, this.currentTime);
        }
      } else {
        results.skipped++;
      }
      
      // Remove event from queue
      this.queue.pop();
      
      // Recompute system state
      if (this.recomputeSystem) {
        this.recomputeSystem(this.system);
      }
      
      // Call step callback
      if (onStep) {
        onStep(this.currentTime, this.system);
      }
    }
    
    this.isRunning = false;
    results.endTime = this.currentTime;
    results.duration = (Date.now() - startTime) / 1000;
    
    return results;
  }

  /**
   * Process a single event
   * @param {Object} event - Event to process
   * @returns {boolean} True if processed successfully
   */
  processEvent(event) {
    try {
      // Check if handler exists for this event type
      const handler = this.handlers.get(event.type);
      
      if (handler) {
        // Use registered handler
        handler(event, this.system, this.currentTime);
      } else if (this.applyEvent) {
        // Use default apply function
        this.applyEvent(event, this.system, this.currentTime);
      } else {
        console.warn(`No handler for event type: ${event.type}`);
        return false;
      }
      
      // Store in processed events
      this.processedEvents.push({
        ...event,
        processedAt: this.currentTime
      });
      
      return true;
    } catch (error) {
      console.error(`Error processing event ${event.id}:`, error);
      return false;
    }
  }

  /**
   * Register an event handler
   * @param {string} eventType - Event type to handle
   * @param {Function} handler - Handler function
   */
  registerHandler(eventType, handler) {
    this.handlers.set(eventType, handler);
  }

  /**
   * Unregister an event handler
   * @param {string} eventType - Event type to unregister
   */
  unregisterHandler(eventType) {
    this.handlers.delete(eventType);
  }

  /**
   * Get current simulation time
   * @returns {number}
   */
  getCurrentTime() {
    return this.currentTime;
  }

  /**
   * Get queue statistics
   * @returns {Object} Queue statistics
   */
  getStats() {
    return {
      queueSize: this.queue.getSize(),
      currentTime: this.currentTime,
      eventCount: this.eventCount,
      processedCount: this.processedEvents.length,
      isRunning: this.isRunning
    };
  }

  /**
   * Get all pending events
   * @returns {Array} Array of pending events
   */
  getPendingEvents() {
    return [...this.queue.queue];
  }

  /**
   * Get processed events
   * @returns {Array} Array of processed events
   */
  getProcessedEvents() {
    return [...this.processedEvents];
  }

  /**
   * Reset engine to initial state
   */
  reset() {
    this.queue.clear();
    this.currentTime = 0;
    this.eventCount = 0;
    this.processedEvents = [];
    this.isRunning = false;
  }

  /**
   * Pause the event loop
   */
  pause() {
    this.isRunning = false;
  }

  /**
   * Resume the event loop
   */
  resume() {
    this.isRunning = true;
  }
}

/**
 * Event types for electrical simulation
 */
const EventTypes = {
  FAULT: 'fault',
  SWITCH: 'switch',
  LOAD_CHANGE: 'load_change',
  GENERATOR_CHANGE: 'generator_change',
  TRANSFORMER_TAP_CHANGE: 'transformer_tap_change',
  CAPACITOR_SWITCH: 'capacitor_switch',
  PROTECTION_TRIP: 'protection_trip',
  PROTECTION_RECLOSER: 'protection_recloser',
  FREQUENCY_DEVIATION: 'frequency_deviation',
  VOLTAGE_DIP: 'voltage_dip',
  ISLANDING: 'islanding',
  SYNCHRONIZATION: 'synchronization'
};

module.exports = {
  PriorityQueue,
  EventEngine,
  EventTypes
};
