---
trigger: glob
globs: **/.github/workflows/*.{yml,yaml}
---

# CI/CD Guidelines (GitHub Actions & Pipelines)

<pipeline_structure>
- Use descriptive workflow names and clear step descriptions
- Implement proper workflow triggers (push, pull_request, schedule)
- Use matrix builds for multiple environments/node versions
- Implement proper secrets management for sensitive data
- Use workflow artifacts for build outputs and test results
</pipeline_structure>

<quality_gates>
- Run linting and formatting checks in CI
- Execute unit tests with coverage requirements
- Perform security scans (npm audit, SAST tools)
- Run dependency vulnerability checks
- Implement code quality gates (SonarQube, etc.)
</quality_gates>

<deployment_strategy>
- Use environment-specific deployment pipelines
- Implement blue-green or canary deployments for production
- Use proper rollback mechanisms
- Implement health checks and smoke tests
- Use infrastructure as code (Terraform, CloudFormation)
</deployment_strategy>

<testing_in_ci>
- Run unit tests on every push/PR
- Execute integration tests in staging environment
- Perform E2E tests before production deployment
- Use parallel test execution for faster feedback
- Implement test result reporting and notifications
</testing_in_ci>

<security_practices>
- Scan dependencies for vulnerabilities
- Use signed commits and require code review
- Implement branch protection rules
- Use temporary credentials for deployment
- Audit pipeline permissions and access
</security_practices>

<monitoring_and_notifications>
- Set up pipeline failure notifications
- Monitor deployment success rates
- Track build performance and duration
- Implement proper logging for pipeline debugging
- Use status badges for repository visibility
</monitoring_and_notifications>
