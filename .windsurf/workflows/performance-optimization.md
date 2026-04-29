---
description: Analyze and optimize application performance
tags: [performance, optimization, monitoring]
---

# Performance Optimization Workflow

## Prerequisites
- Performance monitoring tools available
- Baseline metrics established
- Load testing environment ready

## Steps

### 1. Performance Baseline
```bash
# Measure current performance metrics
npm run measure:performance

# Capture Core Web Vitals
npm run audit:core-vitals

# Document baseline metrics
node scripts/baseline-performance.js
```

### 2. Bundle Analysis
```bash
# Frontend bundle size analysis
cd frontend && npm run analyze

# Identify largest dependencies
cd frontend && npx webpack-bundle-analyzer dist/static/js/*.js

# Check for unused code
cd frontend && npx depcheck
```

### 3. Database Performance
```bash
# Analyze slow queries
cd backend && npm run db:slow-queries

# Check database indexes
cd backend && npm run db:index-analysis

# Profile database operations
cd backend && npm run db:profile
```

### 4. API Performance
```bash
# Load test API endpoints
cd backend && npm run test:load

# Measure response times
cd backend && npm run measure:api-performance

# Identify bottlenecks
cd backend && npm run analyze:bottlenecks
```

### 5. Frontend Optimization
```bash
# Optimize images and assets
cd frontend && npm run optimize:images

# Enable code splitting
cd frontend && npm run optimize:splitting

# Implement lazy loading
cd frontend && npm run optimize:lazy-loading
```

### 6. Caching Strategy
```bash
# Analyze cache hit rates
npm run analyze:cache-performance

# Implement CDN caching
npm run setup:cdn

# Configure browser caching
npm run setup:browser-cache
```

### 7. Memory Analysis
```bash
# Check for memory leaks
npm run analyze:memory

# Profile memory usage
npm run profile:memory

# Optimize memory allocation
npm run optimize:memory
```

### 8. Network Optimization
```bash
# Minimize HTTP requests
npm run minimize:requests

# Enable compression
npm run enable:compression

# Optimize network payloads
npm run optimize:payload
```

### 9. Generate Performance Report
```bash
# Create comprehensive performance report
node scripts/performance-report.js

# Compare with baseline
node scripts/performance-comparison.js

# Generate optimization recommendations
node scripts/performance-recommendations.js
```

## Performance Targets
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Time to Interactive**: < 3.8s
- **Cumulative Layout Shift**: < 0.1
- **Bundle Size**: < 1MB (gzipped)
- **API Response Time**: < 200ms (95th percentile)
- **Database Query Time**: < 100ms (average)

## Optimization Checklist
- [ ] Bundle size reduced by 20%
- [ ] Core Web Vitals improved
- [ ] Database queries optimized
- [ ] Caching implemented
- [ ] Images optimized
- [ ] Code splitting enabled
- [ ] Memory usage optimized
- [ ] Network requests minimized

## Exit Criteria
- ✅ Performance targets met
- ✅ No regression in functionality
- ✅ Optimization report generated
- ✅ Monitoring setup completed
- ✅ Performance budget established
