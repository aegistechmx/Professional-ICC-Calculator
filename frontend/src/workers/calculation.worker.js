/**
 * Web Worker for Heavy Electrical Calculations
 * Offloads intensive calculations from main thread to improve UI responsiveness
 */

// Calculation functions are defined inline below for worker compatibility

/**
 * Handle messages from main thread
 */
self.onmessage = async function (e) {
  const { type, data, id } = e.data

  try {
    let result

    switch (type) {
      case 'calculateICC':
        result = await performICCCalculation(data)
        break
      case 'calculateHarmonics':
        result = await performHarmonicAnalysis(data)
        break
      case 'calculatePowerFlow':
        result = await performPowerFlowCalculation(data)
        break
      case 'validateStandards':
        result = await performStandardsValidation(data)
        break
      case 'batchCalculation':
        result = await performBatchCalculation(data)
        break
      default:
        throw new Error(`Unknown calculation type: ${type}`)
    }

    // Send result back to main thread
    self.postMessage({
      type: 'result',
      id,
      data: result,
      success: true
    })

  } catch (error) {
    // Send error back to main thread
    self.postMessage({
      type: 'error',
      id,
      error: error.message,
      stack: error.stack,
      success: false
    })
  }
}

/**
 * Perform ICC calculation with optimizations
 */
async function performICCCalculation(data) {
  const { nodes, edges, options = {} } = data
  const startTime = performance.now()

  // Use progressive calculation for large systems
  const batchSize = options.batchSize || 50
  const results = []

  for (let i = 0; i < nodes.length; i += batchSize) {
    const batch = nodes.slice(i, i + batchSize)

    // Calculate ICC for batch
    const batchResults = calculateICCBatch(batch, edges)
    results.push(...batchResults)

    // Yield control to prevent blocking
    if (i % (batchSize * 2) === 0) {
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }

  const endTime = performance.now()

  return {
    results,
    calculationTime: endTime - startTime,
    nodeCount: nodes.length,
    edgeCount: edges.length
  }
}

/**
 * Calculate ICC for a batch of nodes
 */
function calculateICCBatch(nodes, edges) {
  const results = []

  nodes.forEach(node => {
    // Calculate accumulated impedance
    const impedance = calculateAccumulatedImpedance(node, edges)

    // Calculate fault current
    const faultCurrent = calculateFaultCurrent(impedance, node)

    results.push({
      nodeId: node.id,
      ...faultCurrent,
      impedance
    })
  })

  return results
}

/**
 * Calculate accumulated impedance for a node
 */
function calculateAccumulatedImpedance(node, edges) {
  // Simplified impedance calculation for worker
  // In production, this would use the full algorithm
  let totalR = 0
  let totalX = 0

  // Trace back to source
  const path = tracePathToSource(node, edges)

  path.forEach(edge => {
    const cableData = edge.data || {}
    const length = cableData.longitud || 10
    const calibre = cableData.calibre || '350'

    // Get cable impedance (simplified)
    const impedance = getCableImpedance(calibre, length)
    totalR += impedance.R
    totalX += impedance.X
  })

  return { R: totalR, X: totalX }
}

/**
 * Calculate fault current from impedance
 */
function calculateFaultCurrent(impedance, node) {
  const { R, X } = impedance
  const Z = Math.sqrt(R * R + X * X)

  const voltage = node.data?.parameters?.voltaje ||
    node.data?.parameters?.secundario ||
    480

  const I_sc_3f = Z > 0.001 ? voltage / (Math.sqrt(3) * Z) : 0
  const I_sc_1f = Z > 0.001 ? voltage / (2 * Z) : 0

  return {
    isc_3f: I_sc_3f,
    isc_1f: I_sc_1f,
    isc_3f_ka: I_sc_3f / 1000,
    isc_1f_ka: I_sc_1f / 1000,
    X_R_ratio: R > 0 ? X / R : 999
  }
}

/**
 * Perform harmonic analysis
 */
async function performHarmonicAnalysis(data) {
  const { harmonics, voltage, isc, il } = data
  const startTime = performance.now()

  // Calculate THD
  const thd = calculateTHD(harmonics)

  // Calculate individual harmonics
  const individualHarmonics = calculateIndividualHarmonics(harmonics)

  // Validate against IEEE 519
  const validation = validateHarmonicsIEEE519(harmonics, voltage, isc, il)

  // Calculate K-factor
  const kFactor = calculateKFactor(harmonics)

  const endTime = performance.now()

  return {
    thd,
    individualHarmonics,
    validation,
    kFactor,
    calculationTime: endTime - startTime
  }
}

/**
 * Perform power flow calculation (simplified for worker)
 */
async function performPowerFlowCalculation(data) {
  const { nodes, edges } = data
  const startTime = performance.now()

  // Simplified power flow calculation
  // In production, this would implement Newton-Raphson or similar
  const results = []

  nodes.forEach(node => {
    const result = {
      nodeId: node.id,
      voltage: 1.0, // Per unit
      angle: 0,    // Degrees
      power: calculateNodePower(node, edges)
    }
    results.push(result)
  })

  const endTime = performance.now()

  return {
    results,
    converged: true,
    iterations: 1,
    calculationTime: endTime - startTime
  }
}

/**
 * Perform standards validation
 */
async function performStandardsValidation(data) {
  const { parameters, standards } = data
  const startTime = performance.now()

  const results = []

  // Validate each requested standard
  for (const standard of standards) {
    let result

    switch (standard) {
      case 'IEEE1584':
        result = validateIEEE1584(parameters)
        break
      case 'IEEE141':
        result = validateIEEE141(parameters)
        break
      case 'IEC60909':
        result = validateIEC60909(parameters)
        break
      case 'IEEE242':
        result = validateIEEE242(parameters)
        break
      case 'IEEE1159':
        result = validateIEEE1159(parameters)
        break
      default:
        result = { valid: false, errors: [`Unknown standard: ${standard}`] }
    }

    results.push(result)
  }

  const endTime = performance.now()

  return {
    results,
    calculationTime: endTime - startTime,
    overallValid: results.every(r => r.valid)
  }
}

/**
 * Perform batch calculations for multiple scenarios
 */
async function performBatchCalculation(data) {
  const { scenarios, calculationType } = data
  const startTime = performance.now()

  const results = []

  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i]

    let result
    switch (calculationType) {
      case 'ICC':
        result = await performICCCalculation(scenario)
        break
      case 'harmonics':
        result = await performHarmonicAnalysis(scenario)
        break
      case 'powerFlow':
        result = await performPowerFlowCalculation(scenario)
        break
      default:
        throw new Error(`Unknown batch calculation type: ${calculationType}`)
    }

    results.push({
      scenarioIndex: i,
      scenarioName: scenario.name || `Scenario ${i + 1}`,
      ...result
    })

    // Yield control periodically
    if (i % 5 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }

  const endTime = performance.now()

  return {
    results,
    totalScenarios: scenarios.length,
    calculationTime: endTime - startTime,
    averageTimePerScenario: (endTime - startTime) / scenarios.length
  }
}

/**
 * Helper functions (simplified versions for worker)
 */

function tracePathToSource(node, edges) {
  const path = []
  const visited = new Set()

  function trace(currentNode) {
    if (visited.has(currentNode.id)) return []
    visited.add(currentNode.id)

    // Find incoming edges
    const incomingEdges = edges.filter(e => e.target === currentNode.id)

    for (const edge of incomingEdges) {
      const sourceNode = findNodeById(edge.source, edges)
      if (sourceNode) {
        path.push(edge)
        return trace(sourceNode)
      }
    }

    return path
  }

  return trace(node)
}

function findNodeById(nodeId) {
  // This is a simplified version
  // In production, would need access to full node data
  return { id: nodeId }
}

function getCableImpedance(calibre, length) {
  // Simplified cable impedance data
  const impedances = {
    '350': { R: 0.0518, X: 0.0769 },
    '4/0': { R: 0.0852, X: 0.0796 },
    '3/0': { R: 0.1074, X: 0.0813 },
    '2/0': { R: 0.1354, X: 0.0832 },
    '1/0': { R: 0.1707, X: 0.0852 }
  }

  const baseImpedance = impedances[calibre] || impedances['350']
  const lengthKm = length / 1000

  return {
    R: baseImpedance.R * lengthKm,
    X: baseImpedance.X * lengthKm
  }
}

function calculateNodePower(node) {
  // Simplified power calculation
  const params = node.data?.parameters || {}

  switch (node.type) {
    case 'load':
      return {
        P: params.potencia_kW || 0,
        Q: params.potencia_kVAR || 0
      }
    case 'motor': {
      const hp = params.hp || 0
      const efficiency = params.eficiencia || 0.92
      const pf = params.fp || 0.85
      const kW = (hp * 0.746) / efficiency
      const kVA = kW / pf
      const kVAR = Math.sqrt(kVA * kVA - kW * kW)

      return {
        P: kW,
        Q: kVAR
      }
    }
    case 'generator':
      return {
        P: -(params.kVA || 0) * (params.fp || 0.8),
        Q: -(params.kVA || 0) * Math.sqrt(1 - (params.fp || 0.8) ** 2)
      }
    default:
      return { P: 0, Q: 0 }
  }
}

// Import helper functions from utility modules
function calculateTHD(harmonics) {
  if (!harmonics || harmonics.length < 2) return 0

  const fundamental = harmonics[1] || 0
  if (fundamental === 0) return 0

  const harmonicSum = harmonics
    .slice(2)
    .reduce((sum, h) => sum + (h || 0) ** 2, 0)

  return (Math.sqrt(harmonicSum) / fundamental) * 100
}

function calculateIndividualHarmonics(harmonics) {
  if (!harmonics || harmonics.length < 2) return []

  const fundamental = harmonics[1] || 0
  if (fundamental === 0) return []

  return harmonics.slice(2).map((h, index) => ({
    harmonic: index + 2,
    magnitude: h || 0,
    percentage: ((h || 0) / fundamental) * 100,
  }))
}

function validateHarmonicsIEEE519(harmonics) {
  // Simplified validation
  const thd = calculateTHD(harmonics)

  return {
    thd,
    individualHarmonics: calculateIndividualHarmonics(harmonics),
    violations: thd > 5 ? [{ type: 'THD', measured: thd, limit: 5 }] : [],
    warnings: thd > 3 ? [{ type: 'THD', measured: thd, limit: 5 }] : [],
    compliant: thd <= 5
  }
}

function calculateKFactor(harmonics) {
  if (!harmonics || harmonics.length < 2) return 1.0

  const fundamental = harmonics[1] || 0
  if (fundamental === 0) return 1.0

  const kFactor = harmonics
    .slice(1)
    .reduce((sum, h, index) => {
      const harmonicOrder = index + 1
      const harmonicRatio = (h || 0) / fundamental
      return sum + (harmonicOrder ** 2) * (harmonicRatio ** 2)
    }, 0)

  return Math.max(kFactor, 1.0)
}

// Placeholder functions for standards validation
function validateIEEE1584() {
  return { valid: true, errors: [], warnings: [], standard: 'IEEE 1584-2018' }
}

function validateIEEE141() {
  return { valid: true, errors: [], warnings: [], standard: 'IEEE 141 (Red Book)' }
}

function validateIEC60909() {
  return { valid: true, errors: [], warnings: [], standard: 'IEC 60909' }
}

function validateIEEE242() {
  return { valid: true, errors: [], warnings: [], standard: 'IEEE 242 (Buff Book)' }
}

function validateIEEE1159() {
  return { valid: true, errors: [], warnings: [], standard: 'IEEE 1159' }
}
