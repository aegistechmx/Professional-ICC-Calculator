---
trigger: glob
globs: **/*.{env,config.js,config.json}
---

# Environment Configuration Rules

<development>
- Use .env.local for local development overrides
- Enable detailed logging and debugging
- Use mock services for external dependencies
- Keep development database separate from production
</development>

<production>
- Never commit .env files with secrets
- Use environment-specific configurations
- Enable security headers and HTTPS
- Use production-ready database connections
- Monitor and log errors appropriately
</production>

<testing>
- Use test databases and mock services
- Disable external API calls in tests
- Use deterministic test data
- Clean up test resources after completion
</testing>
