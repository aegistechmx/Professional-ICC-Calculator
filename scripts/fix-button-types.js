const fs = require('fs');
const path = require('path');
const base = 'frontend/src';
const files = [];
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) walk(p);
    else if (/\.(js|jsx)$/.test(p)) files.push(p);
  }
}
walk(base);
let total = 0;
let updated = 0;
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const fixed = content.replace(/<button((?![^>]*\\btype=)[^>]*?)>/gms, '<button type="button"$1>');
  if (fixed !== content) {
    fs.writeFileSync(file, fixed, 'utf8');
    updated++;
  }
  total++;
}
console.log(`Processed ${total} files, updated ${updated} files.`);
