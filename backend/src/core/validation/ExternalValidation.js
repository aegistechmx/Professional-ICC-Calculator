/**
 * ExternalValidation - External Software Validation
 * 
 * This module validates simulation results against commercial software:
 * - ETAP
 * - DIgSILENT
 * - PowerWorld
 * 
 * Compares:
 * - Voltages
 * - Currents
 * - Trip times
 * 
 * This makes the simulation:
 * - Correct → Reliable → Professional
 * 
 * Architecture:
 * Reference Data → Simulation Results → Comparison → Validation Report
 * 
 * @class ExternalValidation
 */

class ExternalValidation {
  /**
   * Create a new external validation module
   * @param {Object} options - Validation options
   */
  constructor(options = {}) {
    this.options = {
      voltageTolerance: options.voltageTolerance || 0.01, // 1%
      currentTolerance: options.currentTolerance || 0.02, // 2%
      timeTolerance: options.timeTolerance || 0.01, // 10ms
      ...options
    };
  }

  /**
   * Validate against ETAP reference
   * @param {Object} simulationResults - Simulation results
   * @param {Object} etapReference - ETAP reference data
   * @returns {Object} Validation report
   */
  validateAgainstETAP(simulationResults, etapReference) {
    return this.validateAgainstReference(simulationResults, etapReference, 'ETAP');
  }

  /**
   * Validate against DIgSILENT reference
   * @param {Object} simulationResults - Simulation results
   * @param {Object} digsilentReference - DIgSILENT reference data
   * @returns {Object} Validation report
   */
  validateAgainstDIgSILENT(simulationResults, digsilentReference) {
    return this.validateAgainstReference(simulationResults, digsilentReference, 'DIgSILENT');
  }

  /**
   * Validate against PowerWorld reference
   * @param {Object} simulationResults - Simulation results
   * @param {Object} powerworldReference - PowerWorld reference data
   * @returns {Object} Validation report
   */
  validateAgainstPowerWorld(simulationResults, powerworldReference) {
    return this.validateAgainstReference(simulationResults, powerworldReference, 'PowerWorld');
  }

  /**
   * Validate against reference software
   * @param {Object} simulationResults - Simulation results
   * @param {Object} referenceData - Reference data
   * @param {string} softwareName - Software name
   * @returns {Object} Validation report
   */
  validateAgainstReference(simulationResults, referenceData, softwareName) {
    // Validate input data
    if (!simulationResults) {
      throw new Error('Simulation results are required. Received: ' + typeof simulationResults);
    }
    
    if (!referenceData) {
      throw new Error('Reference data are required. Received: ' + typeof referenceData);
    }
    
    if (!softwareName || typeof softwareName !== 'string') {
      throw new Error('Software name is required and must be a string. Received: ' + typeof softwareName);
    }
    
    const validation = {
      software: softwareName,
      timestamp: new Date().toISOString(),
      overallStatus: 'PASS',
      voltageComparison: null,
      currentComparison: null,
      tripTimeComparison: null,
      details: [],
      summary: null,
      errors: []
    };

    try {
      // Compare voltages
      if (simulationResults.voltages && referenceData.voltages) {
        validation.voltageComparison = this.compareVoltages(
          simulationResults.voltages,
          referenceData.voltages,
          referenceData.busIds
        );
      } else if (!simulationResults.voltages) {
        validation.errors.push('Simulation results missing voltage data');
      } else if (!referenceData.voltages) {
        validation.errors.push('Reference data missing voltage data');
      }

      // Compare currents
      if (simulationResults.currents && referenceData.currents) {
        validation.currentComparison = this.compareCurrents(
          simulationResults.currents,
          referenceData.currents,
          referenceData.lineIds
        );
      } else if (!simulationResults.currents) {
        validation.errors.push('Simulation results missing current data');
      } else if (!referenceData.currents) {
        validation.errors.push('Reference data missing current data');
      }

      // Compare trip times
      if (simulationResults.tripTimes && referenceData.tripTimes) {
        validation.tripTimeComparison = this.compareTripTimes(
          simulationResults.tripTimes,
          referenceData.tripTimes,
          referenceData.deviceIds
        );
      } else if (!simulationResults.tripTimes) {
        validation.errors.push('Simulation results missing trip time data');
      } else if (!referenceData.tripTimes) {
        validation.errors.push('Reference data missing trip time data');
      }
    } catch (error) {
      validation.errors.push('Error during comparison: ' + error.message);
      validation.overallStatus = 'ERROR';
    }

    // Determine overall status
    const failures = [];
    
    if (validation.voltageComparison && !validation.voltageComparison.passed) {
      failures.push('Voltage comparison failed');
    }
    
    if (validation.currentComparison && !validation.currentComparison.passed) {
      failures.push('Current comparison failed');
    }
    
    if (validation.tripTimeComparison && !validation.tripTimeComparison.passed) {
      failures.push('Trip time comparison failed');
    }
    
    if (validation.errors.length > 0) {
      validation.overallStatus = 'ERROR';
    } else if (failures.length > 0) {
      validation.overallStatus = 'FAIL';
    }
    
    validation.failures = failures;

    // Generate summary
    validation.summary = this.generateSummary(validation);

    return validation;
  }

  /**
   * Compare voltages
   * @param {Array} simVoltages - Simulation voltages
   * @param {Array} refVoltages - Reference voltages
   * @param {Array} busIds - Bus IDs
   * @returns {Object} Voltage comparison result
   */
  compareVoltages(simVoltages, refVoltages, busIds) {
    const differences = [];
    let maxDifference = 0;
    let passed = true;

    const minLen = Math.min(simVoltages.length, refVoltages.length);

    for (let i = 0; i < minLen; i++) {
      const simV = typeof simVoltages[i] === 'object' ?
        Math.sqrt(simVoltages[i].re ** 2 + simVoltages[i].im ** 2) : simVoltages[i];
      const refV = typeof refVoltages[i] === 'object' ?
        Math.sqrt(refVoltages[i].re ** 2 + refVoltages[i].im ** 2) : refVoltages[i];

      const diff = Math.abs(simV - refV);
      const diffPercent = (diff / refV) * 100;

      maxDifference = Math.max(maxDifference, diff);

      if (diffPercent > this.options.voltageTolerance * 100) {
        passed = false;
        differences.push({
          busId: busIds ? busIds[i] : `bus_${i}`,
          simulation: simV,
          reference: refV,
          difference: diff,
          differencePercent: diffPercent,
          tolerance: this.options.voltageTolerance * 100
        });
      }
    }

    return {
      passed,
      maxDifference,
      differences,
      tolerance: this.options.voltageTolerance * 100,
      busesCompared: minLen
    };
  }

  /**
   * Compare currents
   * @param {Array} simCurrents - Simulation currents
   * @param {Array} refCurrents - Reference currents
   * @param {Array} lineIds - Line IDs
   * @returns {Object} Current comparison result
   */
  compareCurrents(simCurrents, refCurrents, lineIds) {
    const differences = [];
    let maxDifference = 0;
    let passed = true;

    const minLen = Math.min(simCurrents.length, refCurrents.length);

    for (let i = 0; i < minLen; i++) {
      const simI = simCurrents[i];
      const refI = refCurrents[i];

      const diff = Math.abs(simI - refI);
      const diffPercent = refI > 0 ? (diff / refI) * 100 : 0;

      maxDifference = Math.max(maxDifference, diff);

      if (diffPercent > this.options.currentTolerance * 100) {
        passed = false;
        differences.push({
          lineId: lineIds ? lineIds[i] : `line_${i}`,
          simulation: simI,
          reference: refI,
          difference: diff,
          differencePercent: diffPercent,
          tolerance: this.options.currentTolerance * 100
        });
      }
    }

    return {
      passed,
      maxDifference,
      differences,
      tolerance: this.options.currentTolerance * 100,
      linesCompared: minLen
    };
  }

  /**
   * Compare trip times
   * @param {Array} simTripTimes - Simulation trip times
   * @param {Array} refTripTimes - Reference trip times
   * @param {Array} deviceIds - Device IDs
   * @returns {Object} Trip time comparison result
   */
  compareTripTimes(simTripTimes, refTripTimes, deviceIds) {
    const differences = [];
    let maxDifference = 0;
    let passed = true;

    const minLen = Math.min(simTripTimes.length, refTripTimes.length);

    for (let i = 0; i < minLen; i++) {
      const simT = simTripTimes[i];
      const refT = refTripTimes[i];

      const diff = Math.abs(simT - refT);

      maxDifference = Math.max(maxDifference, diff);

      if (diff > this.options.timeTolerance) {
        passed = false;
        differences.push({
          deviceId: deviceIds ? deviceIds[i] : `device_${i}`,
          simulation: simT,
          reference: refT,
          difference: diff,
          tolerance: this.options.timeTolerance
        });
      }
    }

    return {
      passed,
      maxDifference,
      differences,
      tolerance: this.options.timeTolerance,
      devicesCompared: minLen
    };
  }

  /**
   * Generate validation summary
   * @param {Object} validation - Validation result
   * @returns {Object} Summary
   */
  generateSummary(validation) {
    const summary = {
      overallStatus: validation.overallStatus,
      software: validation.software,
      timestamp: validation.timestamp
    };

    if (validation.voltageComparison) {
      summary.voltage = {
        status: validation.voltageComparison.passed ? 'PASS' : 'FAIL',
        maxDifference: validation.voltageComparison.maxDifference,
        busesCompared: validation.voltageComparison.busesCompared,
        violations: validation.voltageComparison.differences.length
      };
    }

    if (validation.currentComparison) {
      summary.current = {
        status: validation.currentComparison.passed ? 'PASS' : 'FAIL',
        maxDifference: validation.currentComparison.maxDifference,
        linesCompared: validation.currentComparison.linesCompared,
        violations: validation.currentComparison.differences.length
      };
    }

    if (validation.tripTimeComparison) {
      summary.tripTime = {
        status: validation.tripTimeComparison.passed ? 'PASS' : 'FAIL',
        maxDifference: validation.tripTimeComparison.maxDifference,
        devicesCompared: validation.tripTimeComparison.devicesCompared,
        violations: validation.tripTimeComparison.differences.length
      };
    }

    return summary;
  }

  /**
   * Import reference data from CSV
   * @param {string} csvData - CSV data string
   * @param {string} software - Software name
   * @returns {Object} Parsed reference data
   */
  importReferenceFromCSV(csvData, software) {
    const lines = csvData.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    const data = {
      software,
      busIds: [],
      voltages: [],
      lineIds: [],
      currents: [],
      deviceIds: [],
      tripTimes: []
    };
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      
      if (row.busId && row.voltage !== undefined) {
        data.busIds.push(row.busId);
        data.voltages.push(parseFloat(row.voltage));
      }
      
      if (row.lineId && row.current !== undefined) {
        data.lineIds.push(row.lineId);
        data.currents.push(parseFloat(row.current));
      }
      
      if (row.deviceId && row.tripTime !== undefined) {
        data.deviceIds.push(row.deviceId);
        data.tripTimes.push(parseFloat(row.tripTime));
      }
    }
    
    return data;
  }

  /**
   * Export validation report
   * @param {Object} validation - Validation result
   * @param {string} format - Export format ('json', 'csv')
   * @returns {string} Exported report
   */
  exportReport(validation, format = 'json') {
    switch (format) {
    case 'json':
      return JSON.stringify(validation, null, 2);
    case 'csv':
      return this.exportToCSV(validation);
    default:
      return JSON.stringify(validation, null, 2);
    }
  }

  /**
   * Export validation to CSV
   * @param {Object} validation - Validation result
   * @returns {string} CSV string
   */
  exportToCSV(validation) {
    const rows = [];
    
    // Header
    rows.push(['Software', 'Overall Status', 'Timestamp']);
    rows.push([validation.software, validation.overallStatus, validation.timestamp]);
    rows.push([]);
    
    // Voltage comparison
    if (validation.voltageComparison) {
      rows.push(['Voltage Comparison']);
      rows.push(['Status', 'Max Difference', 'Tolerance', 'Buses Compared', 'Violations']);
      rows.push([
        validation.voltageComparison.passed ? 'PASS' : 'FAIL',
        validation.voltageComparison.maxDifference.toFixed(6),
        validation.voltageComparison.tolerance.toFixed(2) + '%',
        validation.voltageComparison.busesCompared,
        validation.voltageComparison.differences.length
      ]);
      rows.push([]);
      
      // Voltage violations
      if (validation.voltageComparison.differences.length > 0) {
        rows.push(['Bus ID', 'Simulation', 'Reference', 'Difference (%)', 'Tolerance (%)']);
        validation.voltageComparison.differences.forEach(d => {
          rows.push([
            d.busId,
            d.simulation.toFixed(6),
            d.reference.toFixed(6),
            d.differencePercent.toFixed(2),
            d.tolerance.toFixed(2)
          ]);
        });
        rows.push([]);
      }
    }
    
    // Current comparison
    if (validation.currentComparison) {
      rows.push(['Current Comparison']);
      rows.push(['Status', 'Max Difference', 'Tolerance', 'Lines Compared', 'Violations']);
      rows.push([
        validation.currentComparison.passed ? 'PASS' : 'FAIL',
        validation.currentComparison.maxDifference.toFixed(6),
        validation.currentComparison.tolerance.toFixed(2) + '%',
        validation.currentComparison.linesCompared,
        validation.currentComparison.differences.length
      ]);
      rows.push([]);
      
      // Current violations
      if (validation.currentComparison.differences.length > 0) {
        rows.push(['Line ID', 'Simulation', 'Reference', 'Difference (%)', 'Tolerance (%)']);
        validation.currentComparison.differences.forEach(d => {
          rows.push([
            d.lineId,
            d.simulation.toFixed(6),
            d.reference.toFixed(6),
            d.differencePercent.toFixed(2),
            d.tolerance.toFixed(2)
          ]);
        });
        rows.push([]);
      }
    }
    
    // Trip time comparison
    if (validation.tripTimeComparison) {
      rows.push(['Trip Time Comparison']);
      rows.push(['Status', 'Max Difference', 'Tolerance', 'Devices Compared', 'Violations']);
      rows.push([
        validation.tripTimeComparison.passed ? 'PASS' : 'FAIL',
        validation.tripTimeComparison.maxDifference.toFixed(6),
        validation.tripTimeComparison.tolerance.toFixed(3),
        validation.tripTimeComparison.devicesCompared,
        validation.tripTimeComparison.differences.length
      ]);
      rows.push([]);
      
      // Trip time violations
      if (validation.tripTimeComparison.differences.length > 0) {
        rows.push(['Device ID', 'Simulation', 'Reference', 'Difference', 'Tolerance']);
        validation.tripTimeComparison.differences.forEach(d => {
          rows.push([
            d.deviceId,
            d.simulation.toFixed(3),
            d.reference.toFixed(3),
            d.difference.toFixed(3),
            d.tolerance.toFixed(3)
          ]);
        });
      }
    }
    
    return rows.map(r => r.join(',')).join('\n');
  }
}

module.exports = ExternalValidation;
