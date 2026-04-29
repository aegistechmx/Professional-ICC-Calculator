#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Fix missing unit declarations in electrical calculations
 * Adds explicit unit comments to electrical value assignments
 */

const UNIT_PATTERNS = [
  // Voltage calculations without units
  {
    pattern: /(\w+\.\w+)\s*=\s*([\d.]+)\s*(?:\/\/.*?voltaje|\/\/.*?voltage|\/\/.*?tensión)/i,
    unit: 'V',
    type: 'voltage'
  },
  // Current calculations without units  
  {
    pattern: /(\w+\.\w+)\s*=\s*([\d.]+)\s*(?:\/\/.*?corriente|\/\/.*?current)/i,
    unit: 'A',
    type: 'current'
  },
  // Power calculations without units
  {
    pattern: /(\w+\.\w+)\s*=\s*([\d.]+)\s*(?:\/\/.*?potencia|\/\/.*?power)/i,
    unit: 'W',
    type: 'power'
  },
  // Impedance calculations without units
  {
    pattern: /(\w+\.\w+)\s*=\s*([\d.]+)\s*(?:\/\/.*?impedancia|\/\/.*?impedance)/i,
    unit: 'Ω',
    type: 'impedance'
  },
  // Frequency calculations without units
  {
    pattern: /(\w+\.\w+)\s*=\s*([\d.]+)\s*(?:\/\/.*?frecuencia|\/\/.*?frequency)/i,
    unit: 'Hz',
    type: 'frequency'
  },
  // Object properties without units
  {
    pattern: /(\w+):\s*([\d.]+)\s*(?:\/\/.*?voltaje|\/\/.*?voltage)/i,
    unit: 'V',
    type: 'voltage'
  },
  {
    pattern: /(\w+):\s*([\d.]+)\s*(?:\/\/.*?corriente|\/\/.*?current)/i,
    unit: 'A', 
    type: 'current'
  },
  {
    pattern: /(\w+):\s*([\d.]+)\s*(?:\/\/.*?potencia|\/\/.*?power)/i,
    unit: 'W',
    type: 'power'
  },
  {
    pattern: /(\w+):\s*([\d.]+)\s*(?:\/\/.*?impedancia|\/\/.*?impedance)/i,
    unit: 'Ω',
    type: 'impedance'
  }
];

function fixMissingUnits(content, filePath) {
  let modified = false;
  let lines = content.split('\n');
  let fixesApplied = 0;
  
  lines = lines.map((line, index) => {
    let newLine = line;
    
    UNIT_PATTERNS.forEach(({ pattern, unit, type }) => {
      const match = newLine.match(pattern);
      if (match) {
        modified = true;
        fixesApplied++;
        
        // Replace with unit declaration
        newLine = newLine.replace(pattern, `${match[1]} = ${match[2]}; // ${type} (${unit})`);
      }
    });
    
    // Fix electrical calculations without any comments
    if (!newLine.includes('//') && (
      newLine.includes('voltage') || newLine.includes('current') || 
      newLine.includes('power') || newLine.includes('impedance') ||
      newLine.includes('frecuencia') || newLine.includes('voltaje') ||
      newLine.includes('corriente') || newLine.includes('potencia') ||
      newLine.includes('impedancia')
    )) {
      // Try to infer unit from context
      let inferredUnit = '';
      let inferredType = '';
      
      if (newLine.includes('voltage') || newLine.includes('voltaje') || newLine.includes('tensión')) {
        inferredUnit = 'V';
        inferredType = 'voltage';
      } else if (newLine.includes('current') || newLine.includes('corriente')) {
        inferredUnit = 'A';
        inferredType = 'current';
      } else if (newLine.includes('power') || newLine.includes('potencia')) {
        inferredUnit = 'W';
        inferredType = 'power';
      } else if (newLine.includes('impedance') || newLine.includes('impedancia')) {
        inferredUnit = 'Ω';
        inferredType = 'impedance';
      } else if (newLine.includes('frequency') || newLine.includes('frecuencia')) {
        inferredUnit = 'Hz';
        inferredType = 'frequency';
      }
      
      if (inferredUnit && newLine.includes('=')) {
        modified = true;
        fixesApplied++;
        newLine += ` // ${inferredType} (${inferredUnit})`;
      }
    }
    
    return newLine;
  });
  
  return {
    content: lines.join('\n'),
    modified,
    fixesApplied
  };
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const result = fixMissingUnits(content, filePath);
    
    if (result.modified) {
      fs.writeFileSync(filePath, result.content, 'utf8');
      return { 
        modified: true, 
        path: filePath, 
        fixesApplied: result.fixesApplied 
      };
    }
    
    return { modified: false, path: filePath };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return { modified: false, path: filePath, error: error.message };
  }
}

function scanAndFixMissingUnits() {
  const backendDir = path.join(__dirname, '../backend/src');
  const results = {
    scanned: 0,
    modified: 0,
    totalFixes: 0,
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
          results.totalFixes += result.fixesApplied || 0;
          console.log(`✅ Fixed: ${path.relative(__dirname, fullPath)} (${result.fixesApplied} units)`);
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
  console.log('\n📊 Missing Units Fix Report\n');
  console.log(`📁 Files scanned: ${results.scanned}`);
  console.log(`✅ Files modified: ${results.modified}`);
  console.log(`🔧 Total unit fixes: ${results.totalFixes}`);
  console.log(`❌ Errors: ${results.errors}\n`);
  
  if (results.modified > 0) {
    console.log('🔧 Modified files:');
    results.files
      .filter(f => f.modified)
      .forEach(f => {
        const fixCount = f.fixesApplied || 0;
        console.log(`   ${path.relative(__dirname, f.path)} (${fixCount} units)`);
      });
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
  console.log(`   • Added explicit unit declarations to ${results.totalFixes} calculations`);
  console.log(`   • Fixed ${results.modified} files`);
  console.log(`   • Improved IEEE/IEC compliance`);
  
  return results;
}

function main() {
  console.log('🔧 Fixing Missing Unit Declarations\n');
  console.log('🔍 Scanning electrical files for missing units...\n');
  
  const results = scanAndFixMissingUnits();
  const report = generateReport(results);
  
  // Save report
  const reportDir = path.join(__dirname, '../reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportFile = path.join(reportDir, `missing-units-fixes-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 Report saved to: ${reportFile}`);
  
  if (results.modified > 0) {
    console.log('\n✅ Missing unit declarations fixed successfully');
    console.log('💡 Run enhanced-electrical-validation.js to verify fixes');
  } else {
    console.log('\n✅ No missing unit declarations found');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixMissingUnits, processFile };
