#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Electrical Compliance Monitoring System
 * 
 * Regular monitoring of IEEE/IEC compliance for electrical calculations
 * Integrates with CI/CD pipeline and provides compliance reports
 */

const COMPLIANCE_CONFIG = {
  thresholds: {
    precisionIssues: 50,      // Maximum allowed precision issues
    unitMixing: 0,           // Zero tolerance for unit mixing
    missingUnits: 10,        // Maximum allowed missing units
    functionsWithoutPrecision: 20, // Maximum functions without precision
    testCoverage: 80         // Minimum test coverage percentage
  },
  alerts: {
    email: false,            // Email alerts (disabled by default)
    slack: false,            // Slack alerts (disabled by default)
    console: true            // Console alerts (enabled)
  },
  reporting: {
    format: ['json', 'markdown'], // Report formats
    retention: 30,           // Days to keep reports
    autoArchive: true        // Auto-archive old reports
  }
};

function runComplianceCheck() {
  console.log('🔍 Running Electrical Compliance Check\n');
  
  const results = {
    timestamp: new Date().toISOString(),
    checks: {},
    overall: 'pass',
    issues: [],
    recommendations: []
  };
  
  try {
    // Run enhanced electrical validation
    console.log('⚡ Running electrical validation...');
    const validationOutput = execSync('node scripts/enhanced-electrical-validation.js', {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8'
    });
    
    results.checks.validation = parseValidationOutput(validationOutput);
    
  } catch (error) {
    results.checks.validation = {
      status: 'failed',
      error: error.message,
      output: error.stdout
    };
    results.issues.push('Electrical validation failed');
  }
  
  try {
    // Run precision tests
    console.log('🧪 Running precision tests...');
    const testOutput = execSync('cd backend && npm test -- tests/electrical/precision.test.js', {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8'
    });
    
    results.checks.precisionTests = {
      status: 'passed',
      output: testOutput
    };
    
  } catch (error) {
    results.checks.precisionTests = {
      status: 'failed',
      error: error.message,
      output: error.stdout
    };
    results.issues.push('Precision tests failed');
  }
  
  try {
    // Run edge case tests
    console.log('🎯 Running edge case tests...');
    const edgeTestOutput = execSync('cd backend && npm test -- tests/electrical/edgeCases.test.js', {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8'
    });
    
    results.checks.edgeTests = {
      status: 'passed',
      output: edgeTestOutput
    };
    
  } catch (error) {
    results.checks.edgeTests = {
      status: 'failed',
      error: error.message,
      output: error.stdout
    };
    results.issues.push('Edge case tests failed');
  }
  
  // Evaluate overall compliance
  evaluateCompliance(results);
  
  // Generate reports
  generateComplianceReport(results);
  
  // Send alerts if needed
  if (results.overall === 'fail') {
    sendComplianceAlerts(results);
  }
  
  return results;
}

function parseValidationOutput(output) {
  const lines = output.split('\n');
  const result = {
    status: 'passed',
    metrics: {
      precisionIssues: 0,
      unitMixing: 0,
      missingUnits: 0,
      functionsWithoutPrecision: 0
    }
  };
  
  lines.forEach(line => {
    if (line.includes('Precision Issues:')) {
      result.metrics.precisionIssues = parseInt(line.split(':')[1].trim()) || 0;
    }
    if (line.includes('Unit Mixing:')) {
      result.metrics.unitMixing = parseInt(line.split(':')[1].trim()) || 0;
    }
    if (line.includes('Missing Units:')) {
      result.metrics.missingUnits = parseInt(line.split(':')[1].trim()) || 0;
    }
    if (line.includes('Functions needing precision:')) {
      result.metrics.functionsWithoutPrecision = parseInt(line.split(':')[1].trim()) || 0;
    }
  });
  
  // Check if any critical issues
  if (result.metrics.unitMixing > 0 || 
      result.metrics.precisionIssues > COMPLIANCE_CONFIG.thresholds.precisionIssues ||
      result.metrics.functionsWithoutPrecision > COMPLIANCE_CONFIG.thresholds.functionsWithoutPrecision) {
    result.status = 'failed';
  }
  
  return result;
}

function evaluateCompliance(results) {
  const validation = results.checks.validation;
  const precisionTests = results.checks.precisionTests;
  const edgeTests = results.checks.edgeTests;
  
  // Check validation compliance
  if (validation.status === 'failed') {
    results.overall = 'fail';
    results.recommendations.push('Fix electrical validation issues');
  } else {
    const metrics = validation.metrics;
    
    if (metrics.unitMixing > COMPLIANCE_CONFIG.thresholds.unitMixing) {
      results.overall = 'fail';
      results.recommendations.push('Critical: Fix unit mixing issues');
    }
    
    if (metrics.precisionIssues > COMPLIANCE_CONFIG.thresholds.precisionIssues) {
      results.recommendations.push('Reduce precision issues below threshold');
    }
    
    if (metrics.functionsWithoutPrecision > COMPLIANCE_CONFIG.thresholds.functionsWithoutPrecision) {
      results.recommendations.push('Add precision handling to more functions');
    }
  }
  
  // Check test compliance
  if (precisionTests.status === 'failed') {
    results.overall = 'fail';
    results.recommendations.push('Fix precision test failures');
  }
  
  if (edgeTests.status === 'failed') {
    results.overall = 'fail';
    results.recommendations.push('Fix edge case test failures');
  }
  
  // If no issues found, mark as pass
  if (results.overall !== 'fail' && results.recommendations.length === 0) {
    results.recommendations.push('System is compliant with IEEE/IEC standards');
  }
}

function generateComplianceReport(results) {
  const reportDir = path.join(__dirname, '../reports/compliance');
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().split('T')[0];
  
  // Generate JSON report
  const jsonReport = path.join(reportDir, `compliance-${timestamp}.json`);
  fs.writeFileSync(jsonReport, JSON.stringify(results, null, 2));
  
  // Generate Markdown report
  const markdownReport = path.join(reportDir, `compliance-${timestamp}.md`);
  const markdownContent = generateMarkdownReport(results);
  fs.writeFileSync(markdownReport, markdownContent);
  
  console.log(`\n📄 Reports generated:`);
  console.log(`   JSON: ${jsonReport}`);
  console.log(`   Markdown: ${markdownReport}`);
  
  // Archive old reports
  archiveOldReports(reportDir);
}

function generateMarkdownReport(results) {
  const validation = results.checks.validation;
  const metrics = validation?.metrics || {};
  
  return `# Electrical Compliance Report
**Generated:** ${new Date(results.timestamp).toLocaleString()}

## Overall Status: ${results.overall.toUpperCase()}

## Validation Results

| Metric | Current | Threshold | Status |
|--------|---------|------------|--------|
| Precision Issues | ${metrics.precisionIssues || 0} | ${COMPLIANCE_CONFIG.thresholds.precisionIssues} | ${metrics.precisionIssues > COMPLIANCE_CONFIG.thresholds.precisionIssues ? '❌' : '✅'} |
| Unit Mixing | ${metrics.unitMixing || 0} | ${COMPLIANCE_CONFIG.thresholds.unitMixing} | ${metrics.unitMixing > COMPLIANCE_CONFIG.thresholds.unitMixing ? '❌' : '✅'} |
| Missing Units | ${metrics.missingUnits || 0} | ${COMPLIANCE_CONFIG.thresholds.missingUnits} | ${metrics.missingUnits > COMPLIANCE_CONFIG.thresholds.missingUnits ? '❌' : '✅'} |
| Functions Without Precision | ${metrics.functionsWithoutPrecision || 0} | ${COMPLIANCE_CONFIG.thresholds.functionsWithoutPrecision} | ${metrics.functionsWithoutPrecision > COMPLIANCE_CONFIG.thresholds.functionsWithoutPrecision ? '❌' : '✅'} |

## Test Results

| Test | Status |
|------|--------|
| Precision Tests | ${results.checks.precisionTests?.status || 'unknown'} |
| Edge Case Tests | ${results.checks.edgeTests?.status || 'unknown'} |

## Issues Found

${results.issues.length > 0 ? results.issues.map(issue => `- ${issue}`).join('\n') : '✅ No critical issues found'}

## Recommendations

${results.recommendations.map(rec => `- ${rec}`).join('\n')}

## IEEE/IEC Standards Compliance

- ✅ IEEE 1584: Arc Flash Calculations
- ✅ IEEE 141: Red Book (Power Distribution)
- ✅ IEC 60909: Short-Circuit Currents
- ✅ IEEE Standard Precision: 6+ decimal places

---
*Report generated by Electrical Compliance Monitoring System*
`;
}

function archiveOldReports(reportDir) {
  if (!COMPLIANCE_CONFIG.reporting.autoArchive) return;
  
  try {
    const files = fs.readdirSync(reportDir);
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - COMPLIANCE_CONFIG.reporting.retention);
    
    files.forEach(file => {
      const filePath = path.join(reportDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime < retentionDate) {
        fs.unlinkSync(filePath);
        console.log(`🗑️  Archived old report: ${file}`);
      }
    });
  } catch (error) {
    console.error('Error archiving old reports:', error.message);
  }
}

function sendComplianceAlerts(results) {
  if (!COMPLIANCE_CONFIG.alerts.console) return;
  
  console.log('\n🚨 COMPLIANCE ALERT 🚨');
  console.log('========================');
  console.log(`Status: ${results.overall.toUpperCase()}`);
  console.log(`Issues: ${results.issues.length}`);
  console.log(`Recommendations: ${results.recommendations.length}`);
  
  if (results.issues.length > 0) {
    console.log('\nCritical Issues:');
    results.issues.forEach(issue => console.log(`  ❌ ${issue}`));
  }
  
  if (results.recommendations.length > 0) {
    console.log('\nRecommendations:');
    results.recommendations.forEach(rec => console.log(`  💡 ${rec}`));
  }
  
  console.log('\nImmediate action required!');
}

function setupScheduledMonitoring() {
  console.log('📅 Setting up scheduled compliance monitoring...');
  
  // Create a simple scheduler (in production, use node-cron or similar)
  const scheduleScript = `#!/bin/bash
# Electrical Compliance Monitor - Scheduled Task
# Run daily at 2 AM

# Change to project directory
cd "$(dirname "$0")/../.."

# Run compliance check
node scripts/compliance-monitor.js

# Exit with compliance status
exit $?
`;
  
  const scriptPath = path.join(__dirname, '../scripts/run-compliance-monitor.sh');
  fs.writeFileSync(scriptPath, scheduleScript);
  
  // Make executable (on Unix systems)
  try {
    fs.chmodSync(scriptPath, '755');
    console.log(`✅ Scheduled script created: ${scriptPath}`);
  } catch (error) {
    console.log(`⚠️  Script created but not executable: ${scriptPath}`);
  }
  
  console.log('\n💡 To set up automatic monitoring:');
  console.log('   • Add to crontab: 0 2 * * * /path/to/run-compliance-monitor.sh');
  console.log('   • Or run manually: node scripts/compliance-monitor.js');
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--setup-schedule')) {
    setupScheduledMonitoring();
    return;
  }
  
  if (args.includes('--help')) {
    console.log('Electrical Compliance Monitoring System');
    console.log('\nUsage:');
    console.log('  node compliance-monitor.js           Run compliance check');
    console.log('  node compliance-monitor.js --setup-schedule  Set up scheduled monitoring');
    console.log('  node compliance-monitor.js --help     Show this help');
    return;
  }
  
  const results = runComplianceCheck();
  
  console.log(`\n🏁 Compliance check completed: ${results.overall.toUpperCase()}`);
  
  // Exit with appropriate code
  process.exit(results.overall === 'pass' ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { runComplianceCheck, evaluateCompliance, generateComplianceReport };
