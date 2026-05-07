/**
 * verify-voltage-update.js - Verify 220V to 480V voltage default changes
 */

const fs = require('fs');
const path = require('path');

// Files to check for voltage updates
const filesToCheck = [
  'backend/src/services/icc.service.js',
  'backend/src/shared/utils/electricalUtils.js',
  'backend/src/engine/fullAnalysis.js',
  'backend/src/application/icc.service.js',
  'backend/src/interfaces/controllers/icc.pure.controller.js',
  'backend/src/server.js',
  'backend/src/domain/services/faultSimulation.domain.js',
  'backend/tests/icc.service.test.js',
  'backend/tests/icc.service.fixed.test.js'
];

// Expected patterns for each file
const fileExpectations = {
  'backend/src/services/icc.service.js': [
    { regex: /const V = input\.V \|\| input\.voltage \|\| 480;?/, shouldExist: true, name: 'V = input.V || input.voltage || 480' }
  ],
  'backend/src/shared/utils/electricalUtils.js': [
    // This file may not have voltage defaults - utility functions only
  ],
  'backend/src/engine/fullAnalysis.js': [
    { regex: /const baseVoltage = bus\.voltage \|\| 480;?/, shouldExist: true, name: 'baseVoltage = bus.voltage || 480' }
  ],
  'backend/src/application/icc.service.js': [
    // This file uses passed parameters, may not have defaults
  ],
  'backend/src/interfaces/controllers/icc.pure.controller.js': [
    { regex: /const DEFAULT_VOLTAGE = 480;?/, shouldExist: true, name: 'DEFAULT_VOLTAGE = 480' },
    { regex: /const voltage = input\.V \|\| input\.voltage \|\| DEFAULT_VOLTAGE;?/, shouldExist: true, name: 'voltage fallback uses DEFAULT_VOLTAGE' }
  ],
  'backend/src/server.js': [
    { regex: /const V = params\.voltage \|\| params\.V \|\| 480;?/, shouldExist: true, name: 'V = params.voltage || params.V || 480' },
    { regex: /const systemVoltage = 480;?/, shouldExist: true, name: 'systemVoltage = 480' }
  ],
  'backend/src/domain/services/faultSimulation.domain.js': [
    { regex: /V_base: node\.data\?\.voltaje \|\| 480,?/, shouldExist: true, name: 'V_base: node.data?.voltaje || 480' }
  ],
  'backend/tests/icc.service.test.js': [
    { regex: /expect\(result\)\.toHaveProperty\('voltage', 480\)/, shouldExist: true, name: 'test expects voltage 480' }
  ],
  'backend/tests/icc.service.fixed.test.js': [
    { regex: /expect\(result\)\.toHaveProperty\('voltage', 480\)/, shouldExist: true, name: 'test expects voltage 480' }
  ]
};

// Global patterns that should NOT exist in any file
const forbiddenPatterns = [
  { regex: /DEFAULT_VOLTAGE\s*=\s*220/, name: 'DEFAULT_VOLTAGE = 220' },
  { regex: /\|\|\s*220\b(?!\s*V)/, name: 'fallback || 220 (not followed by V)' }
];

function checkFile(filePath) {
  console.log(`\n🔍 Checking: ${filePath}`);

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let allPassed = true;

    // Check file-specific expectations
    const expectations = fileExpectations[filePath] || [];
    expectations.forEach(pattern => {
      const found = pattern.regex.test(content);

      if (pattern.shouldExist && !found) {
        console.log(`  ❌ Missing: ${pattern.name}`);
        allPassed = false;
      } else if (pattern.shouldExist && found) {
        console.log(`  ✅ Found: ${pattern.name}`);
      }
    });

    // Check forbidden patterns in all files
    forbiddenPatterns.forEach(pattern => {
      const found = pattern.regex.test(content);

      if (found) {
        console.log(`  ❌ Found unwanted: ${pattern.name}`);
        allPassed = false;
      }
    });

    if (allPassed) {
      console.log(`  ✅ All checks passed for ${path.basename(filePath)}`);
    }

    return allPassed;

  } catch (error) {
    console.log(`  ❌ Error reading file: ${error.message}`);
    return false;
  }
}

function main() {
  console.log('🔧 Verifying Voltage Update: 220V → 480V');
  console.log('==========================================');

  let totalFiles = 0;
  let passedFiles = 0;

  filesToCheck.forEach(filePath => {
    totalFiles++;
    if (checkFile(filePath)) {
      passedFiles++;
    }
  });

  console.log('\n📊 Summary:');
  console.log(`Total files checked: ${totalFiles}`);
  console.log(`Files passed: ${passedFiles}`);
  console.log(`Files failed: ${totalFiles - passedFiles}`);

  if (passedFiles === totalFiles) {
    console.log('\n✅ All voltage updates verified successfully!');
    process.exit(0);
  } else {
    console.log('\n❌ Some voltage updates need attention.');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkFile, main };
