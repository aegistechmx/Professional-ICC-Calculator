/**
 * ScenarioSystem - Multi-scenario simulation system
 * 
 * Industrial power systems require analysis under multiple operating conditions:
 * - Load variations (max, min, normal)
 * - Generation states (all units, N-1, N-2)
 * - Fault conditions (different locations, types)
 * - Topology changes (line outages, maintenance)
 * 
 * This system enables comprehensive scenario-based analysis
 */

const { ElectricalSystem } = require('../electrical/ElectricalSystem');
const { solveLoadFlow } = require('../electrical/NewtonRaphsonSolver');
const { calculateFault, calculateFaultScan } = require('../electrical/SymmetricalComponents');
const { validateTopology } = require('../electrical/TopologyValidator');

/**
 * Scenario class - Represents a single operating scenario
 */
class Scenario {
  constructor(data) {
    this.id = data.id;
    this.name = data.name || 'Scenario';
    this.description = data.description || '';
    this.baseSystem = data.baseSystem; // Reference to base electrical system
    
    // Load factors
    this.loadFactor = data.loadFactor || 1.0; // 1.0 = normal load
    this.generationFactor = data.generationFactor || 1.0;
    
    // Topology changes
    this.outagedLines = data.outagedLines || []; // Line IDs to remove
    this.outagedTransformers = data.outagedTransformers || []; // Transformer IDs to remove
    this.outagedGenerators = data.outagedGenerators || []; // Generator IDs to remove
    
    // Fault conditions
    this.fault = data.fault || null; // { busId, type, impedance }
    
    // Protection settings override
    this.protectionSettings = data.protectionSettings || {};
    
    // Analysis results
    this.results = null;
    this.analyzed = false;
  }
  
  /**
   * Create modified system for this scenario
   */
  createScenarioSystem() {
    const system = new ElectricalSystem({
      name: `${this.baseSystem.name} - ${this.name}`,
      baseMVA: this.baseSystem.baseMVA,
      baseKV: this.baseSystem.baseKV,
      frequency: this.baseSystem.frequency
    });
    
    // Copy buses
    this.baseSystem.buses.forEach(bus => {
      const scenarioBus = { ...bus };
      // Apply load factor
      if (scenarioBus.load) {
        scenarioBus.load = {
          P: scenarioBus.load.P * this.loadFactor,
          Q: scenarioBus.load.Q * this.loadFactor
        };
      }
      // Apply generation factor
      if (scenarioBus.generation) {
        scenarioBus.generation = {
          P: scenarioBus.generation.P * this.generationFactor,
          Q: scenarioBus.generation.Q * this.generationFactor
        };
      }
      system.addBus(scenarioBus);
    });
    
    // Copy lines (excluding outaged)
    this.baseSystem.lines.forEach(line => {
      if (!this.outagedLines.includes(line.id)) {
        system.addLine({ ...line });
      }
    });
    
    // Copy transformers (excluding outaged)
    this.baseSystem.transformers.forEach(tr => {
      if (!this.outagedTransformers.includes(tr.id)) {
        system.addTransformer({ ...tr });
      }
    });
    
    // Copy loads (with factor applied)
    this.baseSystem.loads.forEach(load => {
      system.addLoad({
        ...load,
        P: load.P * this.loadFactor,
        Q: load.Q * this.loadFactor
      });
    });
    
    // Copy motors (with factor applied)
    this.baseSystem.motors.forEach(motor => {
      system.addMotor({ ...motor });
    });
    
    // Copy generators (excluding outaged, with factor applied)
    this.baseSystem.generators.forEach(gen => {
      if (!this.outagedGenerators.includes(gen.id)) {
        system.addGenerator({
          ...gen,
          P: gen.P * this.generationFactor,
          Q: gen.Q * this.generationFactor
        });
      }
    });
    
    return system;
  }
  
  /**
   * Run analysis for this scenario
   */
  analyze(options = {}) {
    const system = this.createScenarioSystem();
    
    // Validate topology
    const topologyValidation = validateTopology(system);
    
    if (!topologyValidation.valid) {
      this.results = {
        scenarioId: this.id,
        valid: false,
        topologyValidation,
        error: 'Invalid topology'
      };
      this.analyzed = true;
      return this.results;
    }
    
    // Run load flow
    const loadFlow = solveLoadFlow(system, {
      maxIterations: options.maxIterations || 30,
      tolerance: options.tolerance || 1e-6,
      verbose: options.verbose || false
    });
    
    // Run fault analysis if specified
    let faultAnalysis = null;
    if (this.fault) {
      faultAnalysis = calculateFault(system, this.fault);
    }
    
    // Store results
    this.results = {
      scenarioId: this.id,
      scenarioName: this.name,
      valid: true,
      topologyValidation,
      loadFlow,
      faultAnalysis,
      systemSummary: system.getSummary()
    };
    
    this.analyzed = true;
    return this.results;
  }
}

/**
 * ScenarioManager - Manage multiple scenarios
 */
class ScenarioManager {
  constructor() {
    this.scenarios = [];
    this.baseSystem = null;
  }
  
  /**
   * Set base electrical system
   */
  setBaseSystem(system) {
    this.baseSystem = system;
    return this;
  }
  
  /**
   * Add a scenario
   */
  addScenario(scenarioData) {
    if (!this.baseSystem) {
      throw new Error('Base system must be set before adding scenarios');
    }
    
    const scenario = new Scenario({
      ...scenarioData,
      baseSystem: this.baseSystem,
      id: scenarioData.id || `scenario_${this.scenarios.length + 1}`
    });
    
    this.scenarios.push(scenario);
    return scenario;
  }
  
  /**
   * Create standard scenarios
   */
  createStandardScenarios() {
    if (!this.baseSystem) {
      throw new Error('Base system must be set first');
    }
    
    // Scenario 1: Normal operation
    this.addScenario({
      id: 'normal',
      name: 'Normal Operation',
      description: 'Normal load and generation',
      loadFactor: 1.0,
      generationFactor: 1.0
    });
    
    // Scenario 2: Maximum load
    this.addScenario({
      id: 'max_load',
      name: 'Maximum Load',
      description: 'System at maximum load conditions',
      loadFactor: 1.2,
      generationFactor: 1.0
    });
    
    // Scenario 3: Minimum load
    this.addScenario({
      id: 'min_load',
      name: 'Minimum Load',
      description: 'System at minimum load conditions',
      loadFactor: 0.5,
      generationFactor: 1.0
    });
    
    // Scenario 4: N-1 (single generator outage)
    if (this.baseSystem.generators.length > 1) {
      this.addScenario({
        id: 'n1_gen',
        name: 'N-1 Generator Outage',
        description: 'Single generator outage',
        loadFactor: 1.0,
        generationFactor: 1.0,
        outagedGenerators: [this.baseSystem.generators[0].id]
      });
    }
    
    // Scenario 5: N-1 (single line outage)
    if (this.baseSystem.lines.length > 0) {
      this.addScenario({
        id: 'n1_line',
        name: 'N-1 Line Outage',
        description: 'Single line outage',
        loadFactor: 1.0,
        generationFactor: 1.0,
        outagedLines: [this.baseSystem.lines[0].id]
      });
    }
    
    return this;
  }
  
  /**
   * Run all scenarios
   */
  runAllScenarios(options = {}) {
    const results = [];
    
    this.scenarios.forEach(scenario => {
      try {
        const result = scenario.analyze(options);
        results.push(result);
      } catch (error) {
        results.push({
          scenarioId: scenario.id,
          valid: false,
          error: error.message
        });
      }
    });
    
    return results;
  }
  
  /**
   * Compare scenarios
   */
  compareScenarios() {
    const comparison = {
      loadFlowComparison: [],
      summary: {}
    };
    
    this.scenarios.forEach(scenario => {
      if (scenario.analyzed && scenario.results.loadFlow) {
        const lf = scenario.results.loadFlow;
        comparison.loadFlowComparison.push({
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          converged: lf.converged,
          iterations: lf.iterations,
          maxMismatch: lf.maxMismatch,
          P_loss: lf.P_loss,
          Q_loss: lf.Q_loss,
          minVoltage: Math.min(...lf.voltages.map(v => Math.sqrt(v.re * v.re + v.im * v.im))),
          maxVoltage: Math.max(...lf.voltages.map(v => Math.sqrt(v.re * v.re + v.im * v.im)))
        });
      }
    });
    
    comparison.summary = {
      totalScenarios: this.scenarios.length,
      analyzedScenarios: comparison.loadFlowComparison.length,
      convergedScenarios: comparison.loadFlowComparison.filter(r => r.converged).length
    };
    
    return comparison;
  }
  
  /**
   * Find worst-case scenario
   */
  findWorstCase(metric = 'P_loss') {
    const results = this.scenarios
      .filter(s => s.analyzed && s.results.loadFlow)
      .map(s => ({
        scenario: s.name,
        value: s.results.loadFlow[metric]
      }));
    
    results.sort((a, b) => b.value - a.value);
    
    return results[0] || null;
  }
  
  /**
   * Get scenario by ID
   */
  getScenario(id) {
    return this.scenarios.find(s => s.id === id);
  }
  
  /**
   * Remove scenario
   */
  removeScenario(id) {
    const index = this.scenarios.findIndex(s => s.id === id);
    if (index !== -1) {
      this.scenarios.splice(index, 1);
    }
    return this;
  }
}

/**
 * Create pre-defined fault scenarios
 */
function createFaultScenarios(system, options = {}) {
  const {
    faultTypes = ['3F', 'LG'],
    faultBuses = system.buses.map(b => b.id)
  } = options;
  
  const manager = new ScenarioManager();
  manager.setBaseSystem(system);
  
  faultBuses.forEach((busId, index) => {
    faultTypes.forEach(faultType => {
      manager.addScenario({
        id: `fault_${faultType}_${busId}`,
        name: `Fault ${faultType} at ${busId}`,
        description: `${faultType} fault at bus ${busId}`,
        fault: {
          faultBusId: busId,
          faultType,
          faultImpedance: { Zf: 0, Zg: 0 }
        }
      });
    });
  });
  
  return manager;
}

module.exports = {
  Scenario,
  ScenarioManager,
  createFaultScenarios
};
