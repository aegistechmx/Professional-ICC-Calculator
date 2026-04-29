#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Enhanced electrical validation script with real-world precision detection
 * Addresses the issues found in the original validation script
 */

const ELECTRICAL_PATTERNS = {
  // Patterns that indicate electrical calculations without proper precision
  PRECISION_ISSUES: [
    // Math operations in electrical context
    /Math\.\w+.*(?:voltage|current|power|impedance|frequency)/i,
    // Direct arithmetic operations on electrical values
    /(?:voltage|current|power|impedance|frequency)\s*[+\-*/]/i,
    // parseFloat without precision handling
    /parseFloat.*(?:voltage|current|power|impedance)/i,
    // Number operations without toFixed
    /Number\(.+?\)\s*[+\-*/].*?(?:voltage|current|power)/i,
    // Direct assignments without precision
    /(?:bus|node|line)\.\w+\s*=\s*[\d.]+.*\/\/.*?(?:voltage|current|power)/i
  ],
  
  // Unit consistency patterns
  UNIT_MIXING: [
    // Different voltage units in same calculation
    /(\d+\.?\d*)\s*(V|kV|MV)\s*[+\-*/]\s*(\d+\.?\d*)\s*(V|kV|MV)(?!\2)/,
    // Different current units in same calculation
    /(\d+\.?\d*)\s*(A|kA|mA)\s*[+\-*/]\s*(\d+\.?\d*)\s*(A|kA|mA)(?!\2)/,
    // Different power units mixing
    /(\d+\.?\d*)\s*(W|kW|MW)\s*[+\-*/]\s*(\d+\.?\d*)\s*(VA|kVA|MVA)/,
    // Impedance unit mixing
    /(\d+\.?\d*)\s*(Ω|kΩ|MΩ|pu)\s*[+\-*/]\s*(\d+\.?\d*)\s*(Ω|kΩ|MΩ|pu)(?!\2)/
  ],
  
  // Missing unit declarations
  MISSING_UNITS: [
    // Electrical calculations without units
    /(?:voltage|current|power|impedance|frequency)\s*[+\-*/]\s*\d+\.?\d*/i,
    // Assignment of electrical values without units
    /(?:voltage|current|power|impedance|frequency)\s*=\s*\d+\.?\d*/i
  ]
};

function detectRealPrecisionIssues(content, filePath) {
  const issues = [];
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Check for precision issues in electrical calculations
    ELECTRICAL_PATTERNS.PRECISION_ISSUES.forEach((pattern, patternIndex) => {
      const matches = line.match(pattern);
      if (matches) {
        issues.push({
          line: index + 1,
          type: 'precision_issue',
          pattern: `precision_${patternIndex}`,
          match: matches[0],
          suggestion: 'Use toFixed(6) for IEEE standard precision',
          severity: 'warning'
        });
      }
    });
    
    // Check for unit mixing
    ELECTRICAL_PATTERNS.UNIT_MIXING.forEach((pattern, patternIndex) => {
      const matches = line.match(pattern);
      if (matches) {
        issues.push({
          line: index + 1,
          type: 'unit_mixing',
          pattern: `unit_mix_${patternIndex}`,
          match: matches[0],
          units: [matches[2], matches[4]],
          suggestion: 'Convert to same unit before calculation',
          severity: 'error'
        });
      }
    });
    
    // Check for missing units
    ELECTRICAL_PATTERNS.MISSING_UNITS.forEach((pattern, patternIndex) => {
      const matches = line.match(pattern);
      if (matches) {
        issues.push({
          line: index + 1,
          type: 'missing_unit',
          pattern: `missing_unit_${patternIndex}`,
          match: matches[0],
          suggestion: 'Add explicit unit declaration',
          severity: 'warning'
        });
      }
    });
  });
  
  return issues;
}

function analyzeElectricalFunctions(content, filePath) {
  const functions = [];
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Find electrical calculation functions
    const funcMatch = line.match(/(?:function|const\s+\w+\s*=)\s*(\w*[Vv]oltage|\w*[Cc]urrent|\w*[Pp]ower|\w*[Ii]mpedance|\w*[Ff]requency|\w*[Cc]alculation|\w*[Ss]olver|\w*[Aa]nalysis)/);
    if (funcMatch) {
      const funcName = funcMatch[1];
      const funcContent = extractFunctionContent(lines, index);
      
      // Analyze function for precision handling
      const precisionIssues = detectRealPrecisionIssues(funcContent, filePath);
      const hasPrecisionHandling = funcContent.includes('toFixed') || 
                                  funcContent.includes('precision') ||
                                  funcContent.includes('Math.round');
      
      functions.push({
        name: funcName,
        line: index + 1,
        file: path.relative(__dirname, filePath),
        hasPrecisionHandling,
        precisionIssues: precisionIssues.length,
        issues: precisionIssues,
        recommendation: !hasPrecisionHandling ? 'Add IEEE standard precision handling' : null
      });
    }
  });
  
  return functions;
}

function extractFunctionContent(lines, startLine) {
  let content = '';
  let braceCount = 0;
  let inFunction = false;
  
  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    content += line + '\n';
    
    if (line.includes('{')) {
      braceCount += line.split('{').length - 1;
      inFunction = true;
    }
    
    if (line.includes('}')) {
      braceCount -= line.split('}').length - 1;
    }
    
    if (inFunction && braceCount === 0) {
      break;
    }
  }
  
  return content;
}

function scanElectricalFiles() {
  const backendDir = path.join(__dirname, '../backend/src');
  const results = {
    scanned: 0,
    functions: [],
    issues: [],
    summary: {
      totalIssues: 0,
      precisionIssues: 0,
      unitMixing: 0,
      missingUnits: 0,
      functionsWithoutPrecision: 0
    }
  };
  
  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (file.endsWith('.js')) {
        scanFile(fullPath);
      }
    }
  }
  
  function scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      results.scanned++;
      
      const relativePath = path.relative(__dirname, filePath);
      
      // Find and analyze electrical functions
      const functions = analyzeElectricalFunctions(content, filePath);
      functions.forEach(func => {
        results.functions.push(func);
        if (!func.hasPrecisionHandling) {
          results.summary.functionsWithoutPrecision++;
        }
      });
      
      // Detect precision issues in the entire file
      const issues = detectRealPrecisionIssues(content, relativePath);
      issues.forEach(issue => {
        issue.file = relativePath;
        results.issues.push(issue);
        
        // Update summary
        results.summary.totalIssues++;
        if (issue.type === 'precision_issue') results.summary.precisionIssues++;
        if (issue.type === 'unit_mixing') results.summary.unitMixing++;
        if (issue.type === 'missing_unit') results.summary.missingUnits++;
      });
      
    } catch (error) {
      console.error(`Error scanning ${filePath}:`, error.message);
    }
  }
  
  scanDirectory(backendDir);
  return results;
}

function generateEnhancedReport(results) {
  console.log('\n📊 Enhanced Electrical Validation Report\n');
  
  console.log(`🔍 Scan Results:`);
  console.log(`   Files scanned: ${results.scanned}`);
  console.log(`   Electrical functions found: ${results.functions.length}`);
  console.log(`   Functions without precision: ${results.summary.functionsWithoutPrecision}`);
  console.log(`   Total issues: ${results.summary.totalIssues}\n`);
  
  // Show functions with issues
  if (results.functions.length > 0) {
    console.log('⚡ Electrical Functions Analysis:');
    results.functions.forEach(func => {
      const status = func.hasPrecisionHandling ? '✅' : '❌';
      const issuesCount = func.precisionIssues;
      console.log(`   ${status} ${func.name} (${func.file}:${func.line}) - ${issuesCount} issues`);
      
      if (func.recommendation) {
        console.log(`     💡 ${func.recommendation}`);
      }
      
      // Show top issues for this function
      func.issues.slice(0, 2).forEach(issue => {
        console.log(`     ⚠️  Line ${issue.line}: ${issue.suggestion}`);
      });
    });
    console.log();
  }
  
  // Show critical issues
  const criticalIssues = results.issues.filter(i => i.severity === 'error');
  if (criticalIssues.length > 0) {
    console.log('🚨 Critical Issues:');
    criticalIssues.forEach(issue => {
      console.log(`   ${issue.file}:${issue.line} - ${issue.type}`);
      console.log(`     Code: ${issue.match}`);
      console.log(`     💡 ${issue.suggestion}`);
    });
    console.log();
  }
  
  // Show summary by issue type
  console.log('📈 Issue Summary:');
  console.log(`   Precision Issues: ${results.summary.precisionIssues}`);
  console.log(`   Unit Mixing: ${results.summary.unitMixing}`);
  console.log(`   Missing Units: ${results.summary.missingUnits}`);
  console.log(`   Functions needing precision: ${results.summary.functionsWithoutPrecision}`);
  
  // Generate recommendations
  console.log('\n💡 Recommendations:');
  if (results.summary.functionsWithoutPrecision > 0) {
    console.log(`   • Add toFixed(6) to ${results.summary.functionsWithoutPrecision} functions for IEEE compliance`);
  }
  if (results.summary.unitMixing > 0) {
    console.log(`   • Fix ${results.summary.unitMixing} unit mixing issues`);
  }
  if (results.summary.missingUnits > 0) {
    console.log(`   • Add explicit units to ${results.summary.missingUnits} calculations`);
  }
  
  return results;
}

function main() {
  console.log('⚡ Enhanced Electrical Validation Script\n');
  console.log('🔍 Scanning for real-world precision and unit issues...\n');
  
  const results = scanElectricalFiles();
  const report = generateEnhancedReport(results);
  
  // Save detailed report
  const reportDir = path.join(__dirname, '../reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportFile = path.join(reportDir, `enhanced-electrical-validation-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 Detailed report saved to: ${reportFile}`);
  
  // Exit with error code if critical issues found
  if (report.summary.unitMixing > 0 || report.summary.functionsWithoutPrecision > 5) {
    console.log('\n❌ Critical electrical validation issues found');
    process.exit(1);
  } else {
    console.log('\n✅ Electrical validation completed');
  }
}

if (require.main === module) {
  main();
}

module.exports = { detectRealPrecisionIssues, analyzeElectricalFunctions, scanElectricalFiles };
