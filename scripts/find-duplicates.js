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
 * @returns {Promise<string>} SHA256 hash
 */
async function hashFile(filePath) {
  try {
    const content = await fs.promises.readFile(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (err) {
    console.log('⚠️ Error hashing:', filePath);
    return null;
  }
}

/**
 * Find duplicate files by content
 * @returns {Promise<Array<Array<string>>>} Array of duplicate file paths
 */
async function findDuplicatesByContent() {
  const files = await findFiles(ROOT, IGNORE);
  const fileHashes = {};

  for (const file of files) {
    const hash = await hashFile(file);
    if (hash) {
      if (fileHashes[hash]) {
        fileHashes[hash].push(file);
      } else {
        fileHashes[hash] = [file];
      }
    }
  }

  const duplicates = Object.keys(fileHashes).reduce((acc, hash) => {
    if (fileHashes[hash].length > 1) {
      acc.push(fileHashes[hash]);
    }
    return acc;
  }, []);

  return duplicates;
}

/**
 * Find files recursively in a directory
 * @param {string} dir - Directory path
 * @param {Array} ignore - Array of directories to ignore
 * @returns {Promise<Array<string>>} Array of file paths
 */
async function findFiles(dir, ignore) {
  const files = [];
  const stack = [dir];

  while (stack.length > 0) {
    const currentDir = stack.pop();

    const items = await fs.promises.readdir(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);

      const stats = await fs.promises.stat(fullPath);

      if (stats.isDirectory()) {
        if (!ignore.includes(item)) {
          stack.push(fullPath);
        }
      } else {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * Find duplicate files by name similarity
 * @returns {Promise<Array<Array<string>>>} Array of duplicate file paths
 */
async function findDuplicatesByName() {
  const files = await findFiles(ROOT, IGNORE);
  const duplicates = [];

  for (const file of files) {
    const fileName = path.basename(file);

    for (const otherFile of files) {
      if (file !== otherFile) {
        const otherName = path.basename(otherFile);

        if (fileName.toLowerCase() === otherName.toLowerCase()) {
          duplicates.push([file, otherFile]);
        }
      }
    }
  }

  return duplicates;
}

/**
 * Find duplicate files by size
 * @returns {Promise<Array<Array<string>>>} Array of duplicate file paths
 */
async function findDuplicatesBySize() {
  const files = await findFiles(ROOT, IGNORE);
  const duplicates = [];

  for (const file of files) {
    const fileSize = await fs.promises.stat(file).then((stats) => stats.size);

    for (const otherFile of files) {
      if (file !== otherFile) {
        const otherSize = await fs.promises.stat(otherFile).then((stats) => stats.size);

        if (fileSize === otherSize) {
          duplicates.push([file, otherFile]);
        }
      }
    }
  }

  return duplicates;
}

/**
 * Main function to find duplicate files
 */
async function main() {
