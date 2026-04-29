/**
 * contingencyGenerator.js - Generate N-1 contingencies for SCOPF
 *
 * Responsibility: Create contingency scenarios for security-constrained optimization
 * NO Express, NO axios, NO UI logic
 */

/**
 * Generate N-1 contingencies for SCOPF analysis
 * @param {Object} system - Power system model
 * @returns {Array} Array of contingency scenarios
 */
function generateN1Contingencies(system) {
  const contingencies = []

  // N-1 line outages
  system.branches.forEach((branch, i) => {
    contingencies.push({
      type: 'line_outage',
      index: i,
      elementId: branch.id,
      from: branch.from,
      to: branch.to,
      description: `Line outage: ${branch.from} → ${branch.to}`,
    })
  })

  // N-1 generator outages
  system.buses.forEach((bus, i) => {
    if (bus.type === 'PV' && bus.P > 0) {
      // Only active generators
      contingencies.push({
        type: 'generator_outage',
        index: i,
        elementId: bus.id,
        bus: bus.id,
        description: `Generator outage: G${bus.id}`,
      })
    }
  })

  return contingencies
}

/**
 * Apply contingency to system model
 * @param {Object} system - Original system model
 * @param {Object} contingency - Contingency to apply
 * @returns {Object} Modified system model
 */
function applyContingency(system, contingency) {
  const cloned = JSON.parse(JSON.stringify(system))

  if (contingency.type === 'line_outage') {
    // Remove line from system
    cloned.branches = cloned.branches.filter((b, i) => i !== contingency.index)
  }

  if (contingency.type === 'generator_outage') {
    // Set generation to zero
    const gen = cloned.generators.find(g => g.id === contingency.elementId)
    if (gen) {
      gen.P = 0
      gen.status = 'outage'
    }
  }

  return cloned
}

/**
 * Generate contingency scenarios with severity ranking
 * @param {Object} system - Power system model
 * @param {Object} options - Generation options
 * @returns {Array} Ranked contingencies
 */
function generateRankedContingencies(system, options = {}) {
  const {
    maxContingencies = 50,
    includeGenerator = true,
    includeLines = true,
  } = options

  const contingencies = []

  if (includeLines) {
    system.branches.forEach((branch, i) => {
      // Estimate severity based on loading
      const estimatedLoading = branch.loading || 0.5
      const severity =
        estimatedLoading > 0.8
          ? 'high'
          : estimatedLoading > 0.6
            ? 'medium'
            : 'low'

      contingencies.push({
        type: 'line_outage',
        index: i,
        elementId: branch.id,
        from: branch.from,
        to: branch.to,
        severity,
        estimatedLoading,
        priority: severity === 'high' ? 1 : severity === 'medium' ? 2 : 3,
      })
    })
  }

  if (includeGenerator) {
    system.generators.forEach((gen, i) => {
      if (gen.P > 0) {
        // Estimate severity based on generation size
        const severity = gen.P > 0.5 ? 'high' : gen.P > 0.3 ? 'medium' : 'low'

        contingencies.push({
          type: 'generator_outage',
          index: i,
          elementId: gen.id,
          bus: gen.bus,
          severity,
          generation: gen.P,
          priority: severity === 'high' ? 1 : severity === 'medium' ? 2 : 3,
        })
      }
    })
  }

  // Sort by priority and limit
  return contingencies
    .sort((a, b) => a.priority - b.priority)
    .slice(0, maxContingencies)
}

/**
 * Filter contingencies by type and severity
 * @param {Array} contingencies - All contingencies
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered contingencies
 */
function filterContingencies(contingencies, filters = {}) {
  const { type = null, severity = null, maxSeverity = 'high' } = filters

  return contingencies.filter(cont => {
    if (type && cont.type !== type) return false
    if (severity && cont.severity !== severity) return false

    const severityOrder = { high: 3, medium: 2, low: 1 }
    const contLevel = severityOrder[cont.severity] || 0
    const maxLevel = severityOrder[maxSeverity] || 3

    return contLevel <= maxLevel
  })
}

module.exports = {
  generateN1Contingencies,
  applyContingency,
  generateRankedContingencies,
  filterContingencies,
}
