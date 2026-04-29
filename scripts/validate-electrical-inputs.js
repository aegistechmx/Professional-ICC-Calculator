#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Validates electrical calculation inputs for consistency and correctness
 */

const ELECTRICAL_UNITS = {
  voltage: ['V', 'kV', 'MV', 'mV'],
  current: ['A', 'kA', 'mA'],
  power: ['W', 'kW', 'MW', 'VA', 'kVA', 'MVA'],
  impedance: ['Ω', 'kΩ', 'MΩ', 'pu'],
  frequency: ['Hz', 'kHz', 'MHz'],
  angle: ['deg', 'rad', 'grad']
};

const VALID_RANGES = {
  voltage: { min: 0, max: 1000000 }, // 0V to 1MV
  current: { min: 0, max: 100000 },  // 0A to 100kA
  frequency: { min: 0, max: 1000 },   // 0Hz to 1kHz
  angle: { min: -360, max: 360 }     // -360° to 360°
};

function validateValue(value, type, unit) {
  const numValue = parseFloat(value);
  
  if (isNaN(numValue)) {
    return { valid: false, error: `Invalid numeric value: ${value}` };
  }
  
  if (VALID_RANGES[type]) {
    const range = VALID_RANGES[type];
    if (numValue < range.min || numValue > range.max) {
      return { 
        valid: false, 
        error: `Value ${numValue} ${unit} outside valid range [${range.min}, ${range.max}]` 
      };
    }
  }
  
  return { valid: true };
}

function validateUnit(unit, type) {
  const validUnits = ELECTRICAL_UNITS[type];
  if (!validUnits) {
    return { valid: false, error: `Unknown electrical type: ${type}` };
  }
  
  if (!validUnits.includes(unit)) {
    return { 
      valid: false, 
      error: `Invalid unit ${unit} for type ${type}. Valid units: ${validUnits.join(', ')}` 
    };
  }
  
  return { valid: true };
}

function scanElectricalFiles() {
  const backendDir = path.join(__dirname, '../backend/src');
  const results = {
    scanned: 0,
    errors: [],
    warnings: []
  };
  
  function scanDirectory(dir) {
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
      
      // Look for electrical calculations and validations
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // Check for hardcoded electrical values without units
        const hardcodedValues = line.match(/(\d+\.?\d*)\s*(V|kV|A|kA|W|kW|VA|kVA|Ω|Hz|deg|rad)/g);
        
        if (hardcodedValues) {
          hardcodedValues.forEach(value => {
            const match = value.match(/(\d+\.?\d*)\s*(V|kV|A|kA|W|kW|VA|kVA|Ω|Hz|deg|rad)/);
            if (match) {
              const [, numValue, unit] = match;
              
              // Determine type from unit
              let type = null;
              for (const [key, units] of Object.entries(ELECTRICAL_UNITS)) {
                if (units.includes(unit)) {
                  type = key;
                  break;
                }
              }
              
              if (type) {
                const unitValidation = validateUnit(unit, type);
                const valueValidation = validateValue(numValue, type, unit);
                
                if (!unitValidation.valid) {
                  results.errors.push({
                    file: path.relative(__dirname, filePath),
                    line: index + 1,
                    error: unitValidation.error
                  });
                }
                
                if (!valueValidation.valid) {
                  results.errors.push({
                    file: path.relative(__dirname, filePath),
                    line: index + 1,
                    error: valueValidation.error
                  });
                }
              }
            }
          });
        }
        
        // Check for potential precision issues
        if (line.includes('Math.') || line.includes('parseFloat')) {
          // Look for electrical calculations that might have precision issues
          if (line.includes('voltage') || line.includes('current') || line.includes('power')) {
            results.warnings.push({
              file: path.relative(__dirname, filePath),
              line: index + 1,
              warning: 'Electrical calculation detected - ensure proper precision handling'
            });
          }
        }
      });
      
    } catch (error) {
      results.errors.push({
        file: path.relative(__dirname, filePath),
        error: `Failed to read file: ${error.message}`
      });
    }
  }
  
  if (fs.existsSync(backendDir)) {
    scanDirectory(backendDir);
  }
  
  return results;
}

function main() {
  console.log('🔍 Validating Electrical Calculation Inputs...\n');
  
  const results = scanElectricalFiles();
  
  console.log(`📊 Scan Results:`);
  console.log(`   Files scanned: ${results.scanned}`);
  console.log(`   Errors found: ${results.errors.length}`);
  console.log(`   Warnings: ${results.warnings.length}\n`);
  
  if (results.errors.length > 0) {
    console.log('❌ Errors:');
    results.errors.forEach(error => {
      console.log(`   ${error.file}:${error.line || '?'} - ${error.error}`);
    });
    console.log();
  }
  
  if (results.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    results.warnings.forEach(warning => {
      console.log(`   ${warning.file}:${warning.line} - ${warning.warning}`);
    });
    console.log();
  }
  
  if (results.errors.length === 0 && results.warnings.length === 0) {
    console.log('✅ All electrical inputs validated successfully!');
  } else {
    console.log('⚠️  Validation completed with issues found.');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateValue, validateUnit, scanElectricalFiles };
