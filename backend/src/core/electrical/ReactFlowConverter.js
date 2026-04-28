/**
 * ReactFlowConverter - Convert ReactFlow editor to ElectricalSystem
 * Bridges the visual editor with the unified electrical model
 */

const { ElectricalSystem, Bus, Line, Transformer, Load, Motor, Generator } = require('./ElectricalSystem');

/**
 * Convert ReactFlow nodes and edges to ElectricalSystem
 * @param {Array} nodes - ReactFlow nodes
 * @param {Array} edges - ReactFlow edges
 * @param {Object} options - Conversion options
 * @returns {ElectricalSystem} Unified electrical system
 */
function convertToElectricalSystem(nodes, edges, options = {}) {
  const {
    baseMVA = 100,
    baseKV = 13.8,
    frequency = 60,
    systemName = 'System from Editor'
  } = options;
  
  const system = new ElectricalSystem({
    name: systemName,
    baseMVA,
    baseKV,
    frequency
  });
  
  // Create bus ID mapping from node IDs
  const busIdMap = new Map();
  let busCounter = 1;
  
  // Convert nodes to buses and components
  nodes.forEach((node, index) => {
    const busId = `BUS_${busCounter++}`;
    busIdMap.set(node.id, busId);
    
    const params = node.data.parameters || {};
    
    // Create bus for this node
    const bus = new Bus({
      id: busId,
      name: node.data.label || `Bus ${busId}`,
      type: determineBusType(node.type),
      baseKV: params.voltaje || baseKV,
      coordinates: node.position
    });
    
    // Add load if it's a load node
    if (node.type === 'load') {
      const load = new Load({
        id: `LOAD_${node.id}`,
        bus: busId,
        P: (params.potencia_kW || 50) / 1000, // Convert kW to MW
        Q: ((params.potencia_kW || 50) / 1000) * Math.tan(Math.acos(params.fp || 0.85)),
        powerFactor: params.fp || 0.85
      });
      system.addLoad(load);
      
      // Update bus with load
      bus.load = { P: load.P, Q: load.Q };
    }
    
    // Add motor if it's a motor node
    if (node.type === 'motor') {
      const motor = new Motor({
        id: `MOTOR_${node.id}`,
        bus: busId,
        type: 'induction',
        hp: params.hp || 75,
        voltage: params.voltaje || 0.48,
        efficiency: params.eficiencia || 0.92,
        powerFactor: params.fp || 0.85
      });
      system.addMotor(motor);
      
      // Update bus with motor contribution
      bus.load = {
        P: bus.load.P + (motor.kW / 1000),
        Q: bus.load.Q + (motor.kW / 1000) * Math.tan(Math.acos(motor.powerFactor))
      };
    }
    
    // Add generator/breaker capacity if it's a transformer (source)
    if (node.type === 'transformer') {
      bus.type = 'Slack';
      bus.generation = {
        P: 0, // Will be calculated from system
        Q: 0
      };
      
      // Add generator for the source
      const generator = new Generator({
        id: `GEN_${node.id}`,
        bus: busId,
        type: 'synchronous',
        mva: params.kVA / 1000 || 0.5,
        xd: 1.8,
        xd_prime: 0.3,
        xd_double_prime: 0.2
      });
      system.addGenerator(generator);
    }
    
    // Add breaker protection data if it's a breaker node
    if (node.type === 'breaker') {
      bus.breaker = {
        In: params.In || 100,
        Icu: params.Icu || 25000,
        tipo: params.tipo || 'molded_case'
      };
    }
    
    system.addBus(bus);
  });
  
  // Convert edges to lines and transformers
  edges.forEach(edge => {
    const fromBusId = busIdMap.get(edge.source);
    const toBusId = busIdMap.get(edge.target);
    
    if (!fromBusId || !toBusId) return;
    
    const fromNode = nodes.find(n => n.id === edge.source);
    const toNode = nodes.find(n => n.id === edge.target);
    
    // Check if this is a transformer connection
    if (fromNode?.type === 'transformer' || toNode?.type === 'transformer') {
      const transformerNode = fromNode?.type === 'transformer' ? fromNode : toNode;
      const params = transformerNode.data.parameters || {};
      
      const transformer = new Transformer({
        id: `TR_${edge.id}`,
        fromBus: fromBusId,
        toBus: toBusId,
        primaryKV: params.primario || 13800,
        secondaryKV: params.secundario || 480,
        mva: (params.kVA || 500) / 1000,
        impedance: (params.Z || 5.75) / 100,
        grounding: params.tipoAterrizamiento || 'yg_solido'
      });
      system.addTransformer(transformer);
    } else {
      // Regular line
      const line = new Line({
        id: `LINE_${edge.id}`,
        fromBus: fromBusId,
        toBus: toBusId,
        length: 1, // Default length (should be calculated from coordinates)
        r: 0.01, // Default resistance per unit
        x: 0.1, // Default reactance per unit
        b: 0.0,
        thermalLimit: 100
      });
      system.addLine(line);
    }
  });
  
  return system;
}

/**
 * Determine bus type based on node type
 */
function determineBusType(nodeType) {
  switch (nodeType) {
  case 'transformer':
    return 'Slack'; // Source bus
  case 'breaker':
  case 'panel':
    return 'PV'; // Voltage controlled
  case 'load':
  case 'motor':
    return 'PQ'; // Load bus
  default:
    return 'PQ';
  }
}

/**
 * Convert ElectricalSystem back to ReactFlow format
 * Useful for displaying simulation results in the editor
 * @param {ElectricalSystem} system - Electrical system
 * @param {Array} originalNodes - Original ReactFlow nodes
 * @returns {Object} Nodes with simulation results
 */
function applySimulationResults(system, originalNodes) {
  const results = {};
  
  originalNodes.forEach(node => {
    const bus = system.buses.find(b => b.name === node.data.label);
    if (bus) {
      results[node.id] = {
        voltage: bus.voltage.magnitude,
        voltageAngle: bus.voltage.angle,
        load: bus.load,
        generation: bus.generation,
        type: bus.type
      };
    }
  });
  
  return results;
}

module.exports = {
  convertToElectricalSystem,
  applySimulationResults
};
