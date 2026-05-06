/**
 * faultModel.js - Fault modeling for TS-SCOPF
 *
 * Responsibility: Model electrical faults for dynamic simulation
 * NO Express, NO axios, NO UI logic
 */

/**
 * Create three-phase fault model
 * @param {Object} system - Power system model
 * @param {Object} fault - Fault specification
 * @returns {Object} Modified system with fault
 */
function createThreePhaseFault(system, fault) {
  const modified = JSON.parse(JSON.stringify(system))

  if (fault.type === 'three_phase') {
    // Apply fault at specified bus
    const faultedBus = modified.buses.find(b => b.id === fault.bus)
    if (faultedBus) {
      // Set bus voltage to zero for fault
      faultedBus.voltage = { magnitude: 0, angle: 0 } // voltage (V)
      faultedBus.faulted = true
    }

    // Modify impedance of connected lines
    modified.branches.forEach((branch, _i) => {
      if (branch.from === fault.bus || branch.to === fault.bus) {
        // Add fault impedance
        branch.R += fault.R || 0.001
        branch.X += fault.X || 0.01
        branch.faulted = true
      }
    })
  }

  return modified
}

/**
 * Clear fault from system
 * @param {Object} system - Power system model
 * @param {Object} fault - Fault specification
 * @returns {Object} Modified system without fault
 */
function clearFault(system, fault) {
  const modified = JSON.parse(JSON.stringify(system))

  // Restore bus voltage
  const faultedBus = modified.buses.find(b => b.id === fault.bus)
  if (faultedBus) {
    faultedBus.voltage = { magnitude: 1.0, angle: 0 } // voltage (V)
    delete faultedBus.faulted
  }

  // Restore line impedances
  modified.branches.forEach((branch, _i) => {
    if (branch.from === fault.bus || branch.to === fault.bus) {
      if (branch.originalR !== undefined && branch.originalX !== undefined) {
        branch.R = branch.originalR
        branch.X = branch.originalX
      }
      delete branch.faulted
    }
  })

  return modified
}

/**
 * Generate fault scenarios for TS-SCOPF
 * @param {Object} system - Power system model
 * @param {Object} options - Fault generation options
 * @returns {Array} Fault scenarios
 */
function generateFaultScenarios(system, options = {}) {
  const {
    faultType = 'three_phase',
    faultLocations = 'all', // 'all', 'critical', 'buses'
    faultDuration = 0.1, // seconds
    faultImpedance = { R: 0.001, X: 0.01 },
  } = options

  const scenarios = []

  // Store original impedances
  system.branches.forEach((branch, _i) => {
    branch.originalR = branch.R
    branch.originalX = branch.X
  })

  if (faultLocations === 'all' || faultLocations === 'buses') {
    // Create fault at each bus
    system.buses.forEach((bus, _i) => {
      if (bus.type === 'PQ' || bus.type === 'PV') {
        // Don't fault slack bus
        scenarios.push({
          type: faultType,
          bus: bus.id,
          start: 0.1,
          clear: 0.1 + faultDuration,
          R: faultImpedance.R,
          X: faultImpedance.X,
          description: `3-phase fault at Bus ${bus.id}`,
        })
      }
    })
  }

  if (faultLocations === 'all' || faultLocations === 'lines') {
    // Create fault at each line (50% point)
    system.branches.forEach((branch, _i) => {
      scenarios.push({
        type: faultType,
        line: branch.id,
        from: branch.from,
        to: branch.to,
        location: 0.5, // 50% along the line
        start: 0.1,
        clear: 0.1 + faultDuration,
        R: faultImpedance.R,
        X: faultImpedance.X,
        description: `3-phase fault at Line ${branch.id} (50%)`,
      })
    })
  }

  return scenarios
}

/**
 * Apply fault to system for dynamic simulation
 * @param {Object} system - Power system model
 * @param {Object} fault - Fault specification
 * @param {number} time - Current simulation time
 * @returns {Object} System with/without fault
 */
function applyFaultAtTime(system, fault, time) {
  if (time >= fault.start && time < fault.clear) {
    return createThreePhaseFault(system, fault)
  } else {
    return clearFault(system, fault)
  }
}

/**
 * Calculate fault current
 * @param {Object} system - Power system model
 * @param {Object} fault - Fault specification
 * @returns {number} Fault current (pu)
 */
function calculateFaultCurrent(system, fault) {
  if (fault.type === 'three_phase') {
    const faultedBus = system.buses.find(b => b.id === fault.bus)
    if (faultedBus) {
      // Simplified fault current calculation
      const Zfault = Math.sqrt(fault.R * fault.R + fault.X * fault.X)
      const Ifault = 1.0 / Zfault // Assuming 1.0 pu voltage

      return Ifault
    }
  }

  return 0
}

/**
 * Check fault status
 * @param {Object} fault - Fault specification
 * @param {number} time - Current simulation time
 * @returns {Object} Fault status
 */
function getFaultStatus(fault, time) {
  if (time < fault.start) {
    return { active: false, status: 'pre-fault' }
  } else if (time >= fault.start && time < fault.clear) {
    return { active: true, status: 'during-fault' }
  } else {
    return { active: false, status: 'post-fault' }
  }
}

/**
 * Generate critical fault scenarios
 * @param {Object} system - Power system model
 * @param {Object} options - Generation options
 * @returns {Array} Critical fault scenarios
 */
function generateCriticalFaults(system, options = {}) {
  const {
    maxFaults = 5,
    priority = 'high_load', // 'high_load', 'critical_lines', 'all'
  } = options

  const scenarios = []

  if (priority === 'high_load') {
    // Focus on high-load buses
    const loadBuses = system.buses
      .filter(b => b.type === 'PQ' && b.P < 0)
      .sort((a, b) => Math.abs(a.P) - Math.abs(b.P))
      .slice(0, maxFaults)

    loadBuses.forEach(bus => {
      scenarios.push({
        type: 'three_phase',
        bus: bus.id,
        start: 0.1,
        clear: 0.2,
        R: 0.001,
        X: 0.01,
        severity: 'high',
        description: `Critical fault at high-load Bus ${bus.id}`,
      })
    })
  } else if (priority === 'critical_lines') {
    // Focus on critical transmission lines
    const criticalLines = system.branches
      .filter(b => b.limit && b.loading > 0.7)
      .sort((a, b) => b.loading - a.loading)
      .slice(0, maxFaults)

    criticalLines.forEach(line => {
      scenarios.push({
        type: 'three_phase',
        line: line.id,
        from: line.from,
        to: line.to,
        location: 0.5,
        start: 0.1,
        clear: 0.2,
        R: 0.001,
        X: 0.01,
        severity: 'high',
        description: `Critical fault at Line ${line.id}`,
      })
    })
  }

  return scenarios
}

module.exports = {
  createThreePhaseFault,
  clearFault,
  generateFaultScenarios,
  applyFaultAtTime,
  calculateFaultCurrent,
  getFaultStatus,
  generateCriticalFaults,
}
