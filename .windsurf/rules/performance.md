---
trigger: glob
globs: **/*.{js,jsx,ts,tsx}
---

# Performance Guidelines

<frontend_optimization>
- Use React.memo for expensive components
- Implement code splitting with lazy loading
- Optimize images and assets
- Use useCallback and useMemo appropriately
- Minimize re-renders
</frontend_optimization>

<backend_optimization>
- Implement database query optimization
- Use caching strategies (Redis, etc.)
- Implement pagination for large datasets
- Use connection pooling
- Monitor and optimize API response times
</backend_optimization>

<general_performance>
- Monitor bundle size and optimize imports
- Use web workers for heavy computations
- Implement proper error boundaries
- Use performance monitoring tools
- Regular performance audits
</general_performance>
