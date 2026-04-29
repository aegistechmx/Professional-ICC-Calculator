/**
 * plugins/contingency/index.js - Contingency Analysis Plugin
 * 
 * Responsibility: N-1/N-2 contingency analysis
 */

const { generateN1Contingencies } = require('@/core/powerflow/contingency/generator');
const { evaluateSecurityConstraints } = require('@/core/powerflow/contingency/evaluator');

module.exports = {
  name: 'contingency',
  version: '1.0.0',
  description: 'Contingency analysis plugin for security assessment',
  dependencies: ['powerflow'],

  async init(context) {
    context.contingency = {
      generator: generateN1Contingencies,
      evaluator: evaluateSecurityConstraints,
      methods: {
        'n-1': generateN1Contingencies,
        'n-2': null // Future implementation
      },
      capabilities: {
        'line-outages': true,
        'generator-outages': true,
        'security-evaluation': true,
        'severity-ranking': true,
        'overload-detection': true
      }
    };
  },

  async run(payload, context) {
    const { system, options = {} } = payload;
    const { type = 'n-1', maxContingencies = 10 } = options;

    console.log(`⚡ Contingency: Running ${type} analysis...`);

    // Generate contingencies
    const contingencies = context.contingency.methods[type](system);
    console.log(`⚡ Contingency: Generated ${contingencies.length} contingencies`);

    // Evaluate security constraints
    const results = [];
    for (let i = 0; i < Math.min(contingencies.length, maxContingencies); i++) {
      const contingency = contingencies[i];
      console.log(`⚡ Contingency: Evaluating ${contingency.description} (${i + 1}/${Math.min(contingencies.length, maxContingencies)})`);

      const evaluation = context.contingency.evaluator(system, contingency);
      results.push({
        contingency,
        evaluation,
        index: i
      });
    }

    // Calculate summary statistics
    const summary = {
      total: contingencies.length,
      evaluated: results.length,
      secure: results.filter(r => r.evaluation.secure).length,
      critical: results.filter(r => r.evaluation.severity === 'critical').length,
      marginal: results.filter(r => r.evaluation.severity === 'marginal').length
    };

    console.log(`⚡ Contingency: ${summary.secure}/${summary.evaluated} secure cases`);

    return {
      type,
      contingencies: results.slice(0, maxContingencies),
      summary,
      system,
      options,
      timestamp: new Date().toISOString()
    };
  },

  async shutdown(context) {
    console.log('🔌 Contingency plugin shutdown');
  }
};
