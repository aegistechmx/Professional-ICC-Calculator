/**
 * Professional ICC Calculator - Comprehensive Variable Debug Analysis
 * Script para analizar y depurar todas las variables del sistema
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 COMPREHENSIVE VARIABLE DEBUG ANALYSIS');
console.log('==========================================');

// === FRONTEND VARIABLE ANALYSIS ===
console.log('\n📱 FRONTEND VARIABLES ANALYSIS');
console.log('-------------------------------');

const frontendDir = path.join(__dirname, '../frontend/src');

// Function to analyze variables in a file
function analyzeVariables(filePath, category) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    let variables = {
      declared: [],
      used: [],
      unused: [],
      imports: [],
      exports: []
    };

    let inComment = false;
    let lineNumber = 0;

    lines.forEach(line => {
      lineNumber++;
      const trimmedLine = line.trim();

      // Skip comments
      if (trimmedLine.startsWith('/*')) inComment = true;
      if (trimmedLine.endsWith('*/')) inComment = false;
      if (inComment || trimmedLine.startsWith('//')) return;

      // Find variable declarations
      const varDeclarations = line.match(/(?:const|let|var)\s+(\w+)/g);
      if (varDeclarations) {
        varDeclarations.forEach(decl => {
          const varName = decl.replace(/(?:const|let|var)\s+/, '');
          variables.declared.push({ name: varName, line: lineNumber, type: decl.split(' ')[0] });
        });
      }

      // Find destructured variables
      const destructuring = line.match(/(?:const|let|var)\s+\{([^}]+)\}/);
      if (destructuring) {
        const vars = destructuring[1].split(',').map(v => v.trim().split(':')[0]);
        vars.forEach(varName => {
          if (varName) {
            variables.declared.push({ name: varName, line: lineNumber, type: 'destructured' });
          }
        });
      }

      // Find imports
      const imports = line.match(/import.*\{([^}]+)\}/);
      if (imports) {
        const importedVars = imports[1].split(',').map(v => v.trim());
        importedVars.forEach(varName => {
          variables.imports.push({ name: varName, line: lineNumber });
        });
      }

      // Find exports
      const exports = line.match(/export\s+(?:const|let|var)\s+(\w+)/);
      if (exports) {
        variables.exports.push({ name: exports[1], line: lineNumber });
      }
    });

    return variables;
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error.message);
    return null;
  }
}

// Analyze key frontend components
const keyComponents = [
  'components/ElectricalEditor.jsx',
  'components/TCCPanel.jsx',
  'components/AutoCoordinationPanel.jsx',
  'components/AutoTuningPanel.jsx',
  'components/FaultAnimationLayer.jsx',
  'components/FaultAnimationExample.jsx',
  'components/CoordinationPanel.jsx',
  'components/CoordinationStatusPanel.jsx',
  'components/ElectricalTooltip.jsx',
  'hooks/useAutoCalculate.js',
  'hooks/useGraphStore.js',
  'store/graphStore.js'
];

console.log('\n📊 COMPONENT VARIABLE ANALYSIS:');
console.log('------------------------------');

keyComponents.forEach(component => {
  const filePath = path.join(frontendDir, component);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const analysis = analyzeVariables(filePath, 'frontend');
    if (analysis) {
      console.log(`\n🔧 ${component}:`);
      console.log(`   Declared: ${analysis.declared.length}`);
      console.log(`   Imports: ${analysis.imports.length}`);
      console.log(`   Exports: ${analysis.exports.length}`);

      // Show potential issues
      const unusedImports = analysis.imports.filter(imp =>
        !analysis.declared.some(dec => dec.name === imp.name) &&
        !content.includes(imp.name + '(') &&
        !content.includes(imp.name + '.') &&
        !content.includes('<' + imp.name)
      );

      if (unusedImports.length > 0) {
        console.log(`   ⚠️  Unused imports: ${unusedImports.map(u => u.name).join(', ')}`);
      }
    }
  }
});

// === BACKEND VARIABLE ANALYSIS ===
console.log('\n🖥️  BACKEND VARIABLES ANALYSIS');
console.log('------------------------------');

const backendDir = path.join(__dirname, '../backend/src');

const backendFiles = [
  'application/icc.service.js',
  'application/protection.service.js',
  'domain/calculations/shortCircuit.js',
  'domain/calculations/iccFormula.js',
  'infrastructure/database/icc.repository.js',
  'interfaces/api/icc.controller.js'
];

console.log('\n📊 BACKEND SERVICE ANALYSIS:');
console.log('---------------------------');

backendFiles.forEach(service => {
  const filePath = path.join(backendDir, service);
  if (fs.existsSync(filePath)) {
    const analysis = analyzeVariables(filePath, 'backend');
    if (analysis) {
      console.log(`\n🔧 ${service}:`);
      console.log(`   Declared: ${analysis.declared.length}`);
      console.log(`   Imports: ${analysis.imports.length}`);
      console.log(`   Exports: ${analysis.exports.length}`);
    }
  }
});

// === CRITICAL SYSTEM VARIABLES ===
console.log('\n🎯 CRITICAL SYSTEM VARIABLES');
console.log('----------------------------');

// Check for critical ICC calculation variables
const iccFormulaPath = path.join(backendDir, 'domain/calculations/iccFormula.js');
if (fs.existsSync(iccFormulaPath)) {
  const content = fs.readFileSync(iccFormulaPath, 'utf8');
  const criticalVars = ['V', 'Z', 'kVA', 'Isc', 'method', 'precision'];

  console.log('\n⚡ ICC Formula Variables:');
  criticalVars.forEach(varName => {
    const regex = new RegExp(`\\b${varName}\\b`, 'g');
    const matches = content.match(regex);
    console.log(`   ${varName}: ${matches ? matches.length : 0} occurrences`);
  });
}

// Check for React state variables
console.log('\n🔄 React State Variables:');
keyComponents.forEach(component => {
  const filePath = path.join(frontendDir, component);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const useStateMatches = content.match(/useState\([^)]+\)/g) || [];
    const useReducerMatches = content.match(/useReducer\([^)]+\)/g) || [];

    if (useStateMatches.length > 0 || useReducerMatches.length > 0) {
      console.log(`   ${component}:`);
      console.log(`     useState: ${useStateMatches.length}`);
      console.log(`     useReducer: ${useReducerMatches.length}`);
    }
  }
});

// === STORE VARIABLES ===
console.log('\n🏪 STORE VARIABLES ANALYSIS');
console.log('-------------------------');

const storePath = path.join(frontendDir, 'store/graphStore.js');
if (fs.existsSync(storePath)) {
  const content = fs.readFileSync(storePath, 'utf8');

  // Find store state variables
  const stateMatches = content.match(/(?:const|let|var)\s+(\w+)\s*=/g) || [];
  const functionMatches = content.match(/(?:const|function)\s+(\w+)\s*\(/g) || [];

  console.log('\n📊 Graph Store Analysis:');
  console.log(`   State variables: ${stateMatches.length}`);
  console.log(`   Functions: ${functionMatches.length}`);

  // Show key store variables
  const keyStoreVars = ['nodes', 'edges', 'results', 'simulation', 'loading'];
  keyStoreVars.forEach(varName => {
    const regex = new RegExp(`\\b${varName}\\b`, 'g');
    const matches = content.match(regex);
    console.log(`   ${varName}: ${matches ? matches.length : 0} occurrences`);
  });
}

// === MEMORY LEAK DETECTION ===
console.log('\n🔍 MEMORY LEAK DETECTION');
console.log('---------------------');

keyComponents.forEach(component => {
  const filePath = path.join(frontendDir, component);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Check for potential memory leaks
    const addEventListener = content.match(/addEventListener/g) || [];
    const setInterval = content.match(/setInterval/g) || [];
    const setTimeout = content.match(/setTimeout/g) || [];
    const removeEventListener = content.match(/removeEventListener/g) || [];
    const clearInterval = content.match(/clearInterval/g) || [];
    const clearTimeout = content.match(/clearTimeout/g) || [];

    if (addEventListener.length > removeEventListener.length ||
      setInterval.length > clearInterval.length ||
      setTimeout.length > clearTimeout.length) {
      console.log(`\n⚠️  Potential memory leaks in ${component}:`);
      console.log(`   addEventListener: ${addEventListener.length}, removeEventListener: ${removeEventListener.length}`);
      console.log(`   setInterval: ${setInterval.length}, clearInterval: ${clearInterval.length}`);
      console.log(`   setTimeout: ${setTimeout.length}, clearTimeout: ${clearTimeout.length}`);
    }
  }
});

// === VARIABLE SCOPE ANALYSIS ===
console.log('\n🌍 VARIABLE SCOPE ANALYSIS');
console.log('------------------------');

keyComponents.forEach(component => {
  const filePath = path.join(frontendDir, component);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Check for global variables
    const globalVars = content.match(/(?:window|global)\.(\w+)/g) || [];

    // Check for var declarations (function scope)
    const varDeclarations = content.match(/\bvar\s+(\w+)/g) || [];

    // Check for let/const (block scope)
    const letDeclarations = content.match(/\blet\s+(\w+)/g) || [];
    const constDeclarations = content.match(/\bconst\s+(\w+)/g) || [];

    if (globalVars.length > 0 || varDeclarations.length > 0) {
      console.log(`\n🔍 ${component} scope analysis:`);
      console.log(`   Global variables: ${globalVars.length}`);
      console.log(`   var declarations: ${varDeclarations.length}`);
      console.log(`   let declarations: ${letDeclarations.length}`);
      console.log(`   const declarations: ${constDeclarations.length}`);
    }
  }
});

console.log('\n✅ VARIABLE DEBUG ANALYSIS COMPLETE');
console.log('====================================');

// Generate summary report
const summary = {
  timestamp: new Date().toISOString(),
  frontendComponents: keyComponents.length,
  backendServices: backendFiles.length,
  totalFiles: keyComponents.length + backendFiles.length,
  criticalIssues: [],
  recommendations: []
};

// Add recommendations based on analysis
summary.recommendations.push(
  'Review unused imports and remove them',
  'Check for potential memory leaks in event listeners',
  'Ensure proper cleanup in useEffect hooks',
  'Verify variable scope and lifetime',
  'Monitor state variable usage patterns'
);

console.log('\n📋 SUMMARY REPORT:');
console.log('-----------------');
console.log(`Components analyzed: ${summary.frontendComponents}`);
console.log(`Backend services analyzed: ${summary.backendServices}`);
console.log(`Total files: ${summary.totalFiles}`);
console.log(`Recommendations: ${summary.recommendations.length}`);

console.log('\n🎯 RECOMMENDATIONS:');
summary.recommendations.forEach((rec, index) => {
  console.log(`   ${index + 1}. ${rec}`);
});

console.log('\n🔧 DEBUG COMPLETE - Review output above for detailed analysis');
