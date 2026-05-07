/**
 * core/validation/CascadeTest.js - Cascade Failure Testing for Power System
 *
 * Responsibility: Test cascade failure scenarios and protection coordination
 */

/**
 * Test cascade failure scenarios
 * @param {Object} system - Power system model
 * @param {Object} options - Test options
 * @returns {Object} Cascade test results
 */
function runCascadeTest(system, options = {}) {
  const {
    faultTypes = ['three-phase', 'single-line-ground', 'line-to-line'],
    faultLocations = ['load', 'generator', 'transmission'],
    protectionLevels = ['instantaneous', 'time-delayed', 'coordinate'],
  } = options

  try {
    const results = {
      testSuite: 'CascadeTest',
      timestamp: new Date().toISOString(),
      system: {
        buses: system.buses?.length || 0,
        branches: system.branches?.length || 0,
        protectionDevices: countProtectionDevices(system),
      },
      scenarios: [],
    }

    // Run cascade scenarios
    for (const faultType of faultTypes) {
      for (const faultLocation of faultLocations) {
        for (const protectionLevel of protectionLevels) {
          const scenario = runCascadeScenario(
            system,
            faultType,
            faultLocation,
            protectionLevel
          )
          results.scenarios.push(scenario)
        }
      }
    }

    // Calculate summary statistics
    results.summary = calculateCascadeSummary(results.scenarios)

    return results
  } catch (error) {
    throw new Error(`Cascade test failed: ${error.message}`)
  }
}

/**
 * Run single cascade scenario
 * @param {Object} system - Power system model
 * @param {string} faultType - Type of fault
 * @param {string} faultLocation - Location of fault
 * @param {string} protectionLevel - Protection coordination level
 * @returns {Object} Scenario result
 */
function runCascadeScenario(system, faultType, faultLocation, protectionLevel) {
  const scenario = {
    id: `${faultType}_${faultLocation}_${protectionLevel}`,
    faultType,
    faultLocation,
    protectionLevel,
    startTime: performance.now(),
    events: [],
    cascadeOccurred: false,
    affectedDevices: [],
    isolationTime: 0,
    totalOutage: 0,
  }

  try {
    // Simulate initial fault
    const faultResult = simulateInitialFault(system, faultType, faultLocation)
    scenario.events.push({
      type: 'fault_initiated',
      time: 0,
      details: faultResult,
    })

    // Simulate protection response
    const protectionResponse = simulateProtectionResponse(
      system,
      faultResult,
      protectionLevel
    )
    scenario.events.push({
      type: 'protection_response',
      time: protectionResponse.responseTime,
      details: protectionResponse,
    })

    // Check for cascade initiation
    if (protectionResponse.cascadeTriggered) {
      scenario.cascadeOccurred = true

      // Simulate cascade propagation
      const cascadeResult = simulateCascadePropagation(
        system,
        faultResult,
        protectionResponse
      )
      scenario.events.push({
        type: 'cascade_propagation',
        time: cascadeResult.propagationTime,
        details: cascadeResult,
      })

      scenario.affectedDevices = cascadeResult.affectedDevices
      scenario.totalOutage = cascadeResult.totalOutageMW
      scenario.isolationTime = cascadeResult.isolationTime
    } else {
      // Normal clearing
      scenario.affectedDevices = protectionResponse.trippedDevices
      scenario.totalOutage = calculateOutageMW(
        system,
        protectionResponse.trippedDevices
      )
      scenario.isolationTime = protectionResponse.clearingTime
    }

    scenario.endTime = performance.now()
    scenario.duration = scenario.endTime - scenario.startTime
  } catch (error) {
    scenario.error = error.message
  }

  return scenario
}

/**
 * Simulate initial fault
 * @param {Object} system - Power system model
 * @param {string} faultType - Type of fault
 * @param {string} faultLocation - Location of fault
 * @returns {Object} Fault result
 */
function simulateInitialFault(system, faultType, faultLocation) {
  const faultImpedance = calculateFaultImpedance(system, faultLocation)

  switch (faultType) {
    case 'three-phase':
      return {
        type: 'three-phase',
        impedance: faultImpedance,
        current: calculateFaultCurrent(system, faultImpedance, 'three-phase'),
        voltage: getFaultVoltage(system, faultLocation),
      }

    case 'single-line-ground':
      return {
        type: 'single-line-ground',
        impedance: {
          ...faultImpedance,
          ground: 0.1, // Ground fault impedance
        },
        current: calculateFaultCurrent(
          system,
          faultImpedance,
          'single-line-ground'
        ),
        voltage: getFaultVoltage(system, faultLocation),
      }

    case 'line-to-line':
      return {
        type: 'line-to-line',
        impedance: faultImpedance,
        current: calculateFaultCurrent(system, faultImpedance, 'line-to-line'),
        voltage: getFaultVoltage(system, faultLocation),
      }

    default:
      return {
        type: 'unknown',
        impedance: faultImpedance,
        current: 0,
        voltage: 0,
      }
  }
}

/**
 * Simulate protection response
 * @param {Object} system - Power system model
 * @param {Object} fault - Fault result
 * @param {string} protectionLevel - Protection level
 * @returns {Object} Protection response
 */
function simulateProtectionResponse(system, fault, protectionLevel) {
  const response = {
    protectionLevel,
    responseTime: 0,
    trippedDevices: [],
    cascadeTriggered: false,
    clearingTime: 0,
  }

  // Calculate response time based on protection level
  switch (protectionLevel) {
    case 'instantaneous':
      response.responseTime = 0.01 // 10ms
      break
    case 'time-delayed':
      response.responseTime = 0.1 // 100ms
      break
    case 'coordinate':
      response.responseTime = 0.3 // 300ms
      break
  }

  // Identify affected protection devices
  const affectedDevices = findAffectedProtectionDevices(system, fault)

  // Determine which devices trip
  for (const device of affectedDevices) {
    const shouldTrip = shouldDeviceTrip(device, fault, protectionLevel)

    if (shouldTrip) {
      response.trippedDevices.push({
        deviceId: device.id,
        type: device.type,
        tripTime: response.responseTime,
        coordinationTime: calculateCoordinationTime(device, fault),
      })
    }
  }

  // Check for cascade conditions
  response.cascadeTriggered = checkCascadeConditions(
    system,
    fault,
    response.trippedDevices
  )
  response.clearingTime = response.responseTime + 0.05 // Add clearing time

  return response
}

/**
 * Simulate cascade propagation
 * @param {Object} system - Power system model
 * @param {Object} fault - Initial fault
 * @param {Object} protection - Protection response
 * @returns {Object} Cascade result
 */
function simulateCascadePropagation(system, fault, protection) {
  const cascade = {
    propagationTime: protection.responseTime + 0.1,
    affectedDevices: [],
    totalOutageMW: 0,
    isolationTime: 0,
  }

  // Check for overloads in remaining system
  const overloadedDevices = findOverloadedDevices(
    system,
    fault,
    protection.trippedDevices
  )

  // Simulate sequential tripping
  for (const device of overloadedDevices) {
    const tripTime = cascade.propagationTime + Math.random() * 0.5 // Random delay 0-500ms

    cascade.affectedDevices.push({
      deviceId: device.id,
      type: device.type,
      overload: device.overload,
      tripTime,
      cause: 'cascade_overload',
    })
  }

  // Calculate total outage
  cascade.totalOutageMW = calculateOutageMW(
    system,
    cascade.affectedDevices.map(d => d.deviceId)
  )
  cascade.isolationTime = cascade.propagationTime + 2.0 // Total isolation time

  return cascade
}

/**
 * Calculate fault impedance
 * @param {Object} system - Power system model
 * @param {string} location - Fault location
 * @returns {Object} Fault impedance
 */
function calculateFaultImpedance(system, _location) {
  // Simplified fault impedance calculation
  const baseImpedance = {
    resistance: 0.01,
    reactance: 0.02,
  }

  // Adjust based on system voltage level
  const systemVoltage = getSystemVoltageLevel(system)
  const impedanceMultiplier = systemVoltage > 100000 ? 2.0 : 1.0

  return {
    resistance: baseImpedance.resistance * impedanceMultiplier,
    reactance: baseImpedance.reactance * impedanceMultiplier,
  }
}

/**
 * Calculate fault current
 * @param {Object} system - Power system model
 * @param {Object} impedance - Fault impedance
 * @param {string} faultType - Type of fault
 * @returns {number} Fault current
 */
function calculateFaultCurrent(system, impedance, faultType) {
  const systemVoltage = getSystemVoltageLevel(system)
  const zMagnitude = parseFloat(
    Math.sqrt(impedance.resistance ** 2 + impedance.reactance ** 2).toFixed(6)
  )

  switch (faultType) {
    case 'three-phase':
      return parseFloat(
        (systemVoltage / (Math.sqrt(3) * zMagnitude)).toFixed(6)
      )
    case 'single-line-ground':
      return parseFloat(
        (systemVoltage / (Math.sqrt(3) * zMagnitude * 1.5)).toFixed(6)
      ) // 1.5 factor for SLG
    case 'line-to-line':
      return parseFloat((systemVoltage / (2 * zMagnitude)).toFixed(6))
    default:
      return 0
  }
}

/**
 * Get fault voltage at location
 * @param {Object} system - Power system model
 * @param {string} location - Fault location
 * @returns {number} Fault voltage
 */
function getFaultVoltage(system, _location) {
  // Return nominal system voltage for simplicity
  return parseFloat(getSystemVoltageLevel(system).toFixed(6))
}

/**
 * Get system voltage level
 * @param {Object} system - Power system model
 * @returns {number} System voltage level
 */
function getSystemVoltageLevel(system) {
  // Find highest voltage in system
  let maxVoltage = 0

  if (system.buses) {
    for (const bus of system.buses) {
      if (bus.voltage && bus.voltage > maxVoltage) {
        maxVoltage = bus.voltage
      }
    }
  }

  return parseFloat((maxVoltage || 13800).toFixed(6)) // Default to 13.8kV
}

/**
 * Count protection devices in system
 * @param {Object} system - Power system model
 * @returns {number} Number of protection devices
 */
function countProtectionDevices(system) {
  let count = 0

  if (system.buses) {
    for (const bus of system.buses) {
      if (
        bus.type === 'breaker' ||
        bus.type === 'relay' ||
        bus.type === 'fuse'
      ) {
        count++
      }
    }
  }

  return count
}

/**
 * Find affected protection devices
 * @param {Object} system - Power system model
 * @param {Object} fault - Fault information
 * @returns {Array} Affected devices
 */
function findAffectedProtectionDevices(system, fault) {
  const affected = []

  // Simplified: find devices electrically close to fault
  if (system.buses) {
    for (const bus of system.buses) {
      if (bus.type === 'breaker' || bus.type === 'relay') {
        const distance = calculateElectricalDistance(
          system,
          bus.id,
          fault.location
        )
        if (distance < 5) {
          // Within 5 electrical units
          affected.push({
            id: bus.id,
            type: bus.type,
            distance,
            rating: bus.rating || 100,
          })
        }
      }
    }
  }

  return affected
}

/**
 * Determine if device should trip
 * @param {Object} device - Protection device
 * @param {Object} fault - Fault information
 * @param {string} protectionLevel - Protection coordination level
 * @returns {boolean} Should trip
 */
function shouldDeviceTrip(device, fault, protectionLevel) {
  const faultCurrent = fault.current || 0
  const deviceRating = device.rating || 100

  // Simple pickup logic
  const pickupMultiplier =
    protectionLevel === 'instantaneous'
      ? 10
      : protectionLevel === 'time-delayed'
        ? 3
        : 1.5

  const pickupCurrent = (deviceRating * pickupMultiplier) / 100

  return faultCurrent >= pickupCurrent
}

/**
 * Check cascade conditions
 * @param {Object} system - Power system model
 * @param {Object} fault - Initial fault
 * @param {Array} trippedDevices - Tripped devices
 * @returns {boolean} Cascade triggered
 */
function checkCascadeConditions(system, fault, trippedDevices) {
  // Check for system instability
  const totalLoad = calculateTotalSystemLoad(system)
  const totalGeneration = calculateTotalSystemGeneration(system)
  const remainingCapacity = totalGeneration - totalLoad

  // Cascade if insufficient capacity
  if (remainingCapacity < 0) {
    return true
  }

  // Check for excessive voltage deviation
  const voltageDeviation = calculateVoltageDeviation(system, trippedDevices)
  if (parseFloat(voltageDeviation.toFixed(6)) > 0.2) {
    // 20% deviation
    return true
  }

  return false
}

/**
 * Find overloaded devices
 * @param {Object} system - Power system model
 * @param {Object} fault - Initial fault
 * @param {Array} trippedDevices - Already tripped devices
 * @returns {Array} Overloaded devices
 */
function findOverloadedDevices(system, fault, trippedDevices) {
  const overloaded = []

  // Simplified overload analysis
  if (system.buses) {
    for (const bus of system.buses) {
      if (bus.type === 'breaker' || bus.type === 'line') {
        const newLoad = redistributeLoad(system, fault, trippedDevices, bus.id)
        const deviceRating = bus.rating || 100

        if (newLoad > deviceRating * 1.2) {
          // 120% of rating
          overloaded.push({
            id: bus.id,
            type: bus.type,
            rating: deviceRating,
            newLoad,
            overload: newLoad / deviceRating,
          })
        }
      }
    }
  }

  return overloaded
}

/**
 * Calculate electrical distance
 * @param {Object} system - Power system model
 * @param {string} fromId - From bus ID
 * @param {string} toId - To bus ID
 * @returns {number} Electrical distance
 */
function calculateElectricalDistance(system, fromId, toId) {
  // Simplified electrical distance calculation
  const fromBus = system.buses?.find(b => b.id === fromId)
  const toBus = system.buses?.find(b => b.id === toId)

  if (!fromBus || !toBus) {
    return Infinity
  }

  const voltageDiff = Math.abs(fromBus.voltage - toBus.voltage)
  const impedance = 0.1 // Simplified impedance

  return voltageDiff / impedance
}

/**
 * Calculate coordination time
 * @param {Object} device - Protection device
 * @param {Object} fault - Fault information
 * @returns {number} Coordination time
 */
function calculateCoordinationTime(device, fault) {
  const deviceRating = device.rating || 100
  const faultCurrent = fault.current || 0

  // Simple coordination time calculation
  const timeMultiplier = Math.max(1, faultCurrent / deviceRating)

  return 0.1 * timeMultiplier // Base 100ms scaled by current
}

/**
 * Calculate total system load
 * @param {Object} system - Power system model
 * @returns {number} Total load in MW
 */
function calculateTotalSystemLoad(system) {
  let totalLoad = 0

  if (system.buses) {
    for (const bus of system.buses) {
      if (bus.power && bus.power.P > 0) {
        totalLoad += bus.power.P
      }
    }
  }

  return totalLoad
}

/**
 * Calculate total system generation
 * @param {Object} system - Power system model
 * @returns {number} Total generation in MW
 */
function calculateTotalSystemGeneration(system) {
  let totalGeneration = 0

  if (system.buses) {
    for (const bus of system.buses) {
      if (bus.type === 'generator' && bus.power && bus.power.P > 0) {
        totalGeneration += bus.power.P
      }
    }
  }

  return totalGeneration
}

/**
 * Calculate outage in MW
 * @param {Object} system - Power system model
 * @param {Array} deviceIds - Affected device IDs
 * @returns {number} Total outage in MW
 */
function calculateOutageMW(system, deviceIds) {
  let totalOutage = 0

  if (system.buses) {
    for (const bus of system.buses) {
      if (deviceIds.includes(bus.id) && bus.power && bus.power.P > 0) {
        totalOutage += bus.power.P
      }
    }
  }

  return totalOutage
}

/**
 * Redistribute load after fault
 * @param {Object} system - Power system model
 * @param {Object} fault - Fault information
 * @param {Array} trippedDevices - Tripped devices
 * @param {string} busId - Bus to analyze
 * @returns {number} New load on bus
 */
function redistributeLoad(system, fault, trippedDevices, busId) {
  const originalLoad = system.buses?.find(b => b.id === busId)?.power?.P || 0
  const faultCurrent = fault.current || 0

  // Simplified load redistribution
  const loadTransferFactor = Math.min(1.5, faultCurrent / 1000)
  const newLoad = originalLoad * (1 + loadTransferFactor)

  return newLoad
}

/**
 * Calculate voltage deviation
 * @param {Object} system - Power system model
 * @param {Array} trippedDevices - Tripped devices
 * @returns {number} Maximum voltage deviation
 */
function calculateVoltageDeviation(system, trippedDevices) {
  let maxDeviation = 0

  if (system.buses) {
    for (const bus of system.buses) {
      const nominalVoltage = bus.voltage || 1.0
      const currentVoltage = calculatePostFaultVoltage(
        system,
        bus.id,
        trippedDevices
      )
      const deviation = Number(
        (Math.abs(currentVoltage - nominalVoltage) / nominalVoltage).toFixed(6)
      )

      maxDeviation = Math.max(maxDeviation, deviation)
    }
  }

  return maxDeviation
}

/**
 * Calculate post-fault voltage
 * @param {Object} system - Power system model
 * @param {string} busId - Bus ID
 * @param {Array} trippedDevices - Tripped devices
 * @returns {number} Post-fault voltage
 */
function calculatePostFaultVoltage(system, busId, trippedDevices) {
  const bus = system.buses?.find(b => b.id === busId)
  const nominalVoltage = bus?.voltage || 1.0

  // Simplified voltage calculation
  const voltageDrop = parseFloat((trippedDevices.length * 0.05).toFixed(6)) // 5% drop per tripped device
  const postFaultVoltage = parseFloat(
    (nominalVoltage * (1 - voltageDrop)).toFixed(6)
  )

  return parseFloat(Math.max(0.1, postFaultVoltage).toFixed(6)) // Minimum 10% voltage
}

/**
 * Calculate cascade test summary
 * @param {Array} scenarios - Test scenarios
 * @returns {Object} Summary statistics
 */
function calculateCascadeSummary(scenarios) {
  const summary = {
    totalScenarios: scenarios.length,
    cascadeEvents: 0,
    normalClearings: 0,
    avgIsolationTime: 0,
    maxOutage: 0,
    cascadeRate: 0,
  }

  let totalIsolationTime = 0
  let _totalOutage = 0

  for (const scenario of scenarios) {
    if (scenario.cascadeOccurred) {
      summary.cascadeEvents++
    } else {
      summary.normalClearings++
    }

    totalIsolationTime += scenario.isolationTime || 0
    const _totalOutage = scenario.totalOutage || 0

    summary.maxOutage = Math.max(summary.maxOutage, scenario.totalOutage || 0)
  }

  summary.avgIsolationTime = totalIsolationTime / scenarios.length
  summary.cascadeRate = summary.cascadeEvents / scenarios.length

  return summary
}

module.exports = {
  runCascadeTest,
}
