---
description: Comprehensive security audit and vulnerability assessment
tags: [security, audit, compliance]
---

# Security Audit Workflow

## Prerequisites
- Security scanning tools installed
- Access to vulnerability databases
- Environment configuration files ready

## Steps

### 1. Dependency Security Scan
```bash
# Root dependencies
npm audit --audit-level=moderate

# Frontend dependencies
cd frontend && npm audit --audit-level=moderate

# Backend dependencies  
cd backend && npm audit --audit-level=moderate

# Fix automatically if possible
npm audit fix
```

### 2. Code Security Analysis
```bash
# Static application security testing (SAST)
npm run security:sast

# Secrets detection
git-secrets --scan

# Code quality security check
npm run security:codeql
```

### 3. Environment Security Check
```bash
# Validate environment variables
node scripts/check-env-security.js

# Check for hardcoded secrets
grep -r "password\|secret\|api_key\|token" --include="*.js" --include="*.jsx" --exclude-dir=node_modules .

# Verify .gitignore includes sensitive files
cat .gitignore | grep -E "\.env|\.key|\.pem"
```

### 4. Infrastructure Security
```bash
# Docker security scan (if using containers)
docker scan $(docker build -q .)

# Network security assessment
nmap -sV localhost

# SSL/TLS certificate check
openssl s_client -connect your-domain.com:443
```

### 5. Access Control Review
```bash
# Check file permissions
find . -type f -name "*.js" -exec ls -la {} \;

# Verify authentication mechanisms
grep -r "auth\|jwt\|session" --include="*.js" backend/src/

# Check CORS configuration
grep -r "cors\|origin" --include="*.js" backend/src/
```

### 6. Security Testing
```bash
# Run security-focused tests
npm run test:security

# Penetration testing (if available)
npm run test:penetration

# Input validation tests
npm run test:input-validation
```

### 7. Generate Security Report
```bash
# Create comprehensive security report
node scripts/generate-security-report.js

# Export findings to JSON
npm run security:export-report
```

## Security Checklist
- [ ] No critical vulnerabilities in dependencies
- [ ] No hardcoded secrets in code
- [ ] Proper authentication implemented
- [ ] Input validation on all endpoints
- [ ] HTTPS enforced in production
- [ ] Security headers configured
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Error handling doesn't leak information
- [ ] Logging doesn't contain sensitive data

## Exit Criteria
- ✅ All security scans pass
- ✅ No critical vulnerabilities found
- [ ] Medium vulnerabilities documented and planned
- ✅ Security report generated
- ✅ Remediation plan created if needed

## Remediation Priority
1. **Critical**: Fix immediately
2. **High**: Fix within 24 hours
3. **Medium**: Fix within 1 week
4. **Low**: Fix in next release cycle
