/**
 * application/services/simulation.service.js - High-level simulation service
 * 
 * Responsibility: Business logic orchestration for complex simulations
 */

const WorkerPool = require('@/infrastructure/workers/workerPool');
const path = require('path');

class SimulationService {
  constructor() {
    this.workerPool = new WorkerPool(
      path.resolve(__dirname, '../../infrastructure/workers/simulation.worker.js'),
      { maxSize: 8, minSize: 2 }
    );
  }

  /**
   * Run N-1 contingency analysis
   * @param {Object} system - Power system model
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis results
   */
  async runN1Contingency(system, options = {}) {
    const { 
      maxContingencies = 20,
      parallel = true,
      securityLevel = 'N-1'
    } = options;

    console.log(`⚡ Service: Running ${securityLevel} contingency analysis...`);

    // Generate contingencies
    const contingencies = this.generateContingencies(system, { type: 'N-1' });
    console.log(`⚡ Service: Generated ${contingencies.length} ${securityLevel} contingencies`);

    // Create tasks for worker pool
    const tasks = contingencies.map((contingency, index) => ({
      type: 'contingency',
      system,
      contingency,
      index,
      options: {
        method: 'FDLF',
        tolerance: 1e-6,
        maxIterations: 20
      }
    }));

    // Execute analysis
    let results;
    if (parallel) {
      results = await this.workerPool.executeAll(tasks);
    } else {
      results = [];
      for (const task of tasks) {
        const result = await this.workerPool.execute(task);
        results.push(result);
      }
    }

    // Analyze results
    const analysis = this.analyzeContingencyResults(results, contingencies);

    return {
      securityLevel,
      totalContingencies: contingencies.length,
      evaluatedContingencies: results.length,
      parallel,
      results,
      analysis,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Run N-2 contingency analysis
   * @param {Object} system - Power system model
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis results
   */
  async runN2Contingency(system, options = {}) {
    const { 
      maxContingencies = 50,
      parallel = false, // N-2 is very intensive
      securityLevel = 'N-2'
    } = options;

    console.log(`⚡ Service: Running ${securityLevel} contingency analysis...`);

    // Generate N-2 contingencies
    const contingencies = this.generateContingencies(system, { type: 'N-2' });
    console.log(`⚡ Service: Generated ${contingencies.length} ${securityLevel} contingencies`);

    // Sequential execution for N-2
    const results = [];
    for (let i = 0; i < Math.min(contingencies.length, maxContingencies); i++) {
      const contingency = contingencies[i];
      console.log(`⚡ Service: Evaluating contingency ${i + 1}/${Math.min(contingencies.length, maxContingencies)}`);

      const task = {
        type: 'contingency',
        system,
        contingency,
        index: i,
        options: {
          method: 'FDLF',
          tolerance: 1e-6,
          maxIterations: 20
        }
      };

      const result = await this.workerPool.execute(task);
      results.push(result);

      if (!result.success) {
        console.log(`⚠️ Service: Contingency ${i + 1} failed: ${result.error}`);
      }
    }

    // Analyze results
    const analysis = this.analyzeContingencyResults(results, contingencies);

    return {
      securityLevel,
      totalContingencies: contingencies.length,
      evaluatedContingencies: results.length,
      parallel: false,
      results,
      analysis,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Run full security analysis (N-1 + N-2)
   * @param {Object} system - Power system model
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Complete analysis results
   */
  async runFullSecurityAnalysis(system, options = {}) {
    console.log(`⚡ Service: Starting full security analysis...`);

    // Run N-1 analysis
    const n1Results = await this.runN1Contingency(system, {
      ...options,
      maxContingencies: options.maxN1 || 20
    });

    // Run N-2 analysis (limited)
    const n2Results = await this.runN2Contingency(system, {
      ...options,
      maxContingencies: options.maxN2 || 5
    });

    // Combine results
    const combinedResults = {
      n1: n1Results,
      n2: n2Results,
      summary: {
        totalContingencies: n1Results.totalContingencies + n2Results.totalContingencies,
        criticalN1: n1Results.analysis.critical || 0,
        criticalN2: n2Results.analysis.critical || 0,
        overallSecurity: n1Results.analysis.secure && n2Results.analysis.secure
      }
    };

    console.log(`⚡ Service: Full security analysis complete`);
    console.log(`⚡ Service: N-1: ${n1Results.evaluatedContingencies}/${n1Results.totalContingencies} secure`);
    console.log(`⚡ Service: N-2: ${n2Results.evaluatedContingencies}/${n2Results.totalContingencies} secure`);

    return combinedResults;
  }

  /**
   * Generate contingencies
   * @param {Object} system - Power system model
   * @param {Object} options - Generation options
   * @returns {Array} Contingencies
   */
  generateContingencies(system, options = {}) {
    const { type = 'N-1', maxContingencies = 20 } = options;
    const contingencies = [];

    // Line outages
    system.branches.forEach((branch, i) => {
      if (i >= maxContingencies) return;

      contingencies.push({
        id: `line_${i}`,
        type: 'line_outage',
        description: `Line outage: ${branch.from}-${branch.to}`,
        line: branch.id,
        from: branch.from,
        to: branch.to,
        severity: this.calculateLineSeverity(branch)
      });
    });

    // Generator outages
    system.buses.forEach((bus, i) => {
      if (bus.type === 'PV' && contingencies.length < maxContingencies) {
        contingencies.push({
          id: `gen_${i}`,
          type: 'generator_outage',
          description: `Generator outage: Bus ${bus.id}`,
          bus: bus.id,
          generation: bus.P,
          severity: this.calculateGeneratorSeverity(bus)
        });
      }
    });

    return contingencies;
  }

  /**
   * Calculate line outage severity
   * @param {Object} branch - Branch data
   * @returns {string} Severity level
   */
  calculateLineSeverity(branch) {
    const loading = branch.loading || 0.5;
    
    if (loading > 0.9) return 'critical';
    if (loading > 0.7) return 'marginal';
    return 'low';
  }

  /**
   * Calculate generator outage severity
   * @param {Object} bus - Bus data
   * @returns {string} Severity level
   */
  calculateGeneratorSeverity(bus) {
    const generation = bus.P || 0;
    const capacity = bus.Pmax || 1.0;
    const utilization = generation / capacity;
    
    if (utilization > 0.9) return 'critical';
    if (utilization > 0.7) return 'marginal';
    return 'low';
  }

  /**
   * Analyze contingency results
   * @param {Array} results - Contingency results
   * @param {Array} contingencies - Contingency definitions
   * @returns {Object} Analysis summary
   */
  analyzeContingencyResults(results, contingencies) {
    const analysis = {
      total: results.length,
      secure: 0,
      critical: 0,
      marginal: 0,
      low: 0,
      violations: {
        voltage: 0,
        overloads: 0,
        islanding: 0
      }
    };

    results.forEach((result, index) => {
      if (!result.success) return;

      const contingency = contingencies[index];
      const evaluation = result.data.security;

      if (evaluation.secure) {
        analysis.secure++;
      } else {
        analysis.critical += evaluation.severity === 'critical' ? 1 : 0;
        analysis.marginal += evaluation.severity === 'marginal' ? 1 : 0;
        analysis.low += evaluation.severity === 'low' ? 1 : 0;

        // Count violations
        if (evaluation.violations) {
          analysis.violations.voltage += evaluation.violations.voltage || 0;
          analysis.violations.overloads += evaluation.violations.overloads || 0;
          analysis.violations.islanding += evaluation.violations.islanding || 0;
        }
      }
    });

    return analysis;
  }

  /**
   * Get service statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    return {
      workerPool: this.workerPool.getStats(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    };
  }

  /**
   * Shutdown service
   */
  async shutdown() {
    console.log('🛑 Shutting down simulation service...');
    await this.workerPool.shutdown();
  }
}

module.exports = SimulationService;
