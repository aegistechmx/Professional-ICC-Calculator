/* eslint-disable no-console */
const DebugSystem = require('../src/debug');

/**
 * Interface Synchronization Validator
 * Checks if data structures sent across postMessage bridge are valid
 */
function validateSynchronization() {
  console.log('--- STARTING INTERFACE SYNC VALIDATION ---');
  DebugSystem.init(true);

  const testScenarios = [
    {
      name: 'Valid Sync Message',
      payload: { tension: 480, corriente: 100, fp: 0.9 },
      expectedWarnings: 0
    },
    {
      name: 'Naming Collision (Alias Error)',
      payload: { tension: 480, voltage: 480 }, // Should trigger consistency error
      expectedWarnings: 1
    },
    {
      name: 'Type Mismatch Error',
      payload: { tension: "480V", corriente: 100 }, // String instead of number
      expectedWarnings: 1
    },
    {
      name: 'Physical Limit Error',
      payload: { temperatura: 150 }, // Out of range [-40, 100]
      expectedWarnings: 1
    },
    {
      name: 'PDF Report Data Audit (Valid)',
      payload: { 
        projectName: 'Planta de Procesos',
        calculations: { voltage: 480, isc: 25000, temp: 30 }
      },
      expectedWarnings: 0
    },
    {
      name: 'PDF Report Data Audit (Invalid Alias)',
      payload: { 
        calculations: { 
          tension: 480, 
          voltage: 480 // Trigger naming collision in report data
        }
      },
      expectedWarnings: 1
    },
    {
      name: 'Bridge Network Failure Simulation',
      payload: { 
        error: 'ECONNREFUSED',
        message: 'Could not connect to calculation engine at http://localhost:5000',
        stack: 'Error: ECONNREFUSED at TCPConnectWrap.afterConnect'
      },
      expectedWarnings: 1
    }
  ];

  testScenarios.forEach(scenario => {
    const entry = DebugSystem.logStep(`SYNC_TEST:${scenario.name}`, scenario.payload);
    const warningCount = entry.metadata.precisionWarnings.length;
    
    const passed = warningCount >= scenario.expectedWarnings;
    console.log(`${passed ? '✓' : '✗'} ${scenario.name}: Found ${warningCount} issues (Expected >= ${scenario.expectedWarnings})`);
    
    if (warningCount > 0) {
      entry.metadata.precisionWarnings.forEach(w => console.log(`   - Warning: ${w}`));
    }
  });

  console.log('--- SYNC VALIDATION COMPLETE ---');
}

validateSynchronization();