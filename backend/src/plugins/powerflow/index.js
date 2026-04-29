/**
 * plugins/powerflow/index.js - Power Flow Plugin
 * 
 * Responsibility: Core power flow capabilities
 */

const { solveLoadFlowRobust } = require('@/core/powerflow/newton');
const { solveFDLF } = require('@/core/powerflow/solvers');

module.exports = {
  name: 'powerflow',
  version: '1.0.0',
  description: 'Core power flow analysis plugin',
  dependencies: [],

  async init(context) {
    context.powerflow = {
      methods: {
        NR: solveLoadFlowRobust,
        FDLF: solveFDLF
      },
      capabilities: {
        'newton-raphson': true,
        'fast-decoupled': true,
        'robust-convergence': true,
        'voltage-control': true,
        'pv-control': true
      }
    };
  },

  async run(payload, context) {
    const { system, options = {} } = payload;
    const { method = 'FDLF', tolerance = 1e-6, maxIterations = 20 } = options;

    console.log(`⚡ PowerFlow: Running ${method} analysis...`);

    let result;
    switch (method) {
      case 'NR':
        result = context.powerflow.methods.NR(system, { tolerance, maxIterations });
        break;
      case 'FDLF':
        result = context.powerflow.methods.FDLF(system, { tolerance, maxIterations });
        break;
      default:
        throw new Error(`Unknown power flow method: ${method}`);
    }

    console.log(`⚡ PowerFlow: ${result.converged ? 'CONVERGED' : 'NOT CONVERGED'} in ${result.iterations} iterations`);

    return {
      method,
      converged: result.converged,
      iterations: result.iterations,
      voltages: result.voltages,
      flows: result.flows,
      system,
      options,
      timestamp: new Date().toISOString()
    };
  },

  async shutdown(context) {
    console.log('🔌 PowerFlow plugin shutdown');
  }
};
