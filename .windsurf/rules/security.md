---
trigger: glob
globs: **/*.{js,jsx,ts,tsx}
---

# Security Guidelines

<authentication>
- Never store passwords or API keys in code
- Use environment variables for sensitive configuration
- Implement proper session management
- Use HTTPS in production
</authentication>

<input_validation>
- Validate all user inputs on both client and server
- Sanitize data before database operations
- Use parameterized queries to prevent SQL injection
- Implement rate limiting for API endpoints
</input_validation>

<data_protection>
- Encrypt sensitive data at rest and in transit
- Use secure HTTP headers (CSP, HSTS, etc.)
- Implement proper CORS policies
- Log security events but not sensitive data
</data_protection>
