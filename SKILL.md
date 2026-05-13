---
name: run-tests-and-fix
description: "Analyze repository test failures, identify root causes, and apply safe automatic fixes when possible."
tags: [testing, debugging, automation, nodejs]
---

# Run Tests and Fix

This skill packages a repeatable workflow for test-driven debugging in this repository.

## Skill Goal

Help the user run project tests, interpret failures, classify root causes, and apply targeted fixes without changing production behavior unnecessarily.

## Workflow

1. Verify prerequisites:
   - Node.js is installed.
   - Project dependencies are installed (`npm install`).
   - `package.json` test scripts exist in `frontend/` and `backend/`.

2. Run the relevant test suite:
   - `cd frontend && npm test 2>&1`
   - `cd backend && npm test 2>&1`

   If tests are not configured, recommend installing test dependencies and setting up the test runner.

3. Parse test output to identify:
   - failed test files
   - failing cases
   - error messages and stack traces
   - assertion failures

4. Categorize failures:
   - syntax/runtime errors
   - assertion failures
   - async timeouts
   - dependency or mock issues
   - environment problems

5. Analyze the root cause:
   - check import statements and module resolution
   - verify function signatures and parameters
   - review mock setup and test fixtures
   - inspect setup/teardown logic
   - validate environment variables and port configuration

6. Apply automatic fixes when clearly safe:
   - fix missing imports or declarations
   - correct syntax mistakes
   - update expected values only if logic changed intentionally
   - add proper async/await handling
   - increase timeouts when justified
   - update mock return values and test dependencies
   - create missing config files or environment entries

7. Re-run tests after applying fixes:
   - start with the failing subset
   - if they pass, run the full suite again

8. Report results:
   - tests fixed automatically
   - tests requiring manual intervention
   - remaining issues and recommendations

## Decision Points

- If a failure is caused by unclear logic changes, do not rewrite production logic without confirmation.
- If multiple tests fail from the same root cause, fix the root cause rather than patching individual assertions.
- If the repository uses separate frontend/backend runners, preserve the backend-first principle for heavy calculations.

## Completion Criteria

- All available tests pass, or
- no automatic fix is possible and a clear manual action plan is provided.

## Safety

- create backups of modified files before editing
- review all automatic changes before committing
- avoid changing production code logic without verification
- skip fixes that require broad architectural changes
