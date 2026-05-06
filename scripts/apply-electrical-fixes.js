/**
 * Apply electrical precision and unit fixes based on validation report
 * Automatically adds toFixed(6) and unit declarations
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_PATH = path.join(ROOT, 'reports', 'enhanced-electrical-validation-2026-04-29.json');

// File path mappings from report to actual
function resolveFilePath(reportPath) {
  // Convert ..\backend\src\... to actual path
  const cleanPath = reportPath.replace(/^\.\.\\/, '');
  return path.join(ROOT, cleanPath);
}

function applyFixes() {
  console.log('🔧 Applying electrical precision and unit fixes...\n');

  if (!fs.existsSync(REPORT_PATH)) {
    console.error('❌ Report file not found:', REPORT_PATH);
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
  const { functions, issues, summary } = report;

  console.log(`📊 Found ${summary.precisionIssues} precision issues and ${summary.missingUnits} missing unit declarations`);
  console.log(`📁 Processing ${functions.length} functions\n`);

  // Group issues by file
  const fileIssues = new Map();

  // Add function-level issues
  functions.forEach(func => {
    const filePath = resolveFilePath(func.file);
    if (!fileIssues.has(filePath)) {
      fileIssues.set(filePath, []);
    }
    func.issues.forEach(issue => {
      fileIssues.get(filePath).push({
        ...issue,
        functionName: func.name,
        functionLine: func.line,
        hasPrecisionHandling: func.hasPrecisionHandling
      });
    });
  });

  // Add standalone issues
  issues.forEach(issue => {
    const filePath = resolveFilePath(issue.file);
    if (!fileIssues.has(filePath)) {
      fileIssues.set(filePath, []);
    }
    fileIssues.get(filePath).push(issue);
  });

  let totalFilesFixed = 0;
  let totalPrecisionFixes = 0;
  let totalUnitFixes = 0;

  // Process each file
  for (const [filePath, fileIssueList] of fileIssues) {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      continue;
    }

    console.log(`📝 Processing: ${path.relative(ROOT, filePath)}`);

    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let fileModified = false;
    let filePrecisionFixes = 0;
    let fileUnitFixes = 0;

    // Sort issues by line number in reverse order to apply from bottom up
    const sortedIssues = [...fileIssueList].sort((a, b) => b.line - a.line);

    for (const issue of sortedIssues) {
      const lineIndex = issue.line - 1;
      if (lineIndex < 0 || lineIndex >= lines.length) {
        continue;
      }

      const originalLine = lines[lineIndex];

      if (issue.type === 'precision_issue') {
        // Apply toFixed(6) to calculation results
        const fixedLine = applyPrecisionFix(originalLine, issue);
        if (fixedLine !== originalLine) {
          lines[lineIndex] = fixedLine;
          fileModified = true;
          filePrecisionFixes++;
        }
      } else if (issue.type === 'missing_unit') {
        // Add unit declaration comment
        const fixedLine = applyUnitFix(originalLine, issue);
        if (fixedLine !== originalLine) {
          lines[lineIndex] = fixedLine;
          fileModified = true;
          fileUnitFixes++;
        }
      }
    }

    if (fileModified) {
      fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
      totalFilesFixed++;
      totalPrecisionFixes += filePrecisionFixes;
      totalUnitFixes += fileUnitFixes;
      console.log(`   ✅ Fixed ${filePrecisionFixes} precision + ${fileUnitFixes} unit issues`);
    } else {
      console.log(`   ℹ️  No changes needed`);
    }
  }

  console.log(`\n============================================================`);
  console.log(`📊 FIX SUMMARY`);
  console.log(`============================================================`);
  console.log(`Files modified: ${totalFilesFixed}`);
  console.log(`Precision fixes (toFixed(6)): ${totalPrecisionFixes}`);
  console.log(`Unit declarations added: ${totalUnitFixes}`);
  console.log(`============================================================\n`);

  return { totalFilesFixed, totalPrecisionFixes, totalUnitFixes };
}

function applyPrecisionFix(line, issue) {
  // Don't fix if already has toFixed
  if (line.includes('toFixed')) {
    return line;
  }

  // Don't fix if it's a comment
  if (line.trim().startsWith('//')) {
    return line;
  }

  // Handle parseFloat patterns that need toFixed
  if (line.includes('parseFloat(') && !line.includes('toFixed')) {
    // Wrap existing parseFloat with toFixed
    return line.replace(/parseFloat\(([^)]+)\)/g, 'parseFloat(parseFloat($1).toFixed(6))');
  }

  // Pattern: return calculation;
  const returnMatch = line.match(/return\s+(.+);?\s*$/);
  if (returnMatch) {
    const expression = returnMatch[1].trim();
    // Skip if already wrapped
    if (expression.includes('toFixed')) {
      return line;
    }
    if (expression.startsWith('parseFloat(') && !expression.includes('toFixed')) {
      // Wrap the inner parseFloat
      return line.replace(/return\s+parseFloat\(([^)]+)\);?\s*$/, 'return parseFloat(parseFloat($1).toFixed(6));');
    }
    // Wrap the return expression
    const newExpression = `parseFloat((${expression}).toFixed(6))`;
    return line.replace(/return\s+(.+);?\s*$/, `return ${newExpression};`);
  }

  // Pattern: const/let/var variable = calculation;
  const varMatch = line.match(/^(\s*(?:const|let|var)\s+\w+\s*=\s*)(.+);?\s*$/);
  if (varMatch) {
    const prefix = varMatch[1];
    const expression = varMatch[2].trim();
    if (expression.includes('toFixed')) {
      return line;
    }
    if (expression.startsWith('parseFloat(')) {
      return line.replace(/^(\s*(?:const|let|var)\s+\w+\s*=\s*)parseFloat\(([^)]+)\);?\s*$/, `$1parseFloat(parseFloat($2).toFixed(6));`);
    }
    // Check if this is a numeric calculation
    if (looksLikeCalculation(expression)) {
      const newExpression = `parseFloat((${expression}).toFixed(6))`;
      return `${prefix}${newExpression};`;
    }
  }

  // Pattern: variable = calculation;
  const assignmentMatch = line.match(/^(\s*\w+\s*=\s*)(.+);?\s*$/);
  if (assignmentMatch && !line.trim().startsWith('const') && !line.trim().startsWith('let') && !line.trim().startsWith('var')) {
    const prefix = assignmentMatch[1];
    const expression = assignmentMatch[2].trim();
    if (expression.includes('toFixed')) {
      return line;
    }
    if (expression.startsWith('parseFloat(')) {
      return line.replace(/^(\s*\w+\s*=\s*)parseFloat\(([^)]+)\);?\s*$/, `$1parseFloat(parseFloat($2).toFixed(6));`);
    }
    if (looksLikeCalculation(expression)) {
      const newExpression = `parseFloat((${expression}).toFixed(6))`;
      return `${prefix}${newExpression};`;
    }
  }

  // Pattern: property assignment (obj.prop = calculation)
  const propMatch = line.match(/^(\s*\w+\.\w+\s*=\s*)(.+);?\s*$/);
  if (propMatch) {
    const prefix = propMatch[1];
    const expression = propMatch[2].trim();
    if (expression.includes('toFixed') || expression.startsWith('parseFloat(')) {
      return line;
    }
    if (looksLikeCalculation(expression)) {
      const newExpression = `parseFloat((${expression}).toFixed(6))`;
      return `${prefix}${newExpression};`;
    }
  }

  // Pattern: array push or similar operations
  const arrayMatch = line.match(/^(\s*\w+\.push\()(.+)\);?\s*$/);
  if (arrayMatch) {
    const prefix = arrayMatch[1];
    const expression = arrayMatch[2].trim();
    if (expression.includes('toFixed') || expression.startsWith('parseFloat(')) {
      return line;
    }
    if (looksLikeCalculation(expression)) {
      const newExpression = `parseFloat((${expression}).toFixed(6))`;
      return `${prefix}${newExpression});`;
    }
  }

  return line;
}

function looksLikeCalculation(expression) {
  // Check if expression looks like a calculation that needs precision
  const calcPatterns = [
    /[\+\-\*\/]/,  // Contains operators
    /Math\./,      // Math functions
    /\*\*/,        // Exponentiation
  ];
  return calcPatterns.some(pattern => pattern.test(expression));
}

function applyUnitFix(line, issue) {
  // Add unit comment after the line
  if (line.includes('//') && line.includes('Unit:')) {
    return line; // Already has unit
  }

  const match = issue.match || '';
  let unit = 'SI';

  // Determine unit based on variable name and context
  if (match.includes('voltage') || match.includes('Voltage')) {
    unit = match.includes('480') || match.includes('* 1000') ? 'V (Volts)' : 'kV';
  } else if (match.includes('current') || match.includes('Current')) {
    unit = 'A (Amperes)';
  } else if (match.includes('power') || match.includes('Power')) {
    unit = match.includes('/ 1000') ? 'kW' : 'W (Watts)';
  } else if (match.includes('impedance') || match.includes('Impedance')) {
    unit = 'Ω (Ohms)';
  }

  // Add comment with unit
  const indent = line.match(/^(\s*)/)?.[1] || '';
  return `${line} // Unit: ${unit}`;
}

// Run the fixes
const results = applyFixes();

// Save summary
const summaryPath = path.join(ROOT, 'reports', 'electrical-fixes-applied.json');
fs.writeFileSync(summaryPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  ...results
}, null, 2));

console.log(`💾 Summary saved to: ${summaryPath}`);
console.log('\n✅ Electrical fixes applied successfully!');
console.log('📋 Next: Run validation again to verify improvements');
