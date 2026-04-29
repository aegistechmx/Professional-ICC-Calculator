---
description: Run tests, identify failures, analyze causes, and apply automatic fixes
tags: [testing, automation, debugging]
---

# Run Tests and Fix Workflow

This workflow executes the project test suite, identifies failing tests, analyzes root causes, and applies automatic corrections when possible.

## Prerequisites

- Node.js installed
- Project dependencies installed (`npm install`)
- Test scripts configured in package.json

## Steps

### 1. Run Test Suite

Execute all project tests and capture output:

```bash
# Frontend tests
cd frontend && npm test 2>&1

# Backend tests  
cd backend && npm test 2>&1
```

// turbo
If tests are not configured, set them up first:
```bash
cd frontend && npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
cd backend && npm install --save-dev jest supertest
```

### 2. Parse Test Results

Analyze test output to identify:
- Failed test files
- Specific test cases that failed
- Error messages and stack traces
- Assertion failures

### 3. Categorize Failures

Group failures by type:
- **Syntax/Runtime Errors**: Code doesn't execute
- **Assertion Failures**: Logic produces unexpected results
- **Async Timeout**: Tests taking too long
- **Dependency Issues**: Missing mocks or stubs
- **Environment Problems**: Port conflicts, missing env vars

### 4. Analyze Root Causes

For each failure category:
- Check import statements and module resolution
- Verify function signatures and parameters
- Review mock configurations
- Inspect test setup and teardown
- Validate environment configuration

### 5. Apply Automatic Fixes

Implement corrections based on failure type:

**For Syntax Errors:**
- Fix missing imports
- Correct syntax mistakes
- Add missing declarations

**For Assertion Failures:**
- Update expected values if logic changed
- Fix calculation errors
- Correct mock return values

**For Async Issues:**
- Add proper async/await
- Increase timeout values
- Fix promise handling

**For Environment Issues:**
- Kill processes using occupied ports
- Set required environment variables
- Create missing configuration files

### 6. Re-run Tests

Execute tests again to verify fixes:

```bash
# Re-run specific failing tests first
cd frontend && npm test -- --reporter=verbose 2>&1

# If specific tests pass, run full suite
cd backend && npm test 2>&1
```

### 7. Report Results

Generate summary of:
- Tests fixed automatically
- Tests requiring manual intervention
- Remaining issues with recommendations

## Usage

Execute this workflow when:
- Tests fail after code changes
- CI/CD pipeline reports failures
- Refactoring breaks existing tests
- Adding new features with test coverage

## Exit Criteria

Workflow completes successfully when:
- All tests pass, OR
- No automatic fixes possible (manual intervention required), OR
- Maximum retry attempts exceeded

## Safety Considerations

- Create backup of modified files before applying fixes
- Review all automatic changes before committing
- Do not modify production code logic without verification
- Skip tests that require architectural changes
