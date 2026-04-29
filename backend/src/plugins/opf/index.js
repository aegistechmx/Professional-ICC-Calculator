/**
 * plugins/opf/index.js - Optimal Power Flow Plugin
 * 
 * Responsibility: Economic dispatch optimization
 */

const NewtonOPFSolver = require('@/core/powerflow/opf/solver');

module.exports = {
  name: 'opf',
  version: '1.0.0',
  description: 'Optimal Power Flow plugin for economic dispatch',
  dependencies: ['powerflow'],

  async init(context) {
    context.opf = {
      solver: NewtonOPFSolver,
      methods: {
        'newton': NewtonOPFSolver,
        'interior-point': null // Future implementation
      },
      capabilities: {
        'economic-dispatch': true,
        'lmp-calculation': true,
        'constraint-handling': true,
        'cost-optimization': true
      }
    };
  },

  async run(payload, context) {
    const { system, options = {} } = payload;
    const {
      tolerance = 1e-6,
      maxIterations = 30,
      alpha = 0.5,
      powerFlowMethod = 'FDLF',
      penalty = 1000
    } = options;

    console.log(`⚡ OPF: Running economic dispatch optimization...`);

    // Get power flow result first
    const pfResult = await context.engine.run('powerflow', 'run', {
      system,
      options: { method: powerFlowMethod }
    });

    if (!pfResult.success || !pfResult.data.converged) {
      throw new Error('Power flow did not converge');
    }

    // Run OPF optimization
    const solver = new context.opf.solver(system, {
      tolerance,
      maxIterations,
      alpha,
      powerFlowMethod,
      penalty
    });

    const result = solver.solve();

    console.log(`⚡ OPF: ${result.converged ? 'CONVERGED' : 'NOT CONVERGED'} in ${result.iterations} iterations`);
    console.log(`⚡ OPF: Final cost: $${result.cost.toFixed(2)}`);

    return {
      converged: result.converged,
      iterations: result.iterations,
      cost: result.cost,
      generation: result.generation,
      constraints: result.violations,
      lmp: result.lmp,
      system,
      options,
      timestamp: new Date().toISOString()
    };
  },

  async shutdown(context) {
    console.log('🔌 OPF plugin shutdown');
  }
};
