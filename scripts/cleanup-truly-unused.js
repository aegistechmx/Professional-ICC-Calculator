/**
 * cleanup-truly-unused.js - Remove only truly unused files
 * 
 * Responsibility: Remove files that are definitely not needed
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const BACKEND_SRC = path.join(ROOT, 'backend', 'src');

// Backup directory
const BACKUP_DIR = path.join(ROOT, '_cleanup_truly_unused_backup_' + Date.now());

// Files to remove (confirmed unused)
const REMOVE_FILES = [
  'backend/src/shared/utils/apiResponse.js', // Unused utility
  'backend/src/validators/proteccion.schema.js' // Unused validator
];

// Files to KEEP (important infrastructure)
const KEEP_FILES = [
  'backend/src/api/middlewares/errorHandler.js', // Important middleware
  'backend/src/engine/Engine.js', // Core engine
  'backend/src/infrastructure/scheduler/jobScheduler.js' // Distributed scheduler
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

    const backupDir = path.dirname(backupPath);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

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
function cleanupTrulyUnused() {
  console.log('🧹 Cleaning truly unused files...\n');

  ensureBackup();

  const results = {
    removed: [],
    skipped: [],
    errors: []
  };

  REMOVE_FILES.forEach(file => {
    const fullPath = path.join(ROOT, file);

    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️ File not found: ${file}`);
      results.skipped.push({ file, reason: 'Not found' });
      return;
    }

    if (KEEP_FILES.includes(file)) {
      console.log(`⏭️  Skipping (protected): ${file}`);
      results.skipped.push({ file, reason: 'Protected' });
      return;
    }

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
  cleanupTrulyUnused();
}

module.exports = { cleanupTrulyUnused, removeFile };
