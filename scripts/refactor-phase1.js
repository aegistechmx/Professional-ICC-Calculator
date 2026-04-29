/**
 * refactor-phase1.js - Industrial architecture reorganization
 * 
 * Responsibility: Restructure to ETAP-style industrial architecture
 * Phase 1: Core reorganization and cleanup
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const BACKEND = path.join(ROOT, 'backend', 'src');

// === CONFIGURATION ===
const moves = [
  // CORE - Consolidate electrical algorithms
  { from: 'core/electrical', to: 'core/powerflow' },
  { from: 'workers/electrical', to: 'core/powerflow' },
  { from: 'workers/loadflow', to: 'core/powerflow' },
  { from: 'core/powerflow/newton', to: 'core/powerflow/solvers' },
  { from: 'core/powerflow/solver', to: 'core/powerflow/solvers/newton' },

  // OPF - Organize optimization algorithms
  { from: 'core/opf', to: 'core/opf/algorithms' },
  { from: 'core/powerflow/opf', to: 'core/opf' },

  // STABILITY - Dynamic simulation modules
  { from: 'workers/simulation', to: 'core/stability' },
  { from: 'core/powerflow/dynamics', to: 'core/stability/dynamics' },
  { from: 'core/powerflow/dynamics/solver', to: 'core/stability/solvers' },

  // SHORT CIRCUIT - Protection analysis
  { from: 'cortocircuito', to: 'core/shortcircuit' },
  { from: 'core/protection', to: 'core/shortcircuit/protection' },

  // APPLICATION - Business logic layer
  { from: 'services', to: 'application/services' },
  { from: 'application/powerflow', to: 'application/services/powerflow' },
  { from: 'application/opf', to: 'application/services/opf' },

  // INFRASTRUCTURE - External systems
  { from: 'middleware', to: 'infrastructure/http' },
  { from: 'database', to: 'infrastructure/persistence' },
  { from: 'data', to: 'infrastructure/persistence/data' },

  // INTERFACES - API layer
  { from: 'routes', to: 'interfaces/api/routes' },
  { from: 'controllers', to: 'interfaces/api/controllers' },

  // SHARED - Common utilities
  { from: 'utils', to: 'shared/utils' },
  { from: 'helpers', to: 'shared/utils' },
  { from: 'shared/electrical', to: 'shared/models/electrical' },

  // PLUGINS - Plugin system
  { from: 'plugins', to: 'plugins/core' }
];

const legacyPatterns = [
  'old',
  'backup',
  'copy',
  '.bak',
  'temp',
  'tmp',
  'node_modules',
  '.git'
];

// === UTILITY FUNCTIONS ===
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
}

function moveDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`⚠️ Source does not exist: ${src}`);
    return;
  }

  ensureDir(path.dirname(dest));

  try {
    const items = fs.readdirSync(src);
    items.forEach(item => {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);

      if (fs.statSync(srcPath).isDirectory()) {
        moveDir(srcPath, destPath);
      } else {
        fs.renameSync(srcPath, destPath);
      }
    });

    // Remove empty source directory
    try {
      fs.rmdirSync(src);
    } catch (error) {
      // Directory might not be empty, that's ok
    }

    console.log(`📁 Moved: ${src} → ${dest}`);
  } catch (error) {
    console.error(`❌ Failed to move ${src}:`, error.message);
  }
}

function cleanLegacy() {
  console.log('🧹 Cleaning legacy files...');

  function walk(dir) {
    try {
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const fullPath = path.join(dir, item);

        try {
          if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
          } else {
            const shouldDelete = legacyPatterns.some(pattern => 
              item.includes(pattern) || item.startsWith('.') && !item.startsWith('.git')
            );

            if (shouldDelete) {
              fs.unlinkSync(fullPath);
              console.log(`🗑️ Removed: ${fullPath}`);
            }
          }
        } catch (error) {
          // Skip files we can't access
        }
      });
    } catch (error) {
      // Skip directories we can't access
    }
  }

  walk(BACKEND);
}

function fixImports() {
  console.log('🔧 Fixing imports...');

  function walk(dir) {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);

      if (fs.statSync(fullPath).isDirectory()) {
        walk(fullPath);
      } else if (item.endsWith('.js')) {
        try {
          let content = fs.readFileSync(fullPath, 'utf8');

          // Fix common import patterns
          const replacements = [
            {
              from: /require\(['"]\.\.\/\.\.\/utils/g,
              to: 'require(\'@/shared/utils\')'
            },
            {
              from: /require\(['"]\.\.\/\.\.\/services/g,
              to: 'require(\'@/application/services\')'
            },
            {
              from: /require\(['"]\.\.\/\.\.\/core/g,
              to: 'require(\'@/core\')'
            },
            {
              from: /require\(['"]\.\.\/\.\.\/electrical/g,
              to: 'require(\'@/core/powerflow\')'
            },
            {
              from: /require\(['"]\.\.\/\.\.\/opf/g,
              to: 'require(\'@/core/opf\')'
            },
            {
              from: /require\(['"]\.\.\/\.\.\/dynamics/g,
              to: 'require(\'@/core/stability\')'
            }
          ];

          replacements.forEach(({ from, to }) => {
            content = content.replace(from, to);
          });

          fs.writeFileSync(fullPath, content);
        } catch (error) {
          console.error(`❌ Failed to fix imports in ${fullPath}:`, error.message);
        }
      }
    });
  }

  walk(BACKEND);
}

function connectApplicationToCore() {
  console.log('🔗 Connecting application → core...');

  const appDir = path.join(BACKEND, 'application', 'services');
  ensureDir(appDir);

  // Create clean application service files
  const services = [
    {
      name: 'powerflow.js',
      content: `/**
 * application/services/powerflow.js - Power flow business logic
 * 
 * Responsibility: Business logic for power flow operations
 */

const { solveNR, solveFDLF } = require('@/core/powerflow/solvers');

/**
 * Run power flow analysis
 * @param {Object} system - Power system model
 * @param {Object} options - Solver options
 * @returns {Object} Power flow results
 */
async function runPowerFlow(system, options = {}) {
  const {
    method = 'FDLF',
    tolerance = 1e-6,
    maxIterations = 20
  } = options;

  console.log('⚡ PowerFlow: Running ' + method + ' analysis...');

  let result;
  switch (method) {
    case 'NR':
      result = await solveNR(system, { tolerance, maxIterations });
      break;
    case 'FDLF':
      result = await solveFDLF(system, { tolerance, maxIterations });
      break;
    default:
      throw new Error('Unknown power flow method: ' + method);
  }

  console.log('⚡ PowerFlow: ' + (result.converged ? 'CONVERGED' : 'NOT CONVERGED') + ' in ' + result.iterations + ' iterations');

  return {
    method,
    converged: result.converged,
    iterations: result.iterations,
    voltages: result.voltages,
    flows: result.flows,
    system,
    options,
    timestamp: new Date().toISOString()
  };
}

module.exports = { runPowerFlow };`
    },
    {
      name: 'opf.js',
      content: `/**
 * application/services/opf.js - OPF business logic
 * 
 * Responsibility: Business logic for optimal power flow operations
 */

const { solveOPF } = require('@/core/opf/algorithms');
const { runPowerFlow } = require('./powerflow');

/**
 * Run optimal power flow analysis
 * @param {Object} system - Power system model
 * @param {Object} options - OPF options
 * @returns {Object} OPF results
 */
async function runOPF(system, options = {}) {
  const {
    tolerance = 1e-6,
    maxIterations = 30,
    alpha = 0.5,
    powerFlowMethod = 'FDLF'
  } = options;

  console.log('⚡ OPF: Running economic dispatch optimization...');

  // Get base power flow solution
  const pfResult = await runPowerFlow(system, { method: powerFlowMethod });
  
  if (!pfResult.converged) {
    throw new Error('Base power flow did not converge');
  }

  // Run OPF optimization
  const result = await solveOPF(system, {
    tolerance,
    maxIterations,
    alpha,
    baseSolution: pfResult
  });

  console.log('⚡ OPF: ' + (result.converged ? 'CONVERGED' : 'NOT CONVERGED') + ' in ' + result.iterations + ' iterations');
  console.log('⚡ OPF: Final cost: $' + result.cost.toFixed(2));

  return {
    converged: result.converged,
    iterations: result.iterations,
    cost: result.cost,
    generation: result.generation,
    constraints: result.violations,
    lmp: result.lmp,
    basePowerFlow: pfResult,
    system,
    options,
    timestamp: new Date().toISOString()
  };
}

module.exports = { runOPF };`
    }
  ];

  services.forEach(({ name, content }) => {
    const filePath = path.join(appDir, name);
    fs.writeFileSync(filePath, content);
    console.log(`📄 Created: ${filePath}`);
  });
}

function createIndexFiles() {
  console.log('📄 Creating index files...');

  // Core index
  const coreIndexPath = path.join(BACKEND, 'core', 'index.js');
  const coreIndexContent = `/**
 * core/index.js - Core module exports
 * 
 * Responsibility: Centralized core exports
 */

// Power flow solvers
const { solveNR, solveFDLF } = require('./powerflow/solvers');

// OPF algorithms
const { solveOPF } = require('./opf/algorithms');

// Stability simulators
const { simulateDynamics } = require('./stability/solvers');

// Short circuit analysis
const { analyzeShortCircuit } = require('./shortcircuit');

module.exports = {
  // Power flow
  powerflow: {
    solveNR,
    solveFDLF
  },
  
  // OPF
  opf: {
    solveOPF
  },
  
  // Stability
  stability: {
    simulateDynamics
  },
  
  // Short circuit
  shortcircuit: {
    analyzeShortCircuit
  }
};`;

  fs.writeFileSync(coreIndexPath, coreIndexContent);
  console.log(`📄 Created: ${coreIndexPath}`);

  // Application index
  const appIndexPath = path.join(BACKEND, 'application', 'index.js');
  const appIndexContent = `/**
 * application/index.js - Application module exports
 * 
 * Responsibility: Centralized application exports
 */

const { runPowerFlow } = require('./services/powerflow');
const { runOPF } = require('./services/opf');

module.exports = {
  powerflow: { runPowerFlow },
  opf: { runOPF }
};`;

  fs.writeFileSync(appIndexPath, appIndexContent);
  console.log(`📄 Created: ${appIndexPath}`);

  // Shared index
  const sharedIndexPath = path.join(BACKEND, 'shared', 'index.js');
  const sharedIndexContent = `/**
 * shared/index.js - Shared utilities exports
 * 
 * Responsibility: Centralized shared utilities
 */

const { validateElectricalSystem } = require('./models/electrical');
const { formatNumber, formatVoltage, formatPower } = require('./utils/formatting');
const { createLogger, logError, logInfo } = require('./utils/logging');

module.exports = {
  // Models
  electrical: { validateElectricalSystem },
  
  // Utils
  formatting: { formatNumber, formatVoltage, formatPower },
  logging: { createLogger, logError, logInfo }
};`;

  fs.writeFileSync(sharedIndexPath, sharedIndexContent);
  console.log(`📄 Created: ${sharedIndexPath}`);
}

// === MAIN EXECUTION ===
function reorganize() {
  console.log('🚀 Starting industrial architecture refactor...');
  console.log('📋 Phase 1: Core reorganization and cleanup');

  // Step 1: Reorganize folders
  console.log('\n=== STEP 1: REORGANIZE FOLDERS ===');
  moves.forEach(({ from, to }) => {
    const srcPath = path.join(BACKEND, from);
    const destPath = path.join(BACKEND, to);

    moveDir(srcPath, destPath);
  });

  // Step 2: Clean legacy files
  console.log('\n=== STEP 2: CLEAN LEGACY FILES ===');
  cleanLegacy();

  // Step 3: Fix imports
  console.log('\n=== STEP 3: FIX IMPORTS ===');
  fixImports();

  // Step 4: Connect application to core
  console.log('\n=== STEP 4: CONNECT APPLICATION → CORE ===');
  connectApplicationToCore();

  // Step 5: Create index files
  console.log('\n=== STEP 5: CREATE INDEX FILES ===');
  createIndexFiles();

  console.log('\n🎯 INDUSTRIAL ARCHITECTURE REFACTOR COMPLETE');
  console.log('📁 Structure ready for:');
  console.log('  🔥 Plugins system');
  console.log('  ⚡ Parallel processing');
  console.log('  🧠 SCOPF implementation');
  console.log('  🌐 Clean API layer');
  console.log('\n📋 Next steps:');
  console.log('  1. npm run dev');
  console.log('  2. Fix any remaining errors');
  console.log('  3. Test core functionality');
}

// Run: refactor
if (require.main === module) {
  reorganize();
  console.log('📁 Structure ready for:');
  console.log('  🔥 Plugins system');
  console.log('  ⚡ Parallel processing');
  console.log('  🧠 SCOPF implementation');
  console.log('  🌐 Clean API layer');
  console.log('\n📋 Next steps:');
  console.log('  1. npm run dev');
  console.log('  2. Fix any remaining errors');
  console.log('  3. Test core functionality');
}

module.exports = {
  reorganize,
  cleanLegacy,
  fixImports,
  connectApplicationToCore,
  createIndexFiles
};
