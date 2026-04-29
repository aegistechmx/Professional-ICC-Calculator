#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'backend', 'src');

function log(msg) {
  console.log('⚡', msg);
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

// ===============================
// 1. FIX IMPORTS
// ===============================
const replacements = [
  // powerflow
  [/require\(['"].*powerflow.*['"]\)/g, "require('@/core/electrical/powerflow')"],

  // ybus
  [/require\(['"].*ybus.*['"]\)/g, "require('@/core/electrical/ybus')"],

  // logger
  [/require\(['"].*logger.*['"]\)/g, "require('@/infrastructure/logger/logger')"],

  // services → application
  [/require\(['"].*services.*powerflow.*['"]\)/g, "require('@/application/powerflow/runPowerFlow')"],
];

function fixImports(file) {
  if (!file.endsWith('.js')) return;

  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  replacements.forEach(([regex, replacement]) => {
    content = content.replace(regex, replacement);
  });

  if (content !== original) {
    fs.writeFileSync(file, content);
    log(`Updated imports: ${file}`);
  }
}

// ===============================
// 2. ADD ALIAS SUPPORT (@)
// ===============================
function ensureAlias() {
  const pkgPath = path.join(ROOT, 'backend', 'package.json');
  if (!fs.existsSync(pkgPath)) return;

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  pkg._moduleAliases = pkg._moduleAliases || {};
  pkg._moduleAliases['@'] = 'src';

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

  log('Added @ alias to package.json');
}

// ===============================
// 3. CREATE ENTRY POINT (CORE)
// ===============================
function createCoreIndex() {
  const file = path.join(SRC, 'core', 'electrical', 'powerflow', 'index.js');

  if (fs.existsSync(file)) return;

  const content = `
const { solveLoadFlowRobust } = require('./newton/solver');

module.exports = {
  solvePowerFlow: solveLoadFlowRobust
};
`;

  fs.writeFileSync(file, content.trim());
  log('Created core powerflow index');
}

// ===============================
// 4. CONNECT APPLICATION → CORE
// ===============================
function createApplicationLayer() {
  const file = path.join(SRC, 'application', 'powerflow', 'runPowerFlow.js');

  const content = `
const { solvePowerFlow } = require('@/core/electrical/powerflow');

module.exports = async function runPowerFlow(systemDTO) {
  const system = systemDTO; // aquí puedes mapear después
  const result = solvePowerFlow(system);

  return {
    success: result.converged,
    iterations: result.iterations,
    buses: result.voltages,
    meta: {
      mismatch: result.maxMismatch
    }
  };
};
`;

  fs.writeFileSync(file, content.trim());
  log('Created application powerflow connector');
}

// ===============================
// 5. CONNECT CONTROLLER
// ===============================
function fixController() {
  const controllersDir = path.join(SRC, 'api', 'controllers');

  if (!fs.existsSync(controllersDir)) return;

  walk(controllersDir, file => {
    if (!file.endsWith('.js')) return;

    let content = fs.readFileSync(file, 'utf8');

    if (content.includes('powerflow')) {
      content = `
const runPowerFlow = require('@/application/powerflow/runPowerFlow');

module.exports = async (req, res) => {
  try {
    const result = await runPowerFlow(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
`;
      fs.writeFileSync(file, content.trim());
      log(`Controller fixed: ${file}`);
    }
  });
}

// ===============================
// 6. REMOVE LEGACY
// ===============================
function removeLegacy() {
  function removeDir(dir) {
    if (!fs.existsSync(dir)) return;

    fs.rmSync(dir, { recursive: true, force: true });
    log(`Deleted: ${dir}`);
  }

  walk(SRC, file => {
    if (file.includes('_legacy')) {
      removeDir(file);
    }
  });
}

// ===============================
// RUN ALL
// ===============================
function main() {
  log('═══════════════════════════════');
  log('FASE 2 - IMPORTS + CLEAN');
  log('═══════════════════════════════');

  walk(SRC, fixImports);

  ensureAlias();
  createCoreIndex();
  createApplicationLayer();
  fixController();
  removeLegacy();

  log('═══════════════════════════════');
  log('✅ FASE 2 COMPLETA');
  log('═══════════════════════════════');
}

main();
