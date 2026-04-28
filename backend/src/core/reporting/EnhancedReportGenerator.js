/**
 * EnhancedReportGenerator - Advanced PDF Report Generation
 * 
 * This module implements enhanced PDF reporting with:
 * - Complete power flow results
 * - ICC by node
 * - TCC (Time-Current Characteristic) curves
 * - Event timeline
 * - Protection coordination analysis
 * 
 * Architecture:
 * Simulation Data → Report Generator → PDF → Download
 * 
 * @class EnhancedReportGenerator
 */

const logger = require('../../utils/logger');

class EnhancedReportGenerator {
  /**
   * Create a new report generator
   * @param {Object} options - Generator options
   * @param {string} options.format - Output format ('pdf', 'html')
   * @param {boolean} options.includeTCC - Include TCC curves
   * @param {boolean} options.includeEvents - Include event timeline
   */
  constructor(options = {}) {
    this.options = {
      format: options.format || 'pdf',
      includeTCC: options.includeTCC !== false,
      includeEvents: options.includeEvents !== false,
      ...options
    };
  }

  /**
   * Generate complete report
   * @param {Object} data - Report data
   * @returns {Object} Generated report
   */
  generateReport(data) {
    const report = {
      metadata: this.generateMetadata(data),
      summary: this.generateSummary(data),
      powerFlow: this.generatePowerFlowSection(data),
      iccByNode: this.generateICCSection(data),
      tccCurves: this.options.includeTCC ? this.generateTCCSection(data) : null,
      eventTimeline: this.options.includeEvents ? this.generateEventSection(data) : null,
      protection: this.generateProtectionSection(data),
      recommendations: this.generateRecommendations(data)
    };
    
    return report;
  }

  /**
   * Generate report metadata
   * @param {Object} data - Report data
   * @returns {Object} Metadata
   */
  generateMetadata(data) {
    return {
      title: 'Power System Analysis Report',
      generatedAt: new Date().toISOString(),
      version: '2.0',
      systemName: data.systemName || 'System',
      analyst: data.analyst || 'ICC Calculator',
      software: 'Professional ICC Calculator'
    };
  }

  /**
   * Generate executive summary
   * @param {Object} data - Report data
   * @returns {Object} Summary
   */
  generateSummary(data) {
    const summary = {
      totalBuses: data.buses ? data.buses.length : 0,
      totalLines: data.lines ? data.lines.length : 0,
      totalTransformers: data.trafos ? data.trafos.length : 0,
      totalLoads: data.loads ? data.loads.length : 0,
      totalGenerators: data.generators ? data.generators.length : 0,
      maxVoltage: this.calculateMaxVoltage(data),
      minVoltage: this.calculateMinVoltage(data),
      maxCurrent: this.calculateMaxCurrent(data),
      totalPowerLoss: data.powerFlowResults ? data.powerFlowResults.system.P_loss : 0,
      status: 'Normal'
    };
    
    // Determine system status
    if (summary.minVoltage < 0.9) {
      summary.status = 'Undervoltage';
    } else if (summary.maxVoltage > 1.1) {
      summary.status = 'Overvoltage';
    }
    
    return summary;
  }

  /**
   * Generate power flow section
   * @param {Object} data - Report data
   * @returns {Object} Power flow section
   */
  generatePowerFlowSection(data) {
    if (!data.powerFlowResults) {
      return { available: false };
    }
    
    const pf = data.powerFlowResults;
    
    return {
      available: true,
      converged: pf.converged,
      iterations: pf.iterations,
      maxError: pf.maxError,
      buses: pf.buses.map(bus => ({
        id: bus.id,
        type: bus.type,
        voltage: bus.V_kV || bus.V_pu,
        angle: bus.theta_deg || bus.theta_rad,
        activePower: bus.P_MW || bus.P_pu,
        reactivePower: bus.Q_MVAR || bus.Q_pu,
        status: this.getBusStatus(bus)
      })),
      lines: pf.lines ? pf.lines.map(line => ({
        id: line.id,
        from: line.from,
        to: line.to,
        powerFlow: line.P_flow,
        reactiveFlow: line.Q_flow,
        current: line.I_flow,
        loading: this.calculateLineLoading(line)
      })) : [],
      losses: {
        active: pf.system.P_loss_MW || pf.system.P_loss,
        reactive: pf.system.Q_loss_MVAR || pf.system.Q_loss
      }
    };
  }

  /**
   * Generate ICC by node section
   * @param {Object} data - Report data
   * @returns {Object} ICC section
   */
  generateICCSection(data) {
    if (!data.iccResults) {
      return { available: false };
    }
    
    const icc = data.iccResults;
    
    return {
      available: true,
      nodes: icc.nodes ? icc.nodes.map(node => ({
        id: node.id,
        threePhase: node.I3p || node.I_3ph,
        phaseToPhase: node.Ipp || node.I_pp,
        phaseToGround: node.Ipg || node.I_pg,
        X_R_ratio: node.XR || node.X_R,
        faultImpedance: node.Zf || node.Z_fault
      })) : [],
      summary: {
        maxThreePhase: this.calculateMaxICC(icc, 'threePhase'),
        maxPhaseToGround: this.calculateMaxICC(icc, 'phaseToGround'),
        averageX_R: this.calculateAverageXR(icc)
      }
    };
  }

  /**
   * Generate TCC curves section
   * @param {Object} data - Report data
   * @returns {Object} TCC section
   */
  generateTCCSection(data) {
    if (!data.protectionResults || !data.protectionResults.tccCurves) {
      return { available: false };
    }
    
    const tcc = data.protectionResults.tccCurves;
    
    return {
      available: true,
      devices: tcc.devices ? tcc.devices.map(device => ({
        id: device.id,
        type: device.type,
        location: device.location,
        curve: device.curve,
        pickup: device.pickup,
        timeDelay: device.timeDelay,
        tms: device.TMS,
        coordination: device.coordination || 'OK'
      })) : [],
      curves: tcc.curves || [],
      coordination: {
        status: tcc.coordinationStatus || 'OK',
        issues: tcc.coordinationIssues || []
      }
    };
  }

  /**
   * Generate event timeline section
   * @param {Object} data - Report data
   * @returns {Object} Event section
   */
  generateEventSection(data) {
    if (!data.eventTimeline) {
      return { available: false };
    }
    
    const events = data.eventTimeline;
    
    return {
      available: true,
      duration: events.duration || 0,
      timeSteps: events.timeSteps || 0,
      events: events.events ? events.events.map(event => ({
        time: event.time,
        type: event.type,
        description: event.description,
        affected: event.affected || [],
        severity: event.severity || 'info'
      })) : [],
      timeline: this.generateTimeline(events)
    };
  }

  /**
   * Generate protection section
   * @param {Object} data - Report data
   * @returns {Object} Protection section
   */
  generateProtectionSection(data) {
    if (!data.protectionResults) {
      return { available: false };
    }
    
    const prot = data.protectionResults;
    
    return {
      available: true,
      devices: prot.devices ? prot.devices.map(device => ({
        id: device.id,
        type: device.type,
        location: device.location,
        settings: device.settings,
        status: device.status || 'OK',
        lastTrip: device.lastTrip || null
      })) : [],
      coordination: prot.coordination || {
        status: 'OK',
        selectivityMatrix: prot.selectivityMatrix || []
      },
      recommendations: prot.recommendations || []
    };
  }

  /**
   * Generate recommendations
   * @param {Object} data - Report data
   * @returns {Array} Recommendations
   */
  generateRecommendations(data) {
    const recommendations = [];
    
    // Check voltages
    if (data.powerFlowResults) {
      data.powerFlowResults.buses.forEach(bus => {
        const V = bus.V_pu || bus.V_kV;
        if (V < 0.9) {
          recommendations.push({
            type: 'voltage',
            severity: 'warning',
            message: `Undervoltage at bus ${bus.id}: ${V.toFixed(3)} pu`,
            suggestion: 'Consider adding capacitor banks or adjusting transformer taps'
          });
        } else if (V > 1.1) {
          recommendations.push({
            type: 'voltage',
            severity: 'warning',
            message: `Overvoltage at bus ${bus.id}: ${V.toFixed(3)} pu`,
            suggestion: 'Consider adjusting transformer taps or adding reactive compensation'
          });
        }
      });
    }
    
    // Check ICC levels
    if (data.iccResults && data.iccResults.nodes) {
      data.iccResults.nodes.forEach(node => {
        const I3p = node.I3p || node.I_3ph;
        if (I3p > 50) { // High fault current threshold
          recommendations.push({
            type: 'fault',
            severity: 'danger',
            message: `High fault current at node ${node.id}: ${I3p.toFixed(2)} kA`,
            suggestion: 'Consider current limiting reactors or verify equipment ratings'
          });
        }
      });
    }
    
    // Check protection coordination
    if (data.protectionResults && data.protectionResults.coordination) {
      if (data.protectionResults.coordination.status !== 'OK') {
        recommendations.push({
          type: 'protection',
          severity: 'warning',
          message: 'Protection coordination issues detected',
          suggestion: 'Review protection settings and TCC curves'
        });
      }
    }
    
    return recommendations;
  }

  /**
   * Generate timeline visualization
   * @param {Object} events - Event timeline data
   * @returns {Array} Timeline data
   */
  generateTimeline(events) {
    if (!events.events) return [];
    
    return events.events.map(event => ({
      time: event.time,
      label: event.type,
      description: event.description,
      severity: event.severity || 'info'
    })).sort((a, b) => a.time - b.time);
  }

  /**
   * Calculate maximum voltage
   * @param {Object} data - Report data
   * @returns {number} Maximum voltage (pu)
   */
  calculateMaxVoltage(data) {
    if (!data.powerFlowResults || !data.powerFlowResults.buses) return 0;
    
    return Math.max(...data.powerFlowResults.buses.map(b => b.V_pu || b.V_kV || 1.0));
  }

  /**
   * Calculate minimum voltage
   * @param {Object} data - Report data
   * @returns {number} Minimum voltage (pu)
   */
  calculateMinVoltage(data) {
    if (!data.powerFlowResults || !data.powerFlowResults.buses) return 0;
    
    return Math.min(...data.powerFlowResults.buses.map(b => b.V_pu || b.V_kV || 1.0));
  }

  /**
   * Calculate maximum current
   * @param {Object} data - Report data
   * @returns {number} Maximum current (A)
   */
  calculateMaxCurrent(data) {
    if (!data.powerFlowResults || !data.powerFlowResults.lines) return 0;
    
    return Math.max(...data.powerFlowResults.lines.map(l => l.I_flow || 0));
  }

  /**
   * Get bus status
   * @param {Object} bus - Bus data
   * @returns {string} Bus status
   */
  getBusStatus(bus) {
    const V = bus.V_pu || bus.V_kV || 1.0;
    
    if (V < 0.9) return 'Undervoltage';
    if (V > 1.1) return 'Overvoltage';
    return 'Normal';
  }

  /**
   * Calculate line loading
   * @param {Object} line - Line data
   * @returns {number} Loading percentage
   */
  calculateLineLoading(line) {
    if (!line.I_flow || !line.rating) return 0;
    return (line.I_flow / line.rating) * 100;
  }

  /**
   * Calculate maximum ICC
   * @param {Object} icc - ICC data
   * @param {string} type - ICC type
   * @returns {number} Maximum ICC
   */
  calculateMaxICC(icc, type) {
    if (!icc.nodes) return 0;
    
    return Math.max(...icc.nodes.map(node => node[type] || 0));
  }

  /**
   * Calculate average X/R ratio
   * @param {Object} icc - ICC data
   * @returns {number} Average X/R ratio
   */
  calculateAverageXR(icc) {
    if (!icc.nodes || icc.nodes.length === 0) return 0;
    
    const sum = icc.nodes.reduce((total, node) => total + (node.XR || node.X_R || 0), 0);
    return sum / icc.nodes.length;
  }

  /**
   * Export report to PDF (placeholder for actual PDF generation)
   * @param {Object} report - Report data
   * @returns {Buffer} PDF buffer
   */
  exportToPDF(report) {
    // In production, this would use a PDF library like pdfkit or jsPDF
    logger.debug('PDF generation would be implemented here');
    return Buffer.from('PDF placeholder');
  }

  /**
   * Export report to HTML
   * @param {Object} report - Report data
   * @returns {string} HTML string
   */
  exportToHTML(report) {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>${report.metadata.title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; }
    h2 { color: #666; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .status-normal { color: green; }
    .status-warning { color: orange; }
    .status-danger { color: red; }
  </style>
</head>
<body>
  <h1>${report.metadata.title}</h1>
  <p>Generated: ${report.metadata.generatedAt}</p>
  <p>System: ${report.metadata.systemName}</p>
  
  <h2>Executive Summary</h2>
  <table>
    <tr><th>Total Buses</th><td>${report.summary.totalBuses}</td></tr>
    <tr><th>Total Lines</th><td>${report.summary.totalLines}</td></tr>
    <tr><th>Max Voltage</th><td>${report.summary.maxVoltage.toFixed(3)} pu</td></tr>
    <tr><th>Min Voltage</th><td>${report.summary.minVoltage.toFixed(3)} pu</td></tr>
    <tr><th>Status</th><td>${report.summary.status}</td></tr>
  </table>
  
  ${report.powerFlow.available ? `
  <h2>Power Flow Results</h2>
  <p>Converged: ${report.powerFlow.converged}</p>
  <p>Iterations: ${report.powerFlow.iterations}</p>
  ` : ''}
  
  ${report.iccByNode.available ? `
  <h2>ICC by Node</h2>
  <table>
    <tr><th>Node</th><th>3-Phase (kA)</th><th>Phase-Ground (kA)</th><th>X/R</th></tr>
    ${report.iccByNode.nodes.map(node => `
      <tr>
        <td>${node.id}</td>
        <td>${node.threePhase.toFixed(2)}</td>
        <td>${node.phaseToGround.toFixed(2)}</td>
        <td>${node.X_R_ratio.toFixed(2)}</td>
      </tr>
    `).join('')}
  </table>
  ` : ''}
  
  ${report.recommendations.length > 0 ? `
  <h2>Recommendations</h2>
  <ul>
    ${report.recommendations.map(rec => `
      <li class="status-${rec.severity}">${rec.message}</li>
    `).join('')}
  </ul>
  ` : ''}
</body>
</html>
    `;
  }
}

module.exports = EnhancedReportGenerator;
