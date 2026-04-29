/**
 * generate-architecture-insights.js - Professional architecture error detector
 * 
 * Responsibility: Visual detection of architectural issues and coupling problems
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const BACKEND_SRC = path.join(ROOT, 'backend', 'src');
const OUTPUT = path.join(ROOT, 'architecture-insights.dot');

// Directories to ignore
const IGNORE = ['node_modules', '.git', 'dist', 'build', 'coverage'];

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

      if (IGNORE.some(i => full.includes(i))) return;

      if (fs.statSync(full).isDirectory()) {
        walk(full, files);
      } else if (item.endsWith('.js')) {
        files.push(full);
      }
    });
  } catch (err) {
    // Skip directories we can't access
  }

  return files;
}

/**
 * Extract import statements from file content
 * @param {string} content - File content
 * @returns {Array} List of import paths
 */
function extractImports(content) {
  const regex = /require\(['"`](.*?)['"`]\)|import.*from\s+['"`](.*?)['"`]/g;
  const imports = [];
  let match;

  while ((match = regex.exec(content))) {
    imports.push(match[1] || match[2]);
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
  if (!importPath || !importPath.startsWith('.')) return null;

  const baseDir = path.dirname(baseFile);
  const full = path.resolve(baseDir, importPath);

  const options = [
    full,
    full + '.js',
    full + '.ts',
    path.join(full, 'index.js'),
    path.join(full, 'index.ts')
  ];

  return options.find(f => fs.existsSync(f)) || null;
}

/**
 * Analyze coupling and architectural issues
 * @param {Object} graph - Dependency graph
 * @param {Object} reverse - Reverse dependency graph
 * @returns {Object} Analysis results
 */
function analyzeArchitecture(graph, reverse) {
  const insights = {
    highCoupling: [],
    mediumCoupling: [],
    possibleDead: [],
    circularDependencies: [],
    godModules: [],
    architecturalViolations: []
  };

  // Analyze coupling
  Object.keys(graph).forEach(file => {
    const deps = graph[file].length;
    const usedBy = (reverse[file] || []).length;

    if (usedBy > 10) {
      insights.highCoupling.push({ file, usedBy, deps });
    } else if (usedBy > 5) {
      insights.mediumCoupling.push({ file, usedBy, deps });
    } else if (deps === 0 && usedBy === 0) {
      insights.possibleDead.push({ file });
    }
  });

  // Detect circular dependencies
  const visited = new Set();
  const recursionStack = new Set();

  function detectCycle(file, path = []) {
    if (recursionStack.has(file)) {
      const cycleStart = path.indexOf(file);
      insights.circularDependencies.push(path.slice(cycleStart));
      return true;
    }

    if (visited.has(file)) return false;

    visited.add(file);
    recursionStack.add(file);

    (graph[file] || []).forEach(dep => {
      detectCycle(dep, [...path, file]);
    });

    recursionStack.delete(file);
    return false;
  }

  Object.keys(graph).forEach(file => {
    if (!visited.has(file)) {
      detectCycle(file);
    }
  });

  // Detect God modules (high coupling + many dependencies)
  insights.godModules = insights.highCoupling.filter(item => item.deps > 5);

  // Detect architectural violations (wrong layer dependencies)
  Object.keys(graph).forEach(file => {
    graph[file].forEach(dep => {
      const fileLayer = getLayer(file);
      const depLayer = getLayer(dep);

      // Check for violations (should be: core -> application -> infrastructure)
      if (fileLayer === 'infrastructure' && depLayer === 'core') {
        insights.architecturalViolations.push({ file, dep, type: 'infra->core' });
      } else if (fileLayer === 'application' && depLayer === 'infrastructure') {
        insights.architecturalViolations.push({ file, dep, type: 'app->infra' });
      }
    });
  });

  return insights;
}

/**
 * Determine architectural layer of a file
 * @param {string} filePath - File path
 * @returns {string} Layer name
 */
function getLayer(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  
  if (normalized.includes('/core/')) return 'core';
  if (normalized.includes('/application/')) return 'application';
  if (normalized.includes('/infrastructure/')) return 'infrastructure';
  if (normalized.includes('/interfaces/')) return 'interfaces';
  if (normalized.includes('/shared/')) return 'shared';
  if (normalized.includes('/plugins/')) return 'plugins';
  
  return 'unknown';
}

/**
 * Generate Graphviz DOT file with insights
 */
function generate() {
  console.log('Analyzing architecture for insights...\n');

  const files = walk(BACKEND_SRC);
  console.log(`Found ${files.length} files to analyze`);

  const graph = {};
  const reverse = {};

  // Build dependency graph
  files.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const imports = extractImports(content);

      graph[file] = [];

      imports.forEach(importPath => {
        const resolved = resolveImport(file, importPath);
        if (resolved && files.includes(resolved)) {
          graph[file].push(resolved);

          if (!reverse[resolved]) reverse[resolved] = [];
          reverse[resolved].push(file);
        }
      });
    } catch (err) {
      // Skip files we can't read
    }
  });

  // Analyze architecture
  const insights = analyzeArchitecture(graph, reverse);

  console.log('\n=== ARCHITECTURE INSIGHTS ===');
  console.log(`High coupling files: ${insights.highCoupling.length}`);
  console.log(`Medium coupling files: ${insights.mediumCoupling.length}`);
  console.log(`Possible dead files: ${insights.possibleDead.length}`);
  console.log(`Circular dependencies: ${insights.circularDependencies.length}`);
  console.log(`God modules: ${insights.godModules.length}`);
  console.log(`Architectural violations: ${insights.architecturalViolations.length}`);

  // Generate DOT file
  let dot = `digraph G {
    rankdir=LR;
    splines=ortho;
    nodesep=0.5;
    fontname="Arial";
    fontsize=10;

    // Define styles for different issues
    node [shape=box style=filled fontcolor=white];

    // High coupling nodes (RED) - Used by >10 files
    node [fillcolor="#ef4444"];
  `;

  // Add high coupling nodes
  insights.highCoupling.forEach(item => {
    const name = path.basename(item.file);
    dot += `    "${item.file}" [label="${name}\\n(used by ${item.usedBy})"];\n`;
  });

  dot += `
    // Medium coupling nodes (ORANGE) - Used by 5-10 files
    node [fillcolor="#f97316"];
  `;

  // Add medium coupling nodes
  insights.mediumCoupling.forEach(item => {
    const name = path.basename(item.file);
    dot += `    "${item.file}" [label="${name}\\n(used by ${item.usedBy})"];\n`;
  });

  dot += `
    // Possible dead nodes (GRAY) - No dependencies and not used
    node [fillcolor="#6b7280"];
  `;

  // Add possible dead nodes
  insights.possibleDead.forEach(item => {
    const name = path.basename(item.file);
    dot += `    "${item.file}" [label="${name}\\n(unused)"];\n`;
  });

  dot += `
    // Normal nodes (BLUE) - Healthy dependencies
    node [fillcolor="#3b82f6"];
  `;

  // Add normal nodes
  files.forEach(file => {
    const isHighCoupling = insights.highCoupling.some(item => item.file === file);
    const isMediumCoupling = insights.mediumCoupling.some(item => item.file === file);
    const isDead = insights.possibleDead.some(item => item.file === file);

    if (!isHighCoupling && !isMediumCoupling && !isDead) {
      const name = path.basename(file);
      const usedBy = (reverse[file] || []).length;
      dot += `    "${file}" [label="${name}\\n(used by ${usedBy})"];\n`;
    }
  });

  // Add dependencies
  Object.keys(graph).forEach(file => {
    graph[file].forEach(dep => {
      // Highlight architectural violations
      const fileLayer = getLayer(file);
      const depLayer = getLayer(dep);
      let edgeStyle = '';

      if (fileLayer === 'infrastructure' && depLayer === 'core') {
        edgeStyle = ' [color=red style=dashed label="viol"]'; // Infrastructure shouldn't depend on core
      } else if (fileLayer === 'application' && depLayer === 'infrastructure') {
        edgeStyle = ' [color=orange style=dashed label="viol"]'; // Application shouldn't depend on infrastructure
      }

      dot += `    "${file}" -> "${dep}"${edgeStyle};\n`;
    });
  });

  dot += `}`;

  fs.writeFileSync(OUTPUT, dot);
  console.log(`\nArchitecture insights generated: ${OUTPUT}`);
  console.log('\nTo visualize:');
  console.log('  dot -Tpng architecture-insights.dot -o architecture-insights.png');
  console.log('  dot -Tsvg architecture-insights.dot -o architecture-insights.svg');

  // Print detailed insights
  if (insights.highCoupling.length > 0) {
    console.log('\n=== HIGH COUPLING FILES (RED) ===');
    insights.highCoupling.forEach(item => {
      console.log(`  ${path.relative(ROOT, item.file)} - used by ${item.usedBy} files`);
    });
  }

  if (insights.godModules.length > 0) {
    console.log('\n=== POTENTIAL GOD MODULES ===');
    insights.godModules.forEach(item => {
      console.log(`  ${path.relative(ROOT, item.file)} - used by ${item.usedBy}, depends on ${item.deps}`);
    });
  }

  if (insights.circularDependencies.length > 0) {
    console.log('\n=== CIRCULAR DEPENDENCIES ===');
    insights.circularDependencies.forEach((cycle, i) => {
      console.log(`  Cycle ${i + 1}: ${cycle.map(f => path.basename(f)).join(' -> ')}`);
    });
  }

  if (insights.architecturalViolations.length > 0) {
    console.log('\n=== ARCHITECTURAL VIOLATIONS ===');
    insights.architecturalViolations.forEach(item => {
      console.log(`  ${path.relative(ROOT, item.file)} -> ${path.relative(ROOT, item.dep)} (${item.type})`);
    });
  }
}

// Run if called directly
if (require.main === module) {
  generate();
}

module.exports = { generate, analyzeArchitecture, getLayer };
