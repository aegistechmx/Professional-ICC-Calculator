/**
 * Professional PDF Report Generator
 * Generates industrial-grade engineering reports
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Report Generator Class
 */
class ProfessionalReportGenerator {
  constructor() {
    this.doc = null;
    this.font = 'Helvetica';
    this.fontSize = 10;
    this.margin = 50;
  }
  
  /**
   * Initialize new document
   */
  createDocument(title, options = {}) {
    this.doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      },
      ...options
    });
    
    this.title = title;
    this.sections = [];
    
    return this.doc;
  }
  
  /**
   * Add header
   */
  addHeader() {
    this.doc.fontSize(16).font('Helvetica-Bold');
    this.doc.text(this.title, { align: 'center' });
    this.doc.moveDown();
    this.doc.fontSize(10).font('Helvetica');
    this.doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
    this.doc.moveDown(2);
    
    return this;
  }
  
  /**
   * Add section header
   */
  addSection(title) {
    this.doc.fontSize(12).font('Helvetica-Bold');
    this.doc.text(title);
    this.doc.fontSize(10).font('Helvetica');
    this.doc.moveDown();
    
    this.sections.push({ title, page: this.doc.page });
    
    return this;
  }
  
  /**
   * Add table
   */
  addTable(headers, data, options = {}) {
    const { width = 500, cellPadding = 5 } = options;
    const cellWidth = width / headers.length;
    
    // Header row
    this.doc.fontSize(9).font('Helvetica-Bold');
    headers.forEach((header, i) => {
      this.doc.text(header, 
        this.margin + i * cellWidth,
        this.doc.y,
        { width: cellWidth - cellPadding, align: 'left' }
      );
    });
    this.doc.moveDown();
    
    // Data rows
    this.doc.fontSize(8).font('Helvetica');
    data.forEach(row => {
      headers.forEach((_, i) => {
        const value = row[Object.keys(row)[i]] || '';
        this.doc.text(String(value),
          this.margin + i * cellWidth,
          this.doc.y,
          { width: cellWidth - cellPadding, align: 'left' }
        );
      });
      this.doc.moveDown();
    });
    
    this.doc.moveDown();
    
    return this;
  }
  
  /**
   * Add text paragraph
   */
  addText(text, options = {}) {
    this.doc.text(text, options);
    this.doc.moveDown();
    return this;
  }
  
  /**
   * Add bullet list
   */
  addBulletList(items) {
    items.forEach(item => {
      this.doc.text(`• ${item}`, { indent: 20 });
    });
    this.doc.moveDown();
    return this;
  }
  
  /**
   * Add chart placeholder
   */
  addChart(title, type = 'line') {
    this.doc.fontSize(10).font('Helvetica-Bold');
    this.doc.text(title);
    this.doc.fontSize(8).font('Helvetica');
    this.doc.text(`[${type.toUpperCase()} CHART PLACEHOLDER]`, { indent: 20 });
    this.doc.moveDown(2);
    return this;
  }
  
  /**
   * Add page break
   */
  addPageBreak() {
    this.doc.addPage();
    return this;
  }
  
  /**
   * Save document
   */
  save(filePath) {
    return new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(filePath);
      this.doc.pipe(stream);
      this.doc.on('end', resolve);
      this.doc.on('error', reject);
      this.doc.end();
    });
  }
  
  /**
   * Generate complete simulation report
   */
  generateSimulationReport(data, outputPath) {
    const { simulationResult, systemInfo, protectionData } = data;
    
    this.createDocument('Power System Analysis Report');
    this.addHeader();
    
    // Executive Summary
    this.addSection('1. Executive Summary');
    this.addText(`System: ${systemInfo.name}`);
    this.addText(`Base MVA: ${systemInfo.baseMVA}`);
    this.addText(`Base kV: ${systemInfo.baseKV}`);
    this.addText(`Total Buses: ${simulationResult.buses.length}`);
    this.addText(`Convergence: ${simulationResult.converged ? 'YES' : 'NO'}`);
    this.addText(`Iterations: ${simulationResult.iterations}`);
    this.doc.moveDown();
    
    // System Topology
    this.addSection('2. System Topology');
    const topologyHeaders = ['Bus ID', 'Type', 'Voltage (pu)', 'Angle (deg)', 'P (MW)', 'Q (MVAR)'];
    const topologyData = simulationResult.buses.map(b => ({
      id: b.id,
      type: b.type,
      voltage: b.V_pu.toFixed(3),
      angle: b.theta_deg.toFixed(2),
      p: b.P_final_MW.toFixed(2),
      q: b.Q_final_MVAR.toFixed(2)
    }));
    this.addTable(topologyHeaders, topologyData);
    
    // Voltage Analysis
    this.addSection('3. Voltage Analysis');
    const voltageViolations = simulationResult.buses.filter(b => 
      b.V_pu < 0.95 || b.V_pu > 1.05
    );
    
    if (voltageViolations.length > 0) {
      this.addText('Voltage Violations:');
      this.addBulletList(voltageViolations.map(b => 
        `Bus ${b.id}: ${b.V_pu.toFixed(3)} pu`
      ));
    } else {
      this.addText('No voltage violations detected.');
    }
    this.doc.moveDown();
    
    // Power Flow Results
    this.addSection('4. Power Flow Results');
    const flowHeaders = ['From', 'To', 'P (MW)', 'Q (MVAR)', 'Current (kA)'];
    const flowData = simulationResult.flows.map(f => ({
      from: f.from,
      to: f.to,
      p: f.P.toFixed(2),
      q: f.Q.toFixed(2),
      current: f.IkA.toFixed(3)
    }));
    this.addTable(flowHeaders, flowData);
    
    // Protection Analysis
    if (protectionData && protectionData.relays) {
      this.addPageBreak();
      this.addSection('5. Protection Analysis');
      
      const relayHeaders = ['Relay ID', 'Bus', 'Pickup (kA)', 'TMS', 'Curve', 'Status'];
      const relayData = protectionData.relays.map(r => ({
        id: r.id,
        bus: r.bus,
        pickup: r.pickup_kA.toFixed(3),
        tms: r.TMS.toFixed(3),
        curve: r.curve,
        status: r.status || 'OK'
      }));
      this.addTable(relayHeaders, relayData);
      
      // Coordination Summary
      this.addSection('6. Coordination Summary');
      this.addText(`Total Relays: ${protectionData.relays.length}`);
      this.addText(`Coordinated: ${protectionData.coordinatedCount || 0}`);
      this.addText(`Not Coordinated: ${(protectionData.relays.length - (protectionData.coordinatedCount || 0))}`);
    }
    
    // Recommendations
    this.addPageBreak();
    this.addSection('7. Recommendations');
    const recommendations = this.generateRecommendations(simulationResult);
    this.addBulletList(recommendations);
    
    // Disclaimer
    this.addSection('8. Disclaimer');
    this.addText('This report is generated by automated simulation software. Results should be verified by qualified electrical engineers before implementation.');
    
    return this.save(outputPath);
  }
  
  /**
   * Generate recommendations based on results
   */
  generateRecommendations(simulationResult) {
    const recommendations = [];
    
    // Check voltage violations
    const lowVoltage = simulationResult.buses.filter(b => b.V_pu < 0.95);
    if (lowVoltage.length > 0) {
      recommendations.push('Consider capacitor installation at buses with low voltage');
    }
    
    const highVoltage = simulationResult.buses.filter(b => b.V_pu > 1.05);
    if (highVoltage.length > 0) {
      recommendations.push('Consider reactor installation or tap adjustment for high voltage buses');
    }
    
    // Check convergence
    if (!simulationResult.converged) {
      recommendations.push('Review system parameters - load flow did not converge');
    }
    
    // Check heavily loaded branches
    const heavilyLoaded = simulationResult.flows.filter(f => Math.abs(f.P) > 50);
    if (heavilyLoaded.length > 0) {
      recommendations.push('Review thermal limits on heavily loaded branches');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('System operating within normal parameters');
    }
    
    return recommendations;
  }
  
  /**
   * Generate fault analysis report
   */
  generateFaultReport(data, outputPath) {
    const { faultResults, systemInfo } = data;
    
    this.createDocument('Fault Analysis Report');
    this.addHeader();
    
    this.addSection('1. Fault Summary');
    this.addText(`Fault Type: ${faultResults.faultType}`);
    this.addText(`Fault Bus: ${faultResults.faultBus}`);
    this.addText(`Fault Current: ${faultResults.faultCurrent.toFixed(2)} kA`);
    this.doc.moveDown();
    
    this.addSection('2. Bus Voltages During Fault');
    const voltageHeaders = ['Bus ID', 'Voltage (pu)', 'Angle (deg)'];
    const voltageData = faultResults.busVoltages.map(b => ({
      id: b.id,
      voltage: b.voltage.toFixed(3),
      angle: b.angle.toFixed(2)
    }));
    this.addTable(voltageHeaders, voltageData);
    
    this.addSection('3. Branch Currents');
    const currentHeaders = ['From', 'To', 'Current (kA)', 'Angle (deg)'];
    const currentData = faultResults.branchCurrents.map(b => ({
      from: b.from,
      to: b.to,
      current: b.current.toFixed(2),
      angle: b.angle.toFixed(1)
    }));
    this.addTable(currentHeaders, currentData);
    
    return this.save(outputPath);
  }
}

module.exports = ProfessionalReportGenerator;
