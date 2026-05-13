const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..', 'frontend', 'src');
const files = [];

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full);
    } else if (/\.(js|jsx)$/.test(full)) {
      files.push(full);
    }
  }
}

walk(baseDir);
let updatedCount = 0;
let processedCount = 0;
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const fixed = content.replace(/<button\b([^>]*)>/gms, (match, attrs) => {
    const buttonTypeMatches = attrs.match(/\s+type=\"button\"/g);
    if (!buttonTypeMatches || buttonTypeMatches.length < 2) {
      return match;
    }
    const cleaned = attrs.replace(/\s+type=\"button\"/g, ' ').replace(/\s+/g, ' ').trim();
    return `<button ${cleaned}>`;
  });

  processedCount++;
  if (fixed !== content) {
    fs.writeFileSync(file, fixed, 'utf8');
    updatedCount++;
  }
}

console.log(`Processed ${processedCount} files, updated ${updatedCount} files.`);
