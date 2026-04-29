/**
 * clean-duplicates-safe.js - Professional safe duplicate cleaner
 * 
 * Responsibility: Automatically clean exact duplicates with backup and priority logic
 * Philosophy: Detect → Decide → Backup → Remove (only exact duplicates)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = process.cwd();
const BACKEND_SRC = path.join(ROOT, 'backend', 'src');

// Directories to ignore
const IGNORE = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.vscode',
  '_duplicates_backup'
];

// Backup directory
const BACKUP_DIR = path.join(ROOT, '_duplicates_backup_' + Date.now());

// Priority order for keeping files (higher = better location)
const PRIORITY = [
  { pattern: /core[/\\]powerflow[/\\]solvers/, weight: 100 },
  { pattern: /core[/\\]opf[/\\]algorithms/, weight: 95 },
  { pattern: /core[/\\]stability[/\\]solvers/, weight: 90 },
  { pattern: /core[/\\]shortcircuit/, weight: 85 },
  { pattern: /core[/\\]models/, weight: 80 },
  { pattern: /core[/\\]math/, weight: 75 },
  { pattern: /application[/\\]services/, weight: 70 },
  { pattern: /application/, weight: 65 },
  { pattern: /interfaces[/\\]api/, weight: 60 },
  { pattern: /interfaces/, weight: 55 },
  { pattern: /infrastructure[/\\]persistence/, weight: 50 },
  { pattern: /infrastructure[/\\]workers/, weight: 45 },
  { pattern: /infrastructure/, weight: 40 },
  { pattern: /shared[/\\]models/, weight: 35 },
  { pattern: /shared[/\\]utils/, weight: 30 },
  { pattern: /shared/, weight: 25 },
  { pattern: /plugins[/\\]core/, weight: 20 },
  { pattern: /plugins/, weight: 15 }
];

/**
 * Calculate SHA256 hash of file content
 * @param {string} filePath - File path
 * @returns {string|null} SHA256 hash or null if error
 */
function hashFile(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (err) {
    console.log('⚠️ Error reading:', filePath);
    return null;
  }
}

/**
 * Walk directory recursively
 * @param {string} dir - Starting directory
 * @param {Array} fileList - Accumulator
 * @returns {Array} List of file paths
 */
function walk(dir, fileList = []) {
  try {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const full = path.join(dir, file);

      if (IGNORE.some(i => full.includes(i))) return;

      if (fs.statSync(full).isDirectory()) {
        walk(full, fileList);
      } else {
        fileList.push(full);
      }
    });
  } catch (err) {
    // Skip directories we can't access
  }

  return fileList;
}

/**
 * Calculate priority score for a file path
 * Higher score = better location (keep this one)
 * @param {string} filePath - File path
 * @returns {number} Priority score
 */
function getPriorityScore(filePath) {
  let score = 0;
  const normalizedPath = filePath.replace(/\\/g, '/');

  // Check priority patterns
  PRIORITY.forEach(({ pattern, weight }) => {
    if (pattern.test(normalizedPath)) {
      score += weight;
    }
  });

  // Prefer shorter paths (less nesting penalty)
  const depth = normalizedPath.split('/').length;
  score -= depth * 0.5;

  // Prefer files in 'backend/src' root over deep nesting
  if (normalizedPath.includes('backend/src/') && !normalizedPath.includes('backend/src/core/')) {
    score -= 10;
  }

  return score;
}

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
 * @param {string} filePath - Original file path
 * @returns {string|null} Backup path or null
 */
function backupFile(filePath) {
  try {
    // Create relative path from ROOT for backup structure
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
 * Try to remove empty parent directories after file deletion
 * @param {string} filePath - Deleted file path
 */
function cleanupEmptyDirs(filePath) {
  try {
    let dir = path.dirname(filePath);
    while (dir !== ROOT && dir !== BACKEND_SRC && dir.length > ROOT.length) {
      const contents = fs.readdirSync(dir);
      if (contents.length === 0) {
        fs.rmdirSync(dir);
        dir = path.dirname(dir);
      } else {
        break;
      }
    }
  } catch (err) {
    // Ignore cleanup errors
  }
}

/**
 * Main duplicate cleaning function
 */
function cleanDuplicates() {
  console.log('🔍 Scanning for exact duplicates...\n');

  // Get all files in backend/src
  const files = walk(BACKEND_SRC);
  console.log(`📁 Found ${files.length} files to analyze\n`);

  // Group files by hash
  const hashMap = {};

  files.forEach(file => {
    const hash = hashFile(file);
    if (hash) {
      if (!hashMap[hash]) hashMap[hash] = [];
      hashMap[hash].push(file);
    }
  });

  // Find duplicate groups (same content)
  const duplicateGroups = Object.values(hashMap).filter(group => group.length > 1);

  if (duplicateGroups.length === 0) {
    console.log('✅ No exact duplicates found!\n');
    return;
  }

  console.log(`🔥 Found ${duplicateGroups.length} duplicate groups\n`);

  // Setup backup
  ensureBackup();

  const report = {
    timestamp: new Date().toISOString(),
    backupDir: BACKUP_DIR,
    totalGroups: duplicateGroups.length,
    removed: [],
    kept: [],
    errors: []
  };

  console.log('🧹 Cleaning duplicates (smart priority)...\n');

  duplicateGroups.forEach((group, index) => {
    console.log(`\n--- Group ${index + 1}/${duplicateGroups.length} ---`);

    // Sort by priority score (highest first)
    const sorted = group.sort((a, b) => getPriorityScore(b) - getPriorityScore(a));

    // Keep the highest priority file
    const keep = sorted[0];
    const duplicates = sorted.slice(1);

    // Show group details
    console.log('Files in group:');
    sorted.forEach((file, i) => {
      const score = getPriorityScore(file);
      const marker = i === 0 ? '✅ KEEP' : '❌ REMOVE';
      console.log(`  ${marker} [score: ${score.toFixed(1)}] ${path.relative(ROOT, file)}`);
    });

    // Remove duplicates
    duplicates.forEach(file => {
      try {
        // Backup first
        const backupPath = backupFile(file);

        if (backupPath) {
          // Delete original
          fs.unlinkSync(file);

          // Cleanup empty directories
          cleanupEmptyDirs(file);

          report.removed.push({
            original: file,
            backup: backupPath,
            kept: keep
          });

          console.log(`  ✓ Removed and backed up`);
        } else {
          report.errors.push({ file, reason: 'Backup failed' });
        }
      } catch (err) {
        console.log(`  ⚠️ Error removing: ${err.message}`);
        report.errors.push({ file, reason: err.message });
      }
    });

    report.kept.push(keep);
  });

  // Save report
  const reportPath = path.join(ROOT, 'duplicates-clean-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 CLEANUP SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total duplicate groups: ${report.totalGroups}`);
  console.log(`Files removed: ${report.removed.length}`);
  console.log(`Files kept: ${report.kept.length}`);
  console.log(`Errors: ${report.errors.length}`);
  console.log(`Backup location: ${BACKUP_DIR}`);
  console.log(`Report saved: ${reportPath}`);
  console.log('='.repeat(60));

  console.log('\n✅ Duplicate cleanup complete!');
  console.log('\n📋 Next steps:');
  console.log('  1. Review duplicates-clean-report.json');
  console.log('  2. Test: npm run dev');
  console.log('  3. Fix any broken imports if needed');
  console.log('  4. Delete backup directory when confident: rm -rf "' + BACKUP_DIR + '"');
}

// Run if called directly
if (require.main === module) {
  cleanDuplicates();
}

module.exports = { cleanDuplicates, getPriorityScore, hashFile };
