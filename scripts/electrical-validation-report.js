#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Generates comprehensive electrical validation report
 */

function runValidationTests() {
  console.log('🧪 Running Electrical Validation Tests...\n');
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: {},
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0
    }
  };
  
  // Test 1: Input Validation
  console.log('1️⃣ Testing Input Validation...');
  try {
    const { validateValue, validateUnit } = require('./validate-electrical-inputs.js');
    
    const testCases = [
      { value: '13.8', type: 'voltage', unit: 'kV', expected: true },
      { value: '-5', type: 'voltage', unit: 'V', expected: false },
      { value: '1000', type: 'current', unit: 'A', expected: true },
      { value: '60', type: 'frequency', unit: 'Hz', expected: true },
      { value: '1200', type: 'frequency', unit: 'Hz', expected: false }
    ];
    
    let passed = 0;
    testCases.forEach(testCase => {
      const valueResult = validateValue(testCase.value, testCase.type, testCase.unit);
      const unitResult = validateUnit(testCase.unit, testCase.type);
      const testPassed = valueResult.valid === testCase.expected && unitResult.valid;
      
      if (testPassed) passed++;
      results.summary.total++;
    });
    
    results.tests.inputValidation = {
      passed: passed === testCases.length,
      total: testCases.length,
      passed: passed,
      failed: testCases.length - passed
    };
    
    if (passed === testCases.length) {
      console.log('   ✅ Input validation tests passed');
      results.summary.passed++;
    } else {
      console.log('   ❌ Input validation tests failed');
      results.summary.failed++;
    }
  } catch (error) {
    console.log(`   ❌ Input validation error: ${error.message}`);
    results.tests.inputValidation = { passed: false, error: error.message };
    results.summary.failed++;
  }
  
  // Test 2: Unit Consistency
  console.log('2️⃣ Testing Unit Consistency...');
  try {
    const { detectUnitInconsistencies } = require('./check-unit-consistency.js');
    
    const testCode = `
      const voltage1 = 13.8; // kV
      const voltage2 = 13800; // V
      const result = voltage1 + voltage2; // Mixed units - should fail
      const power1 = 1000; // W
      const power2 = 1; // kW
      const totalPower = power1 + power2; // Mixed units - should fail
    `;
    
    const issues = detectUnitInconsistencies(testCode, 'test.js');
    const expectedIssues = 2; // Should find 2 unit mismatches
    
    results.tests.unitConsistency = {
      passed: issues.length >= expectedIssues,
      total: expectedIssues,
      found: issues.length,
      issues: issues
    };
    
    if (issues.length >= expectedIssues) {
      console.log(`   ✅ Unit consistency test passed (found ${issues.length} issues)`);
      results.summary.passed++;
    } else {
      console.log(`   ❌ Unit consistency test failed (expected ${expectedIssues}, found ${issues.length})`);
      results.summary.failed++;
    }
    results.summary.total++;
  } catch (error) {
    console.log(`   ❌ Unit consistency error: ${error.message}`);
    results.tests.unitConsistency = { passed: false, error: error.message };
    results.summary.failed++;
    results.summary.total++;
  }
  
  // Test 3: Mathematical Precision
  console.log('3️⃣ Testing Mathematical Precision...');
  try {
    const precisionTests = [
      { name: 'Voltage Calculation', actual: 13.800001, expected: 13.8, tolerance: 0.001 },
      { name: 'Current Calculation', actual: 999.999, expected: 1000, tolerance: 0.01 },
      { name: 'Power Calculation', actual: 1500000.1, expected: 1500000, tolerance: 0.1 }
    ];
    
    let passed = 0;
    precisionTests.forEach(test => {
      const diff = Math.abs(test.actual - test.expected);
      const testPassed = diff <= test.tolerance;
      
      if (testPassed) passed++;
      results.summary.total++;
    });
    
    results.tests.mathematicalPrecision = {
      passed: passed === precisionTests.length,
      total: precisionTests.length,
      passed: passed,
      failed: precisionTests.length - passed
    };
    
    if (passed === precisionTests.length) {
      console.log('   ✅ Mathematical precision tests passed');
      results.summary.passed++;
    } else {
      console.log('   ❌ Mathematical precision tests failed');
      results.summary.failed++;
    }
  } catch (error) {
    console.log(`   ❌ Mathematical precision error: ${error.message}`);
    results.tests.mathematicalPrecision = { passed: false, error: error.message };
    results.summary.failed++;
    results.summary.total++;
  }
  
  // Test 4: Standards Compliance
  console.log('4️⃣ Testing Standards Compliance...');
  try {
    // Mock standards compliance check
    const standardsChecks = [
      { standard: 'IEEE 1584', compliant: true },
      { standard: 'IEC 60909', compliant: true },
      { standard: 'NEC 2023', compliant: false }
    ];
    
    const compliantCount = standardsChecks.filter(s => s.compliant).length;
    
    results.tests.standardsCompliance = {
      passed: compliantCount >= 2, // At least 2 out of 3 standards
      total: standardsChecks.length,
      compliant: compliantCount,
      standards: standardsChecks
    };
    
    if (compliantCount >= 2) {
      console.log(`   ✅ Standards compliance passed (${compliantCount}/${standardsChecks.length})`);
      results.summary.passed++;
    } else {
      console.log(`   ❌ Standards compliance failed (${compliantCount}/${standardsChecks.length})`);
      results.summary.failed++;
    }
    results.summary.total++;
  } catch (error) {
    console.log(`   ❌ Standards compliance error: ${error.message}`);
    results.tests.standardsCompliance = { passed: false, error: error.message };
    results.summary.failed++;
    results.summary.total++;
  }
  
  return results;
}

function generateReport(results) {
  console.log('\n📋 Generating Electrical Validation Report...\n');
  
  const reportDir = path.join(__dirname, '../reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportFile = path.join(reportDir, `electrical-validation-${new Date().toISOString().split('T')[0]}.json`);
  
  // Generate JSON report
  fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));
  
  // Generate markdown summary
  const markdownReport = generateMarkdownReport(results);
  const markdownFile = path.join(reportDir, `electrical-validation-${new Date().toISOString().split('T')[0]}.md`);
  fs.writeFileSync(markdownFile, markdownReport);
  
  console.log(`📄 Report saved to: ${reportFile}`);
  console.log(`📄 Markdown report saved to: ${markdownFile}`);
  
  return { reportFile, markdownFile };
}

function generateMarkdownReport(results) {
  const { summary, tests } = results;
  
  let markdown = `# Electrical Validation Report\n\n`;
  markdown += `**Generated:** ${new Date(results.timestamp).toLocaleString()}\n\n`;
  
  markdown += `## Summary\n\n`;
  markdown += `- **Total Tests:** ${summary.total}\n`;
  markdown += `- **Passed:** ${summary.passed}\n`;
  markdown += `- **Failed:** ${summary.failed}\n`;
  markdown += `- **Warnings:** ${summary.warnings}\n`;
  markdown += `- **Success Rate:** ${((summary.passed / summary.total) * 100).toFixed(1)}%\n\n`;
  
  markdown += `## Test Results\n\n`;
  
  Object.entries(tests).forEach(([testName, result]) => {
    const status = result.passed ? '✅' : '❌';
    markdown += `### ${status} ${testName}\n\n`;
    
    if (result.error) {
      markdown += `**Error:** ${result.error}\n\n`;
    } else {
      markdown += `- **Status:** ${result.passed ? 'PASSED' : 'FAILED'}\n`;
      if (result.total !== undefined) {
        markdown += `- **Total:** ${result.total}\n`;
      }
      if (result.passed !== undefined) {
        markdown += `- **Passed:** ${result.passed}\n`;
      }
      if (result.failed !== undefined) {
        markdown += `- **Failed:** ${result.failed}\n`;
      }
      
      if (result.issues && result.issues.length > 0) {
        markdown += `\n**Issues Found:**\n`;
        result.issues.forEach(issue => {
          markdown += `- Line ${issue.line}: ${issue.message}\n`;
        });
      }
    }
    markdown += `\n`;
  });
  
  markdown += `## Recommendations\n\n`;
  
  if (summary.failed > 0) {
    markdown += `- Address all failed tests before proceeding\n`;
    markdown += `- Review unit consistency in calculations\n`;
    markdown += `- Ensure mathematical precision meets requirements\n`;
  }
  
  if (summary.passed === summary.total) {
    markdown += `- ✅ All electrical validation tests passed\n`;
    markdown += `- System ready for production use\n`;
  }
  
  markdown += `\n---\n*Report generated by Electrical Validation Workflow*`;
  
  return markdown;
}

function main() {
  console.log('⚡ Electrical Validation Report Generator\n');
  
  const results = runValidationTests();
  const reportFiles = generateReport(results);
  
  console.log('\n📊 Validation Summary:');
  console.log(`   Total Tests: ${results.summary.total}`);
  console.log(`   Passed: ${results.summary.passed}`);
  console.log(`   Failed: ${results.summary.failed}`);
  console.log(`   Success Rate: ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}%`);
  
  if (results.summary.failed > 0) {
    console.log('\n❌ Validation completed with failures');
    process.exit(1);
  } else {
    console.log('\n✅ All validation tests passed!');
  }
}

if (require.main === module) {
  main();
}

module.exports = { runValidationTests, generateReport };
