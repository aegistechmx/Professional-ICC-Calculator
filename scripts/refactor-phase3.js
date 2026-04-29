const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'backend', 'src');

// ================================
// UTIL
// ================================
function move(from, to) {
  if (!fs.existsSync(from)) return;

  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.renameSync(from, to);

  console.log(`✔ Moved: ${from} → ${to}`);
}

function remove(target) {
  if (!fs.existsSync(target)) return;
  fs.rmSync(target, { recursive: true, force: true });
  console.log(`🗑 Removed: ${target}`);
}

// ================================
// 1. CREAR ESTRUCTURA NUEVA
// ================================
function createStructure() {
  const folders = [
    'core/powerflow',
    'core/shortcircuit',
    'core/protections',
    'core/ybus',

    'application/useCases',
    'application/services',

    'infrastructure/http',
    'interfaces/controllers',
    'interfaces/routes',

    'shared/utils',
    'shared/logger'
  ];

  folders.forEach(f => {
    const dir = path.join(SRC, f);
    fs.mkdirSync(dir, { recursive: true });
  });

  console.log('📁 Nueva estructura creada');
}

// ================================
// 2. MOVER CORE ELÉCTRICO
// ================================
function moveCore() {
  move(
    path.join(SRC, 'workers/electrical'),
    path.join(SRC, 'core')
  );

  move(
    path.join(SRC, 'core/electrico'),
    path.join(SRC, 'core/powerflow')
  );

  move(
    path.join(SRC, 'core/loadflow'),
    path.join(SRC, 'core/powerflow')
  );

  move(
    path.join(SRC, 'workers/ybus'),
    path.join(SRC, 'core/ybus')
  );
}

// ================================
// 3. MOVER APPLICATION
// ================================
function moveApplication() {
  move(
    path.join(SRC, 'services'),
    path.join(SRC, 'application/services')
  );

  move(
    path.join(SRC, 'workers/simulation'),
    path.join(SRC, 'application/useCases')
  );
}

// ================================
// 4. MOVER INTERFACES (API)
// ================================
function moveInterfaces() {
  move(
    path.join(SRC, 'controllers'),
    path.join(SRC, 'interfaces/controllers')
  );

  move(
    path.join(SRC, 'routes'),
    path.join(SRC, 'interfaces/routes')
  );
}

// ================================
// 5. SHARED
// ================================
function moveShared() {
  move(
    path.join(SRC, 'utils'),
    path.join(SRC, 'shared/utils')
  );

  move(
    path.join(SRC, 'logging'),
    path.join(SRC, 'shared/logger')
  );
}

// ================================
// 6. LIMPIAR LEGACY
// ================================
function cleanLegacy() {
  const legacyFolders = [
    'workers',
    'simulation',
    'reporte',
    'reports',
    'simulacion',
    'graficas',
    'nom',
    'events'
  ];

  legacyFolders.forEach(f => {
    remove(path.join(SRC, f));
  });
}

// ================================
// 7. FIX IMPORTS AUTOMÁTICO
// ================================
function fixImports(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const full = path.join(dir, file);

    if (fs.statSync(full).isDirectory()) {
      fixImports(full);
      return;
    }

    if (!file.endsWith('.js')) return;

    let content = fs.readFileSync(full, 'utf8');

    // 🔥 CORE
    content = content.replace(/require\(['"].*electrical.*['"]\)/g,
      "require('../../core')"
    );

    // 🔥 SERVICES → APPLICATION
    content = content.replace(/require\(['"].*services.*['"]\)/g,
      "require('../../application/services')"
    );

    // 🔥 ROUTES
    content = content.replace(/require\(['"].*routes.*['"]\)/g,
      "require('../../interfaces/routes')"
    );

    fs.writeFileSync(full, content);
  });
}

// ================================
// 8. ENTRYPOINT LIMPIO
// ================================
function createAppEntry() {
  const appFile = path.join(SRC, 'app.js');

  const content = `
const express = require('express');
const routes = require('./interfaces/routes');

const app = express();

app.use(express.json());
app.use('/api', routes);

module.exports = app;
`;

  fs.writeFileSync(appFile, content);
  console.log('🚀 app.js creado');
}

// ================================
// RUN
// ================================
function run() {
  console.log('⚡ REFACTOR FASE 3 PRO INICIANDO...\n');

  createStructure();
  moveCore();
  moveApplication();
  moveInterfaces();
  moveShared();
  cleanLegacy();
  fixImports(SRC);
  createAppEntry();

  console.log('\n✅ REFACTOR COMPLETADO');
}

run();
