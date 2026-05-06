/**
 * Test script for debug system
 * Verifies the debug system initialization and logging functionality
 */

const DebugSystem = require('../backend/src/debug/index');
const { SimulationLogger } = require('../backend/src/debug/simulation');

console.log('🔍 Testing Debug System...\n');

// Test 1: Initialize debug system
console.log('1. Testing Debug System Initialization');
try {
  DebugSystem.init(true);
  console.log('✅ Debug system initialized successfully\n');
} catch (error) {
  console.error('❌ Debug system initialization failed:', error.message);
  process.exit(1);
}

// Test 2: Log debug steps
console.log('2. Testing Debug Logging');
try {
  DebugSystem.logStep('TEST_STEP_1', { value: 42, unit: 'A' }, 'info');
  DebugSystem.logStep('TEST_STEP_2', { voltage: 480, current: 100 }, 'debug');
  DebugSystem.logStep('TEST_STEP_3', { error: 'Test error' }, 'warn');
  console.log('✅ Debug logging works\n');
} catch (error) {
  console.error('❌ Debug logging failed:', error.message);
  process.exit(1);
}

// Test 3: Get logs
console.log('3. Testing Get Logs');
try {
  const logs = DebugSystem.getLogs();
  console.log(`✅ Retrieved ${logs.length} log entries\n`);
  if (logs.length > 0) {
    console.log('Sample log entry:', JSON.stringify(logs[0], null, 2));
  }
} catch (error) {
  console.error('❌ Get logs failed:', error.message);
  process.exit(1);
}

// Test 4: Export logs
console.log('4. Testing Export Logs');
try {
  const exported = DebugSystem.exportDebug();
  const exportedData = JSON.parse(exported);
  console.log(`✅ Exported ${exportedData.length} log entries\n`);
} catch (error) {
  console.error('❌ Export logs failed:', error.message);
  process.exit(1);
}

// Test 5: Simulation Logger
console.log('5. Testing Simulation Logger');
try {
  const simLogger = new SimulationLogger('test_session');
  simLogger.startSession({ system: 'test' });
  simLogger.logEvent('FAULT_DETECTED', { bus: 1, current: 5000 });
  simLogger.logEvent('BREAKER_TRIP', { breaker: 'B1', time: 0.05 });
  simLogger.endSession();
  console.log('✅ Simulation logger works\n');
} catch (error) {
  console.error('❌ Simulation logger failed:', error.message);
  process.exit(1);
}

// Test 6: Clear logs
console.log('6. Testing Clear Logs');
try {
  DebugSystem.clearLogs();
  const logsAfterClear = DebugSystem.getLogs();
  console.log(`✅ Logs cleared. Remaining: ${logsAfterClear.length}\n`);
} catch (error) {
  console.error('❌ Clear logs failed:', error.message);
  process.exit(1);
}

console.log('✅ All debug system tests passed!');
