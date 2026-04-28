---
description: Code Review and Error Detection Workflow
---

# Code Review and Error Detection Workflow

## Overview

This workflow guides you through systematic code review and error detection in the repository.

## Pre-Review Checklist

### 1. Repository Structure Verification

**Command:** `find . -type f -name "*.js" | head -20`

**Location:** Repository root

**What to check:**
- JavaScript files are in correct directories
- Backend files in `backend/src/`
- Frontend files in `frontend/src/`
- No duplicate files in wrong locations

### 2. Dependency Check

**Command:** `npm audit` (in backend and frontend)

**What to check:**
- High severity vulnerabilities
- Outdated packages
- Missing dependencies

**Fix:** Run `npm audit fix` for auto-fixable issues

### 3. Linting Check

**Command:** `npm run lint` (if configured)

**What to check:**
- ESLint errors
- Code style violations
- Unused variables

## Backend Code Review

### 1. Core Electrical Modules

**Location:** `backend/src/core/electrical/`

**Files to review:**
- `Complex.js` - Complex number arithmetic
- `YbusBuilderV2.js` - Admittance matrix construction
- `NewtonRaphsonSolverV2.js` - Load flow solver
- `FaultAnalysisV2.js` - Fault analysis
- `DynamicMotorModel.js` - Motor models
- `PerUnitSystem.js` - Per-unit conversion
- `PowerFlowOrchestrator.js` - Simulation orchestrator
- `SimulationEngine.js` - Integration layer

**Common Errors to Check:**
```javascript
// ❌ Division by zero
const result = x / y; // Should check if y !== 0

// ❌ Missing null checks
const value = obj.property; // Should use obj?.property

// ❌ Incorrect mathjs usage
const inverse = math.inv(matrix); // Should check if matrix is invertible

// ❌ Array index out of bounds
const value = array[i]; // Should check if i < array.length
```

### 2. API Routes and Controllers

**Location:** `backend/src/routes/` and `backend/src/controllers/`

**What to check:**
- All routes have proper error handling
- Input validation with Zod schemas
- API responses follow consistent format
- Rate limiting applied correctly

**Common Errors:**
```javascript
// ❌ Missing try-catch in async handlers
app.post('/endpoint', async (req, res) => {
  const result = await calculation(); // No error handling
});

// ✅ Correct
app.post('/endpoint', asyncHandler(async (req, res) => {
  const result = await calculation();
}));
```

### 3. Database Operations

**Location:** `backend/src/config/db.js` and Prisma usage

**What to check:**
- Database connection is properly closed
- Prisma queries have error handling
- No raw SQL injection vulnerabilities

## Frontend Code Review

### 1. React Components

**Location:** `frontend/src/components/`

**What to check:**
- No console.log statements in production code
- Proper use of useEffect cleanup
- State updates are not causing infinite loops
- Props validation with PropTypes

**Common Errors:**
```javascript
// ❌ Infinite loop in useEffect
useEffect(() => {
  setState(count + 1); // Runs forever
}, [count]);

// ✅ Correct
useEffect(() => {
  setState(count + 1);
}, []); // Empty dependency array
```

### 2. State Management (Zustand)

**Location:** `frontend/src/store/useStore.js`

**What to check:**
- No circular dependencies
- State updates are atomic
- Async actions have proper error handling

### 3. Utility Functions

**Location:** `frontend/src/utils/`

**What to check:**
- Input validation
- Fallback values for edge cases
- No global variable pollution
- Proper error handling

## Specific Error Patterns to Search

### 1. Search for console.log statements

**Command:** `grep -r "console.log" --include="*.js" --include="*.jsx" .`

**Action:** Replace with proper logging or remove in production code

### 2. Search for TODO comments

**Command:** `grep -r "TODO\|FIXME\|XXX" --include="*.js" --include="*.jsx" .`

**Action:** Resolve or create GitHub issues

### 3. Search for any type

**Command:** `grep -r "any" --include="*.ts" --include="*.tsx" .`

**Action:** Replace with proper TypeScript types

### 4. Search for unused imports

**Command:** Check ESLint output

**Action:** Remove unused imports

## Testing Verification

### 1. Run Backend Tests

**Command:** `npm test` (in backend)

**What to check:**
- All tests pass
- No test timeouts
- Coverage reports show adequate coverage

### 2. Run Frontend Tests

**Command:** `npm test` (in frontend)

**What to check:**
- Component tests pass
- Integration tests pass
- No snapshot changes

## Security Review

### 1. Check for Sensitive Data

**Search patterns:**
- `password`, `secret`, `key`, `token`
- API keys in code
- Hardcoded credentials

**Command:** `grep -r -i "password\|secret\|api_key" --include="*.js" .`

### 2. Check SQL Injection Risks

**Search:** Raw SQL strings with user input

### 3. Check XSS Vulnerabilities

**Search:** `dangerouslySetInnerHTML` usage

## Performance Review

### 1. Check for Large Bundle Sizes

**Command:** `npm run build` and check bundle size

**Action:** Optimize if > 200KB

### 2. Check for Memory Leaks

**Patterns:**
- Event listeners not removed
- Intervals not cleared
- Large objects retained

## Documentation Review

### 1. Check README Files

**Locations:** `README.md`, `backend/README.md`, `frontend/README.md`

**What to check:**
- Installation instructions are accurate
- Dependencies are listed
- Usage examples work

### 2. Check API Documentation

**Location:** `backend/src/` (if using Swagger/OpenAPI)

**What to check:**
- All endpoints documented
- Request/response schemas defined
- Error codes documented

## Automated Error Detection Script

```javascript
// error-detect.js - Run in Node.js
const fs = require('fs');
const path = require('path');

function findJSFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  items.forEach(item => {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files.push(...findJSFiles(fullPath));
    } else if (item.name.endsWith('.js')) {
      files.push(fullPath);
    }
  });
  
  return files;
}

function checkFileForErrors(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const errors = [];
  
  // Check for console.log
  if (content.includes('console.log')) {
    errors.push('Contains console.log');
  }
  
  // Check for TODO
  if (content.includes('TODO') || content.includes('FIXME')) {
    errors.push('Contains TODO/FIXME');
  }
  
  // Check for var
  if (content.includes('var ')) {
    errors.push('Uses var instead of const/let');
  }
  
  return errors;
}

function runErrorDetection() {
  const backendFiles = findJSFiles('./backend/src');
  const frontendFiles = findJSFiles('./frontend/src');
  
  console.log('=== Backend Files ===');
  backendFiles.forEach(file => {
    const errors = checkFileForErrors(file);
    if (errors.length > 0) {
      console.log(`${file}:`, errors);
    }
  });
  
  console.log('\n=== Frontend Files ===');
  frontendFiles.forEach(file => {
    const errors = checkFileForErrors(file);
    if (errors.length > 0) {
      console.log(`${file}:`, errors);
    }
  });
}

runErrorDetection();
```

## Final Review Checklist

- [ ] All console.log statements removed or replaced
- [ ] All TODO/FIXME comments addressed
- [ ] No hardcoded credentials
- [ ] All async functions have error handling
- [ ] All array operations have bounds checking
- [ ] All divisions check for zero
- [ ] Dependencies are up to date
- [ ] No security vulnerabilities
- [ ] Documentation is up to date
- [ ] Tests pass

## Reporting

Create a review report with:

1. **Summary:** Total files reviewed, errors found, errors fixed
2. **Critical Issues:** Security vulnerabilities, breaking bugs
3. **Warnings:** Code style, deprecated patterns
4. **Recommendations:** Improvements for future
