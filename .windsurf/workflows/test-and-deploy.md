---
description: Run comprehensive tests and prepare for deployment
tags: [testing, deployment, ci-cd]
---

# Test and Deploy Workflow

## Prerequisites
- All dependencies installed
- Environment variables configured
- Build tools available

## Steps

### 1. Run Full Test Suite
```bash
npm run test
```

### 2. Check Test Coverage
```bash
# Frontend coverage
cd frontend && npm run test:coverage

# Backend coverage  
cd backend && npm run test:coverage

# Verify minimum coverage (80% recommended)
```

### 3. Security & Quality Checks
```bash
# Security audit
npm audit

# Dependency check
cd frontend && npm audit
cd backend && npm audit

# Linting verification
npm run lint:check
```

### 4. Build for Production
```bash
# Frontend build
cd frontend && npm run build

# Verify build output
ls -la frontend/dist/
```

### 5. Integration Tests
```bash
# Run E2E tests if available
npm run test:e2e

# API integration tests
cd backend && npm run test:integration
```

### 6. Environment Validation
```bash
# Check required environment variables
node scripts/validate-env.js

# Verify database connection
cd backend && npm run db:migrate
```

### 7. Performance Checks
```bash
# Bundle size analysis
cd frontend && npm run analyze

# Lighthouse audit (if configured)
npm run audit:lighthouse
```

### 8. Deployment Preparation
```bash
# Create deployment artifact
tar -czf deployment-$(date +%Y%m%d).tar.gz frontend/dist/

# Generate deployment checksum
sha256sum deployment-*.tar.gz > checksum.txt
```

## Exit Criteria
- ✅ All tests pass
- ✅ Coverage meets minimum requirements
- ✅ No security vulnerabilities
- ✅ Build successful
- ✅ Environment validated
- ✅ Performance within acceptable limits

## Deployment Gates
Do NOT deploy if ANY of these fail:
- Test failures
- Coverage below threshold
- Security issues
- Build errors
- Environment misconfiguration
