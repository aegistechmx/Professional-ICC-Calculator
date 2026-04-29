#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend', 'src');

function log(msg) {
  console.log('⚡', msg);
}

function safeMkdir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    log(`Created: ${dir}`);
  }
}

function move(src, dest) {
  if (!fs.existsSync(src)) return;

  safeMkdir(path.dirname(dest));

  try {
    fs.renameSync(src, dest);
    log(`Moved: ${src} → ${dest}`);
  } catch (e) {
    log(`⚠️ Skip (maybe exists): ${src}`);
  }
}

function removeIfEmpty(dir) {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir);
  if (files.length === 0) {
    fs.rmdirSync(dir);
    log(`Removed empty: ${dir}`);
  }
}

function main() {
  log('═══════════════════════════════');
  log('REFACTOR FASE 1 - CLEAN ARCH');
  log('═══════════════════════════════');

  // ============================
  // 1. CREATE CLEAN ARCH
  // ============================
  const core = path.join(BACKEND, 'core', 'electrical');
  const app = path.join(BACKEND, 'application');
  const infra = path.join(BACKEND, 'infrastructure');
  const shared = path.join(BACKEND, 'shared');

  [
    `${core}/powerflow/newton`,
    `${core}/powerflow/fastDecoupled`,
    `${core}/powerflow/common`,
    `${core}/ybus`,
    `${core}/shortcircuit`,
    `${core}/protections`,
    `${BACKEND}/core/math`,

    `${app}/powerflow`,
    `${app}/simulation`,

    `${infra}/workers`,
    `${infra}/logger`,

    `${shared}/utils`,
    `${shared}/constants`,
    `${shared}/types`,
  ].forEach(safeMkdir);

  // ============================
  // 2. MOVE POWERFLOW CORE
  // ============================

  move(
    `${BACKEND}/workers/powerflow`,
    `${core}/powerflow/_legacy_workers` 
  );

  move(
    `${BACKEND}/modules/powerflow`,
    `${core}/powerflow/_legacy_modules` 
  );

  move(
    `${BACKEND}/core/powerflow`,
    `${core}/powerflow` 
  );

  move(
    `${BACKEND}/core/loadflow`,
    `${core}/powerflow` 
  );

  move(
    `${BACKEND}/workers/ybus`,
    `${core}/ybus` 
  );

  // ============================
  // 3. MOVE API → CLEAN
  // ============================

  move(
    `${BACKEND}/controllers`,
    `${BACKEND}/api/controllers` 
  );

  move(
    `${BACKEND}/routes`,
    `${BACKEND}/api/routes` 
  );

  move(
    `${BACKEND}/middleware`,
    `${BACKEND}/api/middlewares` 
  );

  // ============================
  // 4. MOVE SERVICES → APPLICATION
  // ============================

  move(
    `${BACKEND}/services/powerflow.service.js`,
    `${app}/powerflow/runPowerFlow.js` 
  );

  move(
    `${BACKEND}/services`,
    `${app}/_legacy_services` 
  );

  // ============================
  // 5. MOVE LOGGER
  // ============================

  move(
    `${BACKEND}/utils/logger.js`,
    `${infra}/logger/logger.js` 
  );

  // ============================
  // 6. CLEAN DUPLICATES
  // ============================

  const suspicious = [
    'loadflow',
    'powerflow_old',
    'electrical_old',
    'temp',
    'backup'
  ];

  suspicious.forEach(name => {
    const dir = path.join(BACKEND, name);
    if (fs.existsSync(dir)) {
      log(`⚠️ Possible garbage: ${dir}`);
    }
  });

  // ============================
  // 7. REMOVE EMPTY
  // ============================

  [
    `${BACKEND}/workers`,
    `${BACKEND}/modules`,
    `${BACKEND}/utils`,
  ].forEach(removeIfEmpty);

  log('═══════════════════════════════');
  log('✅ REFACTOR FASE 1 COMPLETADO');
  log('═══════════════════════════════');
}

main();
