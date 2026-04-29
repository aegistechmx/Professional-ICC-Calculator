/**
 * refactor-phase-final.js - Final refactoring to professional architecture
 * 
 * Responsibility: Restructure to enterprise-grade power system simulation platform
 * Architecture: Core (isolated) → Application → API → Infrastructure
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'backend', 'src');

function log(msg) {
  console.log('⚡', msg);
}

function safeMove(from, to) {
  if (!fs.existsSync(from)) return;

  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.renameSync(from, to);
  log(`Moved: ${from} → ${to}`);
}

function removeIfExists(p) {
  if (fs.existsSync(p)) {
    fs.rmSync(p, { recursive: true, force: true });
    log(`Removed: ${p}`);
  }
}

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      walk(full, callback);
    } else {
      callback(full);
    }
  });
}

function fixImports() {
  log('Fixing imports...');

  walk(SRC, (file) => {
    if (!file.endsWith('.js')) return;

    let content = fs.readFileSync(file, 'utf8');

    // Fix core imports
    content = content
      .replace(/require\(['"]\.\.\/core/g, "require('@/core")
      .replace(/require\(['"]\.\.\/services/g, "require('@/application")
      .replace(/require\(['"]\.\.\/utils/g, "require('@/shared")
      .replace(/require\(['"]\.\.\/workers/g, "require('@/infrastructure");

    fs.writeFileSync(file, content);
  });
}

function createAlias() {
  const pkgPath = path.join(ROOT, 'backend', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath));

  pkg._moduleAliases = {
    "@": "src",
    "@core": "src/core",
    "@app": "src/application",
    "@infrastructure": "src/infrastructure",
    "@shared": "src/shared"
  };

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  log('Module aliases added to package.json');
}

function createApplicationStructure() {
  const appDir = path.join(SRC, 'application');
  
  // Create application subdirectories
  const subdirs = ['powerflow', 'opf', 'simulation', 'contingency'];
  subdirs.forEach(dir => {
    fs.mkdirSync(path.join(appDir, dir), { recursive: true });
  });
  
  log('Application structure created');
}

function createAPIStructure() {
  const apiDir = path.join(SRC, 'api');
  
  // Create API subdirectories
  const subdirs = ['controllers', 'routes', 'middlewares'];
  subdirs.forEach(dir => {
    fs.mkdirSync(path.join(apiDir, dir), { recursive: true });
  });
  
  log('API structure created');
}

function createInfrastructureStructure() {
  const infraDir = path.join(SRC, 'infrastructure');
  
  // Create infrastructure subdirectories
  const subdirs = ['database', 'workers', 'external'];
  subdirs.forEach(dir => {
    fs.mkdirSync(path.join(infraDir, dir), { recursive: true });
  });
  
  log('Infrastructure structure created');
}

function moveLegacyToInfrastructure() {
  // Move workers to infrastructure
  safeMove(
    path.join(SRC, 'core', 'workers', 'electrical'),
    path.join(SRC, 'infrastructure', 'workers')
  );
}

function createApplicationExamples() {
  // Create application layer examples
  const powerflowApp = `
/**
 * application/powerflow/runPowerFlow.js
 * 
 * Responsibility: Business logic for power flow operations
 * NO Express, NO axios, NO UI logic
 */

const { solve } = require('@/core/powerflow/solver');
const { solveFDLF } = require('@/core/powerflow/fastDecoupled');

/**
 * Run power flow with specified method
 * @param {Object} system - Power system model
 * @param {Object} options - Solver options
 * @returns {Object} Power flow results
 */
function runPowerFlow(system, options = {}) {
  const {
    method = 'FDLF',
    tolerance = 1e-6,
    maxIterations = 20
  } = options;

  let result;
  
  switch (method) {
    case 'NR':
      result = solve(system, { tolerance, maxIterations });
      break;
    case 'FDLF':
      result = solveFDLF(system, { tolerance, maxIterations });
      break;
    default:
      throw new Error(\`Unknown method: \${method}\`);
  }

  return {
    method,
    converged: result.converged,
    iterations: result.iterations,
    voltages: result.voltages,
    flows: result.flows,
    system: system,
    options
  };
}

module.exports = {
  runPowerFlow
};
`;

  const opfApp = `
/**
 * application/opf/runOPF.js
 * 
 * Responsibility: Business logic for optimal power flow operations
 * NO Express, NO axios, NO UI logic
 */

const NewtonOPFSolver = require('@/core/powerflow/opf/solver');

/**
 * Run optimal power flow
 * @param {Object} system - Power system model
 * @param {Object} options - OPF options
 * @returns {Object} OPF results
 */
function runOPF(system, options = {}) {
  const {
    tolerance = 1e-6,
    maxIterations = 30,
    alpha = 0.5,
    powerFlowMethod = 'FDLF'
  } = options;

  const solver = new NewtonOPFSolver(system, {
    tolerance,
    maxIterations,
    alpha,
    powerFlowMethod
  });

  const result = solver.solve();

  return {
    converged: result.converged,
    iterations: result.iterations,
    cost: result.cost,
    generation: result.generation,
    constraints: result.violations,
    system: system,
    options
  };
}

module.exports = {
  runOPF
};
`;

  // Write application files
  fs.writeFileSync(path.join(SRC, 'application', 'powerflow', 'runPowerFlow.js'), powerflowApp);
  fs.writeFileSync(path.join(SRC, 'application', 'opf', 'runOPF.js'), opfApp);
  
  log('Application examples created');
}

function createAPIExamples() {
  // Create API layer examples
  const powerflowController = `
/**
 * api/controllers/powerflow.controller.js
 * 
 * Responsibility: HTTP controller for power flow operations
 */

const { runPowerFlow } = require('@/app/powerflow/runPowerFlow');

/**
 * Run power flow via HTTP API
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.run = async (req, res) => {
  try {
    const result = await runPowerFlow(req.body.system, req.body.options);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
`;

  const powerflowRoutes = `
/**
 * api/routes/powerflow.routes.js
 * 
 * Responsibility: HTTP routes for power flow operations
 */

const router = require('express').Router();
const powerflowController = require('../controllers/powerflow.controller');

/**
 * Power flow routes
 */
router.post('/run', powerflowController.run);

module.exports = router;
`;

  // Write API files
  fs.writeFileSync(path.join(SRC, 'api', 'controllers', 'powerflow.controller.js'), powerflowController);
  fs.writeFileSync(path.join(SRC, 'api', 'routes', 'powerflow.routes.js'), powerflowRoutes);
  
  log('API examples created');
}

function main() {
  log('=== FINAL REFACTOR START ===');

  // 1. Clean up legacy
  log('Cleaning up legacy files...');
  removeIfExists(path.join(SRC, 'services'));
  removeIfExists(path.join(SRC, 'controllers'));
  removeIfExists(path.join(SRC, 'routes'));
  removeIfExists(path.join(SRC, 'middlewares'));
  removeIfExists(path.join(SRC, 'utils'));
  removeIfExists(path.join(SRC, 'cortocircuito'));
  removeIfExists(path.join(ROOT, 'depd'));

  // 2. Create new structure
  log('Creating new enterprise structure...');
  createApplicationStructure();
  createAPIStructure();
  createInfrastructureStructure();

  // 3. Move legacy to infrastructure
  moveLegacyToInfrastructure();

  // 4. Fix imports
  fixImports();

  // 5. Create aliases
  createAlias();

  // 6. Create examples
  createApplicationExamples();
  createAPIExamples();

  log('=== FINAL REFACTOR DONE ===');
  log('');
  log('🏗️ New Enterprise Architecture:');
  log('backend/src/');
  log('├── core/                 ⚡ MOTOR ELÉCTRICO (NO TOCAR UI)');
  log('│   ├── powerflow/');
  log('│   ├── opf/');
  log('│   ├── dynamics/');
  log('│   ├── contingency/');
  log('│   ├── protection/');
  log('│   └── ybus/');
  log('├── application/         🧠 CASOS DE USO');
  log('│   ├── powerflow/');
  log('│   ├── opf/');
  log('│   ├── simulation/');
  log('│   └── contingency/');
  log('├── api/                 🌐 HTTP');
  log('│   ├── controllers/');
  log('│   ├── routes/');
  log('│   └── middlewares/');
  log('├── infrastructure/      🔌 DB / workers / external');
  log('└── shared/              🧰 utils comunes');
}

main();
