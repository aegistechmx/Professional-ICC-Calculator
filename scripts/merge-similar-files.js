/**
 * merge-similar-files.js - Professional similar file merger
 * 
 * Responsibility: Safely merge similar files with intelligent logic
 * Philosophy: Detect → Decide → Backup → Merge (only high similarity)
 */

const fs = require('fs');
const path = require('path');

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
  '_duplicates_backup',
  '_merge_backup'
];

// Valid file extensions
const VALID_EXT = ['.js', '.ts'];

// Similarity threshold (85%+)
const SIM_THRESHOLD = 0.85;

// Backup directory
const BACKUP_DIR = path.join(ROOT, '_merge_backup_' + Date.now());

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
 * Normalize content for comparison
 * @param {string} content - File content
 * @returns {string} Normalized content
 */
function normalize(content) {
  return content
    .replace(/\/\/.*$/gm, '')     // Remove comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\s+/g, '')              // Remove whitespace
    .toLowerCase();                     // Case insensitive
}

/**
 * Calculate similarity between two strings (0-1)
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} Similarity score (0-1)
 */
function similarity(a, b) {
  const len = Math.min(a.length, b.length);
  let same = 0;

  for (let i = 0; i < len; i++) {
    if (a[i] === b[i]) same++;
  }

  return same / Math.max(a.length, b.length);
}

/**
 * Calculate priority score for file location
 * @param {string} filePath - File path
 * @returns {number} Priority score
 */
function getPriorityScore(filePath) {
  let score = 0;

  // Core > Application > Interfaces > Infrastructure > Shared > Plugins
  if (filePath.includes('core/')) score += 10;
  else if (filePath.includes('application/')) score += 8;
  else if (filePath.includes('interfaces/')) score += 6;
  else if (filePath.includes('infrastructure/')) score += 4;
  else if (filePath.includes('shared/')) score += 2;
  else if (filePath.includes('plugins/')) score += 1;

  // Prefer shorter paths
  score -= filePath.split('/').length * 0.1;

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
 * Backup file before modification
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
 * Merge content from source into target
 * @param {string} targetPath - Target file path
 * @param {string} sourcePath - Source file path
 */
function mergeFiles(targetPath, sourcePath) {
  try {
    const targetContent = fs.readFileSync(targetPath, 'utf8');
    const sourceContent = fs.readFileSync(sourcePath, 'utf8');

    // Avoid duplicating content
    if (targetContent.includes(sourceContent.trim())) {
      console.log('⚠️ Content already exists in target, skipping merge');
      return;
    }

    const merged = `
/* ===== MERGED FROM: ${sourcePath} ===== */

${sourceContent}

${targetContent}
`;

    fs.writeFileSync(targetPath, merged);
    console.log(`✅ Merged: ${sourcePath} → ${targetPath}`);

  } catch (err) {
    console.log('⚠️ Merge error:', err.message);
  }
}

/**
 * Main merge function
 */
function run() {
  console.log('🔍 Finding similar files for merging...\n');

  // Get all JavaScript/TypeScript files
  const files = walk(BACKEND_SRC);
  console.log(`📁 Found ${files.length} files to analyze\n`);

  // Normalize content and create file objects
  const normalizedMap = files.map(f => ({
    file: f,
    content: normalize(fs.readFileSync(f, 'utf8'))
  }));

  // Track used files to avoid re-merging
  const usedFiles = new Set();

  console.log('🔗 Processing similarities...\n');

  // Find and merge similar files
  for (let i = 0; i < normalizedMap.length; i++) {
    for (let j = i + 1; j < normalizedMap.length; j++) {
      const A = normalizedMap[i];
      const B = normalizedMap[j];

      // Skip if already used
      if (usedFiles.has(A.file) || usedFiles.has(B.file)) continue;

      const sim = similarity(A.content, B.content);

      if (sim >= SIM_THRESHOLD) {
        console.log(`\n🔥 SIMILAR FILES FOUND (${(sim * 100).toFixed(1)}% similarity):`);
        console.log(`  A: ${path.relative(ROOT, A.file)}`);
        console.log(`  B: ${path.relative(ROOT, B.file)}`);

        // Decide which to keep based on priority score
        const scoreA = getPriorityScore(A.file);
        const scoreB = getPriorityScore(B.file);

        const keep = scoreA >= scoreB ? A.file : B.file;
        const remove = keep === A.file ? B.file : A.file;

        console.log(`  📋 KEEP: ${path.relative(ROOT, keep)} [score: ${Math.max(scoreA, scoreB).toFixed(1)}]`);
        console.log(`  ❌ REMOVE: ${path.relative(ROOT, remove)} [score: ${Math.min(scoreA, scoreB).toFixed(1)}]`);

        try {
          // Backup the file to be removed
          const backupPath = backupFile(remove);

          if (backupPath) {
            // Merge content
            mergeFiles(keep, remove);

            // Remove the old file
            fs.unlinkSync(remove);

            // Mark both files as used
            usedFiles.add(keep);
            usedFiles.add(remove);

            console.log('  ✅ Merge complete\n');
          }
        } catch (err) {
          console.log(`  ⚠️ Error merging: ${err.message}`);
        }
      }
    }
  }

  console.log('\n📊 MERGE SUMMARY:');
  console.log(`  Files processed: ${files.length}`);
  console.log(`  Similar pairs found: ${usedFiles.size / 2}`);
  console.log(`  Backup directory: ${BACKUP_DIR}`);

  console.log('\n✅ Similar file merging complete!');
  console.log('\n📋 Next steps:');
  console.log('  1. Review merged files for correctness');
  console.log('  2. Test: npm run dev');
  console.log('  3. Update imports if needed');
  console.log('  4. Delete backup when confident: rm -rf "' + BACKUP_DIR + '"');
}

// Run if called directly
if (require.main === module) {
  run();
}

module.exports = { run, similarity, getPriorityScore };
