/**
 * find-duplicates.js - Professional duplicate file detector
 * 
 * Responsibility: Detect duplicate files by content, name similarity, and size
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = process.cwd();
const IGNORE = ['node_modules', '.git', 'dist', 'build', 'coverage', '.vscode'];

/**
 * Calculate SHA256 hash of file content
 * @param {string} filePath - File path
 * @returns {string} SHA256 hash
 */
function hashFile(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (err) {
    console.log('⚠️ Error hashing:', filePath);
    return null;
  }
}

/**
 * Walk directory recursively
 * @param {string} dir - Starting directory
 * @param {Array} fileList - Accumulator for files
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
 * Calculate similarity between two strings (0-1)
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} Similarity score (0-1)
 */
function similarity(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();

  // Levenshtein distance
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const distance = matrix[b.length][a.length];
  const maxLength = Math.max(a.length, b.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
}

/**
 * Main duplicate detection function
 */
function findDuplicates() {
  console.log('🔍 Scanning files for duplicates...\n');

  const files = walk(path.join(ROOT, 'backend', 'src'));
  console.log(`📁 Found ${files.length} files to analyze\n`);

  const hashMap = {};
  const sizeMap = {};
  const nameMap = {};
  const report = {
    exactDuplicates: [],
    sameName: [],
    similarNames: [],
    sameSize: [],
    timestamp: new Date().toISOString()
  };

  // === PASS 1: HASH ===
  console.log('📊 Analyzing file hashes...');
  files.forEach(file => {
    try {
      const hash = hashFile(file);
      const size = fs.statSync(file).size;
      const name = path.basename(file);

      if (hash) {
        // Hash grouping
        if (!hashMap[hash]) hashMap[hash] = [];
        hashMap[hash].push(file);
      }

      // Size grouping
      if (!sizeMap[size]) sizeMap[size] = [];
      sizeMap[size].push(file);

      // Name grouping
      if (!nameMap[name]) nameMap[name] = [];
      nameMap[name].push(file);

    } catch (err) {
      // Skip files we can't read
    }
  });

  // === EXACT DUPLICATES ===
  console.log('\n🔥 EXACT DUPLICATES (same content):\n');
  Object.values(hashMap)
    .filter(group => group.length > 1)
    .forEach(group => {
      console.log('---');
      group.forEach(f => console.log(f));
      report.exactDuplicates.push(group);
    });

  // === SAME NAME ===
  console.log('\n📛 SAME NAME FILES:\n');
  Object.entries(nameMap)
    .filter(([_, group]) => group.length > 1)
    .forEach(([name, group]) => {
      console.log(`--- ${name}`);
      group.forEach(f => console.log(f));
      report.sameName.push({ name, files: group });
    });

  // === SIMILAR NAMES ===
  console.log('\n🧠 SIMILAR FILE NAMES:\n');
  const fileNames = Object.keys(nameMap);

  for (let i = 0; i < fileNames.length; i++) {
    for (let j = i + 1; j < fileNames.length; j++) {
      const sim = similarity(fileNames[i], fileNames[j]);

      if (sim > 0.75 && sim < 1) {
        console.log(`~ ${fileNames[i]}  <->  ${fileNames[j]}  (${(sim * 100).toFixed(1)}%)`);
        report.similarNames.push({
          name1: fileNames[i],
          name2: fileNames[j],
          similarity: sim
        });
      }
    }
  }

  // === SAME SIZE (suspicious) ===
  console.log('\n📏 SAME SIZE FILES (possible duplicates):\n');
  Object.values(sizeMap)
    .filter(group => group.length > 2)
    .forEach(group => {
      console.log('---');
      group.slice(0, 5).forEach(f => console.log(f));
      report.sameSize.push(group.slice(0, 5));
    });

  // === SUMMARY ===
  console.log('\n📊 SUMMARY:\n');
  console.log(`Exact duplicates: ${report.exactDuplicates.length} groups`);
  console.log(`Same name files: ${report.sameName.length} groups`);
  console.log(`Similar names: ${report.similarNames.length} pairs`);
  console.log(`Same size files: ${report.sameSize.length} groups`);

  // === SAVE REPORT ===
  const reportPath = path.join(ROOT, 'duplicates-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📝 Report saved to: ${reportPath}`);

  console.log('\n✅ Duplicate detection complete');
  console.log('\n📋 Next steps:');
  console.log('  1. Review duplicates-report.json');
  console.log('  2. Decide which files to keep/remove');
  console.log('  3. Update imports if removing duplicates');
}

// Run if called directly
if (require.main === module) {
  findDuplicates();
}

module.exports = { findDuplicates, similarity, hashFile };
