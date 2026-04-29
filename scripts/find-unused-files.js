/**
 * find-unused-files.js - Professional unused file detector
 * 
 * Responsibility: Detect files that are never imported/used in the codebase
 * Safety: Only reports, never deletes automatically
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const BACKEND_SRC = path.join(ROOT, 'backend', 'src');

// Directories to ignore
const IGNORE_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.vscode',
  '_duplicates_backup',
  '_unused_backup'
];

// Valid file extensions to analyze
const VALID_EXT = ['.js', '.ts', '.jsx', '.tsx'];

// Entry point patterns (always considered used)
const ENTRY_PATTERNS = [
  /index\.(js|ts)$/,
  /app\.(js|ts)$/,
  /server\.(js|ts)$/,
  /main\.(js|ts)$/,
  /cli\.(js|ts)$/,
  /worker\.(js|ts)$/
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

      if (IGNORE_DIRS.some(d => full.includes(d))) return;

      if (fs.statSync(full).isDirectory()) {
        walk(full, files);
      } else {
        const ext = path.extname(full);
        if (VALID_EXT.includes(ext)) {
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
 * Extract import/require statements from file content
 * @param {string} content - File content
 * @returns {Array} List of import paths
 */
function extractImports(content) {
  const imports = [];

  // require() pattern
  const requireRegex = /require\(['"`](.*?)['"`]\)/g;
  // ES6 import pattern
  const importRegex = /import\s+.*?\s+from\s+['"`](.*?)['"`]/g;
  // Dynamic import pattern
  const dynamicImportRegex = /import\(['"`](.*?)['"`]\)/g;

  let match;

  while ((match = requireRegex.exec(content))) {
    imports.push(match[1]);
  }

  while ((match = importRegex.exec(content))) {
    imports.push(match[1]);
  }

  while ((match = dynamicImportRegex.exec(content))) {
    imports.push(match[1]);
  }

  return imports;
}

/**
 * Resolve import path to absolute file path
 * @param {string} baseFile - File containing the import
 * @param {string} importPath - Import statement path
 * @returns {string|null} Resolved absolute path or null
 */
function resolveImport(baseFile, importPath) {
  // Skip non-relative imports (node_modules, etc.)
  if (!importPath.startsWith('.') && !importPath.startsWith('@/')) return null;

  const baseDir = path.dirname(baseFile);

  // Handle @/ alias (common in Node.js projects)
  let resolvedBase = baseDir;
  if (importPath.startsWith('@/')) {
    // Try to resolve from backend/src root
    resolvedBase = BACKEND_SRC;
    importPath = importPath.replace('@/', './');
  }

  const possiblePaths = [
    importPath,
    importPath + '.js',
    importPath + '.ts',
    importPath + '.jsx',
    importPath + '.tsx',
    path.join(importPath, 'index.js'),
    path.join(importPath, 'index.ts')
  ];

  for (const p of possiblePaths) {
    const full = path.resolve(resolvedBase, p);
    if (fs.existsSync(full)) return full;
  }

  return null;
}

/**
 * Check if file is an entry point
 * @param {string} filePath - File path
 * @returns {boolean} True if entry point
 */
function isEntryPoint(filePath) {
  const basename = path.basename(filePath);
  return ENTRY_PATTERNS.some(pattern => pattern.test(basename));
}

/**
 * Check if file might be dynamically required
 * @param {string} filePath - File path
 * @returns {boolean} True if potentially dynamic
 */
function isPotentiallyDynamic(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Check for dynamic require patterns
  return content.includes('require(') && !content.includes('require(\'');
}

/**
 * Main unused file detection function
 */
function findUnused() {
  console.log('🔍 Scanning for unused files...\n');

  // Get all JavaScript/TypeScript files
  const allFiles = walk(BACKEND_SRC);
  console.log(`📁 Found ${allFiles.length} source files\n`);

  // Track used files
  const usedFiles = new Set();
  const unresolvedImports = [];

  // Analyze each file
  allFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const imports = extractImports(content);

      imports.forEach(importPath => {
        const resolved = resolveImport(file, importPath);
        if (resolved) {
          usedFiles.add(resolved);
        } else if (importPath.startsWith('.') || importPath.startsWith('@/')) {
          // Track unresolved local imports
          unresolvedImports.push({
            from: file,
            import: importPath
          });
        }
      });
    } catch (err) {
      console.log(`⚠️ Error reading: ${file}`);
    }
  });

  console.log(`🔗 Found ${usedFiles.size} imported files`);
  console.log(`⚠️ ${unresolvedImports.length} unresolved imports\n`);

  // Mark entry points as used
  const entryPoints = allFiles.filter(f => isEntryPoint(f));
  entryPoints.forEach(f => usedFiles.add(f));
  console.log(`🚪 ${entryPoints.length} entry points protected\n`);

  // Find unused files
  const unusedFiles = allFiles.filter(f => !usedFiles.has(f));

  // Categorize unused files
  const categories = {
    controllers: [],
    routes: [],
    workers: [],
    services: [],
    utils: [],
    models: [],
    config: [],
    other: []
  };

  unusedFiles.forEach(file => {
    const normalized = file.replace(/\\/g, '/');

    if (normalized.includes('controller')) categories.controllers.push(file);
    else if (normalized.includes('route')) categories.routes.push(file);
    else if (normalized.includes('worker')) categories.workers.push(file);
    else if (normalized.includes('service')) categories.services.push(file);
    else if (normalized.includes('util')) categories.utils.push(file);
    else if (normalized.includes('model')) categories.models.push(file);
    else if (normalized.includes('config')) categories.config.push(file);
    else categories.other.push(file);
  });

  // Display results
  console.log('=' .repeat(60));
  console.log('🧟 UNUSED FILES DETECTED');
  console.log('=' .repeat(60));
  console.log(`Total: ${unusedFiles.length} files\n`);

  Object.entries(categories).forEach(([category, files]) => {
    if (files.length > 0) {
      console.log(`\n📂 ${category.toUpperCase()} (${files.length}):`);
      files.forEach(f => {
        const relative = path.relative(ROOT, f);
        console.log(`  ❌ ${relative}`);
      });
    }
  });

  // Check for potentially dynamic imports
  console.log('\n\n⚠️  POTENTIALLY DYNAMIC IMPORTS (manual review needed):');
  const dynamicCandidates = unusedFiles.filter(f => {
    try {
      return isPotentiallyDynamic(f);
    } catch {
      return false;
    }
  });

  if (dynamicCandidates.length > 0) {
    console.log(`\n${dynamicCandidates.length} files may be used dynamically:\n`);
    dynamicCandidates.forEach(f => {
      console.log(`  ⚡ ${path.relative(ROOT, f)}`);
    });
  } else {
    console.log('\n  ✅ None detected');
  }

  // Unresolved imports
  if (unresolvedImports.length > 0) {
    console.log('\n\n⚠️  UNRESOLVED IMPORTS (may indicate broken references):');
    console.log(`\n${unresolvedImports.length} imports could not be resolved:\n`);
    unresolvedImports.slice(0, 10).forEach(({ from, import: imp }) => {
      console.log(`  ❓ ${path.relative(ROOT, from)} → "${imp}"`);
    });
    if (unresolvedImports.length > 10) {
      console.log(`  ... and ${unresolvedImports.length - 10} more`);
    }
  }

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: allFiles.length,
      usedFiles: usedFiles.size,
      unusedFiles: unusedFiles.length,
      entryPoints: entryPoints.length,
      unresolvedImports: unresolvedImports.length
    },
    categories,
    unusedFiles: unusedFiles.map(f => path.relative(ROOT, f)),
    dynamicCandidates: dynamicCandidates.map(f => path.relative(ROOT, f)),
    unresolvedImports: unresolvedImports.map(({ from, import: imp }) => ({
      from: path.relative(ROOT, from),
      import: imp
    }))
  };

  const reportPath = path.join(ROOT, 'unused-files-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total files scanned: ${allFiles.length}`);
  console.log(`Used files: ${usedFiles.size}`);
  console.log(`Unused files: ${unusedFiles.length}`);
  console.log(`Entry points protected: ${entryPoints.length}`);
  console.log(`Potential dynamic imports: ${dynamicCandidates.length}`);
  console.log('='.repeat(60));

  console.log(`\n📝 Report saved: ${reportPath}`);

  console.log('\n⚠️  IMPORTANT - Before removing files:');
  console.log('  1. Review unused-files-report.json');
  console.log('  2. Check for dynamic imports (require(variable))');
  console.log('  3. Verify tests don\'t use them');
  console.log('  4. Make backup before deletion');
  console.log('  5. Run tests after removal');

  console.log('\n✅ Scan complete');
}

// Run if called directly
if (require.main === module) {
  findUnused();
}

module.exports = { findUnused, extractImports, resolveImport };
