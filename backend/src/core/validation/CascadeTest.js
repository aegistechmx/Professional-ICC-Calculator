/**
 * CascadeTest - Cascading Failure Testing Module
 * 
 * This module implements cascading failure testing:
 * - Fault → Trip → Redistribution → New Fault
 * - Sequential fault simulation
 * - Protection coordination validation
 * - System resilience assessment
 * 
 * Architecture:
 * Fault Event → Protection Trip → Load Redistribution → New Fault → Cascade Analysis
 * 
 * @class CascadeTest
 */

class CascadeTest {
  /**
   * Create a new cascade test
   * @param {Object} options - Test options
   */
  constructor(options = {}) {
    this.options = {
      maxCascadeSteps: options.maxCascadeSteps || 5,
      ...options
    };
    
    this.results = {
      cascadeSteps: [],
      finalState: null,
      overallStable: true
    };
  }

  /**
   * Run cascading failure simulation
   * @param {Object} system - ElectricalSystem
   * @param {Object} engines - Simulation engines
   * @param {Object} initialFault - Initial fault
   * @returns {Object} Cascade simulation results
   */
  runCascadeSimulation(system, engines, initialFault) {
    const cascadeSteps = [];
    let currentSystem = system;
    let currentFault = initialFault;
    let step = 0;
    let overallStable = true;
    
    while (step < this.options.maxCascadeSteps && overallStable) {
      step++;
      
      // Run fault analysis
      const faultResult = engines.fault ? engines.fault.calculate(currentFault) : null;
      
      // Check protection trip
      const protectionResult = this.evaluateProtection(currentSystem, currentFault, faultResult);
      
      if (!protectionResult.trip) {
        // No trip, cascade stops
        cascadeSteps.push({
          step,
          fault: currentFault,
          trip: false,
          message: 'No protection trip, cascade stopped'
        });
        break;
      }
      
      // Apply protection trip (open line/breaker)
      const trippedElement = protectionResult.trippedElement;
      const postTripSystem = this.applyTrip(currentSystem, trippedElement);
      
      // Run power flow after trip
      const pfResult = engines.powerFlow ? engines.powerFlow.run(postTripSystem) : null;
      
      // Check stability after redistribution
      const stable = pfResult ? pfResult.converged && this.checkVoltageStability(pfResult) : false;
      
      // Check for new fault (overload, under/over voltage)
      const newFault = this.detectNewFault(postTripSystem, pfResult);
      
      cascadeSteps.push({
        step,
        fault: currentFault,
        trip: true,
        trippedElement,
        postTripStable: stable,
        newFault: newFault !== null,
        nextFault: newFault
      });
      
      // Update for next iteration
      currentSystem = postTripSystem;
      currentFault = newFault;
      overallStable = stable && newFault !== null;
      
      if (!stable) {
        overallStable = false;
        break;
      }
      
      if (newFault === null) {
        // No new fault, cascade stopped
        break;
      }
    }
    
    this.results.cascadeSteps = cascadeSteps;
    this.results.finalState = {
      system: currentSystem,
      stable: overallStable,
      totalSteps: cascadeSteps.length
    };
    this.results.overallStable = overallStable;
    
    return {
      cascadeSteps,
      finalState: this.results.finalState,
      overallStable
    };
  }

  /**
   * Evaluate protection response to fault
   * @param {Object} system - ElectricalSystem
   * @param {Object} fault - Fault
   * @param {Object} faultResult - Fault analysis result
   * @returns {Object} Protection evaluation result
   */
  evaluateProtection(system, fault, faultResult) {
    // Simplified protection evaluation
    // In real implementation, this would use LSIGBreaker or similar
    
    const faultCurrent = faultResult ? faultResult.current || 1000 : 1000;
    const ratedCurrent = 100;
    const current_pu = faultCurrent / ratedCurrent;
    
    // Check if current exceeds pickup
    const pickup = 6.0; // pu
    const trip = current_pu >= pickup;
    
    // Determine which element trips
    const trippedElement = trip ? {
      type: 'line',
      id: fault.busId + '_line',
      from: fault.busId,
      to: system.buses.find(b => b.id !== fault.busId)?.id || 'bus_1'
    } : null;
    
    return {
      trip,
      trippedElement,
      current_pu,
      pickup
    };
  }

  /**
   * Apply protection trip to system
   * @param {Object} system - ElectricalSystem
   * @param {Object} trippedElement - Tripped element
   * @returns {Object} Modified system
   */
  applyTrip(system, trippedElement) {
    if (!trippedElement) return system;
    
    // Clone system
    const { ElectricalSystem } = require('../electrical/ElectricalSystem');
    const modifiedSystem = new ElectricalSystem();
    
    // Add buses
    system.buses.forEach(bus => {
      modifiedSystem.addBus({ ...bus });
    });
    
    // Add lines (except tripped line)
    system.lines.forEach(line => {
      if (line.id !== trippedElement.id) {
        modifiedSystem.addLine({ ...line });
      }
    });
    
    return modifiedSystem;
  }

  /**
   * Check voltage stability
   * @param {Object} pfResult - Power flow result
   * @returns {boolean} True if voltages are stable
   */
  checkVoltageStability(pfResult) {
    if (!pfResult.voltages) return false;
    
    return pfResult.voltages.every(v => {
      const mag = typeof v === 'object' ? Math.sqrt(v.re * v.re + v.im * v.im) : v;
      return mag > 0.85 && mag < 1.15;
    });
  }

  /**
   * Detect new fault conditions
   * @param {Object} system - ElectricalSystem
   * @param {Object} pfResult - Power flow result
   * @returns {Object|null} New fault or null
   */
  detectNewFault(system, pfResult) {
    if (!pfResult.voltages) return null;
    
    // Check for undervoltage
    for (let i = 0; i < pfResult.voltages.length; i++) {
      const v = pfResult.voltages[i];
      const mag = typeof v === 'object' ? Math.sqrt(v.re * v.re + v.im * v.im) : v;
      
      if (mag < 0.9) {
        return {
          type: 'undervoltage',
          busId: system.buses[i].id,
          voltage: mag
        };
      }
      
      if (mag > 1.1) {
        return {
          type: 'overvoltage',
          busId: system.buses[i].id,
          voltage: mag
        };
      }
    }
    
    // Check for line overload
    if (pfResult.lineFlows) {
      for (let i = 0; i < pfResult.lineFlows.length; i++) {
        const flow = pfResult.lineFlows[i];
        const line = system.lines[i];
        if (flow > line.rating * 1.2) {
          return {
            type: 'overload',
            lineId: line.id,
            flow,
            rating: line.rating
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Generate cascade test report
   * @param {Object} results - Cascade simulation results
   * @returns {Object} Formatted report
   */
  generateReport(results) {
    return {
      title: 'Cascading Failure Test Report',
      timestamp: new Date().toISOString(),
      cascadeSteps: results.cascadeSteps,
      finalState: results.finalState,
      overallStable: results.overallStable,
      recommendations: this.generateRecommendations(results)
    };
  }

  /**
   * Generate recommendations based on cascade results
   * @param {Object} results - Cascade simulation results
   * @returns {Array} Recommendations
   */
  generateRecommendations(results) {
    const recommendations = [];
    
    if (!results.overallStable) {
      recommendations.push({
        type: 'stability',
        severity: 'error',
        message: 'System experienced cascading failure',
        suggestion: 'Implement automatic load shedding and islanding schemes to prevent cascade'
      });
    }
    
    if (results.finalState && results.finalState.totalSteps > 3) {
      recommendations.push({
        type: 'protection',
        severity: 'warning',
        message: `Cascade continued for ${results.finalState.totalSteps} steps`,
        suggestion: 'Review protection coordination to limit cascade propagation'
      });
    }
    
    const overloadSteps = results.cascadeSteps.filter(s => s.nextFault && s.nextFault.type === 'overload');
    if (overloadSteps.length > 0) {
      recommendations.push({
        type: 'overload',
        severity: 'warning',
        message: 'Overload conditions triggered cascade',
        suggestion: 'Implement automatic generation re-dispatch and load transfer'
      });
    }
    
    return recommendations;
  }
}

module.exports = CascadeTest;
