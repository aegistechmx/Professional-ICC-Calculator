---
trigger: glob
globs: **/*.test.{js,jsx,ts,tsx}
---

# Advanced Testing Guidelines (E2E & Visual Testing)

<e2e_testing>
- Use Playwright or Cypress for end-to-end testing
- Test critical user journeys and workflows
- Use page object pattern for maintainable tests
- Implement proper test data management
- Run E2E tests in multiple browsers and viewport sizes
</e2e_testing>

<visual_testing>
- Use visual regression testing tools (Percy, Chromatic, etc.)
- Capture screenshots for critical UI components
- Test responsive design across different screen sizes
- Implement visual testing for design system components
- Use proper baselines and handle visual changes appropriately
</visual_testing>

<test_data_management>
- Use factories or fixtures for test data generation
- Implement proper test data cleanup
- Use deterministic data for reproducible tests
- Separate test data from test logic
- Mock external APIs and services in integration tests
</test_data_management>

<performance_testing>
- Implement load testing for critical endpoints
- Test application performance under stress
- Monitor memory usage and leaks
- Use performance budgets and thresholds
- Test with realistic data volumes
</performance_testing>

<accessibility_testing>
- Include accessibility tests in E2E test suites
- Test keyboard navigation and screen reader compatibility
- Use automated accessibility testing tools (axe-core)
- Test color contrast and visual accessibility
- Validate ARIA labels and semantic HTML
</accessibility_testing>

<test_automation>
- Integrate tests into CI/CD pipelines
- Use parallel test execution for faster feedback
- Implement proper test reporting and notifications
- Use test flakiness detection and retry mechanisms
- Monitor test execution time and performance
</test_automation>
