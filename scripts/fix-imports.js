/**
 * fix-imports.js - Professional import path fixer
 * 
 * Responsibility: Fix broken import paths after architecture reorganization
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const BACKEND_SRC = path.join(ROOT, 'backend', 'src');

// Import path mappings (old → new)
const IMPORT_MAPPINGS = [
  // Application layer mappings
  { from: '@/app/contingency/runSCOPF', to: '@/application/services/powerflow' },
  { from: '@/app/opf/runOPF', to: '@/application/services/opf' },
  { from: '@/app/powerflow/runPowerFlow', to: '@/application/services/powerflow' },
  { from: '@/app/simulation/runSimulation', to: '@/application/services/simulation' },
  { from: '@/app/services/simulation.service', to: '@/application/services/simulation' },
  
  // Infrastructure mappings
  { from: '@/infrastructure/logger/logger', to: '@/shared/utils/logging' },
  { from: '@/infrastructure/workers/workerPool', to: '@/infrastructure/workers/workerPool' },
  
  // Core mappings
  { from: '@/core/powerflow/solver', to: '@/core/powerflow/solvers' },
  { from: '@/core/powerflow/newton/solver', to: '@/core/powerflow/solvers' },
  { from: '@/core/powerflow/fastDecoupled', to: '@/core/powerflow/solvers' },
  
  // Protection mappings
  { from: '../../modules/protections/proteccion.service', to: '@/application/services/protection' },
  { from: '../../middleware/errorHandler', to: '@/api/middlewares/errorHandler' }
];

/**
 * Walk directory recursively
 * @param {string} dir - Starting directory
 * @param {Array} files - Accumulator
 * @returns {Array} List of file paths
 */
function walk(dir, files = []) {
  try {
    const items = fs.readdirSync(dir);

    items.forEach(item => {
      const full = path.join(dir, item);

      if (full.includes('node_modules') || full.includes('.git')) return;

      if (fs.statSync(full).isDirectory()) {
        walk(full, files);
      } else {
        if (full.endsWith('.js') || full.endsWith('.ts')) {
          files.push(full);
        }
      }
    });
  } catch (err) {
    // Skip directories we can't access
  }

  return files;
}

/**
 * Fix imports in a file
 * @param {string} filePath - File path
 * @returns {Object} Fix results
 */
function fixImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changes = 0;

    IMPORT_MAPPINGS.forEach(({ from, to }) => {
      // Replace require() patterns
      const requireRegex = new RegExp(`require\\(['"]${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\)`, 'g');
      const requireMatches = content.match(requireRegex);
      if (requireMatches) {
        content = content.replace(requireRegex, `require('${to}')`);
        changes += requireMatches.length;
      }

      // Replace ES6 import patterns
      const importRegex = new RegExp(`from\\s+['"]${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
      const importMatches = content.match(importRegex);
      if (importMatches) {
        content = content.replace(importRegex, `from '${to}'`);
        changes += importMatches.length;
      }
    });

    if (changes > 0) {
      fs.writeFileSync(filePath, content);
      return { file: filePath, changes, success: true };
    }

    return { file: filePath, changes: 0, success: true };
  } catch (err) {
    return { file: filePath, changes: 0, success: false, error: err.message };
  }
}

/**
 * Main fix function
 */
function fixImports() {
  console.log('🔧 Fixing broken import paths...\n');

  // Get all JavaScript/TypeScript files
  const files = walk(BACKEND_SRC);
  console.log(`📁 Found ${files.length} files to check\n`);

  const results = {
    total: files.length,
    fixed: 0,
    errors: 0,
    details: []
  };

  files.forEach(file => {
    const result = fixImportsInFile(file);
    results.details.push(result);

    if (result.changes > 0) {
      results.fixed++;
      console.log(`✅ Fixed ${result.changes} imports in: ${path.relative(ROOT, file)}`);
    }

    if (!result.success) {
      results.errors++;
      console.log(`⚠️ Error in: ${path.relative(ROOT, file)} - ${result.error}`);
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPORT FIX SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total files checked: ${results.total}`);
  console.log(`Files with fixes: ${results.fixed}`);
  console.log(`Errors: ${results.errors}`);
  console.log('='.repeat(60));

  if (results.fixed > 0) {
    console.log('\n✅ Import paths fixed successfully!');
    console.log('\n📋 Next steps:');
    console.log('  1. Run: npm run dev');
    console.log('  2. Check for any remaining errors');
    console.log('  3. Re-run: node scripts/find-unused-files.js');
  } else {
    console.log('\n✅ No imports needed fixing!');
  }
}

// Run if called directly
if (require.main === module) {
  fixImports();
}

module.exports = { fixImports, fixImportsInFile };
