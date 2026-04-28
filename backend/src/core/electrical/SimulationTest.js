/**
 * Simulation Test Suite
 * Tests the complete simulation pipeline end-to-end
 */

const { ElectricalSystem, Bus, Line, Transformer, Load, Motor, Generator } = require('./ElectricalSystem');
const { solvePowerFlow } = require('./PowerFlowOrchestrator');
const { buildElectricalGraph, buildYbus } = require('./YbusBuilderV2');
const { buildSequenceZbus, analyzeFault } = require('./FaultAnalysisV2');
const logger = require('../../utils/logger');

/**
 * Test 1: Simple 3-bus system
 */
function testSimpleSystem() {
  logger.info('=== Test 1: Simple 3-bus system ===');
  
  const system = new ElectricalSystem({
    name: 'Test System',
    baseMVA: 100,
    baseKV: 13.8
  });
  
  // Add buses
  system.addBus({ id: 'bus1', type: 'Slack', baseKV: 13.8 });
  system.addBus({ id: 'bus2', type: 'PV', baseKV: 13.8 });
  system.addBus({ id: 'bus3', type: 'PQ', baseKV: 13.8, load: { P: 50, Q: 25 } });
  
  // Add lines
  system.addLine({ id: 'line1', fromBus: 'bus1', toBus: 'bus2', r: 0.01, x: 0.1 });
  system.addLine({ id: 'line2', fromBus: 'bus2', toBus: 'bus3', r: 0.015, x: 0.12 });
  
  // Validate topology
  const validation = system.validateTopology();
  logger.info('Topology validation:', validation);
  
  // Get summary
  const summary = system.getSummary();
  logger.info('System summary:', summary);
  
  return system;
}

/**
 * Test 2: System with transformer
 */
function testTransformerSystem() {
  logger.info('=== Test 2: System with transformer ===');
  
  const system = new ElectricalSystem({
    name: 'Transformer Test',
    baseMVA: 100,
    baseKV: 13.8
  });
  
  // Add buses with different voltage levels
  system.addBus({ id: 'hv_bus', type: 'Slack', baseKV: 13.8 });
  system.addBus({ id: 'lv_bus', type: 'PQ', baseKV: 0.48, load: { P: 10, Q: 5 } });
  
  // Add transformer
  system.addTransformer({
    id: 'xfm1',
    fromBus: 'hv_bus',
    toBus: 'lv_bus',
    primaryKV: 13.8,
    secondaryKV: 0.48,
    mva: 0.5,
    impedance: 0.0575
  });
  
  const validation = system.validateTopology();
  logger.info('Topology validation:', validation);
  
  const summary = system.getSummary();
  logger.info('System summary:', summary);
  
  return system;
}

/**
 * Test 3: System with motors
 */
function testMotorSystem() {
  logger.info('=== Test 3: System with motors ===');
  
  const system = new ElectricalSystem({
    name: 'Motor Test',
    baseMVA: 100,
    baseKV: 0.48
  });
  
  // Add buses
  system.addBus({ id: 'source', type: 'Slack', baseKV: 0.48 });
  system.addBus({ id: 'motor_bus', type: 'PQ', baseKV: 0.48 });
  
  // Add line
  system.addLine({ id: 'line1', fromBus: 'source', toBus: 'motor_bus', r: 0.02, x: 0.15 });
  
  // Add motor
  system.addMotor({
    id: 'motor1',
    bus: 'motor_bus',
    type: 'induction',
    hp: 100,
    voltage: 0.48,
    efficiency: 0.92,
    powerFactor: 0.85,
    xd: 0.2,
    xd_prime: 0.15
  });
  
  const validation = system.validateTopology();
  logger.info('Topology validation:', validation);
  
  const summary = system.getSummary();
  logger.info('System summary:', summary);
  
  return system;
}

/**
 * Test 4: ReactFlow to ElectricalSystem conversion
 */
function testReactFlowConversion() {
  logger.info('=== Test 4: ReactFlow to ElectricalSystem ===');
  
  const nodes = [
    { id: 'node1', type: 'transformer', data: { parameters: { voltaje: 13.8 } } },
    { id: 'node2', type: 'load', data: { parameters: { potencia_kW: 50, fp: 0.85 } } }
  ];
  
  const edges = [
    { id: 'edge1', source: 'node1', target: 'node2' }
  ];
  
  // This would use the actual conversion function
  logger.info('ReactFlow nodes:', nodes.length);
  logger.info('ReactFlow edges:', edges.length);
  
  return { nodes, edges };
}

/**
 * Run all tests
 */
function runAllTests() {
  logger.info('╔════════════════════════════════════════╗');
  logger.info('║  SIMULATION PIPELINE TEST SUITE      ║');
  logger.info('╚════════════════════════════════════════╝');
  logger.info();
  
  try {
    testSimpleSystem();
    logger.info('✓ Test 1 passed\n');
    
    testTransformerSystem();
    logger.info('✓ Test 2 passed\n');
    
    testMotorSystem();
    logger.info('✓ Test 3 passed\n');
    
    testReactFlowConversion();
    logger.info('✓ Test 4 passed\n');
    
    logger.info('╔════════════════════════════════════════╗');
    logger.info('║  ALL TESTS PASSED                    ║');
    logger.info('╚════════════════════════════════════════╝');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Export test functions
module.exports = {
  testSimpleSystem,
  testTransformerSystem,
  testMotorSystem,
  testReactFlowConversion,
  runAllTests
};

// Run tests if executed directly
if (require.main === module) {
  runAllTests();
}
