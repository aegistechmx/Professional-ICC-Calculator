/* eslint-disable no-console */
const DebugSystem = require('../src/debug');

/**
 * Load test for Bridge Validation
 * Simulates 100 postMessage events with out-of-range data
 */
function runLoadTest() {
  console.log('--- STARTING BRIDGE LOAD TEST ---');
  DebugSystem.init(true);
  
  let warningCount = 0;
  
  for (let i = 1; i <= 100; i++) {
    // Generate data where messages have some properties out of range
    const isOutOfRange = i % 2 === 0;
    
    const simulatedMessage = {
      msgId: i,
      timestamp: new Date().toISOString(),
      payload: {
        tension: isOutOfRange ? 110 : 220, // 110 is below min 120
        corriente: isOutOfRange ? 150000 : 500, // 150k is above max 100k
        fp: isOutOfRange ? 1.2 : 0.9, // 1.2 is above max 1.0
        longitud: isOutOfRange ? 0.05 : 100, // 0.05 is below min 0.1
        temperatura: isOutOfRange ? 150 : 25 // 150 is above max 100
      }
    };

    const entry = DebugSystem.logStep(`BRIDGE_MSG_SIM_${i}`, simulatedMessage);
    
    if (entry.level === 'warn') {
      warningCount++;
    }
  }

  console.log(`--- LOAD TEST COMPLETE ---`);
  console.log(`Total Simulated Messages: 100`);
  console.log(`Warnings Triggered: ${warningCount}`);
  console.log(`Success Rate (Warnings as expected): ${warningCount === 50 ? '100%' : 'Mismatch'}`);
}

runLoadTest();