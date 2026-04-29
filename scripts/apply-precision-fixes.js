#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Apply IEEE precision fixes to electrical functions
 * Automatically adds toElectricalPrecision() calls and unit declarations
 */

const { toElectricalPrecision, formatElectricalValue } = require('../backend/src/utils/electricalUtils');

// Patterns to identify electrical calculations needing precision
const ELECTRICAL_PATTERNS = [
  // Direct assignments of electrical values
  /(\w+\.\w+)\s*=\s*([\d.]+)\s*(?:\/\/.*?(?:voltage|current|power|impedance|frequency))/i,
  // Math operations on electrical values
  /(\w+\.\w+)\s*=\s*(?:Math\.\w+\(|)([\d.]+)\s*[+\-*/]\s*([\d.]+)/,
  // Return statements with electrical values
  /return\s+([\d.]+)\s*[+\-*/]\s*([\d.]+)/,
  // Object properties with electrical values
  /(\w+):\s*([\d.]+)\s*[+\-*/]\s*([\d.]+)/,
  // parseFloat without precision
  /parseFloat\(([^)]+)\)/g,
  // Number() without precision
  /Number\(([^)]+)\)/g
];

const UNIT_PATTERNS = [
  // Voltage assignments
  /(\w+\.\w+)\s*=\s*([\d.]+)\s*(?:\/\/.*?voltage)/i,
  /(\w+):\s*([\d.]+)\s*(?:\/\/.*?voltage)/i,
  // Current assignments
  /(\w+\.\w+)\s*=\s*([\d.]+)\s*(?:\/\/.*?current)/i,
  /(\w+):\s*([\d.]+)\s*(?:\/\/.*?current)/i,
  // Power assignments
  /(\w+\.\w+)\s*=\s*([\d.]+)\s*(?:\/\/.*?power)/i,
  /(\w+):\s*([\d.]+)\s*(?:\/\/.*?power)/i,
  // Impedance assignments
  /(\w+\.\w+)\s*=\s*([\d.]+)\s*(?:\/\/.*?impedance)/i,
  /(\w+):\s*([\d.]+)\s*(?:\/\/.*?impedance)/i
];

function applyPrecisionFixes(content, filePath) {
  let modified = false;
  let lines = content.split('\n');
  
  lines = lines.map((line, index) => {
    let newLine = line;
    
    // Add electricalUtils import if not present
    if (index === 0 && !content.includes('electricalUtils')) {
      const importStatement = "const { toElectricalPrecision, formatElectricalValue } = require('../../utils/electricalUtils');\n";
      return importStatement + line;
    }
    
    // Fix parseFloat calls
    newLine = newLine.replace(/parseFloat\(([^)]+)\)/g, (match, arg) => {
      modified = true;
      return `toElectricalPrecision(parseFloat(${arg}))`;
    });
    
    // Fix Number() calls
    newLine = newLine.replace(/Number\(([^)]+)\)/g, (match, arg) => {
      modified = true;
      return `toElectricalPrecision(Number(${arg}))`;
    });
    
    // Fix direct assignments of electrical values
    newLine = newLine.replace(/(\w+\.\w+)\s*=\s*([\d.]+)\s*(?:\/\/.*?(voltage|current|power|impedance|frequency))/i, (match, prop, value, type) => {
      modified = true;
      const unit = getUnitForType(type);
      return `${prop} = toElectricalPrecision(${value}); // ${type} (${unit})`;
    });
    
    // Fix math operations
    newLine = newLine.replace(/(\w+\.\w+)\s*=\s*(?:Math\.\w+\(|)([\d.]+)\s*[+\-*/]\s*([\d.]+)/, (match, prop, val1, val2) => {
      modified = true;
      return `${prop} = toElectricalPrecision(${val1} ${match.includes('+') ? '+' : match.includes('-') ? '-' : match.includes('*') ? '*' : '/'} ${val2})`;
    });
    
    // Fix return statements
    newLine = newLine.replace(/return\s+([\d.]+)\s*[+\-*/]\s*([\d.]+)/, (match, val1, val2) => {
      modified = true;
      const operator = match.includes('+') ? '+' : match.includes('-') ? '-' : match.includes('*') ? '*' : '/';
      return `return toElectricalPrecision(${val1} ${operator} ${val2})`;
    });
    
    // Fix object properties
    newLine = newLine.replace(/(\w+):\s*([\d.]+)\s*[+\-*/]\s*([\d.]+)/, (match, prop, val1, val2) => {
      modified = true;
      const operator = match.includes('+') ? '+' : match.includes('-') ? '-' : match.includes('*') ? '*' : '/';
      return `${prop}: toElectricalPrecision(${val1} ${operator} ${val2})`;
    });
    
    return newLine;
  });
  
  return {
    content: lines.join('\n'),
    modified
  };
}

function getUnitForType(type) {
  const units = {
    voltage: 'V',
    current: 'A', 
    power: 'W',
    impedance: 'Ω',
    frequency: 'Hz'
  };
  return units[type.toLowerCase()] || '';
}

function addUnitDeclarations(content, filePath) {
  let modified = false;
  let lines = content.split('\n');
  
  lines = lines.map((line, index) => {
    let newLine = line;
    
    // Add unit declarations to electrical calculations
    UNIT_PATTERNS.forEach(pattern => {
      newLine = newLine.replace(pattern, (match, prop, value, type) => {
        modified = true;
        const unit = getUnitForType(type);
        return `${prop} = ${value}; // ${type} (${unit})`;
      });
    });
    
    return newLine;
  });
  
  return {
    content: lines.join('\n'),
    modified
  };
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let modifiedContent = content;
    let totalModified = false;
    
    // Apply precision fixes
    const precisionResult = applyPrecisionFixes(modifiedContent, filePath);
    modifiedContent = precisionResult.content;
    totalModified = totalModified || precisionResult.modified;
    
    // Add unit declarations
    const unitResult = addUnitDeclarations(modifiedContent, filePath);
    modifiedContent = unitResult.content;
    totalModified = totalModified || unitResult.modified;
    
    // Write back if modified
    if (totalModified) {
      fs.writeFileSync(filePath, modifiedContent, 'utf8');
      return { modified: true, path: filePath };
    }
    
    return { modified: false, path: filePath };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return { modified: false, path: filePath, error: error.message };
  }
}

function scanAndFixElectricalFiles() {
  const backendDir = path.join(__dirname, '../backend/src');
  const results = {
    scanned: 0,
    modified: 0,
    errors: 0,
    files: []
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
        results.scanned++;
        const result = processFile(fullPath);
        results.files.push(result);
        
        if (result.modified) {
          results.modified++;
          console.log(`✅ Fixed: ${path.relative(__dirname, fullPath)}`);
        }
        
        if (result.error) {
          results.errors++;
          console.log(`❌ Error: ${path.relative(__dirname, fullPath)} - ${result.error}`);
        }
      }
    }
  }
  
  scanDirectory(backendDir);
  return results;
}

function generateReport(results) {
  console.log('\n📊 Precision Fixes Report\n');
  console.log(`📁 Files scanned: ${results.scanned}`);
  console.log(`✅ Files modified: ${results.modified}`);
  console.log(`❌ Errors: ${results.errors}\n`);
  
  if (results.modified > 0) {
    console.log('🔧 Modified files:');
    results.files
      .filter(f => f.modified)
      .forEach(f => console.log(`   ${path.relative(__dirname, f.path)}`));
    console.log();
  }
  
  if (results.errors > 0) {
    console.log('❌ Files with errors:');
    results.files
      .filter(f => f.error)
      .forEach(f => console.log(`   ${path.relative(__dirname, f.path)} - ${f.error}`));
    console.log();
  }
  
  console.log('💡 Summary:');
  console.log(`   • Applied IEEE standard precision to ${results.modified} files`);
  console.log(`   • Added toElectricalPrecision() calls`);
  console.log(`   • Added explicit unit declarations`);
  console.log(`   • Fixed parseFloat() and Number() calls`);
  
  return results;
}

function main() {
  console.log('🔧 Applying IEEE Precision Fixes\n');
  console.log('🔍 Scanning electrical files for precision issues...\n');
  
  const results = scanAndFixElectricalFiles();
  const report = generateReport(results);
  
  // Save report
  const reportDir = path.join(__dirname, '../reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportFile = path.join(reportDir, `precision-fixes-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 Report saved to: ${reportFile}`);
  
  if (results.modified > 0) {
    console.log('\n✅ Precision fixes applied successfully');
    console.log('💡 Run enhanced-electrical-validation.js to verify fixes');
  } else {
    console.log('\n✅ No precision fixes needed');
  }
}

if (require.main === module) {
  main();
}

module.exports = { applyPrecisionFixes, addUnitDeclarations, processFile };
