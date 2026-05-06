/**
 * SystemValidator - Electrical System Validation Module
 *
 * This module provides comprehensive electrical system validation to detect:
 * - Isolated buses
 * - Invalid loops
 * - Sources in short circuit
 * - Inconsistent bases
 * - Invalid connections
 * - Missing slack buses
 * - Invalid transformer connections
 *
 * @class SystemValidator
 */

class SystemValidator {
  /**
   * Validate a complete electrical system
   * @param {Object} system - ElectricalSystem instance
   * @returns {Object} Validation results
   */
  static validateSystem(system) {
    const results = {
      valid: true,
      errors: [],
      warnings: [],
      summary: {},
    }

    // Run all validations
    results.slackBus = this.validateSlackBus(system)
    results.isolatedBuses = this.validateIsolatedBuses(system)
    results.loops = this.validateLoops(system)
    results.shortCircuits = this.validateShortCircuits(system)
    results.bases = this.validateBases(system)
    results.transformers = this.validateTransformers(system)
    results.grounding = this.validateGrounding(system)
    results.loads = this.validateLoads(system)
    results.generators = this.validateGenerators(system)

    // Collect all errors and warnings
    this.collectResults(results)

    // Update summary
    results.summary = {
      totalBuses: system.buses.length,
      totalLines: system.lines.length,
      totalTransformers: system.trafos.length,
      totalLoads: system.loads.length,
      totalGenerators: system.generators.length,
      errorCount: results.errors.length,
      warningCount: results.warnings.length,
    }

    results.valid = results.errors.length === 0

    return results
  }

  /**
   * Validate slack bus presence
   * @param {Object} system - ElectricalSystem instance
   * @returns {Object} Validation result
   */
  static validateSlackBus(system) {
    const slackBuses = system.buses.filter(b => b.type === 'SLACK')

    if (slackBuses.length === 0) {
      return {
        valid: false,
        error:
          'No slack bus found in system. At least one slack bus is required for power flow analysis.',
      }
    }

    if (slackBuses.length > 1) {
      return {
        valid: false,
        error: `Multiple slack buses found: ${slackBuses.map(b => b.id).join(', ')}. Only one slack bus is typically required.`,
      }
    }

    return {
      valid: true,
      slackBusId: slackBuses[0].id,
    }
  }

  /**
   * Validate isolated buses
   * @param {Object} system - ElectricalSystem instance
   * @returns {Object} Validation result
   */
  static validateIsolatedBuses(system) {
    const connectedBusIds = new Set()

    // Add buses connected by lines
    system.lines.forEach(line => {
      connectedBusIds.add(line.from)
      connectedBusIds.add(line.to)
    })

    // Add buses connected by transformers
    system.trafos.forEach(tranfo => {
      connectedBusIds.add(tranfo.fromBus)
      connectedBusIds.add(tranfo.toBus)
    })

    const isolatedBuses = system.buses.filter(b => !connectedBusIds.has(b.id))

    if (isolatedBuses.length > 0) {
      return {
        valid: false,
        error: `Isolated buses found: ${isolatedBuses.map(b => b.id).join(', ')}. These buses are not connected to any line or transformer.`,
      }
    }

    return {
      valid: true,
      isolatedCount: 0,
    }
  }

  /**
   * Validate loops in the system
   * @param {Object} system - ElectricalSystem instance
   * @returns {Object} Validation result
   */
  static validateLoops(system) {
    const adjacency = this.buildAdjacencyList(system)
    const loops = this.detectCycles(adjacency)

    if (loops.length > 0) {
      return {
        valid: true, // Loops are not necessarily invalid, but should be noted
        warning: `Loops detected in system: ${loops.length} loop(s) found. This is acceptable but may affect convergence.`,
      }
    }

    return {
      valid: true,
      loopCount: 0,
    }
  }

  /**
   * Validate short circuits
   * @param {Object} system - ElectricalSystem instance
   * @returns {Object} Validation result
   */
  static validateShortCircuits(system) {
    const shortCircuits = []

    // Check for lines with zero or very low impedance
    system.lines.forEach(line => {
      const Z = Math.sqrt(line.R ** 2 + line.X ** 2)
      if (Z < 0.001) {
        shortCircuits.push({
          id: line.id,
          from: line.from,
          to: line.to,
          Z,
          message: `Line ${line.id} has very low impedance (${Z.toFixed(6)} pu), may cause short circuit.`,
        })
      }
    })

    // Check for buses directly connected without impedance
    system.trafos.forEach(tranfo => {
      const Z = Math.sqrt(tranfo.R ** 2 + tranfo.X ** 2)
      if (Z < 0.001) {
        shortCircuits.push({
          id: tranfo.id,
          from: tranfo.fromBus,
          to: tranfo.toBus,
          Z,
          message: `Transformer ${tranfo.id} has very low impedance (${Z.toFixed(6)} pu), may cause short circuit.`,
        })
      }
    })

    if (shortCircuits.length > 0) {
      return {
        valid: false,
        error: `Potential short circuits detected: ${shortCircuits.length}`,
        details: shortCircuits,
      }
    }

    return {
      valid: true,
      shortCircuitCount: 0,
    }
  }

  /**
   * Validate voltage bases
   * @param {Object} system - ElectricalSystem instance
   * @returns {Object} Validation result
   */
  static validateBases(system) {
    const inconsistentBases = []

    // Check for buses without voltage base
    const busesWithoutBase = system.buses.filter(
      b => !b.baseKV || b.baseKV <= 0
    )
    if (busesWithoutBase.length > 0) {
      inconsistentBases.push({
        type: 'missing_base',
        buses: busesWithoutBase.map(b => b.id),
        message: `Buses without voltage base: ${busesWithoutBase.map(b => b.id).join(', ')}`, // voltage (V)
        // voltage (V)
      })
    }

    // Check for inconsistent voltage bases across connections
    system.lines.forEach(line => {
      const fromBus = system.buses.find(b => b.id === line.from)
      const toBus = system.buses.find(b => b.id === line.to)

      if (fromBus && toBus && fromBus.baseKV && toBus.baseKV) {
        const ratio = fromBus.baseKV / toBus.baseKV
        // Allow some tolerance for nominal voltages
        if (ratio > 1.1 || ratio < 0.9) {
          inconsistentBases.push({
            type: 'inconsistent_base',
            line: line.id,
            from: line.from,
            to: line.to,
            fromKV: fromBus.baseKV,
            toKV: toBus.baseKV,
            ratio,
            message: `Line ${line.id} connects buses with significantly different voltage bases (${fromBus.baseKV} kV vs ${toBus.baseKV} kV).`,
          })
        }
      }
    })

    if (inconsistentBases.length > 0) {
      return {
        valid: false,
        error: `Voltage base inconsistencies detected: ${inconsistentBases.length}`,
        details: inconsistentBases,
      }
    }

    return {
      valid: true,
      baseCount: system.buses.length,
    }
  }

  /**
   * Validate transformer connections
   * @param {Object} system - ElectricalSystem instance
   * @returns {Object} Validation result
   */
  static validateTransformers(system) {
    const invalidTransformers = []

    system.trafos.forEach(tranfo => {
      // Check if both buses exist
      const fromBus = system.buses.find(b => b.id === tranfo.fromBus)
      const toBus = system.buses.find(b => b.id === tranfo.toBus)

      if (!fromBus) {
        invalidTransformers.push({
          id: tranfo.id,
          error: `Primary bus ${tranfo.fromBus} not found.`,
        })
      }

      if (!toBus) {
        invalidTransformers.push({
          id: tranfo.id,
          error: `Secondary bus ${tranfo.toBus} not found.`,
        })
      }

      // Check tap ratio
      if (tranfo.tap && (tranfo.tap < 0.8 || tranfo.tap > 1.2)) {
        invalidTransformers.push({
          id: tranfo.id,
          warning: `Tap ratio ${tranfo.tap} is outside typical range (0.8 - 1.2).`,
        })
      }

      // Check impedance
      const Z = Math.sqrt(tranfo.R ** 2 + tranfo.X ** 2)
      if (Z < 0.01 || Z > 0.2) {
        invalidTransformers.push({
          id: tranfo.id,
          warning: `Impedance ${Z.toFixed(4)} pu is outside typical range (0.01 - 0.2).`,
        })
      }
    })

    if (invalidTransformers.length > 0) {
      return {
        valid: false,
        error: `Invalid transformer configurations: ${invalidTransformers.length}`,
        details: invalidTransformers,
      }
    }

    return {
      valid: true,
      transformerCount: system.trafos.length,
    }
  }

  /**
   * Validate grounding
   * @param {Object} system - ElectricalSystem instance
   * @returns {Object} Validation result
   */
  static validateGrounding(system) {
    const ungroundedBuses = system.buses.filter(b => {
      // Check if bus should be grounded but isn't
      return (b.type === 'SLACK' || b.baseKV >= 34.5) && !b.grounded
    })

    if (ungroundedBuses.length > 0) {
      return {
        valid: true, // Not necessarily invalid, but should be noted
        warning: `High voltage buses without grounding: ${ungroundedBuses.map(b => b.id).join(', ')}. Consider grounding for proper fault analysis.`, // voltage (V)
        // voltage (V)
      }
    }

    return {
      valid: true,
      groundedCount: system.buses.filter(b => b.grounded).length,
    }
  }

  /**
   * Validate loads
   * @param {Object} system - ElectricalSystem instance
   * @returns {Object} Validation result
   */
  static validateLoads(system) {
    const invalidLoads = []

    system.loads.forEach(load => {
      // Check if bus exists
      const bus = system.buses.find(b => b.id === load.busId)
      if (!bus) {
        invalidLoads.push({
          id: load.id,
          error: `Bus ${load.busId} not found.`,
        })
      }

      // Check power values
      if (load.P < 0 || load.P > 1000) {
        invalidLoads.push({
          id: load.id,
          warning: `Active power ${load.P} MW is outside typical range.`,
        })
      }

      if (load.Q < -500 || load.Q > 500) {
        invalidLoads.push({
          id: load.id,
          warning: `Reactive power ${load.Q} MVAR is outside typical range.`,
        })
      }
    })

    if (invalidLoads.length > 0) {
      return {
        valid: false,
        error: `Invalid load configurations: ${invalidLoads.length}`,
        details: invalidLoads,
      }
    }

    return {
      valid: true,
      loadCount: system.loads.length,
    }
  }

  /**
   * Validate generators
   * @param {Object} system - ElectricalSystem instance
   * @returns {Object} Validation result
   */
  static validateGenerators(system) {
    const invalidGenerators = []

    system.generators.forEach(gen => {
      // Check if bus exists
      const bus = system.buses.find(b => b.id === gen.busId)
      if (!bus) {
        invalidGenerators.push({
          id: gen.id,
          error: `Bus ${gen.busId} not found.`,
        })
      }

      // Check power values
      if (gen.P < 0 || gen.P > 1000) {
        invalidGenerators.push({
          id: gen.id,
          warning: `Active power ${gen.P} MW is outside typical range.`,
        })
      }

      // Check voltage limits
      if (gen.V < 0.9 || gen.V > 1.1) {
        invalidGenerators.push({
          id: gen.id,
          warning: `Voltage setpoint ${gen.V} pu is outside typical range (0.9 - 1.1).`,
        })
      }
    })

    if (invalidGenerators.length > 0) {
      return {
        valid: false,
        error: `Invalid generator configurations: ${invalidGenerators.length}`,
        details: invalidGenerators,
      }
    }

    return {
      valid: true,
      generatorCount: system.generators.length,
    }
  }

  /**
   * Collect errors and warnings from validation results
   * @param {Object} results - Validation results object
   */
  static collectResults(results) {
    results.errors = []
    results.warnings = []

    // Collect errors
    Object.keys(results).forEach(key => {
      if (results[key] && results[key].error) {
        results.errors.push({
          category: key,
          message: results[key].error,
          details: results[key].details,
        })
      }
    })

    // Collect warnings
    Object.keys(results).forEach(key => {
      if (results[key] && results[key].warning) {
        results.warnings.push({
          category: key,
          message: results[key].warning,
        })
      }
    })
  }

  /**
   * Build adjacency list for cycle detection
   * @param {Object} system - ElectricalSystem instance
   * @returns {Object} Adjacency list
   */
  static buildAdjacencyList(system) {
    const adjacency = {}

    system.buses.forEach(bus => {
      adjacency[bus.id] = []
    })

    system.lines.forEach(line => {
      if (adjacency[line.from]) adjacency[line.from].push(line.to)
      if (adjacency[line.to]) adjacency[line.to].push(line.from)
    })

    system.trafos.forEach(tranfo => {
      if (adjacency[tranfo.fromBus]) {
        adjacency[tranfo.fromBus].push(tranfo.toBus)
      }
      if (adjacency[tranfo.toBus]) adjacency[tranfo.toBus].push(tranfo.fromBus)
    })

    return adjacency
  }

  /**
   * Detect cycles in graph using DFS
   * @param {Object} adjacency - Adjacency list
   * @returns {Array} Array of cycles found
   */
  static detectCycles(adjacency) {
    const visited = new Set()
    const cycles = []

    const dfs = (node, path) => {
      visited.add(node)
      path.push(node)

      const neighbors = adjacency[node] || []
      neighbors.forEach(neighbor => {
        if (path.includes(neighbor)) {
          // Cycle detected
          const cycleStart = path.indexOf(neighbor)
          cycles.push(path.slice(cycleStart).concat(neighbor))
        } else if (!visited.has(neighbor)) {
          dfs(neighbor, path)
        }
      })

      path.pop()
    }

    Object.keys(adjacency).forEach(node => {
      if (!visited.has(node)) {
        dfs(node, [])
      }
    })

    return cycles
  }
}

module.exports = SystemValidator
