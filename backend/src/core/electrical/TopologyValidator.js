/**
 * TopologyValidator - Validate electrical system topology
 * 
 * Prevents invalid electrical configurations:
 * - Sources connected directly to loads without protection
 * - Invalid loops in the system
 * - Floating nodes (unconnected buses)
 * - Multiple slack buses
 * - Invalid transformer connections
 */

/**
 * Validate electrical system topology
 * @param {ElectricalSystem} system - Electrical system to validate
 * @returns {Object} Validation result with errors and warnings
 */
function validateTopology(system) {
  const errors = [];
  const warnings = [];
  
  // Check 1: At least one slack bus (source)
  const slackBuses = system.buses.filter(b => b.type === 'Slack');
  if (slackBuses.length === 0) {
    errors.push({
      code: 'NO_SLACK_BUS',
      message: 'No slack bus (source) found in the system',
      severity: 'critical'
    });
  } else if (slackBuses.length > 1) {
    warnings.push({
      code: 'MULTIPLE_SLACK_BUSES',
      message: `Multiple slack buses found: ${slackBuses.map(b => b.name).join(', ')}`,
      severity: 'warning'
    });
  }
  
  // Check 2: All buses must be connected
  const connectedBusIds = new Set();
  system.lines.forEach(l => {
    connectedBusIds.add(l.fromBus);
    connectedBusIds.add(l.toBus);
  });
  system.transformers.forEach(t => {
    connectedBusIds.add(t.fromBus);
    connectedBusIds.add(t.toBus);
  });
  
  const isolatedBuses = system.buses.filter(b => !connectedBusIds.has(b.id));
  if (isolatedBuses.length > 0) {
    errors.push({
      code: 'ISOLATED_BUSES',
      message: `Isolated buses found: ${isolatedBuses.map(b => b.name).join(', ')}`,
      severity: 'critical',
      buses: isolatedBuses.map(b => b.id)
    });
  }
  
  // Check 3: Detect invalid loops (systems should be radial or mesh with proper protection)
  const loops = detectLoops(system);
  if (loops.length > 0) {
    warnings.push({
      code: 'LOOPS_DETECTED',
      message: `${loops.length} loop(s) detected in the system. Ensure proper protection coordination.`,
      severity: 'warning',
      loops: loops
    });
  }
  
  // Check 4: Direct source-to-load connections (without protection)
  const directConnections = findDirectSourceToLoadConnections(system);
  if (directConnections.length > 0) {
    errors.push({
      code: 'DIRECT_SOURCE_TO_LOAD',
      message: `Direct source-to-load connections without protection: ${directConnections.length}`,
      severity: 'critical',
      connections: directConnections
    });
  }
  
  // Check 5: Duplicate bus IDs
  const busIds = system.buses.map(b => b.id);
  const duplicateIds = busIds.filter((id, index) => busIds.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    errors.push({
      code: 'DUPLICATE_BUS_IDS',
      message: `Duplicate bus IDs found: ${[...new Set(duplicateIds)].join(', ')}`,
      severity: 'critical'
    });
  }
  
  // Check 6: Invalid voltage levels (transformer ratios)
  const invalidTransformers = validateTransformerRatios(system);
  if (invalidTransformers.length > 0) {
    errors.push({
      code: 'INVALID_TRANSFORMER_RATIOS',
      message: `Invalid transformer ratios detected: ${invalidTransformers.length}`,
      severity: 'error',
      transformers: invalidTransformers
    });
  }
  
  // Check 7: Check for overloaded lines based on thermal limits
  const overloadedLines = checkThermalLimits(system);
  if (overloadedLines.length > 0) {
    warnings.push({
      code: 'THERMAL_LIMIT_WARNING',
      message: `${overloadedLines.length} line(s) may exceed thermal limits`,
      severity: 'warning',
      lines: overloadedLines
    });
  }
  
  // Check 8: Validate grounding configuration
  const groundingIssues = validateGrounding(system);
  if (groundingIssues.length > 0) {
    warnings.push({
      code: 'GROUNDING_ISSUES',
      message: `Grounding configuration issues: ${groundingIssues.length}`,
      severity: 'warning',
      issues: groundingIssues
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      criticalErrors: errors.filter(e => e.severity === 'critical').length
    }
  };
}

/**
 * Detect loops in the electrical system
 * Uses DFS to find cycles in the graph
 */
function detectLoops(system) {
  const adjacency = {};
  
  // Build adjacency list
  system.buses.forEach(bus => {
    adjacency[bus.id] = [];
  });
  
  system.lines.forEach(line => {
    if (adjacency[line.fromBus]) {
      adjacency[line.fromBus].push(line.toBus);
    }
    if (adjacency[line.toBus]) {
      adjacency[line.toBus].push(line.fromBus);
    }
  });
  
  system.transformers.forEach(tr => {
    if (adjacency[tr.fromBus]) {
      adjacency[tr.fromBus].push(tr.toBus);
    }
    if (adjacency[tr.toBus]) {
      adjacency[tr.toBus].push(tr.fromBus);
    }
  });
  
  const visited = new Set();
  const recursionStack = new Set();
  const loops = [];
  
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
        loops.push(cycle);
        return true;
      }
    }
    
    recursionStack.delete(nodeId);
    return false;
  }
  
  system.buses.forEach(bus => {
    if (!visited.has(bus.id)) {
      detectCycle(bus.id);
    }
  });
  
  return loops;
}

/**
 * Find direct source-to-load connections without protection
 */
function findDirectSourceToLoadConnections(system) {
  const directConnections = [];
  
  const slackBusIds = new Set(
    system.buses.filter(b => b.type === 'Slack').map(b => b.id)
  );
  
  system.lines.forEach(line => {
    const isFromSource = slackBusIds.has(line.fromBus);
    const isToSource = slackBusIds.has(line.toBus);
    
    if (isFromSource || isToSource) {
      // Check if the other end has a load or motor
      const otherBusId = isFromSource ? line.toBus : line.fromBus;
      const otherBus = system.getBus(otherBusId);
      
      if (otherBus) {
        const hasLoad = system.loads.some(l => l.bus === otherBusId);
        const hasMotor = system.motors.some(m => m.bus === otherBusId);
        
        if (hasLoad || hasMotor) {
          directConnections.push({
            lineId: line.id,
            fromBus: line.fromBus,
            toBus: line.toBus,
            loadType: hasLoad ? 'load' : 'motor'
          });
        }
      }
    }
  });
  
  return directConnections;
}

/**
 * Validate transformer voltage ratios
 */
function validateTransformerRatios(system) {
  const invalidTransformers = [];
  
  system.transformers.forEach(tr => {
    const ratio = tr.primaryKV / tr.secondaryKV;
    
    // Check for unrealistic ratios (outside typical range 0.1 to 100)
    if (ratio < 0.1 || ratio > 100) {
      invalidTransformers.push({
        id: tr.id,
        primaryKV: tr.primaryKV,
        secondaryKV: tr.secondaryKV,
        ratio,
        issue: 'Voltage ratio outside typical range'
      });
    }
    
    // Check if ratio matches tap ratio (should be close)
    const tapRatio = tr.tapRatio;
    if (Math.abs(ratio - tapRatio) > 0.5) {
      invalidTransformers.push({
        id: tr.id,
        primaryKV: tr.primaryKV,
        secondaryKV: tr.secondaryKV,
        ratio,
        tapRatio,
        issue: 'Tap ratio does not match voltage ratio'
      });
    }
  });
  
  return invalidTransformers;
}

/**
 * Check thermal limits on lines
 */
function checkThermalLimits(system) {
  const overloadedLines = [];
  
  // This would require load flow results to be accurate
  // For now, just check if thermal limit is set
  system.lines.forEach(line => {
    if (line.thermalLimit <= 0) {
      overloadedLines.push({
        id: line.id,
        issue: 'Thermal limit not set or invalid'
      });
    }
  });
  
  return overloadedLines;
}

/**
 * Validate grounding configuration
 */
function validateGrounding(system) {
  const issues = [];
  
  system.transformers.forEach(tr => {
    // Check if delta secondary has grounding (invalid)
    if (tr.grounding === 'delta' && tr.secondaryKV < 1000) {
      issues.push({
        transformerId: tr.id,
        issue: 'Delta secondary on low voltage system may not provide proper grounding'
      });
    }
    
    // Check if high impedance grounding is appropriate
    if (tr.grounding === 'yg_resistivo' && tr.secondaryKV < 480) {
      issues.push({
        transformerId: tr.id,
        issue: 'High resistance grounding may not be appropriate for low voltage'
      });
    }
  });
  
  return issues;
}

/**
 * Validate that the system is solvable (has proper reference)
 */
function validateSolvability(system) {
  const errors = [];
  
  // System must have at least one slack bus
  const hasSlack = system.buses.some(b => b.type === 'Slack');
  if (!hasSlack) {
    errors.push('System must have at least one slack bus for reference');
  }
  
  // System must be connected (single component)
  const connectedBusIds = new Set();
  system.lines.forEach(l => {
    connectedBusIds.add(l.fromBus);
    connectedBusIds.add(l.toBus);
  });
  system.transformers.forEach(t => {
    connectedBusIds.add(t.fromBus);
    connectedBusIds.add(t.toBus);
  });
  
  if (connectedBusIds.size < system.buses.length) {
    errors.push('System has disconnected components');
  }
  
  // System must have at least one loop or be radial with proper termination
  const loops = detectLoops(system);
  if (loops.length === 0 && system.buses.length > 2) {
    // Radial system - check if properly terminated
    const endBuses = system.buses.filter(bus => {
      const connections = [
        ...system.lines.filter(l => l.fromBus === bus.id || l.toBus === bus.id),
        ...system.transformers.filter(t => t.fromBus === bus.id || t.toBus === bus.id)
      ];
      return connections.length === 1;
    });
    
    if (endBuses.length === 0) {
      errors.push('Radial system has no termination points');
    }
  }
  
  return {
    solvable: errors.length === 0,
    errors
  };
}

module.exports = {
  validateTopology,
  detectLoops,
  findDirectSourceToLoadConnections,
  validateTransformerRatios,
  checkThermalLimits,
  validateGrounding,
  validateSolvability
};
