#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Checks for unit consistency in electrical calculations
 */

const UNIT_CONVERSIONS = {
  voltage: {
    'V': 1,
    'kV': 1000,
    'MV': 1000000,
    'mV': 0.001
  },
  current: {
    'A': 1,
    'kA': 1000,
    'mA': 0.001
  },
  power: {
    'W': 1,
    'kW': 1000,
    'MW': 1000000,
    'VA': 1,
    'kVA': 1000,
    'MVA': 1000000
  },
  impedance: {
    'Ω': 1,
    'kΩ': 1000,
    'MΩ': 1000000,
    'pu': 1 // Per unit is dimensionless
  }
};

function detectUnitInconsistencies(content, filePath) {
  const issues = [];
  const lines = content.split('\n');
  
  // Look for calculations that mix units
  lines.forEach((line, index) => {
    // Check for voltage calculations
    const voltageCalc = line.match(/(\d+\.?\d*)\s*(V|kV|MV|mV)\s*[+\-*/]\s*(\d+\.?\d*)\s*(V|kV|MV|mV)/);
    if (voltageCalc) {
      const [, val1, unit1, val2, unit2] = voltageCalc;
      if (unit1 !== unit2) {
        issues.push({
          line: index + 1,
          type: 'unit_mismatch',
          message: `Voltage calculation mixing units: ${val1} ${unit1} and ${val2} ${unit2}`,
          suggestion: 'Convert to same unit before calculation'
        });
      }
    }
    
    // Check for power calculations mixing apparent and real power
    const powerCalc = line.match(/(\d+\.?\d*)\s*(W|kW|MW)\s*[+\-*/]\s*(\d+\.?\d*)\s*(VA|kVA|MVA)/);
    if (powerCalc) {
      issues.push({
        line: index + 1,
        type: 'power_type_mismatch',
        message: 'Mixing real power (W) with apparent power (VA)',
        suggestion: 'Use power factor or convert consistently'
      });
    }
    
    // Check for impedance calculations
    const impedanceCalc = line.match(/(\d+\.?\d*)\s*(Ω|kΩ|MΩ|pu)\s*[+\-*/]\s*(\d+\.?\d*)\s*(Ω|kΩ|MΩ|pu)/);
    if (impedanceCalc) {
      const [, val1, unit1, val2, unit2] = impedanceCalc;
      if (unit1 !== unit2 && !(unit1 === 'pu' || unit2 === 'pu')) {
        issues.push({
          line: index + 1,
          type: 'impedance_unit_mismatch',
          message: `Impedance calculation mixing units: ${val1} ${unit1} and ${val2} ${unit2}`,
          suggestion: 'Convert to same unit or use per-unit system'
        });
      }
    }
    
    // Check for missing units in electrical calculations
    const electricalCalc = line.match(/(voltage|current|power|impedance|frequency)\s*[+\-*/]\s*\d+\.?\d*/i);
    if (electricalCalc) {
      issues.push({
        line: index + 1,
        type: 'missing_unit',
        message: 'Electrical calculation without units',
        suggestion: 'Always include units in electrical calculations'
      });
    }
  });
  
  return issues;
}

function findElectricalFunctions(content) {
  const functions = [];
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Look for function definitions related to electrical calculations
    const funcMatch = line.match(/(?:function|const\s+\w+\s*=)\s*(\w*[Vv]oltage|\w*[Cc]urrent|\w*[Pp]ower|\w*[Ii]mpedance|\w*[Ff]requency|\w*[Cc]alculation|\w*[Ss]olver)/);
    if (funcMatch) {
      const funcName = funcMatch[1];
      functions.push({
        name: funcName,
        line: index + 1,
        content: extractFunctionContent(lines, index)
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
    recommendations: []
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
      
      // Find electrical functions
      const functions = findElectricalFunctions(content);
      functions.forEach(func => {
        func.file = relativePath;
        results.functions.push(func);
      });
      
      // Check for unit inconsistencies
      const issues = detectUnitInconsistencies(content, relativePath);
      issues.forEach(issue => {
        issue.file = relativePath;
        results.issues.push(issue);
      });
      
      // Look for best practices
      if (content.includes('Math.') && (content.includes('voltage') || content.includes('current'))) {
        results.recommendations.push({
          file: relativePath,
          message: 'Consider using electrical-specific utility functions instead of raw Math operations',
          type: 'best_practice'
        });
      }
      
      if (content.includes('parseFloat') && content.includes('voltage')) {
        results.recommendations.push({
          file: relativePath,
          message: 'Consider using proper unit parsing for voltage values',
          type: 'best_practice'
        });
      }
      
    } catch (error) {
      results.issues.push({
        file: path.relative(__dirname, filePath),
        type: 'file_error',
        message: `Failed to read file: ${error.message}`
      });
    }
  }
  
  scanDirectory(backendDir);
  return results;
}

function main() {
  console.log('🔧 Checking Unit Consistency in Electrical Calculations...\n');
  
  const results = scanElectricalFiles();
  
  console.log(`📊 Analysis Results:`);
  console.log(`   Files scanned: ${results.scanned}`);
  console.log(`   Electrical functions found: ${results.functions.length}`);
  console.log(`   Issues found: ${results.issues.length}`);
  console.log(`   Recommendations: ${results.recommendations.length}\n`);
  
  if (results.functions.length > 0) {
    console.log('⚡ Electrical Functions Found:');
    results.functions.forEach(func => {
      console.log(`   ${func.file}:${func.line} - ${func.name}`);
    });
    console.log();
  }
  
  if (results.issues.length > 0) {
    console.log('❌ Issues:');
    results.issues.forEach(issue => {
      console.log(`   ${issue.file}:${issue.line} - ${issue.message}`);
      if (issue.suggestion) {
        console.log(`     💡 Suggestion: ${issue.suggestion}`);
      }
    });
    console.log();
  }
  
  if (results.recommendations.length > 0) {
    console.log('💡 Recommendations:');
    results.recommendations.forEach(rec => {
      console.log(`   ${rec.file} - ${rec.message}`);
    });
    console.log();
  }
  
  if (results.issues.length === 0) {
    console.log('✅ No unit consistency issues found!');
  } else {
    console.log('⚠️  Unit consistency check completed with issues.');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { detectUnitInconsistencies, findElectricalFunctions };
