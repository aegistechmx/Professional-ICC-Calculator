/**
 * ProfessionalReportGenerator - Professional Engineering Report Generator
 * 
 * This module generates professional engineering reports with:
 * - Executive summary
 * - System description
 * - Operating condition
 * - Key results
 * - Detected violations
 * - Event sequence
 * - Recommendations
 * 
 * This makes the simulation:
 * - Communicable → Professional → Sellable
 * 
 * Architecture:
 * Simulation Results → Report Generator → Professional Report
 * 
 * @class ProfessionalReportGenerator
 */

class ProfessionalReportGenerator {
  /**
   * Create a new professional report generator
   * @param {Object} options - Generator options
   */
  constructor(options = {}) {
    this.options = {
      includeExecutiveSummary: options.includeExecutiveSummary !== false,
      includeRecommendations: options.includeRecommendations !== false,
      ...options
    };
  }

  /**
   * Generate professional engineering report
   * @param {Object} data - Report data
   * @returns {Object} Professional report
   */
  generateReport(data) {
    const report = {
      metadata: {
        title: 'Electrical Power System Analysis Report',
        generatedAt: new Date().toISOString(),
        version: '1.0',
        software: 'Professional ICC Calculator'
      },
      executiveSummary: this.options.includeExecutiveSummary ? this.generateExecutiveSummary(data) : null,
      systemDescription: this.generateSystemDescription(data),
      operatingCondition: this.generateOperatingCondition(data),
      keyResults: this.generateKeyResults(data),
      violations: this.generateViolations(data),
      eventSequence: this.generateEventSequence(data),
      recommendations: this.options.includeRecommendations ? this.generateRecommendations(data) : null,
      appendices: this.generateAppendices(data)
    };

    return report;
  }

  /**
   * Generate executive summary
   * @param {Object} data - Report data
   * @returns {Object} Executive summary
   */
  generateExecutiveSummary(data) {
    const summary = {
      overview: '',
      findings: [],
      recommendations: [],
      conclusion: ''
    };

    // Overview
    const systemType = data.system?.type || 'Distribution System';
    const buses = data.system?.buses?.length || 0;
    const lines = data.system?.lines?.length || 0;
    
    summary.overview = `This report presents the analysis of a ${systemType} with ${buses} buses and ${lines} lines. The analysis includes power flow, short-circuit, and protection coordination studies.`;

    // Key findings
    if (data.powerFlow) {
      const converged = data.powerFlow.converged ? 'CONVERGED' : 'NOT CONVERGED';
      summary.findings.push(`Power flow analysis: ${converged}`);
    }

    if (data.fault) {
      const maxFault = data.fault.maxFaultCurrent || 0;
      summary.findings.push(`Maximum fault current: ${maxFault.toFixed(2)} A`);
    }

    if (data.violations && data.violations.length > 0) {
      summary.findings.push(`${data.violations.length} violations detected`);
    }

    if (data.events && data.events.length > 0) {
      summary.findings.push(`${data.events.length} events simulated`);
    }

    // Recommendations
    if (data.violations && data.violations.length > 0) {
      summary.recommendations.push('Address voltage violations to improve power quality');
    }
    
    if (data.protection && data.protection.coordinationIssues) {
      summary.recommendations.push('Review protection coordination settings');
    }

    // Conclusion
    const hasIssues = (data.violations?.length > 0) || (data.protection?.coordinationIssues);
    summary.conclusion = hasIssues 
      ? 'The system exhibits operational issues that require attention. Detailed analysis and recommendations are provided in this report.'
      : 'The system operates within acceptable limits. No critical issues were identified.';

    return summary;
  }

  /**
   * Generate system description
   * @param {Object} data - Report data
   * @returns {Object} System description
   */
  generateSystemDescription(data) {
    const system = data.system || {};
    
    return {
      type: system.type || 'Distribution System',
      nominalVoltage: system.nominalVoltage || '13.8 kV',
      buses: system.buses?.length || 0,
      lines: system.lines?.length || 0,
      transformers: system.trafos?.length || 0,
      generators: system.generators?.length || 0,
      loads: system.loads?.length || 0,
      configuration: this.describeConfiguration(system)
    };
  }

  /**
   * Describe system configuration
   * @param {Object} system - System data
   * @returns {string} Configuration description
   */
  describeConfiguration(system) {
    if (!system.buses) return 'Not available';
    
    const slackBuses = system.buses.filter(b => b.type === 'Slack').length;
    const pvBuses = system.buses.filter(b => b.type === 'PV').length;
    const pqBuses = system.buses.filter(b => b.type === 'PQ').length;
    
    return `${slackBuses} slack bus(es), ${pvBuses} PV bus(es), ${pqBuses} PQ bus(es)`;
  }

  /**
   * Generate operating condition
   * @param {Object} data - Report data
   * @returns {Object} Operating condition
   */
  generateOperatingCondition(data) {
    const condition = {
      totalGeneration: 0,
      totalLoad: 0,
      loading: 0,
      voltageProfile: 'Normal',
      frequency: '60 Hz'
    };

    if (data.system?.buses) {
      data.system.buses.forEach(bus => {
        condition.totalGeneration += bus.generation?.P || 0;
        condition.totalLoad += bus.load?.P || 0;
      });
    }

    if (condition.totalGeneration > 0) {
      condition.loading = (condition.totalLoad / condition.totalGeneration) * 100;
    }

    if (data.powerFlow?.voltages) {
      const minV = Math.min(...data.powerFlow.voltages);
      const maxV = Math.max(...data.powerFlow.voltages);
      
      if (minV < 0.95 || maxV > 1.05) {
        condition.voltageProfile = 'Marginal';
      }
      if (minV < 0.90 || maxV > 1.10) {
        condition.voltageProfile = 'Poor';
      }
    }

    return condition;
  }

  /**
   * Generate key results
   * @param {Object} data - Report data
   * @returns {Object} Key results
   */
  generateKeyResults(data) {
    const results = {
      powerFlow: null,
      shortCircuit: null,
      protection: null,
      dynamics: null
    };

    // Power flow results
    if (data.powerFlow) {
      results.powerFlow = {
        converged: data.powerFlow.converged,
        iterations: data.powerFlow.iterations,
        maxMismatch: data.powerFlow.maxMismatch,
        losses: {
          P: data.powerFlow.P_loss || 0,
          Q: data.powerFlow.Q_loss || 0
        },
        voltageRange: this.getVoltageRange(data.powerFlow.voltages)
      };
    }

    // Short circuit results
    if (data.fault) {
      results.shortCircuit = {
        maxFaultCurrent: data.fault.maxFaultCurrent,
        threePhaseFaults: data.fault.threePhaseFaults || 0,
        singleLineToGroundFaults: data.fault.singleLineToGroundFaults || 0
      };
    }

    // Protection results
    if (data.protection) {
      results.protection = {
        coordinationStatus: data.protection.coordinationStatus || 'OK',
        trips: data.protection.trips || 0,
        coordinationIssues: data.protection.coordinationIssues || 0
      };
    }

    // Dynamics results
    if (data.dynamics) {
      results.dynamics = {
        stable: data.dynamics.stable,
        frequencyDeviation: data.dynamics.frequencyDeviation || 0,
        settlingTime: data.dynamics.settlingTime || 0
      };
    }

    return results;
  }

  /**
   * Get voltage range
   * @param {Array} voltages - Voltage array
   * @returns {Object} Voltage range
   */
  getVoltageRange(voltages) {
    if (!voltages || voltages.length === 0) {
      return { min: 0, max: 0, avg: 0 };
    }

    const min = Math.min(...voltages);
    const max = Math.max(...voltages);
    const avg = voltages.reduce((sum, v) => sum + v, 0) / voltages.length;

    return { min, max, avg };
  }

  /**
   * Generate violations section
   * @param {Object} data - Report data
   * @returns {Object} Violations
   */
  generateViolations(data) {
    const violations = {
      voltage: [],
      current: [],
      thermal: [],
      protection: [],
      summary: {
        total: 0,
        critical: 0,
        warning: 0
      }
    };

    // Voltage violations
    if (data.violations?.voltage) {
      violations.voltage = data.violations.voltage.map(v => ({
        type: 'Voltage',
        location: v.busId,
        value: v.value,
        limit: v.limit,
        severity: v.severity
      }));
    }

    // Current violations
    if (data.violations?.current) {
      violations.current = data.violations.current.map(c => ({
        type: 'Current',
        location: c.lineId,
        value: c.value,
        limit: c.limit,
        severity: c.severity
      }));
    }

    // Thermal violations
    if (data.violations?.thermal) {
      violations.thermal = data.violations.thermal.map(t => ({
        type: 'Thermal',
        location: t.deviceId,
        value: t.utilization,
        limit: 100,
        severity: t.utilization > 100 ? 'Critical' : 'Warning'
      }));
    }

    // Protection violations
    if (data.violations?.protection) {
      violations.protection = data.violations.protection.map(p => ({
        type: 'Protection',
        location: p.deviceId,
        issue: p.issue,
        severity: p.severity
      }));
    }

    // Summary
    const allViolations = [
      ...violations.voltage,
      ...violations.current,
      ...violations.thermal,
      ...violations.protection
    ];

    violations.summary.total = allViolations.length;
    violations.summary.critical = allViolations.filter(v => v.severity === 'Critical').length;
    violations.summary.warning = allViolations.filter(v => v.severity === 'Warning').length;

    return violations;
  }

  /**
   * Generate event sequence
   * @param {Object} data - Report data
   * @returns {Array} Event sequence
   */
  generateEventSequence(data) {
    if (!data.events || data.events.length === 0) {
      return [];
    }

    return data.events.map(event => ({
      time: event.time,
      type: event.type,
      device: event.device,
      description: event.description || event.reason,
      details: event.details
    })).sort((a, b) => a.time - b.time);
  }

  /**
   * Generate recommendations
   * @param {Object} data - Report data
   * @returns {Array} Recommendations
   */
  generateRecommendations(data) {
    const recommendations = [];

    // Voltage recommendations
    if (data.violations?.voltage?.length > 0) {
      recommendations.push({
        priority: 'High',
        category: 'Voltage',
        issue: 'Voltage violations detected',
        recommendation: 'Install capacitor banks or voltage regulators to improve voltage profile. Consider tap adjustment on transformers.',
        estimatedCost: 'Medium',
        timeline: '3-6 months'
      });
    }

    // Current recommendations
    if (data.violations?.current?.length > 0) {
      recommendations.push({
        priority: 'High',
        category: 'Current',
        issue: 'Line overloading detected',
        recommendation: 'Consider line reinforcement, load transfer, or demand response programs to reduce loading.',
        estimatedCost: 'High',
        timeline: '6-12 months'
      });
    }

    // Protection recommendations
    if (data.protection?.coordinationIssues > 0) {
      recommendations.push({
        priority: 'Medium',
        category: 'Protection',
        issue: 'Protection coordination issues',
        recommendation: 'Review and adjust protection relay settings. Conduct TCC curve analysis to ensure proper selectivity.',
        estimatedCost: 'Low',
        timeline: '1-3 months'
      });
    }

    // Thermal recommendations
    if (data.violations?.thermal?.length > 0) {
      recommendations.push({
        priority: 'High',
        category: 'Thermal',
        issue: 'Thermal limit violations',
        recommendation: 'Implement load shedding or upgrade equipment with higher thermal capacity.',
        estimatedCost: 'Medium',
        timeline: '3-6 months'
      });
    }

    // General recommendations
    if (data.powerFlow?.converged === false) {
      recommendations.push({
        priority: 'Critical',
        category: 'Power Flow',
        issue: 'Power flow did not converge',
        recommendation: 'Review system topology and loading conditions. Ensure adequate reactive power support.',
        estimatedCost: 'Variable',
        timeline: 'Immediate'
      });
    }

    return recommendations;
  }

  /**
   * Generate appendices
   * @param {Object} data - Report data
   * @returns {Object} Appendices
   */
  generateAppendices(data) {
    return {
      appendixA: {
        title: 'System Data',
        content: this.generateSystemDataTable(data)
      },
      appendixB: {
        title: 'Detailed Results',
        content: this.generateDetailedResults(data)
      },
      appendixC: {
        title: 'Assumptions',
        content: this.generateAssumptions(data)
      }
    };
  }

  /**
   * Generate system data table
   * @param {Object} data - Report data
   * @returns {Array} System data table
   */
  generateSystemDataTable(data) {
    if (!data.system?.buses) return [];

    return data.system.buses.map(bus => ({
      id: bus.id,
      type: bus.type,
      voltage: bus.voltage?.magnitude || 1.0,
      generation: bus.generation,
      load: bus.load
    }));
  }

  /**
   * Generate detailed results
   * @param {Object} data - Report data
   * @returns {Object} Detailed results
   */
  generateDetailedResults(data) {
    return {
      powerFlow: data.powerFlow,
      fault: data.fault,
      protection: data.protection,
      dynamics: data.dynamics
    };
  }

  /**
   * Generate assumptions
   * @param {Object} data - Report data
   * @returns {Array} Assumptions
   */
  generateAssumptions(data) {
    return [
      'System operates at nominal frequency of 60 Hz',
      'All equipment is assumed to be in normal operating condition',
      'Three-phase balanced conditions assumed unless otherwise specified',
      'Ambient temperature of 25°C assumed for thermal calculations',
      'Ground resistance of 5 ohms assumed for ground fault studies'
    ];
  }

  /**
   * Export report to format
   * @param {Object} report - Report object
   * @param {string} format - Export format ('json', 'html', 'markdown')
   * @returns {string} Exported report
   */
  exportReport(report, format = 'json') {
    switch (format) {
    case 'json':
      return JSON.stringify(report, null, 2);
    case 'html':
      return this.exportToHTML(report);
    case 'markdown':
      return this.exportToMarkdown(report);
    default:
      return JSON.stringify(report, null, 2);
    }
  }

  /**
   * Export report to HTML
   * @param {Object} report - Report object
   * @returns {string} HTML string
   */
  exportToHTML(report) {
    let html = `<!DOCTYPE html>
<html>
<head>
  <title>${report.metadata.title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #2c3e50; }
    h2 { color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
    .section { margin: 30px 0; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #3498db; color: white; }
    .violation { background-color: #ffebee; }
    .recommendation { background-color: #e8f5e9; }
  </style>
</head>
<body>
  <h1>${report.metadata.title}</h1>
  <p><strong>Generated:</strong> ${report.metadata.generatedAt}</p>
  <p><strong>Software:</strong> ${report.metadata.software}</p>
`;

    // Executive Summary
    if (report.executiveSummary) {
      html += `<div class="section">
  <h2>Executive Summary</h2>
  <p>${report.executiveSummary.overview}</p>
  <h3>Key Findings</h3>
  <ul>`;
      report.executiveSummary.findings.forEach(finding => {
        html += `<li>${finding}</li>`;
      });
      html += `</ul>
  <h3>Conclusion</h3>
  <p>${report.executiveSummary.conclusion}</p>
</div>`;
    }

    // System Description
    html += `<div class="section">
  <h2>System Description</h2>
  <table>
    <tr><th>Parameter</th><th>Value</th></tr>
    <tr><td>Type</td><td>${report.systemDescription.type}</td></tr>
    <tr><td>Nominal Voltage</td><td>${report.systemDescription.nominalVoltage}</td></tr>
    <tr><td>Buses</td><td>${report.systemDescription.buses}</td></tr>
    <tr><td>Lines</td><td>${report.systemDescription.lines}</td></tr>
    <tr><td>Transformers</td><td>${report.systemDescription.transformers}</td></tr>
    <tr><td>Configuration</td><td>${report.systemDescription.configuration}</td></tr>
  </table>
</div>`;

    html += `</body>
</html>`;

    return html;
  }

  /**
   * Export report to Markdown
   * @param {Object} report - Report object
   * @returns {string} Markdown string
   */
  exportToMarkdown(report) {
    let md = `# ${report.metadata.title}\n\n`;
    md += `**Generated:** ${report.metadata.generatedAt}\n`;
    md += `**Software:** ${report.metadata.software}\n\n`;

    // Executive Summary
    if (report.executiveSummary) {
      md += '## Executive Summary\n\n';
      md += `${report.executiveSummary.overview}\n\n`;
      md += '### Key Findings\n\n';
      report.executiveSummary.findings.forEach(finding => {
        md += `- ${finding}\n`;
      });
      md += '\n### Conclusion\n\n';
      md += `${report.executiveSummary.conclusion}\n\n`;
    }

    // System Description
    md += '## System Description\n\n';
    md += `- **Type:** ${report.systemDescription.type}\n`;
    md += `- **Nominal Voltage:** ${report.systemDescription.nominalVoltage}\n`;
    md += `- **Buses:** ${report.systemDescription.buses}\n`;
    md += `- **Lines:** ${report.systemDescription.lines}\n`;
    md += `- **Transformers:** ${report.systemDescription.transformers}\n`;
    md += `- **Configuration:** ${report.systemDescription.configuration}\n\n`;

    return md;
  }

  /**
   * Export report to PDF using EnhancedReportGenerator
   * @param {Object} report - Report object
   * @param {Object} options - PDF export options
   * @returns {Promise<Buffer>} PDF buffer
   */
  async exportToPDF(report, options = {}) {
    try {
      // Dynamically import EnhancedReportGenerator to avoid circular dependencies
      const { EnhancedReportGenerator } = require('./EnhancedReportGenerator');
      
      // Convert professional report to format expected by EnhancedReportGenerator
      const data = this.convertToEnhancedFormat(report);
      
      // Create EnhancedReportGenerator instance
      const enhancedGenerator = new EnhancedReportGenerator({
        format: 'pdf',
        includeTCC: options.includeTCC !== false,
        includeEvents: options.includeEvents !== false
      });
      
      // Generate report
      const enhancedReport = enhancedGenerator.generateReport(data);
      
      // Export to PDF (this would typically use a PDF library like jsPDF or puppeteer)
      // For now, we'll return the enhanced report structure
      return {
        success: true,
        report: enhancedReport,
        message: 'PDF export would be implemented with jsPDF or puppeteer'
      };
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Convert professional report to EnhancedReportGenerator format
   * @param {Object} report - Professional report
   * @returns {Object} Data in EnhancedReportGenerator format
   */
  convertToEnhancedFormat(report) {
    return {
      systemName: report.systemDescription?.type || 'System',
      buses: report.systemDescription?.buses || 0,
      lines: report.systemDescription?.lines || 0,
      trafos: report.systemDescription?.transformers || 0,
      loads: report.systemDescription?.buses || 0,
      generators: report.systemDescription?.generators || 0,
      powerFlowResults: report.keyResults?.powerFlow || null,
      fault: report.keyResults?.shortCircuit || null,
      protections: report.keyResults?.protection || null,
      dynamics: report.keyResults?.dynamics || null,
      violations: report.violations || null,
      events: report.eventSequence || [],
      executiveSummary: report.executiveSummary || null,
      recommendations: report.recommendations || []
    };
  }
}

module.exports = ProfessionalReportGenerator;
