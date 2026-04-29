---
trigger: glob
globs: **/*.{js,jsx,ts,tsx}
---

# Monitoring Guidelines (Error Tracking & Analytics)

<error_tracking>
- Implement global error boundary for React components
- Use error tracking services (Sentry, Bugsnag, etc.)
- Log errors with sufficient context and stack traces
- Track user actions leading to errors
- Monitor error rates and set up alerts
</error_tracking>

<performance_monitoring>
- Track Core Web Vitals (LCP, FID, CLS)
- Monitor API response times and error rates
- Track bundle size and loading performance
- Use performance monitoring tools (Lighthouse, WebPageTest)
- Set up performance budgets and alerts
</performance_monitoring>

<analytics_implementation>
- Use privacy-compliant analytics (Google Analytics 4, Plausible, etc.)
- Track meaningful user interactions and events
- Implement custom events for business metrics
- Monitor user flows and conversion rates
- Respect user privacy and GDPR requirements
</analytics_implementation>

<logging_strategy>
- Use structured logging with consistent format
- Implement different log levels (error, warn, info, debug)
- Log security events and suspicious activities
- Monitor system resources and usage patterns
- Set up log aggregation and search capabilities
</logging_strategy>

<alerting_setup>
- Configure alerts for critical errors and performance issues
- Set up uptime monitoring for external services
- Monitor database performance and query times
- Alert on unusual traffic patterns or spikes
- Implement escalation procedures for incidents
</alerting_setup>
