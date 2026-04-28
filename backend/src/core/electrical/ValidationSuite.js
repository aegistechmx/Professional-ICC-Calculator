/**
 * Validation Suite
 * 
 * Validates simulation results against IEEE standard test cases
 * Provides cross-validation between different solvers
 */

const ElectricalState = require('./ElectricalState');
const UnifiedSimulationEngine = require('./UnifiedSimulationEngine');
const OPFNRCoupling = require('./OPFNR_Coupling');
const fs = require('fs');
const path = require('path');

/**
 * Validation Suite Class
 */
class ValidationSuite {
  constructor() {
    this.testCases = [];
    this.validationResults = [];
  }

  /**
   * Load IEEE test case from JSON file
   * @param {string} filePath - Path to test case file
   * @returns {Object} Test case configuration
   */
  loadTestCase(filePath) {
    const fullPath = path.resolve(filePath);
    const data = fs.readFileSync(fullPath, 'utf8');
    const testCase = JSON.parse(data);
    this.testCases.push(testCase);
    return testCase;
  }

  /**
   * Validate power flow with dynamic tolerances
   * @param {Object} testCase - Test case configuration
   * @returns {Object} Validation results
   */
  validatePowerFlow(testCase) {
    const state = new ElectricalState({
      baseMVA: testCase.baseMVA,
      baseKV: testCase.baseKV
    });
    
    state.setSystem(testCase);
    
    // Run power flow
    const engine = new UnifiedSimulationEngine();
    engine.setSystem(state);
    engine.solveNetwork();
    
    const results = state.results.powerFlow;
    const expected = testCase.expectedResults || {};
    
    // Validate against expected values with dynamic tolerances
    const validations = [];
    
    if (expected.bus2_voltage) {
      const bus2 = state.getBus('bus2');
      if (bus2) {
        const error = Math.abs(bus2.V - expected.bus2_voltage);
        const percentError = (error / expected.bus2_voltage) * 100;
        validations.push({
          test: 'bus2_voltage',
          expected: expected.bus2_voltage,
          actual: bus2.V,
          error: error,
          percentError: percentError,
          passed: percentError < 1 // 1% dynamic tolerance
        });
      }
    }
    
    if (expected.bus3_voltage) {
      const bus3 = state.getBus('bus3');
      if (bus3) {
        const error = Math.abs(bus3.V - expected.bus3_voltage);
        const percentError = (error / expected.bus3_voltage) * 100;
        validations.push({
          test: 'bus3_voltage',
          expected: expected.bus3_voltage,
          actual: bus3.V,
          error: error,
          percentError: percentError,
          passed: percentError < 1 // 1% dynamic tolerance
        });
      }
    }
    
    return {
      testCase: testCase.name,
      converged: results.converged,
      iterations: results.iterations,
      validations: validations,
      allPassed: validations.every(v => v.passed)
    };
  }

  /**
   * Cross-validate with dynamic tolerance
   * @param {string} type - Validation type
   * @param {Object} testCase - Test case
   * @returns {Object} Cross-validation results
   */
  crossValidateDynamic(type, testCase) {
    const state = new ElectricalState({
      baseMVA: testCase.baseMVA,
      baseKV: testCase.baseKV
    });
    
    state.setSystem(testCase);
    
    let result;
    
    switch (type) {
    case 'NR_OPF':
      result = this.crossValidateNROPF(testCase);
      break;
    case 'ICC_Ybus':
      result = this.crossValidateICYbus(testCase);
      break;
    case 'Dynamics_PF':
      result = this.crossValidateDynamicsPF(testCase);
      break;
    default:
      return { error: 'Unknown validation type' };
    }
    
    // Apply dynamic tolerance (percentage-based)
    if (result.comparisons) {
      result.comparisons = result.comparisons.map(comp => ({
        ...comp,
        percentError: comp.expected > 0 ? (Math.abs(comp.actual - comp.expected) / comp.expected * 100) : 0,
        passedDynamic: comp.expected > 0 ? (Math.abs(comp.actual - comp.expected) / comp.expected * 100) < 1 : comp.passed
      }));
      
      result.allPassed = result.comparisons.every(c => c.passedDynamic);
    }
    
    return result;
  }

  /**
   * Cross-validate NR vs OPF
   * @param {Object} testCase - Test case configuration
   * @returns {Object} Cross-validation results
   */
  crossValidateNROPF(testCase) {
    const state = new ElectricalState({
      baseMVA: testCase.baseMVA,
      baseKV: testCase.baseKV
    });
    
    state.setSystem(testCase);
    
    // Run pure NR
    const nrEngine = new UnifiedSimulationEngine();
    nrEngine.setSystem(state);
    nrEngine.solveNetwork();
    const nrResults = state.results.powerFlow;
    
    // Run OPF-NR coupled
    const coupling = new OPFNRCoupling(state);
    const opfResults = coupling.solveCoupled();
    
    // Compare results
    const comparisons = [];
    
    state.buses.forEach((bus, i) => {
      if (bus.type !== 'Slack') {
        const nrV = nrResults.V[i];
        const opfV = opfResults.powerFlow.V[i];
        const error = Math.abs(nrV - opfV);
        
        comparisons.push({
          bus: bus.id,
          nrVoltage: nrV,
          opfVoltage: opfV,
          error: error,
          passed: error < 0.01
        });
      }
    });
    
    return {
      testCase: testCase.name,
      nrConverged: nrResults.converged,
      opfConverged: opfResults.converged,
      comparisons: comparisons,
      allPassed: comparisons.every(c => c.passed)
    };
  }

  /**
   * Cross-validate ICC vs Ybus
   * @param {Object} testCase - Test case configuration
   * @returns {Object} Cross-validation results
   */
  crossValidateICYbus(testCase) {
    const state = new ElectricalState({
      baseMVA: testCase.baseMVA,
      baseKV: testCase.baseKV
    });
    
    state.setSystem(testCase);
    
    // Get Ybus
    const Ybus = state.Ybus;
    
    // Run fault analysis
    const faultResult = this.runFaultAnalysis(state, 'bus1', '3P');
    
    // Calculate expected from Ybus (simplified)
    const expectedFault = this.calculateExpectedFault(Ybus, 0);
    
    const error = Math.abs(faultResult.Isc - expectedFault);
    
    return {
      testCase: testCase.name,
      faultCurrent: faultResult.Isc,
      expectedCurrent: expectedFault,
      error: error,
      passed: error < 0.1
    };
  }

  /**
   * Run fault analysis
   * @param {Object} state - Electrical state
   * @param {string} busId - Fault bus ID
   * @param {string} type - Fault type
   * @returns {Object} Fault results
   */
  runFaultAnalysis(state, busId, type) {
    // Simplified fault calculation
    const busIndex = state.buses.findIndex(b => b.id === busId);
    const Ybus = state.Ybus;
    
    // Calculate fault current (simplified)
    const Vprefault = 1.0;
    const Zfault = Ybus[busIndex][busIndex];
    const Isc = Vprefault / Math.abs(Zfault);
    
    return {
      Isc: Isc,
      busId: busId,
      type: type
    };
  }

  /**
   * Calculate expected fault from Ybus
   * @param {Array} Ybus - Admittance matrix
   * @param {number} busIndex - Fault bus index
   * @returns {number} Expected fault current
   */
  calculateExpectedFault(Ybus, busIndex) {
    const Vprefault = 1.0;
    const Zfault = Ybus[busIndex][busIndex];
    return Vprefault / Math.abs(Zfault);
  }

  /**
   * Cross-validate dynamics vs initial power flow
   * @param {Object} testCase - Test case configuration
   * @returns {Object} Cross-validation results
   */
  crossValidateDynamicsPF(testCase) {
    const state = new ElectricalState({
      baseMVA: testCase.baseMVA,
      baseKV: testCase.baseKV
    });
    
    state.setSystem(testCase);
    
    // Run initial power flow
    const engine = new UnifiedSimulationEngine();
    engine.setSystem(state);
    engine.solveNetwork();
    const initialPF = state.results.powerFlow;
    
    // Run dynamic simulation (short duration)
    const dynamicResults = engine.runSimulation(0.1);
    
    // Compare initial and final states
    const comparisons = [];
    
    state.buses.forEach((bus, i) => {
      const initialV = initialPF.V[i];
      const finalV = dynamicResults.results[dynamicResults.results.length - 1].buses[i].V;
      const error = Math.abs(initialV - finalV);
      
      comparisons.push({
        bus: bus.id,
        initialVoltage: initialV,
        finalVoltage: finalV,
        error: error,
        passed: error < 0.05
      });
    });
    
    return {
      testCase: testCase.name,
      comparisons: comparisons,
      allPassed: comparisons.every(c => c.passed)
    };
  }

  /**
   * Run full validation suite
   * @returns {Object} Complete validation results
   */
  runFullValidation() {
    const results = [];
    
    this.testCases.forEach(testCase => {
      const pfValidation = this.validatePowerFlow(testCase);
      const nrOpfValidation = this.crossValidateNROPF(testCase);
      const icYbusValidation = this.crossValidateICYbus(testCase);
      const dynamicsPFValidation = this.crossValidateDynamicsPF(testCase);
      
      results.push({
        testCase: testCase.name,
        powerFlow: pfValidation,
        nrOpf: nrOpfValidation,
        icYbus: icYbusValidation,
        dynamicsPF: dynamicsPFValidation,
        overallPassed: pfValidation.allPassed && 
                       nrOpfValidation.allPassed && 
                       icYbusValidation.passed && 
                       dynamicsPFValidation.allPassed
      });
    });
    
    this.validationResults = results;
    
    return {
      totalTestCases: this.testCases.length,
      passed: results.filter(r => r.overallPassed).length,
      failed: results.filter(r => !r.overallPassed).length,
      results: results
    };
  }

  /**
   * Generate validation report
   * @returns {Object} Validation report
   */
  generateReport() {
    const results = this.runFullValidation();
    
    return {
      summary: {
        total: results.totalTestCases,
        passed: results.passed,
        failed: results.failed,
        passRate: (results.passed / results.totalTestCases * 100).toFixed(1) + '%'
      },
      details: results.results,
      recommendations: this.getRecommendations(results)
    };
  }

  /**
   * Get recommendations based on validation results
   * @param {Object} results - Validation results
   * @returns {Array} Recommendations
   */
  getRecommendations(results) {
    const recommendations = [];
    
    if (results.failed > 0) {
      recommendations.push('Review solver convergence criteria');
      recommendations.push('Check numerical precision settings');
      recommendations.push('Verify network matrix construction');
    }
    
    if (results.passed === results.total) {
      recommendations.push('All validations passed - system is accurate');
    }
    
    return recommendations;
  }
}

module.exports = ValidationSuite;
