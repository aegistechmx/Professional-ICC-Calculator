/**
 * System validation utilities for electrical editor
 */

/**
 * Electrical connection rules - defines valid connections between component types
 * Based on electrical hierarchy and common engineering practices
 */
const CONNECTION_RULES = {
  transformer: ['breaker', 'panel', 'ats'], // Puede conectar a ATS
  generator: ['breaker', 'panel', 'ats'], // Puede conectar a ATS
  ats: ['breaker', 'panel'], // ATS alimenta breakers y panels
  breaker: ['panel', 'load', 'motor'], // Salida - NO puede alimentar generators
  panel: ['panel', 'breaker', 'load', 'motor'], // Allow panel -> panel for subpanels
  load: [],
  motor: []
};

/**
 * Validate if a connection between two node types is electrically valid
 * @param {string} sourceType - Type of source node
 * @param {string} targetType - Type of target node
 * @returns {boolean} True if connection is valid
 */
export function validateConnection(sourceType, targetType) {
  // Nadie puede alimentar a un generador (es fuente)
  if (targetType === 'generator') {
    return false;
  }

  const validTargets = CONNECTION_RULES[sourceType] || [];
  return validTargets.includes(targetType);
}

/**
 * Check if all nodes are connected (no isolated nodes)
 * @param {Array} nodes - Array of node objects
 * @param {Array} edges - Array of edge objects
 * @returns {Object} Validation result with isValid and errors
 */
export function validateConnectivity(nodes, edges) {
  if (nodes.length === 0) {
    return { isValid: true, errors: [] };
  }

  const connectedNodeIds = new Set();

  // Add all nodes that have at least one connection
  edges.forEach(edge => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });

  // Find isolated nodes
  const isolatedNodes = nodes.filter(n => !connectedNodeIds.has(n.id));

  if (isolatedNodes.length > 0) {
    return {
      isValid: false,
      errors: [
        `Nodos aislados encontrados: ${isolatedNodes.map(n => n.data.label).join(', ')}`
      ]
    };
  }

  return { isValid: true, errors: [] };
}

/**
 * Check for invalid loops (circular connections that don't make sense electrically)
 * @param {Array} nodes - Array of node objects
 * @param {Array} edges - Array of edge objects
 * @returns {Object} Validation result with isValid and errors
 */
export function validateLoops(nodes, edges) {
  if (nodes.length === 0 || edges.length === 0) {
    return { isValid: true, errors: [] };
  }

  // Build adjacency list
  const adjacency = {};
  nodes.forEach(node => {
    adjacency[node.id] = [];
  });

  edges.forEach(edge => {
    if (adjacency[edge.source]) {
      adjacency[edge.source].push(edge.target);
    }
  });

  // Detect cycles using DFS
  const visited = new Set();
  const recursionStack = new Set();
  const cycles = [];

  function detectCycle(nodeId, path = []) {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adjacency[nodeId] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        const cyclePath = [...path, nodeId];
        if (detectCycle(neighbor, cyclePath)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle
        const cycleStart = path.indexOf(neighbor);
        const cycle = [...path.slice(cycleStart), nodeId, neighbor];
        cycles.push(cycle);
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      detectCycle(node.id);
    }
  });

  if (cycles.length > 0) {
    return {
      isValid: false,
      errors: [
        'Ciclos detectados en el sistema. Los sistemas eléctricos no deben tener ciclos cerrados.'
      ]
    };
  }

  return { isValid: true, errors: [] };
}

/**
 * Validate proper hierarchy (transformer should be source, loads should be sinks)
 * @param {Array} nodes - Array of node objects
 * @param {Array} edges - Array of edge objects
 * @returns {Object} Validation result with isValid and errors
 */
export function validateHierarchy(nodes, edges) {
  if (nodes.length === 0) {
    return { isValid: true, errors: [] };
  }

  const errors = [];

  // Count connections per node
  const inDegree = {};
  const outDegree = {};

  nodes.forEach(node => {
    inDegree[node.id] = 0;
    outDegree[node.id] = 0;
  });

  edges.forEach(edge => {
    outDegree[edge.source] = (outDegree[edge.source] || 0) + 1;
    inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
  });

  // Check transformers (should have outDegree > 0, ideally inDegree = 0)
  const transformers = nodes.filter(n => n.type === 'transformer');
  transformers.forEach(t => {
    if (outDegree[t.id] === 0) {
      errors.push(`Transformador '${t.data.label}' no tiene conexiones de salida.`);
    }
  });

  // Check loads (should have inDegree > 0, outDegree = 0)
  const loads = nodes.filter(n => n.type === 'load' || n.type === 'motor');
  loads.forEach(l => {
    if (inDegree[l.id] === 0) {
      errors.push(`Carga '${l.data.label}' no está conectada a ninguna fuente.`);
    }
  });

  // Check ATS nodes (should have at least 1 input and 1 output)
  const atsNodes = nodes.filter(n => n.type === 'ats');
  atsNodes.forEach(ats => {
    if (inDegree[ats.id] === 0) {
      errors.push(`ATS '${ats.data.label}' no tiene fuente de alimentación conectada.`);
    }
    if (outDegree[ats.id] === 0) {
      errors.push(`ATS '${ats.data.label}' no tiene salida conectada (debe conectar a breaker o panel).`);
    }
    // ATS should have at least 2 inputs (normal + emergency) for redundancy
    if (inDegree[ats.id] < 2) {
      errors.push(`Advertencia: ATS '${ats.data.label}' debería tener 2 fuentes (transformador + generador) para transferencia automática.`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate cable ampacity (calibre vs current)
 * @param {Array} edges - Array of edge objects with cable data
 * @param {Object} nodeCurrents - Map of nodeId to current in Amps
 * @returns {Object} Validation result with ampacity errors
 */
export function validateCableAmpacity(edges, nodeCurrents = {}) {
  const errors = [];
  const warnings = [];

  // Standard ampacity table (simplified, based on NOM-001-SEDE)
  const AMPACITY_TABLE = {
    '14': 20, '12': 25, '10': 35, '8': 50, '6': 65,
    '4': 85, '3': 100, '2': 115, '1': 130, '1/0': 150,
    '2/0': 175, '3/0': 200, '4/0': 230, '250': 255,
    '300': 285, '350': 310, '400': 335, '500': 380,
    '600': 420, '700': 460, '750': 475, '800': 490,
    '900': 520, '1000': 545, '1250': 590, '1500': 625,
    '1750': 650, '2000': 665
  };

  edges.forEach(edge => {
    const cableData = edge.data || {};
    const calibre = cableData.calibre || '350';
    const paralelo = cableData.paralelo || 1;
    const longitud = cableData.longitud || 10;
    
    // Get base ampacity
    const baseAmpacity = AMPACITY_TABLE[calibre] || 310;
    const totalAmpacity = baseAmpacity * paralelo;
    
    // Estimate current from source or target node
    const sourceCurrent = nodeCurrents[edge.source] || 0;
    const targetCurrent = nodeCurrents[edge.target] || 0;
    const estimatedCurrent = Math.max(sourceCurrent, targetCurrent, 100); // Default 100A if unknown
    
    // Safety factor: 125% for continuous loads (NOM-001-SEDE Art. 310)
    const requiredAmpacity = estimatedCurrent * 1.25;
    
    if (requiredAmpacity > totalAmpacity) {
      errors.push(
        `Cable ${edge.id}: Calibre ${calibre}${paralelo > 1 ? ` (x${paralelo})` : ''} ` +
        `soporta ${totalAmpacity}A pero requiere ${requiredAmpacity.toFixed(0)}A ` +
        `(${estimatedCurrent}A x 1.25). Considere aumentar calibre o paralelos.`
      );
    } else if (requiredAmpacity > totalAmpacity * 0.9) {
      warnings.push(
        `Cable ${edge.id}: Calibre ${calibre} está al ${((requiredAmpacity/totalAmpacity)*100).toFixed(0)}% de capacidad.`
      );
    }

    // Check voltage drop for long cables (>30m)
    if (longitud > 30) {
      warnings.push(
        `Cable ${edge.id}: Longitud de ${longitud}m puede causar caída de tensión significativa. Verificar cálculo.`
      );
    }
  });

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Validate breaker capacity vs load
 * @param {Array} nodes - Array of node objects
 * @returns {Object} Validation result with breaker errors
 */
export function validateBreakerCapacity(nodes) {
  const errors = [];
  const warnings = [];

  const breakers = nodes.filter(n => n.type === 'breaker');

  breakers.forEach(breaker => {
    const params = breaker.data?.parameters || {};
    const ratedCurrent = params.In || params.ratedCurrent || 100;
    const loadCurrent = params.loadCurrent || params.Icarga || 80;
    
    // Safety factor: breaker should be at least 125% of load (NOM)
    const minBreakerSize = loadCurrent * 1.25;
    
    if (ratedCurrent < loadCurrent) {
      errors.push(
        `Breaker '${breaker.data.label}': Capacidad ${ratedCurrent}A menor que carga ${loadCurrent}A.`
      );
    } else if (ratedCurrent < minBreakerSize) {
      warnings.push(
        `Breaker '${breaker.data.label}': Capacidad ${ratedCurrent}A debería ser ≥ ${minBreakerSize.toFixed(0)}A ` +
        `(${loadCurrent}A x 1.25) según NOM-001-SEDE.`
      );
    }

    // Check short circuit capacity
    const icu = params.Icu || params.icu || 10000;
    const availableFaultCurrent = params.availableFaultCurrent || 5000;
    
    if (icu < availableFaultCurrent) {
      errors.push(
        `Breaker '${breaker.data.label}': Capacidad interruptiva ${icu}A < corriente de falla disponible ${availableFaultCurrent}A. ` +
        '¡Riesgo de explosión! Aumentar Icu.'
      );
    }
  });

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Run all validations
 * @param {Array} nodes - Array of node objects
 * @param {Array} edges - Array of edge objects
 * @returns {Object} Complete validation result
 */
export function validateSystem(nodes, edges) {
  const connectivity = validateConnectivity(nodes, edges);
  const loops = validateLoops(nodes, edges);
  const hierarchy = validateHierarchy(nodes, edges);
  const cables = validateCableAmpacity(edges);
  const breakers = validateBreakerCapacity(nodes);

  const allErrors = [
    ...connectivity.errors,
    ...loops.errors,
    ...hierarchy.errors,
    ...cables.errors,
    ...breakers.errors
  ];

  const allWarnings = [
    ...cables.warnings,
    ...breakers.warnings
  ];

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    details: {
      connectivity: connectivity.isValid,
      loops: loops.isValid,
      hierarchy: hierarchy.isValid,
      cables: cables.isValid,
      breakers: breakers.isValid
    }
  };
}
