/**
 * application/simulation/runSimulation.js - High-level simulation orchestrator
 * 
 * Responsibility: Orchestrate complex simulation workflows using engine
 */

const Engine = require('@/engine/Engine');
const { initializeEngine } = require('@/engine/bootstrap');

/**
 * Run complex simulation workflow
 * @param {Object} input - Simulation input
 * @returns {Promise<Object>} Simulation results
 */
async function runSimulation(input) {
  const {
    system,
    workflow = 'powerflow',
    options = {}
  } = input;

  console.log(`🚀 Starting simulation workflow: ${workflow}`);

  // Initialize engine
  const engine = await initializeEngine(options);

  // Define workflow based on type
  const workflows = {
    'powerflow': async () => {
      return await engine.run('powerflow', 'run', { system, options });
    },
    'opf': async () => {
      // OPF workflow: PowerFlow → OPF
      const pfResult = await engine.run('powerflow', 'run', { system, options });
      return await engine.run('opf', 'run', { system, ...pfResult.data });
    },
    'stability': async () => {
      // Stability workflow: PowerFlow → Stability
      const pfResult = await engine.run('powerflow', 'run', { system, options });
      return await engine.run('stability', 'run', { 
        system, 
        events: options.events || []
      });
    },
    'contingency': async () => {
      // Contingency workflow: PowerFlow → Contingency
      const pfResult = await engine.run('powerflow', 'run', { system, options });
      return await engine.run('contingency', 'run', { 
        system, 
        ...options 
      });
    },
    'ts-scopf': async () => {
      // TS-SCOPF workflow: PowerFlow → OPF → Contingency → Stability
      const pfResult = await engine.run('powerflow', 'run', { system, options });
      const opfResult = await engine.run('opf', 'run', { system, ...pfResult.data });
      const contingencyResult = await engine.run('contingency', 'run', { 
        system, 
        ...opfResult.data 
      });
      return await engine.run('stability', 'run', { 
        system, 
        events: contingencyResult.data.contingencies?.map(c => c.fault) || []
      });
    }
  };

  const workflowFunc = workflows[workflow];
  if (!workflowFunc) {
    throw new Error(`Unknown workflow: ${workflow}`);
  }

  try {
    const result = await workflowFunc();
    
    console.log(`✅ Simulation workflow completed: ${workflow}`);
    
    return {
      workflow,
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      engine: engine.getStatus()
    };
  } catch (error) {
    console.error(`❌ Simulation workflow failed: ${workflow}`, error.message);
    
    return {
      workflow,
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      engine: engine.getStatus()
    };
  }
}

/**
 * Run multiple simulations in parallel
 * @param {Array} inputs - Array of simulation inputs
 * @returns {Promise<Array>} Results
 */
async function runParallelSimulations(inputs) {
  console.log(`🚀 Running ${inputs.length} simulations in parallel...`);
  
  const promises = inputs.map(input => runSimulation(input));
  const results = await Promise.all(promises);
  
  console.log(`✅ Parallel simulations completed`);
  
  return results;
}

/**
 * Run sequential simulations
 * @param {Array} inputs - Array of simulation inputs
 * @returns {Promise<Array>} Results
 */
async function runSequentialSimulations(inputs) {
  console.log(`🚀 Running ${inputs.length} simulations sequentially...`);
  
  const results = [];
  
  for (const input of inputs) {
    const result = await runSimulation(input);
    results.push(result);
    
    if (!result.success) {
      console.log(`⚠️ Sequential simulation stopped at failed step`);
      break;
    }
  }
  
  console.log(`✅ Sequential simulations completed`);
  
  return results;
}

/**
 * Get available workflows
 * @returns {Array} Available workflows
 */
function getAvailableWorkflows() {
  return [
    {
      name: 'powerflow',
      description: 'Basic power flow analysis',
      capabilities: ['NR', 'FDLF', 'voltage-control', 'pv-control']
    },
    {
      name: 'opf',
      description: 'Optimal power flow with economic dispatch',
      capabilities: ['economic-dispatch', 'lmp-calculation', 'constraint-handling']
    },
    {
      name: 'stability',
      description: 'Transient stability analysis',
      capabilities: ['fault-simulation', 'swing-equation', 'rk4-integration']
    },
    {
      name: 'contingency',
      description: 'N-1/N-2 contingency analysis',
      capabilities: ['line-outages', 'generator-outages', 'security-evaluation']
    },
    {
      name: 'ts-scopf',
      description: 'Transient stability security-constrained OPF',
      capabilities: ['economic-dispatch', 'contingency-analysis', 'stability-constraints']
    }
  ];
}

module.exports = {
  runSimulation,
  runParallelSimulations,
  runSequentialSimulations,
  getAvailableWorkflows
};
