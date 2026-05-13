const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const base = path.join(root, 'frontend', 'src');

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full, files);
    } else if (/\.(js|jsx)$/.test(full)) {
      files.push(full);
    }
  }
  return files;
}

const files = walk(base);
const results = [];

for (const file of files) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('<button') && !/\btype\s*=/.test(line)) {
      const start = Math.max(0, i - 10);
      const end = Math.min(lines.length, i + 10);
      const snippet = lines.slice(start, end).join(' ');
      if (snippet.includes('<form') || snippet.includes('form onSubmit') || snippet.includes('form>')) {
        results.push({ file, line: i + 1, text: line.trim() });
      }
    }
  }
}

console.log(`Found ${results.length} buttons without type near form context`);
results.forEach(r => console.log(`${r.file}:${r.line}: ${r.text}`));
