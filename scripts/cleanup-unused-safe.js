/**
 * cleanup-unused-safe.js - Professional unused file cleaner
 * 
 * Responsibility: Safely remove unused files with backup
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const BACKEND_SRC = path.join(ROOT, 'backend', 'src');

// Backup directory
const BACKUP_DIR = path.join(ROOT, '_unused_backup_' + Date.now());

// Files to definitely keep (manual override)
const KEEP_FILES = [
  'backend/src/api/routes/distributed.routes.js',
  'backend/src/api/controllers/distributed.controller.js',
  'backend/src/infrastructure/queue/queue.js',
  'backend/src/infrastructure/scheduler/jobScheduler.js',
  'backend/src/infrastructure/workers/job.worker.js'
];

// Files to definitely remove (confirmed unused)
const REMOVE_FILES = [
  // Old application layer files (replaced by services)
  'backend/src/application/contingency/runSCOPF.js',
  'backend/src/application/opf/runOPF.js',
  'backend/src/application/powerflow/runPowerFlow.js',
  'backend/src/application/simulation/runSimulation.js',
  'backend/src/application/simulation/runTransientStability.js',
  
  // Old core files (reorganized)
  'backend/src/core/math/Complex.js',
  'backend/src/core/events/EventEngine.js',
  'backend/src/core/powerflow/batch.js',
  'backend/src/core/powerflow/contingency.js',
  'backend/src/core/powerflow/JacobianBuilder.js',
  'backend/src/core/powerflow/MismatchCalculator.js',
  'backend/src/core/powerflow/VoltageUpdater.js',
  'backend/src/core/powerflow/stability/advancedSimulator.js',
  
  // Old protection files
  'backend/src/core/protection/auto_ajuste.js',
  'backend/src/core/protection/selector.js',
  'backend/src/core/protection/sqd_real.js',
  
  // Old system files
  'backend/src/core/system/ElectricalSystem.js',
  
  // Old shared files
  'backend/src/shared/electrical.js',
  'backend/src/shared/formatting.js',
  'backend/src/shared/helpers.js',
  'backend/src/shared/logging.js',
  'backend/src/shared/utils/electricalUtils.js',
  
  // Old infrastructure files
  'backend/src/infrastructure/infra/logger/logger.js',
  'backend/src/infrastructure/workers/workerManager.js',
  
  // Old config
  'backend/src/config/db.js',
  
  // Old server
  'backend/src/server-new.js',
  
  // Old validators
  'backend/src/validators/calculo.schema.js',
  'backend/src/validators/coordinacion.schema.js',
  'backend/src/validators/simulacion.schema.js',
  
  // Unused middlewares
  'backend/src/api/middlewares/auth.js',
  'backend/src/api/middlewares/auth.middleware.js',
  'backend/src/api/middlewares/rateLimiter.middleware.js'
];

/**
 * Ensure backup directory exists
 */
function ensureBackup() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log('📦 Backup directory created:', BACKUP_DIR);
  }
}

/**
 * Backup file before deletion
 * @param {string} filePath - File to backup
 * @returns {string|null} Backup path
 */
function backupFile(filePath) {
  try {
    const relativePath = path.relative(ROOT, filePath);
    const backupPath = path.join(BACKUP_DIR, relativePath.replace(/[:\\]/g, '_'));

    // Ensure backup subdirectory exists
    const backupDir = path.dirname(backupPath);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Copy file to backup
    fs.copyFileSync(filePath, backupPath);
    return backupPath;
  } catch (err) {
    console.log('⚠️ Backup failed for:', filePath);
    return null;
  }
}

/**
 * Remove file with backup
 * @param {string} filePath - File to remove
 * @returns {boolean} Success
 */
function removeFile(filePath) {
  try {
    const backupPath = backupFile(filePath);
    if (backupPath) {
      fs.unlinkSync(filePath);
      console.log(`✅ Removed: ${path.relative(ROOT, filePath)}`);
      return true;
    }
    return false;
  } catch (err) {
    console.log(`⚠️ Error removing: ${path.relative(ROOT, filePath)} - ${err.message}`);
    return false;
  }
}

/**
 * Main cleanup function
 */
function cleanupUnused() {
  console.log('🧹 Cleaning unused files...\n');

  ensureBackup();

  const results = {
    removed: [],
    skipped: [],
    errors: []
  };

  REMOVE_FILES.forEach(file => {
    const fullPath = path.join(ROOT, file);

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️ File not found: ${file}`);
      results.skipped.push({ file, reason: 'Not found' });
      return;
    }

    // Check if in keep list
    if (KEEP_FILES.includes(file)) {
      console.log(`⏭️  Skipping (protected): ${file}`);
      results.skipped.push({ file, reason: 'Protected' });
      return;
    }

    // Remove file
    if (removeFile(fullPath)) {
      results.removed.push(file);
    } else {
      results.errors.push({ file, reason: 'Removal failed' });
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('📊 CLEANUP SUMMARY');
  console.log('='.repeat(60));
  console.log(`Files removed: ${results.removed.length}`);
  console.log(`Files skipped: ${results.skipped.length}`);
  console.log(`Errors: ${results.errors.length}`);
  console.log(`Backup directory: ${BACKUP_DIR}`);
  console.log('='.repeat(60));

  if (results.removed.length > 0) {
    console.log('\n✅ Cleanup complete!');
    console.log('\n📋 Next steps:');
    console.log('  1. Run: npm run dev');
    console.log('  2. Check for any errors');
    console.log('  3. Delete backup when confident: rm -rf "' + BACKUP_DIR + '"');
  } else {
    console.log('\n✅ No files removed');
  }
}

// Run if called directly
if (require.main === module) {
  cleanupUnused();
}

module.exports = { cleanupUnused, removeFile };
