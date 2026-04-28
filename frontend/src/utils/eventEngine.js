/**
 * Event Engine for Dynamic Simulation
 * Discrete event simulation for power system protection
 */

/**
 * Event types for dynamic simulation
 */
export const EVENT_TYPES = {
  FAULT: 'fault',
  TRIP: 'trip',
  RECLOSER: 'recloser',
  OPEN: 'open',
  CLOSE: 'close'
};

/**
 * Create a fault event
 * @param {string} busId - Bus where fault occurs
 * @param {number} time - Event time in seconds
 * @param {Object} faultData - Fault parameters
 * @returns {Object} Fault event
 */
export function createFaultEvent(busId, time = 0, faultData = {}) {
  return {
    time,
    type: EVENT_TYPES.FAULT,
    elementId: busId,
    data: {
      faultType: faultData.faultType || '3P',
      impedance: faultData.impedance || 0,
      ...faultData
    }
  };
}

/**
 * Create a trip event
 * @param {string} relayId - Relay that trips
 * @param {number} time - Trip time in seconds
 * @returns {Object} Trip event
 */
export function createTripEvent(relayId, time) {
  return {
    time,
    type: EVENT_TYPES.TRIP,
    elementId: relayId
  };
}

/**
 * Create a breaker open event
 * @param {string} breakerId - Breaker to open
 * @param {number} time - Open time in seconds
 * @returns {Object} Open event
 */
export function createOpenEvent(breakerId, time) {
  return {
    time,
    type: EVENT_TYPES.OPEN,
    elementId: breakerId
  };
}

/**
 * Create a recloser event
 * @param {string} relayId - Relay that recloses
 * @param {number} time - Reclose time in seconds
 * @param {number} attempt - Reclose attempt number
 * @returns {Object} Reclose event
 */
export function createRecloseEvent(relayId, time, attempt = 1) {
  return {
    time,
    type: EVENT_TYPES.RECLOSER,
    elementId: relayId,
    data: { attempt }
  };
}

/**
 * Sort events by time
 * @param {Array} events - Array of events
 * @returns {Array} Sorted events
 */
export function sortEventsByTime(events) {
  return [...events].sort((a, b) => a.time - b.time);
}

/**
 * Filter events by type
 * @param {Array} events - Array of events
 * @param {string} type - Event type to filter
 * @returns {Array} Filtered events
 */
export function filterEventsByType(events, type) {
  return events.filter(e => e.type === type);
}

/**
 * Get next event after a given time
 * @param {Array} events - Array of sorted events
 * @param {number} currentTime - Current simulation time
 * @returns {Object|null} Next event or null
 */
export function getNextEvent(events, currentTime) {
  return events.find(e => e.time > currentTime) || null;
}

/**
 * Event queue manager
 */
export class EventQueue {
  constructor() {
    this.events = [];
    this.currentTime = 0;
  }
  
  /**
   * Add event to queue
   */
  add(event) {
    this.events.push(event);
    this.events.sort((a, b) => a.time - b.time);
  }
  
  /**
   * Get next event
   */
  getNext() {
    return this.events.shift() || null;
  }
  
  /**
   * Peek at next event without removing
   */
  peek() {
    return this.events[0] || null;
  }
  
  /**
   * Check if queue is empty
   */
  isEmpty() {
    return this.events.length === 0;
  }
  
  /**
   * Get all events
   */
  getAll() {
    return [...this.events];
  }
  
  /**
   * Clear queue
   */
  clear() {
    this.events = [];
    this.currentTime = 0;
  }
}
